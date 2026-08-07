// 基因信息管理模块 - 后端路由
// 挂载于 /api/gene,所有接口需登录鉴权
// 子模块:基因档案、基因检测记录、手动录入审核、血统树
import { Router, Response } from 'express';
import db from '../db';
import { authenticate, requirePermission } from '../middlewares/auth';
import { auditMiddleware } from '../middlewares/audit';
import type { AuthedRequest, ApiResponse } from '../types';
import { generateTraceUrl } from '../modules/gene/db';

export const geneRouter = Router();

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

// 所有基因模块接口均需登录鉴权
geneRouter.use(authenticate);

// ==================== 类型定义 ====================
interface GeneProfileRow {
  id: number;
  ring_number: string;
  name: string;
  gender: string;
  breed: string;
  bloodline: string;
  owner_name: string;
  owner_phone: string | null;
  color: string | null;
  eye_color: string | null;
  birth_date: string | null;
  gene_sequence: string | null;
  qr_code: string | null;
  photo_url: string | null;
  status: number;
  created_at: number;
  updated_at: number;
}

interface GeneTestRow {
  id: number;
  gene_profile_id: number;
  test_org: string;
  project: string;
  report_no: string | null;
  result: string | null;
  report_url: string | null;
  test_date: string | null;
  created_at: number;
}

interface GeneSubmissionRow {
  id: number;
  ring_number: string;
  name: string;
  gender: string;
  breed: string;
  bloodline: string;
  owner_name: string;
  owner_phone: string | null;
  color: string | null;
  eye_color: string | null;
  birth_date: string | null;
  submitter_name: string | null;
  submitter_phone: string | null;
  status: string;
  audit_remark: string | null;
  auditor_id: number | null;
  audited_at: number | null;
  created_at: number;
}

// 血统树节点(递归)
interface LineageNode {
  id: number;
  ring_number: string;
  name: string;
  gender: string;
  breed: string;
  bloodline: string;
  sire: LineageNode | null;
  dam: LineageNode | null;
}

// ==================== 基因档案 ====================

