// 用户与会员体系模块路由
// 挂载:/api/user
// 子模块:
//   - /api/user/users              用户管理(SubTask 10.1):列表/详情/编辑/封禁/实名审核/鸽主审核
//   - /api/user/levels              会员等级(SubTask 10.2):CRUD/排序
//   - /api/user/levels/:id/benefits 会员权益(SubTask 10.3):某等级权益 CRUD
//   - /api/user/benefits/:id        权益编辑/删除
//   - /api/user/levels/recompute    成长值重算(按等级 min_growth 更新用户 member_level_id)

import { Router, Response } from 'express';
import db from '../db';
import bcrypt from 'bcryptjs';
import { authenticate, requirePermission } from '../middlewares/auth';
import { auditMiddleware } from '../middlewares/audit';
import type { AuthedRequest, ApiResponse } from '../types';

const userRouter = Router();

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
userRouter.use(authenticate);

// 合法的会员权益类型
const VALID_BENEFIT_TYPE = ['discount', 'count', 'privilege'];

// ==================== SubTask 10.1: 用户管理与实名/认证 ====================

// 用户列表行(关联等级名称)
interface UserRow {
  id: number;
  username: string;
  nickname: string;
  avatar: string | null;
  phone: string | null;
  real_name: string | null;
  id_card: string | null;
  status: number;
  growth_value: number;
  member_level_id: number | null;
  level_name: string | null;
  level_code: string | null;
  cert_status: string;
  real_name_status: string;
  loft_owner_status: string;
  audit_remark: string | null;
  balance: number;
  points: number;
  distributor_id: number | null;
  distributor_name: string | null;
  is_blacklisted: number;
  tags_json: string;
  created_at: number;
  updated_at: number;
}

