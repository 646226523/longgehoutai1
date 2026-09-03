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

  // 管理员直接权限(独立于角色继承的额外权限)
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_permissions (
      admin_user_id INTEGER NOT NULL,
      permission_id INTEGER NOT NULL,
      PRIMARY KEY (admin_user_id, permission_id),
      FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
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
  // 业务视角增强字段
  ensureColumn('audit_logs', 'summary', 'TEXT');
  ensureColumn('audit_logs', 'target_type', 'TEXT');
  ensureColumn('audit_logs', 'target_id', 'INTEGER');
  ensureColumn('audit_logs', 'diff_json', 'TEXT');
  ensureColumn('audit_logs', 'target_name', 'TEXT');
  ensureColumn('lofts', 'description', 'TEXT');
  ensureColumn('lofts', 'status', 'INTEGER DEFAULT 1');
  ensureColumn('competitions', 'loft_id', 'INTEGER');
}

function tableExists(table: string): boolean {
  const result = _db!
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
    .get(table) as { name: string } | undefined;
  return !!result;
}

function ensureColumn(table: string, column: string, type: string): void {
  if (!tableExists(table)) return;
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
    ['loft:create', '公棚创建', 'loft', 'button', '手动创建公棚'],
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

    // ===== 基因档案模块（细粒度扩展） =====
    ['gene:list:view', '基因档案列表查看', 'gene', 'menu', '访问基因档案列表页面'],
    ['gene:list:create', '基因档案新增', 'gene', 'button', '手动创建新的基因档案'],
    ['gene:list:detail', '基因档案详情', 'gene', 'button', '查看基因档案完整详情'],
    ['gene:list:qrcode', '二维码重新生成', 'gene', 'button', '重新生成基因档案二维码'],
    ['gene:audit:view', '档案审核查看', 'gene', 'menu', '访问档案审核页面'],
    ['gene:audit:pass', '档案审核通过', 'gene', 'button', '审核通过 C 端手动录入数据'],
    ['gene:audit:reject', '档案审核驳回', 'gene', 'button', '审核驳回 C 端手动录入数据'],
    ['gene:detail:add_detection', '新增检测记录', 'gene', 'button', '在基因档案详情中新增检测记录'],

    // ===== NFT 资产模块（细粒度扩展） =====
    ['nft:list:view', 'NFT 资产列表查看', 'nft', 'menu', '访问 NFT 资产列表页面'],
    ['nft:list:create', '新增铸造', 'nft', 'button', '创建新的 NFT 铸造'],
    ['nft:list:detail', 'NFT 详情', 'nft', 'button', '查看 NFT 资产完整详情'],
    ['nft:list:submit_audit', '提交审核', 'nft', 'button', '提交 NFT 上链审核'],
    ['nft:list:add_flow', '新增流转记录', 'nft', 'button', '在 NFT 详情中新增流转记录'],
    ['nft:audit:view', 'NFT 审核查看', 'nft', 'menu', '访问 NFT 上链审核页面'],
    ['nft:audit:preview', 'NFT 预览', 'nft', 'button', '预览 NFT 审核详情'],
    ['nft:audit:pass', 'NFT 审核通过', 'nft', 'button', '审核通过 NFT 上链'],
    ['nft:audit:reject', 'NFT 审核驳回', 'nft', 'button', '审核驳回 NFT 上链'],
    ['nft:audit:retry', '上链任务重试', 'nft', 'button', '重试 NFT 上链任务'],

    // ===== 赛事模块（细粒度扩展） =====
    ['competition:list:view', '赛事列表查看', 'competition', 'menu', '访问赛事列表页面'],
    ['competition:list:create', '赛事新增', 'competition', 'button', '创建新的赛事'],
    ['competition:list:delete', '赛事删除', 'competition', 'button', '删除赛事'],
    ['competition:list:publish', '赛事发布', 'competition', 'button', '发布赛事上线'],
    ['competition:list:result', '成绩管理', 'competition', 'button', '管理赛事成绩'],
    ['competition:list:status_flow', '状态流转', 'competition', 'button', '赛事状态流转(报名中→集鸽中→比赛中→已结束)'],
    ['competition:verify:view', '报名核验查看', 'competition', 'menu', '访问报名核验页面'],
    ['competition:verify:start', '开始核验', 'competition', 'button', '开始参赛鸽核验'],
    ['competition:verify:detail', '核验详情', 'competition', 'button', '查看核验详情'],
    ['competition:result:view', '成绩列表查看', 'competition', 'menu', '访问成绩管理页面'],
    ['competition:result:delete', '成绩删除', 'competition', 'button', '删除成绩记录'],

    // ===== 公棚模块（细粒度扩展） =====
    ['loft:list:view', '公棚列表查看', 'loft', 'menu', '访问公棚列表页面'],
    ['loft:list:delete', '公棚删除', 'loft', 'button', '删除公棚'],
    ['loft:list:toggle_status', '营业状态切换', 'loft', 'button', '切换公棚营业/停业状态'],
    ['loft:list:pigeons', '存棚鸽只管理', 'loft', 'button', '管理公棚存棚鸽只'],
    ['loft:audit:view', '公棚审核查看', 'loft', 'menu', '访问公棚入驻审核页面'],
    ['loft:audit:detail', '审核详情', 'loft', 'button', '查看公棚审核详情'],
    ['loft:audit:pass', '公棚审核通过', 'loft', 'button', '审核通过公棚入驻'],
    ['loft:audit:reject', '公棚审核驳回', 'loft', 'button', '审核驳回公棚入驻'],

    // ===== 拍卖模块（细粒度扩展） =====
    ['auction:session:view', '拍卖场次查看', 'auction', 'menu', '访问拍卖场次页面'],
    ['auction:session:create', '新增拍卖场次', 'auction', 'button', '创建新的拍卖场次'],
    ['auction:session:edit', '场次编辑', 'auction', 'button', '编辑拍卖场次'],
    ['auction:session:detail', '场次详情', 'auction', 'button', '查看拍卖场次详情'],
    ['auction:session:publish', '场次发布', 'auction', 'button', '发布拍卖场次'],
    ['auction:session:start', '开始拍卖', 'auction', 'button', '开始拍卖活动'],
    ['auction:session:end', '结束拍卖', 'auction', 'button', '提前结束拍卖'],
    ['auction:session:cancel', '取消场次', 'auction', 'button', '取消拍卖场次'],
    ['auction:session:delete', '场次删除', 'auction', 'button', '删除拍卖场次'],
    ['auction:session:items', '拍品管理入口', 'auction', 'button', '进入该场次的拍品管理'],
    ['auction:items:view', '拍品列表查看', 'auction', 'menu', '访问拍品管理页面'],
    ['auction:items:list_create', '上架拍品', 'auction', 'button', '上架新的拍品'],
    ['auction:items:detail', '拍品详情', 'auction', 'button', '查看拍品详情'],
    ['auction:items:edit', '拍品编辑', 'auction', 'button', '编辑拍品信息'],
    ['auction:items:start', '开拍', 'auction', 'button', '开始拍品竞价'],
    ['auction:items:fail', '流拍', 'auction', 'button', '标记拍品流拍'],
    ['auction:items:delete', '拍品删除', 'auction', 'button', '删除拍品'],
    ['auction:deal:view', '成交管理查看', 'auction', 'menu', '访问成交管理页面'],
    ['auction:deal:manage', '成交确认与交割', 'auction', 'button', '确认付款、管理交割流程'],

    // ===== 仲裁模块（细粒度扩展） =====
    ['arbitration:case:view', '仲裁案件查看', 'arbitration', 'menu', '访问仲裁案件页面'],
    ['arbitration:case:create', '登记案件', 'arbitration', 'button', '登记新的仲裁案件'],
    ['arbitration:case:detail', '案件详情', 'arbitration', 'button', '查看仲裁案件详情'],
    ['arbitration:case:edit', '案件编辑', 'arbitration', 'button', '编辑仲裁案件'],
    ['arbitration:case:accept', '案件受理', 'arbitration', 'button', '受理仲裁案件'],
    ['arbitration:case:archive', '案件归档', 'arbitration', 'button', '归档已结案件'],

    // ===== 基因检测模块（细粒度扩展） =====
    ['detection:order:view', '检测预约查看', 'detection', 'menu', '访问检测预约订单页面'],
    ['detection:order:detail', '预约详情', 'detection', 'button', '查看预约详情'],
    ['detection:order:edit', '预约编辑', 'detection', 'button', '编辑预约信息'],
    ['detection:order:confirm', '预约确认', 'detection', 'button', '确认检测预约'],
    ['detection:order:schedule', '预约排期', 'detection', 'button', '安排检测时间'],
    ['detection:order:cancel', '预约取消', 'detection', 'button', '取消检测预约'],
    ['detection:order:delete', '预约删除', 'detection', 'button', '删除预约记录'],
    ['detection:report:view', '检测报告查看', 'detection', 'menu', '访问检测报告页面'],
    ['detection:report:create', '录入报告', 'detection', 'button', '录入新的检测报告'],
    ['detection:report:edit', '报告编辑', 'detection', 'button', '编辑检测报告'],
    ['detection:report:delete', '报告删除', 'detection', 'button', '删除检测报告'],
    ['detection:report:export', '报告打印/导出', 'detection', 'button', '打印或导出 PDF'],
    ['detection:org:manage', '检测机构管理', 'detection', 'menu', '管理检测机构列表与信息'],

    // ===== 内容管理模块（细粒度扩展） =====
    ['content:news:view', '资讯列表查看', 'content', 'menu', '访问资讯管理页面'],
    ['content:news:create', '资讯新增', 'content', 'button', '创建新的资讯'],
    ['content:news:preview', '资讯预览', 'content', 'button', '手机模拟器预览资讯效果'],
    ['content:news:edit', '资讯编辑', 'content', 'button', '编辑资讯内容'],
    ['content:news:publish', '资讯发布', 'content', 'button', '发布资讯上线'],
    ['content:news:offline', '资讯下架', 'content', 'button', '将已发布资讯下架'],
    ['content:news:top', '资讯置顶', 'content', 'button', '设置/取消资讯置顶'],
    ['content:news:delete', '资讯删除', 'content', 'button', '删除资讯'],
    ['content:news:batch', '资讯批量操作', 'content', 'button', '批量发布/下架/删除资讯'],
    ['content:banner:view', 'Banner 列表查看', 'content', 'menu', '访问 Banner 管理页面'],
    ['content:banner:create', 'Banner 新增', 'content', 'button', '新增 Banner'],
    ['content:banner:edit', 'Banner 编辑', 'content', 'button', '编辑 Banner'],
    ['content:banner:publish', 'Banner 发布/下架', 'content', 'button', '发布或下架 Banner'],
    ['content:banner:delete', 'Banner 删除', 'content', 'button', '删除 Banner'],
    ['content:notice:view', '公告列表查看', 'content', 'menu', '访问公告管理页面'],
    ['content:notice:create', '公告新增', 'content', 'button', '新增公告'],
    ['content:notice:edit', '公告编辑', 'content', 'button', '编辑公告'],
    ['content:notice:publish', '公告发布', 'content', 'button', '发布公告上线'],
    ['content:notice:delete', '公告删除', 'content', 'button', '删除公告'],

    // ===== 用户管理模块（细粒度扩展） =====
    ['user:list:view', '用户列表查看', 'user', 'menu', '访问用户管理页面'],
    ['user:list:detail', '用户详情', 'user', 'button', '查看用户完整详情'],
    ['user:list:edit', '用户编辑', 'user', 'button', '编辑用户信息'],
    ['user:list:realname_audit', '实名审核入口', 'user', 'button', '进入用户实名认证审核'],
    ['user:list:pigeon_audit', '鸽主资质审核入口', 'user', 'button', '进入鸽主资质审核'],
    ['user:list:more_distributor', '变更上级分销商', 'user', 'button', '更多操作 - 变更上级分销商'],
    ['user:list:more_tag', '设置用户标签', 'user', 'button', '更多操作 - 设置标签'],
    ['user:list:more_coupon', '发放优惠券', 'user', 'button', '更多操作 - 发放优惠券'],
    ['user:list:more_balance', '调整余额', 'user', 'button', '更多操作 - 调整账户余额'],
    ['user:list:more_points', '调整积分', 'user', 'button', '更多操作 - 调整积分'],
    ['user:list:more_blacklist', '加入黑名单', 'user', 'button', '更多操作 - 加入/移出黑名单'],
    ['user:list:more_kick', '强制退出登录', 'user', 'button', '更多操作 - 强制用户下线'],
    ['user:list:more_reset', '重置密码', 'user', 'button', '更多操作 - 重置用户密码'],
    ['user:list:more_export', '导出用户数据', 'user', 'button', '更多操作 - 导出用户列表'],
    ['user:audit:view', '认证审核查看', 'user', 'menu', '访问认证审核列表'],
    ['user:audit:pass', '认证审核通过', 'user', 'button', '通过认证申请'],
    ['user:audit:reject', '认证审核驳回', 'user', 'button', '驳回认证申请'],
    ['user:audit:retry', '重新提交认证', 'user', 'button', '用户重新提交认证'],
    ['user:member:view', '会员等级查看', 'user', 'menu', '访问会员等级配置'],
    ['user:member:create', '新增会员等级', 'user', 'button', '创建新的会员等级'],
    ['user:member:edit', '会员等级编辑', 'user', 'button', '编辑会员等级信息'],
    ['user:member:delete', '会员等级删除', 'user', 'button', '删除会员等级'],
    ['user:member:benefit', '权益配置', 'user', 'button', '配置会员等级权益'],
    ['user:member:recalc', '成长值重算', 'user', 'button', '批量重算用户成长值'],

    // ===== 系统管理模块（细粒度扩展） =====
    ['system:admin:view', '管理员列表查看', 'system', 'menu', '访问管理员页面'],
    ['system:admin:create', '新增管理员', 'system', 'button', '创建新的管理员账号'],
    ['system:admin:edit', '管理员编辑', 'system', 'button', '编辑管理员信息'],
    ['system:admin:role', '分配角色', 'system', 'button', '为管理员分配角色'],
    ['system:admin:reset_password', '管理员重置密码', 'system', 'button', '重置管理员密码'],
    ['system:admin:toggle', '管理员启用/禁用', 'system', 'button', '启用或禁用管理员账号'],
    ['system:admin:delete', '管理员删除', 'system', 'button', '删除管理员账号'],
    ['system:role:view', '角色列表查看', 'system', 'menu', '访问角色权限页面'],
    ['system:role:create', '新增角色', 'system', 'button', '创建新的角色'],
    ['system:role:edit', '编辑角色权限', 'system', 'button', '编辑已有角色的权限'],
    ['system:role:delete', '角色删除', 'system', 'button', '删除角色'],
    ['system:dict:manage', '字典管理', 'system', 'menu', '管理系统字典与字典项'],
    ['system:config:manage_ext', '系统配置扩展管理', 'system', 'menu', '保存修改系统配置项（扩展）'],
    ['system:audit:view_log', '操作日志列表', 'system', 'menu', '访问操作审计日志列表'],
    ['system:audit:detail_log', '日志详情', 'system', 'button', '查看单条日志详情'],

    // ===== 工作台模块（新增） =====
    ['dashboard:view', '工作台查看', 'dashboard', 'menu', '访问管理后台工作台首页']
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
    ['map_provider', 'none', '地图服务商', 'map', '地图服务商：amap(高德)/baidu(百度)/tencent(腾讯)/none(内置SVG)', 1],
    ['map_amap_key', '', '高德地图 Key', 'map', '高德开放平台申请的 Web 端(JS API) Key', 2],
    ['map_baidu_key', '', '百度地图 Key', 'map', '百度地图开放平台申请的浏览器端 AK', 3],
    ['map_tencent_key', '', '腾讯地图 Key', 'map', '腾讯位置服务申请的 JS API Key', 4],

    // ===== 上传设置 =====
    ['upload_max_size_mb', '10', '上传文件大小上限', 'upload', '单文件上传大小上限(MB)', 1],
    ['upload_allowed_types', 'jpg,jpeg,png,gif,webp,pdf,mp4', '允许上传的文件类型', 'upload', '逗号分隔的扩展名列表', 2],
    ['upload_use_cloud', 'qiniu', '云存储服务商', 'upload', 'qiniu(七牛云)/local(本地存储)', 3],

    // ===== 云存储（七牛云） =====
    ['qiniu_access_key', '', '七牛云 Access Key', 'cloud_storage', '七牛云开发者中心 → 密钥管理', 1],
    ['qiniu_secret_key', '', '七牛云 Secret Key', 'cloud_storage', '七牛云开发者中心 → 密钥管理（敏感信息仅后端使用）', 2],
    ['qiniu_bucket', '', '七牛云存储空间名', 'cloud_storage', '七牛云对象存储（Kodo）中创建的 Bucket', 3],
    ['qiniu_domain', '', '七牛云 CDN 域名', 'cloud_storage', 'CDN 加速域名，如 https://cdn.example.com', 4],
    ['qiniu_upload_url', 'https://upload.qiniup.com', '七牛云上传入口', 'cloud_storage', '上传服务器地址，华东: upload.qiniup.com / 华南: upload-z0.qiniup.com', 5],
    ['qiniu_region', 'z0', '七牛云存储区域', 'cloud_storage', 'z0(华东)/z1(华北)/z2(华南)/na0(北美)/as0(新加坡)', 6],
    ['qiniu_use_https', '1', '上传链接使用 HTTPS', 'cloud_storage', '0=HTTP, 1=HTTPS', 7],

    // ===== 图片处理（缩略图 + 水印） =====
    ['image_large_width', '1200', '大缩略图宽度', 'image', '大尺寸缩略图宽度(px)', 0],
    ['image_large_height', '900', '大缩略图高度', 'image', '大尺寸缩略图高度(px)', 0],
    ['image_medium_width', '800', '中等缩略图宽度', 'image', '中等尺寸缩略图宽度(px)', 1],
    ['image_medium_height', '600', '中等缩略图高度', 'image', '中等尺寸缩略图高度(px)', 2],
    ['image_small_width', '400', '小缩略图宽度', 'image', '小尺寸缩略图宽度(px)', 3],
    ['image_small_height', '300', '小缩略图高度', 'image', '小尺寸缩略图高度(px)', 4],
    ['image_watermark_enable', '0', '启用图片水印', 'image', '0=不启用, 1=启用', 5],
    ['image_watermark_text', '', '水印文字', 'image', '水印显示的文字，如"© 赛鸽基因"', 6],
    ['image_watermark_position', 'bottom-right', '水印位置', 'image', 'top-left/top-center/top-right/bottom-left/bottom-center/bottom-right', 7],
    ['image_compress_quality', '90', '图片压缩比例', 'image', '上传后按此质量压缩原图（100=不压缩）', 8],

    // ===== 支付管理 =====
    ['pay_wechat_enable', '0', '启用微信支付', 'payment', '0=关闭, 1=开启', 1],
    ['pay_wechat_appid', '', '微信公众号/小程序 AppID', 'payment', '微信开放平台或公众平台申请的 AppID', 2],
    ['pay_wechat_mch_id', '', '微信支付商户号', 'payment', '微信支付商户平台申请的 MchID', 3],
    ['pay_wechat_api_key', '', '微信支付 API Key', 'payment', '微信支付商户平台 → 账户中心 → API 安全 → APIv3 密钥', 4],
    ['pay_wechat_cert_path', '', '微信支付证书路径', 'payment', 'apiclient_cert.pem 的服务器绝对路径', 5],
    ['pay_wechat_key_path', '', '微信支付证书私钥路径', 'payment', 'apiclient_key.pem 的服务器绝对路径', 6],
    ['pay_wechat_notify_url', '', '微信支付回调地址', 'payment', '支付成功后端回调通知的 URL（必须 HTTPS 外网可访问）', 7],

    ['pay_alipay_enable', '0', '启用支付宝', 'payment', '0=关闭, 1=开启', 11],
    ['pay_alipay_appid', '', '支付宝应用 AppID', 'payment', '支付宝开放平台创建应用后获取的 AppID', 12],
    ['pay_alipay_private_key', '', '支付宝应用私钥', 'payment', '应用私钥（APP_PRIVATE_KEY），RSA2 签名用', 13],
    ['pay_alipay_public_key', '', '支付宝公钥', 'payment', '支付宝公钥（ALIPAY_PUBLIC_KEY），验证回调签名用', 14],
    ['pay_alipay_gateway', 'https://openapi.alipay.com/gateway.do', '支付宝网关地址', 'payment', '正式环境: https://openapi.alipay.com/gateway.do；沙箱: https://openapi-sandbox.dl.alipaydev.com/gateway.do', 15],
    ['pay_alipay_notify_url', '', '支付宝回调地址', 'payment', '异步通知地址，必须外网可访问', 16],

    ['pay_yft_enable', '0', '启用易付通', 'payment', '0=关闭, 1=开启', 21],
    ['pay_yft_appid', '', '易付通应用 AppID', 'payment', '易付通商户中心分配的 AppID', 22],
    ['pay_yft_secret_key', '', '易付通密钥 SecretKey', 'payment', '易付通商户中心分配的密钥', 23],
    ['pay_yft_gateway', '', '易付通网关地址', 'payment', '易付通提供的支付接口网关 URL', 24],
    ['pay_yft_notify_url', '', '易付通回调地址', 'payment', '支付结果异步通知地址', 25],

    // ===== 客服配置（微信小程序 + 企业微信） =====
    ['wx_cs_enable', '0', '小程序客服启用', 'customer_service', '是否启用微信小程序客服', 1],
    ['wx_cs_appid', '', '小程序 AppID', 'customer_service', '微信公众平台 → 开发 → 开发管理 → 开发设置', 2],
    ['wx_cs_secret', '', '小程序 AppSecret', 'customer_service', '敏感信息，仅后端使用', 3],
    ['wx_cs_link', '', '客服链接', 'customer_service', '客服会话入口 URL（H5 场景跳转用）', 4],
    ['wx_cs_qq', '', '客服 QQ', 'customer_service', '腾讯客服 QQ 号', 5],
    ['wx_cs_welcome', '欢迎咨询', '欢迎语', 'customer_service', '用户首次打开客服时显示的欢迎语', 6],
    ['wecom_cs_enable', '0', '企微客服启用', 'customer_service', '是否启用企业微信客服', 7],
    ['wecom_cs_corp_id', '', '企微 CorpID', 'customer_service', '企业微信管理后台 → 我的企业 → 企业信息', 8],
    ['wecom_cs_corp_secret', '', '企微客服 Secret', 'customer_service', '企业微信管理后台 → 应用管理 → 客服', 9],
    ['wecom_cs_kf_account', '', '企微客服账号', 'customer_service', '格式: kf@企业简称', 10],
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

  try {
    db.prepare(`INSERT OR IGNORE INTO permissions (code, name, module, type, description) VALUES (?, ?, ?, ?, ?)`)
      .run('loft:create', '公棚创建', 'loft', 'button', '手动创建公棚');
  } catch (_e) { /* ignore */ }
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