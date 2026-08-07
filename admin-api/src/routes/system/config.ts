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

// ==================== 系统配置 ====================

// GET /api/system/configs - 配置列表(按分组返回)
router.get('/configs', requirePermission('system:config:manage'), (req: AuthedRequest, res: Response) => {
  const group = req.query.group;
  const whereSql = group ? 'WHERE config_group = ?' : '';
  const params = group ? [String(group)] : [];
  const rows = db
    .prepare(
      `SELECT id, config_key, config_value, name, config_group, description, sort_order, created_at, updated_at
       FROM system_config ${whereSql}
       ORDER BY config_group, sort_order, id`
    )
    .all(...params);

  // 按分组聚合
  const groups: Array<{
    group: string;
    items: Array<Record<string, unknown>>;
  }> = [];
  const groupMap = new Map<string, Array<Record<string, unknown>>>();
  rows.forEach((r) => {
    const row = r as { config_group: string };
    if (!groupMap.has(row.config_group)) {
      const arr: Array<Record<string, unknown>> = [];
      groupMap.set(row.config_group, arr);
      groups.push({ group: row.config_group, items: arr });
    }
    groupMap.get(row.config_group)!.push(r as Record<string, unknown>);
  });

  return ok(res, { groups, list: rows });
});

// PUT /api/system/configs/:key - 更新配置值
router.put(
  '/configs/:key',
  requirePermission('system:config:manage'),
  auditMiddleware('config', 'update'),
  (req: AuthedRequest, res: Response) => {
    const key = req.params.key;
    const { config_value } = req.body as { config_value?: string };
    const exists = db.prepare('SELECT id FROM system_config WHERE config_key = ?').get(key);
    if (!exists) {
      return fail(res, 404, '配置项不存在');
    }
    db.prepare('UPDATE system_config SET config_value = ?, updated_at = ? WHERE config_key = ?').run(
      config_value ?? '',
      Date.now(),
      key
    );
    return ok(res, null, '配置已更新');
  }
);

// ==================== 数据字典 ====================

// GET /api/system/dictionaries/types - 字典类型列表(供左侧类型树)
router.get('/dictionaries/types', requirePermission('system:config:manage'), (_req: AuthedRequest, res: Response) => {
  const rows = db
    .prepare(
      `SELECT dict_type, type_name, COUNT(*) AS item_count
       FROM dictionary
       GROUP BY dict_type, type_name
       ORDER BY dict_type`
    )
    .all() as Array<{ dict_type: string; type_name: string; item_count: number }>;
  return ok(res, rows);
});

// GET /api/system/dictionaries - 字典列表(按类型筛选,支持分页)
router.get('/dictionaries', requirePermission('system:config:manage'), (req: AuthedRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const pageSize = Math.max(1, parseInt(String(req.query.pageSize ?? '10'), 10) || 10);
  const dictType = req.query.dict_type ? String(req.query.dict_type) : '';
  const keyword = String(req.query.keyword ?? '').trim();
  const listAll = req.query.list === 'all';

  const where: string[] = [];
  const params: Array<string | number> = [];
  if (dictType) {
    where.push('dict_type = ?');
    params.push(dictType);
  }
  if (keyword) {
    where.push('(item_code LIKE ? OR item_name LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  if (listAll) {
    const rows = db
      .prepare(
        `SELECT id, dict_type, type_name, item_code, item_name, sort_order, status, remark, created_at, updated_at
         FROM dictionary ${whereSql}
         ORDER BY dict_type, sort_order, id`
      )
      .all(...params);
    return ok(res, { list: rows, total: (rows as unknown[]).length });
  }

  const total = (
    db.prepare(`SELECT COUNT(*) AS c FROM dictionary ${whereSql}`).get(...params) as { c: number }
  ).c;

  const list = db
    .prepare(
      `SELECT id, dict_type, type_name, item_code, item_name, sort_order, status, remark, created_at, updated_at
       FROM dictionary ${whereSql}
       ORDER BY sort_order, id
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, (page - 1) * pageSize);

  return ok(res, { list, total });
});

// POST /api/system/dictionaries - 新增字典项
router.post(
  '/dictionaries',
  requirePermission('system:config:manage'),
  auditMiddleware('dict', 'create'),
  (req: AuthedRequest, res: Response) => {
    const { dict_type, type_name, item_code, item_name, sort_order, status, remark } = req.body as {
      dict_type?: string;
      type_name?: string;
      item_code?: string;
      item_name?: string;
      sort_order?: number;
      status?: number;
      remark?: string;
    };
    if (!dict_type || !item_code || !item_name) {
      return fail(res, 400, '字典类型、编码与名称不能为空');
    }
    const exists = db
      .prepare('SELECT id FROM dictionary WHERE dict_type = ? AND item_code = ?')
      .get(dict_type, item_code);
    if (exists) {
      return fail(res, 409, '该字典类型下编码已存在');
    }
    const result = db
      .prepare(
        `INSERT INTO dictionary (dict_type, type_name, item_code, item_name, sort_order, status, remark)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        dict_type,
        type_name ?? '',
        item_code,
        item_name,
        sort_order ?? 0,
        status ?? 1,
        remark ?? null
      );
    return ok(res, { id: result.lastInsertRowid as number }, '新增成功');
  }
);

// PUT /api/system/dictionaries/:id - 编辑字典项
router.put(
  '/dictionaries/:id',
  requirePermission('system:config:manage'),
  auditMiddleware('dict', 'update'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的字典 ID');
    }
    const target = db.prepare('SELECT id FROM dictionary WHERE id = ?').get(id);
    if (!target) {
      return fail(res, 404, '字典项不存在');
    }
    const { dict_type, type_name, item_code, item_name, sort_order, status, remark } = req.body as {
      dict_type?: string;
      type_name?: string;
      item_code?: string;
      item_name?: string;
      sort_order?: number;
      status?: number;
      remark?: string;
    };
    db.prepare(
      `UPDATE dictionary SET dict_type = ?, type_name = ?, item_code = ?, item_name = ?,
              sort_order = ?, status = ?, remark = ?, updated_at = ? WHERE id = ?`
    ).run(
      dict_type ?? '',
      type_name ?? '',
      item_code ?? '',
      item_name ?? '',
      sort_order ?? 0,
      status ?? 1,
      remark ?? null,
      Date.now(),
      id
    );
    return ok(res, null, '更新成功');
  }
);

// DELETE /api/system/dictionaries/:id - 删除字典项
router.delete(
  '/dictionaries/:id',
  requirePermission('system:config:manage'),
  auditMiddleware('dict', 'delete'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的字典 ID');
    }
    const target = db.prepare('SELECT id FROM dictionary WHERE id = ?').get(id);
    if (!target) {
      return fail(res, 404, '字典项不存在');
    }
    db.prepare('DELETE FROM dictionary WHERE id = ?').run(id);
    return ok(res, null, '删除成功');
  }
);

export default router;
