import * as echarts from 'echarts/core';
import { GraphicComponent } from 'echarts/components';
import type { EChartsOption, DefaultLabelFormatterCallbackParams, TooltipComponentFormatterCallbackParams } from 'echarts';
import type { TrendPointV2, Extremes, TrendRange } from './trend-data';
import type { LayoutV3Config } from './useResolutionTier';

echarts.use([GraphicComponent]);

export type SeriesKey = 'stock' | 'rate' | 'nft' | 'user';

export interface LayoutForOption {
  gridMain: { top: number; right: number; bottom: number; left: number };
  gridSub: { top: number; right: number; bottom: number; left: number };
  baseFontSizePx: 13 | 14 | 16;
  xTickInterval: number;
  xLabelRotateDeg: number;
  enableDataZoom: boolean;
  layoutV3?: LayoutV3Config;
}

const COLOR_STOCK = '#3B82F6';
const COLOR_RATE = '#10B981';
const COLOR_RATE_END = '#34d399';
const COLOR_NFT = '#faad14';
const COLOR_USER = '#52c41a';
const COLOR_MAX = '#ef4444';
const COLOR_MIN = '#10B981';
const COLOR_GRID = '#d9d9d9';

function formatPct(v: number | null, digits = 1): string {
  if (v === null) return '—';
  const fixed = v.toFixed(digits);
  return v >= 0 ? `+${fixed}%` : `${fixed}%`;
}

function sumGeneDailyOf(v2: TrendPointV2[]): number {
  let total = 0;
  for (let i = 0; i < v2.length; i++) total += v2[i].geneDaily;
  return total;
}

function rangeDays(range: TrendRange): number {
  return range === 'week7' ? 7 : range === 'week30' ? 30 : 90;
}

function yesterdayCompare(
  v2: TrendPointV2[],
  idx: number,
  key: 'geneDaily' | 'nftDaily' | 'userDaily',
): string {
  if (idx <= 0) return '—';
  const prev = v2[idx - 1][key];
  const cur = v2[idx][key];
  if (prev === 0) return '—';
  const pct = ((cur - prev) / prev) * 100;
  const arrow = pct > 0 ? '↑' : pct < 0 ? '↓' : '—';
  const abs = Math.abs(pct).toFixed(1);
  return arrow === '—' ? '—' : `${arrow} ${abs}%`;
}

function defaultTooltipFormatterMain(
  idx: number,
  v2: TrendPointV2[],
  sumGeneDaily: number,
  range: TrendRange,
): string {
  if (idx < 0 || idx >= v2.length) return '';
  const p = v2[idx];
  const X = rangeDays(range);
  const share = sumGeneDaily > 0 ? ((p.geneDaily / sumGeneDaily) * 100).toFixed(1) : '0.0';
  const geneCmp = yesterdayCompare(v2, idx, 'geneDaily');
  const nftCmp = yesterdayCompare(v2, idx, 'nftDaily');
  const userCmp = yesterdayCompare(v2, idx, 'userDaily');
  const lines = [
    `<b>${p.dateFullIso}</b>`,
    `基因档案存量 = ${p.geneStock} 羽`,
    `基因日增 = ${p.geneDaily} 羽  较昨日 ${geneCmp}`,
    `占周期总量 = 占近${X}天总量 ${share}%`,
    `日环比增长率 = ${formatPct(p.geneRatePct)}`,
    `NFT 资产 = ${p.nftDaily} 个  较昨日 ${nftCmp}`,
    `活跃用户 = ${p.userDaily} 人  较昨日 ${userCmp}`,
  ];
  return lines.join('<br/>');
}

