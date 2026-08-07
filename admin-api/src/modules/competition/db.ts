import type { Database } from '../../sqlite-compat';

// ==================== 赛事模块状态枚举 ====================

// 赛事状态:草稿 / 报名中 / 集鸽中 / 比赛中 / 已结束 / 已归档
export const COMPETITION_STATUS = {
  DRAFT: 'draft', // 草稿
  ENROLLING: 'enrolling', // 报名中
  GATHERING: 'gathering', // 集鸽中
  RACING: 'racing', // 比赛中
  FINISHED: 'finished', // 已结束
  ARCHIVED: 'archived', // 已归档
} as const;

// 参赛鸽核验状态:未核验 / 通过 / 不通过
export const VERIFY_STATUS = {
  PENDING: 'pending', // 未核验
  PASSED: 'passed', // 通过
  FAILED: 'failed', // 不通过
} as const;

// 成绩状态:待录入 / 已录入
export const RESULT_STATUS = {
  PENDING: 'pending', // 待录入
  RECORDED: 'recorded', // 已录入
} as const;

// 状态流转图:当前状态 → 下一个状态
export const STATUS_FLOW: Record<string, string> = {
  draft: 'enrolling',
  enrolling: 'gathering',
  gathering: 'racing',
  racing: 'finished',
  finished: 'archived',
};

// 赛事状态中文标签
export const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  enrolling: '报名中',
  gathering: '集鸽中',
  racing: '比赛中',
  finished: '已结束',
  archived: '已归档',
};

// ==================== 初始化赛事模块数据库 ====================

