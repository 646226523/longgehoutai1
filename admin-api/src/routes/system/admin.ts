import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../../db';
import { authenticate, requirePermission } from '../../middlewares/auth';
import { auditMiddleware } from '../../middlewares/audit';
import type { AuthedRequest, ApiResponse } from '../../types';

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

// 所有接口均需登录鉴权
router.use(authenticate);

// 管理员列表行结构(关联角色名/编码)
interface AdminRow {
  id: number;
  username: string;
  nickname: string;
  avatar: string | null;
  email: string | null;
  phone: string | null;
  status: number;
  last_login_at: number | null;
  created_at: number;
  updated_at: number;
  role_ids: string | null;
  role_names: string | null;
  role_codes: string | null;
}

// 解析逗号分隔的关联字段为数组
function parseList(value: string | null): string[] {
  if (!value) return [];
  return value.split(',').filter(Boolean);
}

// GET /api/system/admins - 分页列表(支持用户名/状态筛选,关联角色名)
router.get('/', requirePermission('system:admin:manage'), (req: AuthedRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const pageSize = Math.max(1, parseInt(String(req.query.pageSize ?? '10'), 10) || 10);
  const username = String(req.query.username ?? '').trim();
  const status = req.query.status;

  const where: string[] = [];
  const params: Array<string | number> = [];
  if (username) {
    where.push("(a.username LIKE ? OR a.nickname LIKE ?)");
    params.push(`%${username}%`, `%${username}%`);
  }
  if (status !== undefined && status !== '') {
    where.push('a.status = ?');
    params.push(Number(status));
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = (
    db.prepare(`SELECT COUNT(*) AS c FROM admin_users a ${whereSql}`).get(...params) as { c: number }
  ).c;

  const rows = db
    .prepare(
      `SELECT a.id, a.username, a.nickname, a.avatar, a.email, a.phone, a.status,
              a.last_login_at, a.created_at, a.updated_at,
              GROUP_CONCAT(r.id) AS role_ids,
              GROUP_CONCAT(r.name) AS role_names,
              GROUP_CONCAT(r.code) AS role_codes
       FROM admin_users a
       LEFT JOIN admin_user_roles aur ON aur.admin_user_id = a.id
       LEFT JOIN roles r ON r.id = aur.role_id
       ${whereSql}
       GROUP BY a.id
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, (page - 1) * pageSize) as AdminRow[];

  const list = rows.map((r) => ({
    id: r.id,
    username: r.username,
    nickname: r.nickname,
    avatar: r.avatar,
    email: r.email,
    phone: r.phone,
    status: r.status,
    last_login_at: r.last_login_at,
    created_at: r.created_at,
    updated_at: r.updated_at,
    role_ids: parseList(r.role_ids).map((id) => Number(id)),
    role_names: parseList(r.role_names),
    role_codes: parseList(r.role_codes),
  }));

  return ok(res, { list, total });
});

// POST /api/system/admins - 新增管理员
router.post(
  '/',
  requirePermission('system:admin:manage'),
  auditMiddleware('admin', 'create'),
  (req: AuthedRequest, res: Response) => {
    const { username, nickname, password, phone, email, status, role_ids } = req.body as {
      username?: string;
      nickname?: string;
      password?: string;
      phone?: string;
      email?: string;
      status?: number;
      role_ids?: number[];
    };

    if (!username || !password) {
      return fail(res, 400, '用户名和密码不能为空');
    }
    if (!nickname) {
      return fail(res, 400, '姓名不能为空');
    }

    const exists = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(username);
    if (exists) {
      return fail(res, 409, '用户名已存在');
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db
      .prepare(
        `INSERT INTO admin_users (username, password, nickname, email, phone, status)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(username, hashedPassword, nickname, email ?? null, phone ?? null, status ?? 1);
    const adminId = result.lastInsertRowid as number;

    // 关联角色
    const roles = Array.isArray(role_ids) ? role_ids : [];
    if (roles.length) {
      const stmt = db.prepare('INSERT OR IGNORE INTO admin_user_roles (admin_user_id, role_id) VALUES (?, ?)');
      roles.forEach((rid) => stmt.run(adminId, rid));
    }

    return ok(res, { id: adminId }, '新增成功');
  }
);

// PUT /api/system/admins/:id - 编辑(不含密码;如传密码则更新)
router.put(
  '/:id',
  requirePermission('system:admin:manage'),
  auditMiddleware('admin', 'update'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的管理员 ID');
    }
    const target = db.prepare('SELECT id FROM admin_users WHERE id = ?').get(id);
    if (!target) {
      return fail(res, 404, '管理员不存在');
    }

    const { nickname, phone, email, status, password } = req.body as {
      nickname?: string;
      phone?: string;
      email?: string;
      status?: number;
      password?: string;
    };

    if (password) {
      // 传密码则一并更新
      const hashed = bcrypt.hashSync(password, 10);
      db.prepare(
        `UPDATE admin_users SET nickname = ?, phone = ?, email = ?, status = ?, password = ?, updated_at = ?
         WHERE id = ?`
      ).run(nickname ?? '', phone ?? null, email ?? null, status ?? 1, hashed, Date.now(), id);
    } else {
      db.prepare(
        `UPDATE admin_users SET nickname = ?, phone = ?, email = ?, status = ?, updated_at = ?
         WHERE id = ?`
      ).run(nickname ?? '', phone ?? null, email ?? null, status ?? 1, Date.now(), id);
    }

    return ok(res, null, '更新成功');
  }
);

// PATCH /api/system/admins/:id/status - 启用/禁用
router.patch(
  '/:id/status',
  requirePermission('system:admin:manage'),
  auditMiddleware('admin', 'update_status'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body as { status?: number };
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的管理员 ID');
    }
    if (status !== 0 && status !== 1) {
      return fail(res, 400, '状态值非法(0 禁用 / 1 启用)');
    }

    const target = db.prepare('SELECT id, username FROM admin_users WHERE id = ?').get(id) as
      | { id: number; username: string }
      | undefined;
    if (!target) {
      return fail(res, 404, '管理员不存在');
    }

    // 禁止禁用自己
    if (req.adminUser && req.adminUser.id === id && status === 0) {
      return fail(res, 400, '不能禁用当前登录账号');
    }

    db.prepare('UPDATE admin_users SET status = ?, updated_at = ? WHERE id = ?').run(
      status,
      Date.now(),
      id
    );
    return ok(res, null, status === 1 ? '已启用' : '已禁用');
  }
);

