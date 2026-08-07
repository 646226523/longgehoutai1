// 检测预约管理模块 - 后端路由
// 挂载于 /api/detection,所有接口需登录鉴权
// 子模块:检测机构管理、检测预约订单、检测排期日历、检测报告
import { Router, Response } from 'express';
import db from '../db';
import { authenticate, requirePermission } from '../middlewares/auth';
import { auditMiddleware } from '../middlewares/audit';
import type { AuthedRequest, ApiResponse } from '../types';
import { ORDER_STATUS, safeGetGeneProfileBrief } from '../modules/detection/db';

export const detectionRouter = Router();

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

// 所有检测模块接口均需登录鉴权
detectionRouter.use(authenticate);

// ==================== 类型定义 ====================
interface DetectionOrgRow {
  id: number;
  name: string;
  code: string;
  contact: string | null;
  phone: string | null;
  address: string | null;
  qualification: string | null;
  projects: string;
  status: number;
  created_at: number;
  updated_at: number;
}

interface DetectionOrderRow {
  id: number;
  order_no: string;
  user_name: string;
  phone: string | null;
  gene_profile_id: number | null;
  ring_number: string;
  test_org: string;
  org_id: number | null;
  project: string;
  scheduled_date: string | null;
  status: string;
  remark: string | null;
  created_at: number;
  updated_at: number;
}

interface DetectionReportRow {
  id: number;
  order_id: number | null;
  gene_profile_id: number | null;
  report_no: string;
  test_org: string;
  project: string;
  result: string | null;
  report_url: string | null;
  test_date: string | null;
  created_at: number;
}

// 生成检测订单号:DT + YYYYMMDD + 3 位当日序号
function generateOrderNo(): string {
  const now = new Date();
  const ymd =
    `${now.getFullYear()}` +
    `${String(now.getMonth() + 1).padStart(2, '0')}` +
    `${String(now.getDate()).padStart(2, '0')}`;
  // 查询当天订单数作为序号
  const like = `DT${ymd}%`;
  const cnt = (db.prepare('SELECT COUNT(*) AS c FROM detection_orders WHERE order_no LIKE ?').get(like) as { c: number }).c;
  const seq = String(cnt + 1).padStart(3, '0');
  return `DT${ymd}${seq}`;
}

// ==================== 检测机构管理 ====================

