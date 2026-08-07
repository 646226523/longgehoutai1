// 仲裁管理模块 - 后端路由
// 挂载于 /api/arbitration,所有接口需登录鉴权
// 子模块:仲裁案件受理与立案、证据材料管理、仲裁裁决与执行
import { Router, Response } from 'express';
import db from '../db';
import { authenticate, requirePermission } from '../middlewares/auth';
import { auditMiddleware } from '../middlewares/audit';
import type { AuthedRequest, ApiResponse } from '../types';
import {
  CASE_STATUS,
  CASE_TYPE,
  EVIDENCE_FILE_TYPE,
  AWARD_ACTION,
  AWARD_EXECUTE_STATUS,
} from '../modules/arbitration/db';
import type {
  ArbitrationCaseRow,
  ArbitrationEvidenceRow,
  ArbitrationAwardRow,
} from '../modules/arbitration/db';

export const arbitrationRouter = Router();

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

// 所有仲裁模块接口均需登录鉴权
arbitrationRouter.use(authenticate);

// ==================== 跨模块查询辅助 ====================

// 拍卖成交单简要信息(供案件关联展示)
interface AuctionDealBrief {
  id: number;
  session_id: number;
  item_id: number;
  nft_asset_id: number | null;
  seller: string;
  buyer: string | null;
  final_price: number;
  status: string;
  session_name: string | null;
  item_name: string | null;
}

// 跨模块查询单个成交单简要(容错:表不存在或查询失败返回 null)
function getDealBrief(dealId: number | null): AuctionDealBrief | null {
  if (!dealId) return null;
  try {
    const row = db
      .prepare(
        `SELECT d.id, d.session_id, d.item_id, d.nft_asset_id, d.seller, d.buyer, d.final_price, d.status,
                s.name AS session_name, i.name AS item_name
         FROM auction_deals d
         LEFT JOIN auction_sessions s ON s.id = d.session_id
         LEFT JOIN auction_items i ON i.id = d.item_id
         WHERE d.id = ?`
      )
      .get(dealId) as AuctionDealBrief | undefined;
    return row ?? null;
  } catch {
    // auction_deals 表可能尚未创建,容错返回 null
    return null;
  }
}

// 案件状态标签映射
const CASE_STATUS_LABEL: Record<string, string> = {
  pending: '待受理',
  accepted: '已立案',
  hearing: '审理中',
  ruled: '已裁决',
  archived: '已归档',
};

// 纠纷类型标签映射
const CASE_TYPE_LABEL: Record<string, string> = {
  auction: '拍卖纠纷',
  trade: '交易纠纷',
  other: '其他',
};

// 证据提交方标签映射
const PARTY_LABEL: Record<string, string> = {
  complainant: '申诉人',
  respondent: '被诉人',
};

// 证据文件类型标签映射
const FILE_TYPE_LABEL: Record<string, string> = {
  image: '图片',
  document: '文档',
  video: '视频',
};

// 裁决执行动作标签映射
const AWARD_ACTION_LABEL: Record<string, string> = {
  refund: '退款',
  force_deliver: '强制交割',
  other: '其他',
};

// 裁决执行状态标签映射
const AWARD_EXECUTE_STATUS_LABEL: Record<string, string> = {
  pending: '待执行',
  executing: '执行中',
  executed: '已执行',
};

