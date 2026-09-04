// 拍卖管理模块 - 后端路由
// 挂载于 /api/auction,所有接口需登录鉴权
// 子模块:拍卖场次、拍品(关联 NFT 资产)、竞价记录、成交与交割
import { Router, Response } from 'express';
import db from '../db';
import { authenticate, requirePermission } from '../middlewares/auth';
import { auditMiddleware } from '../middlewares/audit';
import type { AuthedRequest, ApiResponse } from '../types';
import { SESSION_STATUS, ITEM_STATUS, DEAL_STATUS } from '../modules/auction/db';
import type {
  AuctionSessionRow,
  AuctionItemRow,
  AuctionBidRow,
  AuctionDealRow,
} from '../modules/auction/db';

export const auctionRouter = Router();

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

// 所有拍卖模块接口均需登录鉴权
auctionRouter.use(authenticate);

// ==================== 跨模块查询辅助 ====================

// NFT 资产简要信息(供拍品关联展示)
interface NftAssetBrief {
  id: number;
  token_id: string | null;
  name: string;
  owner_name: string;
  status: string;
  contract_address: string | null;
  tx_hash: string | null;
}

// 跨模块查询单个 NFT 资产简要(容错:表不存在或查询失败返回 null)
function getNftAssetBrief(nftAssetId: number | null): NftAssetBrief | null {
  if (!nftAssetId) return null;
  try {
    const row = db
      .prepare(
        'SELECT id, token_id, name, owner_name, status, contract_address, tx_hash FROM nft_assets WHERE id = ?'
      )
      .get(nftAssetId) as NftAssetBrief | undefined;
    return row ?? null;
  } catch {
    // nft_assets 表可能尚未创建,容错返回 null
    return null;
  }
}

// 批量查询 NFT 资产简要(容错)
function getNftAssetMap(ids: number[]): Map<number, NftAssetBrief> {
  const map = new Map<number, NftAssetBrief>();
  if (!ids.length) return map;
  try {
    const placeholders = ids.map(() => '?').join(',');
    const rows = db
      .prepare(
        `SELECT id, token_id, name, owner_name, status, contract_address, tx_hash FROM nft_assets WHERE id IN (${placeholders})`
      )
      .all(...ids) as NftAssetBrief[];
    rows.forEach((r) => map.set(r.id, r));
  } catch {
    // 容错:返回空 map
  }
  return map;
}

// 场次状态标签映射
const SESSION_STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  pending: '未开始',
  ongoing: '进行中',
  ended: '已结束',
  cancelled: '已取消',
};

// 拍品状态标签映射
const ITEM_STATUS_LABEL: Record<string, string> = {
  pending: '待上架',
  bidding: '拍卖中',
  dealt: '已成交',
  passed: '流拍',
};

// 成交单状态标签映射
const DEAL_STATUS_LABEL: Record<string, string> = {
  pending_payment: '待付款',
  paid: '已付款',
  delivering: '待交割',
  completed: '已完成',
  cancelled: '已取消',
};

// ==================== 拍卖场次 ====================

