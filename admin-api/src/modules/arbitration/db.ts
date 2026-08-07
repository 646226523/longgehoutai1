// 仲裁管理模块 - 数据库初始化(建表 + 示例数据)
// 由主 db.ts 在 initDatabase 末尾调用 initArbitrationDb(db)
// 跨模块依赖:auction_deals(id, session_id, item_id, nft_asset_id, seller, buyer, final_price, status) 由拍卖模块维护
import type { Database } from '../../sqlite-compat';

// ============ 类型定义(供路由复用)============

// 仲裁案件
export interface ArbitrationCaseRow {
  id: number;
  case_no: string; // 案件号
  type: string; // 纠纷类型 auction/trade/other 拍卖纠纷/交易纠纷/其他
  related_deal_id: number | null; // 关联成交单(可空)
  complainant: string; // 申诉人
  respondent: string; // 被诉人
  amount: number; // 争议金额
  description: string | null; // 问题描述
  status: string; // pending/accepted/hearing/ruled/archived 待受理/已立案/审理中/已裁决/已归档
  acceptor_id: number | null; // 受理人(admin_user_id)
  accepted_at: number | null; // 立案时间
  created_at: number;
  updated_at: number;
}

// 证据材料
export interface ArbitrationEvidenceRow {
  id: number;
  case_id: number; // 关联案件
  party: string; // 提交方 complainant/respondent
  title: string; // 证据名称
  file_url: string; // 文件 URL
  file_type: string; // image/document/video 图片/文档/视频
  description: string | null; // 证据描述
  created_at: number;
}

// 仲裁裁决
export interface ArbitrationAwardRow {
  id: number;
  case_id: number; // 关联案件
  arbitrator_id: number | null; // 裁决人(admin_user_id)
  ruling: string; // 裁决结果(TEXT)
  action: string; // 执行动作 refund/force_deliver/other 退款/强制交割/其他
  execute_status: string; // pending/executing/executed 待执行/执行中/已执行
  award_time: number | null; // 裁决时间
  created_at: number;
}

// ============ 状态枚举 ============

// 案件状态
export const CASE_STATUS = {
  PENDING: 'pending', // 待受理
  ACCEPTED: 'accepted', // 已立案
  HEARING: 'hearing', // 审理中
  RULED: 'ruled', // 已裁决
  ARCHIVED: 'archived', // 已归档
} as const;

// 纠纷类型
export const CASE_TYPE = {
  AUCTION: 'auction', // 拍卖纠纷
  TRADE: 'trade', // 交易纠纷
  OTHER: 'other', // 其他
} as const;

// 证据提交方
export const EVIDENCE_PARTY = {
  COMPLAINANT: 'complainant', // 申诉人
  RESPONDENT: 'respondent', // 被诉人
} as const;

// 证据文件类型
export const EVIDENCE_FILE_TYPE = {
  IMAGE: 'image', // 图片
  DOCUMENT: 'document', // 文档
  VIDEO: 'video', // 视频
} as const;

// 裁决执行动作
export const AWARD_ACTION = {
  REFUND: 'refund', // 退款
  FORCE_DELIVER: 'force_deliver', // 强制交割
  OTHER: 'other', // 其他
} as const;

// 裁决执行状态
export const AWARD_EXECUTE_STATUS = {
  PENDING: 'pending', // 待执行
  EXECUTING: 'executing', // 执行中
  EXECUTED: 'executed', // 已执行
} as const;

