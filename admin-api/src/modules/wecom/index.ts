/**
 * 企业微信客服（微信客服）代理模块
 * —— 后端持有 CorpSecret，前端永远看不到
 *
 * 核心流程：
 *   1. 从 system_config 读取 CorpID / CorpSecret / kfAccount
 *   2. 用 CorpID + CorpSecret 换 access_token（内存缓存，2h 提前 5min 刷新）
 *   3. 调 kf/add_contact_way 生成客服链接 URL
 *
 * 企业微信客服的工作模式：
 *   —— 前端拿到 URL 后 iframe 嵌入或 window.open 跳转
 *   —— 用户在微信客户端内原生打开客服会话
 *   —— 本模块不做消息收发（那是微信客户端的事）
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
import type { Database } from 'better-sqlite3';
const db: Database = require('../../db').default;

// ============ Types ============

export interface CsConfig {
  enabled: boolean;
  corpId: string;
  corpSecret: string;
  kfAccount: string; // 即 open_kfid，WeCom API 参数名
}

export interface GenerateResult {
  enabled: true;
  url: string;
  scene: string;
}

export interface DisabledResult {
  enabled: false;
  reason: string;
}

export type WecomResult = GenerateResult | DisabledResult;

// ============ 内存缓存 ============

interface TokenCache {
  token: string;
  expireAt: number; // timestamp ms
  refreshing: Promise<string> | null; // 并发保护：正在刷新时复用同一个 Promise
}

let tokenCache: TokenCache = { token: '', expireAt: 0, refreshing: null };

// ============ 辅助：加载客服配置 ============

function loadCsConfig(): CsConfig {
  const rows = db
    .prepare(
      "SELECT config_key, config_value FROM system_config WHERE config_group='customer_service'"
    )
    .all() as Array<{ config_key: string; config_value: string }>;

  const map = new Map(rows.map((r) => [r.config_key, r.config_value]));

  const corpId = map.get('wecom_cs_corp_id') ?? '';
  const corpSecret = map.get('wecom_cs_corp_secret') ?? '';
  const kfAccount = map.get('wecom_cs_kf_account') ?? '';
  const enabled = map.get('wecom_cs_enable') === '1' && !!corpId && !!corpSecret && !!kfAccount;

  return { enabled, corpId, corpSecret, kfAccount };
}

// ============ 辅助：HTTPS GET/POST ============

function httpsRequest<T>(
  method: 'GET' | 'POST',
  url: string,
  body?: Record<string, unknown>
): Promise<T> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const https = require('https');
    const parsed = new URL(url);
    const data = body ? JSON.stringify(body) : undefined;

    const options: import('https').RequestOptions = {
      method,
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'longge-admin-api/1.0',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
      timeout: 8000,
    };

    const req = https.request(options, (res: import('http').IncomingMessage) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer | string) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8');
        try {
          resolve(JSON.parse(raw) as T);
        } catch {
          reject(new Error(`WeCom 响应非 JSON: ${raw.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('WeCom API 超时'));
    });

    if (data) req.write(data);
    req.end();
  });
}

// ============ 获取 access_token（带缓存 + 并发保护 + 重试） ============

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 提前 5 分钟刷新
const MAX_RETRY = 2;

async function getAccessToken(corpId: string, corpSecret: string): Promise<string> {
  const now = Date.now();

  // 缓存还没过期 → 直接返回
  if (tokenCache.token && tokenCache.expireAt - TOKEN_REFRESH_BUFFER_MS > now) {
    return tokenCache.token;
  }

  // 并发保护：已经有请求在刷新了 → await 同一个 Promise
  if (tokenCache.refreshing) {
    return tokenCache.refreshing;
  }

  // 新的刷新请求
  const refresh = (async () => {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 2000));
      }
      try {
        const resp: any = await httpsRequest<any>(
          'GET',
          `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${encodeURIComponent(
            corpId
          )}&corpsecret=${encodeURIComponent(corpSecret)}`
        );

        if (resp.errcode !== 0) {
          throw new Error(`WeCom gettoken errcode=${resp.errcode} errmsg=${resp.errmsg}`);
        }

        const token: string = resp.access_token;
        const ttlSec: number = resp.expires_in || 7200;
        tokenCache = {
          token,
          expireAt: Date.now() + ttlSec * 1000,
          refreshing: null,
        };
        return token;
      } catch (err) {
        lastErr = err;
        // eslint-disable-next-line no-console
        console.error(`[WeCom] getAccessToken 第 ${attempt + 1} 次失败:`, err);
      }
    }
    // 所有重试耗尽
    throw lastErr instanceof Error ? lastErr : new Error('WeCom access_token 获取失败');
  })();

  tokenCache.refreshing = refresh;
  return refresh;
}

// ============ 生成客服链接（公开 API） ============

export async function generateContactUrl(scene?: string): Promise<WecomResult> {
  const cfg = loadCsConfig();

  if (!cfg.enabled) {
    return { enabled: false, reason: '客服未启用或配置不完整' };
  }

  let token: string;
  try {
    token = await getAccessToken(cfg.corpId, cfg.corpSecret);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[WeCom] access_token 获取失败:', err);
    return { enabled: false, reason: '客服服务暂时不可用（凭证获取失败）' };
  }

  const finalScene =
    scene && scene.length <= 32 ? scene : `longge_guest_${Date.now().toString().slice(-8)}`;

  let resp: any;
  try {
    resp = await httpsRequest<any>(
      'POST',
      `https://qyapi.weixin.qq.com/cgi-bin/kf/add_contact_way?access_token=${token}`,
      { open_kfid: cfg.kfAccount, scene: finalScene }
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[WeCom] add_contact_way 网络异常:', err);
    return { enabled: false, reason: '客服服务暂时不可用（网络异常）' };
  }

  if (resp.errcode !== 0) {
    // 特定错误码需要更友好的提示
    let reason = '客服服务暂时不可用';
    if (resp.errcode === 40001 || resp.errcode === 42001) {
      reason = '客服凭证已过期，请在后台重新保存客服配置';
      // token 缓存作废，下次刷新
      tokenCache = { token: '', expireAt: 0, refreshing: null };
    } else if (resp.errcode === 40093) {
      reason = '客服账号无效，请检查后台"客服账号"字段';
    } else if (resp.errcode === 60020) {
      reason = '该企业微信客服账号暂未开通或已被封禁';
    } else {
      reason = `客服 API 返回错误: ${resp.errmsg ?? resp.errcode}`;
    }
    // eslint-disable-next-line no-console
    console.error(`[WeCom] add_contact_way 失败: errcode=${resp.errcode} errmsg=${resp.errmsg}`);
    return { enabled: false, reason };
  }

  return { enabled: true, url: resp.url, scene: finalScene };
}

// ============ 检查是否启用 ============

export function isWecomEnabled(): boolean {
  return loadCsConfig().enabled;
}