// GET /api/gene/profiles - 分页列表(足环号/鸽主/血统/状态筛选)
geneRouter.get(
  '/profiles',
  requirePermission('gene:view'),
  (req: AuthedRequest, res: Response) => {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.max(1, parseInt(String(req.query.pageSize ?? '10'), 10) || 10);
    const ring_number = String(req.query.ring_number ?? '').trim();
    const owner_name = String(req.query.owner_name ?? '').trim();
    const bloodline = String(req.query.bloodline ?? '').trim();
    const status = req.query.status;

    const where: string[] = [];
    const params: Array<string | number> = [];
    if (ring_number) {
      where.push('(p.ring_number LIKE ? OR p.name LIKE ?)');
      params.push(`%${ring_number}%`, `%${ring_number}%`);
    }
    if (owner_name) {
      where.push('p.owner_name LIKE ?');
      params.push(`%${owner_name}%`);
    }
    if (bloodline) {
      where.push('p.bloodline LIKE ?');
      params.push(`%${bloodline}%`);
    }
    if (status !== undefined && status !== '') {
      where.push('p.status = ?');
      params.push(Number(status));
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const total = (
      db.prepare(`SELECT COUNT(*) AS c FROM gene_profiles p ${whereSql}`).get(...params) as { c: number }
    ).c;

    const rows = db
      .prepare(
        `SELECT p.id, p.ring_number, p.name, p.gender, p.breed, p.bloodline, p.owner_name,
                p.owner_phone, p.color, p.eye_color, p.birth_date, p.gene_sequence, p.qr_code,
                p.photo_url, p.status, p.created_at, p.updated_at,
                l.sire_id, l.dam_id,
                s.ring_number AS sire_ring, s.name AS sire_name,
                d.ring_number AS dam_ring, d.name AS dam_name
         FROM gene_profiles p
         LEFT JOIN gene_lineage l ON l.gene_profile_id = p.id
         LEFT JOIN gene_profiles s ON s.id = l.sire_id
         LEFT JOIN gene_profiles d ON d.id = l.dam_id
         ${whereSql}
         ORDER BY p.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, pageSize, (page - 1) * pageSize) as Array<
      GeneProfileRow & {
        sire_id: number | null;
        dam_id: number | null;
        sire_ring: string | null;
        sire_name: string | null;
        dam_ring: string | null;
        dam_name: string | null;
      }
    >;

    const list = rows.map((r) => ({
      id: r.id,
      ring_number: r.ring_number,
      name: r.name,
      gender: r.gender,
      breed: r.breed,
      bloodline: r.bloodline,
      owner_name: r.owner_name,
      owner_phone: r.owner_phone,
      color: r.color,
      eye_color: r.eye_color,
      birth_date: r.birth_date,
      gene_sequence: r.gene_sequence,
      qr_code: r.qr_code,
      photo_url: r.photo_url,
      status: r.status,
      created_at: r.created_at,
      updated_at: r.updated_at,
      sire_id: r.sire_id,
      dam_id: r.dam_id,
      sire_ring: r.sire_ring,
      sire_name: r.sire_name,
      dam_ring: r.dam_ring,
      dam_name: r.dam_name,
    }));

    return ok(res, { list, total });
  }
);

// GET /api/gene/profiles/options - 轻量下拉(供父/母选择器使用)
geneRouter.get(
  '/profiles/options',
  requirePermission('gene:view'),
  (_req: AuthedRequest, res: Response) => {
    const rows = db
      .prepare('SELECT id, ring_number, name, gender FROM gene_profiles WHERE status = 1 ORDER BY id DESC')
      .all() as Array<{ id: number; ring_number: string; name: string; gender: string }>;
    return ok(res, rows);
  }
);

// GET /api/gene/profiles/:id - 详情(含检测记录 + 直系父母)
geneRouter.get(
  '/profiles/:id',
  requirePermission('gene:view'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的档案 ID');

    const profile = db
      .prepare(
        `SELECT p.*, l.sire_id, l.dam_id
         FROM gene_profiles p
         LEFT JOIN gene_lineage l ON l.gene_profile_id = p.id
         WHERE p.id = ?`
      )
      .get(id) as (GeneProfileRow & { sire_id: number | null; dam_id: number | null }) | undefined;
    if (!profile) return fail(res, 404, '基因档案不存在');

    // 关联检测记录
    const tests = db
      .prepare(
        `SELECT id, gene_profile_id, test_org, project, report_no, result, report_url, test_date, created_at
         FROM gene_tests WHERE gene_profile_id = ? ORDER BY test_date DESC, id DESC`
      )
      .all(id) as GeneTestRow[];

    // 直系父母简要信息
    const pickParent = (pid: number | null) => {
      if (!pid) return null;
      return db
        .prepare('SELECT id, ring_number, name, gender, breed, bloodline FROM gene_profiles WHERE id = ?')
        .get(pid) as
        | { id: number; ring_number: string; name: string; gender: string; breed: string; bloodline: string }
        | undefined;
    };

    return ok(res, {
      ...profile,
      tests,
      sire: pickParent(profile.sire_id) ?? null,
      dam: pickParent(profile.dam_id) ?? null,
    });
  }
);

// POST /api/gene/profiles - 新增档案(自动生成溯源二维码与血统记录)
geneRouter.post(
  '/profiles',
  requirePermission('gene:edit'),
  auditMiddleware('gene', 'create_profile'),
  (req: AuthedRequest, res: Response) => {
    const body = req.body as {
      ring_number?: string;
      name?: string;
      gender?: string;
      breed?: string;
      bloodline?: string;
      owner_name?: string;
      owner_phone?: string;
      color?: string;
      eye_color?: string;
      birth_date?: string;
      gene_sequence?: string;
      photo_url?: string;
      status?: number;
      sire_id?: number | null;
      dam_id?: number | null;
    };

    const ring_number = String(body.ring_number ?? '').trim();
    if (!ring_number) return fail(res, 400, '足环号不能为空');
    if (!body.name || !body.name.trim()) return fail(res, 400, '鸽名不能为空');

    const exists = db.prepare('SELECT id FROM gene_profiles WHERE ring_number = ?').get(ring_number);
    if (exists) return fail(res, 409, '足环号已存在');

    // 校验父/母存在性
    if (body.sire_id && !db.prepare('SELECT 1 FROM gene_profiles WHERE id = ?').get(body.sire_id)) {
      return fail(res, 400, '指定的父鸽档案不存在');
    }
    if (body.dam_id && !db.prepare('SELECT 1 FROM gene_profiles WHERE id = ?').get(body.dam_id)) {
      return fail(res, 400, '指定的母鸽档案不存在');
    }

    let newId = 0;
    const tx = db.transaction(() => {
      const result = db
        .prepare(
          `INSERT INTO gene_profiles
            (ring_number, name, gender, breed, bloodline, owner_name, owner_phone, color, eye_color,
             birth_date, gene_sequence, photo_url, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          ring_number,
          body.name!.trim(),
          body.gender ?? 'unknown',
          body.breed ?? '',
          body.bloodline ?? '',
          body.owner_name ?? '',
          body.owner_phone ?? null,
          body.color ?? null,
          body.eye_color ?? null,
          body.birth_date ?? null,
          body.gene_sequence ?? null,
          body.photo_url ?? null,
          body.status ?? 1
        );
      newId = result.lastInsertRowid as number;
      // 生成溯源二维码
      const qr = generateTraceUrl(newId, ring_number);
      db.prepare('UPDATE gene_profiles SET qr_code = ? WHERE id = ?').run(qr, newId);
      // 写入血统记录
      db.prepare(
        'INSERT INTO gene_lineage (gene_profile_id, sire_id, dam_id) VALUES (?, ?, ?)'
      ).run(newId, body.sire_id ?? null, body.dam_id ?? null);
    });
    tx();

    return ok(res, { id: newId }, '新增成功');
  }
);