// 初始化仲裁模块:建表 + 初始示例数据(幂等)
export function initArbitrationDb(db: Database): void {
  // ============ 表结构 ============
  db.exec(`
    CREATE TABLE IF NOT EXISTS arbitration_cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_no TEXT NOT NULL UNIQUE,                       -- 案件号
      type TEXT NOT NULL DEFAULT 'other',                 -- auction/trade/other
      related_deal_id INTEGER,                            -- 关联成交单 ID(可空)
      complainant TEXT NOT NULL DEFAULT '',               -- 申诉人
      respondent TEXT NOT NULL DEFAULT '',                -- 被诉人
      amount REAL NOT NULL DEFAULT 0,                     -- 争议金额
      description TEXT,                                   -- 问题描述
      status TEXT NOT NULL DEFAULT 'pending',             -- pending/accepted/hearing/ruled/archived
      acceptor_id INTEGER,                                -- 受理人(admin_user_id)
      accepted_at INTEGER,                                -- 立案时间
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (related_deal_id) REFERENCES auction_deals(id) ON DELETE SET NULL,
      FOREIGN KEY (acceptor_id) REFERENCES admin_users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS arbitration_evidence (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id INTEGER NOT NULL,                           -- 关联案件
      party TEXT NOT NULL DEFAULT 'complainant',          -- complainant/respondent
      title TEXT NOT NULL DEFAULT '',                     -- 证据名称
      file_url TEXT NOT NULL DEFAULT '',                  -- 文件 URL
      file_type TEXT NOT NULL DEFAULT 'document',         -- image/document/video
      description TEXT,                                   -- 证据描述
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (case_id) REFERENCES arbitration_cases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS arbitration_awards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id INTEGER NOT NULL,                           -- 关联案件
      arbitrator_id INTEGER,                              -- 裁决人(admin_user_id)
      ruling TEXT NOT NULL DEFAULT '',                    -- 裁决结果
      action TEXT NOT NULL DEFAULT 'other',               -- refund/force_deliver/other
      execute_status TEXT NOT NULL DEFAULT 'pending',     -- pending/executing/executed
      award_time INTEGER,                                 -- 裁决时间
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (case_id) REFERENCES arbitration_cases(id) ON DELETE CASCADE,
      FOREIGN KEY (arbitrator_id) REFERENCES admin_users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_arbitration_cases_status ON arbitration_cases(status);
    CREATE INDEX IF NOT EXISTS idx_arbitration_cases_type ON arbitration_cases(type);
    CREATE INDEX IF NOT EXISTS idx_arbitration_cases_deal ON arbitration_cases(related_deal_id);
    CREATE INDEX IF NOT EXISTS idx_arbitration_evidence_case ON arbitration_evidence(case_id);
    CREATE INDEX IF NOT EXISTS idx_arbitration_awards_case ON arbitration_awards(case_id);
    CREATE INDEX IF NOT EXISTS idx_arbitration_awards_execute ON arbitration_awards(execute_status);
  `);

  // ============ 初始示例数据(仅首次建库时写入)============
  const count = (db.prepare('SELECT COUNT(*) AS c FROM arbitration_cases').get() as { c: number })
    .c;
  if (count > 0) return;

  // 跨模块查询 auction_deals 获取关联成交单(容错:若拍卖表尚未初始化则跳过)
  let dealBriefs: Array<{
    id: number;
    session_name: string | null;
    item_name: string | null;
    buyer: string | null;
    seller: string;
    final_price: number;
    status: string;
  }> = [];
  try {
    dealBriefs = db
      .prepare(
        `SELECT d.id, d.buyer, d.seller, d.final_price, d.status,
                s.name AS session_name, i.name AS item_name
         FROM auction_deals d
         LEFT JOIN auction_sessions s ON s.id = d.session_id
         LEFT JOIN auction_items i ON i.id = d.item_id
         ORDER BY d.id ASC LIMIT 5`
      )
      .all() as Array<{
      id: number;
      session_name: string | null;
      item_name: string | null;
      buyer: string | null;
      seller: string;
      final_price: number;
      status: string;
    }>;
  } catch {
    // auction_deals 表可能尚未创建,容错跳过
    dealBriefs = [];
  }

  const now = Date.now();
  // 案件号格式:ARB-YYYYMMDD-XXXX
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  const insertCase = db.prepare(
    `INSERT INTO arbitration_cases
      (case_no, type, related_deal_id, complainant, respondent, amount, description, status, accepted_at)
     VALUES (@case_no, @type, @related_deal_id, @complainant, @respondent, @amount, @description, @status, @accepted_at)`
  );

  const insertEvidence = db.prepare(
    `INSERT INTO arbitration_evidence
      (case_id, party, title, file_url, file_type, description)
     VALUES (@case_id, @party, @title, @file_url, @file_type, @description)`
  );

  const insertAward = db.prepare(
    `INSERT INTO arbitration_awards
      (case_id, arbitrator_id, ruling, action, execute_status, award_time)
     VALUES (@case_id, @arbitrator_id, @ruling, @action, @execute_status, @award_time)`
  );

  const tx = db.transaction(() => {
    // 案件 1:待受理(关联成交单 1,若有)
    const deal1 = dealBriefs[0];
    const c1 = insertCase.run({
      case_no: `ARB-${dateStr}-0001`,
      type: CASE_TYPE.AUCTION,
      related_deal_id: deal1?.id ?? null,
      complainant: deal1?.buyer ?? '赵鸽友',
      respondent: deal1?.seller ?? '平台',
      amount: deal1?.final_price ?? 1200,
      description:
        '拍品交付后买家反映 NFT 资产元数据与拍品描述不符,要求退款。卖家拒绝,申请仲裁。',
      status: CASE_STATUS.PENDING,
      accepted_at: null,
    });
    const caseId1 = c1.lastInsertRowid as number;
    insertEvidence.run({
      case_id: caseId1,
      party: 'complainant',
      title: '拍品描述截图',
      file_url: 'https://example.com/evidence/item-desc-001.png',
      file_type: EVIDENCE_FILE_TYPE.IMAGE,
      description: '拍卖时的拍品描述页面截图,显示元数据为詹森老麦克斯系。',
    });
    insertEvidence.run({
      case_id: caseId1,
      party: 'respondent',
      title: '链上元数据凭证',
      file_url: 'https://example.com/evidence/chain-meta-001.pdf',
      file_type: EVIDENCE_FILE_TYPE.DOCUMENT,
      description: 'NFT 链上元数据 PDF,显示实际血统信息。',
    });

    // 案件 2:审理中(关联成交单 2,若有)
    const deal2 = dealBriefs[1] ?? deal1;
    const c2 = insertCase.run({
      case_no: `ARB-${dateStr}-0002`,
      type: CASE_TYPE.TRADE,
      related_deal_id: deal2?.id ?? null,
      complainant: '王鸽友',
      respondent: '李鸽友',
      amount: 3000,
      description: '线下赛鸽交易纠纷,买家反映鸽子健康状态与卖家承诺不符,要求部分退款。',
      status: CASE_STATUS.HEARING,
      accepted_at: now - 3 * 86400000,
    });
    const caseId2 = c2.lastInsertRowid as number;
    insertEvidence.run({
      case_id: caseId2,
      party: 'complainant',
      title: '健康检测报告',
      file_url: 'https://example.com/evidence/health-report-002.pdf',
      file_type: EVIDENCE_FILE_TYPE.DOCUMENT,
      description: '第三方机构出具的赛鸽健康检测报告。',
    });

    // 案件 3:已裁决(已作出裁决,待执行)
    const c3 = insertCase.run({
      case_no: `ARB-${dateStr}-0003`,
      type: CASE_TYPE.AUCTION,
      related_deal_id: null,
      complainant: '孙鸽友',
      respondent: '周鸽友',
      amount: 800,
      description: '拍卖成交后卖家迟迟不交付 NFT 资产,买家申请强制交割。',
      status: CASE_STATUS.RULED,
      accepted_at: now - 7 * 86400000,
    });
    const caseId3 = c3.lastInsertRowid as number;
    insertEvidence.run({
      case_id: caseId3,
      party: 'complainant',
      title: '付款凭证',
      file_url: 'https://example.com/evidence/payment-003.png',
      file_type: EVIDENCE_FILE_TYPE.IMAGE,
      description: '拍卖成交付款凭证截图。',
    });
    insertAward.run({
      case_id: caseId3,
      arbitrator_id: null,
      ruling: '裁定卖家限期 3 个工作日内完成 NFT 资产交割,否则按成交价 120% 退款。',
      action: AWARD_ACTION.FORCE_DELIVER,
      execute_status: AWARD_EXECUTE_STATUS.PENDING,
      award_time: now - 86400000,
    });
  });
  tx();

  // eslint-disable-next-line no-console
  console.log('[DB] 仲裁管理模块:示例数据已初始化');
}

export default {
  initArbitrationDb,
  CASE_STATUS,
  CASE_TYPE,
  EVIDENCE_PARTY,
  EVIDENCE_FILE_TYPE,
  AWARD_ACTION,
  AWARD_EXECUTE_STATUS,
};
