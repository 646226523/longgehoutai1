import { Router, Response } from 'express';
import https from 'https';
import type { ApiResponse } from '../types';

const router = Router();

// 统一成功响应
function ok<T>(res: Response, data: T, message = 'success'): Response {
  const body: ApiResponse<T> = { code: 0, message, data };
  return res.json(body);
}

// 统一失败响应
function fail(res: Response, status: number, message: string): Response {
  const body: ApiResponse = { code: status, message, data: null };
  return res.status(status).json(body);
}

// ---------- 内存缓存 ----------
let cachedIp: string | null = null;
let cachedAt = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟
const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;

/**
 * HTTPS GET 辅助:带 3000ms 超时,返回纯文本;失败抛错
 */
function httpsGet(url: string, timeoutMs = 3000): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { timeout: timeoutMs, headers: { 'User-Agent': 'longge-admin-api/1.0' } },
      (res) => {
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          res.destroy();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          resolve(Buffer.concat(chunks).toString('utf-8').trim());
        });
        res.on('error', reject);
      }
    );
    req.on('timeout', () => {
      req.destroy(new Error('timeout'));
    });
    req.on('error', reject);
  });
}

/**
 * 从多个外部源依次尝试获取公网 IP
 * 全部失败返回 null
 */
async function fetchPublicIpFromExternal(): Promise<string | null> {
  // 源 1:ifconfig.me —— 纯文本 IP
  try {
    const text = await httpsGet('https://ifconfig.me/ip');
    if (IPV4_RE.test(text)) {
      return text;
    }
  } catch (e) {
    console.warn('[PUBLIC-IP] ifconfig.me 失败:', (e as Error).message);
  }

  // 源 2:myip.ipip.net —— 国内源,需正则提取
  try {
    const text = await httpsGet('https://myip.ipip.net');
    const m = text.match(/\d{1,3}(\.\d{1,3}){3}/);
    if (m && IPV4_RE.test(m[0])) {
      return m[0];
    }
  } catch (e) {
    console.warn('[PUBLIC-IP] myip.ipip.net 失败:', (e as Error).message);
  }

  // 源 3:api.ip.sb/geoip —— JSON
  try {
    const text = await httpsGet('https://api.ip.sb/geoip');
    const obj = JSON.parse(text) as { ip?: string };
    if (obj.ip && IPV4_RE.test(obj.ip)) {
      return obj.ip;
    }
  } catch (e) {
    console.warn('[PUBLIC-IP] api.ip.sb 失败:', (e as Error).message);
  }

  return null;
}

/**
 * 获取公网 IP:优先返回缓存,缓存过期才查外部
 */
async function getPublicIp(): Promise<string | null> {
  const now = Date.now();
  if (cachedIp && now - cachedAt < CACHE_TTL) {
    return cachedIp;
  }
  const ip = await fetchPublicIpFromExternal();
  if (ip) {
    cachedIp = ip;
    cachedAt = Date.now();
  }
  return ip;
}

// GET /api/__public-ip —— 公开端点,无需鉴权
router.get('/__public-ip', async (_req, res) => {
  try {
    const ip = await getPublicIp();
    if (ip) {
      return ok(res, ip);
    }
    return fail(res, 503, '公网 IP 查询服务不可用');
  } catch (err) {
    console.error('[PUBLIC-IP] 未预期错误:', err);
    return fail(res, 503, '公网 IP 查询服务不可用');
  }
});

export default router;