// PUT /api/gene/profiles/:id - 编辑档案(含父/母关系)
geneRouter.put(
  '/profiles/:id',
  requirePermission('gene:edit'),
  auditMiddleware('gene', 'update_profile'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的档案 ID');

    const target = db.prepare('SELECT id, ring_number FROM gene_profiles WHERE id = ?').get(id) as
      | { id: number; ring_number: string }
      | undefined;
    if (!target) return fail(res, 404, '基因档案不存在');

    const body = req.body as {
      ring_number?: string;
      name?: string;
      gender?: string;
      breed?: string;
      bloodline?: string;
      owner_name?: string;
      owner_phone?: string;
      color?: string;
      eye_color?: string;
      birth_date?: string;
      gene_sequence?: string;
      photo_url?: string;
      status?: number;
      sire_id?: number | null;
      dam_id?: number | null;
    };

    const ring_number = String(body.ring_number ?? target.ring_number).trim();
    if (!ring_number) return fail(res, 400, '足环号不能为空');

    // 足环号变更后校验唯一性
    if (ring_number !== target.ring_number) {
      const dup = db.prepare('SELECT id FROM gene_profiles WHERE ring_number = ? AND id <> ?').get(ring_number, id);
      if (dup) return fail(res, 409, '足环号已存在');
    }
    // 校验父/母(不能指向自己)
    if (body.sire_id !== undefined && body.sire_id !== null) {
      if (body.sire_id === id) return fail(res, 400, '父鸽不能指向自身');
      if (!db.prepare('SELECT 1 FROM gene_profiles WHERE id = ?').get(body.sire_id)) {
        return fail(res, 400, '指定的父鸽档案不存在');
      }
    }
    if (body.dam_id !== undefined && body.dam_id !== null) {
      if (body.dam_id === id) return fail(res, 400, '母鸽不能指向自身');
      if (!db.prepare('SELECT 1 FROM gene_profiles WHERE id = ?').get(body.dam_id)) {
        return fail(res, 400, '指定的母鸽档案不存在');
      }
    }

    const tx = db.transaction(() => {
      db.prepare(
        `UPDATE gene_profiles
         SET ring_number = ?, name = ?, gender = ?, breed = ?, bloodline = ?, owner_name = ?,
             owner_phone = ?, color = ?, eye_color = ?, birth_date = ?, gene_sequence = ?,
             photo_url = ?, status = ?, updated_at = ?
         WHERE id = ?`
      ).run(
        ring_number,
        body.name ?? '',
        body.gender ?? 'unknown',
        body.breed ?? '',
        body.bloodline ?? '',
        body.owner_name ?? '',
        body.owner_phone ?? null,
        body.color ?? null,
        body.eye_color ?? null,
        body.birth_date ?? null,
        body.gene_sequence ?? null,
        body.photo_url ?? null,
        body.status ?? 1,
        Date.now(),
        id
      );
      // 足环号变更后同步更新溯源二维码
      if (ring_number !== target.ring_number) {
        db.prepare('UPDATE gene_profiles SET qr_code = ? WHERE id = ?').run(
          generateTraceUrl(id, ring_number),
          id
        );
      }
      // 父/母关系 upsert(仅当请求显式传入时更新)
      if (body.sire_id !== undefined || body.dam_id !== undefined) {
        const existing = db.prepare('SELECT id FROM gene_lineage WHERE gene_profile_id = ?').get(id);
        const sireVal = body.sire_id ?? null;
        const damVal = body.dam_id ?? null;
        if (existing) {
          db.prepare('UPDATE gene_lineage SET sire_id = ?, dam_id = ? WHERE gene_profile_id = ?').run(
            sireVal,
            damVal,
            id
          );
        } else {
          db.prepare(
            'INSERT INTO gene_lineage (gene_profile_id, sire_id, dam_id) VALUES (?, ?, ?)'
          ).run(id, sireVal, damVal);
        }
      }
    });
    tx();

    return ok(res, null, '更新成功');
  }
);