// GET /api/user/users - 用户分页列表(支持用户名/手机/状态/认证状态筛选)
userRouter.get('/users', requirePermission('user:view'), (req: AuthedRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const pageSize = Math.max(1, parseInt(String(req.query.pageSize ?? '10'), 10) || 10);
  const keyword = String(req.query.keyword ?? '').trim();
  const status = req.query.status;
  const certStatus = String(req.query.cert_status ?? '').trim();

  const where: string[] = [];
  const params: Array<string | number> = [];
  if (keyword) {
    where.push('(u.username LIKE ? OR u.nickname LIKE ? OR u.phone LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (status !== undefined && status !== '') {
    where.push('u.status = ?');
    params.push(Number(status));
  }
  if (certStatus) {
    where.push('u.cert_status = ?');
    params.push(certStatus);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = (
    db.prepare(`SELECT COUNT(*) AS c FROM users u ${whereSql}`).get(...params) as { c: number }
  ).c;

  const rows = db
    .prepare(
      `SELECT u.id, u.username, u.nickname, u.avatar, u.phone, u.real_name, u.id_card,
              u.status, u.growth_value, u.member_level_id,
              ml.name AS level_name, ml.code AS level_code,
              u.cert_status, u.real_name_status, u.loft_owner_status, u.audit_remark,
              u.balance, u.points, u.distributor_id, d.name AS distributor_name,
              u.is_blacklisted, u.tags_json,
              u.created_at, u.updated_at
       FROM users u
       LEFT JOIN member_levels ml ON ml.id = u.member_level_id
       LEFT JOIN distributors d ON d.id = u.distributor_id
       ${whereSql}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, (page - 1) * pageSize) as UserRow[];

  const list = rows.map((r) => ({
    id: r.id,
    username: r.username,
    nickname: r.nickname,
    avatar: r.avatar,
    phone: r.phone,
    real_name: r.real_name,
    id_card: r.id_card,
    status: r.status,
    growth_value: r.growth_value,
    member_level_id: r.member_level_id,
    level_name: r.level_name,
    level_code: r.level_code,
    cert_status: r.cert_status,
    real_name_status: r.real_name_status,
    loft_owner_status: r.loft_owner_status,
    audit_remark: r.audit_remark,
    balance: r.balance ?? 0,
    points: r.points ?? 0,
    distributor_id: r.distributor_id,
    distributor_name: r.distributor_name,
    is_blacklisted: r.is_blacklisted ?? 0,
    tags: (() => { try { return JSON.parse(r.tags_json || '[]'); } catch { return []; } })(),
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  return ok(res, { list, total });
});

// GET /api/user/audits - 审核列表(实名认证+鸽主认证)
userRouter.get('/audits', requirePermission('user:view'), (req: AuthedRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const pageSize = Math.max(1, parseInt(String(req.query.pageSize ?? '10'), 10) || 10);
  const keyword = String(req.query.keyword ?? '').trim();
  const auditType = String(req.query.audit_type ?? '').trim(); // real_name / loft_owner
  const auditStatus = String(req.query.audit_status ?? '').trim(); // pending / approved / rejected

  const where: string[] = [];
  const params: Array<string | number> = [];

  // 关键字搜索
  if (keyword) {
    where.push('(u.username LIKE ? OR u.nickname LIKE ? OR u.phone LIKE ? OR u.real_name LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  // 审核类型筛选
  if (auditType === 'real_name') {
    where.push("u.real_name_status != 'none'");
  } else if (auditType === 'loft_owner') {
    where.push("u.loft_owner_status != 'none'");
  } else {
    // 默认显示所有有审核记录的用户
    where.push("(u.real_name_status != 'none' OR u.loft_owner_status != 'none')");
  }

  // 审核状态筛选
  if (auditStatus === 'pending') {
    where.push("(u.real_name_status = 'pending' OR u.loft_owner_status = 'pending')");
  } else if (auditStatus === 'approved') {
    where.push("(u.real_name_status = 'approved' OR u.loft_owner_status = 'approved')");
  } else if (auditStatus === 'rejected') {
    where.push("(u.real_name_status = 'rejected' OR u.loft_owner_status = 'rejected')");
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = (
    db.prepare(`SELECT COUNT(*) AS c FROM users u ${whereSql}`).get(...params) as { c: number }
  ).c;

  const rows = db
    .prepare(
      `SELECT u.id, u.username, u.nickname, u.avatar, u.phone, u.real_name, u.id_card,
              u.id_card_front, u.id_card_back, u.id_card_handheld,
              u.status, u.growth_value, u.member_level_id,
              ml.name AS level_name, ml.code AS level_code,
              u.cert_status, u.real_name_status, u.loft_owner_status, u.audit_remark,
              u.created_at, u.updated_at
       FROM users u
       LEFT JOIN member_levels ml ON ml.id = u.member_level_id
       ${whereSql}
       ORDER BY u.updated_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, (page - 1) * pageSize) as Array<{
    id: number;
    username: string;
    nickname: string;
    avatar: string | null;
    phone: string | null;
    real_name: string | null;
    id_card: string | null;
    id_card_front: string | null;
    id_card_back: string | null;
    id_card_handheld: string | null;
    status: number;
    growth_value: number;
    member_level_id: number | null;
    level_name: string | null;
    level_code: string | null;
    cert_status: string;
    real_name_status: string;
    loft_owner_status: string;
    audit_remark: string | null;
    created_at: number;
    updated_at: number;
  }>;

  const list = rows.map((r) => ({
    id: r.id,
    username: r.username,
    nickname: r.nickname,
    avatar: r.avatar,
    phone: r.phone,
    real_name: r.real_name,
    id_card: r.id_card,
    id_card_front: r.id_card_front,
    id_card_back: r.id_card_back,
    id_card_handheld: r.id_card_handheld,
    status: r.status,
    growth_value: r.growth_value,
    member_level_id: r.member_level_id,
    level_name: r.level_name,
    level_code: r.level_code,
    cert_status: r.cert_status,
    real_name_status: r.real_name_status,
    loft_owner_status: r.loft_owner_status,
    audit_remark: r.audit_remark,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  return ok(res, { list, total });
});

// GET /api/user/users/:id - 用户详情
userRouter.get('/users/:id', requirePermission('user:view'), (req: AuthedRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) {
    return fail(res, 400, '无效的用户 ID');
  }
  const row = db
    .prepare(
      `SELECT u.id, u.username, u.nickname, u.avatar, u.phone, u.real_name, u.id_card,
              u.id_card_front, u.id_card_back, u.id_card_handheld,
              u.status, u.growth_value, u.member_level_id,
              ml.name AS level_name, ml.code AS level_code,
              u.cert_status, u.real_name_status, u.loft_owner_status, u.audit_remark,
              u.balance, u.points, u.distributor_id, d.name AS distributor_name,
              u.is_blacklisted, u.tags_json,
              u.created_at, u.updated_at
       FROM users u
       LEFT JOIN member_levels ml ON ml.id = u.member_level_id
       LEFT JOIN distributors d ON d.id = u.distributor_id
       WHERE u.id = ?`
    )
    .get(id) as UserRow | undefined;
  if (!row) {
    return fail(res, 404, '用户不存在');
  }
  const result = {
    ...row,
    balance: row.balance ?? 0,
    points: row.points ?? 0,
    is_blacklisted: row.is_blacklisted ?? 0,
    tags: (() => { try { return JSON.parse(row.tags_json || '[]'); } catch { return []; } })(),
  };
  return ok(res, result);
});

// PUT /api/user/users/:id - 编辑用户(昵称/手机/实名信息/成长值/会员等级)
userRouter.put(
  '/users/:id',
  requirePermission('user:edit'),
  auditMiddleware('user', 'update'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的用户 ID');
    }
    const target = db
      .prepare('SELECT id, username, nickname, phone, real_name FROM users WHERE id = ?')
      .get(id) as
      | { id: number; username: string; nickname: string; phone: string | null; real_name: string | null }
      | undefined;
    if (!target) {
      return fail(res, 404, '用户不存在');
    }
    res.locals.audit = {
      before: target,
      objectName: target.nickname || target.username || target.phone || target.real_name || `用户#${id}`,
      targetId: id,
      targetType: 'user',
    };
    const {
      nickname,
      phone,
      real_name,
      id_card,
      growth_value,
      member_level_id,
    } = req.body as {
      nickname?: string;
      phone?: string;
      real_name?: string;
      id_card?: string;
      growth_value?: number;
      member_level_id?: number | null;
    };

    // member_level_id 校验(若提供需为有效等级)
    if (member_level_id !== undefined && member_level_id !== null) {
      const level = db
        .prepare('SELECT id FROM member_levels WHERE id = ?')
        .get(member_level_id as number);
      if (!level) {
        return fail(res, 400, '指定的会员等级不存在');
      }
    }

    db.prepare(
      `UPDATE users SET nickname = ?, phone = ?, real_name = ?, id_card = ?,
              growth_value = ?, member_level_id = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      nickname ?? '',
      phone ?? null,
      real_name ?? null,
      id_card ?? null,
      typeof growth_value === 'number' ? growth_value : 0,
      member_level_id === undefined ? null : (member_level_id as number | null),
      Date.now(),
      id
    );
    return ok(res, null, '更新成功');
  }
);

// PATCH /api/user/users/:id/status - 封禁/解封(1 正常 / 0 封禁)
userRouter.patch(
  '/users/:id/status',
  requirePermission('user:edit'),
  auditMiddleware('user', 'update_status'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的用户 ID');
    }
    const { status } = req.body as { status?: number };
    if (status !== 0 && status !== 1) {
      return fail(res, 400, '状态值非法(0 封禁 / 1 正常)');
    }
    const target = db
      .prepare('SELECT id, username, nickname, phone, real_name FROM users WHERE id = ?')
      .get(id) as
      | { id: number; username: string; nickname: string; phone: string | null; real_name: string | null }
      | undefined;
    if (!target) {
      return fail(res, 404, '用户不存在');
    }
    res.locals.audit = {
      before: target,
      objectName: target.nickname || target.username || target.phone || target.real_name || `用户#${id}`,
      targetId: id,
      targetType: 'user',
    };
    db.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?').run(
      status,
      Date.now(),
      id
    );
    return ok(res, null, status === 1 ? '已解封' : '已封禁');
  }
);

// POST /api/user/users/:id/audit-real - 实名认证审核(通过/驳回)
userRouter.post(
  '/users/:id/audit-real',
  requirePermission('user:edit'),
  auditMiddleware('user', 'audit_real_name'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的用户 ID');
    }
    const { action, remark } = req.body as { action?: string; remark?: string };
    if (action !== 'approved' && action !== 'rejected') {
      return fail(res, 400, '审核动作非法(approved / rejected)');
    }
    const target = db
      .prepare('SELECT id, username, nickname, phone, real_name, real_name_status, cert_status FROM users WHERE id = ?')
      .get(id) as
      | { id: number; username: string; nickname: string; phone: string | null; real_name: string | null; real_name_status: string; cert_status: string }
      | undefined;
    if (!target) {
      return fail(res, 404, '用户不存在');
    }
    res.locals.audit = {
      before: target,
      objectName: target.nickname || target.username || target.phone || target.real_name || `用户#${id}`,
      targetId: id,
      targetType: 'user',
    };

    const tx = db.transaction(() => {
      if (action === 'approved') {
        // 通过实名:更新实名子状态;整体档位提升到 real(若当前为 none)
        const nextCert = target.cert_status === 'none' ? 'real' : target.cert_status;
        db.prepare(
          `UPDATE users SET real_name_status = 'approved', cert_status = ?, audit_remark = ?, updated_at = ?
           WHERE id = ?`
        ).run(nextCert, remark ?? null, Date.now(), id);
      } else {
        // 驳回实名:保留档位,记录驳回理由
        db.prepare(
          `UPDATE users SET real_name_status = 'rejected', audit_remark = ?, updated_at = ?
           WHERE id = ?`
        ).run(remark ?? null, Date.now(), id);
      }
    });
    tx();
    return ok(res, null, action === 'approved' ? '实名认证已通过' : '实名认证已驳回');
  }
);

// POST /api/user/users/:id/audit-loft-owner - 鸽主认证审核(通过/驳回)
userRouter.post(
  '/users/:id/audit-loft-owner',
  requirePermission('user:edit'),
  auditMiddleware('user', 'audit_loft_owner'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的用户 ID');
    }
    const { action, remark } = req.body as { action?: string; remark?: string };
    if (action !== 'approved' && action !== 'rejected') {
      return fail(res, 400, '审核动作非法(approved / rejected)');
    }
    const target = db
      .prepare('SELECT id, username, nickname, phone, real_name, loft_owner_status, cert_status FROM users WHERE id = ?')
      .get(id) as
      | { id: number; username: string; nickname: string; phone: string | null; real_name: string | null; loft_owner_status: string; cert_status: string }
      | undefined;
    if (!target) {
      return fail(res, 404, '用户不存在');
    }
    res.locals.audit = {
      before: target,
      objectName: target.nickname || target.username || target.phone || target.real_name || `用户#${id}`,
      targetId: id,
      targetType: 'user',
    };

    const tx = db.transaction(() => {
      if (action === 'approved') {
        // 通过鸽主认证:鸽主档位优先于实名档位,整体档位提升到 loft_owner
        const nextCert = 'loft_owner';
        db.prepare(
          `UPDATE users SET loft_owner_status = 'approved', cert_status = ?, audit_remark = ?, updated_at = ?
           WHERE id = ?`
        ).run(nextCert, remark ?? null, Date.now(), id);
      } else {
        db.prepare(
          `UPDATE users SET loft_owner_status = 'rejected', audit_remark = ?, updated_at = ?
           WHERE id = ?`
        ).run(remark ?? null, Date.now(), id);
      }
    });
    tx();
    return ok(res, null, action === 'approved' ? '鸽主认证已通过' : '鸽主认证已驳回');
  }
);

