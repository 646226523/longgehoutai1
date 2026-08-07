import type { TrendPoint } from './mockData';

export interface TrendPointV2 {
  date: string;
  geneDaily: number;
  geneStock: number;
  geneRatePct: number;
  rateIsMissing?: boolean;
  nftDaily: number;
  userDaily: number;
}

export interface ExtremePoint {
  maxPoint: TrendPointV2;
  minPoint: TrendPointV2;
  maxIndex: number;
  minIndex: number;
}

export function deriveV2Data(data: TrendPoint[]): TrendPointV2[] {
  const result: TrendPointV2[] = [];
  let geneStock = 0;
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    geneStock += item.gene;
    let geneRatePct = 0;
    let rateIsMissing = false;
    if (i === 0) {
      rateIsMissing = true;
    } else {
      const yesterday = data[i - 1].gene;
      if (yesterday === 0) {
        rateIsMissing = true;
      } else {
        geneRatePct = ((item.gene - yesterday) / yesterday) * 100;
      }
    }
    result.push({
      date: item.date,
      geneDaily: item.gene,
      geneStock,
      geneRatePct,
      rateIsMissing,
      nftDaily: item.nft,
      userDaily: item.user,
    });
  }
  return result;
}

export function getExtremes(
  v2: TrendPointV2[],
  key: 'geneDaily' | 'geneStock' = 'geneDaily',
): ExtremePoint {
  if (v2.length === 0) {
    throw new Error('getExtremes: empty array');
  }
  let maxIndex = 0;
  let minIndex = 0;
  for (let i = 1; i < v2.length; i++) {
    if (v2[i][key] > v2[maxIndex][key]) {
      maxIndex = i;
    }
    if (v2[i][key] < v2[minIndex][key]) {
      minIndex = i;
    }
  }
  return {
    maxPoint: v2[maxIndex],
    minPoint: v2[minIndex],
    maxIndex,
    minIndex,
  };
}

export const sum = (arr: number[]): number => {
  let total = 0;
  for (let i = 0; i < arr.length; i++) {
    total += arr[i];
  }
  return total;
};

export const avg = (arr: number[]): number => {
  if (arr.length === 0) return 0;
  return sum(arr) / arr.length;
};

export const share = (value: number, total: number): number => {
  if (total === 0) return 0;
  return (value / total) * 100;
};

export function formatPct(
  v: number | undefined,
  digits = 1,
  isMissing = false,
): string {
  if (v === undefined || isMissing) return '—';
  if (v > 0) return `↑${v.toFixed(digits)}%`;
  if (v < 0) return `↓${Math.abs(v).toFixed(digits)}%`;
  return '持平';
}

export function formatDateShort(dateStr: string): string {
  let cleaned = dateStr;
  if (cleaned.startsWith('20')) {
    cleaned = cleaned.slice(5);
  }
  cleaned = cleaned.replace(/-/g, '/');
  return cleaned;
}

export function calcDailyRate(
  values: number[],
  i: number,
): { rate: number; missing: boolean } {
  if (i <= 0 || i >= values.length) {
    return { rate: 0, missing: true };
  }
  const yesterday = values[i - 1];
  if (yesterday === 0) {
    return { rate: 0, missing: true };
  }
  const rate = ((values[i] - yesterday) / yesterday) * 100;
  return { rate, missing: false };
}

export function calcShare(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

export function getExtremesFor<T>(
  arr: T[],
  fn: (o: T) => number,
): {
  maxIndex: number;
  minIndex: number;
  maxValue: number;
  minValue: number;
} {
  if (arr.length === 0) {
    return { maxIndex: -1, minIndex: -1, maxValue: 0, minValue: 0 };
  }
  let maxIndex = 0;
  let minIndex = 0;
  let maxValue = fn(arr[0]);
  let minValue = fn(arr[0]);
  for (let i = 1; i < arr.length; i++) {
    const v = fn(arr[i]);
    if (v > maxValue) {
      maxIndex = i;
      maxValue = v;
    }
    if (v < minValue) {
      minIndex = i;
      minValue = v;
    }
  }
  return { maxIndex, minIndex, maxValue, minValue };
}
