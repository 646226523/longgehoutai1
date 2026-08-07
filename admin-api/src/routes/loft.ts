// 公棚管理模块路由
// 挂载:/api/loft
// 子模块:
//   - /api/loft/applications         公棚入驻申请审核(SubTask 6.1)
//   - /api/loft/lofts                公棚信息管理(SubTask 6.2)
//   - /api/loft/lofts/:loftId/pigeons 存棚鸽只管理(SubTask 6.3)
// 跨模块依赖:入棚登记时查询 gene_profiles(ring_number、id),由基因模块创建

import { Router, Response } from 'express';
import db from '../db';
import { authenticate, requirePermission } from '../middlewares/auth';
import { auditMiddleware } from '../middlewares/audit';
import type { AuthedRequest, ApiResponse } from '../types';

const loftRouter = Router();

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
loftRouter.use(authenticate);

// ==================== SubTask 6.1: 公棚入驻申请审核 ====================

// GET /api/loft/applications - 申请分页列表(支持状态/申请人/公棚名称筛选)
loftRouter.get(
  '/applications',
  requirePermission('loft:audit'),
  (req: AuthedRequest, res: Response) => {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.max(1, parseInt(String(req.query.pageSize ?? '10'), 10) || 10);
    const status = String(req.query.status ?? '').trim();
    const keyword = String(req.query.keyword ?? '').trim();

    const where: string[] = [];
    const params: Array<string | number> = [];
    if (status) {
      where.push('status = ?');
      params.push(status);
    }
    if (keyword) {
      where.push('(loft_name LIKE ? OR applicant_name LIKE ? OR phone LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const total = (
      db.prepare(`SELECT COUNT(*) AS c FROM loft_applications ${whereSql}`).get(...params) as { c: number }
    ).c;

    const list = db
      .prepare(
        `SELECT id, loft_name, applicant_name, phone, id_card, qualification, site_proof,
                capacity, address, status, audit_remark, auditor_id, audited_at, created_at
         FROM loft_applications ${whereSql}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, pageSize, (page - 1) * pageSize);

    return ok(res, { list, total });
  }
);

// GET /api/loft/applications/:id - 申请详情
loftRouter.get(
  '/applications/:id',
  requirePermission('loft:audit'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的申请 ID');
    }
    const row = db
      .prepare(
        `SELECT id, loft_name, applicant_name, phone, id_card, qualification, site_proof,
                capacity, address, status, audit_remark, auditor_id, audited_at, created_at
         FROM loft_applications WHERE id = ?`
      )
      .get(id);
    if (!row) {
      return fail(res, 404, '申请不存在');
    }
    return ok(res, row);
  }
);

// POST /api/loft/applications - 新增申请(C 端提交或后台代录)
loftRouter.post(
  '/applications',
  requirePermission('loft:audit'),
  auditMiddleware('loft', 'create_application'),
  (req: AuthedRequest, res: Response) => {
    const body = req.body as {
      loft_name?: string;
      applicant_name?: string;
      phone?: string;
      id_card?: string;
      qualification?: string;
      site_proof?: string;
      capacity?: number;
      address?: string;
    };
    if (!body.loft_name || !body.applicant_name || !body.phone) {
      return fail(res, 400, '公棚名称、申请人、联系电话不能为空');
    }
    const result = db
      .prepare(
        `INSERT INTO loft_applications
         (loft_name, applicant_name, phone, id_card, qualification, site_proof, capacity, address, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
      )
      .run(
        body.loft_name,
        body.applicant_name,
        body.phone,
        body.id_card ?? null,
        body.qualification ?? null,
        body.site_proof ?? null,
        body.capacity ?? null,
        body.address ?? null
      );
    return ok(res, { id: result.lastInsertRowid as number }, '申请已提交');
  }
);

// POST /api/loft/applications/:id/approve - 审核通过(创建 lofts 记录,状态置通过,记审计)
loftRouter.post(
  '/applications/:id/approve',
  requirePermission('loft:audit'),
  auditMiddleware('loft', 'approve_application'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的申请 ID');
    }
    const app = db
      .prepare('SELECT id, loft_name, applicant_name, phone, address, capacity, status FROM loft_applications WHERE id = ?')
      .get(id) as
      | {
          id: number;
          loft_name: string;
          applicant_name: string;
          phone: string;
          address: string | null;
          capacity: number | null;
          status: string;
        }
      | undefined;
    if (!app) {
      return fail(res, 404, '申请不存在');
    }
    if (app.status === 'approved') {
      return fail(res, 400, '该申请已通过,请勿重复操作');
    }
    if (app.status === 'rejected') {
      return fail(res, 400, '该申请已被驳回,无法通过');
    }

    const { audit_remark } = req.body as { audit_remark?: string };
    const auditorId = req.adminUser?.id ?? null;
    const now = Date.now();

    // 生成唯一公棚编码
    const code = genUniqueLoftCode();

    const tx = db.transaction(() => {
      // 1. 创建公棚信息记录
      db.prepare(
        `INSERT INTO lofts (name, code, applicant_name, phone, address, capacity, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`
      ).run(app.loft_name, code, app.applicant_name, app.phone, app.address, app.capacity ?? null, now, now);
      // 2. 更新申请状态
      db.prepare(
        `UPDATE loft_applications
         SET status = 'approved', audit_remark = ?, auditor_id = ?, audited_at = ?
         WHERE id = ?`
      ).run(audit_remark ?? null, auditorId, now, id);
    });
    tx();

    return ok(res, { code }, '审核通过,公棚已创建');
  }
);

// POST /api/loft/applications/:id/reject - 驳回(填理由,记审计)
loftRouter.post(
  '/applications/:id/reject',
  requirePermission('loft:audit'),
  auditMiddleware('loft', 'reject_application'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的申请 ID');
    }
    const app = db.prepare('SELECT id, status FROM loft_applications WHERE id = ?').get(id) as
      | { id: number; status: string }
      | undefined;
    if (!app) {
      return fail(res, 404, '申请不存在');
    }
    if (app.status !== 'pending') {
      return fail(res, 400, '当前状态不可驳回');
    }
    const { audit_remark } = req.body as { audit_remark?: string };
    if (!audit_remark || !audit_remark.trim()) {
      return fail(res, 400, '请填写驳回理由');
    }
    const auditorId = req.adminUser?.id ?? null;
    const now = Date.now();
    db.prepare(
      `UPDATE loft_applications
       SET status = 'rejected', audit_remark = ?, auditor_id = ?, audited_at = ?
       WHERE id = ?`
    ).run(audit_remark.trim(), auditorId, now, id);
    return ok(res, null, '已驳回');
  }
);

