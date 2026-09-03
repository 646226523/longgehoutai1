import { Router, Response } from 'express';
import sharp from 'sharp';
import db from '../db';
import fs from 'fs';
import path from 'path';
import type { ApiResponse } from '../types';

const router = Router();

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const mimeToExt: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

interface ThumbnailSize { w: number; h: number; }
interface ImagePipelineConfig {
  quality: number;
  watermark: {
    enable: boolean;
    text: string;
    position: 'top-left'|'top-center'|'top-right'|'bottom-left'|'bottom-center'|'bottom-right';
  };
  large?: ThumbnailSize;
  medium?: ThumbnailSize;
  small?: ThumbnailSize;
}

function fail(res: Response, status: number, message: string): Response {
  const body: ApiResponse = { code: status, message, data: null };
  return res.status(status).json(body);
}

function ok<T>(res: Response, data: T, message = 'success'): Response {
  const body: ApiResponse<T> = { code: 0, message, data };
  return res.json(body);
}

function loadImagePipelineConfig(): ImagePipelineConfig {
  const defaults: ImagePipelineConfig = {
    quality: 90,
    watermark: { enable: false, text: '', position: 'bottom-right' },
    large:  { w: 1200, h: 900 },
    medium: { w: 800,  h: 600 },
    small:  { w: 400,  h: 300 },
  };
  let rows: Array<{ config_key: string; config_value: string }> = [];
  try {
    rows = db.prepare(
      "SELECT config_key, config_value FROM system_config WHERE config_key LIKE 'image_%'"
    ).all();
  } catch {
    return defaults;
  }
  const map = new Map(rows.map(r => [r.config_key, r.config_value]));
  const num = (k: string) => parseInt(map.get(k) ?? '0', 10) || 0;
  const w = (k: string) => num(k);
  const h = (k: string) => num(k);
  return {
    quality: parseInt(map.get('image_compress_quality') ?? '90', 10) || 90,
    watermark: {
      enable: (map.get('image_watermark_enable') ?? '0') === '1',
      text: map.get('image_watermark_text') ?? '',
      position: (map.get('image_watermark_position') ?? 'bottom-right') as ImagePipelineConfig['watermark']['position'],
    },
    large:  { w: w('image_large_width'),  h: h('image_large_height')  },
    medium: { w: w('image_medium_width'), h: h('image_medium_height') },
    small:  { w: w('image_small_width'),  h: h('image_small_height')  },
  };
}

