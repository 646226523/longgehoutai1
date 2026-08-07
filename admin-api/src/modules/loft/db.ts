// 公棚管理模块 - 数据库初始化
// 建表:loft_applications(入驻申请)、lofts(公棚信息)、loft_pigeons(存棚鸽只)
// 跨模块依赖:存棚鸽只关联 gene_profiles(ring_number、id),由基因模块创建,运行时查询即可

import { Database } from '../../sqlite-compat';

type DB = Database;

// 公棚入驻申请状态:pending 待审 / approved 通过 / rejected 驳回
export const APPLICATION_STATUS = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
} as const;

// 存棚鸽只状态:in 在棚 / out 已出棚
export const PIGEON_STATUS = {
  in: 'in',
  out: 'out',
} as const;

// 初始化公棚管理模块数据库:建表 + 示例数据(幂等)
export function initLoftDb(db: DB): void {
  // 1. 公棚入驻申请表
  db.exec(`
    CREATE TABLE IF NOT EXISTS loft_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loft_name TEXT NOT NULL,                          -- 公棚名称
      applicant_name TEXT NOT NULL,                     -- 申请人姓名
      phone TEXT NOT NULL,                              -- 联系电话
      id_card TEXT,                                    -- 身份证号
      qualification TEXT,                              -- 资质说明
      site_proof TEXT,                                 -- 场地证明URL
      capacity INTEGER,                                -- 容量(羽)
      address TEXT,                                    -- 公棚地址
      status TEXT NOT NULL DEFAULT 'pending',          -- pending/approved/rejected
      audit_remark TEXT,                               -- 审核备注(驳回理由等)
      auditor_id INTEGER,                              -- 审核人ID
      audited_at INTEGER,                              -- 审核时间(毫秒)
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );
  `);

  // 2. 公棚信息表(审核通过后创建)
  db.exec(`
    CREATE TABLE IF NOT EXISTS lofts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,                              -- 公棚名称
      code TEXT NOT NULL UNIQUE,                       -- 公棚编码(自动生成,唯一)
      applicant_name TEXT,                             -- 负责人姓名
      phone TEXT,                                      -- 联系电话
      address TEXT,                                    -- 公棚地址
      capacity INTEGER,                                -- 容量(羽)
      location TEXT,                                    -- 经纬度(JSON 文本,如 {"lng":116.4,"lat":39.9})
      status INTEGER NOT NULL DEFAULT 1,               -- 1 营业中 / 0 停业
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );
  `);

  // 3. 存棚鸽只表(入棚登记)
  db.exec(`
    CREATE TABLE IF NOT EXISTS loft_pigeons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loft_id INTEGER NOT NULL,                        -- 所属公棚ID
      ring_number TEXT NOT NULL,                      -- 足环号
      gene_profile_id INTEGER,                        -- 关联基因档案ID(关联 gene_profiles.id)
      in_time INTEGER,                                 -- 入棚时间(毫秒)
      out_time INTEGER,                                -- 出棚时间(毫秒)
      status TEXT NOT NULL DEFAULT 'in',              -- in 在棚 / out 已出棚
      remark TEXT,                                     -- 备注
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (loft_id) REFERENCES lofts(id) ON DELETE CASCADE
    );
  `);

  // 4. 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_loft_applications_status ON loft_applications(status);
    CREATE INDEX IF NOT EXISTS idx_loft_applications_created ON loft_applications(created_at);
    CREATE INDEX IF NOT EXISTS idx_lofts_status ON lofts(status);
    CREATE INDEX IF NOT EXISTS idx_loft_pigeons_loft ON loft_pigeons(loft_id);
    CREATE INDEX IF NOT EXISTS idx_loft_pigeons_status ON loft_pigeons(status);
    CREATE INDEX IF NOT EXISTS idx_loft_pigeons_ring ON loft_pigeons(ring_number);
  `);

  // 5. 插入示例数据(幂等:仅在表为空时插入)
  seedLoftData(db);
}

// 插入示例数据
function seedLoftData(db: DB): void {
  // 入驻申请示例(仅当表为空时插入)
  const appCount = (db.prepare('SELECT COUNT(*) AS c FROM loft_applications').get() as { c: number }).c;
  if (appCount === 0) {
    const insertApp = db.prepare(
      `INSERT INTO loft_applications
       (loft_name, applicant_name, phone, id_card, qualification, site_proof, capacity, address, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    insertApp.run(
      '北方赛鸽公棚',
      '张建国',
      '13800001111',
      '110101198001011234',
      '信鸽协会会员单位',
      'https://example.com/site-proof/north.pdf',
      5000,
      '河北省廊坊市广阳区赛鸽路1号',
      'pending',
      now - day * 2
    );
    insertApp.run(
      '江南天落公棚',
      '李秀兰',
      '13900002222',
      '320102198505056789',
      '省级公棚资质',
      'https://example.com/site-proof/jiangnan.pdf',
      8000,
      '江苏省苏州市吴中区太湖大道88号',
      'pending',
      now - day
    );
    insertApp.run(
      '云岭高原公棚',
      '王大山',
      '13700003333',
      '530111199003031234',
      '地方信鸽协会会员',
      'https://example.com/site-proof/yunling.pdf',
      3000,
      '云南省昆明市西山区滇池路168号',
      'approved',
      now - day * 5
    );
  }

  // 公棚信息示例(仅当表为空时插入)
  const loftCount = (db.prepare('SELECT COUNT(*) AS c FROM lofts').get() as { c: number }).c;
  if (loftCount === 0) {
    const insertLoft = db.prepare(
      `INSERT INTO lofts
       (name, code, applicant_name, phone, address, capacity, location, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const now = Date.now();
    insertLoft.run(
      '云岭高原公棚',
      'LOFT-DEMO-0001',
      '王大山',
      '13700003333',
      '云南省昆明市西山区滇池路168号',
      3000,
      JSON.stringify({ lng: 102.712251, lat: 24.921842 }),
      1,
      now,
      now
    );
    insertLoft.run(
      '东海飞翔公棚',
      'LOFT-DEMO-0002',
      '赵海风',
      '13600004444',
      '浙江省宁波市鄞州区滨海路66号',
      6000,
      JSON.stringify({ lng: 121.54972, lat: 29.82338 }),
      1,
      now,
      now
    );
  }

  // 存棚鸽只示例(仅当表为空时插入)
  const pigeonCount = (db.prepare('SELECT COUNT(*) AS c FROM loft_pigeons').get() as { c: number }).c;
  if (pigeonCount === 0) {
    const insertPigeon = db.prepare(
      `INSERT INTO loft_pigeons
       (loft_id, ring_number, gene_profile_id, in_time, out_time, status, remark, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    // 关联第一个公棚(id 通常为 1)
    const firstLoft = db.prepare('SELECT id FROM lofts ORDER BY id ASC LIMIT 1').get() as { id: number } | undefined;
    const loftId = firstLoft?.id ?? 1;
    insertPigeon.run(loftId, 'CHN-2024-000001', null, now - day * 10, null, 'in', '示例入棚鸽只', now);
    insertPigeon.run(loftId, 'CHN-2024-000002', null, now - day * 8, null, 'in', '', now);
    insertPigeon.run(loftId, 'CHN-2024-000003', null, now - day * 20, now - day * 2, 'out', '已出棚', now);
  }
}

export default { initLoftDb, APPLICATION_STATUS, PIGEON_STATUS };
