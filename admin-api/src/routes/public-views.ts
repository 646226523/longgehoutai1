/**
 * 公开视图路由 — 无需鉴权，供 C 端用户使用页面消费
 * 挂载于 /api/public
 */
import { Router, Response } from 'express';
import db from '../db';
import type { ApiResponse } from '../types';

const router = Router();

const ok = <T>(res: Response, data: T, message = 'success') =>
  res.json({ code: 0, message, data } as ApiResponse<T>);
const fail = (res: Response, status: number, message: string) =>
  res.status(status).json({ code: status, message, data: null } as ApiResponse);

// 统一安全查询工具: 出错返回 fallback
const SQ = (sql, fallback = []) => {
  try { return db.prepare(sql).all(); } catch { return fallback; }
};

// ==================== 首页聚合 ====================
router.get('/home/overview', (_req, res) => {
  try {
    ok(res, {
      banners:       SQ(`SELECT id, title, image_url, link_url, jump_type, jump_target, sort_order FROM banners WHERE status = 1 AND is_draft = 0 ORDER BY sort_order ASC, id ASC LIMIT 10`),
      announcements: SQ(`SELECT id, title, published_at FROM notices WHERE status = 'published' ORDER BY published_at DESC LIMIT 5`),
      hotGenes:      SQ(`SELECT id, ring_number, name, owner_name, photo_url FROM gene_profiles WHERE status = 1 ORDER BY id DESC LIMIT 8`),
      recentComp:    SQ(`SELECT id, name, type, status, start_time, end_time FROM competitions WHERE status != 'draft' ORDER BY start_time DESC LIMIT 6`),
      latestAuctions: SQ(`SELECT id, name, status, start_time, end_time, location FROM auction_sessions WHERE status != 'draft' ORDER BY start_time DESC LIMIT 6`),
      publicLofts:   SQ(`SELECT id, name, location, status FROM lofts WHERE status = 1 ORDER BY id DESC LIMIT 6`),
      siteStats: {
        geneCount:       (SQ(`SELECT COUNT(*) AS c FROM gene_profiles WHERE status = 1`, [{c:0}])[0] as any).c,
        competitionCount:(SQ(`SELECT COUNT(*) AS c FROM competitions WHERE status != 'draft'`, [{c:0}])[0] as any).c,
        loftCount:       (SQ(`SELECT COUNT(*) AS c FROM lofts WHERE status = 1`, [{c:0}])[0] as any).c,
        auctionCount:    (SQ(`SELECT COUNT(*) AS c FROM auction_sessions WHERE status != 'draft'`, [{c:0}])[0] as any).c,
      },
    });
  } catch (err: any) { fail(res, 500, `首页错误: ${err.message}`); }
});

