// 拍卖管理模块 - 数据库初始化(建表 + 示例数据)
// 由主 db.ts 在 initDatabase 末尾调用 initAuctionDb(db)
// 跨模块依赖:nft_assets(id, token_id, gene_profile_id, name, owner_name, status, contract_address, tx_hash) 由 NFT 模块维护
import type { Database } from '../../sqlite-compat';

// ============ 类型定义(供路由复用)============

// 拍卖场次
export interface AuctionSessionRow {
  id: number;
  name: string; // 场次名称
  status: string; // draft/pending/ongoing/ended/cancelled 草稿/未开始/进行中/已结束/已取消
  start_time: number | null; // 开始时间(毫秒时间戳)
  end_time: number | null; // 结束时间
  location: string | null; // 拍卖地点
  description: string | null; // 场次描述
  created_at: number;
  updated_at: number;
}

// 拍品(关联 NFT 资产)
export interface AuctionItemRow {
  id: number;
  session_id: number; // 所属场次
  nft_asset_id: number | null; // 关联 NFT 资产
  name: string; // 拍品名称
  description: string | null; // 拍品描述
  start_price: number; // 起拍价
  increment: number; // 加价幅度
  current_price: number; // 当前最高价
  current_bidder: string | null; // 当前最高出价人
  status: string; // pending/bidding/dealt/passed 待上架/拍卖中/已成交/流拍
  sort_order: number; // 排序
  created_at: number;
}

// 竞价记录
export interface AuctionBidRow {
  id: number;
  item_id: number; // 关联拍品
  bidder: string; // 出价人
  bid_amount: number; // 出价金额
  created_at: number;
}

// 成交单
export interface AuctionDealRow {
  id: number;
  session_id: number; // 所属场次
  item_id: number; // 关联拍品
  nft_asset_id: number | null; // 关联 NFT 资产
  seller: string; // 卖家
  buyer: string | null; // 买家
  final_price: number; // 成交价
  status: string; // pending_payment/paid/delivering/completed/cancelled 待付款/已付款/待交割/已完成/已取消
  deal_time: number | null; // 成交时间
  paid_time: number | null; // 付款时间
  delivered_at: number | null; // 交割时间
  created_at: number;
}

// ============ 状态枚举 ============

// 拍卖场次状态
export const SESSION_STATUS = {
  DRAFT: 'draft', // 草稿
  PENDING: 'pending', // 未开始
  ONGOING: 'ongoing', // 进行中
  ENDED: 'ended', // 已结束
  CANCELLED: 'cancelled', // 已取消
} as const;

// 拍品状态
export const ITEM_STATUS = {
  PENDING: 'pending', // 待上架
  BIDDING: 'bidding', // 拍卖中
  DEALT: 'dealt', // 已成交
  PASSED: 'passed', // 流拍
} as const;

// 成交单状态
export const DEAL_STATUS = {
  PENDING_PAYMENT: 'pending_payment', // 待付款
  PAID: 'paid', // 已付款
  DELIVERING: 'delivering', // 待交割
  COMPLETED: 'completed', // 已完成
  CANCELLED: 'cancelled', // 已取消
} as const;

