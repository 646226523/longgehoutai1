// 用户与会员体系模块 - 数据库初始化
// 建表:member_levels(会员等级)、member_benefits(会员权益)、users(C 端用户)
// 由主 db.ts 在 initDatabase 末尾调用 initUserDb(db)
// 字典 member_level(bronze/silver/gold/diamond)已在主 db.ts 中播种,本模块等级与之对齐

import type { Database } from '../../sqlite-compat';

type DB = Database;

// 用户状态:1 正常 / 0 封禁
export const USER_STATUS = {
  normal: 1,
  banned: 0,
} as const;

// 用户认证状态(整体认证档位):none 未认证 / real 实名认证 / loft_owner 鸽主认证 / pigeon_loft 公棚认证
export const CERT_STATUS = {
  none: 'none',
  real: 'real',
  loft_owner: 'loft_owner',
  pigeon_loft: 'pigeon_loft',
} as const;

// 认证审核子状态:none 未提交 / pending 待审核 / approved 通过 / rejected 驳回
export const AUDIT_SUB_STATUS = {
  none: 'none',
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
} as const;

// 会员权益类型:discount 折扣 / count 次数 / privilege 特权
export const BENEFIT_TYPE = {
  discount: 'discount',
  count: 'count',
  privilege: 'privilege',
} as const;