// 用 sharp composite 叠加 SVG 文字水印
async function applyWatermark(
  buffer: Buffer, mimeType: string, cfg: ImagePipelineConfig
): Promise<Buffer> {
  if (!cfg.watermark.enable || !cfg.watermark.text) return buffer;
  try {
    // 生成 SVG：600px 宽的画板，文字居中 + 黑色阴影 + 半透明白色
    const fontSize = 48;
    const svg = Buffer.from(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="${fontSize * 2}" viewBox="0 0 600 ${fontSize * 2}">
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.7"/>
          </filter>
        </defs>
        <text x="300" y="${fontSize}" text-anchor="middle" font-family="sans-serif" font-size="${fontSize}" fill="rgba(255,255,255,0.55)" filter="url(#shadow)">
          ${cfg.watermark.text}
        </text>
      </svg>
    `.trim());

    const pos = cfg.watermark.position;
    const margin = 24;
    const compositeOpts: Record<string, unknown> = { input: svg };

    if (pos.startsWith('top')) compositeOpts.top = margin;
    else compositeOpts.bottom = margin;
    if (pos.includes('left')) compositeOpts.left = margin;
    else if (pos.includes('right')) compositeOpts.right = margin;
    else compositeOpts.left = 0; // center: 靠中间

    let img = sharp(buffer).composite([compositeOpts as { input: Buffer; top?: number; bottom?: number; left?: number; right?: number }]);
    switch (mimeType) {
      case 'image/jpeg': return await img.jpeg({ mozjpeg: true }).toBuffer();
      case 'image/webp': return await img.webp().toBuffer();
      case 'image/png':  return await img.png().toBuffer();
      default: return await img.toBuffer();
    }
  } catch (err) {
    console.warn('[upload] 水印叠加失败，跳过:', err instanceof Error ? err.message : err);
    return buffer;
  }
}

async function generateThumbnails(
  buffer: Buffer, mimeType: string, cfg: ImagePipelineConfig
): Promise<Record<'large'|'medium'|'small', Buffer | undefined>> {
  const result: Record<'large'|'medium'|'small', Buffer | undefined> = {
    large: undefined, medium: undefined, small: undefined,
  };
  const rawSizes: Array<[keyof typeof result, ThumbnailSize | undefined]> = [
    ['large',  cfg.large],
    ['medium', cfg.medium],
    ['small',  cfg.small],
  ];
  const sizes: Array<[keyof typeof result, ThumbnailSize]> = rawSizes.filter(
    (s): s is [keyof typeof result, ThumbnailSize] => !!s[1] && s[1].w > 0 && s[1].h > 0
  );

  for (const [key, size] of sizes) {
    try {
      let img = sharp(buffer).resize({
        width: size.w, height: size.h,
        fit: 'inside', withoutEnlargement: true,
      });
      let outBuf: Buffer;
      switch (mimeType) {
        case 'image/jpeg': outBuf = await img.jpeg({ mozjpeg: true, quality: cfg.quality }).toBuffer(); break;
        case 'image/webp': outBuf = await img.webp({ quality: cfg.quality }).toBuffer(); break;
        case 'image/png':
          outBuf = await img.png({
            compressionLevel: Math.max(0, Math.round(9 - (cfg.quality / 100) * 9)),
            palette: cfg.quality < 90,
          }).toBuffer(); break;
        default: outBuf = await img.toBuffer();
      }
      result[key] = outBuf;
    } catch (err) {
      console.warn(`[upload] ${key} 缩略图生成失败，跳过:`, err instanceof Error ? err.message : err);
    }
  }
  return result;
}

// 根据 MIME 类型 + quality 对图片进行压缩
async function compressImage(buffer: Buffer, mimeType: string, quality: number): Promise<Buffer> {
  try {
    if (quality >= 100) return buffer;
    const q = Math.max(1, Math.min(100, quality));
    let img = sharp(buffer);
    switch (mimeType) {
      case 'image/jpeg':
        return await img.jpeg({ quality: q, mozjpeg: true }).toBuffer();
      case 'image/webp':
        return await img.webp({ quality: q }).toBuffer();
      case 'image/png':
        // PNG 按 quality 映射 compressionLevel (1-9)，质量越低压缩级别越高
        return await img.png({
          compressionLevel: Math.max(0, Math.round(9 - (q / 100) * 9)),
          palette: q < 90,
        }).toBuffer();
      default:
        return buffer;
    }
  } catch (err) {
    console.warn('[upload] 图片压缩失败，使用原图:', err instanceof Error ? err.message : err);
    return buffer;
  }
}

router.post('/upload', async (req, res) => {
  const { data } = req.body as { data?: string };

  if (!data || typeof data !== 'string') {
    return fail(res, 400, '缺少 data 字段');
  }

  const match = data.match(/^data:([^;]+);base64,(.+)$/);

  let mimeType: string;
  let base64Data: string;

  if (match) {
    mimeType = match[1];
    base64Data = match[2];
  } else {
    // 兼容纯 base64 字符串(不带 data: 前缀),默认按 JPEG 处理
    // 校验是否为合法 base64
    if (!/^[A-Za-z0-9+/=]+$/.test(data) || data.length % 4 !== 0) {
      return fail(res, 400, 'data 格式无效');
    }
    mimeType = 'image/jpeg';
    base64Data = data;
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType as typeof ALLOWED_MIME_TYPES[number])) {
    return fail(res, 400, '不支持的图片类型,仅支持 JPG、PNG、WEBP');
  }

  let fileBuffer: Buffer;
  try {
    fileBuffer = Buffer.from(base64Data, 'base64');
  } catch {
    return fail(res, 400, 'base64 解码失败');
  }

  if (fileBuffer.length > MAX_FILE_SIZE) {
    return fail(res, 400, '图片大小超过 5MB 限制');
  }

  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  const extension = mimeToExt[mimeType];
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}${extension}`;
  const filePath = path.join(UPLOAD_DIR, fileName);

  // 加载全链路配置
  const pipe = loadImagePipelineConfig();

  // Step 1: 水印叠加
  let processed = await applyWatermark(fileBuffer, mimeType, pipe);

  // Step 2: 质量压缩
  if (pipe.quality < 100) {
    const compressed = await compressImage(processed, mimeType, pipe.quality);
    processed = compressed;
  }

  // Step 3: 写原图
  fs.writeFileSync(filePath, processed);

  // Step 4: 生成 + 写三档缩略图
  const thumbs = await generateThumbnails(processed, mimeType, pipe);
  const thumbsDir = path.join(UPLOAD_DIR, 'thumbs');
  const thumbUrls: Record<string, string> = {};

  for (const sizeKey of ['large', 'medium', 'small'] as const) {
    const thumbBuf = thumbs[sizeKey];
    if (!thumbBuf) continue;
    const sizeDir = path.join(thumbsDir, sizeKey);
    if (!fs.existsSync(sizeDir)) fs.mkdirSync(sizeDir, { recursive: true });
    fs.writeFileSync(path.join(sizeDir, fileName), thumbBuf);
    thumbUrls[sizeKey] = `/uploads/thumbs/${sizeKey}/${fileName}`;
  }

  // Step 5: 构建返回值
  const thumbResponse: Record<string, string> = {};
  if (thumbUrls.large)  thumbResponse.large  = thumbUrls.large;
  if (thumbUrls.medium) thumbResponse.medium = thumbUrls.medium;
  if (thumbUrls.small)  thumbResponse.small  = thumbUrls.small;

  return ok(res, { url: `/uploads/${fileName}`, thumbnails: thumbResponse });
});

export default router;
