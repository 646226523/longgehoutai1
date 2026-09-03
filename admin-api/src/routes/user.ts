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
              u.created_at, u.updated_at
       FROM users u
       LEFT JOIN member_levels ml ON ml.id = u.member_level_id
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
              u.status, u.growth_value, u.member_level_id,
              ml.name AS level_name, ml.code AS level_code,
              u.cert_status, u.real_name_status, u.loft_owner_status, u.audit_remark,
              u.created_at, u.updated_at
       FROM users u
       LEFT JOIN member_levels ml ON ml.id = u.member_level_id
       WHERE u.id = ?`
    )
    .get(id) as UserRow | undefined;
  if (!row) {
    return fail(res, 404, '用户不存在');
  }
  return ok(res, row);
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

export default userRouter;
