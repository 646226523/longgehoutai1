import { Router, Response } from 'express';
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

// GET /api/system/roles - 角色列表(支持分页与关键字)
router.get('/', requirePermission('system:role:manage'), (req: AuthedRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const pageSize = Math.max(1, parseInt(String(req.query.pageSize ?? '10'), 10) || 10);
  const keyword = String(req.query.keyword ?? '').trim();
  // 不分页时返回全部(便于下拉)
  const listAll = req.query.list === 'all';

  const where: string[] = [];
  const params: Array<string | number> = [];
  if (keyword) {
    where.push('(code LIKE ? OR name LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  if (listAll) {
    const rows = db
      .prepare(`SELECT id, code, name, description, is_super, status, created_at FROM roles ${whereSql} ORDER BY id`)
      .all(...params);
    return ok(res, { list: rows, total: (rows as unknown[]).length });
  }

  const total = (
    db.prepare(`SELECT COUNT(*) AS c FROM roles ${whereSql}`).get(...params) as { c: number }
  ).c;

  const list = db
    .prepare(
      `SELECT id, code, name, description, is_super, status, created_at
       FROM roles ${whereSql}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, (page - 1) * pageSize);

  return ok(res, { list, total });
});

// POST /api/system/roles - 新增角色
router.post(
  '/',
  requirePermission('system:role:manage'),
  auditMiddleware('role', 'create'),
  (req: AuthedRequest, res: Response) => {
    const { code, name, description, status } = req.body as {
      code?: string;
      name?: string;
      description?: string;
      status?: number;
    };
    if (!code || !name) {
      return fail(res, 400, '角色编码与名称不能为空');
    }
    const exists = db.prepare('SELECT id FROM roles WHERE code = ?').get(code);
    if (exists) {
      return fail(res, 409, '角色编码已存在');
    }
    const result = db
      .prepare('INSERT INTO roles (code, name, description, is_super, status) VALUES (?, ?, ?, 0, ?)')
      .run(code, name, description ?? null, status ?? 1);
    return ok(res, { id: result.lastInsertRowid as number }, '新增成功');
  }
);

// PUT /api/system/roles/:id - 编辑角色
router.put(
  '/:id',
  requirePermission('system:role:manage'),
  auditMiddleware('role', 'update'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的角色 ID');
    }
    const before = db
      .prepare('SELECT id, code, name, description, is_super, status FROM roles WHERE id = ?')
      .get(id) as
      | { id: number; code: string; name: string; description: string | null; is_super: number; status: number }
      | undefined;
    if (!before) {
      return fail(res, 404, '角色不存在');
    }
    // 注入运行时审计数据（before + objectName），供 auditMiddleware 自动生成 diff 和摘要
    res.locals.audit = {
      before,
      objectName: before.name,
      targetId: id,
      targetType: 'role',
    };

    const { name, description, status } = req.body as {
      name?: string;
      description?: string;
      status?: number;
    };
    // 编码与超管标识不允许修改
    db.prepare('UPDATE roles SET name = ?, description = ?, status = ?, updated_at = ? WHERE id = ?').run(
      name ?? '',
      description ?? null,
      status ?? 1,
      Date.now(),
      id
    );
    return ok(res, null, '更新成功');
  }
);

// DELETE /api/system/roles/:id - 删除(禁止删除超管角色;有用户关联时提示)
router.delete(
  '/:id',
  requirePermission('system:role:manage'),
  auditMiddleware('role', 'delete'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的角色 ID');
    }
    const before = db
      .prepare('SELECT id, code, name, is_super FROM roles WHERE id = ?')
      .get(id) as { id: number; code: string; name: string; is_super: number } | undefined;
    if (!before) {
      return fail(res, 404, '角色不存在');
    }
    if (before.is_super === 1) {
      return fail(res, 400, '不能删除超级管理员角色');
    }
    // 检查是否有用户关联
    const linked = db
      .prepare('SELECT COUNT(*) AS c FROM admin_user_roles WHERE role_id = ?')
      .get(id) as { c: number };
    if (linked.c > 0) {
      return fail(res, 400, `该角色仍有 ${linked.c} 个管理员关联,请先解除关联后再删除`);
    }
    // 注入运行时审计数据（delete 时 before 为被删对象）
    res.locals.audit = {
      before,
      objectName: before.name,
      targetId: id,
      targetType: 'role',
    };
    // 删除角色及权限关联(外键级联)
    db.prepare('DELETE FROM roles WHERE id = ?').run(id);
    return ok(res, null, '删除成功');
  }
);

// GET /api/system/roles/:id/permissions - 查询角色权限
router.get('/:id/permissions', requirePermission('system:role:manage'), (req: AuthedRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) {
    return fail(res, 400, '无效的角色 ID');
  }
  const role = db.prepare('SELECT id FROM roles WHERE id = ?').get(id);
  if (!role) {
    return fail(res, 404, '角色不存在');
  }
  const rows = db
    .prepare('SELECT permission_id FROM role_permissions WHERE role_id = ?')
    .all(id) as Array<{ permission_id: number }>;
  return ok(res, rows.map((r) => r.permission_id));
});

// PUT /api/system/roles/:id/permissions - 分配权限(权限ID数组)
router.put(
  '/:id/permissions',
  requirePermission('system:role:manage'),
  auditMiddleware('role', 'assign_permissions'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的角色 ID');
    }
    const role = db
      .prepare('SELECT id, name, is_super FROM roles WHERE id = ?')
      .get(id) as { id: number; name: string; is_super: number } | undefined;
    if (!role) {
      return fail(res, 404, '角色不存在');
    }
    // 超管角色无需分配权限
    if (role.is_super === 1) {
      return ok(res, null, '超级管理员拥有全部权限,无需分配');
    }
    const { permission_ids } = req.body as { permission_ids?: number[] };
    const ids = Array.isArray(permission_ids) ? permission_ids : [];

    // 注入运行时审计数据：before 为旧权限列表，after 通过 request body 自动对比
    const before = db
      .prepare('SELECT permission_id FROM role_permissions WHERE role_id = ?')
      .all(id) as Array<{ permission_id: number }>;
    res.locals.audit = {
      before: { permissions: before.map((r) => r.permission_id) },
      objectName: role.name,
      targetId: id,
      targetType: 'role',
    };

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(id);
      if (ids.length) {
        const stmt = db.prepare(
          'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)'
        );
        ids.forEach((pid) => stmt.run(id, pid));
      }
    });
    tx();

    return ok(res, null, '权限分配成功');
  }
);

export default router;
