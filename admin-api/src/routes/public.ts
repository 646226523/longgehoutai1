import { Router, Response } from 'express';
import https from 'https';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db';
import { config } from '../config';
import { authenticateUser } from '../middlewares/auth';
import type { ApiResponse, AuthedRequest } from '../types';
import {
  createSmsProvider,
  isRateLimited,
  logSent,
  logFailed,
  verifyCode as verifySmsCode,
  SMS_CONFIG,
} from '../modules/sms';

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

// ============================================================================
// C 端用户体系 —— 公开路由（无需鉴权）
// ============================================================================

// ---------- 验证码内存存储（兼容旧逻辑 + 辅助校验） ----------
interface CodeEntry { code: string; expireAt: number }
const verifyCodeStore = new Map<string, CodeEntry>();
const PHONE_RE = /^1[3-9]\d{9}$/;

/** 生成 6 位随机验证码 */
function genCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ---------- POST /api/user/send-code ----------
// body: { phone, scene?: 'register'|'login'|'reset_password' }
// 返回: { expireAt } —— 不再回传 code 本身
router.post('/user/send-code', async (req, res) => {
  const { phone, scene = 'register' } = req.body as { phone?: string; scene?: string };

  if (!phone || !PHONE_RE.test(phone)) {
    return fail(res, 400, '请输入正确的手机号');
  }
  if (!['register', 'login', 'reset_password'].includes(scene)) {
    return fail(res, 400, '未知的验证码场景');
  }

  // 频率限制：60s 内同 phone+scene 只允许一次
  if (isRateLimited(phone, scene)) {
    return fail(res, 429, '验证码发送过于频繁，请 60 秒后重试');
  }

  const code = genCode();
  const expireAt = Date.now() + SMS_CONFIG.TTL;

  try {
    const provider = createSmsProvider();
    const result = await provider.send({ phone, scene, code });

    if (result.success) {
      // 1) 写 DB 日志（用于频率限制 + 校验 + 审计）
      logSent(phone, scene, code, provider.name);
      // 2) 写内存 Map（兼容旧校验逻辑 + 快速访问）
      verifyCodeStore.set(`${phone}:${scene}`, { code, expireAt });
      return ok(res, { expireAt }, '验证码已发送');
    } else {
      logFailed(phone, scene, provider.name, result.error || '未知错误');
      return fail(res, 503, `验证码发送失败：${result.error || '请稍后重试'}`);
    }
  } catch (err: any) {
    logFailed(phone, scene, 'unknown', err?.message || String(err));
    return fail(res, 503, `验证码发送异常，请稍后重试`);
  }
});