// ==================== SubTask 10.2: 会员等级规则配置 ====================

// GET /api/user/levels - 会员等级列表(支持启用状态筛选)
userRouter.get('/levels', requirePermission('member:view'), (req: AuthedRequest, res: Response) => {
  const status = req.query.status;
  const where: string[] = [];
  const params: Array<string | number> = [];
  if (status !== undefined && status !== '') {
    where.push('status = ?');
    params.push(Number(status));
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = db
    .prepare(
      `SELECT id, code, name, min_growth, sort, icon, benefits, status, created_at, updated_at
       FROM member_levels
       ${whereSql}
       ORDER BY sort ASC, id ASC`
    )
    .all(...params) as Array<{
    id: number;
    code: string;
    name: string;
    min_growth: number;
    sort: number;
    icon: string | null;
    benefits: string | null;
    status: number;
    created_at: number;
    updated_at: number;
  }>;

  // 附加每等级权益数量与当前等级用户数,便于前端展示
  const list = rows.map((r) => {
    const benefitCount = (
      db.prepare('SELECT COUNT(*) AS c FROM member_benefits WHERE level_id = ?').get(r.id) as {
        c: number;
      }
    ).c;
    const userCount = (
      db.prepare('SELECT COUNT(*) AS c FROM users WHERE member_level_id = ?').get(r.id) as {
        c: number;
      }
    ).c;
    return {
      ...r,
      benefit_count: benefitCount,
      user_count: userCount,
    };
  });

  return ok(res, { list, total: list.length });
});

// POST /api/user/levels - 新增会员等级
userRouter.post(
  '/levels',
  requirePermission('member:edit'),
  auditMiddleware('member', 'create_level'),
  (req: AuthedRequest, res: Response) => {
    const { code, name, min_growth, sort, icon, benefits, status } = req.body as {
      code?: string;
      name?: string;
      min_growth?: number;
      sort?: number;
      icon?: string;
      benefits?: string;
      status?: number;
    };
    if (!code || !name) {
      return fail(res, 400, '等级编码与名称不能为空');
    }
    const exists = db.prepare('SELECT id FROM member_levels WHERE code = ?').get(code);
    if (exists) {
      return fail(res, 409, '等级编码已存在');
    }
    const result = db
      .prepare(
        `INSERT INTO member_levels (code, name, min_growth, sort, icon, benefits, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        code,
        name,
        typeof min_growth === 'number' ? min_growth : 0,
        typeof sort === 'number' ? sort : 0,
        icon ?? null,
        benefits ?? null,
        typeof status === 'number' ? status : 1
      );
    return ok(res, { id: result.lastInsertRowid }, '新增成功');
  }
);

// PUT /api/user/levels/:id - 编辑会员等级
userRouter.put(
  '/levels/:id',
  requirePermission('member:edit'),
  auditMiddleware('member', 'update_level'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的等级 ID');
    }
    const target = db.prepare('SELECT id FROM member_levels WHERE id = ?').get(id);
    if (!target) {
      return fail(res, 404, '会员等级不存在');
    }
    const { name, min_growth, sort, icon, benefits, status } = req.body as {
      name?: string;
      min_growth?: number;
      sort?: number;
      icon?: string;
      benefits?: string;
      status?: number;
    };
    db.prepare(
      `UPDATE member_levels SET name = ?, min_growth = ?, sort = ?, icon = ?, benefits = ?,
              status = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      name ?? '',
      typeof min_growth === 'number' ? min_growth : 0,
      typeof sort === 'number' ? sort : 0,
      icon ?? null,
      benefits ?? null,
      typeof status === 'number' ? status : 1,
      Date.now(),
      id
    );
    return ok(res, null, '更新成功');
  }
);

// DELETE /api/user/levels/:id - 删除会员等级(关联用户置空等级)
userRouter.delete(
  '/levels/:id',
  requirePermission('member:edit'),
  auditMiddleware('member', 'delete_level'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的等级 ID');
    }
    const target = db.prepare('SELECT id FROM member_levels WHERE id = ?').get(id);
    if (!target) {
      return fail(res, 404, '会员等级不存在');
    }
    // 等级下权益由外键 ON DELETE CASCADE 自动删除;users.member_level_id 由 ON DELETE SET NULL 自动置空
    db.prepare('DELETE FROM member_levels WHERE id = ?').run(id);
    return ok(res, null, '删除成功');
  }
);