// 初始化赛事模块数据库表结构与示例数据
// 由 admin-api/src/db.ts 在 initDatabase() 末尾调用
export function initCompetitionDb(db: Database): void {
  // 1. 赛事表
  db.exec(`
    CREATE TABLE IF NOT EXISTS competitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,                                   -- 赛事名称
      type TEXT,                                            -- 类型(字典 competition_type)
      status TEXT NOT NULL DEFAULT 'draft',                 -- 状态
      start_time INTEGER,                                   -- 开始时间(毫秒)
      end_time INTEGER,                                     -- 结束时间(毫秒)
      location TEXT,                                        -- 地点
      distance REAL,                                        -- 空距(公里)
      description TEXT,                                     -- 规程
      organizer TEXT,                                       -- 主办方
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );
  `);

  // 2. 参赛鸽表(足环与基因档案比对)
  db.exec(`
    CREATE TABLE IF NOT EXISTS competition_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER NOT NULL,                      -- 赛事 ID
      ring_number TEXT NOT NULL,                            -- 足环号
      gene_profile_id INTEGER,                              -- 关联基因档案 ID(核验通过后写入)
      owner_name TEXT,                                      -- 鸽主姓名
      verify_status TEXT NOT NULL DEFAULT 'pending',        -- 核验状态
      verify_reason TEXT,                                   -- 核验原因(不通过时填写)
      verified_at INTEGER,                                  -- 核验时间
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE
    );
  `);

  // 3. 成绩表
  db.exec(`
    CREATE TABLE IF NOT EXISTS competition_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER NOT NULL,                      -- 赛事 ID
      participant_id INTEGER NOT NULL,                      -- 参赛鸽 ID
      rank INTEGER,                                         -- 排名
      arrival_time INTEGER,                                 -- 归巢时间(毫秒)
      speed REAL,                                           -- 分速(米/分)
      distance REAL,                                        -- 空距(公里)
      status TEXT NOT NULL DEFAULT 'pending',               -- 状态
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
      FOREIGN KEY (participant_id) REFERENCES competition_participants(id) ON DELETE CASCADE
    );
  `);

  // 4. 索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_competitions_status ON competitions(status);
    CREATE INDEX IF NOT EXISTS idx_competitions_time ON competitions(start_time, end_time);
    CREATE INDEX IF NOT EXISTS idx_participants_comp ON competition_participants(competition_id);
    CREATE INDEX IF NOT EXISTS idx_participants_ring ON competition_participants(ring_number);
    CREATE INDEX IF NOT EXISTS idx_participants_verify ON competition_participants(verify_status);
    CREATE INDEX IF NOT EXISTS idx_results_comp ON competition_results(competition_id);
    CREATE INDEX IF NOT EXISTS idx_results_participant ON competition_results(participant_id);
    CREATE INDEX IF NOT EXISTS idx_results_rank ON competition_results(competition_id, rank);
  `);

  // 5. 初始化示例数据(仅在表为空时插入)
  const count = (db.prepare('SELECT COUNT(*) AS c FROM competitions').get() as { c: number }).c;
  if (count > 0) {
    return;
  }

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const insertComp = db.prepare(
    `INSERT INTO competitions
     (name, type, status, start_time, end_time, location, distance, description, organizer, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  // 示例赛事 1:报名中
  const c1 = insertComp.run(
    '2026 春季信鸽大赛',
    'spring',
    'enrolling',
    now + 7 * day,
    now + 14 * day,
    '北京·通州公棚',
    500.0,
    '规程:春季 500 公里比赛,参赛费 100 元/羽,奖金 10 万元。',
    '北京市信鸽协会',
    now,
    now
  );

  // 示例赛事 2:草稿
  insertComp.run(
    '2026 秋赛特比环',
    'autumn',
    'draft',
    now + 60 * day,
    now + 67 * day,
    '上海·崇明岛',
    350.5,
    '规程:秋季特比环 350 公里,仅限持特比环信鸽参赛。',
    '上海市信鸽协会',
    now,
    now
  );

  // 示例赛事 3:已归档(含参赛鸽与成绩)
  const c3 = insertComp.run(
    '2025 公棚赛(已归档)',
    'pigeon_loft',
    'archived',
    now - 90 * day,
    now - 80 * day,
    '广州·从化公棚',
    480.0,
    '规程:公棚赛 480 公里。',
    '广州市信鸽协会',
    now,
    now
  );

  // 为示例赛事 1 插入参赛鸽(未核验)
  const insertPart = db.prepare(
    `INSERT INTO competition_participants
     (competition_id, ring_number, gene_profile_id, owner_name, verify_status, verify_reason, verified_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  insertPart.run(c1.lastInsertRowid, 'CHN-2026-000001', null, '张三', 'pending', null, null, now);
  insertPart.run(c1.lastInsertRowid, 'CHN-2026-000002', null, '李四', 'pending', null, null, now);
  insertPart.run(c1.lastInsertRowid, 'CHN-2026-000003', null, '王五', 'pending', null, null, now);

  // 为示例赛事 3 插入参赛鸽(已核验通过)与成绩
  const p1 = insertPart.run(
    c3.lastInsertRowid, 'CHN-2025-100001', null, '赵六', 'passed', null, now - 85 * day, now - 85 * day
  );
  const p2 = insertPart.run(
    c3.lastInsertRowid, 'CHN-2025-100002', null, '钱七', 'passed', null, now - 85 * day, now - 85 * day
  );
  const p3 = insertPart.run(
    c3.lastInsertRowid, 'CHN-2025-100003', null, '孙八', 'passed', null, now - 85 * day, now - 85 * day
  );

  const insertResult = db.prepare(
    `INSERT INTO competition_results
     (competition_id, participant_id, rank, arrival_time, speed, distance, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  insertResult.run(c3.lastInsertRowid, p1.lastInsertRowid, 1, now - 80 * day, 1500.5, 480.0, 'recorded', now - 80 * day);
  insertResult.run(c3.lastInsertRowid, p2.lastInsertRowid, 2, now - 80 * day + 60000, 1480.2, 480.0, 'recorded', now - 80 * day);
  insertResult.run(c3.lastInsertRowid, p3.lastInsertRowid, 3, now - 80 * day + 120000, 1450.8, 480.0, 'recorded', now - 80 * day);
}