// GET /api/detection/orgs - 机构分页列表
detectionRouter.get(
  '/orgs',
  requirePermission('detection:view'),
  (req: AuthedRequest, res: Response) => {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.max(1, parseInt(String(req.query.pageSize ?? '10'), 10) || 10);
    const keyword = String(req.query.keyword ?? '').trim();
    const status = req.query.status;

    const where: string[] = [];
    const params: Array<string | number> = [];
    if (keyword) {
      where.push('(name LIKE ? OR code LIKE ? OR contact LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (status !== undefined && status !== '') {
      where.push('status = ?');
      params.push(Number(status));
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const total = (
      db.prepare(`SELECT COUNT(*) AS c FROM detection_orgs ${whereSql}`).get(...params) as { c: number }
    ).c;

    const rows = db
      .prepare(
        `SELECT id, name, code, contact, phone, address, qualification, projects, status,
                created_at, updated_at
         FROM detection_orgs
         ${whereSql}
         ORDER BY status DESC, created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, pageSize, (page - 1) * pageSize) as DetectionOrgRow[];

    return ok(res, { list: rows, total });
  }
);

// GET /api/detection/orgs/options - 机构下拉选项(仅合作中)
detectionRouter.get(
  '/orgs/options',
  requirePermission('detection:view'),
  (_req: AuthedRequest, res: Response) => {
    const rows = db
      .prepare(
        `SELECT id, name, code, projects FROM detection_orgs WHERE status = 1 ORDER BY id DESC`
      )
      .all() as Array<{ id: number; name: string; code: string; projects: string }>;
    return ok(res, rows);
  }
);

// GET /api/detection/orgs/:id - 机构详情
detectionRouter.get(
  '/orgs/:id',
  requirePermission('detection:view'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的机构 ID');
    const row = db
      .prepare(
        `SELECT id, name, code, contact, phone, address, qualification, projects, status,
                created_at, updated_at FROM detection_orgs WHERE id = ?`
      )
      .get(id) as DetectionOrgRow | undefined;
    if (!row) return fail(res, 404, '检测机构不存在');
    return ok(res, row);
  }
);

// POST /api/detection/orgs - 新增机构
detectionRouter.post(
  '/orgs',
  requirePermission('detection:view'),
  auditMiddleware('detection', 'create_org'),
  (req: AuthedRequest, res: Response) => {
    const body = req.body as {
      name?: string;
      code?: string;
      contact?: string;
      phone?: string;
      address?: string;
      qualification?: string;
      projects?: string;
      status?: number;
    };
    const name = String(body.name ?? '').trim();
    if (!name) return fail(res, 400, '机构名称不能为空');
    const code = String(body.code ?? '').trim();
    if (code) {
      const dup = db.prepare('SELECT id FROM detection_orgs WHERE code = ?').get(code);
      if (dup) return fail(res, 409, '机构编码已存在');
    }
    const result = db
      .prepare(
        `INSERT INTO detection_orgs (name, code, contact, phone, address, qualification, projects, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        name,
        code,
        body.contact ?? null,
        body.phone ?? null,
        body.address ?? null,
        body.qualification ?? null,
        body.projects ?? '',
        body.status ?? 1
      );
    return ok(res, { id: result.lastInsertRowid }, '新增成功');
  }
);

// PUT /api/detection/orgs/:id - 编辑机构
detectionRouter.put(
  '/orgs/:id',
  requirePermission('detection:view'),
  auditMiddleware('detection', 'update_org'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的机构 ID');
    const target = db.prepare('SELECT id, code FROM detection_orgs WHERE id = ?').get(id) as
      | { id: number; code: string }
      | undefined;
    if (!target) return fail(res, 404, '检测机构不存在');

    const body = req.body as {
      name?: string;
      code?: string;
      contact?: string;
      phone?: string;
      address?: string;
      qualification?: string;
      projects?: string;
      status?: number;
    };
    const name = String(body.name ?? '').trim();
    if (!name) return fail(res, 400, '机构名称不能为空');
    const code = String(body.code ?? '').trim();
    if (code && code !== target.code) {
      const dup = db.prepare('SELECT id FROM detection_orgs WHERE code = ? AND id <> ?').get(code, id);
      if (dup) return fail(res, 409, '机构编码已存在');
    }
    db.prepare(
      `UPDATE detection_orgs
       SET name = ?, code = ?, contact = ?, phone = ?, address = ?, qualification = ?,
           projects = ?, status = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      name,
      code,
      body.contact ?? null,
      body.phone ?? null,
      body.address ?? null,
      body.qualification ?? null,
      body.projects ?? '',
      body.status ?? 1,
      Date.now(),
      id
    );
    return ok(res, null, '更新成功');
  }
);

// PATCH /api/detection/orgs/:id/status - 切换机构状态
detectionRouter.patch(
  '/orgs/:id/status',
  requirePermission('detection:view'),
  auditMiddleware('detection', 'toggle_org_status'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的机构 ID');
    const target = db.prepare('SELECT id, status FROM detection_orgs WHERE id = ?').get(id) as
      | { id: number; status: number }
      | undefined;
    if (!target) return fail(res, 404, '检测机构不存在');
    const next = target.status === 1 ? 0 : 1;
    db.prepare('UPDATE detection_orgs SET status = ?, updated_at = ? WHERE id = ?').run(
      next,
      Date.now(),
      id
    );
    return ok(res, { status: next }, next === 1 ? '已启用' : '已停用');
  }
);

// ==================== 检测预约订单 ====================

// GET /api/detection/orders - 订单分页列表(订单号/状态/预约人/时间筛选)
detectionRouter.get(
  '/orders',
  requirePermission('detection:view'),
  (req: AuthedRequest, res: Response) => {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.max(1, parseInt(String(req.query.pageSize ?? '10'), 10) || 10);
    const order_no = String(req.query.order_no ?? '').trim();
    const status = String(req.query.status ?? '').trim();
    const user_name = String(req.query.user_name ?? '').trim();
    const ring_number = String(req.query.ring_number ?? '').trim();
    const startDate = String(req.query.startDate ?? '').trim();
    const endDate = String(req.query.endDate ?? '').trim();

    const where: string[] = [];
    const params: Array<string | number> = [];
    if (order_no) {
      where.push('order_no LIKE ?');
      params.push(`%${order_no}%`);
    }
    if (status) {
      where.push('status = ?');
      params.push(status);
    }
    if (user_name) {
      where.push('(user_name LIKE ? OR phone LIKE ?)');
      params.push(`%${user_name}%`, `%${user_name}%`);
    }
    if (ring_number) {
      where.push('ring_number LIKE ?');
      params.push(`%${ring_number}%`);
    }
    if (startDate) {
      where.push('scheduled_date >= ?');
      params.push(startDate);
    }
    if (endDate) {
      where.push('scheduled_date <= ?');
      params.push(endDate);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const total = (
      db.prepare(`SELECT COUNT(*) AS c FROM detection_orders ${whereSql}`).get(...params) as {
        c: number;
      }
    ).c;

    const rows = db
      .prepare(
        `SELECT id, order_no, user_name, phone, gene_profile_id, ring_number, test_org, org_id,
                project, scheduled_date, status, remark, created_at, updated_at
         FROM detection_orders
         ${whereSql}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, pageSize, (page - 1) * pageSize) as DetectionOrderRow[];

    return ok(res, { list: rows, total });
  }
);

// GET /api/detection/orders/options - 订单下拉选项(供报告关联选择,按时间倒序最近 200 条)
detectionRouter.get(
  '/orders/options',
  requirePermission('detection:view'),
  (req: AuthedRequest, res: Response) => {
    const keyword = String(req.query.keyword ?? '').trim();
    let whereSql = '';
    const params: Array<string | number> = [];
    if (keyword) {
      whereSql = 'WHERE order_no LIKE ? OR user_name LIKE ? OR ring_number LIKE ?';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    const rows = db
      .prepare(
        `SELECT id, order_no, user_name, phone, ring_number, project, status
         FROM detection_orders
         ${whereSql}
         ORDER BY created_at DESC
         LIMIT 200`
      )
      .all(...params) as Array<{
      id: number;
      order_no: string;
      user_name: string;
      phone: string | null;
      ring_number: string;
      project: string;
      status: string;
    }>;
    return ok(res, rows);
  }
);

// GET /api/detection/orders/:id - 订单详情(含关联基因档案简要 + 报告列表)
detectionRouter.get(
  '/orders/:id',
  requirePermission('detection:view'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的订单 ID');
    const order = db
      .prepare(
        `SELECT id, order_no, user_name, phone, gene_profile_id, ring_number, test_org, org_id,
                project, scheduled_date, status, remark, created_at, updated_at
         FROM detection_orders WHERE id = ?`
      )
      .get(id) as DetectionOrderRow | undefined;
    if (!order) return fail(res, 404, '预约订单不存在');

    // 跨模块:关联基因档案简要(容错)
    const geneProfile =
      order.gene_profile_id != null
        ? safeGetGeneProfileBrief(db, order.gene_profile_id)
        : null;

    // 关联报告列表
    const reports = db
      .prepare(
        `SELECT id, order_id, gene_profile_id, report_no, test_org, project, result, report_url,
                test_date, created_at
         FROM detection_reports WHERE order_id = ? ORDER BY test_date DESC, id DESC`
      )
      .all(id) as DetectionReportRow[];

    return ok(res, { ...order, gene_profile: geneProfile, reports });
  }
);

// POST /api/detection/orders - 新增订单(后台代录,自动生成订单号)
detectionRouter.post(
  '/orders',
  requirePermission('detection:view'),
  auditMiddleware('detection', 'create_order'),
  (req: AuthedRequest, res: Response) => {
    const body = req.body as {
      user_name?: string;
      phone?: string;
      gene_profile_id?: number | null;
      ring_number?: string;
      test_org?: string;
      org_id?: number | null;
      project?: string;
      scheduled_date?: string | null;
      status?: string;
      remark?: string;
    };
    const user_name = String(body.user_name ?? '').trim();
    if (!user_name) return fail(res, 400, '预约人姓名不能为空');
    const project = String(body.project ?? '').trim();
    if (!project) return fail(res, 400, '检测项目不能为空');

    // 若选择鸽只档案,校验存在性(跨模块容错)
    if (body.gene_profile_id) {
      const brief = safeGetGeneProfileBrief(db, body.gene_profile_id);
      if (!brief) return fail(res, 400, '关联的基因档案不存在或基因模块未初始化');
    }

    // 若选择机构,校验存在性
    if (body.org_id) {
      const org = db.prepare('SELECT id, name FROM detection_orgs WHERE id = ?').get(body.org_id) as
        | { id: number; name: string }
        | undefined;
      if (!org) return fail(res, 400, '检测机构不存在');
      if (!body.test_org) body.test_org = org.name;
    }

    const order_no = generateOrderNo();
    const status = body.status || ORDER_STATUS.PENDING;

    const result = db
      .prepare(
        `INSERT INTO detection_orders
          (order_no, user_name, phone, gene_profile_id, ring_number, test_org, org_id, project,
           scheduled_date, status, remark)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        order_no,
        user_name,
        body.phone ?? null,
        body.gene_profile_id ?? null,
        body.ring_number ?? '',
        body.test_org ?? '',
        body.org_id ?? null,
        project,
        body.scheduled_date ?? null,
        status,
        body.remark ?? null
      );
    return ok(res, { id: result.lastInsertRowid, order_no }, '新增成功');
  }
);

// PUT /api/detection/orders/:id - 编辑订单
detectionRouter.put(
  '/orders/:id',
  requirePermission('detection:view'),
  auditMiddleware('detection', 'update_order'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的订单 ID');
    const target = db.prepare('SELECT id, status FROM detection_orders WHERE id = ?').get(id) as
      | { id: number; status: string }
      | undefined;
    if (!target) return fail(res, 404, '预约订单不存在');
    // 已完成/已取消订单不允许编辑
    if (target.status === ORDER_STATUS.COMPLETED || target.status === ORDER_STATUS.CANCELLED) {
      return fail(res, 400, '该订单已完成或已取消,不可编辑');
    }

    const body = req.body as {
      user_name?: string;
      phone?: string;
      gene_profile_id?: number | null;
      ring_number?: string;
      test_org?: string;
      org_id?: number | null;
      project?: string;
      scheduled_date?: string | null;
      remark?: string;
    };
    if (body.gene_profile_id) {
      const brief = safeGetGeneProfileBrief(db, body.gene_profile_id);
      if (!brief) return fail(res, 400, '关联的基因档案不存在或基因模块未初始化');
    }
    if (body.org_id) {
      const org = db.prepare('SELECT id, name FROM detection_orgs WHERE id = ?').get(body.org_id) as
        | { id: number; name: string }
        | undefined;
      if (!org) return fail(res, 400, '检测机构不存在');
    }

    db.prepare(
      `UPDATE detection_orders
       SET user_name = ?, phone = ?, gene_profile_id = ?, ring_number = ?, test_org = ?,
           org_id = ?, project = ?, scheduled_date = ?, remark = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      body.user_name ?? '',
      body.phone ?? null,
      body.gene_profile_id ?? null,
      body.ring_number ?? '',
      body.test_org ?? '',
      body.org_id ?? null,
      body.project ?? '',
      body.scheduled_date ?? null,
      body.remark ?? null,
      Date.now(),
      id
    );
    return ok(res, null, '更新成功');
  }
);

// POST /api/detection/orders/:id/confirm - 确认预约(待确认 → 已确认)
detectionRouter.post(
  '/orders/:id/confirm',
  requirePermission('detection:view'),
  auditMiddleware('detection', 'confirm_order'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的订单 ID');
    const target = db.prepare('SELECT id, status FROM detection_orders WHERE id = ?').get(id) as
      | { id: number; status: string }
      | undefined;
    if (!target) return fail(res, 404, '预约订单不存在');
    if (target.status !== ORDER_STATUS.PENDING) {
      return fail(res, 400, '仅待确认订单可执行确认操作');
    }
    db.prepare('UPDATE detection_orders SET status = ?, updated_at = ? WHERE id = ?').run(
      ORDER_STATUS.CONFIRMED,
      Date.now(),
      id
    );
    return ok(res, null, '已确认预约');
  }
);

// POST /api/detection/orders/:id/schedule - 排期(设置 scheduled_date,已确认 → 已排期)
detectionRouter.post(
  '/orders/:id/schedule',
  requirePermission('detection:view'),
  auditMiddleware('detection', 'schedule_order'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的订单 ID');
    const target = db.prepare('SELECT id, status FROM detection_orders WHERE id = ?').get(id) as
      | { id: number; status: string }
      | undefined;
    if (!target) return fail(res, 404, '预约订单不存在');
    if (target.status !== ORDER_STATUS.CONFIRMED && target.status !== ORDER_STATUS.SCHEDULED) {
      return fail(res, 400, '仅已确认/已排期订单可执行排期操作');
    }
    const { scheduled_date } = req.body as { scheduled_date?: string };
    const date = String(scheduled_date ?? '').trim();
    if (!date) return fail(res, 400, '请选择排期日期');

    db.prepare(
      'UPDATE detection_orders SET scheduled_date = ?, status = ?, updated_at = ? WHERE id = ?'
    ).run(date, ORDER_STATUS.SCHEDULED, Date.now(), id);
    return ok(res, null, '排期成功');
  }
);

// POST /api/detection/orders/:id/cancel - 取消订单
detectionRouter.post(
  '/orders/:id/cancel',
  requirePermission('detection:view'),
  auditMiddleware('detection', 'cancel_order'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的订单 ID');
    const target = db.prepare('SELECT id, status FROM detection_orders WHERE id = ?').get(id) as
      | { id: number; status: string }
      | undefined;
    if (!target) return fail(res, 404, '预约订单不存在');
    if (target.status === ORDER_STATUS.COMPLETED) {
      return fail(res, 400, '已完成订单不可取消');
    }
    if (target.status === ORDER_STATUS.CANCELLED) {
      return fail(res, 400, '该订单已取消');
    }
    db.prepare('UPDATE detection_orders SET status = ?, updated_at = ? WHERE id = ?').run(
      ORDER_STATUS.CANCELLED,
      Date.now(),
      id
    );
    return ok(res, null, '已取消订单');
  }
);

// DELETE /api/detection/orders/:id - 删除订单(同时删除关联报告)
detectionRouter.delete(
  '/orders/:id',
  requirePermission('detection:view'),
  auditMiddleware('detection', 'delete_order'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的订单 ID');
    const target = db.prepare('SELECT id FROM detection_orders WHERE id = ?').get(id);
    if (!target) return fail(res, 404, '预约订单不存在');
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM detection_reports WHERE order_id = ?').run(id);
      db.prepare('DELETE FROM detection_orders WHERE id = ?').run(id);
    });
    tx();
    return ok(res, null, '删除成功');
  }
);

// ==================== 检测排期日历 ====================

// GET /api/detection/calendar - 按日期范围查询已排期订单(返回日期+订单数,用于日历标记)
// 参数:start YYYY-MM-DD,end YYYY-MM-DD
detectionRouter.get(
  '/calendar',
  requirePermission('detection:view'),
  (req: AuthedRequest, res: Response) => {
    const start = String(req.query.start ?? '').trim();
    const end = String(req.query.end ?? '').trim();
    if (!start || !end) return fail(res, 400, '请指定 start 与 end 日期');

    const rows = db
      .prepare(
        `SELECT scheduled_date AS date, COUNT(*) AS count
         FROM detection_orders
         WHERE scheduled_date IS NOT NULL
           AND scheduled_date >= ? AND scheduled_date <= ?
           AND status IN ('confirmed', 'scheduled')
         GROUP BY scheduled_date
         ORDER BY scheduled_date ASC`
      )
      .all(start, end) as Array<{ date: string; count: number }>;

    return ok(res, rows);
  }
);

// GET /api/detection/calendar/:date - 按某日查询订单
detectionRouter.get(
  '/calendar/:date',
  requirePermission('detection:view'),
  (req: AuthedRequest, res: Response) => {
    const date = String(req.params.date ?? '').trim();
    if (!date) return fail(res, 400, '请指定日期');

    const rows = db
      .prepare(
        `SELECT id, order_no, user_name, phone, gene_profile_id, ring_number, test_org, org_id,
                project, scheduled_date, status, remark, created_at, updated_at
         FROM detection_orders
         WHERE scheduled_date = ?
         ORDER BY status ASC, created_at ASC`
      )
      .all(date) as DetectionOrderRow[];

    return ok(res, rows);
  }
);

// ==================== 检测报告管理 ====================

// GET /api/detection/reports - 报告分页列表(按订单/鸽只/报告编号筛选)
detectionRouter.get(
  '/reports',
  requirePermission('detection:report'),
  (req: AuthedRequest, res: Response) => {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.max(1, parseInt(String(req.query.pageSize ?? '10'), 10) || 10);
    const order_id = req.query.order_id;
    const gene_profile_id = req.query.gene_profile_id;
    const report_no = String(req.query.report_no ?? '').trim();
    const keyword = String(req.query.keyword ?? '').trim();

    const where: string[] = [];
    const params: Array<string | number> = [];
    if (order_id !== undefined && order_id !== '') {
      where.push('r.order_id = ?');
      params.push(Number(order_id));
    }
    if (gene_profile_id !== undefined && gene_profile_id !== '') {
      where.push('r.gene_profile_id = ?');
      params.push(Number(gene_profile_id));
    }
    if (report_no) {
      where.push('r.report_no LIKE ?');
      params.push(`%${report_no}%`);
    }
    if (keyword) {
      where.push('(r.report_no LIKE ? OR r.test_org LIKE ? OR r.project LIKE ? OR r.result LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const total = (
      db.prepare(`SELECT COUNT(*) AS c FROM detection_reports r ${whereSql}`).get(...params) as {
        c: number;
      }
    ).c;

    const rows = db
      .prepare(
        `SELECT r.id, r.order_id, r.gene_profile_id, r.report_no, r.test_org, r.project, r.result,
                r.report_url, r.test_date, r.created_at
         FROM detection_reports r
         ${whereSql}
         ORDER BY r.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, pageSize, (page - 1) * pageSize) as DetectionReportRow[];

    // 跨模块:补充关联鸽只简要(容错)
    const list = rows.map((r) => {
      const gene_profile =
        r.gene_profile_id != null ? safeGetGeneProfileBrief(db, r.gene_profile_id) : null;
      return { ...r, gene_profile };
    });

    return ok(res, { list, total });
  }
);

// GET /api/detection/reports/:id - 报告详情
detectionRouter.get(
  '/reports/:id',
  requirePermission('detection:report'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的报告 ID');
    const row = db
      .prepare(
        `SELECT id, order_id, gene_profile_id, report_no, test_org, project, result, report_url,
                test_date, created_at
         FROM detection_reports WHERE id = ?`
      )
      .get(id) as DetectionReportRow | undefined;
    if (!row) return fail(res, 404, '检测报告不存在');
    const gene_profile =
      row.gene_profile_id != null ? safeGetGeneProfileBrief(db, row.gene_profile_id) : null;
    return ok(res, { ...row, gene_profile });
  }
);

// POST /api/detection/reports - 新增报告(选择订单或鸽只,录入报告信息,完成后更新订单状态为已完成)
detectionRouter.post(
  '/reports',
  requirePermission('detection:report'),
  auditMiddleware('detection', 'create_report'),
  (req: AuthedRequest, res: Response) => {
    const body = req.body as {
      order_id?: number | null;
      gene_profile_id?: number | null;
      report_no?: string;
      test_org?: string;
      project?: string;
      result?: string;
      report_url?: string;
      test_date?: string;
    };
    const report_no = String(body.report_no ?? '').trim();
    if (!report_no) return fail(res, 400, '报告编号不能为空');
    if (!body.test_org || !body.project) {
      return fail(res, 400, '检测机构与检测项目不能为空');
    }
    if (!body.order_id && !body.gene_profile_id) {
      return fail(res, 400, '请关联订单或鸽只基因档案');
    }

    // 校验订单存在性
    let order: { id: number; status: string } | undefined;
    if (body.order_id) {
      order = db.prepare('SELECT id, status FROM detection_orders WHERE id = ?').get(body.order_id) as
        | { id: number; status: string }
        | undefined;
      if (!order) return fail(res, 404, '关联的预约订单不存在');
    }
    // 校验基因档案存在性(跨模块容错)
    if (body.gene_profile_id) {
      const brief = safeGetGeneProfileBrief(db, body.gene_profile_id);
      if (!brief) return fail(res, 400, '关联的基因档案不存在或基因模块未初始化');
    }

    let newId = 0;
    const tx = db.transaction(() => {
      const result = db
        .prepare(
          `INSERT INTO detection_reports
            (order_id, gene_profile_id, report_no, test_org, project, result, report_url, test_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          body.order_id ?? null,
          body.gene_profile_id ?? null,
          report_no,
          body.test_org!.trim(),
          body.project!.trim(),
          body.result ?? null,
          body.report_url ?? null,
          body.test_date ?? null
        );
      newId = result.lastInsertRowid as number;
      // 若关联订单且订单未完成,则更新订单状态为已完成
      if (order && order.status !== ORDER_STATUS.COMPLETED && order.status !== ORDER_STATUS.CANCELLED) {
        db.prepare('UPDATE detection_orders SET status = ?, updated_at = ? WHERE id = ?').run(
          ORDER_STATUS.COMPLETED,
          Date.now(),
          order.id
        );
      }
    });
    tx();

    return ok(res, { id: newId }, '报告录入成功,关联订单已更新为已完成');
  }
);

// PUT /api/detection/reports/:id - 编辑报告
detectionRouter.put(
  '/reports/:id',
  requirePermission('detection:report'),
  auditMiddleware('detection', 'update_report'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的报告 ID');
    const target = db.prepare('SELECT id FROM detection_reports WHERE id = ?').get(id);
    if (!target) return fail(res, 404, '检测报告不存在');

    const body = req.body as {
      report_no?: string;
      test_org?: string;
      project?: string;
      result?: string;
      report_url?: string;
      test_date?: string;
      order_id?: number | null;
      gene_profile_id?: number | null;
    };
    if (body.gene_profile_id) {
      const brief = safeGetGeneProfileBrief(db, body.gene_profile_id);
      if (!brief) return fail(res, 400, '关联的基因档案不存在或基因模块未初始化');
    }
    db.prepare(
      `UPDATE detection_reports
       SET report_no = ?, test_org = ?, project = ?, result = ?, report_url = ?, test_date = ?,
           order_id = ?, gene_profile_id = ?
       WHERE id = ?`
    ).run(
      body.report_no ?? '',
      body.test_org ?? '',
      body.project ?? '',
      body.result ?? null,
      body.report_url ?? null,
      body.test_date ?? null,
      body.order_id ?? null,
      body.gene_profile_id ?? null,
      id
    );
    return ok(res, null, '更新成功');
  }
);

// DELETE /api/detection/reports/:id - 删除报告
detectionRouter.delete(
  '/reports/:id',
  requirePermission('detection:report'),
  auditMiddleware('detection', 'delete_report'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的报告 ID');
    const target = db.prepare('SELECT id FROM detection_reports WHERE id = ?').get(id);
    if (!target) return fail(res, 404, '检测报告不存在');
    db.prepare('DELETE FROM detection_reports WHERE id = ?').run(id);
    return ok(res, null, '删除成功');
  }
);

// ==================== 字典(检测项目类型) ====================

// GET /api/detection/dict/item-types - 查询检测项目类型字典(detection_item_type)
detectionRouter.get(
  '/dict/item-types',
  requirePermission('detection:view'),
  (_req: AuthedRequest, res: Response) => {
    const rows = db
      .prepare(
        `SELECT item_code AS code, item_name AS name FROM dictionary
         WHERE dict_type = 'detection_item_type' AND status = 1
         ORDER BY sort_order ASC`
      )
      .all() as Array<{ code: string; name: string }>;
    return ok(res, rows);
  }
);

export default detectionRouter;