// PATCH /api/user/levels/:id/sort - 调整排序
userRouter.patch(
  '/levels/:id/sort',
  requirePermission('member:edit'),
  auditMiddleware('member', 'update_sort'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的等级 ID');
    }
    const { sort } = req.body as { sort?: number };
    if (typeof sort !== 'number') {
      return fail(res, 400, '排序值非法');
    }
    const target = db.prepare('SELECT id FROM member_levels WHERE id = ?').get(id);
    if (!target) {
      return fail(res, 404, '会员等级不存在');
    }
    db.prepare('UPDATE member_levels SET sort = ?, updated_at = ? WHERE id = ?').run(
      sort,
      Date.now(),
      id
    );
    return ok(res, null, '排序已更新');
  }
);

// POST /api/user/levels/recompute - 成长值重算:按各等级 min_growth 重新匹配用户 member_level_id
userRouter.post(
  '/levels/recompute',
  requirePermission('member:edit'),
  auditMiddleware('member', 'recompute_levels'),
  (_req: AuthedRequest, res: Response) => {
    // 取所有启用等级,按 min_growth 升序;逐用户匹配最大可达到的等级
    const levels = db
      .prepare(
        `SELECT id, min_growth FROM member_levels WHERE status = 1 ORDER BY min_growth ASC`
      )
      .all() as Array<{ id: number; min_growth: number }>;

    if (levels.length === 0) {
      return ok(res, { affected: 0 }, '无可用等级,未更新任何用户');
    }

    const users = db.prepare('SELECT id, growth_value FROM users').all() as Array<{
      id: number;
      growth_value: number;
    }>;
    const updateStmt = db.prepare(
      'UPDATE users SET member_level_id = ?, updated_at = ? WHERE id = ?'
    );

    const tx = db.transaction(() => {
      users.forEach((u) => {
        let targetId: number | null = null;
        for (const l of levels) {
          if (u.growth_value >= l.min_growth) {
            targetId = l.id;
          } else {
            break;
          }
        }
        updateStmt.run(targetId, Date.now(), u.id);
      });
    });
    tx();
    return ok(res, { affected: users.length }, `已重算 ${users.length} 个用户的会员等级`);
  }
);

