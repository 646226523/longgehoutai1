import { Router, Response } from 'express';
import db from '../db';
import { authenticate, requirePermission } from '../middlewares/auth';
import { auditMiddleware } from '../middlewares/audit';
import type { AuthedRequest, ApiResponse } from '../types';
import {
  COMPETITION_STATUS,
  VERIFY_STATUS,
  RESULT_STATUS,
  STATUS_FLOW,
  STATUS_LABELS,
} from '../modules/competition/db';

const router = Router();

// ==================== 辅助函数 ====================

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

// 赛事行结构
interface CompetitionRow {
  id: number;
  name: string;
  type: string | null;
  status: string;
  start_time: number | null;
  end_time: number | null;
  location: string | null;
  distance: number | null;
  description: string | null;
  organizer: string | null;
  created_at: number;
  updated_at: number;
}

// 参赛鸽行结构
interface ParticipantRow {
  id: number;
  competition_id: number;
  ring_number: string;
  gene_profile_id: number | null;
  owner_name: string | null;
  verify_status: string;
  verify_reason: string | null;
  verified_at: number | null;
  created_at: number;
}

// 成绩行结构(关联参赛鸽足环号)
interface ResultRow {
  id: number;
  competition_id: number;
  participant_id: number;
  rank: number | null;
  arrival_time: number | null;
  speed: number | null;
  distance: number | null;
  status: string;
  created_at: number;
  ring_number: string | null;
  owner_name: string | null;
}

// 校验赛事是否存在
function getCompetitionById(id: number): CompetitionRow | undefined {
  return db.prepare('SELECT * FROM competitions WHERE id = ?').get(id) as CompetitionRow | undefined;
}

// 检查 gene_profiles 表是否存在(由基因模块创建)
function geneProfilesTableExists(): boolean {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='gene_profiles'")
    .get() as { name: string } | undefined;
  return !!row;
}

// 根据足环号查询基因档案(运行时查询 gene_profiles 表,不引入编译时依赖)
function getGeneProfileByRing(ringNumber: string): { id: number } | undefined {
  if (!geneProfilesTableExists()) {
    return undefined;
  }
  return db.prepare('SELECT id FROM gene_profiles WHERE ring_number = ? LIMIT 1').get(ringNumber) as
    | { id: number }
    | undefined;
}

// 校验状态流转合法性
function validateTransition(from: string, to: string): { ok: boolean; message?: string } {
  const next = STATUS_FLOW[from];
  if (!next) {
    return { ok: false, message: `当前状态「${STATUS_LABELS[from] || from}」无法继续流转` };
  }
  if (next !== to) {
    return {
      ok: false,
      message: `状态只能从「${STATUS_LABELS[from] || from}」流转到「${STATUS_LABELS[next] || next}」,不能直接流转到「${STATUS_LABELS[to] || to}」`,
    };
  }
  return { ok: true };
}

// 校验进入比赛状态时所有参赛鸽已核验
function checkAllVerified(competitionId: number): { ok: boolean; message?: string } {
  const total = (
    db
      .prepare('SELECT COUNT(*) AS c FROM competition_participants WHERE competition_id = ?')
      .get(competitionId) as { c: number }
  ).c;
  if (total === 0) {
    return { ok: false, message: '该赛事暂无参赛鸽,无法进入比赛' };
  }
  const pending = (
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM competition_participants WHERE competition_id = ? AND verify_status = ?`
      )
      .get(competitionId, VERIFY_STATUS.PENDING) as { c: number }
  ).c;
  if (pending > 0) {
    return { ok: false, message: `还有 ${pending} 只参赛鸽未核验,无法进入比赛` };
  }
  return { ok: true };
}

// 所有接口均需登录鉴权
router.use(authenticate);

// ==================== SubTask 5.1: 赛事创建与发布 ====================

// GET /api/competition - 分页列表(支持名称/状态/时间筛选)
// 查询参数:page、pageSize、name、status、startTime、endTime、list=all(不分页返回全部,供下拉)
router.get('/', requirePermission('competition:view'), (req: AuthedRequest, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const pageSize = Math.max(1, parseInt(String(req.query.pageSize ?? '10'), 10) || 10);
  const name = String(req.query.name ?? '').trim();
  const status = String(req.query.status ?? '').trim();
  const type = String(req.query.type ?? '').trim();
  const startTime = req.query.startTime ? Number(req.query.startTime) : null;
  const endTime = req.query.endTime ? Number(req.query.endTime) : null;
  const listAll = req.query.list === 'all';

  const where: string[] = [];
  const params: Array<string | number> = [];
  if (name) {
    where.push('name LIKE ?');
    params.push(`%${name}%`);
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  if (type) {
    where.push('type = ?');
    params.push(type);
  }
  if (startTime !== null && !Number.isNaN(startTime)) {
    where.push('start_time >= ?');
    params.push(startTime);
  }
  if (endTime !== null && !Number.isNaN(endTime)) {
    where.push('end_time <= ?');
    params.push(endTime);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  // list=all:返回全部(供下拉选择)
  if (listAll) {
    const rows = db
      .prepare(
        `SELECT id, name, type, status, start_time, end_time, location, distance, organizer
         FROM competitions ${whereSql}
         ORDER BY created_at DESC`
      )
      .all(...params) as CompetitionRow[];
    return ok(res, { list: rows, total: rows.length });
  }

  const total = (
    db.prepare(`SELECT COUNT(*) AS c FROM competitions ${whereSql}`).get(...params) as { c: number }
  ).c;

  const list = db
    .prepare(
      `SELECT * FROM competitions ${whereSql}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, (page - 1) * pageSize) as CompetitionRow[];

  return ok(res, { list, total });
});

