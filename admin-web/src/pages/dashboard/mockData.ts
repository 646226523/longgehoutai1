export interface MetricItem {
  key: string;
  title: string;
  value: number;
  unit: string;
  trend: number;
  trendLabel: string;
  weeklyTrend: number;
  weeklyTrendLabel: string;
  healthLabel: string;
  healthColor: string;
  progressPercent: number;
  goalText: string;
  todayNew: number;
  weekTotal: number;
  iconType: 'gene' | 'nft' | 'race' | 'user';
  navigatePath: string;
}

export interface TrendPoint {
  date: string;
  gene: number;
  user: number;
  nft: number;
}

export interface AlertItem {
  id: string;
  level: 'urgent' | 'warning' | 'info' | 'success';
  title: string;
  time: string;
  link: string;
}

export interface QuickEntryState {
  gene: { label: string; count: number; path: string };
  nft: { label: string; count: number; path: string };
  race: { label: string; count: number; path: string };
  user: { label: string; count: number; path: string };
}

export interface TodoItem {
  id: string;
  title: string;
  count: number;
  unit: string; // 条/个/场/人
  businessKey: 'gene' | 'nft' | 'race' | 'user';
  path: string;
}

export const metrics: MetricItem[] = [
  {
    key: 'gene',
    title: '基因档案总数',
    value: 1284,
    unit: '羽',
    trend: 12.5,
    trendLabel: '较昨日',
    weeklyTrend: 8.3,
    weeklyTrendLabel: '较上周',
    healthLabel: '稳定增长',
    healthColor: '#52c41a',
    progressPercent: 64,
    goalText: '本月目标 2,000',
    todayNew: 23,
    weekTotal: 156,
    iconType: 'gene',
    navigatePath: '/gene/list',
  },
  {
    key: 'nft',
    title: 'NFT 资产数',
    value: 856,
    unit: '个',
    trend: 8.3,
    trendLabel: '较昨日',
    weeklyTrend: 5.2,
    weeklyTrendLabel: '较上周',
    healthLabel: '运行稳定',
    healthColor: '#52c41a',
    progressPercent: 43,
    goalText: '本月目标 2,000',
    todayNew: 5,
    weekTotal: 35,
    iconType: 'nft',
    navigatePath: '/nft/list',
  },
  {
    key: 'race',
    title: '进行中赛事',
    value: 3,
    unit: '场',
    trend: 0,
    trendLabel: '较昨日',
    weeklyTrend: -1,
    weeklyTrendLabel: '较上周',
    healthLabel: '需关注',
    healthColor: '#faad14',
    progressPercent: 75,
    goalText: '本月计划 4 场',
    todayNew: 1,
    weekTotal: 8,
    iconType: 'race',
    navigatePath: '/competition/list',
  },
  {
    key: 'user',
    title: '注册用户数',
    value: 2340,
    unit: '人',
    trend: 6.7,
    trendLabel: '较昨日',
    weeklyTrend: 4.1,
    weeklyTrendLabel: '较上周',
    healthLabel: '稳定增长',
    healthColor: '#52c41a',
    progressPercent: 78,
    goalText: '本月目标 3,000',
    todayNew: 12,
    weekTotal: 85,
    iconType: 'user',
    navigatePath: '/user-member/user',
  },
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateTrendData(days: number, seedOffset?: number): TrendPoint[] {
  const data: TrendPoint[] = [];
  const today = new Date();
  const rand = seedOffset !== undefined ? seededRandom(12345 + seedOffset) : Math.random;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i + (seedOffset || 0));
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
    const base = Math.sin(i * 0.5) * 5 + 15;
    data.push({
      date: dateStr,
      gene: Math.round(base + rand() * 8),
      user: Math.round(base * 0.6 + rand() * 5),
      nft: Math.round(base * 0.3 + rand() * 4),
    });
  }
  return data;
}

export const trendData7 = generateTrendData(7);
export const trendData30 = generateTrendData(30);
export const trendData90 = generateTrendData(90);

export const prevTrendData7 = generateTrendData(7, -7);
export const prevTrendData30 = generateTrendData(30, -30);
export const prevTrendData90 = generateTrendData(90, -90);

import type { TrendRange } from './insightAndExport';
export const rangeDaysMap: Record<TrendRange, 7 | 30 | 90> = { week7: 7, week30: 30, week90: 90 };

export const alerts: AlertItem[] = [
  {
    id: '1',
    level: 'warning',
    title: '赛事预警:「冬季精英赛」报名不足100羽,距报名截止仅剩3天',
    time: '1小时前',
    link: '/competition/list',
  },
  {
    id: '2',
    level: 'success',
    title: 'NFT铸造: 已连续3天铸造成功率达100%,系统运行稳定',
    time: '3小时前',
    link: '/nft/list',
  },
  {
    id: '3',
    level: 'info',
    title: '提醒: 明日有2场赛事即将开赛,请关注参赛鸽状态',
    time: '5小时前',
    link: '/competition/list',
  },
];

export const quickEntryState: QuickEntryState = {
  gene: { label: '待审核', count: 12, path: '/gene/list' },
  nft: { label: '待上架', count: 5, path: '/nft/list' },
  race: { label: '进行中', count: 3, path: '/competition/list' },
  user: { label: '待审核', count: 8, path: '/user-member/user' },
};

export const todos: TodoItem[] = [
  { id: '1', title: '审核新上传的基因档案', count: 12, unit: '条', businessKey: 'gene', path: '/gene/list' },
  { id: '2', title: '确认 NFT 资产上架', count: 5, unit: '个', businessKey: 'nft', path: '/nft/list' },
  { id: '3', title: '查看今日开赛赛事数据', count: 1, unit: '场', businessKey: 'race', path: '/competition/list' },
  { id: '4', title: '处理用户注册审核', count: 8, unit: '人', businessKey: 'user', path: '/user-member/user' },
  { id: '5', title: '跟进冬季精英赛报名情况', count: 1, unit: '场', businessKey: 'race', path: '/competition/list' },
];

export const trendInsights = {
  week7: '近7天基因档案新增 156 羽,环比上周 ↑ 12.5%;用户日均活跃 45-60 人',
  week30: '近30天基因档案新增 682 羽,日均 22.7 羽;整体呈稳步增长趋势',
  week90: '近90天基因档案累计新增 2,048 羽,日均 22.8 羽;用户增长稳定,NFT 铸造略有波动',
};

export interface PortAnalysisData {
  channel: string;
  value: number;
  color: string;
  prevValue?: number;
  unit?: '人' | '个';
}

export const registerPortData: PortAnalysisData[] = [
  { channel: '网页注册', value: 1234, prevValue: 1190, color: '#1677ff' },
  { channel: 'APP 注册', value: 856, prevValue: 820, color: '#52c41a' },
  { channel: '小程序注册', value: 678, prevValue: 658, color: '#faad14' },
  { channel: '第三方 OAuth', value: 234, prevValue: 222, color: '#722ed1' },
];

export const loginPortData: PortAnalysisData[] = [
  { channel: '网页登录', value: 2345, prevValue: 2210, color: '#1677ff' },
  { channel: 'APP 登录', value: 1856, prevValue: 1750, color: '#52c41a' },
  { channel: '小程序登录', value: 1234, prevValue: 1170, color: '#faad14' },
  { channel: '扫码登录', value: 856, prevValue: 805, color: '#eb2f96' },
  { channel: '第三方登录', value: 456, prevValue: 435, color: '#722ed1' },
];
