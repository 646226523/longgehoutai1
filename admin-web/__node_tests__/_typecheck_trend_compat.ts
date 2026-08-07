import { trendData7, trendData30, trendData90, type TrendPoint } from '../src/pages/dashboard/mockData';
import {
  deriveV2Data,
  calcExtremes,
  buildInsightText,
  buildCsvContent,
  getDimensionStats,
  formatDateShort,
  formatPct,
  sum,
} from '../src/pages/dashboard/trend-data';

// 兼容性验证：TrendPoint[] 直接喂给 deriveV2Data，无类型错误
const v2_7: ReturnType<typeof deriveV2Data> = deriveV2Data(trendData7);
const v2_30 = deriveV2Data(trendData30);
const v2_90 = deriveV2Data(trendData90);

// 完整链路过一遍类型检查
const extremes = calcExtremes(v2_7);
const insight = buildInsightText(v2_7, 'week7');
const csv = buildCsvContent(v2_7, 'week7');
const statStock = getDimensionStats(v2_30, 'stock');
const statRate = getDimensionStats(v2_30, 'rate');
const statNft = getDimensionStats(v2_30, 'nft');
const statUser = getDimensionStats(v2_30, 'user');

// format 家族
const ds = formatDateShort(v2_7[0].dateFullIso);
const fp = formatPct(v2_7[1].geneRatePct);
const s = sum(v2_7.map(v => v.geneDaily));

// 显式类型标注验证（赋值不兼容会直接 tsc 报错）
const _tp: TrendPoint = trendData7[0];
const _todayStock: number = v2_7[v2_7.length - 1].geneStock;
const _rateMissing0: boolean = v2_7[0].rateIsMissing;
const _peakDateStr: string = extremes.peakDate;
const _peakDailyNum: number = extremes.peakDaily;

// AC-3 验证类型：终点数值 = v2Data[-1].geneStock（左轴最大刻度 ≥ 此值由 ECharts 保证）
const _ac3_endValue: number = v2_7[v2_7.length - 1].geneStock;

// AC-10 验证类型：extremes.maxDailyIdx/minDailyIdx 是 number
const _ac10_maxIdx: number = extremes.maxDailyIdx;
const _ac10_minIdx: number = extremes.minDailyIdx;

// AC-5 单一数据源验证：主/辅/洞察/CSV 全部取 v2[...] 同一对象（此处只过类型）
const _ac5_mainEndToday = v2_7[v2_7.length - 1];
const _ac5_subNftToday: number = _ac5_mainEndToday.nftDaily;
const _ac5_subUserToday: number = _ac5_mainEndToday.userDaily;
const _ac5_csvLast = csv.blobContent;

// AC-14 验证：BOM、6 列、首天空（类型层：blobContent 首字符 = '\uFEFF' 只能运行时测，此处测存在）
const _ac14_bomStr: string = csv.blobContent;
const _ac14_filenameMatch: boolean = /^trend_week[739]0?_\d{8}\.csv$/.test(csv.filename);

// 防止 unused 警告
export const _compatReport = {
  v2Len7: v2_7.length,
  v2Len30: v2_30.length,
  v2Len90: v2_90.length,
  stock7: _todayStock,
  peakDate: extremes.peakDate,
  insightLen: insight.length,
  bomChar0: csv.blobContent.charCodeAt(0),
  statStockTotal: statStock.total,
  statRateTotalNull: statRate.total === null,
  statNftUnit: statNft.unit === '个',
  statUserUnit: statUser.unit === '人',
  formatDateShortOk: ds.length > 0,
  formatPctOk: fp.length > 0,
  sumOk: s > 0,
  ac14FilenameOk: _ac14_filenameMatch,
};