// DELETE /api/system/admins/:id - 删除(禁止删除超管和自己)
router.delete(
  '/:id',
  requirePermission('system:admin:manage'),
  auditMiddleware('admin', 'delete'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的管理员 ID');
    }

    // 禁止删除自己
    if (req.adminUser && req.adminUser.id === id) {
      return fail(res, 400, '不能删除当前登录账号');
    }

    const target = db.prepare('SELECT id FROM admin_users WHERE id = ?').get(id);
    if (!target) {
      return fail(res, 404, '管理员不存在');
    }

    // 禁止删除超管角色关联的账号
    const isSuper = db
      .prepare(
        `SELECT 1 FROM admin_user_roles aur
         JOIN roles r ON r.id = aur.role_id
         WHERE aur.admin_user_id = ? AND r.is_super = 1 LIMIT 1`
      )
      .get(id);
    if (isSuper) {
      return fail(res, 400, '不能删除超级管理员账号');
    }

    // 删除账号及角色关联(外键级联)
    db.prepare('DELETE FROM admin_users WHERE id = ?').run(id);
    return ok(res, null, '删除成功');
  }
);

// PUT /api/system/admins/:id/roles - 分配角色
router.put(
  '/:id/roles',
  requirePermission('system:admin:manage'),
  auditMiddleware('admin', 'assign_roles'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的管理员 ID');
    }
    const target = db.prepare('SELECT id FROM admin_users WHERE id = ?').get(id);
    if (!target) {
      return fail(res, 404, '管理员不存在');
    }
    const { role_ids } = req.body as { role_ids?: number[] };
    const roles = Array.isArray(role_ids) ? role_ids : [];

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM admin_user_roles WHERE admin_user_id = ?').run(id);
      if (roles.length) {
        const stmt = db.prepare(
          'INSERT OR IGNORE INTO admin_user_roles (admin_user_id, role_id) VALUES (?, ?)'
        );
        roles.forEach((rid) => stmt.run(id, rid));
      }
    });
    tx();

    return ok(res, null, '角色分配成功');
  }
);

// PATCH /api/system/admins/:id/reset-password - 重置密码
router.patch(
  '/:id/reset-password',
  requirePermission('system:admin:manage'),
  auditMiddleware('admin', 'reset_password'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的管理员 ID');
    }
    const target = db.prepare('SELECT id FROM admin_users WHERE id = ?').get(id);
    if (!target) {
      return fail(res, 404, '管理员不存在');
    }
    // 允许传新密码,不传则使用默认密码
    const { password } = req.body as { password?: string };
    const newPwd = password || 'admin123';
    const hashed = bcrypt.hashSync(newPwd, 10);
    db.prepare('UPDATE admin_users SET password = ?, updated_at = ? WHERE id = ?').run(
      hashed,
      Date.now(),
      id
    );
    return ok(res, null, '密码重置成功');
  }
);

// GET /api/system/admins/roles - 角色下拉选项(供前端分配角色使用)
router.get('/roles/select', requirePermission('system:admin:manage'), (_req: AuthedRequest, res: Response) => {
  const rows = db
    .prepare('SELECT id, code, name, status FROM roles ORDER BY id ASC')
    .all() as Array<{ id: number; code: string; name: string; status: number }>;
  return ok(res, rows);
});

export default router;