// GET /api/competition/:id - 赛事详情
router.get('/:id', requirePermission('competition:view'), (req: AuthedRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) {
    return fail(res, 400, '无效的赛事 ID');
  }
  const comp = getCompetitionById(id);
  if (!comp) {
    return fail(res, 404, '赛事不存在');
  }
  // 附带统计信息
  const participantTotal = (
    db
      .prepare('SELECT COUNT(*) AS c FROM competition_participants WHERE competition_id = ?')
      .get(id) as { c: number }
  ).c;
  const verifiedCount = (
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM competition_participants WHERE competition_id = ? AND verify_status = ?`
      )
      .get(id, VERIFY_STATUS.PASSED) as { c: number }
  ).c;
  const resultCount = (
    db
      .prepare('SELECT COUNT(*) AS c FROM competition_results WHERE competition_id = ?')
      .get(id) as { c: number }
  ).c;
  return ok(res, { ...comp, participant_total: participantTotal, verified_count: verifiedCount, result_count: resultCount });
});

// POST /api/competition - 新增赛事
router.post(
  '/',
  requirePermission('competition:edit'),
  auditMiddleware('competition', 'create'),
  (req: AuthedRequest, res: Response) => {
    const { name, type, status, start_time, end_time, location, distance, description, organizer } =
      req.body as {
        name?: string;
        type?: string;
        status?: string;
        start_time?: number;
        end_time?: number;
        location?: string;
        distance?: number;
        description?: string;
        organizer?: string;
      };

    if (!name || !name.trim()) {
      return fail(res, 400, '赛事名称不能为空');
    }

    const finalStatus = status || COMPETITION_STATUS.DRAFT;
    const result = db
      .prepare(
        `INSERT INTO competitions
         (name, type, status, start_time, end_time, location, distance, description, organizer)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        name.trim(),
        type ?? null,
        finalStatus,
        start_time ?? null,
        end_time ?? null,
        location ?? null,
        distance ?? null,
        description ?? null,
        organizer ?? null
      );
    return ok(res, { id: result.lastInsertRowid as number }, '新增成功');
  }
);