// DELETE /api/gene/profiles/:id - 删除档案(级联删除检测记录与血统记录)
geneRouter.delete(
  '/profiles/:id',
  requirePermission('gene:edit'),
  auditMiddleware('gene', 'delete_profile'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的档案 ID');
    const target = db.prepare('SELECT id FROM gene_profiles WHERE id = ?').get(id);
    if (!target) return fail(res, 404, '基因档案不存在');
    db.prepare('DELETE FROM gene_profiles WHERE id = ?').run(id);
    return ok(res, null, '删除成功');
  }
);

// POST /api/gene/profiles/:id/qrcode - 重新生成溯源二维码
geneRouter.post(
  '/profiles/:id/qrcode',
  requirePermission('gene:edit'),
  auditMiddleware('gene', 'regen_qrcode'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的档案 ID');
    const target = db.prepare('SELECT id, ring_number FROM gene_profiles WHERE id = ?').get(id) as
      | { id: number; ring_number: string }
      | undefined;
    if (!target) return fail(res, 404, '基因档案不存在');
    const qr = generateTraceUrl(target.id, target.ring_number);
    db.prepare('UPDATE gene_profiles SET qr_code = ?, updated_at = ? WHERE id = ?').run(
      qr,
      Date.now(),
      id
    );
    return ok(res, { qr_code: qr }, '二维码已重新生成');
  }
);

// ==================== 基因检测记录 ====================

// GET /api/gene/profiles/:id/tests - 某档案的检测记录列表
geneRouter.get(
  '/profiles/:id/tests',
  requirePermission('gene:view'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的档案 ID');
    const rows = db
      .prepare(
        `SELECT id, gene_profile_id, test_org, project, report_no, result, report_url, test_date, created_at
         FROM gene_tests WHERE gene_profile_id = ? ORDER BY test_date DESC, id DESC`
      )
      .all(id) as GeneTestRow[];
    return ok(res, rows);
  }
);

