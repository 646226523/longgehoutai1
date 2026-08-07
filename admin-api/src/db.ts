import { Database, initSQL } from './sqlite-compat';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config';
import { initGeneDb } from './modules/gene/db';
import { initCompetitionDb } from './modules/competition/db';
import { initLoftDb } from './modules/loft/db';
import { initNftDb } from './modules/nft/db';
import { initDetectionDb } from './modules/detection/db';
import { initUserDb } from './modules/user/db';
import { initContentDb } from './modules/content/db';
import { initAuctionDb } from './modules/auction/db';
import { initArbitrationDb } from './modules/arbitration/db';

const _dirname = path.dirname(fileURLToPath(import.meta.url));

const dataDir = path.resolve(_dirname, '..', 'data');
const dbPath = path.resolve(dataDir, 'admin.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let _db: Database | null = null;
let _initDone = false;

const db = new Proxy({} as Database, {
  get(_target, prop) {
    if (!_initDone || !_db) {
      throw new Error('数据库尚未初始化, 请先调用 initDatabase()');
    }
    const value = Reflect.get(_db, prop, _db);
    return typeof value === 'function' ? value.bind(_db) : value;
  },
});

function initSchema(): void {
  const db = _db!;

  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      nickname TEXT NOT NULL DEFAULT '',
      avatar TEXT,
      email TEXT,
      phone TEXT,
      status INTEGER NOT NULL DEFAULT 1,
      last_login_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      is_super INTEGER NOT NULL DEFAULT 0,
      status INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      module TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'menu',
      description TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id INTEGER NOT NULL,
      permission_id INTEGER NOT NULL,
      PRIMARY KEY (role_id, permission_id),
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_user_roles (
      admin_user_id INTEGER NOT NULL,
      role_id INTEGER NOT NULL,
      PRIMARY KEY (admin_user_id, role_id),
      FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_user_id INTEGER,
      admin_username TEXT,
      module TEXT,
      action TEXT,
      method TEXT,
      path TEXT,
      params TEXT,
      request_body TEXT,
      response_body TEXT,
      duration_ms INTEGER,
      ip TEXT,
      user_agent TEXT,
      status_code INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE SET NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS system_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      config_key TEXT NOT NULL UNIQUE,
      config_value TEXT,
      name TEXT NOT NULL,
      config_group TEXT NOT NULL DEFAULT 'general',
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS dictionary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dict_type TEXT NOT NULL,
      type_name TEXT NOT NULL DEFAULT '',
      item_code TEXT NOT NULL,
      item_name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      status INTEGER NOT NULL DEFAULT 1,
      remark TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(admin_user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);
    CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
    CREATE INDEX IF NOT EXISTS idx_system_config_group ON system_config(config_group);
    CREATE INDEX IF NOT EXISTS idx_dictionary_type ON dictionary(dict_type);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_dict_type_code ON dictionary(dict_type, item_code);
  `);

  ensureColumn('audit_logs', 'request_body', 'TEXT');
  ensureColumn('audit_logs', 'response_body', 'TEXT');
  ensureColumn('audit_logs', 'duration_ms', 'INTEGER');
}

function ensureColumn(table: string, column: string, type: string): void {
  const cols = _db!
    .prepare(`PRAGMA table_info(${table})`)
    .all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === column)) {
    _db!.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
  }
}

function initSeedData(): void {
  const db = _db!;

  const insertRole = db.prepare(
    `INSERT OR IGNORE INTO roles (code, name, description, is_super) VALUES (?, ?, ?, ?)`
  );
  insertRole.run('super_admin', '超级管理员', '拥有全部权限、系统配置、管理员与角色管理', 1);
  insertRole.run('operator', '运营管理员', '内容运营、Banner/资讯/公告、数据查看', 0);
  insertRole.run('auditor', '审核员', '基因录入审核、公棚入驻审核、NFT 上链审核', 0);
  insertRole.run('competition_staff', '赛事专员', '赛事创建发布、成绩录入、赛事核验', 0);
  insertRole.run('detection_org', '检测机构', '检测预约处理、检测报告录入', 0);
  insertRole.run('arbitrator', '仲裁员', '交易纠纷仲裁、证据审核、裁决执行', 0);
  insertRole.run('content_operator', '内容运营', '首页内容、资讯、会员权益配置', 0);

  const insertPermission = db.prepare(
    `INSERT OR IGNORE INTO permissions (code, name, module, type, description) VALUES (?, ?, ?, ?, ?)`
  );
  const permissions: Array<[string, string, string, string, string]> = [
    ['gene:view', '基因档案查看', 'gene', 'menu', '查看基因档案列表与详情'],
    ['gene:edit', '基因档案编辑', 'gene', 'button', '编辑基因档案'],
    ['gene:audit', '手动录入审核', 'gene', 'button', '审核 C 端手动录入数据'],
    ['nft:view', 'NFT 资产查看', 'nft', 'menu', '查看 NFT 资产'],
    ['nft:edit', 'NFT 资产编辑', 'nft', 'button', '编辑 NFT 资产元数据'],
    ['nft:audit', 'NFT 上链审核', 'nft', 'button', '审核 NFT 上链任务'],
    ['competition:view', '赛事查看', 'competition', 'menu', '查看赛事列表'],
    ['competition:edit', '赛事编辑', 'competition', 'button', '创建/编辑赛事'],
    ['competition:verify', '赛事核验', 'competition', 'button', '参赛鸽资格核验'],
    ['loft:view', '公棚查看', 'loft', 'menu', '查看公棚列表'],
    ['loft:edit', '公棚编辑', 'loft', 'button', '编辑公棚信息'],
    ['loft:audit', '公棚入驻审核', 'loft', 'button', '审核公棚入驻申请'],
    ['detection:view', '检测预约查看', 'detection', 'menu', '查看预约订单'],
    ['detection:report', '检测报告管理', 'detection', 'button', '录入/管理检测报告'],
    ['auction:view', '拍卖查看', 'auction', 'menu', '查看拍卖场次'],
    ['auction:edit', '拍卖场次编辑', 'auction', 'button', '创建/编辑拍卖场次'],
    ['auction:deal', '成交管理', 'auction', 'button', '拍卖成交确认与交割'],
    ['arbitration:view', '仲裁查看', 'arbitration', 'menu', '查看仲裁案件'],
    ['arbitration:judge', '仲裁裁决', 'arbitration', 'button', '作出仲裁裁决'],
    ['user:view', '用户查看', 'user', 'menu', '查看用户列表'],
    ['user:edit', '用户编辑', 'user', 'button', '编辑/封禁用户'],
    ['member:view', '会员等级查看', 'user', 'menu', '查看会员等级配置'],
    ['member:edit', '会员等级编辑', 'user', 'button', '编辑会员等级与权益'],
    ['content:view', '内容查看', 'content', 'menu', '查看 Banner/资讯/公告'],
    ['content:edit', '内容编辑', 'content', 'button', '编辑 Banner/资讯/公告'],
    ['statistics:view', '数据统计查看', 'statistics', 'menu', '查看数据统计中心'],
    ['system:view', '系统管理查看', 'system', 'menu', '查看系统管理'],
    ['system:admin', '管理员管理', 'system', 'button', '管理员账号增删改(旧标识,保留兼容)'],
    ['system:role', '角色权限管理', 'system', 'button', '角色与权限分配(旧标识,保留兼容)'],
    ['system:audit', '操作日志查看', 'system', 'button', '查看操作审计日志(旧标识,保留兼容)'],
    ['system:admin:manage', '管理员管理', 'system', 'button', '管理员账号增删改、状态、重置密码、分配角色'],
    ['system:role:manage', '角色权限管理', 'system', 'button', '角色与权限分配'],
    ['system:audit:view', '操作日志查看', 'system', 'button', '查看操作审计日志'],
    ['system:config:manage', '系统配置管理', 'system', 'button', '系统配置与字典管理'],
  ];
  permissions.forEach((p) => insertPermission.run(...p));

  const adminUsername = config.defaultAdmin.username;
  const adminPassword = config.defaultAdmin.password;
  const existing = db
    .prepare('SELECT id FROM admin_users WHERE username = ?')
    .get(adminUsername);
  if (!existing) {
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    const result = db
      .prepare(
        `INSERT INTO admin_users (username, password, nickname, status) VALUES (?, ?, ?, 1)`
      )
      .run(adminUsername, hashedPassword, '超级管理员');
    const adminId = result.lastInsertRowid as number;
    const superRole = db
      .prepare('SELECT id FROM roles WHERE code = ?')
      .get('super_admin') as { id: number } | undefined;
    if (superRole) {
      db.prepare(
        'INSERT OR IGNORE INTO admin_user_roles (admin_user_id, role_id) VALUES (?, ?)'
      ).run(adminId, superRole.id);
    }
    // eslint-disable-next-line no-console
    console.log(`[DB] 默认超管账号已初始化: ${adminUsername} / ${adminPassword}`);
  }

  const insertConfig = db.prepare(
    `INSERT OR IGNORE INTO system_config (config_key, config_value, name, config_group, description, sort_order) VALUES (?, ?, ?, ?, ?, ?)`
  );
  const configs: Array<[string, string, string, string, string, number]> = [
    ['site_name', '赛鸽基因溯源平台', '站点名称', 'general', '后台与 C 端展示的站点名称', 1],
    ['site_version', '1.0.0', '系统版本', 'general', '当前系统版本号', 2],
    ['default_password', 'admin123', '默认初始密码', 'security', '新增管理员/重置密码时的默认密码', 1],
    ['password_min_length', '8', '密码最小长度', 'security', '管理员密码最小字符数', 2],
    ['token_expire_hours', '2', 'Token 有效时长', 'security', 'Access Token 有效时长(小时)', 3],
    ['session_timeout', '30', '会话超时', 'security', '会话空闲超时时间(分钟)', 4],
    ['admin_page_size', '10', '默认分页大小', 'general', '列表默认每页条数', 3],
    ['upload_max_size', '10', '上传文件大小上限', 'general', '单文件上传大小上限(MB)', 4],
  ];
  configs.forEach((c) => insertConfig.run(...c));

  const insertDict = db.prepare(
    `INSERT OR IGNORE INTO dictionary (dict_type, type_name, item_code, item_name, sort_order, status, remark) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const dicts: Array<[string, string, string, string, number, number, string]> = [
    ['competition_type', '赛事类型', 'spring', '春赛', 1, 1, '春季赛事'],
    ['competition_type', '赛事类型', 'autumn', '秋赛', 2, 1, '秋季赛事'],
    ['competition_type', '赛事类型', 'boiler', '特比环', 3, 1, '特比环赛事'],
    ['competition_type', '赛事类型', 'pigeon_loft', '公棚赛', 4, 1, '公棚赛事'],
    ['detection_item_type', '检测项目类型', 'dna', 'DNA 检测', 1, 1, '基因 DNA 检测'],
    ['detection_item_type', '检测项目类型', 'gender', '性别鉴定', 2, 1, '性别分子鉴定'],
    ['detection_item_type', '检测项目类型', 'disease', '疾病检测', 3, 1, '常见疾病检测'],
    ['pigeon_gender', '鸽子性别', 'male', '雄', 1, 1, '雄性'],
    ['pigeon_gender', '鸽子性别', 'female', '雌', 2, 1, '雌性'],
    ['pigeon_gender', '鸽子性别', 'unknown', '未知', 3, 1, '未鉴定'],
    ['member_level', '会员等级', 'bronze', '青铜会员', 1, 1, '基础等级'],
    ['member_level', '会员等级', 'silver', '白银会员', 2, 1, '中级等级'],
    ['member_level', '会员等级', 'gold', '黄金会员', 3, 1, '高级等级'],
    ['member_level', '会员等级', 'diamond', '钻石会员', 4, 1, '顶级等级'],
    ['audit_status', '审核状态', 'pending', '待审核', 1, 1, ''],
    ['audit_status', '审核状态', 'approved', '已通过', 2, 1, ''],
    ['audit_status', '审核状态', 'rejected', '已拒绝', 3, 1, ''],
  ];
  dicts.forEach((d) => insertDict.run(...d));
}

export async function initDatabase(): Promise<void> {
  await initSQL();
  _db = new Database(dbPath);
  _initDone = true;

  _db.pragma('foreign_keys = ON');

  initSchema();
  initSeedData();
  initGeneDb(_db);
  initCompetitionDb(_db);
  initLoftDb(_db);
  initNftDb(_db);
  initDetectionDb(_db);
  initUserDb(_db);
  initContentDb(_db);
  initAuctionDb(_db);
  initArbitrationDb(_db);
  // eslint-disable-next-line no-console
  console.log(`[DB] 数据库已就绪: ${dbPath}`);
}

export default db;