export function buildMainOption(args: {
  v2Data: TrendPointV2[];
  extremes: Extremes;
  layout: LayoutForOption;
  hiddenSeries?: Set<SeriesKey>;
  range: TrendRange;
  buildTooltipFormatterMain?: (idx: number, v2: TrendPointV2[], sumGeneDaily: number) => string;
  disableCanvasLegend?: boolean;
  disableTodayWord?: boolean;
  markPointBubbleOffsetPx?: number;
  dataZoomExtraBottom?: number;
  mainBoundaryGap?: boolean | [string, string];
}): EChartsOption {
  const {
    v2Data,
    extremes,
    layout,
    hiddenSeries,
    range,
    buildTooltipFormatterMain,
    disableCanvasLegend = false,
    disableTodayWord = false,
    markPointBubbleOffsetPx = 18,
    dataZoomExtraBottom = 0,
    mainBoundaryGap,
  } = args;
  const hidden = hiddenSeries ?? new Set<SeriesKey>();
  const dataLen = v2Data.length;
  const sumGeneDaily = sumGeneDailyOf(v2Data);
  const symbolSize = dataLen <= 7 ? 8 : dataLen <= 30 ? 6 : 4;
  const endFontSize = Math.max(layout.baseFontSizePx + 2, 15);
  const dataZoomBottomPx = layout.enableDataZoom ? 26 + dataZoomExtraBottom : 0;

  const rateVisible = !hidden.has('rate');
  let boundaryGapVal: boolean | [string, string];
  if (rateVisible && mainBoundaryGap !== undefined) {
    boundaryGapVal = mainBoundaryGap;
  } else if (!hidden.has('rate')) {
    boundaryGapVal = ['15%', '15%'];
  } else {
    boundaryGapVal = false;
  }

  const barWidthMap = { week7: '35%', week30: '50%', week90: '60%' } as const;
  const layoutAny = layout as any;
  const mainBarMaxWidthPx = layoutAny?.layoutV3?.mainBarMaxWidthPx;
  const barMaxWidthMap = {
    week7: mainBarMaxWidthPx?.week7 ?? 24,
    week30: 20,
    week90: 14,
  } as const;

  const xIntervalMap = {
    week7: 0,
    week30: Math.ceil(v2Data.length / 8),
    week90: Math.ceil(v2Data.length / 12),
  } as const;
  const xRotateMainDeg = layoutAny?.layoutV3?.xRotateMainDeg;
  const xRotateVal = xRotateMainDeg !== undefined ? xRotateMainDeg : layout.xLabelRotateDeg;

  const mpSymbolSizeMap = { week7: 14, week30: 12, week90: 10 } as const;
  const baseFont = layout.baseFontSizePx;
  const mpFontSizeMap = { week7: baseFont + 1, week30: baseFont, week90: baseFont - 1 } as const;

  return {
    backgroundColor: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: '#F8FAFC' },
      { offset: 1, color: '#FFFFFF' },
    ]),
    textStyle: {
      fontSize: layout.baseFontSizePx,
      fontFamily: "'PingFang SC','Microsoft YaHei',sans-serif",
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: { show: true, precision: 0, margin: 8 },
      },
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#3B82F6',
      borderWidth: 1,
      padding: [10, 12],
      textStyle: { color: '#333', fontSize: layout.baseFontSizePx },
      formatter: (params: TooltipComponentFormatterCallbackParams) => {
        const idx: number = Array.isArray(params) && params.length > 0 ? params[0].dataIndex : -1;
        if (buildTooltipFormatterMain) {
          return buildTooltipFormatterMain(idx, v2Data, sumGeneDaily);
        }
        return defaultTooltipFormatterMain(idx, v2Data, sumGeneDaily, range);
      },
    },
    legend: {
      show: !disableCanvasLegend,
      data: ['基因档案存量', '日增环比增长率'],
      selected: {
        '基因档案存量': !hidden.has('stock'),
        '日增环比增长率': !hidden.has('rate'),
      },
      top: 0,
      right: 10,
      icon: 'roundRect',
      itemGap: 18,
      textStyle: { fontSize: layout.baseFontSizePx },
    },
    grid: {
      left: layout.gridMain.left,
      right: layout.gridMain.right,
      top: layout.gridMain.top,
      bottom: layout.gridMain.bottom + dataZoomBottomPx,
    },
    xAxis: {
      type: 'category',
      boundaryGap: boundaryGapVal as any,
      data: v2Data.map(d => d.date),
      axisLabel: {
        interval: xIntervalMap[range],
        rotate: xRotateVal,
        hideOverlap: false,
        showMinLabel: true,
        showMaxLabel: true,
        overflow: 'none',
        margin: 10,
        fontSize: layout.baseFontSizePx - 2,
      },
      axisLine: { lineStyle: { color: COLOR_GRID } },
    },
    yAxis: [
      {
        type: 'value',
        name: '',
        min: 0,
        axisLabel: {
          formatter: '{value}羽',
          fontSize: layout.baseFontSizePx - 2,
          margin: 10,
          align: 'right',
        },
        splitLine: { lineStyle: { type: 'dashed', color: COLOR_GRID, opacity: 0.3 } },
      },
      {
        type: 'value',
        name: '',
        min: (v: { min: number; max: number }) =>
          Math.floor(v.min <= -50 ? v.min * 1.2 : -50),
        max: (v: { min: number; max: number }) =>
          Math.ceil(v.max >= 100 ? v.max * 1.2 : 100),
        splitLine: { show: false },
        axisLabel: {
          formatter: '{value}%',
          fontSize: layout.baseFontSizePx - 2,
          margin: 10,
          align: 'left',
        },
      },
    ],
    series: [
      {
        name: '基因档案存量',
        type: 'line',
        yAxisIndex: 0,
        smooth: true,
        symbol: 'circle',
        symbolSize,
        lineStyle: { color: COLOR_STOCK, width: 3 },
        itemStyle: { color: COLOR_STOCK },
        areaStyle: { color: 'rgba(59,130,246,0.1)' },
        data: v2Data.map(d => d.geneStock),
        endLabel: {
          show: true,
          formatter: (p: DefaultLabelFormatterCallbackParams) => {
            const raw = typeof p.value === 'number' ? p.value : Number(p.value);
            const formatted = Number.isFinite(raw) ? raw.toLocaleString('zh-CN') : String(p.value);
            return disableTodayWord ? `${formatted} 羽` : `今日: ${formatted} 羽`;
          },
          position: 'right',
          distance: 2,
          align: 'right',
          verticalAlign: 'top',
          color: COLOR_STOCK,
          fontWeight: 800,
          fontSize: endFontSize,
        },
        markPoint: {
          symbolOffset: [0, -markPointBubbleOffsetPx],
          data: [
            {
              name: '峰值',
              coord: [extremes.maxDailyIdx, v2Data[extremes.maxDailyIdx]?.geneStock ?? 0],
              symbol: 'circle',
              symbolSize: mpSymbolSizeMap[range],
              itemStyle: { color: COLOR_MAX },
              label: { show: true, formatter: '峰值', color: COLOR_MAX, position: 'top', fontSize: mpFontSizeMap[range] },
            },
            {
              name: '谷值',
              coord: [extremes.minDailyIdx, v2Data[extremes.minDailyIdx]?.geneStock ?? 0],
              symbol: 'circle',
              symbolSize: mpSymbolSizeMap[range],
              itemStyle: { color: COLOR_MIN },
              label: { show: true, formatter: '谷值', color: COLOR_MIN, position: 'bottom', fontSize: mpFontSizeMap[range] },
            },
          ],
          z: 1000,
        },
        animationDuration: 600,
        animationDurationUpdate: 300,
        animationEasingUpdate: 'quinticInOut',
      },
      {
        name: '日增环比增长率',
        type: 'bar',
        yAxisIndex: 1,
        barWidth: barWidthMap[range],
        barMaxWidth: barMaxWidthMap[range],
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: COLOR_RATE_END },
              { offset: 1, color: COLOR_RATE },
            ],
          },
          borderRadius: [2, 2, 0, 0],
        },
        data: v2Data.map(d => (d.rateIsMissing ? null : d.geneRatePct)),
        animationDuration: 500,
        animationDurationUpdate: 280,
      },
    ],
    dataZoom: layout.enableDataZoom
      ? [
          {
            type: 'slider',
            bottom: 5,
            height: 14,
            start: 0,
            end: 100,
            borderColor: 'transparent',
            backgroundColor: 'rgba(59,130,246,0.06)',
            fillerColor: 'rgba(59,130,246,0.18)',
            moveHandleStyle: { color: COLOR_STOCK },
            textStyle: { fontSize: layout.baseFontSizePx - 2 },
          },
        ]
      : [],
  };
}