// ==================== SubTask 10.3: 会员权益配置与发放 ====================

// GET /api/user/levels/:id/benefits - 某等级权益列表
userRouter.get(
  '/levels/:id/benefits',
  requirePermission('member:view'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的等级 ID');
    }
    const target = db.prepare('SELECT id FROM member_levels WHERE id = ?').get(id);
    if (!target) {
      return fail(res, 404, '会员等级不存在');
    }
    const rows = db
      .prepare(
        `SELECT id, level_id, name, type, value, description, status, created_at
         FROM member_benefits
         WHERE level_id = ?
         ORDER BY id ASC`
      )
      .all(id) as Array<{
      id: number;
      level_id: number;
      name: string;
      type: string;
      value: string | null;
      description: string | null;
      status: number;
      created_at: number;
    }>;
    return ok(res, { list: rows, total: rows.length });
  }
);

// POST /api/user/levels/:id/benefits - 新增权益
userRouter.post(
  '/levels/:id/benefits',
  requirePermission('member:edit'),
  auditMiddleware('member', 'create_benefit'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的等级 ID');
    }
    const target = db.prepare('SELECT id FROM member_levels WHERE id = ?').get(id);
    if (!target) {
      return fail(res, 404, '会员等级不存在');
    }
    const { name, type, value, description, status } = req.body as {
      name?: string;
      type?: string;
      value?: string;
      description?: string;
      status?: number;
    };
    if (!name) {
      return fail(res, 400, '权益名称不能为空');
    }
    const benefitType =
      type && VALID_BENEFIT_TYPE.includes(type) ? type : 'privilege';
    const result = db
      .prepare(
        `INSERT INTO member_benefits (level_id, name, type, value, description, status)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        name,
        benefitType,
        value ?? null,
        description ?? null,
        typeof status === 'number' ? status : 1
      );
    return ok(res, { id: result.lastInsertRowid }, '权益已添加');
  }
);

// PUT /api/user/benefits/:id - 编辑权益
userRouter.put(
  '/benefits/:id',
  requirePermission('member:edit'),
  auditMiddleware('member', 'update_benefit'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的权益 ID');
    }
    const target = db.prepare('SELECT id FROM member_benefits WHERE id = ?').get(id);
    if (!target) {
      return fail(res, 404, '权益不存在');
    }
    const { name, type, value, description, status } = req.body as {
      name?: string;
      type?: string;
      value?: string;
      description?: string;
      status?: number;
    };
    db.prepare(
      `UPDATE member_benefits SET name = ?, type = ?, value = ?, description = ?, status = ?
       WHERE id = ?`
    ).run(
      name ?? '',
      type || 'privilege',
      value ?? null,
      description ?? null,
      typeof status === 'number' ? status : 1,
      id
    );
    return ok(res, null, '权益已更新');
  }
);

// DELETE /api/user/benefits/:id - 删除权益
userRouter.delete(
  '/benefits/:id',
  requirePermission('member:edit'),
  auditMiddleware('member', 'delete_benefit'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的权益 ID');
    }
    const target = db.prepare('SELECT id FROM member_benefits WHERE id = ?').get(id);
    if (!target) {
      return fail(res, 404, '权益不存在');
    }
    db.prepare('DELETE FROM member_benefits WHERE id = ?').run(id);
    return ok(res, null, '权益已删除');
  }
);

// ==================== 分销商与优惠券辅助接口 ====================

// GET /api/user/distributors - 分销商列表
userRouter.get('/distributors', requirePermission('user:view'), (_req: AuthedRequest, res: Response) => {
  const rows = db
    .prepare(
      `SELECT id, name, contact, phone, level, commission_rate, status
       FROM distributors WHERE status = 1 ORDER BY id ASC`
    )
    .all() as Array<{
    id: number; name: string; contact: string | null; phone: string | null;
    level: string; commission_rate: number; status: number;
  }>;
  return ok(res, { list: rows, total: rows.length });
});

// GET /api/user/coupons - 优惠券模板列表
userRouter.get('/coupons', requirePermission('user:view'), (_req: AuthedRequest, res: Response) => {
  const rows = db
    .prepare(
      `SELECT id, name, type, value, min_amount, total_count, remain_count, expire_days,
              description, status FROM coupons WHERE status = 1 ORDER BY id ASC`
    )
    .all() as Array<{
    id: number; name: string; type: string; value: number; min_amount: number;
    total_count: number; remain_count: number; expire_days: number;
    description: string | null; status: number;
  }>;
  return ok(res, { list: rows, total: rows.length });
});

// GET /api/user/users/:id/coupons - 用户优惠券列表
userRouter.get('/users/:id/coupons', requirePermission('user:view'), (req: AuthedRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const rows = db
    .prepare(
      `SELECT id, coupon_id, coupon_name, coupon_type, coupon_value, status,
              used_at, expires_at, created_at FROM user_coupons
       WHERE user_id = ? ORDER BY created_at DESC`
    )
    .all(id) as Array<{
    id: number; coupon_id: number; coupon_name: string | null; coupon_type: string | null;
    coupon_value: number | null; status: string; used_at: number | null;
    expires_at: number | null; created_at: number;
  }>;
  return ok(res, { list: rows, total: rows.length });
});

// ==================== 用户更多操作端点 ====================

// PATCH /api/user/users/:id/distributor - 变更上级分销商
userRouter.patch(
  '/users/:id/distributor',
  requirePermission('user:edit'),
  auditMiddleware('user', 'change_distributor'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的用户 ID');
    const { distributor_id } = req.body as { distributor_id?: number | null };

    const target = db.prepare('SELECT id, username, nickname, distributor_id FROM users WHERE id = ?').get(id) as
      | { id: number; username: string; nickname: string; distributor_id: number | null } | undefined;
    if (!target) return fail(res, 404, '用户不存在');

    res.locals.audit = {
      before: target,
      objectName: target.nickname || target.username || `用户#${id}`,
      targetId: id, targetType: 'user',
    };

    if (distributor_id !== null && distributor_id !== undefined) {
      const dist = db.prepare('SELECT id FROM distributors WHERE id = ? AND status = 1').get(distributor_id);
      if (!dist) return fail(res, 400, '分销商不存在或已禁用');
    }

    db.prepare('UPDATE users SET distributor_id = ?, updated_at = ? WHERE id = ?')
      .run(distributor_id ?? null, Date.now(), id);
    return ok(res, null, distributor_id ? '分销商已变更' : '已清除分销商');
  }
);