// PUT /api/competition/:id - 编辑赛事
router.put(
  '/:id',
  requirePermission('competition:edit'),
  auditMiddleware('competition', 'update'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的赛事 ID');
    }
    const comp = getCompetitionById(id);
    if (!comp) {
      return fail(res, 404, '赛事不存在');
    }
    // 已归档赛事不允许编辑
    if (comp.status === COMPETITION_STATUS.ARCHIVED) {
      return fail(res, 400, '已归档赛事不允许编辑');
    }
    const { name, type, start_time, end_time, location, distance, description, organizer } =
      req.body as {
        name?: string;
        type?: string;
        start_time?: number;
        end_time?: number;
        location?: string;
        distance?: number;
        description?: string;
        organizer?: string;
      };

    db.prepare(
      `UPDATE competitions
       SET name = ?, type = ?, start_time = ?, end_time = ?, location = ?, distance = ?, description = ?, organizer = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      name?.trim() ?? comp.name,
      type ?? comp.type,
      start_time ?? comp.start_time,
      end_time ?? comp.end_time,
      location ?? comp.location,
      distance ?? comp.distance,
      description ?? comp.description,
      organizer ?? comp.organizer,
      Date.now(),
      id
    );
    return ok(res, null, '更新成功');
  }
);

// POST /api/competition/:id/publish - 发布(草稿 → 报名中)
router.post(
  '/:id/publish',
  requirePermission('competition:edit'),
  auditMiddleware('competition', 'publish'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的赛事 ID');
    }
    const comp = getCompetitionById(id);
    if (!comp) {
      return fail(res, 404, '赛事不存在');
    }
    if (comp.status !== COMPETITION_STATUS.DRAFT) {
      return fail(res, 400, `仅草稿状态可发布,当前状态为「${STATUS_LABELS[comp.status] || comp.status}」`);
    }
    db.prepare('UPDATE competitions SET status = ?, updated_at = ? WHERE id = ?').run(
      COMPETITION_STATUS.ENROLLING,
      Date.now(),
      id
    );
    return ok(res, null, '赛事已发布,进入报名中');
  }
);

// PATCH /api/competition/:id/status - 状态流转
// 请求体:{ status: 'gathering' | 'racing' | 'finished' | 'archived' }
router.patch(
  '/:id/status',
  requirePermission('competition:edit'),
  auditMiddleware('competition', 'transition_status'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的赛事 ID');
    }
    const comp = getCompetitionById(id);
    if (!comp) {
      return fail(res, 404, '赛事不存在');
    }
    const { status } = req.body as { status?: string };
    if (!status) {
      return fail(res, 400, '目标状态不能为空');
    }

    // 校验流转合法性
    const transition = validateTransition(comp.status, status);
    if (!transition.ok) {
      return fail(res, 400, transition.message || '状态流转不合法');
    }

    // 进入比赛状态需所有参赛鸽核验完
    if (status === COMPETITION_STATUS.RACING) {
      const check = checkAllVerified(id);
      if (!check.ok) {
        return fail(res, 400, check.message || '核验未完成');
      }
    }

    db.prepare('UPDATE competitions SET status = ?, updated_at = ? WHERE id = ?').run(
      status,
      Date.now(),
      id
    );
    return ok(res, null, `状态已切换为「${STATUS_LABELS[status] || status}」`);
  }
);

// DELETE /api/competition/:id - 删除赛事(仅草稿/已归档可删)
router.delete(
  '/:id',
  requirePermission('competition:edit'),
  auditMiddleware('competition', 'delete'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的赛事 ID');
    }
    const comp = getCompetitionById(id);
    if (!comp) {
      return fail(res, 404, '赛事不存在');
    }
    // 仅草稿/已归档可删除,避免误删进行中的赛事
    if (
      comp.status !== COMPETITION_STATUS.DRAFT &&
      comp.status !== COMPETITION_STATUS.ARCHIVED
    ) {
      return fail(res, 400, `仅草稿或已归档赛事可删除,当前状态为「${STATUS_LABELS[comp.status] || comp.status}」`);
    }
    // 级联删除参赛鸽与成绩(外键已配置 ON DELETE CASCADE)
    db.prepare('DELETE FROM competitions WHERE id = ?').run(id);
    return ok(res, null, '删除成功');
  }
);

// ==================== SubTask 5.2: 赛事核验 ====================

// GET /api/competition/:id/participants - 参赛鸽分页列表
// 查询参数:page、pageSize、ringNumber、verifyStatus
router.get(
  '/:id/participants',
  requirePermission('competition:verify'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的赛事 ID');
    }
    if (!getCompetitionById(id)) {
      return fail(res, 404, '赛事不存在');
    }
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.max(1, parseInt(String(req.query.pageSize ?? '10'), 10) || 10);
    const ringNumber = String(req.query.ringNumber ?? '').trim();
    const verifyStatus = String(req.query.verifyStatus ?? '').trim();

    const where: string[] = ['competition_id = ?'];
    const params: Array<string | number> = [id];
    if (ringNumber) {
      where.push('ring_number LIKE ?');
      params.push(`%${ringNumber}%`);
    }
    if (verifyStatus) {
      where.push('verify_status = ?');
      params.push(verifyStatus);
    }
    const whereSql = `WHERE ${where.join(' AND ')}`;

    const total = (
      db.prepare(`SELECT COUNT(*) AS c FROM competition_participants ${whereSql}`).get(...params) as {
        c: number;
      }
    ).c;

    const list = db
      .prepare(
        `SELECT * FROM competition_participants ${whereSql}
         ORDER BY created_at ASC
         LIMIT ? OFFSET ?`
      )
      .all(...params, pageSize, (page - 1) * pageSize) as ParticipantRow[];

    return ok(res, { list, total });
  }
);

// POST /api/competition/:id/participants/import - 批量导入参赛鸽(足环号列表)
// 请求体:{ ring_numbers: string[], owner_name?: string }
router.post(
  '/:id/participants/import',
  requirePermission('competition:verify'),
  auditMiddleware('competition', 'import_participants'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的赛事 ID');
    }
    if (!getCompetitionById(id)) {
      return fail(res, 404, '赛事不存在');
    }
    const { ring_numbers, owner_name } = req.body as {
      ring_numbers?: string[];
      owner_name?: string;
    };
    if (!Array.isArray(ring_numbers) || ring_numbers.length === 0) {
      return fail(res, 400, '足环号列表不能为空');
    }

    const now = Date.now();
    const insertStmt = db.prepare(
      `INSERT INTO competition_participants
       (competition_id, ring_number, gene_profile_id, owner_name, verify_status, verify_reason, verified_at, created_at)
       VALUES (?, ?, NULL, ?, 'pending', NULL, NULL, ?)`
    );
    // 同一赛事内足环号去重:已存在的跳过
    const existsStmt = db.prepare(
      'SELECT id FROM competition_participants WHERE competition_id = ? AND ring_number = ?'
    );

    let inserted = 0;
    let skipped = 0;
    const tx = db.transaction(() => {
      ring_numbers.forEach((raw) => {
        const ring = String(raw ?? '').trim();
        if (!ring) return;
        if (existsStmt.get(id, ring)) {
          skipped++;
          return;
        }
        insertStmt.run(id, ring, owner_name ?? null, now);
        inserted++;
      });
    });
    tx();

    return ok(res, { inserted, skipped }, `导入完成:新增 ${inserted} 条,跳过重复 ${skipped} 条`);
  }
);

// 核验单个参赛鸽内部函数(查询 gene_profiles 表)
function verifyOneParticipant(participantId: number): {
  ok: boolean;
  status: string;
  reason?: string;
  geneProfileId?: number;
} {
  const participant = db
    .prepare('SELECT id, ring_number FROM competition_participants WHERE id = ?')
    .get(participantId) as { id: number; ring_number: string } | undefined;
  if (!participant) {
    return { ok: false, status: VERIFY_STATUS.FAILED, reason: '参赛鸽记录不存在' };
  }
  const profile = getGeneProfileByRing(participant.ring_number);
  const now = Date.now();
  if (profile) {
    db.prepare(
      `UPDATE competition_participants
       SET verify_status = 'passed', gene_profile_id = ?, verify_reason = NULL, verified_at = ?
       WHERE id = ?`
    ).run(profile.id, now, participantId);
    return { ok: true, status: VERIFY_STATUS.PASSED, geneProfileId: profile.id };
  }
  db.prepare(
    `UPDATE competition_participants
     SET verify_status = 'failed', verify_reason = ?, verified_at = ?
     WHERE id = ?`
  ).run('基因档案中未找到该足环号', now, participantId);
  return { ok: false, status: VERIFY_STATUS.FAILED, reason: '基因档案中未找到该足环号' };
}

// POST /api/competition/:id/participants/verify/:participantId - 核验单个参赛鸽
router.post(
  '/:id/participants/verify/:participantId',
  requirePermission('competition:verify'),
  auditMiddleware('competition', 'verify_participant'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const participantId = parseInt(req.params.participantId, 10);
    if (!Number.isFinite(id) || !Number.isFinite(participantId)) {
      return fail(res, 400, '无效的 ID');
    }
    // 校验参赛鸽属于该赛事
    const participant = db
      .prepare(
        'SELECT id, ring_number, verify_status FROM competition_participants WHERE id = ? AND competition_id = ?'
      )
      .get(participantId, id) as
      | { id: number; ring_number: string; verify_status: string }
      | undefined;
    if (!participant) {
      return fail(res, 404, '参赛鸽不存在');
    }

    const result = verifyOneParticipant(participantId);
    if (result.status === VERIFY_STATUS.PASSED) {
      return ok(res, { status: 'passed', gene_profile_id: result.geneProfileId }, '核验通过:已匹配基因档案');
    }
    return ok(res, { status: 'failed', reason: result.reason }, `核验不通过:${result.reason}`);
  }
);

// POST /api/competition/:id/participants/verify - 批量核验
// 请求体:{ participant_ids?: number[] }  不传则核验该赛事所有未核验的参赛鸽
router.post(
  '/:id/participants/verify',
  requirePermission('competition:verify'),
  auditMiddleware('competition', 'verify_participants_batch'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的赛事 ID');
    }
    if (!getCompetitionById(id)) {
      return fail(res, 404, '赛事不存在');
    }

    // 确定待核验列表
    let targets: number[];
    const { participant_ids } = req.body as { participant_ids?: number[] };
    if (Array.isArray(participant_ids) && participant_ids.length > 0) {
      targets = participant_ids;
    } else {
      // 核验该赛事所有未核验的参赛鸽
      const rows = db
        .prepare(
          `SELECT id FROM competition_participants WHERE competition_id = ? AND verify_status = ?`
        )
        .all(id, VERIFY_STATUS.PENDING) as Array<{ id: number }>;
      targets = rows.map((r) => r.id);
    }

    if (targets.length === 0) {
      return ok(res, { total: 0, passed: 0, failed: 0 }, '没有需要核验的参赛鸽');
    }

    let passed = 0;
    let failed = 0;
    const tx = db.transaction(() => {
      targets.forEach((pid) => {
        const result = verifyOneParticipant(pid);
        if (result.status === VERIFY_STATUS.PASSED) {
          passed++;
        } else {
          failed++;
        }
      });
    });
    tx();

    return ok(
      res,
      { total: targets.length, passed, failed },
      `批量核验完成:通过 ${passed} 只,不通过 ${failed} 只`
    );
  }
);

// ==================== SubTask 5.3: 成绩录入与排名 ====================

// GET /api/competition/:id/results - 成绩列表
// 查询参数:page、pageSize、list=all(返回全部并按排名排序)
router.get(
  '/:id/results',
  requirePermission('competition:view'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的赛事 ID');
    }
    if (!getCompetitionById(id)) {
      return fail(res, 404, '赛事不存在');
    }
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.max(1, parseInt(String(req.query.pageSize ?? '10'), 10) || 10);
    const listAll = req.query.list === 'all';

    const joinSql = `
      SELECT r.*, p.ring_number, p.owner_name
      FROM competition_results r
      LEFT JOIN competition_participants p ON p.id = r.participant_id
      WHERE r.competition_id = ?
      ORDER BY r.rank ASC, r.speed DESC, r.created_at ASC
    `;

    if (listAll) {
      const rows = db.prepare(joinSql).all(id) as ResultRow[];
      return ok(res, { list: rows, total: rows.length });
    }

    const total = (
      db
        .prepare('SELECT COUNT(*) AS c FROM competition_results WHERE competition_id = ?')
        .get(id) as { c: number }
    ).c;

    // 分页:用子查询包装后再 LIMIT
    const list = db
      .prepare(
        `${joinSql} LIMIT ? OFFSET ?`
      )
      .all(id, pageSize, (page - 1) * pageSize) as ResultRow[];

    return ok(res, { list, total });
  }
);

// POST /api/competition/:id/results - 录入单条成绩
// 请求体:{ participant_id, arrival_time, speed, distance, status? }
router.post(
  '/:id/results',
  requirePermission('competition:edit'),
  auditMiddleware('competition', 'create_result'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的赛事 ID');
    }
    if (!getCompetitionById(id)) {
      return fail(res, 404, '赛事不存在');
    }
    const { participant_id, arrival_time, speed, distance, status } = req.body as {
      participant_id?: number;
      arrival_time?: number;
      speed?: number;
      distance?: number;
      status?: string;
    };

    if (!participant_id || !Number.isFinite(Number(participant_id))) {
      return fail(res, 400, '参赛鸽 ID 不能为空');
    }
    // 校验参赛鸽属于该赛事
    const participant = db
      .prepare('SELECT id FROM competition_participants WHERE id = ? AND competition_id = ?')
      .get(participant_id, id);
    if (!participant) {
      return fail(res, 404, '参赛鸽不存在或不属于该赛事');
    }

    // 检查是否已存在成绩记录(同一参赛鸽仅一条)
    const existing = db
      .prepare('SELECT id FROM competition_results WHERE participant_id = ?')
      .get(participant_id);
    if (existing) {
      return fail(res, 409, '该参赛鸽已存在成绩记录,请使用编辑功能');
    }

    const result = db
      .prepare(
        `INSERT INTO competition_results
         (competition_id, participant_id, rank, arrival_time, speed, distance, status)
         VALUES (?, ?, NULL, ?, ?, ?, ?)`
      )
      .run(
        id,
        participant_id,
        arrival_time ?? null,
        speed ?? null,
        distance ?? null,
        status || RESULT_STATUS.RECORDED
      );
    return ok(res, { id: result.lastInsertRowid as number }, '成绩录入成功');
  }
);

// POST /api/competition/:id/results/batch - 批量录入成绩
// 请求体:{ results: Array<{ participant_id, arrival_time, speed, distance }> }
router.post(
  '/:id/results/batch',
  requirePermission('competition:edit'),
  auditMiddleware('competition', 'create_results_batch'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的赛事 ID');
    }
    if (!getCompetitionById(id)) {
      return fail(res, 404, '赛事不存在');
    }
    const { results } = req.body as {
      results?: Array<{
        participant_id: number;
        arrival_time?: number;
        speed?: number;
        distance?: number;
      }>;
    };
    if (!Array.isArray(results) || results.length === 0) {
      return fail(res, 400, '成绩列表不能为空');
    }

    const insertStmt = db.prepare(
      `INSERT INTO competition_results
       (competition_id, participant_id, rank, arrival_time, speed, distance, status)
       VALUES (?, ?, NULL, ?, ?, ?, 'recorded')`
    );
    const existsStmt = db.prepare('SELECT id FROM competition_results WHERE participant_id = ?');
    const validParticipantStmt = db.prepare(
      'SELECT id FROM competition_participants WHERE id = ? AND competition_id = ?'
    );

    let inserted = 0;
    let skipped = 0;
    const tx = db.transaction(() => {
      results.forEach((item) => {
        if (!item || !item.participant_id) {
          skipped++;
          return;
        }
        // 跳过不属于该赛事或已存在成绩的
        if (!validParticipantStmt.get(item.participant_id, id)) {
          skipped++;
          return;
        }
        if (existsStmt.get(item.participant_id)) {
          skipped++;
          return;
        }
        insertStmt.run(
          id,
          item.participant_id,
          item.arrival_time ?? null,
          item.speed ?? null,
          item.distance ?? null
        );
        inserted++;
      });
    });
    tx();

    return ok(res, { inserted, skipped }, `批量录入完成:新增 ${inserted} 条,跳过 ${skipped} 条`);
  }
);

// POST /api/competition/:id/results/rank - 自动排名(按分速降序生成 rank)
router.post(
  '/:id/results/rank',
  requirePermission('competition:edit'),
  auditMiddleware('competition', 'auto_rank'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return fail(res, 400, '无效的赛事 ID');
    }
    if (!getCompetitionById(id)) {
      return fail(res, 404, '赛事不存在');
    }

    // 查询所有已录入成绩,按分速降序
    const rows = db
      .prepare(
        `SELECT id FROM competition_results
         WHERE competition_id = ? AND status = 'recorded'
         ORDER BY speed DESC, arrival_time ASC`
      )
      .all(id) as Array<{ id: number }>;

    if (rows.length === 0) {
      return ok(res, { ranked: 0 }, '暂无可排名的成绩');
    }

    const updateStmt = db.prepare('UPDATE competition_results SET rank = ? WHERE id = ?');
    const tx = db.transaction(() => {
      rows.forEach((r, i) => {
        updateStmt.run(i + 1, r.id);
      });
    });
    tx();

    return ok(res, { ranked: rows.length }, `排名完成,共 ${rows.length} 条成绩`);
  }
);

// DELETE /api/competition/:id/results/:resultId - 删除成绩
router.delete(
  '/:id/results/:resultId',
  requirePermission('competition:edit'),
  auditMiddleware('competition', 'delete_result'),
  (req: AuthedRequest, res: Response) => {
    const resultId = parseInt(req.params.resultId, 10);
    if (!Number.isFinite(resultId)) {
      return fail(res, 400, '无效的成绩 ID');
    }
    const row = db
      .prepare('SELECT id FROM competition_results WHERE id = ? AND competition_id = ?')
      .get(resultId, parseInt(req.params.id, 10));
    if (!row) {
      return fail(res, 404, '成绩记录不存在');
    }
    db.prepare('DELETE FROM competition_results WHERE id = ?').run(resultId);
    return ok(res, null, '删除成功');
  }
);

export default router;
