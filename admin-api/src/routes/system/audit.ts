import { Router, Response } from 'express';
import db from '../../db';
import { authenticate, requirePermission } from '../../middlewares/auth';
import type { AuthedRequest, ApiResponse } from '../../types';

const router = Router();

function ok<T>(res: Response, data: T, message = 'success'): Response {
  const body: ApiResponse<T> = { code: 0, message, data };
  return res.json(body);
}

// 所有接口均需登录鉴权
router.use(authenticate);

// GET /api/system/audit-logs - 分页查询
router.get('/', requirePermission('system:audit:view'), (req: AuthedRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const pageSize = Math.max(1, parseInt(String(req.query.pageSize ?? '10'), 10) || 10);
  const operator = String(req.query.operator ?? '').trim();
  const moduleName = String(req.query.module ?? '').trim();
  const action = String(req.query.action ?? '').trim();
  const keyword = String(req.query.keyword ?? '').trim();
  const status = String(req.query.status ?? '').trim(); // success | fail
  const startTime = req.query.startTime;
  const endTime = req.query.endTime;

  const where: string[] = [];
  const params: Array<string | number> = [];

  if (operator) {
    where.push(
      '(admin_username LIKE ? OR admin_user_id IN (SELECT id FROM admin_users WHERE username LIKE ? OR nickname LIKE ?))',
    );
    params.push(`%${operator}%`, `%${operator}%`, `%${operator}%`);
  }
  if (moduleName) {
    where.push('module = ?');
    params.push(moduleName);
  }
  if (action) {
    where.push('action = ?');
    params.push(action);
  }
  if (keyword) {
    where.push('(summary LIKE ? OR path LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (status === 'success') {
    where.push('status_code >= 200 AND status_code < 400');
  } else if (status === 'fail') {
    where.push('status_code >= 400');
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
    db.prepare(`SELECT COUNT(*) AS c FROM audit_logs ${whereSql}`).get(...params) as { c: number }
  ).c;

  const list = db
    .prepare(
      `SELECT id, admin_user_id, admin_username, module, action, method, path, params,
              request_body, response_body, duration_ms, ip, user_agent, status_code,
              created_at, summary, target_type, target_id, target_name, diff_json
       FROM audit_logs ${whereSql}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, pageSize, (page - 1) * pageSize);

  return ok(res, { list, total });
});

// GET /api/system/audit-logs/modules - 模块下拉
router.get('/modules', requirePermission('system:audit:view'), (_req: AuthedRequest, res: Response) => {
  const rows = db
    .prepare('SELECT DISTINCT module FROM audit_logs WHERE module IS NOT NULL ORDER BY module')
    .all() as Array<{ module: string }>;
  return ok(res, rows.map((r) => r.module));
});

// GET /api/system/audit-logs/actions - action 下拉
router.get('/actions', requirePermission('system:audit:view'), (_req: AuthedRequest, res: Response) => {
  const rows = db
    .prepare('SELECT DISTINCT action FROM audit_logs WHERE action IS NOT NULL ORDER BY action')
    .all() as Array<{ action: string }>;
  return ok(res, rows.map((r) => r.action));
});

// GET /api/system/audit-logs/stats - 统计概览
router.get('/stats', requirePermission('system:audit:view'), (_req: AuthedRequest, res: Response) => {
  const total = (db.prepare('SELECT COUNT(*) AS c FROM audit_logs').get() as { c: number }).c;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMs = todayStart.getTime();
  const todayCount = (
    db.prepare('SELECT COUNT(*) AS c FROM audit_logs WHERE created_at >= ?').get(todayMs) as { c: number }
  ).c;
  const failCount = (
    db.prepare('SELECT COUNT(*) AS c FROM audit_logs WHERE status_code >= 400').get() as { c: number }
  ).c;
  const distinctModules = (
    db.prepare('SELECT COUNT(DISTINCT module) AS c FROM audit_logs').get() as { c: number }
  ).c;
  return ok(res, { total, todayCount, failCount, distinctModules });
});

// GET /api/system/audit-logs/export - 简易导出
router.get('/export', requirePermission('system:audit:view'), (_req: AuthedRequest, res: Response) => {
  const list = db
    .prepare(
      `SELECT id, admin_user_id, admin_username, module, action, method, path,
              request_body, response_body, duration_ms, ip, user_agent, status_code,
              created_at, summary, target_type, target_id, target_name
       FROM audit_logs
       ORDER BY created_at DESC
       LIMIT 5000`,
    )
    .all();
  return ok(res, list);
});

export default router;
