import { Router, Response } from 'express';
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

function fail(res: Response, status: number, message: string): Response {
  const body: ApiResponse = { code: status, message, data: null };
  return res.status(status).json(body);
}

function ok<T>(res: Response, data: T, message = 'success'): Response {
  const body: ApiResponse<T> = { code: 0, message, data };
  return res.json(body);
}

router.post('/upload', (req, res) => {
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

  fs.writeFileSync(filePath, fileBuffer);

  return ok(res, { url: `/uploads/${fileName}` });
});

export default router;