// 初始化用户与会员体系模块数据库:建表 + 示例数据(幂等)
export function initUserDb(db: DB): void {
  // 1. 会员等级表(先建,users 外键引用)
  db.exec(`
    CREATE TABLE IF NOT EXISTS member_levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,                 -- 等级编码 bronze/silver/gold/diamond
      name TEXT NOT NULL,                       -- 等级名称
      min_growth INTEGER NOT NULL DEFAULT 0,    -- 最低成长值(达到该值自动升级)
      sort INTEGER NOT NULL DEFAULT 0,           -- 排序(升序,数值越小等级越低)
      icon TEXT,                                 -- 等级图标 URL 或标识
      benefits TEXT,                             -- 权益描述(TEXT,概要说明)
      status INTEGER NOT NULL DEFAULT 1,         -- 1 启用 0 禁用
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS member_benefits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level_id INTEGER NOT NULL,                 -- 关联等级
      name TEXT NOT NULL,                        -- 权益名称
      type TEXT NOT NULL DEFAULT 'privilege',    -- 类型 discount/count/privilege
      value TEXT,                                -- 权益值(折扣率/次数/说明)
      description TEXT,                          -- 描述
      status INTEGER NOT NULL DEFAULT 1,         -- 1 启用 0 禁用
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (level_id) REFERENCES member_levels(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,             -- 用户名/手机号(C 端登录账号)
      nickname TEXT NOT NULL DEFAULT '',         -- 昵称
      avatar TEXT,                               -- 头像 URL
      phone TEXT,                                -- 手机号
      real_name TEXT,                            -- 实名姓名
      id_card TEXT,                              -- 身份证号
      status INTEGER NOT NULL DEFAULT 1,         -- 1 正常 0 封禁
      growth_value INTEGER NOT NULL DEFAULT 0,   -- 成长值
      member_level_id INTEGER,                   -- 会员等级 ID(关联 member_levels)
      cert_status TEXT NOT NULL DEFAULT 'none',  -- 整体认证档位 none/real/loft_owner/pigeon_loft
      real_name_status TEXT NOT NULL DEFAULT 'none',  -- 实名审核子状态 none/pending/approved/rejected
      loft_owner_status TEXT NOT NULL DEFAULT 'none', -- 鸽主审核子状态 none/pending/approved/rejected
      audit_remark TEXT,                         -- 审核备注(驳回理由等)
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (member_level_id) REFERENCES member_levels(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    CREATE INDEX IF NOT EXISTS idx_users_cert_status ON users(cert_status);
    CREATE INDEX IF NOT EXISTS idx_users_member_level ON users(member_level_id);
    CREATE INDEX IF NOT EXISTS idx_member_levels_code ON member_levels(code);
    CREATE INDEX IF NOT EXISTS idx_member_levels_sort ON member_levels(sort);
    CREATE INDEX IF NOT EXISTS idx_member_benefits_level ON member_benefits(level_id);
  `);

  // ============ 字段迁移:确保 users 表包含认证材料字段 ============
  const columns = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
  const columnNames = new Set(columns.map((c) => c.name));

  if (!columnNames.has('id_card_front')) {
    db.exec('ALTER TABLE users ADD COLUMN id_card_front TEXT');
  }
  if (!columnNames.has('id_card_back')) {
    db.exec('ALTER TABLE users ADD COLUMN id_card_back TEXT');
  }
  if (!columnNames.has('id_card_handheld')) {
    db.exec('ALTER TABLE users ADD COLUMN id_card_handheld TEXT');
  }

  // ============ 初始示例数据(仅首次建库时写入)============
  const levelCount = (db.prepare('SELECT COUNT(*) AS c FROM member_levels').get() as { c: number }).c;
  if (levelCount === 0) {
    const insertLevel = db.prepare(
      `INSERT INTO member_levels (code, name, min_growth, sort, icon, benefits, status)
       VALUES (@code, @name, @min_growth, @sort, @icon, @benefits, @status)`
    );
    const levels = [
      {
        code: 'bronze',
        name: '青铜会员',
        min_growth: 0,
        sort: 1,
        icon: '🥉',
        benefits: '基础赛事报名、基因档案查看',
        status: 1,
      },
      {
        code: 'silver',
        name: '白银会员',
        min_growth: 500,
        sort: 2,
        icon: '🥈',
        benefits: '青铜全部权益、赛事报名 9.5 折、专属客服',
        status: 1,
      },
      {
        code: 'gold',
        name: '黄金会员',
        min_growth: 2000,
        sort: 3,
        icon: '🥇',
        benefits: '白银全部权益、赛事报名 9 折、检测预约优先、每月 1 次免费咨询',
        status: 1,
      },
      {
        code: 'diamond',
        name: '钻石会员',
        min_growth: 8000,
        sort: 4,
        icon: '💎',
        benefits: '黄金全部权益、赛事报名 8 折、拍卖手续费减免、专属鸽主认证标识',
        status: 1,
      },
    ];
    levels.forEach((l) => insertLevel.run(l));

    // 各等级权益示例(status 使用表默认值 1 启用)
    const insertBenefit = db.prepare(
      `INSERT INTO member_benefits (level_id, name, type, value, description)
       VALUES (?, ?, ?, ?, ?)`
    );
    const levelIds = db
      .prepare('SELECT id, code FROM member_levels ORDER BY sort ASC')
      .all() as Array<{ id: number; code: string }>;
    const codeToId = new Map(levelIds.map((r) => [r.code, r.id]));

    const benefits: Array<[string, string, string, string, string]> = [
      // 青铜
      ['bronze', '赛事报名', 'privilege', '可报名', '可参与常规赛事报名'],
      ['bronze', '基因档案查看', 'privilege', '只读', '可查看基因档案信息'],
      // 白银
      ['silver', '赛事报名折扣', 'discount', '0.95', '赛事报名享 9.5 折'],
      ['silver', '专属客服', 'privilege', '在线优先', '专属在线客服通道'],
      // 黄金
      ['gold', '赛事报名折扣', 'discount', '0.9', '赛事报名享 9 折'],
      ['gold', '检测预约优先', 'privilege', '优先排队', '检测预约优先排期'],
      ['gold', '免费咨询', 'count', '1', '每月 1 次免费专家咨询'],
      // 钻石
      ['diamond', '赛事报名折扣', 'discount', '0.8', '赛事报名享 8 折'],
      ['diamond', '拍卖手续费减免', 'discount', '免手续费', '拍卖成交手续费减免'],
      ['diamond', '鸽主认证标识', 'privilege', '专属标识', '展示鸽主认证专属标识'],
    ];
    benefits.forEach((b) => {
      const lid = codeToId.get(b[0]);
      if (lid) insertBenefit.run(lid, b[1], b[2], b[3], b[4]);
    });
  }

  function generateAvatarDataUrl(nickname: string, colorIndex: number): string {
    const colors = [
      ['#FF6B6B', '#FF8E8E'],
      ['#4ECDC4', '#7EDDD4'],
      ['#45B7D1', '#6DD5E8'],
      ['#96CEB4', '#B8E0CE'],
      ['#FFEAA7', '#FFF0B5'],
      ['#DDA0DD', '#E8B4E8'],
      ['#98D8C8', '#B8E4D8'],
      ['#F7DC6F', '#FAE99F'],
    ];
    const [c1, c2] = colors[colorIndex % colors.length];
    const initial = nickname?.charAt(0)?.toUpperCase() || 'U';
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><defs><linearGradient id='g${colorIndex}' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='${c1}'/><stop offset='100%' stop-color='${c2}'/></linearGradient></defs><circle cx='50' cy='50' r='50' fill='url(#g${colorIndex})'/><text x='50' y='62' text-anchor='middle' font-family='Arial' font-size='42' font-weight='bold' fill='white'>${initial}</text></svg>`;
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  function generateIdCardFrontSvg(realName: string, idCard: string): string {
    const initial = realName?.charAt(0) || 'U';
    const maskedId = idCard ? idCard.slice(0, 4) + '**********' + idCard.slice(-4) : '000000********0000';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="220"><defs><linearGradient id="photo" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e8dcc8"/><stop offset="100%" stop-color="#c4b896"/></linearGradient></defs><rect width="340" height="220" rx="12" fill="#f8f5ef"/><rect x="12" y="12" width="316" height="196" rx="8" fill="#fff" stroke="#d4c5a9" stroke-width="1"/><rect x="220" y="30" width="90" height="110" rx="6" fill="url(#photo)"/><text x="265" y="95" text-anchor="middle" font-family="sans-serif" font-size="36" font-weight="bold" fill="#8b7355">${initial}</text><text x="30" y="50" font-family="sans-serif" font-size="13" fill="#8b7355">姓 名</text><text x="80" y="50" font-family="sans-serif" font-size="13" fill="#333">${realName || ""}</text><text x="30" y="78" font-family="sans-serif" font-size="13" fill="#8b7355">性 别</text><text x="80" y="78" font-family="sans-serif" font-size="13" fill="#333">男</text><text x="140" y="78" font-family="sans-serif" font-size="13" fill="#8b7355">民 族</text><text x="185" y="78" font-family="sans-serif" font-size="13" fill="#333">汉</text><text x="30" y="106" font-family="sans-serif" font-size="13" fill="#8b7355">出 生</text><text x="80" y="106" font-family="sans-serif" font-size="13" fill="#333">1990.01.01</text><text x="30" y="134" font-family="sans-serif" font-size="13" fill="#8b7355">住 址</text><text x="80" y="134" font-family="sans-serif" font-size="12" fill="#333" y="134">北京市朝阳区建国路</text><text x="30" y="180" font-family="monospace" font-size="16" fill="#333" letter-spacing="2">${maskedId}</text><text x="30" y="200" font-family="sans-serif" font-size="9" fill="#bbb">居民身份证</text></svg>`;
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  function generateIdCardBackSvg(): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="220"><rect width="340" height="220" rx="12" fill="#f0ebe0"/><rect x="12" y="12" width="316" height="196" rx="8" fill="#fff" stroke="#d4c5a9" stroke-width="1"/><text x="170" y="45" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="bold" fill="#8b7355">中华人民共和国</text><text x="170" y="68" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="#8b7355">居民身份证</text><circle cx="170" cy="100" r="22" fill="none" stroke="#d4c5a9" stroke-width="1"/><text x="170" y="106" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#d4c5a9">★</text><text x="30" y="150" font-family="sans-serif" font-size="11" fill="#666">签发机关:北京市公安局</text><text x="30" y="175" font-family="sans-serif" font-size="11" fill="#666">有效期限:2020.01.01 - 2040.01.01</text><text x="170" y="200" text-anchor="middle" font-family="sans-serif" font-size="8" fill="#ccc">国徽</text></svg>`;
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  function generateHandheldIdCardSvg(realName: string): string {
    const initial = realName?.charAt(0) || 'U';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="220"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e0e8f0"/><stop offset="100%" stop-color="#c8d5e0"/></linearGradient><linearGradient id="photo2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#d4c5a9"/><stop offset="100%" stop-color="#b8a880"/></linearGradient></defs><rect width="340" height="220" rx="12" fill="url(#bg)"/><rect x="60" y="20" width="220" height="160" rx="8" fill="#fff" stroke="#b8c5d0" stroke-width="1" transform="rotate(-5 170 100)"/><rect x="75" y="35" width="80" height="100" rx="4" fill="url(#photo2)" transform="rotate(-5 115 85)"/><text x="115" y="92" text-anchor="middle" font-family="sans-serif" font-size="28" font-weight="bold" fill="#8b7355" transform="rotate(-5 115 92)">${initial}</text><text x="170" y="65" font-family="sans-serif" font-size="10" fill="#666" transform="rotate(-5 170 65)">姓名:${realName || ""}</text><text x="170" y="85" font-family="monospace" font-size="9" fill="#666" transform="rotate(-5 170 85)">110101199001011234</text><ellipse cx="80" cy="180" rx="100" ry="15" fill="#b8c5d0" opacity="0.5"/><text x="170" y="210" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#666">手持身份证照(示例)</text></svg>`;
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  // 用户示例数据(仅首次建库时写入)
  const userCount = (db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number }).c;
  if (userCount === 0) {
    // 取等级 ID 用于关联
    const levelRows = db
      .prepare('SELECT id, code, min_growth FROM member_levels ORDER BY sort ASC')
      .all() as Array<{ id: number; code: string; min_growth: number }>;
    const pickLevel = (growth: number): number | null => {
      let target: number | null = null;
      for (const l of levelRows) {
        if (growth >= l.min_growth) target = l.id;
      }
      return target;
    };

    const insertUser = db.prepare(
      `INSERT INTO users
        (username, nickname, avatar, phone, real_name, id_card, status, growth_value,
         member_level_id, cert_status, real_name_status, loft_owner_status, audit_remark,
         id_card_front, id_card_back, id_card_handheld)
       VALUES (@username, @nickname, @avatar, @phone, @real_name, @id_card, @status,
               @growth_value, @member_level_id, @cert_status, @real_name_status,
               @loft_owner_status, @audit_remark, @id_card_front, @id_card_back, @id_card_handheld)`
    );

const users = [
      {
        username: '13800000001',
        nickname: '李建国',
        avatar: generateAvatarDataUrl('李建国', 0),
        phone: '13800000001',
        real_name: '李建国',
        id_card: '110101199001011234',
        status: 1,
        growth_value: 8500,
        member_level_id: pickLevel(8500),
        cert_status: 'loft_owner',
        real_name_status: 'approved',
        loft_owner_status: 'approved',
        audit_remark: null,
        id_card_front: generateIdCardFrontSvg('李建国', '110101199001011234'),
        id_card_back: generateIdCardBackSvg(),
        id_card_handheld: generateHandheldIdCardSvg('李建国'),
      },
      {
        username: '13800000002',
        nickname: '王秀兰',
        avatar: generateAvatarDataUrl('王秀兰', 2),
        phone: '13800000002',
        real_name: '王秀兰',
        id_card: '110101199203074321',
        status: 1,
        growth_value: 2100,
        member_level_id: pickLevel(2100),
        cert_status: 'real',
        real_name_status: 'approved',
        loft_owner_status: 'none',
        audit_remark: null,
        id_card_front: generateIdCardFrontSvg('王秀兰', '110101199203074321'),
        id_card_back: generateIdCardBackSvg(),
        id_card_handheld: generateHandheldIdCardSvg('王秀兰'),
      },
      {
        username: '13800000003',
        nickname: '张伟',
        avatar: generateAvatarDataUrl('张伟', 3),
        phone: '13800000003',
        real_name: '张伟',
        id_card: '310101199506120011',
        status: 1,
        growth_value: 600,
        member_level_id: pickLevel(600),
        cert_status: 'none',
        real_name_status: 'pending',
        loft_owner_status: 'none',
        audit_remark: null,
        id_card_front: generateIdCardFrontSvg('张伟', '310101199506120011'),
        id_card_back: generateIdCardBackSvg(),
        id_card_handheld: generateHandheldIdCardSvg('张伟'),
      },
      {
        username: '13800000004',
        nickname: '陈晓明',
        avatar: generateAvatarDataUrl('陈晓明', 5),
        phone: '13800000004',
        real_name: '陈晓明',
        id_card: '440101198811050034',
        status: 0,
        growth_value: 100,
        member_level_id: pickLevel(100),
        cert_status: 'none',
        real_name_status: 'rejected',
        loft_owner_status: 'none',
        audit_remark: '身份证照片不清晰,请重新上传',
        id_card_front: generateIdCardFrontSvg('陈晓明', '440101198811050034'),
        id_card_back: generateIdCardBackSvg(),
        id_card_handheld: generateHandheldIdCardSvg('陈晓明'),
      },
      {
        username: '13800000005',
        nickname: '赵敏',
        avatar: generateAvatarDataUrl('赵敏', 1),
        phone: '13800000005',
        real_name: '赵敏',
        id_card: '330101199012250056',
        status: 1,
        growth_value: 3200,
        member_level_id: pickLevel(3200),
        cert_status: 'none',
        real_name_status: 'approved',
        loft_owner_status: 'pending',
        audit_remark: null,
        id_card_front: generateIdCardFrontSvg('赵敏', '330101199012250056'),
        id_card_back: generateIdCardBackSvg(),
        id_card_handheld: generateHandheldIdCardSvg('赵敏'),
      },
    ];
    users.forEach((u) => {
    insertUser.run(u);
  });
  }

  // 确保所有用户都有有效 avatar 和认证材料（修复已有用户数据）
  const existingUsers = db.prepare('SELECT id, nickname, real_name, id_card, avatar FROM users').all() as Array<{ id: number; nickname: string; real_name: string | null; id_card: string | null; avatar: string | null }>;
  const updateUser = db.prepare('UPDATE users SET avatar = ?, id_card_front = ?, id_card_back = ?, id_card_handheld = ? WHERE id = ?');
  existingUsers.forEach((u) => {
    const avatar = u.avatar && u.avatar.startsWith('data:') ? u.avatar : generateAvatarDataUrl(u.nickname, u.id);
    const realName = u.real_name || u.nickname;
    const idCard = u.id_card || '';
    const idCardFront = generateIdCardFrontSvg(realName, idCard);
    const idCardBack = generateIdCardBackSvg();
    const idCardHandheld = generateHandheldIdCardSvg(realName);
    updateUser.run(avatar, idCardFront, idCardBack, idCardHandheld, u.id);
  });

  // eslint-disable-next-line no-console
  console.log('[DB] 用户与会员体系模块:表结构与示例数据已就绪');
}

export default { initUserDb };
