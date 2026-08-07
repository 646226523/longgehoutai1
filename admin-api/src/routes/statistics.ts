// 数据统计中心模块 - 后端路由
// 挂载于 /api/statistics,所有接口需登录鉴权 + statistics:view 权限
// 统计模块无需新建表,直接聚合查询已有业务表(COUNT/SUM/GROUP BY),不分页
// 所有查询均 try/catch 容错:拍卖/仲裁表可能尚未创建(另一子代理并行),失败返回 0/空,不影响整体
//
// 集成方式(在 admin-api/src/index.ts 中):
//   import statisticsRouter from './routes/statistics';
//   app.use('/api/statistics', statisticsRouter);
import { Router, Response } from 'express';
import db from '../db';
import { authenticate, requirePermission } from '../middlewares/auth';
import type { AuthedRequest, ApiResponse } from '../types';

export const statisticsRouter = Router();

// 统一成功响应
function ok<T>(res: Response, data: T, message = 'success'): Response {
  const body: ApiResponse<T> = { code: 0, message, data };
  return res.json(body);
}

// 所有统计接口均需登录鉴权 + statistics:view 权限
statisticsRouter.use(authenticate);
statisticsRouter.use(requirePermission('statistics:view'));

// ==================== 安全查询辅助(容错)====================

// 安全 COUNT:表不存在或查询失败返回 0
function safeCount(sql: string, params: Array<string | number> = []): number {
  try {
    const row = db.prepare(sql).get(...params) as { c: number } | undefined;
    return row?.c ?? 0;
  } catch {
    return 0;
  }
}

// 安全 SUM:返回数值求和(失败返回 0)
function safeSum(sql: string, params: Array<string | number> = []): number {
  try {
    const row = db.prepare(sql).get(...params) as { s: number | null } | undefined;
    return row?.s ?? 0;
  } catch {
    return 0;
  }
}

// 安全多行聚合查询:失败返回空数组
function safeQueryAll<T>(sql: string, params: Array<string | number> = []): T[] {
  try {
    return db.prepare(sql).all(...params) as T[];
  } catch {
    return [];
  }
}

// 获取表的所有列名(用于拍卖/仲裁等未知 schema 的自适应查询)
function getTableColumns(table: string): string[] {
  try {
    const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    return rows.map((r) => r.name);
  } catch {
    return [];
  }
}

// 从候选列名中选取表中实际存在的第一个列名(用于自适应拍卖成交方列名)
function pickColumn(table: string, candidates: string[]): string | null {
  const cols = getTableColumns(table);
  for (const c of candidates) {
    if (cols.includes(c)) return c;
  }
  return null;
}