// ==================== SubTask 6.2: 公棚信息管理 ====================

// GET /api/loft/lofts - 公棚分页列表(支持名称/状态筛选)
loftRouter.get('/lofts', requirePermission('loft:view'), (req: AuthedRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const pageSize = Math.max(1, parseInt(String(req.query.pageSize ?? '10'), 10) || 10);
  const name = String(req.query.name ?? '').trim();
  const status = req.query.status;

  const where: string[] = [];
  const params: Array<string | number> = [];
  if (name) {
    where.push('name LIKE ?');
    params.push(`%${name}%`);
  }
  if (status !== undefined && status !== '') {
    where.push('status = ?');
    params.push(Number(status));
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = (
    db.prepare(`SELECT COUNT(*) AS c FROM lofts ${whereSql}`).get(...params) as { c: number }
  ).c;

  const list = db
    .prepare(
      `SELECT id, name, code, applicant_name, phone, address, capacity, location, status,
              created_at, updated_at
       FROM lofts ${whereSql}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, (page - 1) * pageSize);

  // 附带每个公棚的存棚鸽只统计(在棚数 / 总数)
  const statStmt = db.prepare(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'in' THEN 1 ELSE 0 END) AS in_count
     FROM loft_pigeons WHERE loft_id = ?`
  );
  const listWithStats = (list as Array<Record<string, unknown>>).map((row) => {
    const stat = statStmt.get(row.id as number) as { total: number; in_count: number | null };
    return {
      ...row,
      pigeon_total: stat.total ?? 0,
      pigeon_in: stat.in_count ?? 0,
    };
  });

  return ok(res, { list: listWithStats, total });
});

// GET /api/loft/lofts/:id - 公棚详情
loftRouter.get('/lofts/:id', requirePermission('loft:view'), (req: AuthedRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) {
    return fail(res, 400, '无效的公棚 ID');
  }
  const row = db
    .prepare(
      `SELECT id, name, code, applicant_name, phone, address, capacity, location, status,
              created_at, updated_at
       FROM lofts WHERE id = ?`
    )
    .get(id);
  if (!row) {
    return fail(res, 404, '公棚不存在');
  }
  return ok(res, row);
});