// 生成案件号:ARB-YYYYMMDD-XXXX(XXXX 为当日序号,基于已有最大序号 + 1)
function generateCaseNo(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `ARB-${dateStr}-`;
  let seq = 1;
  try {
    const row = db
      .prepare(
        `SELECT case_no FROM arbitration_cases WHERE case_no LIKE ? ORDER BY case_no DESC LIMIT 1`
      )
      .get(`${prefix}%`) as { case_no: string } | undefined;
    if (row?.case_no) {
      const lastSeq = parseInt(row.case_no.slice(prefix.length), 10);
      if (Number.isFinite(lastSeq)) seq = lastSeq + 1;
    }
  } catch {
    // 容错:从 1 开始
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ==================== 仲裁案件 ====================

// GET /api/arbitration/cases - 案件列表(案件号/状态/类型筛选)
arbitrationRouter.get(
  '/cases',
  requirePermission('arbitration:view'),
  (req: AuthedRequest, res: Response) => {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.max(1, parseInt(String(req.query.pageSize ?? '10'), 10) || 10);
    const case_no = String(req.query.case_no ?? '').trim();
    const status = String(req.query.status ?? '').trim();
    const type = String(req.query.type ?? '').trim();
    const keyword = String(req.query.keyword ?? '').trim();

    const where: string[] = [];
    const params: Array<string | number> = [];
    if (case_no) {
      where.push('c.case_no LIKE ?');
      params.push(`%${case_no}%`);
    }
    if (status) {
      where.push('c.status = ?');
      params.push(status);
    }
    if (type) {
      where.push('c.type = ?');
      params.push(type);
    }
    if (keyword) {
      where.push('(c.complainant LIKE ? OR c.respondent LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const total = (
      db.prepare(`SELECT COUNT(*) AS c FROM arbitration_cases c ${whereSql}`).get(...params) as {
        c: number;
      }
    ).c;

    const rows = db
      .prepare(
        `SELECT c.id, c.case_no, c.type, c.related_deal_id, c.complainant, c.respondent,
                c.amount, c.description, c.status, c.acceptor_id, c.accepted_at, c.created_at, c.updated_at
         FROM arbitration_cases c
         ${whereSql}
         ORDER BY c.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, pageSize, (page - 1) * pageSize) as ArbitrationCaseRow[];

    // 批量关联成交单简要
    const dealIds = rows
      .map((r) => r.related_deal_id)
      .filter((id): id is number => id !== null);
    const dealMap = new Map<number, AuctionDealBrief>();
    dealIds.forEach((id) => {
      const brief = getDealBrief(id);
      if (brief) dealMap.set(id, brief);
    });

    // 批量查询每个案件的证据数与是否有裁决
    const caseIds = rows.map((r) => r.id);
    const evidenceCountMap = new Map<number, number>();
    const hasAwardMap = new Map<number, number>();
    if (caseIds.length) {
      try {
        const placeholders = caseIds.map(() => '?').join(',');
        const evidenceRows = db
          .prepare(
            `SELECT case_id, COUNT(*) AS c FROM arbitration_evidence WHERE case_id IN (${placeholders}) GROUP BY case_id`
          )
          .all(...caseIds) as Array<{ case_id: number; c: number }>;
        evidenceRows.forEach((r) => evidenceCountMap.set(r.case_id, r.c));
        const awardRows = db
          .prepare(
            `SELECT case_id, COUNT(*) AS c FROM arbitration_awards WHERE case_id IN (${placeholders}) GROUP BY case_id`
          )
          .all(...caseIds) as Array<{ case_id: number; c: number }>;
        awardRows.forEach((r) => hasAwardMap.set(r.case_id, r.c));
      } catch {
        // 容错
      }
    }

    const list = rows.map((r) => ({
      ...r,
      status_label: CASE_STATUS_LABEL[r.status] ?? r.status,
      type_label: CASE_TYPE_LABEL[r.type] ?? r.type,
      related_deal: r.related_deal_id ? dealMap.get(r.related_deal_id) ?? null : null,
      evidence_count: evidenceCountMap.get(r.id) ?? 0,
      has_award: (hasAwardMap.get(r.id) ?? 0) > 0,
    }));

    return ok(res, { list, total });
  }
);

// GET /api/arbitration/cases/:id - 案件详情(含证据 + 裁决 + 关联成交单)
arbitrationRouter.get(
  '/cases/:id',
  requirePermission('arbitration:view'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的案件 ID');

    const caseRow = db
      .prepare(
        `SELECT id, case_no, type, related_deal_id, complainant, respondent, amount, description,
                status, acceptor_id, accepted_at, created_at, updated_at
         FROM arbitration_cases WHERE id = ?`
      )
      .get(id) as ArbitrationCaseRow | undefined;
    if (!caseRow) return fail(res, 404, '仲裁案件不存在');

    const evidences = db
      .prepare(
        `SELECT id, case_id, party, title, file_url, file_type, description, created_at
         FROM arbitration_evidence WHERE case_id = ? ORDER BY created_at ASC`
      )
      .all(id) as ArbitrationEvidenceRow[];

    const award = db
      .prepare(
        `SELECT id, case_id, arbitrator_id, ruling, action, execute_status, award_time, created_at
         FROM arbitration_awards WHERE case_id = ? ORDER BY id DESC LIMIT 1`
      )
      .get(id) as ArbitrationAwardRow | undefined;

    return ok(res, {
      ...caseRow,
      status_label: CASE_STATUS_LABEL[caseRow.status] ?? caseRow.status,
      type_label: CASE_TYPE_LABEL[caseRow.type] ?? caseRow.type,
      related_deal: getDealBrief(caseRow.related_deal_id),
      evidences: evidences.map((e) => ({
        ...e,
        party_label: PARTY_LABEL[e.party] ?? e.party,
        file_type_label: FILE_TYPE_LABEL[e.file_type] ?? e.file_type,
      })),
      award: award
        ? {
            ...award,
            action_label: AWARD_ACTION_LABEL[award.action] ?? award.action,
            execute_status_label:
              AWARD_EXECUTE_STATUS_LABEL[award.execute_status] ?? award.execute_status,
          }
        : null,
    });
  }
);

// POST /api/arbitration/cases - 新增案件(手动登记,状态默认待受理)
arbitrationRouter.post(
  '/cases',
  requirePermission('arbitration:view'),
  auditMiddleware('arbitration', 'create_case'),
  (req: AuthedRequest, res: Response) => {
    const body = req.body as {
      type?: string;
      related_deal_id?: number | null;
      complainant?: string;
      respondent?: string;
      amount?: number;
      description?: string;
    };

    const complainant = String(body.complainant ?? '').trim();
    if (!complainant) return fail(res, 400, '申诉人不能为空');
    const respondent = String(body.respondent ?? '').trim();
    if (!respondent) return fail(res, 400, '被诉人不能为空');

    let type = String(body.type ?? CASE_TYPE.OTHER).trim();
    const validTypes: string[] = [CASE_TYPE.AUCTION, CASE_TYPE.TRADE, CASE_TYPE.OTHER];
    if (!validTypes.includes(type)) type = CASE_TYPE.OTHER;

    const amount = Number(body.amount ?? 0);
    if (!Number.isFinite(amount) || amount < 0) {
      return fail(res, 400, '争议金额必须为非负数');
    }

    // 校验关联成交单(若提供)
    const relatedDealId = body.related_deal_id ?? null;
    if (relatedDealId) {
      const brief = getDealBrief(relatedDealId);
      if (!brief) return fail(res, 400, '指定的关联成交单不存在');
    }

    const caseNo = generateCaseNo();
    const result = db
      .prepare(
        `INSERT INTO arbitration_cases
          (case_no, type, related_deal_id, complainant, respondent, amount, description, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        caseNo,
        type,
        relatedDealId,
        complainant,
        respondent,
        amount,
        body.description ?? null,
        CASE_STATUS.PENDING
      );

    return ok(res, { id: result.lastInsertRowid, case_no: caseNo }, '案件登记成功');
  }
);

// PUT /api/arbitration/cases/:id - 编辑案件(仅待受理状态可全字段编辑)
arbitrationRouter.put(
  '/cases/:id',
  requirePermission('arbitration:view'),
  auditMiddleware('arbitration', 'update_case'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的案件 ID');

    const target = db
      .prepare(
        'SELECT id, type, related_deal_id, complainant, respondent, amount, description, status FROM arbitration_cases WHERE id = ?'
      )
      .get(id) as
      | {
          id: number;
          type: string;
          related_deal_id: number | null;
          complainant: string;
          respondent: string;
          amount: number;
          description: string | null;
          status: string;
        }
      | undefined;
    if (!target) return fail(res, 404, '仲裁案件不存在');

    if (target.status !== CASE_STATUS.PENDING) {
      return fail(res, 400, `当前状态【${CASE_STATUS_LABEL[target.status]}】不可编辑案件信息`);
    }

    const body = req.body as {
      type?: string;
      related_deal_id?: number | null;
      complainant?: string;
      respondent?: string;
      amount?: number;
      description?: string;
    };

    const complainant =
      body.complainant !== undefined ? String(body.complainant).trim() : target.complainant;
    if (!complainant) return fail(res, 400, '申诉人不能为空');
    const respondent =
      body.respondent !== undefined ? String(body.respondent).trim() : target.respondent;
    if (!respondent) return fail(res, 400, '被诉人不能为空');

    let type = body.type !== undefined ? String(body.type).trim() : target.type;
    const validTypes: string[] = [CASE_TYPE.AUCTION, CASE_TYPE.TRADE, CASE_TYPE.OTHER];
    if (!validTypes.includes(type)) type = target.type;

    const amount =
      body.amount !== undefined ? Number(body.amount) : target.amount;
    if (!Number.isFinite(amount) || amount < 0) {
      return fail(res, 400, '争议金额必须为非负数');
    }

    const relatedDealId =
      body.related_deal_id !== undefined ? body.related_deal_id : target.related_deal_id;
    if (relatedDealId) {
      const brief = getDealBrief(relatedDealId);
      if (!brief) return fail(res, 400, '指定的关联成交单不存在');
    }

    const description =
      body.description !== undefined ? body.description : target.description;

    db.prepare(
      `UPDATE arbitration_cases
       SET type = ?, related_deal_id = ?, complainant = ?, respondent = ?, amount = ?, description = ?, updated_at = ?
       WHERE id = ?`
    ).run(type, relatedDealId, complainant, respondent, amount, description, Date.now(), id);

    return ok(res, null, '更新成功');
  }
);

// POST /api/arbitration/cases/:id/accept - 受理立案(待受理 → 已立案)
arbitrationRouter.post(
  '/cases/:id/accept',
  requirePermission('arbitration:judge'),
  auditMiddleware('arbitration', 'accept_case'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的案件 ID');

    const target = db.prepare('SELECT id, status FROM arbitration_cases WHERE id = ?').get(id) as
      | { id: number; status: string }
      | undefined;
    if (!target) return fail(res, 404, '仲裁案件不存在');

    if (target.status !== CASE_STATUS.PENDING) {
      return fail(res, 400, `当前状态【${CASE_STATUS_LABEL[target.status]}】不可受理`);
    }

    db.prepare(
      'UPDATE arbitration_cases SET status = ?, acceptor_id = ?, accepted_at = ?, updated_at = ? WHERE id = ?'
    ).run(CASE_STATUS.ACCEPTED, req.adminUser?.id ?? null, Date.now(), Date.now(), id);

    return ok(res, null, '案件已受理立案');
  }
);

// POST /api/arbitration/cases/:id/start-hearing - 开始审理(已立案 → 审理中)
arbitrationRouter.post(
  '/cases/:id/start-hearing',
  requirePermission('arbitration:judge'),
  auditMiddleware('arbitration', 'start_hearing'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的案件 ID');

    const target = db.prepare('SELECT id, status FROM arbitration_cases WHERE id = ?').get(id) as
      | { id: number; status: string }
      | undefined;
    if (!target) return fail(res, 404, '仲裁案件不存在');

    if (target.status !== CASE_STATUS.ACCEPTED) {
      return fail(res, 400, `当前状态【${CASE_STATUS_LABEL[target.status]}】不可开始审理`);
    }

    db.prepare('UPDATE arbitration_cases SET status = ?, updated_at = ? WHERE id = ?').run(
      CASE_STATUS.HEARING,
      Date.now(),
      id
    );

    return ok(res, null, '案件已进入审理');
  }
);

// POST /api/arbitration/cases/:id/archive - 归档(已裁决 → 已归档)
arbitrationRouter.post(
  '/cases/:id/archive',
  requirePermission('arbitration:judge'),
  auditMiddleware('arbitration', 'archive_case'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的案件 ID');

    const target = db.prepare('SELECT id, status FROM arbitration_cases WHERE id = ?').get(id) as
      | { id: number; status: string }
      | undefined;
    if (!target) return fail(res, 404, '仲裁案件不存在');

    if (target.status !== CASE_STATUS.RULED) {
      return fail(res, 400, `当前状态【${CASE_STATUS_LABEL[target.status]}】不可归档`);
    }

    db.prepare('UPDATE arbitration_cases SET status = ?, updated_at = ? WHERE id = ?').run(
      CASE_STATUS.ARCHIVED,
      Date.now(),
      id
    );

    return ok(res, null, '案件已归档');
  }
);

// DELETE /api/arbitration/cases/:id - 删除案件(仅待受理可删除)
arbitrationRouter.delete(
  '/cases/:id',
  requirePermission('arbitration:judge'),
  auditMiddleware('arbitration', 'delete_case'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的案件 ID');

    const target = db.prepare('SELECT id, status FROM arbitration_cases WHERE id = ?').get(id) as
      | { id: number; status: string }
      | undefined;
    if (!target) return fail(res, 404, '仲裁案件不存在');

    if (target.status !== CASE_STATUS.PENDING) {
      return fail(res, 400, `当前状态【${CASE_STATUS_LABEL[target.status]}】不可删除`);
    }

    db.prepare('DELETE FROM arbitration_cases WHERE id = ?').run(id);
    return ok(res, null, '删除成功');
  }
);

// ==================== 证据材料管理 ====================

// GET /api/arbitration/cases/:id/evidence - 证据列表(按案件)
arbitrationRouter.get(
  '/cases/:id/evidence',
  requirePermission('arbitration:view'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的案件 ID');

    const target = db.prepare('SELECT id FROM arbitration_cases WHERE id = ?').get(id);
    if (!target) return fail(res, 404, '仲裁案件不存在');

    const rows = db
      .prepare(
        `SELECT id, case_id, party, title, file_url, file_type, description, created_at
         FROM arbitration_evidence WHERE case_id = ? ORDER BY created_at ASC`
      )
      .all(id) as ArbitrationEvidenceRow[];

    const list = rows.map((e) => ({
      ...e,
      party_label: PARTY_LABEL[e.party] ?? e.party,
      file_type_label: FILE_TYPE_LABEL[e.file_type] ?? e.file_type,
    }));

    return ok(res, list);
  }
);

// POST /api/arbitration/cases/:id/evidence - 新增证据
arbitrationRouter.post(
  '/cases/:id/evidence',
  requirePermission('arbitration:view'),
  auditMiddleware('arbitration', 'create_evidence'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的案件 ID');

    const target = db.prepare('SELECT id, status FROM arbitration_cases WHERE id = ?').get(id) as
      | { id: number; status: string }
      | undefined;
    if (!target) return fail(res, 404, '仲裁案件不存在');

    // 已归档案件不可再新增证据
    if (target.status === CASE_STATUS.ARCHIVED) {
      return fail(res, 400, '案件已归档,不可新增证据');
    }

    const body = req.body as {
      party?: string;
      title?: string;
      file_url?: string;
      file_type?: string;
      description?: string;
    };

    const title = String(body.title ?? '').trim();
    if (!title) return fail(res, 400, '证据名称不能为空');
    const fileUrl = String(body.file_url ?? '').trim();
    if (!fileUrl) return fail(res, 400, '文件 URL 不能为空');

    let party = String(body.party ?? 'complainant').trim();
    const validParties = ['complainant', 'respondent'];
    if (!validParties.includes(party)) party = 'complainant';

    let fileType = String(body.file_type ?? 'document').trim();
    const validFileTypes: string[] = [
      EVIDENCE_FILE_TYPE.IMAGE,
      EVIDENCE_FILE_TYPE.DOCUMENT,
      EVIDENCE_FILE_TYPE.VIDEO,
    ];
    if (!validFileTypes.includes(fileType)) fileType = EVIDENCE_FILE_TYPE.DOCUMENT;

    const result = db
      .prepare(
        `INSERT INTO arbitration_evidence (case_id, party, title, file_url, file_type, description)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(id, party, title, fileUrl, fileType, body.description ?? null);

    return ok(res, { id: result.lastInsertRowid }, '证据已新增');
  }
);

// DELETE /api/arbitration/evidence/:id - 删除证据
arbitrationRouter.delete(
  '/evidence/:id',
  requirePermission('arbitration:judge'),
  auditMiddleware('arbitration', 'delete_evidence'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的证据 ID');

    const target = db.prepare('SELECT id FROM arbitration_evidence WHERE id = ?').get(id);
    if (!target) return fail(res, 404, '证据不存在');

    db.prepare('DELETE FROM arbitration_evidence WHERE id = ?').run(id);
    return ok(res, null, '删除成功');
  }
);

// ==================== 仲裁裁决与执行 ====================

// GET /api/arbitration/cases/:id/award - 查询裁决详情
arbitrationRouter.get(
  '/cases/:id/award',
  requirePermission('arbitration:view'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的案件 ID');

    const target = db.prepare('SELECT id FROM arbitration_cases WHERE id = ?').get(id);
    if (!target) return fail(res, 404, '仲裁案件不存在');

    const award = db
      .prepare(
        `SELECT id, case_id, arbitrator_id, ruling, action, execute_status, award_time, created_at
         FROM arbitration_awards WHERE case_id = ? ORDER BY id DESC LIMIT 1`
      )
      .get(id) as ArbitrationAwardRow | undefined;
    if (!award) return fail(res, 404, '该案件尚未作出裁决');

    return ok(res, {
      ...award,
      action_label: AWARD_ACTION_LABEL[award.action] ?? award.action,
      execute_status_label:
        AWARD_EXECUTE_STATUS_LABEL[award.execute_status] ?? award.execute_status,
    });
  }
);

// POST /api/arbitration/cases/:id/award - 作出裁决(创建 award,更新 case 状态为已裁决)
// 仅已立案/审理中案件可作出裁决
arbitrationRouter.post(
  '/cases/:id/award',
  requirePermission('arbitration:judge'),
  auditMiddleware('arbitration', 'create_award'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的案件 ID');

    const target = db.prepare('SELECT id, status FROM arbitration_cases WHERE id = ?').get(id) as
      | { id: number; status: string }
      | undefined;
    if (!target) return fail(res, 404, '仲裁案件不存在');

    const awardableStatus: string[] = [CASE_STATUS.ACCEPTED, CASE_STATUS.HEARING];
    if (!awardableStatus.includes(target.status)) {
      return fail(res, 400, `当前状态【${CASE_STATUS_LABEL[target.status]}】不可作出裁决`);
    }

    // 校验是否已有裁决(每案件仅一条裁决)
    const existingAward = db
      .prepare('SELECT id FROM arbitration_awards WHERE case_id = ?')
      .get(id) as { id: number } | undefined;
    if (existingAward) {
      return fail(res, 400, '该案件已作出裁决,不可重复作出');
    }

    const body = req.body as {
      ruling?: string;
      action?: string;
    };

    const ruling = String(body.ruling ?? '').trim();
    if (!ruling) return fail(res, 400, '裁决结果不能为空');

    let action = String(body.action ?? AWARD_ACTION.OTHER).trim();
    const validActions: string[] = [
      AWARD_ACTION.REFUND,
      AWARD_ACTION.FORCE_DELIVER,
      AWARD_ACTION.OTHER,
    ];
    if (!validActions.includes(action)) action = AWARD_ACTION.OTHER;

    const now = Date.now();
    const tx = db.transaction(() => {
      db.prepare(
        `INSERT INTO arbitration_awards
          (case_id, arbitrator_id, ruling, action, execute_status, award_time)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(id, req.adminUser?.id ?? null, ruling, action, AWARD_EXECUTE_STATUS.PENDING, now);
      db.prepare('UPDATE arbitration_cases SET status = ?, updated_at = ? WHERE id = ?').run(
        CASE_STATUS.RULED,
        now,
        id
      );
    });
    tx();

    return ok(res, null, '裁决已作出');
  }
);

// POST /api/arbitration/awards/:id/execute - 执行裁决(更新 execute_status)
// pending → executing → executed
arbitrationRouter.post(
  '/awards/:id/execute',
  requirePermission('arbitration:judge'),
  auditMiddleware('arbitration', 'execute_award'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的裁决 ID');

    const target = db
      .prepare('SELECT id, case_id, execute_status FROM arbitration_awards WHERE id = ?')
      .get(id) as { id: number; case_id: number; execute_status: string } | undefined;
    if (!target) return fail(res, 404, '裁决不存在');

    let nextStatus: string | null = null;
    if (target.execute_status === AWARD_EXECUTE_STATUS.PENDING) {
      nextStatus = AWARD_EXECUTE_STATUS.EXECUTING;
    } else if (target.execute_status === AWARD_EXECUTE_STATUS.EXECUTING) {
      nextStatus = AWARD_EXECUTE_STATUS.EXECUTED;
    } else {
      return fail(
        res,
        400,
        `当前执行状态【${AWARD_EXECUTE_STATUS_LABEL[target.execute_status]}】不可推进`
      );
    }

    db.prepare('UPDATE arbitration_awards SET execute_status = ? WHERE id = ?').run(
      nextStatus,
      id
    );

    // 若裁决已执行完毕,且案件仍为已裁决状态,提示可归档(不自动归档)
    const msg =
      nextStatus === AWARD_EXECUTE_STATUS.EXECUTING
        ? '裁决已进入执行'
        : '裁决已执行完毕';
    return ok(res, null, msg);
  }
);

export default arbitrationRouter;
