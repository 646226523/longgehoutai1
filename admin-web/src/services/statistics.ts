import { http } from './request';

// ==================== 数据统计中心 - 接口类型与请求函数 ====================
// 对应后端 admin-api/src/routes/statistics.ts,挂载于 /api/statistics

// 通用:名称-数值对(分布图)
export interface NameValue {
  name: string;
  value: number;
}

// 通用:状态-计数对
export interface StatusCount {
  status: string;
  count: number;
}

// 通用:月份-计数对
export interface MonthCount {
  month: string;
  count: number;
}

// 总览指标卡片数据
export interface OverviewStat {
  gene_profiles: number;
  nft_assets: number;
  competitions: number;
  lofts: number;
  users: number;
  detection_reports: number;
  detection_orders: number;
  detection_orgs: number;
  auction_deals: number;
  auction_total_amount: number;
  arbitration_cases: number;
  news_published: number;
  notices_published: number;
  banners: number;
  audit_logs: number;
}

// 鸽主档案数
export interface OwnerCount {
  owner_name: string;
  count: number;
}

// 基因维度统计
export interface GeneStat {
  total: number;
  month_new: number;
  tests: number;
  submissions_total: number;
  submissions_approved: number;
  approval_rate: number;
  breed_distribution: NameValue[];
  bloodline_distribution: NameValue[];
  owner_top10: OwnerCount[];
}

// 赛事维度统计
export interface CompetitionStat {
  total: number;
  status_distribution: StatusCount[];
  participants_total: number;
  results_total: number;
  finished_competitions: number;
  finish_rate: number;
}

// 拍卖月度趋势
export interface AuctionMonthly {
  month: string;
  count: number;
  amount: number;
}

// 拍卖成交额排行项
export interface AuctionTopItem {
  name: string;
  amount: number;
  count: number;
}

// 交易维度统计
export interface TradeStat {
  nft_status_distribution: StatusCount[];
  nft_transfers: number;
  auction_deals: number;
  auction_total_amount: number;
  auction_monthly_trend: AuctionMonthly[];
  auction_deal_top10: AuctionTopItem[];
}

// 会员等级分布项
export interface LevelCount {
  level_name: string;
  count: number;
}

// 用户维度统计
export interface UserStat {
  total: number;
  month_new: number;
  monthly_trend: MonthCount[];
  level_distribution: LevelCount[];
  cert_status_distribution: StatusCount[];
}

// 通用趋势单行(每日各指标新增数)
export interface TrendRow {
  date: string;
  gene: number;
  user: number;
  order: number;
  nft: number;
  competition: number;
}

// 通用趋势数据
export interface TrendData {
  dates: string[];
  rows: TrendRow[];
  metrics: Array<{ key: string; label: string }>;
}

// 趋势指标配置(与后端 TREND_METRICS 保持一致,供前端表格列动态生成)
export const TREND_METRICS = [
  { key: 'gene' as const, label: '基因档案' },
  { key: 'user' as const, label: '用户' },
  { key: 'order' as const, label: '检测订单' },
  { key: 'nft' as const, label: 'NFT 资产' },
  { key: 'competition' as const, label: '赛事' },
];

// 总览:各模块核心计数
export async function getOverviewStat(): Promise<OverviewStat> {
  return await http.get<OverviewStat>('/statistics/overview');
}

// 基因维度统计
export async function getGeneStat(): Promise<GeneStat> {
  return await http.get<GeneStat>('/statistics/gene');
}

// 赛事维度统计
export async function getCompetitionStat(): Promise<CompetitionStat> {
  return await http.get<CompetitionStat>('/statistics/competition');
}

// 交易维度统计
export async function getTradeStat(): Promise<TradeStat> {
  return await http.get<TradeStat>('/statistics/trade');
}

// 用户维度统计
export async function getUserStat(): Promise<UserStat> {
  return await http.get<UserStat>('/statistics/user');
}

// 通用趋势:近 N 天每日新增
export async function getTrendStat(days: number): Promise<TrendData> {
  return await http.get<TrendData>('/statistics/trend', { params: { days } });
}