// ==================== 基因库 ====================
router.get('/gene/list', (req, res) => {
  try {
    const keyword = (req.query.keyword as string || '').trim();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const size = Math.min(100, Math.max(1, parseInt(req.query.size as string) || 20));
    const offset = (page - 1) * size;

    let where = `WHERE gp.status = 1`;
    const params: any[] = [];
    if (keyword) {
      where += ` AND (gp.ring_number LIKE ? OR gp.name LIKE ? OR gp.owner_name LIKE ?)`;
      const like = `%${keyword}%`;
      params.push(like, like, like);
    }
    const count = (db.prepare(`SELECT COUNT(*) AS c FROM gene_profiles gp ${where}`).get(...params) as any).c;
    const list = db.prepare(
      `SELECT gp.id, gp.ring_number, gp.name, gp.gender, gp.breed, gp.bloodline,
              gp.owner_name, gp.color, gp.eye_color, gp.photo_url, gp.qr_code,
              gp.birth_date, gp.created_at
       FROM gene_profiles gp ${where}
       ORDER BY gp.created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, size, offset);
    ok(res, { list, total: count, page, size });
  } catch (err: any) { fail(res, 500, `基因列表错误: ${err.message}`); }
});

router.get('/gene/:id', (req, res) => {
  try {
    const profile = db.prepare(`SELECT * FROM gene_profiles WHERE id = ? AND status = 1`).get(parseInt(req.params.id));
    if (!profile) return fail(res, 404, '基因档案不存在');
    ok(res, { profile, tests: SQ(`SELECT * FROM gene_tests WHERE gene_profile_id = ? ORDER BY test_date DESC`, [parseInt(req.params.id)]) });
  } catch (err: any) { fail(res, 500, `基因详情错误: ${err.message}`); }
});

// ==================== 赛事 ====================
router.get('/competition/list', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const size = Math.min(100, Math.max(1, parseInt(req.query.size as string) || 20));
    const offset = (page - 1) * size;
    const count = (db.prepare(`SELECT COUNT(*) AS c FROM competitions WHERE status != 'draft'`).get() as any).c;
    const list = db.prepare(
      `SELECT id, name, type, status, start_time, end_time, location, organizer
       FROM competitions WHERE status != 'draft' ORDER BY start_time DESC LIMIT ? OFFSET ?`
    ).all(size, offset);
    ok(res, { list, total: count, page, size });
  } catch (err: any) { fail(res, 500, `赛事列表错误: ${err.message}`); }
});

router.get('/competition/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const detail = db.prepare(`SELECT * FROM competitions WHERE id = ? AND status != 'draft'`).get(id);
    if (!detail) return fail(res, 404, '赛事不存在');
    const results = SQ(
      `SELECT cr.rank, cr.arrival_time, cr.speed, cr.distance, cp.ring_number, cp.owner_name
       FROM competition_results cr JOIN competition_participants cp ON cr.participant_id = cp.id
       WHERE cr.competition_id = ? ORDER BY cr.rank ASC LIMIT 100`, [id]
    );
    ok(res, { detail, results });
  } catch (err: any) { fail(res, 500, `赛事详情错误: ${err.message}`); }
});

// ==================== 公棚 ====================
router.get('/loft/list', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const size = Math.min(100, Math.max(1, parseInt(req.query.size as string) || 20));
    const offset = (page - 1) * size;
    const count = (db.prepare(`SELECT COUNT(*) AS c FROM lofts WHERE status = 1`).get() as any).c;
    const list = db.prepare(
      `SELECT id, name, location, capacity, description, status FROM lofts
       WHERE status = 1 ORDER BY id DESC LIMIT ? OFFSET ?`
    ).all(size, offset);
    ok(res, { list, total: count, page, size });
  } catch (err: any) { fail(res, 500, `公棚列表错误: ${err.message}`); }
});

router.get('/loft/:id', (req, res) => {
  try {
    const detail = db.prepare(`SELECT * FROM lofts WHERE id = ? AND status = 1`).get(parseInt(req.params.id));
    if (!detail) return fail(res, 404, '公棚不存在');
    ok(res, detail);
  } catch (err: any) { fail(res, 500, `公棚详情错误: ${err.message}`); }
});

// ==================== 拍卖 ====================
router.get('/auction/list', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const size = Math.min(100, Math.max(1, parseInt(req.query.size as string) || 20));
    const offset = (page - 1) * size;
    const count = (db.prepare(`SELECT COUNT(*) AS c FROM auction_sessions WHERE status != 'draft'`).get() as any).c;
    const list = db.prepare(
      `SELECT id, name, status, start_time, end_time, location, description
       FROM auction_sessions WHERE status != 'draft' ORDER BY start_time DESC LIMIT ? OFFSET ?`
    ).all(size, offset);
    ok(res, { list, total: count, page, size });
  } catch (err: any) { fail(res, 500, `拍卖列表错误: ${err.message}`); }
});

router.get('/auction/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const detail = db.prepare(`SELECT * FROM auction_sessions WHERE id = ? AND status != 'draft'`).get(id);
    if (!detail) return fail(res, 404, '拍卖不存在');
    ok(res, { detail, items: SQ(`SELECT * FROM auction_items WHERE session_id = ? ORDER BY sort_order ASC`, [id]) });
  } catch (err: any) { fail(res, 500, `拍卖详情错误: ${err.message}`); }
});

// ==================== 资讯 ====================
router.get('/news/list', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const size = Math.min(100, Math.max(1, parseInt(req.query.size as string) || 20));
    const offset = (page - 1) * size;
    const count = (db.prepare(`SELECT COUNT(*) AS c FROM news WHERE status = 'published'`).get() as any).c;
    const list = db.prepare(
      `SELECT id, title, category, cover_url, summary, author, published_at, is_top
       FROM news WHERE status = 'published'
       ORDER BY is_top DESC, published_at DESC LIMIT ? OFFSET ?`
    ).all(size, offset);
    ok(res, { list, total: count, page, size });
  } catch (err: any) { fail(res, 500, `资讯列表错误: ${err.message}`); }
});

router.get('/news/:id', (req, res) => {
  try {
    const detail = db.prepare(`SELECT * FROM news WHERE id = ? AND status = 'published'`).get(parseInt(req.params.id));
    if (!detail) return fail(res, 404, '资讯不存在');
    ok(res, detail);
  } catch (err: any) { fail(res, 500, `资讯详情错误: ${err.message}`); }
});

// ==================== 公告 ====================
router.get('/notice/list', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const size = Math.min(100, Math.max(1, parseInt(req.query.size as string) || 20));
    const offset = (page - 1) * size;
    const count = (db.prepare(`SELECT COUNT(*) AS c FROM notices WHERE status = 'published'`).get() as any).c;
    const list = db.prepare(
      `SELECT id, title, type, published_at FROM notices WHERE status = 'published'
       ORDER BY published_at DESC LIMIT ? OFFSET ?`
    ).all(size, offset);
    ok(res, { list, total: count, page, size });
  } catch (err: any) { fail(res, 500, `公告列表错误: ${err.message}`); }
});

export default router;