// GET /api/auction/sessions - 分页列表(场次名/状态筛选)
auctionRouter.get(
  '/sessions',
  requirePermission('auction:view'),
  (req: AuthedRequest, res: Response) => {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.max(1, parseInt(String(req.query.pageSize ?? '10'), 10) || 10);
    const name = String(req.query.name ?? '').trim();
    const status = String(req.query.status ?? '').trim();

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
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const total = (
      db.prepare(`SELECT COUNT(*) AS c FROM auction_sessions ${whereSql}`).get(...params) as {
        c: number;
      }
    ).c;

    const rows = db
      .prepare(
        `SELECT id, name, status, start_time, end_time, location, description,
                session_code, auction_type, deposit, default_start_price, default_bid_step,
                allow_entrusted_bid, allow_auto_bid, publish_time, created_at, updated_at
         FROM auction_sessions
         ${whereSql}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, pageSize, (page - 1) * pageSize) as AuctionSessionRow[];

    // 批量统计每个场次的拍品数与成交数
    const sessionIds = rows.map((r) => r.id);
    const itemCountMap = new Map<number, number>();
    const dealCountMap = new Map<number, number>();
    if (sessionIds.length) {
      const placeholders = sessionIds.map(() => '?').join(',');
      try {
        const itemRows = db
          .prepare(
            `SELECT session_id, COUNT(*) AS c FROM auction_items WHERE session_id IN (${placeholders}) GROUP BY session_id`
          )
          .all(...sessionIds) as Array<{ session_id: number; c: number }>;
        itemRows.forEach((r) => itemCountMap.set(r.session_id, r.c));
        const dealRows = db
          .prepare(
            `SELECT session_id, COUNT(*) AS c FROM auction_deals WHERE session_id IN (${placeholders}) GROUP BY session_id`
          )
          .all(...sessionIds) as Array<{ session_id: number; c: number }>;
        dealRows.forEach((r) => dealCountMap.set(r.session_id, r.c));
      } catch {
        // 容错:统计失败不影响列表
      }
    }

    const list = rows.map((r) => ({
      ...r,
      status_label: SESSION_STATUS_LABEL[r.status] ?? r.status,
      item_count: itemCountMap.get(r.id) ?? 0,
      deal_count: dealCountMap.get(r.id) ?? 0,
    }));

    return ok(res, { list, total });
  }
);

// GET /api/auction/sessions/:id - 详情(含拍品数/成交数统计)
auctionRouter.get(
  '/sessions/:id',
  requirePermission('auction:view'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的场次 ID');

    const session = db
      .prepare(
        `SELECT id, name, status, start_time, end_time, location, description,
                session_code, auction_type, deposit, default_start_price, default_bid_step,
                allow_entrusted_bid, allow_auto_bid, publish_time, created_at, updated_at
         FROM auction_sessions WHERE id = ?`
      )
      .get(id) as AuctionSessionRow | undefined;
    if (!session) return fail(res, 404, '拍卖场次不存在');

    let itemCount = 0;
    let dealCount = 0;
    try {
      itemCount = (
        db.prepare('SELECT COUNT(*) AS c FROM auction_items WHERE session_id = ?').get(id) as {
          c: number;
        }
      ).c;
      dealCount = (
        db.prepare('SELECT COUNT(*) AS c FROM auction_deals WHERE session_id = ?').get(id) as {
          c: number;
        }
      ).c;
    } catch {
      // 容错
    }

    return ok(res, {
      ...session,
      status_label: SESSION_STATUS_LABEL[session.status] ?? session.status,
      item_count: itemCount,
      deal_count: dealCount,
    });
  }
);

// POST /api/auction/sessions - 新增场次
auctionRouter.post(
  '/sessions',
  requirePermission('auction:edit'),
  auditMiddleware('auction', 'create_session'),
  (req: AuthedRequest, res: Response) => {
    const body = req.body as {
      name?: string;
      status?: string;
      start_time?: number | null;
      end_time?: number | null;
      location?: string;
      description?: string;
      auction_type?: string;
      deposit?: number | null;
      default_start_price?: number | null;
      default_bid_step?: number | null;
      allow_entrusted_bid?: boolean | null;
      allow_auto_bid?: boolean | null;
      publish_time?: number | null;
    };

    const name = String(body.name ?? '').trim();
    if (!name) return fail(res, 400, '场次名称不能为空');

    let status = String(body.status ?? SESSION_STATUS.DRAFT).trim();
    const validStatus: string[] = [
      SESSION_STATUS.DRAFT,
      SESSION_STATUS.PENDING,
      SESSION_STATUS.ONGOING,
      SESSION_STATUS.ENDED,
      SESSION_STATUS.CANCELLED,
    ];
    if (!validStatus.includes(status)) {
      status = SESSION_STATUS.DRAFT;
    }

    const startTime = body.start_time ?? null;
    const endTime = body.end_time ?? null;
    if (startTime !== null && endTime !== null && endTime <= startTime) {
      return fail(res, 400, '结束时间必须晚于开始时间');
    }

    const auctionType = String(body.auction_type ?? 'online').trim();
    const validTypes = ['online', 'offline', 'hybrid'];
    const finalType = validTypes.includes(auctionType) ? auctionType : 'online';

    const sessionCode = 'AUC-' + new Date().getFullYear() + '-' +
      String(Math.floor(1000 + Math.random() * 9000));

    const result = db
      .prepare(
        `INSERT INTO auction_sessions
          (name, status, start_time, end_time, location, description,
           session_code, auction_type, deposit, default_start_price, default_bid_step,
           allow_entrusted_bid, allow_auto_bid, publish_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        name, status, startTime, endTime, body.location ?? null, body.description ?? null,
        sessionCode, finalType,
        body.deposit ?? 5000,
        body.default_start_price ?? 5000,
        body.default_bid_step ?? 500,
        body.allow_entrusted_bid !== false ? 1 : 0,
        body.allow_auto_bid !== false ? 1 : 0,
        body.publish_time ?? null
      );

    return ok(res, { id: result.lastInsertRowid, session_code: sessionCode }, '场次创建成功');
  }
);

// PUT /api/auction/sessions/:id - 编辑场次(草稿/未开始可全字段编辑,其他状态仅可编辑描述)
auctionRouter.put(
  '/sessions/:id',
  requirePermission('auction:edit'),
  auditMiddleware('auction', 'update_session'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的场次 ID');

    const target = db
      .prepare(
        'SELECT * FROM auction_sessions WHERE id = ?'
      )
      .get(id) as
      | Record<string, unknown> & {
          id: number;
          name: string;
          status: string;
          start_time: number | null;
          end_time: number | null;
          location: string | null;
          description: string | null;
          session_code: string | null;
          auction_type: string | null;
          deposit: number | null;
          default_start_price: number | null;
          default_bid_step: number | null;
          allow_entrusted_bid: number | null;
          allow_auto_bid: number | null;
          publish_time: number | null;
        }
      | undefined;
    if (!target) return fail(res, 404, '拍卖场次不存在');

    res.locals.audit = {
      before: target,
      objectName: target.name || `拍卖场次#${id}`,
      targetId: id,
      targetType: 'auction_session',
    };

    if (target.status === SESSION_STATUS.CANCELLED || target.status === SESSION_STATUS.ENDED) {
      return fail(
        res,
        400,
        `当前状态【${SESSION_STATUS_LABEL[target.status]}】不可编辑`
      );
    }

    const body = req.body as {
      name?: string;
      start_time?: number | null;
      end_time?: number | null;
      location?: string;
      description?: string;
      auction_type?: string;
      deposit?: number | null;
      default_start_price?: number | null;
      default_bid_step?: number | null;
      allow_entrusted_bid?: boolean | null;
      allow_auto_bid?: boolean | null;
      publish_time?: number | null;
    };

    const limited = target.status === SESSION_STATUS.ONGOING;
    const finalName = limited
      ? target.name
      : body.name !== undefined
      ? String(body.name).trim()
      : target.name;
    if (!limited && !finalName) return fail(res, 400, '场次名称不能为空');

    const finalStartTime = limited ? target.start_time : body.start_time !== undefined ? body.start_time : target.start_time;
    const finalEndTime = limited ? target.end_time : body.end_time !== undefined ? body.end_time : target.end_time;
    if (
      !limited &&
      finalStartTime !== null &&
      finalEndTime !== null &&
      finalEndTime <= finalStartTime
    ) {
      return fail(res, 400, '结束时间必须晚于开始时间');
    }
    const finalLocation = body.location !== undefined ? body.location : target.location;
    const finalDescription =
      body.description !== undefined ? body.description : target.description;
    const finalAuctionType = limited ? target.auction_type : (body.auction_type !== undefined ? body.auction_type : target.auction_type);
    const finalDeposit = limited ? target.deposit : (body.deposit !== undefined ? body.deposit : target.deposit);
    const finalDefaultStartPrice = limited ? target.default_start_price : (body.default_start_price !== undefined ? body.default_start_price : target.default_start_price);
    const finalDefaultBidStep = limited ? target.default_bid_step : (body.default_bid_step !== undefined ? body.default_bid_step : target.default_bid_step);
    const finalAllowEntrustedBid = limited ? target.allow_entrusted_bid : (body.allow_entrusted_bid !== undefined ? (body.allow_entrusted_bid ? 1 : 0) : target.allow_entrusted_bid);
    const finalAllowAutoBid = limited ? target.allow_auto_bid : (body.allow_auto_bid !== undefined ? (body.allow_auto_bid ? 1 : 0) : target.allow_auto_bid);
    const finalPublishTime = limited ? target.publish_time : (body.publish_time !== undefined ? body.publish_time : target.publish_time);

    db.prepare(
      `UPDATE auction_sessions
       SET name = ?, start_time = ?, end_time = ?, location = ?, description = ?,
           auction_type = ?, deposit = ?, default_start_price = ?, default_bid_step = ?,
           allow_entrusted_bid = ?, allow_auto_bid = ?, publish_time = ?,
           updated_at = ?
       WHERE id = ?`
    ).run(finalName, finalStartTime, finalEndTime, finalLocation, finalDescription,
      finalAuctionType ?? 'online', finalDeposit, finalDefaultStartPrice, finalDefaultBidStep,
      finalAllowEntrustedBid ?? 1, finalAllowAutoBid ?? 1, finalPublishTime,
      Date.now(), id);

    return ok(res, null, '更新成功');
  }
);

// POST /api/auction/sessions/:id/transition - 状态流转
// 草稿→未开始→进行中→已结束;取消(任意非已结束状态可取消)
auctionRouter.post(
  '/sessions/:id/transition',
  requirePermission('auction:edit'),
  auditMiddleware('auction', 'transition_session'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的场次 ID');

    const body = req.body as { status?: string };
    const targetStatus = String(body.status ?? '').trim();
    const validNext: Record<string, string[]> = {
      [SESSION_STATUS.DRAFT]: [SESSION_STATUS.PENDING, SESSION_STATUS.CANCELLED],
      [SESSION_STATUS.PENDING]: [SESSION_STATUS.ONGOING, SESSION_STATUS.CANCELLED],
      [SESSION_STATUS.ONGOING]: [SESSION_STATUS.ENDED, SESSION_STATUS.CANCELLED],
      [SESSION_STATUS.ENDED]: [],
      [SESSION_STATUS.CANCELLED]: [],
    };

    const before = db.prepare('SELECT * FROM auction_sessions WHERE id = ?').get(id) as
      | Record<string, unknown> & { id: number; name: string; status: string }
      | undefined;
    if (!before) return fail(res, 404, '拍卖场次不存在');

    res.locals.audit = {
      before,
      objectName: before.name || `拍卖场次#${id}`,
      targetId: id,
      targetType: 'auction_session',
    };

    const allowed = validNext[before.status] ?? [];
    if (!allowed.includes(targetStatus)) {
      return fail(
        res,
        400,
        `当前状态【${SESSION_STATUS_LABEL[before.status]}】不可流转至【${SESSION_STATUS_LABEL[targetStatus] ?? targetStatus}】`
      );
    }

    const tx = db.transaction(() => {
      db.prepare('UPDATE auction_sessions SET status = ?, updated_at = ? WHERE id = ?').run(
        targetStatus,
        Date.now(),
        id
      );

      // 场次结束:自动生成成交单(按最高出价判定,流拍标记)
      if (targetStatus === SESSION_STATUS.ENDED) {
        finalizeSessionDeals(id);
      }
    });
    tx();

    const transitionMsg: Record<string, string> = {
      [SESSION_STATUS.PENDING]: '场次已发布(未开始)',
      [SESSION_STATUS.ONGOING]: '场次已开始拍卖',
      [SESSION_STATUS.ENDED]: '场次已结束,成交单已生成',
      [SESSION_STATUS.CANCELLED]: '场次已取消',
    };
    return ok(res, null, transitionMsg[targetStatus] ?? '状态已更新');
  }
);

// 场次结束自动生成成交单:遍历场次下所有拍品
// - 拍卖中且有出价 → 已成交,生成成交单(待付款)
// - 拍卖中且无出价 → 流拍
// - 待上架 → 流拍
function finalizeSessionDeals(sessionId: number): void {
  const items = db
    .prepare(
      `SELECT id, nft_asset_id, name, start_price, current_price, current_bidder, status
       FROM auction_items WHERE session_id = ?`
    )
    .all(sessionId) as Array<{
    id: number;
    nft_asset_id: number | null;
    name: string;
    start_price: number;
    current_price: number;
    current_bidder: string | null;
    status: string;
  }>;

  const now = Date.now();
  const insertDeal = db.prepare(
    `INSERT INTO auction_deals
      (session_id, item_id, nft_asset_id, seller, buyer, final_price, status, deal_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  // 查卖家:NFT 资产持有者(跨模块容错)
  const getSeller = (nftAssetId: number | null): string => {
    const brief = getNftAssetBrief(nftAssetId);
    return brief?.owner_name ?? '平台';
  };

  for (const item of items) {
    if (item.status !== ITEM_STATUS.BIDDING && item.status !== ITEM_STATUS.PENDING) continue;

    const hasBid = item.current_bidder && item.current_price > 0;
    if (hasBid) {
      // 已成交
      db.prepare('UPDATE auction_items SET status = ? WHERE id = ?').run(
        ITEM_STATUS.DEALT,
        item.id
      );
      insertDeal.run(
        sessionId,
        item.id,
        item.nft_asset_id,
        getSeller(item.nft_asset_id),
        item.current_bidder,
        item.current_price,
        DEAL_STATUS.PENDING_PAYMENT,
        now
      );
    } else {
      // 流拍
      db.prepare('UPDATE auction_items SET status = ? WHERE id = ?').run(
        ITEM_STATUS.PASSED,
        item.id
      );
    }
  }
}

// DELETE /api/auction/sessions/:id - 删除(仅草稿/已取消状态可删除)
auctionRouter.delete(
  '/sessions/:id',
  requirePermission('auction:edit'),
  auditMiddleware('auction', 'delete_session'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的场次 ID');

    const before = db.prepare('SELECT * FROM auction_sessions WHERE id = ?').get(id) as
      | Record<string, unknown> & { id: number; name: string; status: string }
      | undefined;
    if (!before) return fail(res, 404, '拍卖场次不存在');

    res.locals.audit = {
      before,
      objectName: before.name || `拍卖场次#${id}`,
      targetId: id,
      targetType: 'auction_session',
    };

    const deletableStatus: string[] = [SESSION_STATUS.DRAFT, SESSION_STATUS.CANCELLED];
    if (!deletableStatus.includes(before.status)) {
      return fail(
        res,
        400,
        `当前状态【${SESSION_STATUS_LABEL[before.status]}】不可删除`
      );
    }

    db.prepare('DELETE FROM auction_sessions WHERE id = ?').run(id);
    return ok(res, null, '删除成功');
  }
);