// 当月起始时间戳(毫秒,本地时区)
function monthStartMs(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

// 近 N 天趋势起始时间戳(毫秒,UTC 当天 0 点向前 N-1 天,含今天)
function trendStartMs(days: number): number {
  const now = new Date();
  const todayUtcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return todayUtcMidnight - (days - 1) * 24 * 60 * 60 * 1000;
}

// 生成近 N 天的日期字符串数组(YYYY-MM-DD,UTC,升序,含今天)
// 与 DB 端 date(created_at/1000,'unixepoch')(UTC)保持一致
function recentDateLabels(days: number): string[] {
  const labels: string[] = [];
  const now = new Date();
  const todayUtcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  for (let i = days - 1; i >= 0; i--) {
    const t = todayUtcMidnight - i * 24 * 60 * 60 * 1000;
    labels.push(new Date(t).toISOString().slice(0, 10));
  }
  return labels;
}

// ==================== 类型定义 ====================

interface NameValue {
  name: string;
  value: number;
}

interface StatusCount {
  status: string;
  count: number;
}

interface OwnerCount {
  owner_name: string;
  count: number;
}

interface MonthCount {
  month: string;
  count: number;
}

interface AuctionMonthly {
  month: string;
  count: number;
  amount: number;
}

interface AuctionTopItem {
  name: string;
  amount: number;
  count: number;
}

interface LevelCount {
  level_name: string;
  count: number;
}

interface TrendRow {
  date: string;
  gene: number;
  user: number;
  order: number;
  nft: number;
  competition: number;
}

interface TrendData {
  dates: string[];
  rows: TrendRow[];
  metrics: Array<{ key: string; label: string }>;
}

// 趋势指标配置:键名对应 TrendRow 字段,表名为已知业务表(硬编码,非用户输入)
const TREND_METRICS = [
  { key: 'gene', label: '基因档案', table: 'gene_profiles' },
  { key: 'user', label: '用户', table: 'users' },
  { key: 'order', label: '检测订单', table: 'detection_orders' },
  { key: 'nft', label: 'NFT 资产', table: 'nft_assets' },
  { key: 'competition', label: '赛事', table: 'competitions' },
] as const;

// ==================== 接口 ====================

// GET /api/statistics/overview - 总览:各模块核心计数(指标卡片数据)
statisticsRouter.get('/overview', (_req: AuthedRequest, res: Response) => {
  const data = {
    gene_profiles: safeCount('SELECT COUNT(*) AS c FROM gene_profiles'),
    nft_assets: safeCount('SELECT COUNT(*) AS c FROM nft_assets'),
    competitions: safeCount('SELECT COUNT(*) AS c FROM competitions'),
    lofts: safeCount('SELECT COUNT(*) AS c FROM lofts'),
    users: safeCount('SELECT COUNT(*) AS c FROM users'),
    detection_reports: safeCount('SELECT COUNT(*) AS c FROM detection_reports'),
    detection_orders: safeCount('SELECT COUNT(*) AS c FROM detection_orders'),
    detection_orgs: safeCount('SELECT COUNT(*) AS c FROM detection_orgs'),
    // 拍卖表可能尚未创建,try/catch 容错返回 0
    auction_deals: safeCount('SELECT COUNT(*) AS c FROM auction_deals'),
    auction_total_amount: safeSum('SELECT COALESCE(SUM(final_price),0) AS s FROM auction_deals'),
    // 仲裁表可能尚未创建,try/catch 容错返回 0
    arbitration_cases: safeCount('SELECT COUNT(*) AS c FROM arbitration_cases'),
    news_published: safeCount("SELECT COUNT(*) AS c FROM news WHERE status='published'"),
    notices_published: safeCount("SELECT COUNT(*) AS c FROM notices WHERE status='published'"),
    banners: safeCount('SELECT COUNT(*) AS c FROM banners'),
    audit_logs: safeCount('SELECT COUNT(*) AS c FROM audit_logs'),
  };
  return ok(res, data);
});

// GET /api/statistics/gene - 基因维度:档案总量、本月新增、检测量、录入审核通过率;按品种/血统分布;鸽主 Top10
statisticsRouter.get('/gene', (_req: AuthedRequest, res: Response) => {
  const total = safeCount('SELECT COUNT(*) AS c FROM gene_profiles');
  const monthNew = safeCount('SELECT COUNT(*) AS c FROM gene_profiles WHERE created_at >= ?', [
    monthStartMs(),
  ]);
  const tests = safeCount('SELECT COUNT(*) AS c FROM gene_tests');
  const submissionsTotal = safeCount('SELECT COUNT(*) AS c FROM gene_manual_submissions');
  const submissionsApproved = safeCount(
    "SELECT COUNT(*) AS c FROM gene_manual_submissions WHERE status='approved'"
  );
  const approvalRate = submissionsTotal > 0 ? submissionsApproved / submissionsTotal : 0;

  const breedDistribution = safeQueryAll<NameValue>(
    `SELECT breed AS name, COUNT(*) AS value
     FROM gene_profiles
     WHERE breed IS NOT NULL AND breed != ''
     GROUP BY breed
     ORDER BY value DESC`
  );

  const bloodlineDistribution = safeQueryAll<NameValue>(
    `SELECT bloodline AS name, COUNT(*) AS value
     FROM gene_profiles
     WHERE bloodline IS NOT NULL AND bloodline != ''
     GROUP BY bloodline
     ORDER BY value DESC`
  );

  const ownerTop10 = safeQueryAll<OwnerCount>(
    `SELECT owner_name, COUNT(*) AS count
     FROM gene_profiles
     WHERE owner_name IS NOT NULL AND owner_name != ''
     GROUP BY owner_name
     ORDER BY count DESC
     LIMIT 10`
  );

  return ok(res, {
    total,
    month_new: monthNew,
    tests,
    submissions_total: submissionsTotal,
    submissions_approved: submissionsApproved,
    approval_rate: approvalRate,
    breed_distribution: breedDistribution,
    bloodline_distribution: bloodlineDistribution,
    owner_top10: ownerTop10,
  });
});

// GET /api/statistics/competition - 赛事维度:场次按状态分布、参赛鸽数、完赛率
statisticsRouter.get('/competition', (_req: AuthedRequest, res: Response) => {
  const total = safeCount('SELECT COUNT(*) AS c FROM competitions');
  const statusDistribution = safeQueryAll<StatusCount>(
    `SELECT status, COUNT(*) AS count FROM competitions GROUP BY status ORDER BY count DESC`
  );
  const participantsTotal = safeCount('SELECT COUNT(*) AS c FROM competition_participants');
  const resultsTotal = safeCount('SELECT COUNT(*) AS c FROM competition_results');
  const finishedCompetitions = safeCount(
    "SELECT COUNT(*) AS c FROM competitions WHERE status='finished'"
  );
  // 完赛率 = 已结束赛事数 / 总赛事数
  const finishRate = total > 0 ? finishedCompetitions / total : 0;

  return ok(res, {
    total,
    status_distribution: statusDistribution,
    participants_total: participantsTotal,
    results_total: resultsTotal,
    finished_competitions: finishedCompetitions,
    finish_rate: finishRate,
  });
});

// GET /api/statistics/trade - 交易维度:NFT 铸造量按状态、拍卖成交量、成交额月度趋势、成交额 Top10
statisticsRouter.get('/trade', (_req: AuthedRequest, res: Response) => {
  const nftStatusDistribution = safeQueryAll<StatusCount>(
    `SELECT status, COUNT(*) AS count FROM nft_assets GROUP BY status ORDER BY count DESC`
  );
  const nftTransfers = safeCount('SELECT COUNT(*) AS c FROM nft_transfers');

  // 拍卖相关:表可能尚未创建,try/catch 容错返回 0/空
  const auctionDeals = safeCount('SELECT COUNT(*) AS c FROM auction_deals');
  const auctionTotalAmount = safeSum('SELECT COALESCE(SUM(final_price),0) AS s FROM auction_deals');

  const auctionMonthlyTrend = safeQueryAll<AuctionMonthly>(
    `SELECT strftime('%Y-%m', created_at/1000, 'unixepoch') AS month,
            COUNT(*) AS count,
            COALESCE(SUM(final_price),0) AS amount
     FROM auction_deals
     GROUP BY month
     ORDER BY month`
  );

  // 拍卖成交额 Top10:自适应选取成交方列名(买家/中标人)
  const nameCol = pickColumn('auction_deals', [
    'buyer_name',
    'buyer',
    'winner',
    'bidder_name',
    'user_name',
  ]);
  const auctionDealTop10: AuctionTopItem[] = nameCol
    ? safeQueryAll<AuctionTopItem>(
        `SELECT ${nameCol} AS name,
                COUNT(*) AS count,
                COALESCE(SUM(final_price),0) AS amount
         FROM auction_deals
         GROUP BY ${nameCol}
         ORDER BY amount DESC
         LIMIT 10`
      )
    : [];

  return ok(res, {
    nft_status_distribution: nftStatusDistribution,
    nft_transfers: nftTransfers,
    auction_deals: auctionDeals,
    auction_total_amount: auctionTotalAmount,
    auction_monthly_trend: auctionMonthlyTrend,
    auction_deal_top10: auctionDealTop10,
  });
});

// GET /api/statistics/user - 用户维度:注册量月度趋势、会员等级分布、认证状态分布
statisticsRouter.get('/user', (_req: AuthedRequest, res: Response) => {
  const total = safeCount('SELECT COUNT(*) AS c FROM users');
  const monthNew = safeCount('SELECT COUNT(*) AS c FROM users WHERE created_at >= ?', [
    monthStartMs(),
  ]);

  const monthlyTrend = safeQueryAll<MonthCount>(
    `SELECT strftime('%Y-%m', created_at/1000, 'unixepoch') AS month,
            COUNT(*) AS count
     FROM users
     GROUP BY month
     ORDER BY month`
  );

  // 会员等级分布:LEFT JOIN 等级表,无等级归为"未分级"
  const levelDistribution = safeQueryAll<LevelCount>(
    `SELECT COALESCE(ml.name, '未分级') AS level_name,
            COUNT(u.id) AS count
     FROM users u
     LEFT JOIN member_levels ml ON ml.id = u.member_level_id
     GROUP BY ml.id
     ORDER BY count DESC`
  );

  const certStatusDistribution = safeQueryAll<StatusCount>(
    `SELECT cert_status AS status, COUNT(*) AS count
     FROM users
     GROUP BY cert_status
     ORDER BY count DESC`
  );

  return ok(res, {
    total,
    month_new: monthNew,
    monthly_trend: monthlyTrend,
    level_distribution: levelDistribution,
    cert_status_distribution: certStatusDistribution,
  });
});

// GET /api/statistics/trend?days=30 - 通用趋势:近 N 天每日新增档案/用户/订单等(按 created_at 日期 GROUP BY)
statisticsRouter.get('/trend', (req: AuthedRequest, res: Response) => {
  const rawDays = parseInt(String(req.query.days ?? '30'), 10);
  const days = Number.isFinite(rawDays) ? Math.min(Math.max(rawDays, 1), 365) : 30;
  const startMs = trendStartMs(days);
  const dates = recentDateLabels(days);

  // 初始化日期序列,每个指标默认 0
  const rows: TrendRow[] = dates.map((d) => ({
    date: d,
    gene: 0,
    user: 0,
    order: 0,
    nft: 0,
    competition: 0,
  }));
  const idxMap = new Map<string, number>();
  dates.forEach((d, i) => idxMap.set(d, i));

  // 逐指标按日聚合,合并到日期序列
  TREND_METRICS.forEach((m) => {
    const daily = safeQueryAll<{ d: string; c: number }>(
      `SELECT date(created_at/1000, 'unixepoch') AS d, COUNT(*) AS c
       FROM ${m.table}
       WHERE created_at >= ?
       GROUP BY d`,
      [startMs]
    );
    daily.forEach((r) => {
      const idx = idxMap.get(r.d);
      if (idx !== undefined) {
        rows[idx][m.key] = r.c;
      }
    });
  });

  const result: TrendData = {
    dates,
    rows,
    metrics: TREND_METRICS.map((m) => ({ key: m.key, label: m.label })),
  };
  return ok(res, result);
});

export default statisticsRouter;