// POST /api/gene/tests - 新增检测记录
geneRouter.post(
  '/tests',
  requirePermission('gene:edit'),
  auditMiddleware('gene', 'create_test'),
  (req: AuthedRequest, res: Response) => {
    const body = req.body as {
      gene_profile_id?: number;
      test_org?: string;
      project?: string;
      report_no?: string;
      result?: string;
      report_url?: string;
      test_date?: string;
    };
    if (!body.gene_profile_id) return fail(res, 400, '缺少基因档案 ID');
    if (!body.test_org || !body.project) return fail(res, 400, '检测机构与项目不能为空');

    const target = db.prepare('SELECT id FROM gene_profiles WHERE id = ?').get(body.gene_profile_id);
    if (!target) return fail(res, 404, '基因档案不存在');

    const result = db
      .prepare(
        `INSERT INTO gene_tests (gene_profile_id, test_org, project, report_no, result, report_url, test_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        body.gene_profile_id,
        body.test_org.trim(),
        body.project.trim(),
        body.report_no ?? null,
        body.result ?? null,
        body.report_url ?? null,
        body.test_date ?? null
      );
    return ok(res, { id: result.lastInsertRowid }, '新增成功');
  }
);

// PUT /api/gene/tests/:id - 编辑检测记录
geneRouter.put(
  '/tests/:id',
  requirePermission('gene:edit'),
  auditMiddleware('gene', 'update_test'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的检测记录 ID');
    const target = db.prepare('SELECT id FROM gene_tests WHERE id = ?').get(id);
    if (!target) return fail(res, 404, '检测记录不存在');

    const body = req.body as {
      test_org?: string;
      project?: string;
      report_no?: string;
      result?: string;
      report_url?: string;
      test_date?: string;
    };
    db.prepare(
      `UPDATE gene_tests
       SET test_org = ?, project = ?, report_no = ?, result = ?, report_url = ?, test_date = ?
       WHERE id = ?`
    ).run(
      body.test_org ?? '',
      body.project ?? '',
      body.report_no ?? null,
      body.result ?? null,
      body.report_url ?? null,
      body.test_date ?? null,
      id
    );
    return ok(res, null, '更新成功');
  }
);

// DELETE /api/gene/tests/:id - 删除检测记录
geneRouter.delete(
  '/tests/:id',
  requirePermission('gene:edit'),
  auditMiddleware('gene', 'delete_test'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的检测记录 ID');
    const target = db.prepare('SELECT id FROM gene_tests WHERE id = ?').get(id);
    if (!target) return fail(res, 404, '检测记录不存在');
    db.prepare('DELETE FROM gene_tests WHERE id = ?').run(id);
    return ok(res, null, '删除成功');
  }
);

// ==================== 血统树 ====================

// 递归构建血统树(向上查父系/母系,depth 控制代数)
// depth=2 → 本鸽 + 父母 + 祖父母(三代)
function buildLineageNode(profileId: number, depth: number): LineageNode | null {
  if (depth < 0) return null;
  const profile = db
    .prepare(
      'SELECT id, ring_number, name, gender, breed, bloodline FROM gene_profiles WHERE id = ?'
    )
    .get(profileId) as
    | { id: number; ring_number: string; name: string; gender: string; breed: string; bloodline: string }
    | undefined;
  if (!profile) return null;
  const lin = db
    .prepare('SELECT sire_id, dam_id FROM gene_lineage WHERE gene_profile_id = ?')
    .get(profileId) as { sire_id: number | null; dam_id: number | null } | undefined;
  const sire = lin?.sire_id ? buildLineageNode(lin.sire_id, depth - 1) : null;
  const dam = lin?.dam_id ? buildLineageNode(lin.dam_id, depth - 1) : null;
  return {
    id: profile.id,
    ring_number: profile.ring_number,
    name: profile.name,
    gender: profile.gender,
    breed: profile.breed,
    bloodline: profile.bloodline,
    sire,
    dam,
  };
}

// GET /api/gene/profiles/:id/lineage - 血统树(三代)
geneRouter.get(
  '/profiles/:id/lineage',
  requirePermission('gene:view'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的档案 ID');
    const target = db.prepare('SELECT id FROM gene_profiles WHERE id = ?').get(id);
    if (!target) return fail(res, 404, '基因档案不存在');
    const tree = buildLineageNode(id, 2);
    return ok(res, tree);
  }
);

// ==================== 手动录入审核 ====================

// GET /api/gene/submissions - 待审/审核记录分页列表
geneRouter.get(
  '/submissions',
  requirePermission('gene:audit'),
  (req: AuthedRequest, res: Response) => {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.max(1, parseInt(String(req.query.pageSize ?? '10'), 10) || 10);
    const status = String(req.query.status ?? 'pending').trim();
    const keyword = String(req.query.keyword ?? '').trim();

    const where: string[] = [];
    const params: Array<string | number> = [];
    if (status) {
      where.push('status = ?');
      params.push(status);
    }
    if (keyword) {
      where.push('(ring_number LIKE ? OR name LIKE ? OR owner_name LIKE ? OR submitter_name LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const total = (
      db.prepare(`SELECT COUNT(*) AS c FROM gene_manual_submissions ${whereSql}`).get(...params) as {
        c: number;
      }
    ).c;

    const rows = db
      .prepare(
        `SELECT id, ring_number, name, gender, breed, bloodline, owner_name, owner_phone, color,
                eye_color, birth_date, submitter_name, submitter_phone, status, audit_remark,
                auditor_id, audited_at, created_at
         FROM gene_manual_submissions
         ${whereSql}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, pageSize, (page - 1) * pageSize) as GeneSubmissionRow[];

    return ok(res, { list: rows, total });
  }
);