// PATCH /api/user/users/:id/tags - 设置标签
userRouter.patch(
  '/users/:id/tags',
  requirePermission('user:edit'),
  auditMiddleware('user', 'set_tags'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的用户 ID');
    const { tags } = req.body as { tags?: string[] };

    const target = db.prepare('SELECT id, username, nickname, tags_json FROM users WHERE id = ?').get(id) as
      | { id: number; username: string; nickname: string; tags_json: string } | undefined;
    if (!target) return fail(res, 404, '用户不存在');

    res.locals.audit = {
      before: { ...target, tags: (() => { try { return JSON.parse(target.tags_json || '[]'); } catch { return []; } })() },
      objectName: target.nickname || target.username || `用户#${id}`,
      targetId: id, targetType: 'user',
    };

    const cleanTags = Array.isArray(tags)
      ? [...new Set(tags.filter((t) => typeof t === 'string' && t.trim()))].slice(0, 20)
      : [];
    db.prepare('UPDATE users SET tags_json = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(cleanTags), Date.now(), id);
    return ok(res, null, '标签已更新');
  }
);

// POST /api/user/users/:id/reset-password - 重置密码
userRouter.post(
  '/users/:id/reset-password',
  requirePermission('user:edit'),
  auditMiddleware('user', 'reset_password'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的用户 ID');
    const { new_password } = req.body as { new_password?: string };

    const target = db.prepare('SELECT id, username, nickname FROM users WHERE id = ?').get(id) as
      | { id: number; username: string; nickname: string } | undefined;
    if (!target) return fail(res, 404, '用户不存在');

    res.locals.audit = {
      before: target,
      objectName: target.nickname || target.username || `用户#${id}`,
      targetId: id, targetType: 'user',
    };

    const raw = new_password && new_password.length >= 6
      ? new_password
      : Math.random().toString(36).slice(-8) + 'Aa1';
    const hashed = bcrypt.hashSync(raw, 10);

    db.prepare('UPDATE users SET password = ?, updated_at = ? WHERE id = ?')
      .run(hashed, Date.now(), id);

    return ok(res, { new_password: raw }, '密码已重置');
  }
);

// POST /api/user/users/:id/coupons - 发放优惠券
userRouter.post(
  '/users/:id/coupons',
  requirePermission('user:edit'),
  auditMiddleware('user', 'grant_coupon'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的用户 ID');
    const { coupon_id, count = 1 } = req.body as { coupon_id?: number; count?: number };

    const target = db.prepare('SELECT id, username, nickname FROM users WHERE id = ?').get(id) as
      | { id: number; username: string; nickname: string } | undefined;
    if (!target) return fail(res, 404, '用户不存在');

    res.locals.audit = {
      before: target,
      objectName: target.nickname || target.username || `用户#${id}`,
      targetId: id, targetType: 'user',
    };

    if (!coupon_id) return fail(res, 400, '请选择优惠券');
    const coupon = db.prepare('SELECT * FROM coupons WHERE id = ? AND status = 1').get(coupon_id) as
      | { id: number; name: string; type: string; value: number; expire_days: number; remain_count: number }
      | undefined;
    if (!coupon) return fail(res, 404, '优惠券不存在或已禁用');

    const cnt = Math.max(1, Math.min(10, count));
    if (coupon.remain_count < cnt && coupon.remain_count !== 0) {
      return fail(res, 400, `优惠券剩余数量不足(剩 ${coupon.remain_count})`);
    }

    const now = Date.now();
    const expiresAt = now + coupon.expire_days * 86400 * 1000;

    const tx = db.transaction(() => {
      for (let i = 0; i < cnt; i++) {
        db.prepare(
          `INSERT INTO user_coupons (user_id, coupon_id, coupon_name, coupon_type, coupon_value, expires_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).run(id, coupon.id, coupon.name, coupon.type, coupon.value, expiresAt);
      }
      if (coupon.remain_count > 0) {
        db.prepare('UPDATE coupons SET remain_count = remain_count - ? WHERE id = ?')
          .run(cnt, coupon.id);
      }
    });
    tx();

    return ok(res, { granted: cnt }, `已发放 ${cnt} 张优惠券`);
  }
);

// PATCH /api/user/users/:id/balance - 调整余额
userRouter.patch(
  '/users/:id/balance',
  requirePermission('user:edit'),
  auditMiddleware('user', 'adjust_balance'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的用户 ID');
    const { amount, reason } = req.body as { amount?: number; reason?: string };

    const target = db.prepare('SELECT id, username, nickname, balance FROM users WHERE id = ?').get(id) as
      | { id: number; username: string; nickname: string; balance: number } | undefined;
    if (!target) return fail(res, 404, '用户不存在');

    if (typeof amount !== 'number' || amount === 0) {
      return fail(res, 400, '调整金额必须为非零数字');
    }
    if (target.balance + amount < 0) {
      return fail(res, 400, '余额不足,无法扣除');
    }

    res.locals.audit = {
      before: target,
      objectName: target.nickname || target.username || `用户#${id}`,
      targetId: id, targetType: 'user',
    };

    db.prepare('UPDATE users SET balance = balance + ?, updated_at = ? WHERE id = ?')
      .run(amount, Date.now(), id);
    return ok(res, { balance: target.balance + amount }, `余额已${amount > 0 ? '增加' : '扣除'} ${Math.abs(amount).toFixed(2)} 元${reason ? ` (${reason})` : ''}`);
  }
);

// PATCH /api/user/users/:id/points - 调整积分
userRouter.patch(
  '/users/:id/points',
  requirePermission('user:edit'),
  auditMiddleware('user', 'adjust_points'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的用户 ID');
    const { amount, reason } = req.body as { amount?: number; reason?: string };

    const target = db.prepare('SELECT id, username, nickname, points FROM users WHERE id = ?').get(id) as
      | { id: number; username: string; nickname: string; points: number } | undefined;
    if (!target) return fail(res, 404, '用户不存在');

    if (typeof amount !== 'number' || amount === 0) {
      return fail(res, 400, '调整数量必须为非零整数');
    }
    if (!Number.isInteger(amount)) {
      return fail(res, 400, '积分必须为整数');
    }
    if (target.points + amount < 0) {
      return fail(res, 400, '积分不足,无法扣除');
    }

    res.locals.audit = {
      before: target,
      objectName: target.nickname || target.username || `用户#${id}`,
      targetId: id, targetType: 'user',
    };

    db.prepare('UPDATE users SET points = points + ?, updated_at = ? WHERE id = ?')
      .run(amount, Date.now(), id);
    return ok(res, { points: target.points + amount }, `积分已${amount > 0 ? '增加' : '扣除'} ${Math.abs(amount)}${reason ? ` (${reason})` : ''}`);
  }
);

// PATCH /api/user/users/:id/blacklist - 加入/移出黑名单
userRouter.patch(
  '/users/:id/blacklist',
  requirePermission('user:edit'),
  auditMiddleware('user', 'toggle_blacklist'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的用户 ID');
    const { is_blacklisted } = req.body as { is_blacklisted?: number };

    const target = db.prepare('SELECT id, username, nickname, is_blacklisted FROM users WHERE id = ?').get(id) as
      | { id: number; username: string; nickname: string; is_blacklisted: number } | undefined;
    if (!target) return fail(res, 404, '用户不存在');

    const next = is_blacklisted !== undefined ? (is_blacklisted ? 1 : 0) : (target.is_blacklisted ? 0 : 1);

    res.locals.audit = {
      before: target,
      objectName: target.nickname || target.username || `用户#${id}`,
      targetId: id, targetType: 'user',
    };

    db.prepare('UPDATE users SET is_blacklisted = ?, updated_at = ? WHERE id = ?')
      .run(next, Date.now(), id);
    return ok(res, { is_blacklisted: next }, next ? '已加入黑名单' : '已移出黑名单');
  }
);

export default userRouter;
