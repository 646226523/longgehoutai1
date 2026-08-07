// 基因信息管理模块 - 数据库初始化(建表 + 示例数据)
// 由主 db.ts 在 initDatabase 末尾调用 initGeneDb(db)
import type { Database } from '../../sqlite-compat';

// 溯源二维码内容生成:详情访问 URL(含编码 token)
// token = base64url(`gp:{profileId}:{ringNumber}`),不可枚举
export function generateTraceUrl(profileId: number, ringNumber: string): string {
  const payload = `gp:${profileId}:${ringNumber}`;
  const token = Buffer.from(payload, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `https://trace.longge-pigeon.com/g/${token}`;
}

// 初始化基因模块:建表 + 初始示例数据(幂等)
export function initGeneDb(db: Database): void {
  // ============ 表结构 ============
  db.exec(`
    CREATE TABLE IF NOT EXISTS gene_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ring_number TEXT NOT NULL UNIQUE,          -- 足环号(唯一)
      name TEXT NOT NULL DEFAULT '',             -- 鸽名
      gender TEXT NOT NULL DEFAULT 'unknown',    -- 性别 male/female/unknown
      breed TEXT NOT NULL DEFAULT '',            -- 品种
      bloodline TEXT NOT NULL DEFAULT '',        -- 血统
      owner_name TEXT NOT NULL DEFAULT '',       -- 鸽主姓名
      owner_phone TEXT,                          -- 鸽主电话
      color TEXT,                                -- 羽色
      eye_color TEXT,                            -- 眼砂
      birth_date TEXT,                           -- 出生日期(YYYY-MM-DD)
      gene_sequence TEXT,                        -- 基因序列数据
      qr_code TEXT,                              -- 溯源二维码内容(URL)
      photo_url TEXT,                            -- 鸽只照片
      status INTEGER NOT NULL DEFAULT 1,         -- 档案状态 1 正常 0 停用
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS gene_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gene_profile_id INTEGER NOT NULL,          -- 关联基因档案
      test_org TEXT NOT NULL DEFAULT '',         -- 检测机构
      project TEXT NOT NULL DEFAULT '',          -- 检测项目
      report_no TEXT,                            -- 报告编号
      result TEXT,                               -- 检测结果
      report_url TEXT,                           -- 报告文件 URL
      test_date TEXT,                            -- 检测日期
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (gene_profile_id) REFERENCES gene_profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS gene_manual_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ring_number TEXT NOT NULL,                 -- 足环号
      name TEXT NOT NULL DEFAULT '',             -- 鸽名
      gender TEXT NOT NULL DEFAULT 'unknown',    -- 性别
      breed TEXT NOT NULL DEFAULT '',            -- 品种
      bloodline TEXT NOT NULL DEFAULT '',        -- 血统
      owner_name TEXT NOT NULL DEFAULT '',       -- 鸽主
      owner_phone TEXT,                          -- 鸽主电话
      color TEXT,                                -- 羽色
      eye_color TEXT,                            -- 眼砂
      birth_date TEXT,                           -- 出生日期
      submitter_name TEXT,                       -- 提交人姓名
      submitter_phone TEXT,                      -- 提交人电话
      status TEXT NOT NULL DEFAULT 'pending',    -- 状态 pending/approved/rejected
      audit_remark TEXT,                         -- 审核备注(驳回理由)
      auditor_id INTEGER,                        -- 审核人 ID
      audited_at INTEGER,                        -- 审核时间
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (auditor_id) REFERENCES admin_users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS gene_lineage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gene_profile_id INTEGER NOT NULL UNIQUE,   -- 鸽只档案 ID(一对一)
      sire_id INTEGER,                           -- 父 ID
      dam_id INTEGER,                            -- 母 ID
      FOREIGN KEY (gene_profile_id) REFERENCES gene_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (sire_id) REFERENCES gene_profiles(id) ON DELETE SET NULL,
      FOREIGN KEY (dam_id) REFERENCES gene_profiles(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_gene_profiles_ring ON gene_profiles(ring_number);
    CREATE INDEX IF NOT EXISTS idx_gene_profiles_owner ON gene_profiles(owner_name);
    CREATE INDEX IF NOT EXISTS idx_gene_profiles_status ON gene_profiles(status);
    CREATE INDEX IF NOT EXISTS idx_gene_tests_profile ON gene_tests(gene_profile_id);
    CREATE INDEX IF NOT EXISTS idx_gene_submissions_status ON gene_manual_submissions(status);
  `);

  // ============ 初始示例数据(仅首次建库时写入)============
  const count = (db.prepare('SELECT COUNT(*) AS c FROM gene_profiles').get() as { c: number }).c;
  if (count > 0) return;

  const insertProfile = db.prepare(
    `INSERT INTO gene_profiles
      (id, ring_number, name, gender, breed, bloodline, owner_name, owner_phone, color, eye_color,
       birth_date, gene_sequence, qr_code, photo_url, status)
     VALUES (@id, @ring_number, @name, @gender, @breed, @bloodline, @owner_name, @owner_phone,
             @color, @eye_color, @birth_date, @gene_sequence, @qr_code, @photo_url, @status)`
  );

  const profiles = [
    {
      id: 1,
      ring_number: 'CHN-2022-000001',
      name: '苍穹一号',
      gender: 'male',
      breed: '詹森',
      bloodline: '詹森老麦克斯系',
      owner_name: '李建国',
      owner_phone: '13800000001',
      color: '雨点',
      eye_color: '黄眼',
      birth_date: '2022-03-15',
      gene_sequence: 'ATGCGTACGTTAGCCTAGCTAGCTAGGCTACGTAGCCTAGCTAGCTAGGCTACGTAGCCTAGC',
      photo_url: '',
      status: 1,
    },
    {
      id: 2,
      ring_number: 'CHN-2022-000002',
      name: '雪羽',
      gender: 'female',
      breed: '凡龙',
      bloodline: '凡龙银狐系',
      owner_name: '王秀兰',
      owner_phone: '13800000002',
      color: '白',
      eye_color: '砂眼',
      birth_date: '2022-04-20',
      gene_sequence: 'CGTATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGCATGC',
      photo_url: '',
      status: 1,
    },
    {
      id: 3,
      ring_number: 'CHN-2023-000003',
      name: '苍穹二号',
      gender: 'male',
      breed: '詹森',
      bloodline: '詹森老麦克斯系',
      owner_name: '李建国',
      owner_phone: '13800000001',
      color: '灰',
      eye_color: '黄眼',
      birth_date: '2023-03-10',
      gene_sequence: 'ATGCGTACGTTAGCCTAGCTAGCTAGGCTACGTAGCCTAGCTAGCTAGGCTACGTAGCCTAGC',
      photo_url: '',
      status: 1,
    },
  ];

  const insertLineage = db.prepare(
    `INSERT INTO gene_lineage (gene_profile_id, sire_id, dam_id) VALUES (?, ?, ?)`
  );
  const insertTest = db.prepare(
    `INSERT INTO gene_tests (gene_profile_id, test_org, project, report_no, result, report_url, test_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const insertSubmission = db.prepare(
    `INSERT INTO gene_manual_submissions
      (ring_number, name, gender, breed, bloodline, owner_name, owner_phone, color, eye_color,
       birth_date, submitter_name, submitter_phone, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const tx = db.transaction(() => {
    // 写入示例档案并生成溯源二维码
    profiles.forEach((p) => {
      insertProfile.run({
        ...p,
        qr_code: generateTraceUrl(p.id, p.ring_number),
      });
    });
    // 血统:3 号父=1 母=2
    insertLineage.run(3, 1, 2);
    // 检测记录示例
    insertTest.run(
      3,
      '中国信鸽基因检测中心',
      'DNA 亲缘鉴定',
      'RPT-2023-0001',
      '与 CHN-2022-000001 亲缘概率 99.7%,确认为父子关系',
      '',
      '2023-06-12'
    );
    // 待审提交示例
    insertSubmission.run(
      'CHN-2024-000888',
      '风暴',
      'male',
      '胡本',
      '胡本新档系',
      '张三',
      '13900000088',
      '雨点',
      '砂眼',
      '2024-02-01',
      '张三',
      '13900000088',
      'pending'
    );
  });
  tx();

  // eslint-disable-next-line no-console
  console.log('[DB] 基因信息管理模块:示例数据已初始化');
}

export default { initGeneDb, generateTraceUrl };
