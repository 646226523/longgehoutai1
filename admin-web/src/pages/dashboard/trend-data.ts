import type { TrendPoint } from './mockData';

export type TrendRange = 'week7' | 'week30' | 'week90';

export interface TrendPointV2 {
  date: string;
  dateFullIso: string;
  geneDaily: number;
  geneStock: number;
  geneRatePct: number | null;
  rateIsMissing: boolean;
  nftDaily: number;
  userDaily: number;
}

export interface Extremes {
  maxDailyIdx: number;
  minDailyIdx: number;
  peakDate: string;
  peakDaily: number;
  valleyDate: string;
  valleyDaily: number;
}

export interface DimensionStats {
  total: number | null;
  mean: number;
  peakDate: string;
  peakValue: number;
  unit: '羽' | '%' | '个' | '人';
  label: string;
}

export function deriveV2Data(data: TrendPoint[], todayOffsetDays = 0): TrendPointV2[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  today.setDate(today.getDate() + todayOffsetDays);

  const len = data.length;
  const result: TrendPointV2[] = new Array(len);
  let stockAcc = 0;

  for (let i = 0; i < len; i++) {
    const point = data[i];
    const geneDaily = point.gene;
    stockAcc += geneDaily;

    const dayOffset = (len - 1) - i;
    const d = new Date(today);
    d.setDate(today.getDate() - dayOffset);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateFullIso = `${yyyy}-${mm}-${dd}`;

    let geneRatePct: number | null = null;
    if (i > 0) {
      const prevGene = data[i - 1].gene;
      if (prevGene !== 0) {
        geneRatePct = ((geneDaily - prevGene) / prevGene) * 100;
      }
    }

    result[i] = {
      date: point.date,
      dateFullIso,
      geneDaily,
      geneStock: stockAcc,
      geneRatePct,
      rateIsMissing: geneRatePct === null,
      nftDaily: point.nft,
      userDaily: point.user,
    };
  }

  return result;
}

export function calcExtremes(v2: TrendPointV2[]): Extremes {
  const len = v2.length;
  if (len === 0) {
    return {
      maxDailyIdx: -1,
      minDailyIdx: -1,
      peakDate: '',
      peakDaily: 0,
      valleyDate: '',
      valleyDaily: 0,
    };
  }

  const startIdx = len === 1 ? 0 : 1;
  let maxIdx = startIdx;
  let minIdx = startIdx;
  let maxVal = v2[startIdx].geneDaily;
  let minVal = v2[startIdx].geneDaily;

  for (let i = startIdx + 1; i < len; i++) {
    const v = v2[i].geneDaily;
    if (v > maxVal) {
      maxVal = v;
      maxIdx = i;
    }
    if (v < minVal) {
      minVal = v;
      minIdx = i;
    }
  }

  return {
    maxDailyIdx: maxIdx,
    minDailyIdx: minIdx,
    peakDate: v2[maxIdx].date,
    peakDaily: maxVal,
    valleyDate: v2[minIdx].date,
    valleyDaily: minVal,
  };
}

export function formatDateShort(dateFullIso: string): string {
  const parts = dateFullIso.split('-');
  if (parts.length !== 3) return dateFullIso;
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  return `${m}/${d}`;
}

export function formatPct(v: number | null, digits = 1): string {
  if (v === null) return '—';
  const fixed = v.toFixed(digits);
  return v >= 0 ? `+${fixed}%` : `${fixed}%`;
}

export function sum(arr: number[]): number {
  let total = 0;
  for (let i = 0; i < arr.length; i++) {
    total += arr[i];
  }
  return total;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return sum(arr) / arr.length;
}

function formatAvgOneDecimal(v: number): string {
  const rounded = Math.round(v * 10) / 10;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(1);
}

function rangeToDays(range: TrendRange): number {
  return range === 'week7' ? 7 : range === 'week30' ? 30 : 90;
}