export function buildSubOption(args: {
  v2Data: TrendPointV2[];
  layout: LayoutForOption;
  hiddenSeries?: Set<SeriesKey>;
  disableCanvasLegend?: boolean;
  disableTodayWord?: boolean;
  range: TrendRange;
}): EChartsOption {
  const {
    v2Data,
    layout,
    hiddenSeries,
    disableCanvasLegend = false,
    disableTodayWord = false,
    range,
  } = args;
  const hidden = hiddenSeries ?? new Set<SeriesKey>();
  const lastIdx = v2Data.length - 1;

  const barWidthPct = range === 'week7' ? '38%' : range === 'week30' ? '42%' : '48%';
  const barMaxWidthPx = range === 'week7' ? 20 : range === 'week30' ? 16 : 12;
  const xInterval =
    range === 'week7' ? 0 : range === 'week30' ? Math.ceil(v2Data.length / 8) : Math.ceil(v2Data.length / 12);
  const xRotateDeg =
    layout.layoutV3?.xRotateSubDeg !== undefined
      ? layout.layoutV3.xRotateSubDeg
      : layout.xLabelRotateDeg - 5;

  return {
    backgroundColor: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: '#F8FAFC' },
      { offset: 1, color: '#FFFFFF' },
    ]),
    textStyle: {
      fontSize: layout.baseFontSizePx,
      fontFamily: "'PingFang SC','Microsoft YaHei',sans-serif",
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#3B82F6',
      borderWidth: 1,
      padding: [10, 12],
      textStyle: { color: '#333', fontSize: layout.baseFontSizePx },
      formatter: (params: TooltipComponentFormatterCallbackParams) => {
        if (!Array.isArray(params) || params.length === 0) return '';
        const first = params[0];
        const idx: number = first.dataIndex;
        if (idx < 0 || idx >= v2Data.length) return '';
        const p = v2Data[idx];
        const lines = [
          `<b>${p.dateFullIso}</b>`,
          `NFT 日铸量 = ${p.nftDaily} 个`,
          `活跃用户 = ${p.userDaily} 人`,
        ];
        return lines.join('<br/>');
      },
    },
    legend: {
      show: !disableCanvasLegend,
      data: ['NFT 日铸量', '活跃用户'],
      selected: {
        'NFT 日铸量': !hidden.has('nft'),
        '活跃用户': !hidden.has('user'),
      },
      top: 0,
      right: 10,
      icon: 'roundRect',
      itemGap: 18,
      textStyle: { fontSize: layout.baseFontSizePx },
    },
    grid: {
      left: layout.gridSub.left,
      right: layout.gridSub.right,
      top: layout.gridSub.top,
      bottom: layout.gridSub.bottom,
    },
    xAxis: {
      type: 'category',
      boundaryGap: true,
      data: v2Data.map(d => d.date),
      axisLabel: {
        interval: xInterval,
        rotate: xRotateDeg,
        hideOverlap: false,
        showMinLabel: true,
        showMaxLabel: true,
        overflow: 'none',
        margin: 10,
        fontSize: layout.baseFontSizePx - 2,
      },
      axisLine: { lineStyle: { color: COLOR_GRID } },
    },
    yAxis: {
      type: 'value',
      name: '',
      axisLabel: {
        formatter: '{value}',
        fontSize: layout.baseFontSizePx - 2,
        margin: 10,
        align: 'right',
      },
      splitLine: { lineStyle: { type: 'dashed', color: COLOR_GRID, opacity: 0.3 } },
      max: (val: { min: number; max: number }) =>
        Math.ceil(Math.max(val.max, 1) * 1.15),
    },
    series: [
      {
        name: 'NFT 日铸量',
        type: 'bar',
        barWidth: barWidthPct,
        barMaxWidth: barMaxWidthPx,
        barGap: '20%',
        itemStyle: { color: COLOR_NFT, borderRadius: [2, 2, 0, 0] },
        data: v2Data.map(d => d.nftDaily),
        label: {
          show: true,
          position: 'top',
          fontSize: layout.baseFontSizePx,
          fontWeight: 700,
          formatter: (p: DefaultLabelFormatterCallbackParams) => {
            if (p.dataIndex !== lastIdx) return '';
            const v = typeof p.value === 'number' ? p.value : Number(p.value);
            return disableTodayWord ? `${v}个` : `今日 ${v} 个`;
          },
          color: COLOR_NFT,
          distance: 6,
        },
        animationDuration: 500,
        animationDurationUpdate: 280,
      },
      {
        name: '活跃用户',
        type: 'bar',
        barWidth: barWidthPct,
        barMaxWidth: barMaxWidthPx,
        itemStyle: { color: COLOR_USER, borderRadius: [2, 2, 0, 0] },
        data: v2Data.map(d => d.userDaily),
        label: {
          show: true,
          position: 'top',
          fontSize: layout.baseFontSizePx,
          fontWeight: 700,
          formatter: (p: DefaultLabelFormatterCallbackParams) => {
            if (p.dataIndex !== lastIdx) return '';
            const v = typeof p.value === 'number' ? p.value : Number(p.value);
            return disableTodayWord ? `${v}人` : `今日 ${v} 人`;
          },
          color: COLOR_USER,
          distance: 6,
        },
        animationDuration: 500,
        animationDurationUpdate: 280,
      },
    ],
  };
}