// GET /api/gene/submissions/:id - 审核详情
geneRouter.get(
  '/submissions/:id',
  requirePermission('gene:audit'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的记录 ID');
    const row = db
      .prepare(
        `SELECT id, ring_number, name, gender, breed, bloodline, owner_name, owner_phone, color,
                eye_color, birth_date, submitter_name, submitter_phone, status, audit_remark,
                auditor_id, audited_at, created_at
         FROM gene_manual_submissions WHERE id = ?`
      )
      .get(id) as GeneSubmissionRow | undefined;
    if (!row) return fail(res, 404, '提交记录不存在');
    return ok(res, row);
  }
);

// POST /api/gene/submissions/:id/approve - 审核通过(校验足环号不重复 → 写入正式档案 + 生成二维码)
geneRouter.post(
  '/submissions/:id/approve',
  requirePermission('gene:audit'),
  auditMiddleware('gene', 'approve_submission'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的记录 ID');
    const sub = db
      .prepare(
        `SELECT id, ring_number, name, gender, breed, bloodline, owner_name, owner_phone, color,
                eye_color, birth_date, submitter_name, submitter_phone, status
         FROM gene_manual_submissions WHERE id = ?`
      )
      .get(id) as GeneSubmissionRow | undefined;
    if (!sub) return fail(res, 404, '提交记录不存在');
    if (sub.status !== 'pending') return fail(res, 400, '该记录已审核,不可重复操作');

    // 校验足环号不重复
    const dup = db.prepare('SELECT id FROM gene_profiles WHERE ring_number = ?').get(sub.ring_number);
    if (dup) return fail(res, 409, `足环号 ${sub.ring_number} 已存在正式档案,无法通过`);

    let newProfileId = 0;
    const tx = db.transaction(() => {
      const result = db
        .prepare(
          `INSERT INTO gene_profiles
            (ring_number, name, gender, breed, bloodline, owner_name, owner_phone, color, eye_color,
             birth_date, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
        )
        .run(
          sub.ring_number,
          sub.name,
          sub.gender,
          sub.breed,
          sub.bloodline,
          sub.owner_name,
          sub.owner_phone,
          sub.color,
          sub.eye_color,
          sub.birth_date
        );
      newProfileId = result.lastInsertRowid as number;
      // 生成溯源二维码
      db.prepare('UPDATE gene_profiles SET qr_code = ? WHERE id = ?').run(
        generateTraceUrl(newProfileId, sub.ring_number),
        newProfileId
      );
      // 建立空白血统记录(提交数据无父/母信息)
      db.prepare(
        'INSERT INTO gene_lineage (gene_profile_id, sire_id, dam_id) VALUES (?, NULL, NULL)'
      ).run(newProfileId);
      // 更新提交记录状态
      db.prepare(
        `UPDATE gene_manual_submissions
         SET status = 'approved', auditor_id = ?, audited_at = ?
         WHERE id = ?`
      ).run(req.adminUser?.id ?? null, Date.now(), id);
    });
    tx();

    return ok(res, { profile_id: newProfileId }, '审核通过,已生成正式基因档案与溯源二维码');
  }
);

// POST /api/gene/submissions/:id/reject - 驳回(填写理由)
geneRouter.post(
  '/submissions/:id/reject',
  requirePermission('gene:audit'),
  auditMiddleware('gene', 'reject_submission'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的记录 ID');
    const { audit_remark } = req.body as { audit_remark?: string };
    const remark = String(audit_remark ?? '').trim();
    if (!remark) return fail(res, 400, '请填写驳回理由');

    const sub = db
      .prepare('SELECT id, status FROM gene_manual_submissions WHERE id = ?')
      .get(id) as { id: number; status: string } | undefined;
    if (!sub) return fail(res, 404, '提交记录不存在');
    if (sub.status !== 'pending') return fail(res, 400, '该记录已审核,不可重复操作');

    db.prepare(
      `UPDATE gene_manual_submissions
       SET status = 'rejected', audit_remark = ?, auditor_id = ?, audited_at = ?
       WHERE id = ?`
    ).run(remark, req.adminUser?.id ?? null, Date.now(), id);

    return ok(res, null, '已驳回');
  }
);

export default geneRouter;