/** 生成首字母 SVG 头像 data URL */
function genAvatar(nickname: string, seed: number): string {
  const colors: Array<[string, string]> = [
    ['#FF6B6B', '#FF8E8E'], ['#4ECDC4', '#7EDDD4'], ['#45B7D1', '#6DD5E8'],
    ['#96CEB4', '#B8E0CE'], ['#FFEAA7', '#FFF0B5'], ['#DDA0DD', '#E8B4E8'],
    ['#98D8C8', '#B8E4D8'], ['#F7DC6F', '#FAE99F'],
  ];
  const [c1, c2] = colors[seed % colors.length];
  const initial = nickname?.charAt(0)?.toUpperCase() || 'U';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><defs><linearGradient id='g${seed}' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='${c1}'/><stop offset='100%' stop-color='${c2}'/></linearGradient></defs><circle cx='50' cy='50' r='50' fill='url(#g${seed})'/><text x='50' y='62' text-anchor='middle' font-family='Arial' font-size='42' font-weight='bold' fill='white'>${initial}</text></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

/** 签发 C 端用户 token */
function signUserToken(userId: number, phone: string): string {
  return jwt.sign(
    { sub: userId, username: phone, type: 'user' },
    config.jwt.secret,
    { expiresIn: '30d' } as jwt.SignOptions
  );
}

// ---------- POST /api/user/send-code ----------
router.post('/user/send-code', (req, res) => {
  const { phone } = req.body as { phone?: string };
  if (!phone || !PHONE_RE.test(phone)) {
    return fail(res, 400, '请输入正确的手机号');
  }
  // 清理过期验证码
  for (const [p, v] of verifyCodeStore) {
    if (Date.now() > v.expireAt) verifyCodeStore.delete(p);
  }
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expireAt = Date.now() + 5 * 60 * 1000; // 5 分钟
  verifyCodeStore.set(phone, { code, expireAt });

  // eslint-disable-next-line no-console
  console.log(`[C端验证码] phone=${phone} code=${code} (5分钟有效)`);

  return ok(res, { code, expireAt }, '验证码已发送');
});

// ---------- POST /api/user/register ----------
router.post('/user/register', (req, res) => {
  const { phone, password, loftName, verifyCode } = req.body as {
    phone?: string; password?: string; loftName?: string; verifyCode?: string;
  };

  // 校验
  if (!phone || !PHONE_RE.test(phone)) return fail(res, 400, '请输入正确的手机号');
  if (!password || password.length < 6) return fail(res, 400, '密码长度至少6位');
  if (!loftName || loftName.trim().length < 2) return fail(res, 400, '请输入鸽舍名称（至少2个字符）');
  if (!verifyCode) return fail(res, 400, '请输入验证码');

  // 验证码校验（优先 DB sms_logs，fallback 内存 Map）
  const smsOk = verifySmsCode(phone, 'register', verifyCode);
  if (!smsOk.ok) {
    // fallback：兼容旧内存校验（send-code 也写 verifyCodeStore）
    const legacy = verifyCodeStore.get(`${phone}:register`);
    if (!legacy || legacy.code !== verifyCode || Date.now() > legacy.expireAt) {
      verifyCodeStore.delete(`${phone}:register`);
      return fail(res, 400, smsOk.reason || '验证码错误或已过期');
    }
    verifyCodeStore.delete(`${phone}:register`);
  } else {
    verifyCodeStore.delete(`${phone}:register`);
  }

  // 检查是否已存在
  const exist = db
    .prepare('SELECT id FROM users WHERE username = ? OR phone = ?')
    .get(phone, phone) as { id: number } | undefined;
  if (exist) return fail(res, 409, '该手机号已注册');

  // 创建用户
  const passwordHash = bcrypt.hashSync(password, 10);
  const nickname = loftName.trim();
  const avatar = genAvatar(nickname, Math.floor(Math.random() * 8));

  const info = db
    .prepare(
      `INSERT INTO users (username, phone, nickname, avatar, password_hash, status, cert_status)
       VALUES (?, ?, ?, ?, ?, 1, 'none')`
    )
    .run(phone, phone, nickname, avatar, passwordHash);

  const userId = info.lastInsertRowid as number;
  const token = signUserToken(userId, phone);
  const membership = buildMembership(userId);

  return ok(res, {
    userId, phone, nickname, avatar, token, membership,
  }, '注册成功');
});

// ---------- POST /api/user/login ----------
router.post('/user/login', (req, res) => {
  const { phone, password, verifyCode } = req.body as {
    phone?: string; password?: string; verifyCode?: string;
  };

  if (!phone || !PHONE_RE.test(phone)) return fail(res, 400, '请输入正确的手机号');
  if (!password && !verifyCode) return fail(res, 400, '请提供密码或验证码');

  const user = db
    .prepare('SELECT * FROM users WHERE username = ? OR phone = ?')
    .get(phone, phone) as
    | { id: number; username: string; phone: string; nickname: string; avatar: string; status: number; password_hash: string | null }
    | undefined;

  // 验证码登录
  if (verifyCode) {
    // DB 校验优先 + 内存 fallback
    const smsOk = verifySmsCode(phone, 'login', verifyCode);
    if (!smsOk.ok) {
      const legacy = verifyCodeStore.get(`${phone}:login`);
      if (!legacy || legacy.code !== verifyCode || Date.now() > legacy.expireAt) {
        verifyCodeStore.delete(`${phone}:login`);
        return fail(res, 400, smsOk.reason || '验证码错误或已过期');
      }
      verifyCodeStore.delete(`${phone}:login`);
    } else {
      verifyCodeStore.delete(`${phone}:login`);
    }

    if (!user) {
      // 验证码登录自动注册
      const nickname = '鸽友' + phone.slice(-4);
      const avatar = genAvatar(nickname, phone.slice(-1) as unknown as number);
      const info = db
        .prepare(
          `INSERT INTO users (username, phone, nickname, avatar, status, cert_status)
           VALUES (?, ?, ?, ?, 1, 'none')`
        )
        .run(phone, phone, nickname, avatar);
      const newId = info.lastInsertRowid as number;
      const token = signUserToken(newId, phone);
      const membership = buildMembership(newId);
      return ok(res, { userId: newId, phone, nickname, avatar, token, membership }, '登录成功');
    }

    if (user.status !== 1) return fail(res, 403, '账号已被封禁');
    const token = signUserToken(user.id, phone);
    const membership = buildMembership(user.id);
    return ok(res, {
      userId: user.id, phone, nickname: user.nickname, avatar: user.avatar, token, membership,
    }, '登录成功');
  }

  // 密码登录
  if (!user) return fail(res, 401, '该账号未注册');
  if (user.status !== 1) return fail(res, 403, '账号已被封禁');
  if (!user.password_hash) return fail(res, 401, '该账号未设置密码，请使用验证码登录');
  if (!bcrypt.compareSync(password as string, user.password_hash)) {
    return fail(res, 401, '手机号或密码错误');
  }

  const token = signUserToken(user.id, phone);
  const membership = buildMembership(user.id);
  return ok(res, {
    userId: user.id, phone, nickname: user.nickname, avatar: user.avatar, token, membership,
  }, '登录成功');
});

// ============================================================================
// C 端用户 —— "我自己" 的个人资料接口 (需 C 端 token 鉴权)
// ============================================================================

/** 字段白名单:允许 C 端用户自己修改的字段 */
const USER_UPDATABLE_FIELDS = [
  'nickname', 'avatar', 'signature', 'gender', 'birthday',
  'province', 'city', 'district',
  'real_name', 'wallet_address', 'email',
  'loft_name', 'loft_location', 'loft_intro',
] as const;

// ---------- GET /api/user/me ----------
router.get('/user/me', authenticateUser, (req: AuthedRequest, res: Response) => {
  const uid = req.user!.id;
  const row = db.prepare(
    `SELECT id, username, nickname, avatar, phone, real_name, id_card, signature, gender,
            birthday, province, city, district, wallet_address, email,
            loft_name, loft_location, loft_intro, associations,
            id_card_front, id_card_back, id_card_handheld,
            loft_photo_front, loft_photo_back, loft_handheld,
            cert_status, real_name_status, loft_owner_status,
            audit_remark,
            status, growth_value, member_level_id, created_at, updated_at
     FROM users WHERE id = ?`
  ).get(uid) as Record<string, unknown> | undefined;

  if (!row) return fail(res, 404, '用户不存在');

  // associations TEXT → JSON.parse 返回数组
  if (row.associations && typeof row.associations === 'string') {
    try {
      row.associations = JSON.parse(row.associations);
    } catch {
      row.associations = [];
    }
  } else if (!row.associations) {
    row.associations = [];
  }

  return ok(res, row);
});

// ---------- PUT /api/user/me ----------
router.put('/user/me', authenticateUser, (req: AuthedRequest, res: Response) => {
  const uid = req.user!.id;
  const body = req.body as Record<string, unknown>;

  // 过滤出允许的字段
  const updates: Record<string, unknown> = {};
  for (const key of USER_UPDATABLE_FIELDS) {
    if (key in body) {
      // trim 字符串字段
      const val = body[key];
      updates[key] = typeof val === 'string' ? val.trim() : val;
    }
  }
  // associations 单独处理:数组 → JSON.stringify
  if (Array.isArray(body.associations)) {
    updates.associations = JSON.stringify(body.associations);
  }

  if (Object.keys(updates).length === 0) {
    return fail(res, 400, '未提供需要更新的字段');
  }

  const setClause = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
  const values = [...Object.values(updates), Date.now(), uid];

  db.prepare(
    `UPDATE users SET ${setClause}, updated_at = ? WHERE id = ?`
  ).run(...values);

  // 读取最新数据返回
  const updated = db.prepare('SELECT id, nickname, avatar, phone FROM users WHERE id = ?')
    .get(uid) as Record<string, unknown>;

  return ok(res, updated, '更新成功');
});

// POST /api/user/me/real-name-submit — C 端用户提交实名认证
// 字段映射：payload.front_image → DB id_card_front（身份证正面）
//           payload.back_image  → DB id_card_back （身份证反面）
//           payload.liveness_image → DB id_card_handheld（活体检测照片）
// 注意：DB 列名 id_card_handheld 是历史遗留，实际语义是活体检测照片
router.post('/user/me/real-name-submit', authenticateUser, (req: AuthedRequest, res: Response) => {
  const uid = req.user!.id;
  const body = req.body as Record<string, unknown>;
  const real_name = typeof body.real_name === 'string' ? body.real_name.trim() : '';
  const id_card = typeof body.id_card === 'string' ? body.id_card.trim().toUpperCase() : '';
  const front_image = typeof body.front_image === 'string' ? body.front_image : '';
  const back_image = typeof body.back_image === 'string' ? body.back_image : '';
  const liveness_image = typeof body.liveness_image === 'string' ? body.liveness_image : '';

  if (!real_name) return fail(res, 400, '请填写真实姓名');
  if (!id_card || !/^\d{17}[\dX]$/.test(id_card)) return fail(res, 400, '请填写正确的身份证号');
  if (!front_image || !back_image || !liveness_image) return fail(res, 400, '请完成所有照片上传');

  db.prepare(
    `UPDATE users SET real_name = ?, id_card = ?,
                     id_card_front = ?, id_card_back = ?, id_card_handheld = ?,
                     real_name_status = 'pending',
                     audit_remark = NULL, updated_at = ? WHERE id = ?`
  ).run(real_name, id_card, front_image, back_image, liveness_image, Date.now(), uid);

  const row = db.prepare(
    'SELECT real_name, id_card, id_card_front, id_card_back, id_card_handheld, real_name_status, updated_at FROM users WHERE id = ?'
  ).get(uid);

  return ok(res, row, '提交成功，等待审核');
});

// POST /api/user/me/loft-submit — C 端用户提交鸽主认证
router.post('/user/me/loft-submit', authenticateUser, (req: AuthedRequest, res: Response) => {
  const uid = req.user!.id;
  const body = req.body as Record<string, unknown>;
  const loft_name = typeof body.loft_name === 'string' ? body.loft_name.trim() : '';
  const loft_location = typeof body.loft_location === 'string' ? body.loft_location.trim() : '';
  const loft_intro = typeof body.loft_intro === 'string' ? body.loft_intro.trim() : '';
  const front_image = typeof body.front_image === 'string' ? body.front_image : '';
  const back_image = typeof body.back_image === 'string' ? body.back_image : '';
  const handheld_image = typeof body.handheld_image === 'string' ? body.handheld_image : '';

  if (!loft_name) return fail(res, 400, '请填写鸽舍名称');
  if (!loft_location) return fail(res, 400, '请填写鸽舍位置');
  if (!front_image || !back_image || !handheld_image) return fail(res, 400, '请完成所有照片上传');

  db.prepare(
    `UPDATE users SET loft_name = ?, loft_location = ?, loft_intro = ?,
                     loft_photo_front = ?, loft_photo_back = ?, loft_handheld = ?,
                     loft_owner_status = 'pending',
                     audit_remark = NULL, updated_at = ? WHERE id = ?`
  ).run(loft_name, loft_location, loft_intro, front_image, back_image, handheld_image, Date.now(), uid);

  const row = db.prepare(
    'SELECT loft_name, loft_location, loft_owner_status, updated_at FROM users WHERE id = ?'
  ).get(uid);

  return ok(res, row, '提交成功，等待审核');
});

// ==================== 公开站点品牌配置（C 端 & 管理后台登录页读取，无需鉴权） ====================
router.get('/site-config', (_req, res) => {
  try {
    const rows = db
      .prepare(
        "SELECT config_key, config_value FROM system_config WHERE config_key IN ('platform_logo_url','platform_name','platform_subtitle','admin_login_banner')"
      )
      .all() as Array<{ config_key: string; config_value: string | null }>;

    const map = new Map(rows.map((r) => [r.config_key, r.config_value ?? '']));

    let bannerRaw = map.get('admin_login_banner') || '[]';
    let adminLoginBanner: Array<{ url: string; caption?: string; link?: string }> = [];
    try {
      const parsed = JSON.parse(bannerRaw);
      if (Array.isArray(parsed)) adminLoginBanner = parsed;
    } catch {
      adminLoginBanner = [];
    }

    return ok(res, {
      platform_logo_url: map.get('platform_logo_url') || '',
      platform_name: map.get('platform_name') || '',
      platform_subtitle: map.get('platform_subtitle') || '',
      admin_login_banner: adminLoginBanner,
    });
  } catch (err) {
    const e = err as Error;
    return fail(res, 500, '站点配置读取失败: ' + e.message);
  }
});

// ============================================================================
// C 端会员付费订阅模块
// ============================================================================

/** 有效期叠加:续费时叠加到原到期日之后,已过期/首次付费从 now 开始 */
export function computeNewExpireAt(currentExpireAt: number | null, durationDays: number): number {
  const now = Date.now();
  const durationMs = durationDays * 86_400_000; // 86400000ms = 1 天
  if (!currentExpireAt || currentExpireAt <= now) {
    return now + durationMs;
  }
  return currentExpireAt + durationMs;
}

/** 订单号生成 */
function genOrderNo(): string {
  const ts = Date.now().toString(36);
  const rand = Math.floor(Math.random() * 10_000).toString().padStart(4, '0');
  return `MEMBER-${ts}-${rand}`.toUpperCase();
}

/** 会员权益条目类型 */
interface BenefitItem {
  id: number;
  name: string;
  type: string;
  value: string | null;
  description: string | null;
}

/** 批量查询某等级的权益条目(只查 status=1) */
function queryBenefitsByLevel(levelId: number): BenefitItem[] {
  return db.prepare(
    `SELECT id, name, type, value, description
     FROM member_benefits WHERE level_id = ? AND status = 1
     ORDER BY id ASC`
  ).all(levelId) as BenefitItem[];
}

/** 构建某用户的 membership 信息(查询函数,供 subscribe/login/register 复用) */
function buildMembership(userId: number): {
  levelId: number | null;
  levelName: string | null;
  levelCode: string | null;
  levelPrice: number;
  levelDurationDays: number;
  memberExpireAt: number | null;
  memberRemainingDays: number | null;
  memberSource: string;
  memberBenefits: BenefitItem[];
} {
  const row = db.prepare(
    `SELECT u.member_level_id, u.member_expire_at, u.member_source,
            ml.name AS level_name, ml.code AS level_code, ml.price, ml.duration_days
     FROM users u
     LEFT JOIN member_levels ml ON ml.id = u.member_level_id
     WHERE u.id = ?`
  ).get(userId) as
    | {
        member_level_id: number | null;
        member_expire_at: number | null;
        member_source: string | null;
        level_name: string | null;
        level_code: string | null;
        price: number | null;
        duration_days: number | null;
      }
    | undefined;

  if (!row) {
    return {
      levelId: null, levelName: null, levelCode: null,
      levelPrice: 0, levelDurationDays: 0,
      memberExpireAt: null, memberRemainingDays: null, memberSource: 'auto_growth',
      memberBenefits: [],
    };
  }

  const now = Date.now();
  const memberRemainingDays = row.member_expire_at && row.member_expire_at > now
    ? Math.ceil((row.member_expire_at - now) / 86_400_000)
    : null;

  const benefits = row.member_level_id ? queryBenefitsByLevel(row.member_level_id) : [];

  return {
    levelId: row.member_level_id,
    levelName: row.level_name,
    levelCode: row.level_code,
    levelPrice: row.price ?? 0,
    levelDurationDays: row.duration_days ?? 0,
    memberExpireAt: row.member_expire_at,
    memberRemainingDays,
    memberSource: row.member_source ?? 'auto_growth',
    memberBenefits: benefits,
  };
}

// ---------- GET /api/user/levels —— C 端可用会员等级列表 ----------
router.get('/user/levels', (_req, res) => {
  const rows = db.prepare(
    `SELECT id, code, name, icon, benefits, min_growth, sort, price, duration_days, status
     FROM member_levels WHERE status = 1 ORDER BY sort ASC`
  ).all() as Array<{
    id: number; code: string; name: string; icon: string | null;
    benefits: string | null; min_growth: number; sort: number;
    price: number; duration_days: number; status: number;
  }>;
  // 每个等级追加 benefits_list(从 member_benefits JOIN)
  const enriched = rows.map((l) => ({
    ...l,
    benefits_list: queryBenefitsByLevel(l.id),
  }));
  return ok(res, enriched);
});

// ---------- GET /api/user/me/membership —— 当前会员状态 ----------
router.get('/user/me/membership', authenticateUser, (req: AuthedRequest, res: Response) => {
  const uid = req.user!.id;
  return ok(res, buildMembership(uid));
});

// ---------- POST /api/user/me/subscribe —— 会员订阅(核心) ----------
router.post('/user/me/subscribe', authenticateUser, (req: AuthedRequest, res: Response) => {
  const uid = req.user!.id;
  const { level_id, pay_method = 'mock' } = req.body as { level_id?: number; pay_method?: string };

  // 参数校验
  if (!level_id || typeof level_id !== 'number') {
    return fail(res, 400, '请指定目标会员等级');
  }

  const level = db.prepare(
    'SELECT id, code, name, price, duration_days, status FROM member_levels WHERE id = ?'
  ).get(level_id) as
    | { id: number; code: string; name: string; price: number; duration_days: number; status: number }
    | undefined;

  if (!level) return fail(res, 404, '会员等级不存在');
  if (level.status !== 1) return fail(res, 400, '该会员等级暂不可用');
  if (level.price <= 0) return fail(res, 400, '该等级为免费等级,无需订阅');
  if (!level.duration_days || level.duration_days <= 0) {
    return fail(res, 400, '该等级未配置订阅时长');
  }

  // 用户状态校验
  const userRow = db.prepare(
    'SELECT status, member_expire_at FROM users WHERE id = ?'
  ).get(uid) as { status: number; member_expire_at: number | null };
  if (!userRow) return fail(res, 404, '用户不存在');
  if (userRow.status !== 1) return fail(res, 403, '账号已被封禁');

  // 幂等保护:3 秒内同一用户对同一等级的重复提交,返回上一笔订单
  const nowMs = Date.now();
  const threeSecAgo = nowMs - 3000;
  const recentDup = db.prepare(
    `SELECT order_no FROM member_orders
     WHERE user_id = ? AND level_id = ? AND created_at >= ?
     ORDER BY created_at DESC LIMIT 1`
  ).get(uid, level_id, threeSecAgo) as { order_no: string } | undefined;

  // 幂等快速返回:3 秒内重复提交,直接返回已有订单 + 会员状态
  if (recentDup) {
    const membership = buildMembership(uid);
    return ok(res, {
      orderNo: recentDup.order_no,
      idempotent: true,
      levelId: level.id,
      levelName: level.name,
      price: level.price,
      durationDays: level.duration_days,
      startAt: null,
      endAt: membership.memberExpireAt,
      membership,
    }, '已存在同名订阅订单');
  }

  // 事务:创建订单 + 更新用户
  let newOrderNo = '';
  const tx = db.transaction(() => {
    const currentExpire = userRow.member_expire_at;
    const newExpire = computeNewExpireAt(currentExpire, level.duration_days);
    const startAt = currentExpire && currentExpire > nowMs ? currentExpire : nowMs;
    newOrderNo = genOrderNo();

    // 更新 users
    db.prepare(
      `UPDATE users
       SET member_level_id = ?, member_expire_at = ?, member_source = 'paid', updated_at = ?
       WHERE id = ?`
    ).run(level.id, newExpire, nowMs, uid);

    // 创建订单
    db.prepare(
      `INSERT INTO member_orders (user_id, level_id, order_no, price, duration_days, pay_method, start_at, end_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(uid, level.id, newOrderNo, level.price, level.duration_days, pay_method, startAt, newExpire);

    return newExpire;
  });

  const expireAt = tx();
  const membership = buildMembership(uid);

  return ok(res, {
    orderNo: newOrderNo,
    idempotent: false,
    levelId: level.id,
    levelName: level.name,
    price: level.price,
    durationDays: level.duration_days,
    startAt: nowMs,
    endAt: expireAt,
    membership,
  }, '订阅成功');
});

// ---------- GET /api/user/me/member-orders —— 历史订单列表 ----------
router.get('/user/me/member-orders', authenticateUser, (req: AuthedRequest, res: Response) => {
  const uid = req.user!.id;
  const { page = 1, page_size = 20 } = req.query as { page?: string | number; page_size?: string | number };
  const p = Math.max(1, Number(page) || 1);
  const ps = Math.min(100, Math.max(1, Number(page_size) || 20));
  const offset = (p - 1) * ps;

  const total = (db.prepare(
    'SELECT COUNT(*) AS c FROM member_orders WHERE user_id = ?'
  ).get(uid) as { c: number }).c;

  const list = db.prepare(
    `SELECT mo.id, mo.order_no, mo.price, mo.duration_days, mo.pay_method,
            mo.start_at, mo.end_at, mo.created_at,
            ml.name AS level_name, ml.code AS level_code
     FROM member_orders mo
     LEFT JOIN member_levels ml ON ml.id = mo.level_id
     WHERE mo.user_id = ?
     ORDER BY mo.created_at DESC
     LIMIT ? OFFSET ?`
  ).all(uid, ps, offset) as Array<{
    id: number; order_no: string; price: number; duration_days: number;
    pay_method: string; start_at: number; end_at: number; created_at: number;
    level_name: string | null; level_code: string | null;
  }>;

  return ok(res, { list, total, page: p, pageSize: ps });
});

// ---------- POST /api/user/me/change-password —— C 端用户自助改密 ----------
// body: { verifyCode, newPassword }  —— 通过短信验证码二次验证,无需当前密码
router.post('/user/me/change-password', authenticateUser, (req: AuthedRequest, res: Response) => {
  const uid = req.user!.id;
  const { verifyCode, newPassword } = req.body as { verifyCode?: string; newPassword?: string };

  // 1. 校验新密码
  if (!newPassword || newPassword.length < 8 || newPassword.length > 20) {
    return fail(res, 400, '新密码长度需 8-20 位');
  }
  if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
    return fail(res, 400, '新密码需同时包含字母和数字');
  }

  // 2. 取用户手机号
  const user = db.prepare('SELECT phone FROM users WHERE id = ?').get(uid) as { phone: string } | undefined;
  if (!user) return fail(res, 404, '用户不存在');
  if (!user.phone) return fail(res, 400, '账号未绑定手机号，无法使用验证码改密');

  // 3. 校验短信验证码（scene=reset_password）
  if (!verifyCode) return fail(res, 400, '请输入短信验证码');
  const smsOk = verifySmsCode(user.phone, 'reset_password', verifyCode);
  if (!smsOk.ok) {
    const legacy = verifyCodeStore.get(`${user.phone}:reset_password`);
    if (!legacy || legacy.code !== verifyCode || Date.now() > legacy.expireAt) {
      verifyCodeStore.delete(`${user.phone}:reset_password`);
      return fail(res, 400, smsOk.reason || '验证码错误或已过期');
    }
    verifyCodeStore.delete(`${user.phone}:reset_password`);
  } else {
    verifyCodeStore.delete(`${user.phone}:reset_password`);
  }

  // 4. 更新密码
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, uid);

  return ok(res, null, '密码修改成功，请使用新密码重新登录');
});

export default router;