export function buildInsightText(
  v2: TrendPointV2[],
  range: TrendRange,
  prevV2?: TrendPointV2[],
): string {
  const X = rangeToDays(range);
  const geneDailyArr = v2.map(v => v.geneDaily);
  const total = sum(geneDailyArr);
  const avg = v2.length > 0 ? total / v2.length : 0;
  const avgStr = formatAvgOneDecimal(avg);
  const extremes = calcExtremes(v2);

  let todayCompare = '今日较昨日：—';
  if (v2.length >= 2) {
    let baseDaily: number;
    let todayDaily: number;

    if (prevV2 && prevV2.length > 0) {
      baseDaily = prevV2[prevV2.length - 1].geneDaily;
      todayDaily = v2[v2.length - 1].geneDaily;
    } else {
      baseDaily = v2[v2.length - 2].geneDaily;
      todayDaily = v2[v2.length - 1].geneDaily;
    }

    if (baseDaily === 0) {
      todayCompare = '今日较昨日：—';
    } else {
      const pct = ((todayDaily - baseDaily) / baseDaily) * 100;
      const arrow = pct > 0 ? '↑' : pct < 0 ? '↓' : '—';
      const pctStr = Math.abs(pct).toFixed(1);
      todayCompare = `今日较昨日：${arrow}${pctStr}%`;
    }
  }

  return `💡 近${X}天新增档案 ${total} 羽（日均 ${avgStr} 羽），峰值 ${extremes.peakDate} ${extremes.peakDaily} 羽 / 谷值 ${extremes.valleyDate} ${extremes.valleyDaily} 羽。${todayCompare}。`;
}

function todayYmd(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

export function buildCsvContent(
  v2: TrendPointV2[],
  range: TrendRange,
): { blobContent: string; filename: string } {
  const lines: string[] = [];
  lines.push('日期,基因档案日增量,基因档案存量,日环比增长率(%),NFT日铸量,活跃用户数');

  for (let i = 0; i < v2.length; i++) {
    const p = v2[i];
    const rateStr = p.geneRatePct === null ? '' : p.geneRatePct.toFixed(2);
    lines.push(
      `${p.dateFullIso},${p.geneDaily},${p.geneStock},${rateStr},${p.nftDaily},${p.userDaily}`,
    );
  }

  const blobContent = '\uFEFF' + lines.join('\r\n');
  const rangeKey = range;
  const filename = `trend_${rangeKey}_${todayYmd()}.csv`;

  return { blobContent, filename };
}

export function getDimensionStats(
  v2: TrendPointV2[],
  key: 'stock' | 'rate' | 'nft' | 'user',
): DimensionStats {
  const len = v2.length;

  if (key === 'stock') {
    const total = len > 0 ? v2[len - 1].geneStock : 0;
    const geneDailyArr = v2.map(v => v.geneDaily);
    const avgVal = len > 0 ? sum(geneDailyArr) / len : 0;
    let peakIdx = 0;
    let peakV = geneDailyArr[0] ?? 0;
    for (let i = 1; i < len; i++) {
      if (geneDailyArr[i] > peakV) {
        peakV = geneDailyArr[i];
        peakIdx = i;
      }
    }
    return {
      total,
      mean: avgVal,
      peakDate: len > 0 ? v2[peakIdx].date : '',
      peakValue: peakV,
      unit: '羽',
      label: '基因档案存量',
    };
  }

  if (key === 'rate') {
    const rateVals: number[] = [];
    let peakIdx = 1;
    let peakV = -Infinity;
    for (let i = 1; i < len; i++) {
      const rv = v2[i].geneRatePct ?? 0;
      rateVals.push(rv);
      if (rv > peakV) {
        peakV = rv;
        peakIdx = i;
      }
    }
    if (peakV === -Infinity) {
      peakV = 0;
      peakIdx = len > 1 ? 1 : 0;
    }
    const avgVal = rateVals.length > 0 ? mean(rateVals) : 0;
    return {
      total: null,
      mean: avgVal,
      peakDate: len > peakIdx ? v2[peakIdx].date : '',
      peakValue: peakV,
      unit: '%',
      label: '基因日增环比%',
    };
  }

  if (key === 'nft') {
    const nftArr = v2.map(v => v.nftDaily);
    const totalVal = sum(nftArr);
    const avgVal = len > 0 ? totalVal / len : 0;
    let peakIdx = 0;
    let peakV = nftArr[0] ?? 0;
    for (let i = 1; i < len; i++) {
      if (nftArr[i] > peakV) {
        peakV = nftArr[i];
        peakIdx = i;
      }
    }
    return {
      total: totalVal,
      mean: avgVal,
      peakDate: len > 0 ? v2[peakIdx].date : '',
      peakValue: peakV,
      unit: '个',
      label: 'NFT 日铸量',
    };
  }

  const userArr = v2.map(v => v.userDaily);
  const totalVal = sum(userArr);
  const avgVal = len > 0 ? totalVal / len : 0;
  let peakIdx = 0;
  let peakV = userArr[0] ?? 0;
  for (let i = 1; i < len; i++) {
    if (userArr[i] > peakV) {
      peakV = userArr[i];
      peakIdx = i;
    }
  }
  return {
    total: totalVal,
    mean: avgVal,
    peakDate: len > 0 ? v2[peakIdx].date : '',
    peakValue: peakV,
    unit: '人',
    label: '活跃用户数',
  };
}