// PUT /api/loft/lofts/:id - 编辑公棚信息
loftRouter.put(
  '/lofts/:id',
  requirePermission('loft:edit'),
  auditMiddleware('loft', 'update_loft'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的公棚 ID');
    }
    const target = db.prepare('SELECT id FROM lofts WHERE id = ?').get(id);
    if (!target) {
      return fail(res, 404, '公棚不存在');
    }
    const body = req.body as {
      name?: string;
      applicant_name?: string;
      phone?: string;
      address?: string;
      capacity?: number;
      location?: string;
    };
    db.prepare(
      `UPDATE lofts
       SET name = ?, applicant_name = ?, phone = ?, address = ?, capacity = ?, location = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      body.name ?? '',
      body.applicant_name ?? null,
      body.phone ?? null,
      body.address ?? null,
      body.capacity ?? null,
      body.location ?? null,
      Date.now(),
      id
    );
    return ok(res, null, '更新成功');
  }
);

// PATCH /api/loft/lofts/:id/status - 状态切换(1 营业中 / 0 停业)
loftRouter.patch(
  '/lofts/:id/status',
  requirePermission('loft:edit'),
  auditMiddleware('loft', 'update_loft_status'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的公棚 ID');
    }
    const target = db.prepare('SELECT id FROM lofts WHERE id = ?').get(id);
    if (!target) {
      return fail(res, 404, '公棚不存在');
    }
    const { status } = req.body as { status?: number };
    if (status !== 0 && status !== 1) {
      return fail(res, 400, '状态值非法(1 营业中 / 0 停业)');
    }
    db.prepare('UPDATE lofts SET status = ?, updated_at = ? WHERE id = ?').run(status, Date.now(), id);
    return ok(res, null, status === 1 ? '已设为营业中' : '已设为停业');
  }
);

// ==================== SubTask 6.3: 鸽棚与存棚鸽只管理 ====================

// GET /api/loft/lofts/:loftId/pigeons - 存棚鸽分页列表(按 loft_id,支持状态/足环号筛选)
loftRouter.get(
  '/lofts/:loftId/pigeons',
  requirePermission('loft:view'),
  (req: AuthedRequest, res: Response) => {
    const loftId = parseInt(req.params.loftId, 10);
    if (!Number.isFinite(loftId)) {
      return fail(res, 400, '无效的公棚 ID');
    }
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.max(1, parseInt(String(req.query.pageSize ?? '10'), 10) || 10);
    const status = String(req.query.status ?? '').trim();
    const ringNumber = String(req.query.ring_number ?? '').trim();

    const where: string[] = ['loft_id = ?'];
    const params: Array<string | number> = [loftId];
    if (status) {
      where.push('status = ?');
      params.push(status);
    }
    if (ringNumber) {
      where.push('ring_number LIKE ?');
      params.push(`%${ringNumber}%`);
    }
    const whereSql = `WHERE ${where.join(' AND ')}`;

    const total = (
      db.prepare(`SELECT COUNT(*) AS c FROM loft_pigeons ${whereSql}`).get(...params) as { c: number }
    ).c;

    const rows = db
      .prepare(
        `SELECT p.id, p.loft_id, p.ring_number, p.gene_profile_id, p.in_time, p.out_time,
                p.status, p.remark, p.created_at
         FROM loft_pigeons p
         ${whereSql}
         ORDER BY p.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, pageSize, (page - 1) * pageSize) as Array<{
        id: number;
        loft_id: number;
        ring_number: string;
        gene_profile_id: number | null;
        in_time: number | null;
        out_time: number | null;
        status: string;
        remark: string | null;
        created_at: number;
      }>;

    // 尝试关联 gene_profiles 的足环号信息(跨模块,表可能不存在则忽略)
    const list = rows.map((r) => {
      const geneProfile = r.gene_profile_id
        ? queryGeneProfileById(r.gene_profile_id)
        : queryGeneProfileByRing(r.ring_number);
      return {
        ...r,
        gene_ring_number: geneProfile?.ring_number ?? null,
        gene_profile_exists: !!geneProfile,
      };
    });

    return ok(res, { list, total });
  }
);

// POST /api/loft/lofts/:loftId/pigeons - 入棚登记
// 入参:ring_number(足环号)、in_time(可选,默认当前)、remark(可选)
// 逻辑:查询 gene_profiles 关联 gene_profile_id,设置 in_time,状态置在棚
loftRouter.post(
  '/lofts/:loftId/pigeons',
  requirePermission('loft:edit'),
  auditMiddleware('loft', 'create_pigeon'),
  (req: AuthedRequest, res: Response) => {
    const loftId = parseInt(req.params.loftId, 10);
    if (!Number.isFinite(loftId)) {
      return fail(res, 400, '无效的公棚 ID');
    }
    const loft = db.prepare('SELECT id, status FROM lofts WHERE id = ?').get(loftId) as
      | { id: number; status: number }
      | undefined;
    if (!loft) {
      return fail(res, 404, '公棚不存在');
    }
    if (loft.status !== 1) {
      return fail(res, 400, '公棚已停业,不可入棚登记');
    }
    const body = req.body as {
      ring_number?: string;
      in_time?: number;
      remark?: string;
    };
    const ringNumber = (body.ring_number ?? '').trim();
    if (!ringNumber) {
      return fail(res, 400, '足环号不能为空');
    }
    // 同一公棚内同一足环号不可重复在棚
    const dup = db
      .prepare('SELECT id FROM loft_pigeons WHERE loft_id = ? AND ring_number = ? AND status = ?')
      .get(loftId, ringNumber, 'in');
    if (dup) {
      return fail(res, 409, '该足环号已在本公棚在棚中,请勿重复登记');
    }
    // 关联基因档案(跨模块:gene_profiles 由基因模块创建,表不存在则置空)
    const geneProfile = queryGeneProfileByRing(ringNumber);
    const geneProfileId = geneProfile?.id ?? null;
    const inTime = body.in_time ?? Date.now();

    const result = db
      .prepare(
        `INSERT INTO loft_pigeons
         (loft_id, ring_number, gene_profile_id, in_time, out_time, status, remark)
         VALUES (?, ?, ?, ?, NULL, 'in', ?)`
      )
      .run(loftId, ringNumber, geneProfileId, inTime, body.remark ?? null);

    return ok(res, { id: result.lastInsertRowid as number, gene_profile_id: geneProfileId, gene_profile_exists: !!geneProfile }, '入棚登记成功');
  }
);

