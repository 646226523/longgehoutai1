// 检测预约管理模块 - 数据库初始化(建表 + 示例数据)
// 由主 db.ts 在 initDatabase 末尾调用 initDetectionDb(db)
// 包含:检测机构表、检测预约订单表、检测报告表
// 跨模块依赖:检测报告关联基因档案表 gene_profiles(已存在,运行时 SQL 查询 + try/catch 容错)
import type { Database } from '../../sqlite-compat';

// 订单状态枚举(与前端保持一致)
// pending 待确认 / confirmed 已确认 / scheduled 已排期 / completed 已完成 / cancelled 已取消
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

// 机构状态:1 合作中 0 停用
export const ORG_STATUS = {
  ACTIVE: 1,
  DISABLED: 0,
} as const;

// 安全查询基因档案表是否存在(跨模块容错)
function geneProfilesTableExists(db: Database): boolean {
  try {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='gene_profiles'")
      .get() as { name: string } | undefined;
    return !!row;
  } catch {
    return false;
  }
}

// 初始化检测预约模块:建表 + 初始示例数据(幂等)
export function initDetectionDb(db: Database): void {
  // ============ 表结构 ============
  db.exec(`
    CREATE TABLE IF NOT EXISTS detection_orgs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,                         -- 机构名称
      code TEXT NOT NULL DEFAULT '',              -- 机构编码
      contact TEXT,                               -- 联系人
      phone TEXT,                                 -- 联系电话
      address TEXT,                               -- 机构地址
      location TEXT,                              -- 经纬度(JSON: {"lng":x,"lat":y,"address":"..."})
      qualification TEXT,                         -- 资质信息
      projects TEXT NOT NULL DEFAULT '',          -- 可检项目(逗号分隔)
      status INTEGER NOT NULL DEFAULT 1,          -- 1 合作中 0 停用
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS detection_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL UNIQUE,              -- 订单号(唯一)
      user_name TEXT NOT NULL DEFAULT '',         -- 预约人姓名
      phone TEXT,                                 -- 预约人电话
      gene_profile_id INTEGER,                    -- 关联鸽只基因档案(可空)
      ring_number TEXT NOT NULL DEFAULT '',       -- 足环号(冗余,便于检索)
      test_org TEXT NOT NULL DEFAULT '',          -- 检测机构名称(冗余,便于展示)
      org_id INTEGER,                             -- 关联机构 ID(可空)
      project TEXT NOT NULL DEFAULT '',           -- 检测项目
      scheduled_date TEXT,                        -- 预约/排期日期(YYYY-MM-DD)
      status TEXT NOT NULL DEFAULT 'pending',     -- 状态 pending/confirmed/scheduled/completed/cancelled
      remark TEXT,                                -- 备注
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS detection_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,                           -- 关联检测订单(可空)
      gene_profile_id INTEGER,                    -- 关联鸽只基因档案(可空)
      report_no TEXT NOT NULL DEFAULT '',         -- 报告编号
      test_org TEXT NOT NULL DEFAULT '',          -- 检测机构
      project TEXT NOT NULL DEFAULT '',           -- 检测项目
      result TEXT,                                -- 检测结果
      report_url TEXT,                            -- 报告文件 URL
      test_date TEXT,                             -- 检测日期(YYYY-MM-DD)
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE INDEX IF NOT EXISTS idx_detection_orders_status ON detection_orders(status);
    CREATE INDEX IF NOT EXISTS idx_detection_orders_scheduled ON detection_orders(scheduled_date);
    CREATE INDEX IF NOT EXISTS idx_detection_orders_user ON detection_orders(user_name);
    CREATE INDEX IF NOT EXISTS idx_detection_orders_gene ON detection_orders(gene_profile_id);
    CREATE INDEX IF NOT EXISTS idx_detection_orgs_status ON detection_orgs(status);
    CREATE INDEX IF NOT EXISTS idx_detection_reports_order ON detection_reports(order_id);
    CREATE INDEX IF NOT EXISTS idx_detection_reports_gene ON detection_reports(gene_profile_id);
  `);

  // ============ 迁移:为 detection_orgs 添加 location 列 ============
  try {
    const colCheck = db
      .prepare("SELECT COUNT(*) AS c FROM pragma_table_info('detection_orgs') WHERE name='location'")
      .get() as { c: number };
    if (colCheck.c === 0) {
      db.exec('ALTER TABLE detection_orgs ADD COLUMN location TEXT');
      // eslint-disable-next-line no-console
      console.log('[DB] detection_orgs 表已添加 location 列');
    }
  } catch {
    // 忽略迁移错误(可能表不存在等)
  }

  // ============ 初始示例数据(仅首次建库时写入)============
  const orgCount = (db.prepare('SELECT COUNT(*) AS c FROM detection_orgs').get() as { c: number }).c;
  if (orgCount > 0) return;

  const insertOrg = db.prepare(
    `INSERT INTO detection_orgs (name, code, contact, phone, address, location, qualification, projects, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const orgs: Array<[string, string, string, string, string, string | null, string, string, number]> = [
    [
      '中国信鸽基因检测中心',
      'CGG-001',
      '王博士',
      '010-88880001',
      '北京市朝阳区科技园 8 号',
      '{"lng":116.481,"lat":39.992,"address":"北京市朝阳区科技园8号"}',
      'CMA 检测资质认证 / ISO 17025',
      'DNA 检测,性别鉴定,疾病检测',
      1,
    ],
    [
      '华大鸽业检测实验室',
      'BGI-002',
      '李工程师',
      '0755-66660002',
      '深圳市盐田区基因产业园',
      '{"lng":114.238,"lat":22.553,"address":"深圳市盐田区基因产业园"}',
      'CNAS 认可实验室',
      'DNA 检测,疾病检测',
      1,
    ],
    [
      '上海赛鸽健康检测所',
      'SHG-003',
      '张主任',
      '021-55550003',
      '上海市浦东新区张江高科',
      '{"lng":121.597,"lat":31.214,"address":"上海市浦东新区张江高科"}',
      'CMA 认证',
      '性别鉴定,疾病检测',
      0,
    ],
  ];

  const insertOrder = db.prepare(
    `INSERT INTO detection_orders
      (order_no, user_name, phone, gene_profile_id, ring_number, test_org, org_id, project,
       scheduled_date, status, remark)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const orders: Array<[string, string, string, number | null, string, string, number | null, string, string | null, string, string]> = [
    [
      'DT20240601001',
      '李建国',
      '13800000001',
      3,
      'CHN-2023-000003',
      '中国信鸽基因检测中心',
      1,
      'DNA 检测',
      '2024-06-15',
      'scheduled',
      '需加急出具报告',
    ],
    [
      'DT20240602002',
      '王秀兰',
      '13800000002',
      2,
      'CHN-2022-000002',
      '华大鸽业检测实验室',
      2,
      '性别鉴定',
      null,
      'pending',
      '',
    ],
    [
      'DT20240603003',
      '张三',
      '13900000088',
      null,
      'CHN-2024-000888',
      '中国信鸽基因检测中心',
      1,
      '疾病检测',
      '2024-06-20',
      'confirmed',
      '待排期',
    ],
  ];

  const insertReport = db.prepare(
    `INSERT INTO detection_reports
      (order_id, gene_profile_id, report_no, test_org, project, result, report_url, test_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const reports: Array<[number | null, number | null, string, string, string, string, string, string]> = [
    [
      1,
      3,
      'RPT-DT-2024-0001',
      '中国信鸽基因检测中心',
      'DNA 检测',
      '样本基因序列与父本 CHN-2022-000001 亲缘概率 99.8%,确认为父子关系',
      '',
      '2024-06-15',
    ],
  ];

  const tx = db.transaction(() => {
    orgs.forEach((o) => insertOrg.run(...o));
    orders.forEach((o) => insertOrder.run(...o));
    reports.forEach((r) => insertReport.run(...r));
  });
  tx();

  // eslint-disable-next-line no-console
  console.log('[DB] 检测预约管理模块:示例数据已初始化');
}

// 跨模块辅助:安全查询基因档案简要信息(足环号/鸽名/鸽主)
// 若 gene_profiles 表不存在或查询失败,返回 null,不影响本模块主流程
export function safeGetGeneProfileBrief(
  db: Database,
  profileId: number
): { id: number; ring_number: string; name: string; owner_name: string } | null {
  if (!geneProfilesTableExists(db)) return null;
  try {
    const row = db
      .prepare('SELECT id, ring_number, name, owner_name FROM gene_profiles WHERE id = ?')
      .get(profileId) as
      | { id: number; ring_number: string; name: string; owner_name: string }
      | undefined;
    return row ?? null;
  } catch {
    return null;
  }
}

export default { initDetectionDb, ORDER_STATUS, ORG_STATUS, safeGetGeneProfileBrief };