// ==================== 拍品管理(关联 NFT 资产)====================

// GET /api/auction/items - 拍品列表(按场次筛选)
auctionRouter.get(
  '/items',
  requirePermission('auction:view'),
  (req: AuthedRequest, res: Response) => {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.max(1, parseInt(String(req.query.pageSize ?? '10'), 10) || 10);
    const session_id = req.query.session_id
      ? parseInt(String(req.query.session_id), 10)
      : undefined;
    const status = String(req.query.status ?? '').trim();
    const name = String(req.query.name ?? '').trim();

    const where: string[] = [];
    const params: Array<string | number> = [];
    if (session_id && Number.isFinite(session_id)) {
      where.push('i.session_id = ?');
      params.push(session_id);
    }
    if (status) {
      where.push('i.status = ?');
      params.push(status);
    }
    if (name) {
      where.push('i.name LIKE ?');
      params.push(`%${name}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const total = (
      db.prepare(`SELECT COUNT(*) AS c FROM auction_items i ${whereSql}`).get(...params) as {
        c: number;
      }
    ).c;

    const rows = db
      .prepare(
        `SELECT i.id, i.session_id, i.nft_asset_id, i.name, i.description, i.start_price,
                i.increment, i.current_price, i.current_bidder, i.status, i.sort_order, i.created_at
         FROM auction_items i
         ${whereSql}
         ORDER BY i.sort_order ASC, i.id ASC
         LIMIT ? OFFSET ?`
      )
      .all(...params, pageSize, (page - 1) * pageSize) as AuctionItemRow[];

    // 批量关联 NFT 资产简要
    const assetIds = rows
      .map((r) => r.nft_asset_id)
      .filter((id): id is number => id !== null);
    const assetMap = getNftAssetMap(assetIds);

    // 批量查询每个拍品的出价数
    const itemIds = rows.map((r) => r.id);
    const bidCountMap = new Map<number, number>();
    if (itemIds.length) {
      try {
        const placeholders = itemIds.map(() => '?').join(',');
        const bidRows = db
          .prepare(
            `SELECT item_id, COUNT(*) AS c FROM auction_bids WHERE item_id IN (${placeholders}) GROUP BY item_id`
          )
          .all(...itemIds) as Array<{ item_id: number; c: number }>;
        bidRows.forEach((r) => bidCountMap.set(r.item_id, r.c));
      } catch {
        // 容错
      }
    }

    const list = rows.map((r) => ({
      ...r,
      status_label: ITEM_STATUS_LABEL[r.status] ?? r.status,
      nft_asset: r.nft_asset_id ? assetMap.get(r.nft_asset_id) ?? null : null,
      bid_count: bidCountMap.get(r.id) ?? 0,
    }));

    return ok(res, { list, total });
  }
);

// GET /api/auction/items/:id - 拍品详情(含竞价历史 + NFT 资产简要)
auctionRouter.get(
  '/items/:id',
  requirePermission('auction:view'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的拍品 ID');

    const item = db
      .prepare(
        `SELECT id, session_id, nft_asset_id, name, description, start_price, increment,
                current_price, current_bidder, status, sort_order, created_at
         FROM auction_items WHERE id = ?`
      )
      .get(id) as AuctionItemRow | undefined;
    if (!item) return fail(res, 404, '拍品不存在');

    const bids = db
      .prepare(
        `SELECT id, item_id, bidder, bid_amount, created_at
         FROM auction_bids WHERE item_id = ? ORDER BY bid_amount DESC, created_at DESC`
      )
      .all(id) as AuctionBidRow[];

    return ok(res, {
      ...item,
      status_label: ITEM_STATUS_LABEL[item.status] ?? item.status,
      nft_asset: getNftAssetBrief(item.nft_asset_id),
      bids,
    });
  }
);

// 可选 NFT 资产列表(用于上架拍品时选择,排除已被本场次其他拍品占用的资产)
// GET /api/auction/items/available-assets?session_id=&keyword=
auctionRouter.get(
  '/items/available-assets',
  requirePermission('auction:view'),
  (req: AuthedRequest, res: Response) => {
    const session_id = req.query.session_id
      ? parseInt(String(req.query.session_id), 10)
      : undefined;
    const keyword = String(req.query.keyword ?? '').trim();

    try {
      // 查询所有可用 NFT 资产(已上链或审核通过)
      const where: string[] = ["a.status IN ('minted','approved')"];
      const params: Array<string | number> = [];
      if (keyword) {
        where.push('(a.name LIKE ? OR a.token_id LIKE ? OR a.owner_name LIKE ?)');
        params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
      }
      const whereSql = `WHERE ${where.join(' AND ')}`;

      const rows = db
        .prepare(
          `SELECT a.id, a.token_id, a.name, a.owner_name, a.status, a.contract_address, a.tx_hash
           FROM nft_assets a
           ${whereSql}
           ORDER BY a.created_at DESC
           LIMIT 100`
        )
        .all(...params) as NftAssetBrief[];

      // 排除已被当前场次其他拍品占用的资产
      const usedAssetIds = new Set<number>();
      if (session_id && Number.isFinite(session_id)) {
        const usedRows = db
          .prepare(
            `SELECT nft_asset_id FROM auction_items WHERE session_id = ? AND nft_asset_id IS NOT NULL`
          )
          .all(session_id) as Array<{ nft_asset_id: number }>;
        usedRows.forEach((r) => usedAssetIds.add(r.nft_asset_id));
      }
      const list = rows.filter((r) => !usedAssetIds.has(r.id));

      return ok(res, list);
    } catch {
      // nft_assets 表可能尚未创建,容错返回空
      return ok(res, []);
    }
  }
);

// POST /api/auction/items - 上架拍品(选择 nft_asset_id,设起拍价/加价幅度)
auctionRouter.post(
  '/items',
  requirePermission('auction:edit'),
  auditMiddleware('auction', 'create_item'),
  (req: AuthedRequest, res: Response) => {
    const body = req.body as {
      session_id?: number;
      nft_asset_id?: number | null;
      name?: string;
      description?: string;
      start_price?: number;
      increment?: number;
      sort_order?: number;
    };

    const session_id = Number(body.session_id);
    if (!Number.isFinite(session_id) || session_id <= 0) {
      return fail(res, 400, '请选择所属场次');
    }
    const session = db.prepare('SELECT id, status FROM auction_sessions WHERE id = ?').get(
      session_id
    ) as { id: number; status: string } | undefined;
    if (!session) return fail(res, 400, '指定的拍卖场次不存在');
    if (session.status === SESSION_STATUS.ENDED || session.status === SESSION_STATUS.CANCELLED) {
      return fail(res, 400, `当前场次状态【${SESSION_STATUS_LABEL[session.status]}】不可上架拍品`);
    }

    const name = String(body.name ?? '').trim();
    if (!name) return fail(res, 400, '拍品名称不能为空');

    const startPrice = Number(body.start_price);
    if (!Number.isFinite(startPrice) || startPrice < 0) {
      return fail(res, 400, '起拍价必须为非负数');
    }
    const increment = Number(body.increment);
    if (!Number.isFinite(increment) || increment < 0) {
      return fail(res, 400, '加价幅度必须为非负数');
    }

    // 校验关联 NFT 资产存在性(跨模块容错)
    const nftAssetId = body.nft_asset_id ?? null;
    if (nftAssetId) {
      const brief = getNftAssetBrief(nftAssetId);
      if (!brief) return fail(res, 400, '指定的 NFT 资产不存在');
      // 校验该资产未被同一场次其他拍品占用
      const exists = db
        .prepare(
          'SELECT id FROM auction_items WHERE session_id = ? AND nft_asset_id = ? AND id != ?'
        )
        .get(session_id, nftAssetId, 0) as { id: number } | undefined;
      if (exists) return fail(res, 400, '该 NFT 资产已在本场次其他拍品中关联');
    }

    const result = db
      .prepare(
        `INSERT INTO auction_items
          (session_id, nft_asset_id, name, description, start_price, increment,
           current_price, current_bidder, status, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`
      )
      .run(
        session_id,
        nftAssetId,
        name,
        body.description ?? null,
        startPrice,
        increment,
        startPrice, // 当前最高价初始化为起拍价
        ITEM_STATUS.PENDING,
        body.sort_order ?? 0
      );

    return ok(res, { id: result.lastInsertRowid }, '拍品上架成功');
  }
);

// PUT /api/auction/items/:id - 编辑拍品(待上架/拍卖中可部分编辑)
auctionRouter.put(
  '/items/:id',
  requirePermission('auction:edit'),
  auditMiddleware('auction', 'update_item'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的拍品 ID');

    const before = db
      .prepare(
        'SELECT * FROM auction_items WHERE id = ?'
      )
      .get(id) as
      | Record<string, unknown> & {
          id: number;
          session_id: number;
          nft_asset_id: number | null;
          name: string;
          description: string | null;
          start_price: number;
          increment: number;
          status: string;
          sort_order: number;
        }
      | undefined;
    if (!before) return fail(res, 404, '拍品不存在');

    res.locals.audit = {
      before,
      objectName: before.name || `拍品#${id}`,
      targetId: id,
      targetType: 'auction_item',
    };

    if (before.status === ITEM_STATUS.DEALT || before.status === ITEM_STATUS.PASSED) {
      return fail(res, 400, `当前状态【${ITEM_STATUS_LABEL[before.status]}】不可编辑`);
    }

    const body = req.body as {
      nft_asset_id?: number | null;
      name?: string;
      description?: string;
      start_price?: number;
      increment?: number;
      sort_order?: number;
    };

    // 拍卖中状态仅允许编辑描述与排序
    const limited = before.status === ITEM_STATUS.BIDDING;
    const finalName = limited
      ? before.name
      : body.name !== undefined
      ? String(body.name).trim()
      : before.name;
    if (!limited && !finalName) return fail(res, 400, '拍品名称不能为空');

    const finalNftAssetId = limited
      ? before.nft_asset_id
      : body.nft_asset_id !== undefined
      ? body.nft_asset_id
      : before.nft_asset_id;

    // 校验 NFT 资产未被同一场次其他拍品占用
    if (!limited && finalNftAssetId) {
      const exists = db
        .prepare(
          'SELECT id FROM auction_items WHERE session_id = ? AND nft_asset_id = ? AND id != ?'
        )
        .get(before.session_id, finalNftAssetId, id) as { id: number } | undefined;
      if (exists) return fail(res, 400, '该 NFT 资产已在本场次其他拍品中关联');
    }

    const finalStartPrice = limited
      ? before.start_price
      : body.start_price !== undefined
      ? Number(body.start_price)
      : before.start_price;
    if (!limited && (!Number.isFinite(finalStartPrice) || finalStartPrice < 0)) {
      return fail(res, 400, '起拍价必须为非负数');
    }
    const finalIncrement = limited
      ? before.increment
      : body.increment !== undefined
      ? Number(body.increment)
      : before.increment;
    if (!limited && (!Number.isFinite(finalIncrement) || finalIncrement < 0)) {
      return fail(res, 400, '加价幅度必须为非负数');
    }
    const finalDescription =
      body.description !== undefined ? body.description : before.description;
    const finalSortOrder =
      body.sort_order !== undefined ? Number(body.sort_order) : before.sort_order;

    // 起拍价变更时,若拍品仍为待上架且无出价,同步当前价
    const shouldResyncPrice =
      !limited && before.status === ITEM_STATUS.PENDING && finalStartPrice !== before.start_price;

    const tx = db.transaction(() => {
      if (shouldResyncPrice) {
        db.prepare(
          `UPDATE auction_items
           SET nft_asset_id = ?, name = ?, description = ?, start_price = ?, increment = ?,
               sort_order = ?, current_price = ?
           WHERE id = ?`
        ).run(
          finalNftAssetId,
          finalName,
          finalDescription,
          finalStartPrice,
          finalIncrement,
          finalSortOrder,
          finalStartPrice,
          id
        );
      } else {
        db.prepare(
          `UPDATE auction_items
           SET nft_asset_id = ?, name = ?, description = ?, start_price = ?, increment = ?,
               sort_order = ?
           WHERE id = ?`
        ).run(
          finalNftAssetId,
          finalName,
          finalDescription,
          finalStartPrice,
          finalIncrement,
          finalSortOrder,
          id
        );
      }
    });
    tx();

    return ok(res, null, '更新成功');
  }
);

// POST /api/auction/items/:id/start - 上架开拍(待上架 → 拍卖中)
auctionRouter.post(
  '/items/:id/start',
  requirePermission('auction:edit'),
  auditMiddleware('auction', 'start_item'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的拍品 ID');

    const target = db
      .prepare('SELECT * FROM auction_items WHERE id = ?')
      .get(id) as { id: number; name: string; session_id: number; status: string } | undefined;
    if (!target) return fail(res, 404, '拍品不存在');

    res.locals.audit = {
      before: target,
      objectName: target.name || `拍品#${id}`,
      targetId: id,
      targetType: 'auction_item',
    };

    if (target.status !== ITEM_STATUS.PENDING) {
      return fail(res, 400, `当前状态【${ITEM_STATUS_LABEL[target.status]}】不可开拍`);
    }
    // 校验所属场次状态须为进行中
    const session = db
      .prepare('SELECT status FROM auction_sessions WHERE id = ?')
      .get(target.session_id) as { status: string } | undefined;
    if (!session || session.status !== SESSION_STATUS.ONGOING) {
      return fail(res, 400, '所属场次非进行中,不可开拍');
    }

    db.prepare('UPDATE auction_items SET status = ? WHERE id = ?').run(ITEM_STATUS.BIDDING, id);
    return ok(res, null, '拍品已开拍');
  }
);

// POST /api/auction/items/:id/pass - 下架/流拍(待上架或拍卖中可标记流拍)
auctionRouter.post(
  '/items/:id/pass',
  requirePermission('auction:edit'),
  auditMiddleware('auction', 'pass_item'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的拍品 ID');

    const target = db.prepare('SELECT * FROM auction_items WHERE id = ?').get(id) as
      | { id: number; name: string; status: string }
      | undefined;
    if (!target) return fail(res, 404, '拍品不存在');

    res.locals.audit = {
      before: target,
      objectName: target.name || `拍品#${id}`,
      targetId: id,
      targetType: 'auction_item',
    };

    const passableStatus: string[] = [ITEM_STATUS.PENDING, ITEM_STATUS.BIDDING];
    if (!passableStatus.includes(target.status)) {
      return fail(res, 400, `当前状态【${ITEM_STATUS_LABEL[target.status]}】不可流拍`);
    }

    db.prepare('UPDATE auction_items SET status = ? WHERE id = ?').run(ITEM_STATUS.PASSED, id);
    return ok(res, null, '拍品已流拍');
  }
);

// DELETE /api/auction/items/:id - 删除拍品(仅待上架/流拍状态可删除)
auctionRouter.delete(
  '/items/:id',
  requirePermission('auction:edit'),
  auditMiddleware('auction', 'delete_item'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的拍品 ID');

    const target = db.prepare('SELECT * FROM auction_items WHERE id = ?').get(id) as
      | { id: number; name: string; status: string }
      | undefined;
    if (!target) return fail(res, 404, '拍品不存在');

    res.locals.audit = {
      before: target,
      objectName: target.name || `拍品#${id}`,
      targetId: id,
      targetType: 'auction_item',
    };

    const deletableStatus: string[] = [ITEM_STATUS.PENDING, ITEM_STATUS.PASSED];
    if (!deletableStatus.includes(target.status)) {
      return fail(res, 400, `当前状态【${ITEM_STATUS_LABEL[target.status]}】不可删除`);
    }

    db.prepare('DELETE FROM auction_items WHERE id = ?').run(id);
    return ok(res, null, '删除成功');
  }
);

// ==================== 竞价记录 ====================

// GET /api/auction/items/:id/bids - 竞价记录列表(按拍品)
auctionRouter.get(
  '/items/:id/bids',
  requirePermission('auction:view'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的拍品 ID');

    const target = db.prepare('SELECT id FROM auction_items WHERE id = ?').get(id);
    if (!target) return fail(res, 404, '拍品不存在');

    const rows = db
      .prepare(
        `SELECT id, item_id, bidder, bid_amount, created_at
         FROM auction_bids WHERE item_id = ? ORDER BY bid_amount DESC, created_at DESC`
      )
      .all(id) as AuctionBidRow[];

    return ok(res, rows);
  }
);

// POST /api/auction/items/:id/bids - 手动录入出价
// 校验:出价须高于当前价(若存在加价幅度,须满足增幅)
auctionRouter.post(
  '/items/:id/bids',
  requirePermission('auction:edit'),
  auditMiddleware('auction', 'create_bid'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的拍品 ID');

    const target = db
      .prepare(
        'SELECT * FROM auction_items WHERE id = ?'
      )
      .get(id) as
      | {
          id: number;
          name: string;
          session_id: number;
          start_price: number;
          increment: number;
          current_price: number;
          current_bidder: string | null;
          status: string;
        }
      | undefined;
    if (!target) return fail(res, 404, '拍品不存在');

    res.locals.audit = {
      before: { current_price: target.current_price, current_bidder: target.current_bidder, status: target.status },
      objectName: target.name || `拍品#${id}`,
      targetId: id,
      targetType: 'auction_item',
    };

    if (target.status !== ITEM_STATUS.BIDDING) {
      return fail(res, 400, `当前拍品状态【${ITEM_STATUS_LABEL[target.status]}】不可出价`);
    }

    const body = req.body as { bidder?: string; bid_amount?: number };
    const bidder = String(body.bidder ?? '').trim();
    if (!bidder) return fail(res, 400, '出价人不能为空');

    const bidAmount = Number(body.bid_amount);
    if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
      return fail(res, 400, '出价金额必须为正数');
    }

    // 校验:出价须高于当前价
    if (bidAmount <= target.current_price) {
      return fail(
        res,
        400,
        `出价金额必须高于当前最高价 ¥${target.current_price}`
      );
    }
    // 校验:加价幅度(若设置了 increment > 0,出价须满足增幅)
    if (target.increment > 0 && bidAmount - target.current_price < target.increment) {
      return fail(
        res,
        400,
        `加价幅度不足,至少加价 ¥${target.increment}`
      );
    }

    const tx = db.transaction(() => {
      db.prepare(
        'INSERT INTO auction_bids (item_id, bidder, bid_amount) VALUES (?, ?, ?)'
      ).run(id, bidder, bidAmount);
      db.prepare(
        'UPDATE auction_items SET current_price = ?, current_bidder = ? WHERE id = ?'
      ).run(bidAmount, bidder, id);
    });
    tx();

    return ok(res, null, '出价成功');
  }
);

// ==================== 成交与交割管理 ====================

// GET /api/auction/deals - 成交列表(按场次/状态筛选)
auctionRouter.get(
  '/deals',
  requirePermission('auction:deal'),
  (req: AuthedRequest, res: Response) => {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.max(1, parseInt(String(req.query.pageSize ?? '10'), 10) || 10);
    const session_id = req.query.session_id
      ? parseInt(String(req.query.session_id), 10)
      : undefined;
    const status = String(req.query.status ?? '').trim();
    const keyword = String(req.query.keyword ?? '').trim();

    const where: string[] = [];
    const params: Array<string | number> = [];
    if (session_id && Number.isFinite(session_id)) {
      where.push('d.session_id = ?');
      params.push(session_id);
    }
    if (status) {
      where.push('d.status = ?');
      params.push(status);
    }
    if (keyword) {
      where.push('(d.buyer LIKE ? OR d.seller LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const total = (
      db.prepare(`SELECT COUNT(*) AS c FROM auction_deals d ${whereSql}`).get(...params) as {
        c: number;
      }
    ).c;

    const rows = db
      .prepare(
        `SELECT d.id, d.session_id, d.item_id, d.nft_asset_id, d.seller, d.buyer, d.final_price,
                d.status, d.deal_time, d.paid_time, d.delivered_at, d.created_at,
                s.name AS session_name, i.name AS item_name
         FROM auction_deals d
         LEFT JOIN auction_sessions s ON s.id = d.session_id
         LEFT JOIN auction_items i ON i.id = d.item_id
         ${whereSql}
         ORDER BY d.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, pageSize, (page - 1) * pageSize) as Array<
      AuctionDealRow & {
        session_name: string | null;
        item_name: string | null;
      }
    >;

    // 批量关联 NFT 资产简要
    const assetIds = rows
      .map((r) => r.nft_asset_id)
      .filter((id): id is number => id !== null);
    const assetMap = getNftAssetMap(assetIds);

    const list = rows.map((r) => ({
      ...r,
      status_label: DEAL_STATUS_LABEL[r.status] ?? r.status,
      nft_asset: r.nft_asset_id ? assetMap.get(r.nft_asset_id) ?? null : null,
    }));

    return ok(res, { list, total });
  }
);

// GET /api/auction/deals/:id - 成交详情(含竞价历史/时间线/拍品增强信息)
auctionRouter.get(
  '/deals/:id',
  requirePermission('auction:deal'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的成交单 ID');

    const deal = db
      .prepare(
        `SELECT d.id, d.session_id, d.item_id, d.nft_asset_id, d.seller, d.buyer, d.final_price,
                d.status, d.deal_time, d.paid_time, d.delivered_at, d.created_at,
                s.name AS session_name, i.name AS item_name, i.start_price AS item_start_price,
                i.increment AS item_increment, i.description AS item_description, i.image AS item_image
         FROM auction_deals d
         LEFT JOIN auction_sessions s ON s.id = d.session_id
         LEFT JOIN auction_items i ON i.id = d.item_id
         WHERE d.id = ?`
      )
      .get(id) as
      | (AuctionDealRow & {
          session_name: string | null;
          item_name: string | null;
          item_start_price: number | null;
          item_increment: number | null;
          item_description: string | null;
          item_image: string | null;
        })
      | undefined;
    if (!deal) return fail(res, 404, '成交单不存在');

    // 竞价历史(按出价金额倒序,取 Top 10)
    const bids = db
      .prepare(
        `SELECT id, bidder, bid_amount, created_at FROM auction_bids
         WHERE item_id = ? ORDER BY bid_amount DESC, id DESC LIMIT 10`
      )
      .all(deal.item_id) as Array<{ id: number; bidder: string; bid_amount: number; created_at: number }>;

    const bidCount = (db.prepare('SELECT COUNT(*) AS c FROM auction_bids WHERE item_id = ?').get(deal.item_id) as { c: number }).c;

    // 状态时间线(按成交状态构造)
    const timeline = buildDealTimeline(deal);

    return ok(res, {
      ...deal,
      status_label: DEAL_STATUS_LABEL[deal.status] ?? deal.status,
      nft_asset: getNftAssetBrief(deal.nft_asset_id),
      bids,
      bid_count: bidCount,
      timeline,
    });
  }
);

// 构造成交状态时间线(供详情页 Steps 组件消费)
function buildDealTimeline(deal: AuctionDealRow & { deal_time: number | null; paid_time: number | null; delivered_at: number | null; created_at: number }): Array<{
  status: string;
  label: string;
  time: number | null;
  done: boolean;
  current: boolean;
}> {
  const now = Date.now();
  const steps = [
    { status: DEAL_STATUS.PENDING_PAYMENT, label: '拍卖成交', time: deal.deal_time, fallbackTime: deal.created_at },
    { status: DEAL_STATUS.PAID, label: '确认付款', time: deal.paid_time, fallbackTime: null as number | null },
    { status: DEAL_STATUS.DELIVERING, label: '开始交割', time: deal.delivered_at, fallbackTime: null as number | null },
    { status: DEAL_STATUS.COMPLETED, label: '交割完成', time: deal.delivered_at, fallbackTime: null as number | null },
    { status: DEAL_STATUS.CANCELLED, label: '已取消', time: null as number | null, fallbackTime: null as number | null },
  ];
  const result: Array<{ status: string; label: string; time: number | null; done: boolean; current: boolean }> = [];
  let currentHit = false;
  for (const s of steps) {
    const isCurrent = deal.status === s.status;
    const done = isCurrent || (s.time != null && s.time <= now);
    if (s.status === DEAL_STATUS.CANCELLED && deal.status !== DEAL_STATUS.CANCELLED) continue;
    if (!currentHit && isCurrent) currentHit = true;
    result.push({
      status: s.status,
      label: s.label,
      time: s.time ?? s.fallbackTime,
      done,
      current: isCurrent || (!currentHit && !done && result.length > 0 && result[result.length - 1].done),
    });
  }
  return result;
}

// POST /api/auction/deals/:id/confirm-payment - 确认付款(待付款 → 已付款)
auctionRouter.post(
  '/deals/:id/confirm-payment',
  requirePermission('auction:deal'),
  auditMiddleware('auction', 'confirm_deal_payment'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的成交单 ID');

    const target = db.prepare('SELECT * FROM auction_deals WHERE id = ?').get(id) as
      | { id: number; status: string; buyer: string; seller: string }
      | undefined;
    if (!target) return fail(res, 404, '成交单不存在');

    res.locals.audit = {
      before: target,
      objectName: `成交单#${id}`,
      targetId: id,
      targetType: 'auction_deal',
    };

    if (target.status !== DEAL_STATUS.PENDING_PAYMENT) {
      return fail(res, 400, `当前状态【${DEAL_STATUS_LABEL[target.status]}】不可确认付款`);
    }

    db.prepare(
      'UPDATE auction_deals SET status = ?, paid_time = ? WHERE id = ?'
    ).run(DEAL_STATUS.PAID, Date.now(), id);

    return ok(res, null, '已确认付款');
  }
);

// POST /api/auction/deals/:id/confirm-delivery - 确认交割(已付款 → 待交割 → 已完成)
// 已付款 → 待交割(交付中),待交割 → 已完成
auctionRouter.post(
  '/deals/:id/confirm-delivery',
  requirePermission('auction:deal'),
  auditMiddleware('auction', 'confirm_deal_delivery'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的成交单 ID');

    const target = db.prepare('SELECT * FROM auction_deals WHERE id = ?').get(id) as
      | { id: number; status: string }
      | undefined;
    if (!target) return fail(res, 404, '成交单不存在');

    res.locals.audit = {
      before: target,
      objectName: `成交单#${id}`,
      targetId: id,
      targetType: 'auction_deal',
    };

    let nextStatus: string | null = null;
    if (target.status === DEAL_STATUS.PAID) {
      nextStatus = DEAL_STATUS.DELIVERING;
    } else if (target.status === DEAL_STATUS.DELIVERING) {
      nextStatus = DEAL_STATUS.COMPLETED;
    } else {
      return fail(
        res,
        400,
        `当前状态【${DEAL_STATUS_LABEL[target.status]}】不可确认交割`
      );
    }

    const updates: string[] = ['status = ?'];
    const params: Array<string | number> = [nextStatus];
    if (nextStatus === DEAL_STATUS.COMPLETED) {
      updates.push('delivered_at = ?');
      params.push(Date.now());
    }
    params.push(id);
    db.prepare(`UPDATE auction_deals SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const deliveryMsg =
      nextStatus === DEAL_STATUS.DELIVERING ? '已进入交割阶段' : '交割已完成';
    return ok(res, null, deliveryMsg);
  }
);

// POST /api/auction/deals/:id/cancel - 取消成交(待付款/已付款/待交割可取消)
auctionRouter.post(
  '/deals/:id/cancel',
  requirePermission('auction:deal'),
  auditMiddleware('auction', 'cancel_deal'),
  (req: AuthedRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return fail(res, 400, '无效的成交单 ID');

    const target = db.prepare('SELECT * FROM auction_deals WHERE id = ?').get(
      id
    ) as { id: number; status: string; item_id: number | null } | undefined;
    if (!target) return fail(res, 404, '成交单不存在');

    res.locals.audit = {
      before: target,
      objectName: `成交单#${id}`,
      targetId: id,
      targetType: 'auction_deal',
    };

    const cancellableStatus: string[] = [
      DEAL_STATUS.PENDING_PAYMENT,
      DEAL_STATUS.PAID,
      DEAL_STATUS.DELIVERING,
    ];
    if (!cancellableStatus.includes(target.status)) {
      return fail(res, 400, `当前状态【${DEAL_STATUS_LABEL[target.status]}】不可取消`);
    }

    const tx = db.transaction(() => {
      db.prepare('UPDATE auction_deals SET status = ? WHERE id = ?').run(
        DEAL_STATUS.CANCELLED,
        id
      );
      // 取消成交后,拍品回退为流拍
      if (target.item_id) {
        db.prepare('UPDATE auction_items SET status = ? WHERE id = ?').run(
          ITEM_STATUS.PASSED,
          target.item_id
        );
      }
    });
    tx();

    return ok(res, null, '成交已取消');
  }
);

export default auctionRouter;