// POST /api/loft/lofts/:loftId/pigeons/:id/out - 出棚登记
loftRouter.post(
  '/lofts/:loftId/pigeons/:id/out',
  requirePermission('loft:edit'),
  auditMiddleware('loft', 'out_pigeon'),
  (req: AuthedRequest, res: Response) => {
    const loftId = parseInt(req.params.loftId, 10);
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(loftId) || !Number.isFinite(id)) {
      return fail(res, 400, '无效的 ID');
    }
    const pigeon = db
      .prepare('SELECT id, status FROM loft_pigeons WHERE id = ? AND loft_id = ?')
      .get(id, loftId) as { id: number; status: string } | undefined;
    if (!pigeon) {
      return fail(res, 404, '存棚鸽只不存在');
    }
    if (pigeon.status === 'out') {
      return fail(res, 400, '该鸽只已出棚,无需重复操作');
    }
    const body = (req.body as { out_time?: number }) ?? {};
    const outTime = body.out_time ?? Date.now();
    db.prepare(
      `UPDATE loft_pigeons SET status = 'out', out_time = ? WHERE id = ?`
    ).run(outTime, id);
    return ok(res, null, '出棚登记成功');
  }
);

// DELETE /api/loft/lofts/:loftId/pigeons/:id - 删除存棚鸽只记录
loftRouter.delete(
  '/lofts/:loftId/pigeons/:id',
  requirePermission('loft:edit'),
  auditMiddleware('loft', 'delete_pigeon'),
  (req: AuthedRequest, res: Response) => {
    const loftId = parseInt(req.params.loftId, 10);
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(loftId) || !Number.isFinite(id)) {
      return fail(res, 400, '无效的 ID');
    }
    const pigeon = db
      .prepare('SELECT id FROM loft_pigeons WHERE id = ? AND loft_id = ?')
      .get(id, loftId);
    if (!pigeon) {
      return fail(res, 404, '存棚鸽只不存在');
    }
    db.prepare('DELETE FROM loft_pigeons WHERE id = ?').run(id);
    return ok(res, null, '删除成功');
  }
);

// ==================== 跨模块辅助:查询 gene_profiles ====================

// 运行时查询 gene_profiles 表(由基因模块创建);表不存在或查询失败时返回 null
function queryGeneProfileByRing(ringNumber: string): { id: number; ring_number: string } | null {
  try {
    const row = db
      .prepare('SELECT id, ring_number FROM gene_profiles WHERE ring_number = ? LIMIT 1')
      .get(ringNumber) as { id: number; ring_number: string } | undefined;
    return row ?? null;
  } catch {
    // gene_profiles 表尚未创建,忽略
    return null;
  }
}

// 按 ID 查询 gene_profiles
function queryGeneProfileById(id: number): { id: number; ring_number: string } | null {
  try {
    const row = db
      .prepare('SELECT id, ring_number FROM gene_profiles WHERE id = ? LIMIT 1')
      .get(id) as { id: number; ring_number: string } | undefined;
    return row ?? null;
  } catch {
    return null;
  }
}

// 生成唯一公棚编码:LOFT-YYYYMMDD-随机后缀,保证不与 lofts.code 冲突
function genUniqueLoftCode(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  for (let i = 0; i < 10; i++) {
    const suffix = String(Math.floor(Math.random() * 9000) + 1000);
    const code = `LOFT-${y}${m}${d}-${suffix}`;
    const exists = db.prepare('SELECT id FROM lofts WHERE code = ?').get(code);
    if (!exists) return code;
  }
  // 兜底:使用时间戳
  return `LOFT-${y}${m}${d}-${now.getTime().toString().slice(-6)}`;
}

export default loftRouter;
