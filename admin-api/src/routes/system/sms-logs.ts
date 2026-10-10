import { Router, Response } from 'express';
import db from '../../db';
import { authenticate } from '../../middlewares/auth';
import type { AuthedRequest, ApiResponse } from '../../types';

const router = Router();

function ok<T>(res: Response, data: T, message = 'success'): Response {
  const body: ApiResponse<T> = { code: 0, message, data };
  return res.json(body);
}

// 场景和状态白名单（防止 SQL 注入）
const ALLOWED_SCENES = new Set(['register', 'login', 'reset_password']);
const ALLOWED_STATUSES = new Set(['sent', 'failed', 'used', 'expired']);
const ALLOWED_PROVIDERS = new Set(['tencent', 'dev_null']);

// 所有接口均需登录鉴权（不额外加细粒度权限，嵌在 Config 页里管理员能进就能看）
router.use(authenticate);

// GET /api/system/sms-logs — 分页查询
router.get('/', (req: AuthedRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const pageSize = Math.max(1, Math.min(200, parseInt(String(req.query.pageSize ?? '20'), 10) || 20));
  const phone = String(req.query.phone ?? '').trim();
  const scene = String(req.query.scene ?? '').trim();
  const status = String(req.query.status ?? '').trim();
  const provider = String(req.query.provider ?? '').trim();
  const keyword = String(req.query.keyword ?? '').trim();
  const startTime = req.query.startTime;
  const endTime = req.query.endTime;

  const where: string[] = [];
  const params: Array<string | number> = [];

  if (phone) {
    // 手机号支持精确 + 前/后缀模糊
    if (phone.startsWith('%') || phone.endsWith('%')) {
      where.push('phone LIKE ?');
      params.push(phone);
    } else {
      where.push('phone LIKE ?');
      params.push(`%${phone}%`);
    }
  }
  if (scene && ALLOWED_SCENES.has(scene)) {
    where.push('scene = ?');
    params.push(scene);
  }
  if (status && ALLOWED_STATUSES.has(status)) {
    where.push('status = ?');
    params.push(status);
  }
  if (provider && ALLOWED_PROVIDERS.has(provider)) {
    where.push('provider = ?');
    params.push(provider);
  }
  if (keyword) {
    where.push('(phone LIKE ? OR error_msg LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (startTime) {
    where.push('created_at >= ?');
    params.push(Number(startTime));
  }
  if (endTime) {
    where.push('created_at <= ?');
    params.push(Number(endTime));
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = (
    db.prepare(`SELECT COUNT(*) AS c FROM sms_logs ${whereSql}`).get(...params) as { c: number }
  ).c;

  // ⚠️ 严格不 SELECT code 字段（安全：不暴露用户验证码给管理员）
  const list = db
    .prepare(
      `SELECT id, phone, scene, provider, status, error_msg,
              created_at, expire_at, used_at
       FROM sms_logs ${whereSql}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, pageSize, (page - 1) * pageSize);

  return ok(res, { list, total });
});

// GET /api/system/sms-logs/stats — 统计概览
router.get('/stats', (_req: AuthedRequest, res: Response) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayMs = now.getTime();

  const total = (db.prepare('SELECT COUNT(*) AS c FROM sms_logs').get() as { c: number }).c;
  const todayCount = (
    db.prepare('SELECT COUNT(*) AS c FROM sms_logs WHERE created_at >= ?').get(todayMs) as { c: number }
  ).c;
  const sentCount = (
    db.prepare("SELECT COUNT(*) AS c FROM sms_logs WHERE status = 'sent'").get() as { c: number }
  ).c;
  const failedCount = (
    db.prepare("SELECT COUNT(*) AS c FROM sms_logs WHERE status = 'failed'").get() as { c: number }
  ).c;
  const usedCount = (
    db.prepare("SELECT COUNT(*) AS c FROM sms_logs WHERE status = 'used'").get() as { c: number }
  ).c;
  const expiredCount = (
    db.prepare("SELECT COUNT(*) AS c FROM sms_logs WHERE status = 'expired'").get() as { c: number }
  ).c;
  const distinctPhone = (
    db.prepare('SELECT COUNT(DISTINCT phone) AS c FROM sms_logs').get() as { c: number }
  ).c;

  return ok(res, { total, todayCount, sentCount, failedCount, usedCount, expiredCount, distinctPhone });
});

// GET /api/system/sms-logs/scenes — 场景下拉选项（固定枚举）
router.get('/scenes', (_req: AuthedRequest, res: Response) => {
  return ok(res, [
    { value: 'register', label: '注册验证' },
    { value: 'login', label: '登录验证' },
    { value: 'reset_password', label: '重置密码' },
  ]);
});

// GET /api/system/sms-logs/statuses — 状态下拉选项（固定枚举）
router.get('/statuses', (_req: AuthedRequest, res: Response) => {
  return ok(res, [
    { value: 'sent', label: '已发送', color: 'blue' },
    { value: 'failed', label: '发送失败', color: 'red' },
    { value: 'used', label: '已使用', color: 'green' },
    { value: 'expired', label: '已过期', color: 'orange' },
  ]);
});

export default router;