// 初始化拍卖模块:建表 + 初始示例数据(幂等)
export function initAuctionDb(db: Database): void {
  // ============ 表结构 ============
  db.exec(`
    CREATE TABLE IF NOT EXISTS auction_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT '',                       -- 场次名称
      status TEXT NOT NULL DEFAULT 'draft',                -- draft/pending/ongoing/ended/cancelled
      start_time INTEGER,                                  -- 开始时间(毫秒时间戳)
      end_time INTEGER,                                    -- 结束时间
      location TEXT,                                       -- 拍卖地点
      description TEXT,                                    -- 场次描述
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS auction_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,                         -- 所属场次
      nft_asset_id INTEGER,                                -- 关联 NFT 资产
      name TEXT NOT NULL DEFAULT '',                       -- 拍品名称
      description TEXT,                                    -- 拍品描述
      start_price REAL NOT NULL DEFAULT 0,                 -- 起拍价
      increment REAL NOT NULL DEFAULT 0,                   -- 加价幅度
      current_price REAL NOT NULL DEFAULT 0,               -- 当前最高价
      current_bidder TEXT,                                 -- 当前最高出价人
      status TEXT NOT NULL DEFAULT 'pending',              -- pending/bidding/dealt/passed
      sort_order INTEGER NOT NULL DEFAULT 0,               -- 排序
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (session_id) REFERENCES auction_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (nft_asset_id) REFERENCES nft_assets(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS auction_bids (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,                            -- 关联拍品
      bidder TEXT NOT NULL DEFAULT '',                     -- 出价人
      bid_amount REAL NOT NULL DEFAULT 0,                  -- 出价金额
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (item_id) REFERENCES auction_items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS auction_deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,                         -- 所属场次
      item_id INTEGER NOT NULL,                            -- 关联拍品
      nft_asset_id INTEGER,                                -- 关联 NFT 资产
      seller TEXT NOT NULL DEFAULT '',                     -- 卖家
      buyer TEXT,                                          -- 买家
      final_price REAL NOT NULL DEFAULT 0,                 -- 成交价
      status TEXT NOT NULL DEFAULT 'pending_payment',      -- pending_payment/paid/delivering/completed/cancelled
      deal_time INTEGER,                                   -- 成交时间
      paid_time INTEGER,                                   -- 付款时间
      delivered_at INTEGER,                                -- 交割时间
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (session_id) REFERENCES auction_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES auction_items(id) ON DELETE CASCADE,
      FOREIGN KEY (nft_asset_id) REFERENCES nft_assets(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_auction_sessions_status ON auction_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_auction_items_session ON auction_items(session_id);
    CREATE INDEX IF NOT EXISTS idx_auction_items_status ON auction_items(status);
    CREATE INDEX IF NOT EXISTS idx_auction_items_asset ON auction_items(nft_asset_id);
    CREATE INDEX IF NOT EXISTS idx_auction_bids_item ON auction_bids(item_id);
    CREATE INDEX IF NOT EXISTS idx_auction_deals_session ON auction_deals(session_id);
    CREATE INDEX IF NOT EXISTS idx_auction_deals_status ON auction_deals(status);
    CREATE INDEX IF NOT EXISTS idx_auction_deals_item ON auction_deals(item_id);
  `);

  // ============ 初始示例数据(仅首次建库时写入)============
  const count = (db.prepare('SELECT COUNT(*) AS c FROM auction_sessions').get() as { c: number }).c;
  if (count > 0) return;

  // 跨模块查询 nft_assets 获取已上链资产(容错:若 NFT 表尚未初始化则跳过)
  let nftAssets: Array<{
    id: number;
    name: string;
    owner_name: string;
    status: string;
  }> = [];
  try {
    nftAssets = db
      .prepare(
        "SELECT id, name, owner_name, status FROM nft_assets WHERE status IN ('minted','approved') ORDER BY id ASC LIMIT 5"
      )
      .all() as Array<{ id: number; name: string; owner_name: string; status: string }>;
  } catch {
    // nft_assets 表可能尚未创建,容错跳过
    nftAssets = [];
  }

  const now = Date.now();
  const day = 86400000;

  const insertSession = db.prepare(
    `INSERT INTO auction_sessions
      (name, status, start_time, end_time, location, description)
     VALUES (@name, @status, @start_time, @end_time, @location, @description)`
  );

  const insertItem = db.prepare(
    `INSERT INTO auction_items
      (session_id, nft_asset_id, name, description, start_price, increment,
       current_price, current_bidder, status, sort_order)
     VALUES (@session_id, @nft_asset_id, @name, @description, @start_price, @increment,
             @current_price, @current_bidder, @status, @sort_order)`
  );

  const insertBid = db.prepare(
    `INSERT INTO auction_bids (item_id, bidder, bid_amount) VALUES (@item_id, @bidder, @bid_amount)`
  );

  const insertDeal = db.prepare(
    `INSERT INTO auction_deals
      (session_id, item_id, nft_asset_id, seller, buyer, final_price, status, deal_time, paid_time, delivered_at)
     VALUES (@session_id, @item_id, @nft_asset_id, @seller, @buyer, @final_price, @status, @deal_time, @paid_time, @delivered_at)`
  );

  const tx = db.transaction(() => {
    // 场次 1:进行中(2 件拍品,1 件拍卖中、1 件已成交)
    const s1 = insertSession.run({
      name: '2026 春季赛鸽 NFT 拍卖会',
      status: SESSION_STATUS.ONGOING,
      start_time: now - 3600000,
      end_time: now + 86400000,
      location: '线上拍卖大厅',
      description: '年度春季精选赛鸽 NFT 资产拍卖,涵盖多羽冠军血统纪念卡。',
    });
    const sid1 = s1.lastInsertRowid as number;

    // 拍品 1-1:拍卖中(关联 NFT 资产 1,若有)
    const asset1 = nftAssets[0];
    const item1 = insertItem.run({
      session_id: sid1,
      nft_asset_id: asset1?.id ?? null,
      name: asset1?.name ?? '苍穹一号·基因溯源纪念卡',
      description: '基于基因档案 CHN-2022-000001 铸造的链上数字资产,记录赛鸽血统与基因信息。',
      start_price: 1000,
      increment: 100,
      current_price: 1500,
      current_bidder: '李鸽友',
      status: ITEM_STATUS.BIDDING,
      sort_order: 1,
    });
    const itemId1 = item1.lastInsertRowid as number;
    // 竞价记录
    insertBid.run({ item_id: itemId1, bidder: '王鸽友', bid_amount: 1100 });
    insertBid.run({ item_id: itemId1, bidder: '李鸽友', bid_amount: 1500 });

    // 拍品 1-2:已成交
    const asset2 = nftAssets[1];
    const item2 = insertItem.run({
      session_id: sid1,
      nft_asset_id: asset2?.id ?? null,
      name: asset2?.name ?? '雪羽·数字藏品',
      description: '基于基因档案 CHN-2022-000002 铸造的数字藏品。',
      start_price: 800,
      increment: 50,
      current_price: 1200,
      current_bidder: '赵鸽友',
      status: ITEM_STATUS.DEALT,
      sort_order: 2,
    });
    const itemId2 = item2.lastInsertRowid as number;
    insertBid.run({ item_id: itemId2, bidder: '赵鸽友', bid_amount: 1200 });
    // 成交单
    insertDeal.run({
      session_id: sid1,
      item_id: itemId2,
      nft_asset_id: asset2?.id ?? null,
      seller: asset2?.owner_name ?? '平台',
      buyer: '赵鸽友',
      final_price: 1200,
      status: DEAL_STATUS.PENDING_PAYMENT,
      deal_time: now - 1800000,
      paid_time: null,
      delivered_at: null,
    });

    // 场次 2:未开始(1 件待上架拍品)
    const s2 = insertSession.run({
      name: '2026 夏季精选拍卖专场',
      status: SESSION_STATUS.PENDING,
      start_time: now + 7 * day,
      end_time: now + 8 * day,
      location: '线上拍卖大厅',
      description: '夏季精选赛鸽 NFT 资产拍卖专场,敬请期待。',
    });
    const sid2 = s2.lastInsertRowid as number;

    const asset3 = nftAssets[2];
    insertItem.run({
      session_id: sid2,
      nft_asset_id: asset3?.id ?? null,
      name: asset3?.name ?? '苍穹二号·冠军纪念',
      description: '基于基因档案 CHN-2023-000003 铸造的冠军纪念数字资产。',
      start_price: 2000,
      increment: 200,
      current_price: 2000,
      current_bidder: null,
      status: ITEM_STATUS.PENDING,
      sort_order: 1,
    });

    // 场次 3:草稿
    insertSession.run({
      name: '2026 秋季拍卖会(筹备中)',
      status: SESSION_STATUS.DRAFT,
      start_time: null,
      end_time: null,
      location: '',
      description: '场次筹备中,待完善信息后发布。',
    });
  });
  tx();

  // eslint-disable-next-line no-console
  console.log('[DB] 拍卖管理模块:示例数据已初始化');
}

export default { initAuctionDb, SESSION_STATUS, ITEM_STATUS, DEAL_STATUS };
