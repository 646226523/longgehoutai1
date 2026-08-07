import { Router, Response } from 'express';
import db from '../../db';
import { authenticate, requirePermission } from '../../middlewares/auth';
import type { AuthedRequest, ApiResponse } from '../../types';

const router = Router();

// 统一成功响应
function ok<T>(res: Response, data: T, message = 'success'): Response {
  const body: ApiResponse<T> = { code: 0, message, data };
  return res.json(body);
}

// 所有接口均需登录鉴权
router.use(authenticate);

// GET /api/system/audit-logs - 分页查询(支持操作人/模块/时间范围筛选)
router.get('/', requirePermission('system:audit:view'), (req: AuthedRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const pageSize = Math.max(1, parseInt(String(req.query.pageSize ?? '10'), 10) || 10);
  const operator = String(req.query.operator ?? '').trim();
  const moduleName = String(req.query.module ?? '').trim();
  const action = String(req.query.action ?? '').trim();
  const startTime = req.query.startTime;
  const endTime = req.query.endTime;

  const where: string[] = [];
  const params: Array<string | number> = [];
  if (operator) {
    where.push('(admin_username LIKE ? OR admin_user_id IN (SELECT id FROM admin_users WHERE username LIKE ? OR nickname LIKE ?))');
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
              request_body, response_body, duration_ms, ip, user_agent, status_code, created_at
       FROM audit_logs ${whereSql}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, (page - 1) * pageSize);

  return ok(res, { list, total });
});

// GET /api/system/audit-logs/modules - 模块下拉(便于筛选)
router.get('/modules', requirePermission('system:audit:view'), (_req: AuthedRequest, res: Response) => {
  const rows = db
    .prepare('SELECT DISTINCT module FROM audit_logs WHERE module IS NOT NULL ORDER BY module')
    .all() as Array<{ module: string }>;
  return ok(res, rows.map((r) => r.module));
});

// GET /api/system/audit-logs/export - 简易导出(返回最近 1000 条 JSON)
router.get('/export', requirePermission('system:audit:view'), (_req: AuthedRequest, res: Response) => {
  const list = db
    .prepare(
      `SELECT id, admin_user_id, admin_username, module, action, method, path, params,
              request_body, response_body, duration_ms, ip, user_agent, status_code, created_at
       FROM audit_logs
       ORDER BY created_at DESC
       LIMIT 1000`
    )
    .all();
  return ok(res, list);
});

export default router;
