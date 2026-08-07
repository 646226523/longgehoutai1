// 内容运营管理模块 - 数据库初始化(建表 + 示例数据)
// 由主 db.ts 在 initDatabase 末尾调用 initContentDb(db)
// 包含三张表:banners(Banner 管理)、news(资讯管理)、notices(公告与推送管理)
import type { Database } from '../../sqlite-compat';

// 当前时间戳(毫秒),与主库默认值保持一致
function now(): number {
  return Date.now();
}

// 初始化内容运营管理模块:建表 + 初始示例数据(幂等)
export function initContentDb(db: Database): void {
  // ============ 表结构 ============
  db.exec(`
    CREATE TABLE IF NOT EXISTS banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT '',                 -- 标题
      image_url TEXT NOT NULL DEFAULT '',             -- 图片 URL
      link_url TEXT NOT NULL DEFAULT '',              -- 跳转链接
      position TEXT NOT NULL DEFAULT 'home_top',      -- 展示位置 home_top/home_mid/home_bottom 等
      sort_order INTEGER NOT NULL DEFAULT 0,          -- 排序(数值越小越靠前)
      status INTEGER NOT NULL DEFAULT 1,              -- 1 上架 0 下架
      start_time INTEGER,                             -- 上架开始时间(毫秒)
      end_time INTEGER,                               -- 上架结束时间(毫秒)
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT '',                 -- 标题
      category TEXT NOT NULL DEFAULT '',              -- 分类(如 行业资讯/赛事公告/养鸽知识)
      cover_url TEXT NOT NULL DEFAULT '',             -- 封面图 URL
      summary TEXT NOT NULL DEFAULT '',               -- 摘要
      content TEXT NOT NULL DEFAULT '',               -- 正文(富文本 HTML)
      author TEXT NOT NULL DEFAULT '',                -- 作者
      status TEXT NOT NULL DEFAULT 'draft',           -- 状态 draft 草稿/published 已发布/offline 已下架
      is_top INTEGER NOT NULL DEFAULT 0,              -- 是否置顶 1 是 0 否
      published_at INTEGER,                           -- 发布时间(毫秒)
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL DEFAULT '',                 -- 公告标题
      content TEXT NOT NULL DEFAULT '',               -- 公告内容(纯文本或 HTML)
      type TEXT NOT NULL DEFAULT 'system',            -- 类型 system 系统/activity 活动/maintenance 维护
      status TEXT NOT NULL DEFAULT 'draft',           -- 状态 draft 草稿/published 已发布
      push_target TEXT NOT NULL DEFAULT 'all',        -- 推送对象 all 全部/level 按会员等级
      published_at INTEGER,                           -- 发布时间(毫秒)
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE INDEX IF NOT EXISTS idx_banners_status ON banners(status);
    CREATE INDEX IF NOT EXISTS idx_banners_position ON banners(position);
    CREATE INDEX IF NOT EXISTS idx_banners_sort ON banners(sort_order);
    CREATE INDEX IF NOT EXISTS idx_news_status ON news(status);
    CREATE INDEX IF NOT EXISTS idx_news_category ON news(category);
    CREATE INDEX IF NOT EXISTS idx_news_top ON news(is_top);
    CREATE INDEX IF NOT EXISTS idx_notices_status ON notices(status);
    CREATE INDEX IF NOT EXISTS idx_notices_type ON notices(type);
  `);

  // ============ 初始示例数据(仅首次建库时写入)============
  const bannerCount = (db.prepare('SELECT COUNT(*) AS c FROM banners').get() as { c: number }).c;
  if (bannerCount === 0) {
    const insertBanner = db.prepare(
      `INSERT INTO banners (title, image_url, link_url, position, sort_order, status, start_time, end_time)
       VALUES (@title, @image_url, @link_url, @position, @sort_order, @status, @start_time, @end_time)`
    );
    const ts = now();
    const banners = [
      {
        title: '春季大赛报名开启',
        image_url: 'https://via.placeholder.com/750x300.png?text=Spring+Race',
        link_url: '/competition/list',
        position: 'home_top',
        sort_order: 1,
        status: 1,
        start_time: ts,
        end_time: ts + 30 * 24 * 60 * 60 * 1000,
      },
      {
        title: '基因溯源服务上线',
        image_url: 'https://via.placeholder.com/750x300.png?text=Gene+Trace',
        link_url: '/gene/list',
        position: 'home_top',
        sort_order: 2,
        status: 1,
        start_time: ts,
        end_time: ts + 90 * 24 * 60 * 60 * 1000,
      },
      {
        title: '会员尊享权益',
        image_url: 'https://via.placeholder.com/750x300.png?text=VIP',
        link_url: '/user-member/level',
        position: 'home_mid',
        sort_order: 1,
        status: 0,
        start_time: null,
        end_time: null,
      },
    ];
    banners.forEach((b) => insertBanner.run(b));
  }

  const newsCount = (db.prepare('SELECT COUNT(*) AS c FROM news').get() as { c: number }).c;
  if (newsCount === 0) {
    const insertNews = db.prepare(
      `INSERT INTO news (title, category, cover_url, summary, content, author, status, is_top, published_at)
       VALUES (@title, @category, @cover_url, @summary, @content, @author, @status, @is_top, @published_at)`
    );
    const ts = now();
    const newsList = [
      {
        title: '2024 年春季信鸽大赛圆满落幕',
        category: '赛事资讯',
        cover_url: 'https://via.placeholder.com/400x240.png?text=Race',
        summary: '为期两周的春季信鸽大赛于近日圆满落幕,百余名鸽友参与角逐。',
        content: '<h2>赛事回顾</h2><p>2024 年春季信鸽大赛于 4 月 15 日开笼,共有来自全国各地的 320 羽赛鸽参赛。</p><p>经过激烈角逐,冠军由李建国的"苍穹一号"摘得。</p>',
        author: '平台运营',
        status: 'published',
        is_top: 1,
        published_at: ts - 24 * 60 * 60 * 1000,
      },
      {
        title: '信鸽基因溯源技术白皮书发布',
        category: '行业资讯',
        cover_url: 'https://via.placeholder.com/400x240.png?text=Gene',
        summary: '本平台联合多家检测机构发布信鸽基因溯源技术白皮书,推动行业标准化。',
        content: '<h2>技术白皮书</h2><p>本白皮书系统阐述了信鸽基因检测的标准流程、数据存储规范及隐私保护原则。</p>',
        author: '技术团队',
        status: 'published',
        is_top: 0,
        published_at: ts - 3 * 24 * 60 * 60 * 1000,
      },
      {
        title: '夏季养鸽注意事项(草稿)',
        category: '养鸽知识',
        cover_url: 'https://via.placeholder.com/400x240.png?text=Care',
        summary: '夏季高温多湿,信鸽饲养需要特别注意防暑降温与疾病预防。',
        content: '<p>本文正在编辑中...</p>',
        author: '平台运营',
        status: 'draft',
        is_top: 0,
        published_at: null,
      },
    ];
    newsList.forEach((n) => insertNews.run(n));
  }

  const noticeCount = (db.prepare('SELECT COUNT(*) AS c FROM notices').get() as { c: number }).c;
  if (noticeCount === 0) {
    const insertNotice = db.prepare(
      `INSERT INTO notices (title, content, type, status, push_target, published_at)
       VALUES (@title, @content, @type, @status, @push_target, @published_at)`
    );
    const ts = now();
    const notices = [
      {
        title: '系统升级公告',
        content: '本平台将于本周六凌晨 2:00-4:00 进行系统升级,届时服务将暂停访问,请提前知悉。',
        type: 'system',
        status: 'published',
        push_target: 'all',
        published_at: ts - 1 * 24 * 60 * 60 * 1000,
      },
      {
        title: '春季赛事报名启动',
        content: '2024 年春季信鸽大赛现已开放报名,请各鸽友于 3 月 31 日前完成报名。',
        type: 'activity',
        status: 'published',
        push_target: 'all',
        published_at: ts - 5 * 24 * 60 * 60 * 1000,
      },
      {
        title: '维护通知(草稿)',
        content: '本次维护涉及数据库优化,预计耗时 1 小时。',
        type: 'maintenance',
        status: 'draft',
        push_target: 'all',
        published_at: null,
      },
    ];
    notices.forEach((n) => insertNotice.run(n));
  }

  // eslint-disable-next-line no-console
  console.log('[DB] 内容运营管理模块:表结构与示例数据已初始化');
}

export default { initContentDb };
