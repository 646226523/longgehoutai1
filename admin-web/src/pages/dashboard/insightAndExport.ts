import type { TrendPoint } from './mockData';
import type { TrendPointV2, ExtremePoint } from './trendUtils';
import { deriveV2Data, formatPct, formatDateShort, getExtremes, sum } from './trendUtils';

export type TrendRange = 'week7' | 'week30' | 'week90';

export const rangeDaysMap: Record<TrendRange, 7 | 30 | 90> = {
  week7: 7,
  week30: 30,
  week90: 90,
};

export function buildInsight(
  currData: TrendPoint[],
  range: TrendRange,
  prevData?: TrendPoint[],
): { text: string; v2Data: TrendPointV2[]; extremes: ExtremePoint } {
  const v2Data = deriveV2Data(currData);
  const extremes = getExtremes(v2Data, 'geneDaily');
  const days = rangeDaysMap[range];
  const rangeDaysText = days === 7 ? '7天' : days === 30 ? '30天' : '90天';

  const geneArr = currData.map((d) => d.gene);
  const total = sum(geneArr);
  const avgVal = total / days;
  const avgText = avgVal.toFixed(1);

  let compareText = '';
  if (prevData && prevData.length > 0) {
    const prevTotal = sum(prevData.map((d) => d.gene));
    let weekRate = 0;
    let rateMissing = false;
    if (prevTotal === 0) {
      rateMissing = true;
    } else {
      weekRate = ((total - prevTotal) / prevTotal) * 100;
    }
    const pctStr = formatPct(weekRate, 1, rateMissing);
    if (days === 7) {
      compareText = `，环比上周 ${pctStr}`;
    } else {
      const periodText = days === 30 ? '上月' : '上季';
      compareText = `，环比${periodText} ${pctStr}`;
    }
  } else {
    if (currData.length >= 2) {
      const last = currData[currData.length - 1].gene;
      const prevDay = currData[currData.length - 2].gene;
      let yesterdayRate = 0;
      let missing = false;
      if (prevDay === 0) {
        missing = true;
      } else {
        yesterdayRate = ((last - prevDay) / prevDay) * 100;
      }
      compareText = `，环比昨日 ${formatPct(yesterdayRate, 1, missing)}`;
    }
  }

  const peakPoint = extremes.maxPoint;
  const peakDate = formatDateShort(peakPoint.date);
  const peakValue = peakPoint.geneDaily;

  const text = `近${rangeDaysText}基因档案新增 ${total} 羽${compareText}；日均 ${avgText} 羽；峰值 ${peakDate} 新增 ${peakValue} 羽`;

  return { text, v2Data, extremes };
}

export function exportTrendCsv(
  currData: TrendPoint[],
  range: TrendRange,
  v2Data: TrendPointV2[],
): void {
  void currData;
  const days = rangeDaysMap[range];
  const today = new Date();
  const yyyymmdd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const fileName = `运营趋势_近${days}天_v2_${yyyymmdd}.csv`;

  const header = '日期,基因档案存量,基因日增量,日增环比%,NFT日铸量,活跃用户数';

  const rows: string[] = [];
  for (let i = 0; i < v2Data.length; i++) {
    const v = v2Data[i];
    const rateStr = v.rateIsMissing ? '—' : `${v.geneRatePct.toFixed(1)}%`;
    rows.push(`${v.date},${v.geneStock},${v.geneDaily},${rateStr},${v.nftDaily},${v.userDaily}`);
  }

  const csvContent = `\uFEFF${header}\n${rows.join('\n')}`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
