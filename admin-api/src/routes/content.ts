// 内容运营管理模块路由
// 挂载路径:/api/content
// 包含三个子模块:Banners(Banner 管理)、News(资讯管理)、Notices(公告与推送管理)
// 权限:content:view 查看列表/详情;content:edit 新增/编辑/删除/上下架/发布等写操作
import { Router, Response } from 'express';
import db from '../db';
import { authenticate, requirePermission } from '../middlewares/auth';
import { auditMiddleware } from '../middlewares/audit';
import type { AuthedRequest, ApiResponse } from '../types';

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

// 解析分页参数
function parsePaging(req: AuthedRequest): { page: number; pageSize: number } {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const pageSize = Math.max(1, parseInt(String(req.query.pageSize ?? '10'), 10) || 10);
  return { page, pageSize };
}

// 把毫秒时间戳转为可读字符串辅助(用于 start_time/end_time 在响应中保留为数字)
// 这里保留数字,前端再用 dayjs 格式化

// ====================== Banner 管理 ======================

// GET /api/content/banners - 分页列表(支持 title/status/position 筛选)
router.get('/banners', requirePermission('content:view'), (req: AuthedRequest, res: Response) => {
  const { page, pageSize } = parsePaging(req);
  const title = String(req.query.title ?? '').trim();
  const status = req.query.status;
  const position = String(req.query.position ?? '').trim();

  const where: string[] = [];
  const params: Array<string | number> = [];
  if (title) {
    where.push('title LIKE ?');
    params.push(`%${title}%`);
  }
  if (status !== undefined && status !== '') {
    where.push('status = ?');
    params.push(Number(status));
  }
  if (position) {
    where.push('position = ?');
    params.push(position);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = (db.prepare(`SELECT COUNT(*) AS c FROM banners ${whereSql}`).get(...params) as { c: number }).c;

  const rows = db
    .prepare(
      `SELECT id, title, image_url, link_url, position, sort_order, status, start_time, end_time,
              jump_type, jump_target, is_draft, impressions, clicks, created_by,
              created_at, updated_at
       FROM banners
       ${whereSql}
       ORDER BY sort_order ASC, id DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, (page - 1) * pageSize) as Array<{
      id: number;
      title: string;
      image_url: string;
      link_url: string;
      position: string;
      sort_order: number;
      status: number;
      start_time: number | null;
      end_time: number | null;
      jump_type: string;
      jump_target: string;
      is_draft: number;
      impressions: number;
      clicks: number;
      created_by: string;
      created_at: number;
      updated_at: number;
    }>;

  return ok(res, { list: rows, total });
});

// GET /api/content/banners/stats - 统计数据
router.get('/banners/stats', requirePermission('content:view'), (_req: AuthedRequest, res: Response) => {
  const total = (db.prepare('SELECT COUNT(*) AS c FROM banners').get() as { c: number }).c;
  const now = Date.now();

  const active = (db.prepare(`
    SELECT COUNT(*) AS c FROM banners
    WHERE status = 1
    AND is_draft = 0
    AND (start_time IS NULL OR start_time <= ?)
    AND (end_time IS NULL OR end_time >= ?)
  `).get(now, now) as { c: number }).c;

  const pending = (db.prepare(`
    SELECT COUNT(*) AS c FROM banners
    WHERE status = 1 AND start_time > ? AND is_draft = 0
  `).get(now) as { c: number }).c;

  const expired = (db.prepare(`
    SELECT COUNT(*) AS c FROM banners WHERE end_time < ? AND is_draft = 0
  `).get(now) as { c: number }).c;

  const drafts = (db.prepare(`SELECT COUNT(*) AS c FROM banners WHERE is_draft = 1`).get() as { c: number }).c;

  const totalImpressions = (db.prepare(`SELECT COALESCE(SUM(impressions), 0) AS s FROM banners`).get() as { s: number }).s;
  const totalClicks = (db.prepare(`SELECT COALESCE(SUM(clicks), 0) AS s FROM banners`).get() as { s: number }).s;

  // 按位置统计
  const positionStats = db.prepare(`
    SELECT position, COUNT(*) AS count
    FROM banners
    WHERE is_draft = 0
    GROUP BY position
  `).all() as { position: string; count: number }[];

  // 按位置-状态统计（已投放）
  const activeByPosition = db.prepare(`
    SELECT position, COUNT(*) AS count
    FROM banners
    WHERE status = 1
    AND is_draft = 0
    AND (start_time IS NULL OR start_time <= ?)
    AND (end_time IS NULL OR end_time >= ?)
    GROUP BY position
  `).all(now, now) as { position: string; count: number }[];

  // 构建位置统计映射
  const positionMap: Record<string, { total: number; active: number }> = {
    home_top: { total: 0, active: 0 },
    home_mid: { total: 0, active: 0 },
    home_bottom: { total: 0, active: 0 },
  };

  positionStats.forEach(item => {
    if (positionMap[item.position]) {
      positionMap[item.position].total = item.count;
    }
  });

  activeByPosition.forEach(item => {
    if (positionMap[item.position]) {
      positionMap[item.position].active = item.count;
    }
  });

  // 计算点击率
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';

  return ok(res, {
    total,
    active,
    pending,
    expired,
    drafts,
    total_impressions: totalImpressions,
    total_clicks: totalClicks,
    ctr: parseFloat(ctr),
    positions: positionMap,
  });
});

// GET /api/content/banners/:id - 详情
router.get('/banners/:id', requirePermission('content:view'), (req: AuthedRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return fail(res, 400, '无效的 ID');
  const row = db.prepare('SELECT * FROM banners WHERE id = ?').get(id);
  if (!row) return fail(res, 404, 'Banner 不存在');
  return ok(res, row);
});

// POST /api/content/banners - 新增
router.post(
  '/banners',
  requirePermission('content:edit'),
  auditMiddleware('content_banner', 'create'),
  (req: AuthedRequest, res: Response) => {
    const body = req.body as {
      title?: string;
      image_url?: string;
      link_url?: string;
      position?: string;
      sort_order?: number;
      status?: number;
      start_time?: number | null;
      end_time?: number | null;
      jump_type?: string;
      jump_target?: string;
      is_draft?: number;
      impressions?: number;
      clicks?: number;
      created_by?: string;
    };
    if (!body.title || !body.image_url) {
      return fail(res, 400, '标题和图片 URL 不能为空');
    }
    const result = db
      .prepare(
        `INSERT INTO banners (title, image_url, link_url, position, sort_order, status, start_time, end_time,
          jump_type, jump_target, is_draft, impressions, clicks, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        body.title,
        body.image_url,
        body.link_url ?? '',
        body.position ?? 'home_top',
        body.sort_order ?? 0,
        body.status ?? 1,
        body.start_time ?? null,
        body.end_time ?? null,
        body.jump_type ?? 'external',
        body.jump_target ?? '',
        body.is_draft ?? 0,
        body.impressions ?? 0,
        body.clicks ?? 0,
        body.created_by ?? ''
      );
    return ok(res, { id: result.lastInsertRowid }, '新增成功');
  }
);

// PUT /api/content/banners/:id - 编辑
router.put(
  '/banners/:id',
  requirePermission('content:edit'),
  auditMiddleware('content_banner', 'update'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的 ID');
    const exists = db.prepare('SELECT id FROM banners WHERE id = ?').get(id);
    if (!exists) return fail(res, 404, 'Banner 不存在');

    const body = req.body as {
      title?: string;
      image_url?: string;
      link_url?: string;
      position?: string;
      sort_order?: number;
      status?: number;
      start_time?: number | null;
      end_time?: number | null;
      jump_type?: string;
      jump_target?: string;
      is_draft?: number;
    };
    db.prepare(
      `UPDATE banners SET title = ?, image_url = ?, link_url = ?, position = ?, sort_order = ?, status = ?,
              start_time = ?, end_time = ?, jump_type = ?, jump_target = ?, is_draft = ?,
              updated_at = ? WHERE id = ?`
    ).run(
      body.title ?? '',
      body.image_url ?? '',
      body.link_url ?? '',
      body.position ?? 'home_top',
      body.sort_order ?? 0,
      body.status ?? 1,
      body.start_time ?? null,
      body.end_time ?? null,
      body.jump_type ?? 'external',
      body.jump_target ?? '',
      body.is_draft ?? 0,
      Date.now(),
      id
    );
    return ok(res, null, '更新成功');
  }
);

// PATCH /api/content/banners/:id/status - 上架/下架
router.patch(
  '/banners/:id/status',
  requirePermission('content:edit'),
  auditMiddleware('content_banner', 'update_status'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的 ID');
    const { status } = req.body as { status?: number };
    if (status !== 0 && status !== 1) {
      return fail(res, 400, '状态值非法(0 下架 / 1 上架)');
    }
    const exists = db.prepare('SELECT id FROM banners WHERE id = ?').get(id);
    if (!exists) return fail(res, 404, 'Banner 不存在');
    db.prepare('UPDATE banners SET status = ?, updated_at = ? WHERE id = ?').run(status, Date.now(), id);
    return ok(res, null, status === 1 ? '已上架' : '已下架');
  }
);

// PATCH /api/content/banners/:id/sort - 调整排序
router.patch(
  '/banners/:id/sort',
  requirePermission('content:edit'),
  auditMiddleware('content_banner', 'update_sort'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的 ID');
    const { sort_order } = req.body as { sort_order?: number };
    if (typeof sort_order !== 'number') {
      return fail(res, 400, 'sort_order 必须为数字');
    }
    const exists = db.prepare('SELECT id FROM banners WHERE id = ?').get(id);
    if (!exists) return fail(res, 404, 'Banner 不存在');
    db.prepare('UPDATE banners SET sort_order = ?, updated_at = ? WHERE id = ?').run(sort_order, Date.now(), id);
    return ok(res, null, '排序已更新');
  }
);

// DELETE /api/content/banners/:id - 删除
router.delete(
  '/banners/:id',
  requirePermission('content:edit'),
  auditMiddleware('content_banner', 'delete'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的 ID');
    const exists = db.prepare('SELECT id FROM banners WHERE id = ?').get(id);
    if (!exists) return fail(res, 404, 'Banner 不存在');
    db.prepare('DELETE FROM banners WHERE id = ?').run(id);
    return ok(res, null, '删除成功');
  }
);

// ====================== 资讯管理 ======================

// GET /api/content/news - 分页列表(支持 title/category/status 筛选)
router.get('/news', requirePermission('content:view'), (req: AuthedRequest, res: Response) => {
  const { page, pageSize } = parsePaging(req);
  const title = String(req.query.title ?? '').trim();
  const category = String(req.query.category ?? '').trim();
  const status = String(req.query.status ?? '').trim();

  const where: string[] = [];
  const params: Array<string | number> = [];
  if (title) {
    where.push('title LIKE ?');
    params.push(`%${title}%`);
  }
  if (category) {
    where.push('category = ?');
    params.push(category);
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = (db.prepare(`SELECT COUNT(*) AS c FROM news ${whereSql}`).get(...params) as { c: number }).c;

  const rows = db
    .prepare(
      `SELECT id, title, category, cover_url, summary, author, status, is_top, published_at, created_at, updated_at
       FROM news
       ${whereSql}
       ORDER BY is_top DESC, published_at DESC, id DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, (page - 1) * pageSize) as Array<{
      id: number;
      title: string;
      category: string;
      cover_url: string;
      summary: string;
      author: string;
      status: string;
      is_top: number;
      published_at: number | null;
      created_at: number;
      updated_at: number;
    }>;

  return ok(res, { list: rows, total });
});

// GET /api/content/news/stats - 资讯统计数据
router.get('/news/stats', requirePermission('content:view'), (_req: AuthedRequest, res: Response) => {
  const total = (db.prepare('SELECT COUNT(*) AS c FROM news').get() as { c: number }).c;
  const published = (db.prepare("SELECT COUNT(*) AS c FROM news WHERE status = 'published'").get() as { c: number }).c;
  const draft = (db.prepare("SELECT COUNT(*) AS c FROM news WHERE status = 'draft'").get() as { c: number }).c;
  const offline = (db.prepare("SELECT COUNT(*) AS c FROM news WHERE status = 'offline'").get() as { c: number }).c;
  const top = (db.prepare('SELECT COUNT(*) AS c FROM news WHERE is_top = 1').get() as { c: number }).c;

  return ok(res, { total, published, draft, offline, top });
});

// GET /api/content/news/:id - 详情(含 content 富文本)
router.get('/news/:id', requirePermission('content:view'), (req: AuthedRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return fail(res, 400, '无效的 ID');
  const row = db.prepare('SELECT * FROM news WHERE id = ?').get(id);
  if (!row) return fail(res, 404, '资讯不存在');
  return ok(res, row);
});

// POST /api/content/news - 新增
router.post(
  '/news',
  requirePermission('content:edit'),
  auditMiddleware('content_news', 'create'),
  (req: AuthedRequest, res: Response) => {
    const body = req.body as {
      title?: string;
      category?: string;
      cover_url?: string;
      summary?: string;
      content?: string;
      author?: string;
      status?: string;
      is_top?: number;
    };
    if (!body.title) return fail(res, 400, '标题不能为空');

    const status = body.status ?? 'draft';
    if (!['draft', 'published', 'offline'].includes(status)) {
      return fail(res, 400, '状态值非法(draft/published/offline)');
    }
    const publishedAt = status === 'published' ? Date.now() : null;

    const result = db
      .prepare(
        `INSERT INTO news (title, category, cover_url, summary, content, author, status, is_top, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        body.title,
        body.category ?? '',
        body.cover_url ?? '',
        body.summary ?? '',
        body.content ?? '',
        body.author ?? '',
        status,
        body.is_top ?? 0,
        publishedAt
      );
    return ok(res, { id: result.lastInsertRowid }, '新增成功');
  }
);

// PUT /api/content/news/:id - 编辑
router.put(
  '/news/:id',
  requirePermission('content:edit'),
  auditMiddleware('content_news', 'update'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的 ID');
    const exists = db.prepare('SELECT id, status FROM news WHERE id = ?').get(id) as
      | { id: number; status: string }
      | undefined;
    if (!exists) return fail(res, 404, '资讯不存在');

    const body = req.body as {
      title?: string;
      category?: string;
      cover_url?: string;
      summary?: string;
      content?: string;
      author?: string;
      status?: string;
      is_top?: number;
    };
    // 编辑时不自动改 published_at;若状态从非 published 变为 published 且 published_at 为空则补上
    let publishedAt: number | null = (
      db.prepare('SELECT published_at FROM news WHERE id = ?').get(id) as { published_at: number | null }
    ).published_at;
    if (body.status && body.status === 'published' && !publishedAt) {
      publishedAt = Date.now();
    }
    if (body.status && !['draft', 'published', 'offline'].includes(body.status)) {
      return fail(res, 400, '状态值非法(draft/published/offline)');
    }

    db.prepare(
      `UPDATE news SET title = ?, category = ?, cover_url = ?, summary = ?, content = ?, author = ?,
              status = ?, is_top = ?, published_at = ?, updated_at = ? WHERE id = ?`
    ).run(
      body.title ?? '',
      body.category ?? '',
      body.cover_url ?? '',
      body.summary ?? '',
      body.content ?? '',
      body.author ?? '',
      body.status ?? exists.status,
      body.is_top ?? 0,
      publishedAt,
      Date.now(),
      id
    );
    return ok(res, null, '更新成功');
  }
);

// POST /api/content/news/:id/publish - 发布(草稿/已下架 → 已发布,设 published_at)
router.post(
  '/news/:id/publish',
  requirePermission('content:edit'),
  auditMiddleware('content_news', 'publish'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的 ID');
    const row = db.prepare('SELECT id, status FROM news WHERE id = ?').get(id) as
      | { id: number; status: string }
      | undefined;
    if (!row) return fail(res, 404, '资讯不存在');
    if (row.status === 'published') return fail(res, 400, '该资讯已是发布状态');

    db.prepare('UPDATE news SET status = ?, published_at = ?, updated_at = ? WHERE id = ?').run(
      'published',
      Date.now(),
      Date.now(),
      id
    );
    return ok(res, null, '发布成功');
  }
);

// PATCH /api/content/news/:id/offline - 下架(已发布 → 已下架)
router.patch(
  '/news/:id/offline',
  requirePermission('content:edit'),
  auditMiddleware('content_news', 'offline'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的 ID');
    const row = db.prepare('SELECT id, status FROM news WHERE id = ?').get(id) as
      | { id: number; status: string }
      | undefined;
    if (!row) return fail(res, 404, '资讯不存在');
    if (row.status !== 'published') return fail(res, 400, '仅已发布的资讯可下架');

    db.prepare('UPDATE news SET status = ?, updated_at = ? WHERE id = ?').run('offline', Date.now(), id);
    return ok(res, null, '已下架');
  }
);

// PATCH /api/content/news/:id/top - 置顶/取消置顶
router.patch(
  '/news/:id/top',
  requirePermission('content:edit'),
  auditMiddleware('content_news', 'toggle_top'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的 ID');
    const { is_top } = req.body as { is_top?: number };
    if (is_top !== 0 && is_top !== 1) {
      return fail(res, 400, 'is_top 值非法(0 取消 / 1 置顶)');
    }
    const exists = db.prepare('SELECT id FROM news WHERE id = ?').get(id);
    if (!exists) return fail(res, 404, '资讯不存在');
    db.prepare('UPDATE news SET is_top = ?, updated_at = ? WHERE id = ?').run(is_top, Date.now(), id);
    return ok(res, null, is_top === 1 ? '已置顶' : '已取消置顶');
  }
);

// DELETE /api/content/news/:id - 删除
router.delete(
  '/news/:id',
  requirePermission('content:edit'),
  auditMiddleware('content_news', 'delete'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的 ID');
    const exists = db.prepare('SELECT id FROM news WHERE id = ?').get(id);
    if (!exists) return fail(res, 404, '资讯不存在');
    db.prepare('DELETE FROM news WHERE id = ?').run(id);
    return ok(res, null, '删除成功');
});

// ====================== 公告与推送管理 ======================

// GET /api/content/notices - 公告分页列表(支持 title/type/status 筛选)
router.get('/notices', requirePermission('content:view'), (req: AuthedRequest, res: Response) => {
  const { page, pageSize } = parsePaging(req);
  const title = String(req.query.title ?? '').trim();
  const type = String(req.query.type ?? '').trim();
  const status = String(req.query.status ?? '').trim();

  const where: string[] = [];
  const params: Array<string | number> = [];
  if (title) {
    where.push('title LIKE ?');
    params.push(`%${title}%`);
  }
  if (type) {
    where.push('type = ?');
    params.push(type);
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = (db.prepare(`SELECT COUNT(*) AS c FROM notices ${whereSql}`).get(...params) as { c: number }).c;

  const rows = db
    .prepare(
      `SELECT id, title, content, type, status, push_target, published_at, created_at, updated_at
       FROM notices
       ${whereSql}
       ORDER BY published_at DESC, id DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, (page - 1) * pageSize) as Array<{
      id: number;
      title: string;
      content: string;
      type: string;
      status: string;
      push_target: string;
      published_at: number | null;
      created_at: number;
      updated_at: number;
    }>;

  return ok(res, { list: rows, total });
});

// GET /api/content/notices/:id - 详情
router.get('/notices/:id', requirePermission('content:view'), (req: AuthedRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return fail(res, 400, '无效的 ID');
  const row = db.prepare('SELECT * FROM notices WHERE id = ?').get(id);
  if (!row) return fail(res, 404, '公告不存在');
  return ok(res, row);
});

// POST /api/content/notices - 新增
router.post(
  '/notices',
  requirePermission('content:edit'),
  auditMiddleware('content_notice', 'create'),
  (req: AuthedRequest, res: Response) => {
    const body = req.body as {
      title?: string;
      content?: string;
      type?: string;
      status?: string;
      push_target?: string;
    };
    if (!body.title) return fail(res, 400, '公告标题不能为空');
    if (!body.content) return fail(res, 400, '公告内容不能为空');

    const status = body.status ?? 'draft';
    if (!['draft', 'published'].includes(status)) {
      return fail(res, 400, '状态值非法(draft/published)');
    }
    const type = body.type ?? 'system';
    if (!['system', 'activity', 'maintenance'].includes(type)) {
      return fail(res, 400, '类型值非法(system/activity/maintenance)');
    }
    const publishedAt = status === 'published' ? Date.now() : null;

    const result = db
      .prepare(
        `INSERT INTO notices (title, content, type, status, push_target, published_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(body.title, body.content, type, status, body.push_target ?? 'all', publishedAt);
    return ok(res, { id: result.lastInsertRowid }, '新增成功');
  }
);

// PUT /api/content/notices/:id - 编辑
router.put(
  '/notices/:id',
  requirePermission('content:edit'),
  auditMiddleware('content_notice', 'update'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的 ID');
    const exists = db.prepare('SELECT id, status, published_at FROM notices WHERE id = ?').get(id) as
      | { id: number; status: string; published_at: number | null }
      | undefined;
    if (!exists) return fail(res, 404, '公告不存在');

    const body = req.body as {
      title?: string;
      content?: string;
      type?: string;
      status?: string;
      push_target?: string;
    };
    const type = body.type ?? 'system';
    if (!['system', 'activity', 'maintenance'].includes(type)) {
      return fail(res, 400, '类型值非法(system/activity/maintenance)');
    }
    const newStatus = body.status ?? exists.status;
    if (!['draft', 'published'].includes(newStatus)) {
      return fail(res, 400, '状态值非法(draft/published)');
    }
    // 首次发布时补 published_at
    let publishedAt = exists.published_at;
    if (newStatus === 'published' && !publishedAt) {
      publishedAt = Date.now();
    }

    db.prepare(
      `UPDATE notices SET title = ?, content = ?, type = ?, status = ?, push_target = ?, published_at = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      body.title ?? '',
      body.content ?? '',
      type,
      newStatus,
      body.push_target ?? 'all',
      publishedAt,
      Date.now(),
      id
    );
    return ok(res, null, '更新成功');
  }
);

// POST /api/content/notices/:id/publish - 发布(草稿 → 已发布,设 published_at)
router.post(
  '/notices/:id/publish',
  requirePermission('content:edit'),
  auditMiddleware('content_notice', 'publish'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的 ID');
    const row = db.prepare('SELECT id, status FROM notices WHERE id = ?').get(id) as
      | { id: number; status: string }
      | undefined;
    if (!row) return fail(res, 404, '公告不存在');
    if (row.status === 'published') return fail(res, 400, '该公告已是发布状态');

    db.prepare('UPDATE notices SET status = ?, published_at = ?, updated_at = ? WHERE id = ?').run(
      'published',
      Date.now(),
      Date.now(),
      id
    );
    return ok(res, null, '发布成功');
  }
);

// DELETE /api/content/notices/:id - 删除
router.delete(
  '/notices/:id',
  requirePermission('content:edit'),
  auditMiddleware('content_notice', 'delete'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的 ID');
    const exists = db.prepare('SELECT id FROM notices WHERE id = ?').get(id);
    if (!exists) return fail(res, 404, '公告不存在');
    db.prepare('DELETE FROM notices WHERE id = ?').run(id);
    return ok(res, null, '删除成功');
  }
);

export default router;
