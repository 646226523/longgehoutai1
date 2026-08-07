import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Card, Segmented, Button, Space } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import './trendChart.css';
import type { TrendPoint } from './mockData';
import {
  type TrendRange,
  type TrendPointV2,
  type DimensionStats,
  deriveV2Data,
  calcExtremes,
  buildInsightText,
  buildCsvContent,
  getDimensionStats,
} from './trend-data';
import {
  buildMainOption,
  buildSubOption,
  type SeriesKey,
} from './echartsOptions';
import { useResolutionTier, debounce, type LayoutV3Config } from './useResolutionTier';

interface TrendChartProps {
  data7: TrendPoint[];
  data30: TrendPoint[];
  data90: TrendPoint[];
  /** @deprecated insights 字段不再渲染文本，保留用于向后兼容 */
  insights: { week7: string; week30: string; week90: string };
  prevTrendData7?: TrendPoint[];
  prevTrendData30?: TrendPoint[];
  prevTrendData90?: TrendPoint[];
}

interface LegendItemDef {
  key: SeriesKey;
  label: string;
  short: string;
  color: string;
  chartLegendName: string;
  belong: 'main' | 'sub';
}

const LEGEND_ITEMS: LegendItemDef[] = [
  { key: 'stock', label: '基因档案存量', short: '存量', color: '#3B82F6', chartLegendName: '基因档案存量', belong: 'main' },
  { key: 'rate', label: '日增环比%', short: '环比', color: '#10B981', chartLegendName: '日增环比增长率', belong: 'main' },
  { key: 'nft', label: 'NFT 日铸量', short: 'NFT', color: '#faad14', chartLegendName: 'NFT 日铸量', belong: 'sub' },
  { key: 'user', label: '活跃用户', short: '活跃', color: '#52c41a', chartLegendName: '活跃用户', belong: 'sub' },
];

function formatNumber(v: number | null, digits = 1): string {
  if (v === null) return '—';
  if (Number.isInteger(v)) return String(v);
  const rounded = Math.round(v * Math.pow(10, digits)) / Math.pow(10, digits);
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(digits);
}

function formatRate(v: number | null, digits = 1): string {
  if (v === null) return '—';
  const fixed = v.toFixed(digits);
  return v >= 0 ? `+${fixed}%` : `${fixed}%`;
}

function formatRateArrow(v: number | null): { text: string; color: string; arrow: string } {
  if (v === null) return { text: '—', color: '#8c8c8c', arrow: '' };
  if (Math.abs(v) < 0.05) return { text: '持平', color: '#8c8c8c', arrow: '—' };
  const arrow = v > 0 ? '↑' : '↓';
  const color = v > 0 ? '#52c41a' : '#ef4444';
  return { text: formatRate(v), color, arrow };
}

/* ===================== 子组件 1: 4 张今日 KPI 卡 ===================== */
interface KpiCardColumnProps {
  v2Data: TrendPointV2[];
  layoutV3: LayoutV3Config;
  highlighted: boolean;
  pulseIdx: number | null;
}

const KpiCardColumn: React.FC<KpiCardColumnProps> = React.memo(({ v2Data, layoutV3, highlighted, pulseIdx }) => {
  const last = v2Data[v2Data.length - 1];
  const kpiValueSize = layoutV3.kpiValueSizePx;
  const kpiCardH = layoutV3.rightColumn.kpiCardH;
  const isLast = pulseIdx === v2Data.length - 1;
  const pulseCls = isLast ? 'TCC-kpi-pulse' : '';
  const hiCls = highlighted ? 'is-highlighted' : '';

  if (!last) return null;

  const stockText = last.geneStock.toLocaleString('zh-CN');
  const rateInfo = formatRateArrow(last.geneRatePct);
  const nftText = `${last.nftDaily} 个`;
  const userText = `${last.userDaily} 人`;
  const prevGene = v2Data.length >= 2 ? v2Data[v2Data.length - 2].geneDaily : 0;
  const geneDelta = prevGene === 0 ? null : ((last.geneDaily - prevGene) / prevGene) * 100;
  const geneInfo = formatRateArrow(geneDelta);

  const cards: Array<{
    title: string;
    value: string;
    hint?: string;
    hintColor?: string;
    a11y: string;
  }> = [
    {
      title: '今日存量',
      value: `${stockText} 羽`,
      hint: `日增 ${last.geneDaily} 羽  ${geneInfo.arrow} ${geneInfo.text}`,
      hintColor: geneInfo.color,
      a11y: '今日存量指标卡',
    },
    {
      title: '今日环比',
      value: rateInfo.text,
      hint: rateInfo.arrow === '—' ? '环比持平' : `${rateInfo.arrow} 较昨日`,
      hintColor: rateInfo.color,
      a11y: '今日环比指标卡',
    },
    {
      title: '今日 NFT',
      value: nftText,
      hint: '当日铸造总量',
      hintColor: '#8c8c8c',
      a11y: '今日NFT指标卡',
    },
    {
      title: '今日活跃',
      value: userText,
      hint: '当日登录用户数',
      hintColor: '#8c8c8c',
      a11y: '今日活跃用户指标卡',
    },
  ];

  return (
    <div
      className="TCC-kpi-grid"
      style={{
        gap: layoutV3.rightColumn.kpiGap,
      }}
    >
      {cards.map((c) => (
        <div
          key={c.title}
          className={`TCC-kpi-card ${hiCls} ${pulseCls}`}
          style={{ height: kpiCardH }}
          role="group"
          aria-label={c.a11y}
        >
          <div className="TCC-kpi-title" style={{ fontSize: Math.max(layoutV3.baseFontSizePx - 2, 11) }}>
            {c.title}
          </div>
          <div className="TCC-kpi-valueRow">
            <span
              className="TCC-kpi-value"
              style={{ fontSize: kpiValueSize }}
            >
              {c.value}
            </span>
          </div>
          {c.hint && (
            <div
              className="TCC-kpi-hint"
              style={{ fontSize: Math.max(layoutV3.baseFontSizePx - 3, 10), color: c.hintColor }}
            >
              {c.hint}
            </div>
          )}
        </div>
      ))}
    </div>
  );
});
KpiCardColumn.displayName = 'KpiCardColumn';

/* ===================== 子组件 2: 底部图例条 4 项一行 ===================== */
interface LegendBarBottomProps {
  hiddenSeries: Set<SeriesKey>;
  baseFontSizePx: number;
  onToggle: (key: SeriesKey) => void;
  onHighlight: (key: SeriesKey | null) => void;
}

const LegendBarBottom: React.FC<LegendBarBottomProps> = React.memo(({ hiddenSeries, baseFontSizePx, onToggle, onHighlight }) => {
  return (
    <div
      className="TCC-legend"
      role="toolbar"
      aria-label="图例显隐切换 共 4 项"
    >
      {LEGEND_ITEMS.map((item) => {
        const hidden = hiddenSeries.has(item.key);
        return (
          <div
            key={item.key}
            className={`TCC-legendItem ${hidden ? 'is-hidden' : ''}`}
            onClick={() => onToggle(item.key)}
            onMouseEnter={() => onHighlight(item.key)}
            onMouseLeave={() => onHighlight(null)}
          >
            <span className="TCC-legendSwatch" style={{ background: item.color }} />
            <span className="TCC-legendLabel" style={{ fontSize: baseFontSizePx }}>
              {item.label}
            </span>
            <span
              className="TCC-legendIcon"
              style={{
                fontSize: Math.max(baseFontSizePx - 2, 11),
                color: hidden ? '#ff4d4f' : '#52c41a',
              }}
            >
              {hidden ? '✕' : '✓'}
            </span>
          </div>
        );
      })}
    </div>
  );
});
LegendBarBottom.displayName = 'LegendBarBottom';

/* ===================== 子组件 3: 指标统计抽屉 竖表 4 行 × 3 列 ===================== */
interface StatsDrawerVerticalProps {
  v2Data: TrendPointV2[];
  hiddenSeries: Set<SeriesKey>;
  baseFontSizePx: number;
  defaultHeightPx: number;
}

const StatsDrawerVertical: React.FC<StatsDrawerVerticalProps> = React.memo(({ v2Data, hiddenSeries, baseFontSizePx, defaultHeightPx }) => {
  const [collapsed, setCollapsed] = useState(false);

  const stockStats = useMemo(() => getDimensionStats(v2Data, 'stock'), [v2Data]);
  const rateStats = useMemo(() => getDimensionStats(v2Data, 'rate'), [v2Data]);
  const nftStats = useMemo(() => getDimensionStats(v2Data, 'nft'), [v2Data]);
  const userStats = useMemo(() => getDimensionStats(v2Data, 'user'), [v2Data]);

  const rows = useMemo<Array<{ def: LegendItemDef; stats: DimensionStats }>>(() => [
    { def: LEGEND_ITEMS[0], stats: stockStats },
    { def: LEGEND_ITEMS[1], stats: rateStats },
    { def: LEGEND_ITEMS[2], stats: nftStats },
    { def: LEGEND_ITEMS[3], stats: userStats },
  ], [stockStats, rateStats, nftStats, userStats]);

  return (
    <div
      className="TCC-stats"
      style={{
        minHeight: collapsed ? 32 : defaultHeightPx,
      }}
    >
      <div
        className="TCC-statsHead"
        onClick={() => setCollapsed((c) => !c)}
        style={{ fontSize: baseFontSizePx }}
      >
        <span className="TCC-statsTitle">指标统计</span>
        <span className="TCC-statsCaret">{collapsed ? '▲' : '▼'}</span>
      </div>
      {!collapsed && (
        <div className="TCC-statsBody" style={{ fontSize: Math.max(baseFontSizePx - 1, 11) }}>
          <div className="TCC-statsRow TCC-statsRow--th">
            <div className="TCC-statsCell TCC-statsCell--dim">维度</div>
            <div className="TCC-statsCell">总计</div>
            <div className="TCC-statsCell">日均</div>
            <div className="TCC-statsCell">峰值日期</div>
          </div>
          {rows.map(({ def, stats }) => {
            const hidden = hiddenSeries.has(def.key);
            const opacity = hidden ? 0.32 : 1;
            let totalText: string;
            let meanText: string;
            let peakText: string;
            if (def.key === 'rate') {
              totalText = stats.total === null ? '—' : `${formatRate(stats.total)}`;
              meanText = formatRate(stats.mean);
              peakText = `${stats.peakDate}  ${formatRate(stats.peakValue)}`;
            } else {
              totalText = `${formatNumber(stats.total ?? 0)} ${stats.unit}`;
              meanText = `${formatNumber(stats.mean)} ${stats.unit}/日`;
              peakText = `${stats.peakDate}  ${stats.peakValue} ${stats.unit}`;
            }
            return (
              <div
                key={def.key}
                className={`TCC-statsRow ${hidden ? 'is-hidden-row' : ''}`}
                style={{ opacity }}
              >
                <div className="TCC-statsCell TCC-statsCell--dim">
                  <span
                    className="TCC-statsSwatch"
                    style={{ background: def.color }}
                  />
                  {stats.label}
                </div>
                <div className="TCC-statsCell TCC-statsCell--num">{totalText}</div>
                <div className="TCC-statsCell TCC-statsCell--num">{meanText}</div>
                <div className="TCC-statsCell TCC-statsCell--num">{peakText}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
StatsDrawerVertical.displayName = 'StatsDrawerVertical';

/* ===================== 顶层 TrendChart 组件 ===================== */
const TrendChart: React.FC<TrendChartProps> = ({
  data7,
  data30,
  data90,
  insights,
  prevTrendData7,
  prevTrendData30,
  prevTrendData90,
}) => {
  void insights;
  const layout = useResolutionTier();
  const layoutV3 = layout.layoutV3;

  const [range, setRange] = useState<TrendRange>('week7');
  const [hiddenSeries, setHiddenSeries] = useState<Set<SeriesKey>>(new Set());
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const mainChartRef = useRef<ReactECharts | null>(null);
  const subChartRef = useRef<ReactECharts | null>(null);

  const currData = range === 'week7' ? data7 : range === 'week30' ? data30 : data90;
  const prevData =
    range === 'week7'
      ? prevTrendData7
      : range === 'week30'
        ? prevTrendData30
        : prevTrendData90;

  const v2Data = useMemo(() => deriveV2Data(currData), [currData]);
  const extremes = useMemo(() => calcExtremes(v2Data), [v2Data]);
  const prevV2Data = useMemo(
    () => (prevData ? deriveV2Data(prevData) : undefined),
    [prevData],
  );

  const insightText = useMemo(
    () => buildInsightText(v2Data, range, prevV2Data),
    [v2Data, range, prevV2Data],
  );

  const mainBoundaryGap = hiddenSeries.has('rate') ? false : (['15%', '15%'] as [string, string]);

  const mainOpt = useMemo(
    () =>
      buildMainOption({
        v2Data,
        extremes,
        layout: {
          gridMain: layoutV3.gridMain,
          gridSub: layoutV3.gridSub,
          baseFontSizePx: layoutV3.baseFontSizePx,
          xTickInterval: layoutV3.xTickInterval,
          xLabelRotateDeg: layoutV3.xLabelRotateDeg,
          enableDataZoom: layoutV3.enableDataZoom,
        },
        hiddenSeries,
        range,
        disableCanvasLegend: true,
        disableTodayWord: true,
        markPointBubbleOffsetPx: 20,
        dataZoomExtraBottom: layoutV3.enableDataZoom ? 0 : 0,
        mainBoundaryGap,
      }),
    [v2Data, extremes, layoutV3.gridMain, layoutV3.baseFontSizePx, JSON.stringify([...hiddenSeries].sort()), range, mainBoundaryGap],
  );

  const subOpt = useMemo(
    () =>
      buildSubOption({
        v2Data,
        layout: {
          gridMain: layoutV3.gridMain,
          gridSub: layoutV3.gridSub,
          baseFontSizePx: layoutV3.baseFontSizePx,
          xTickInterval: layoutV3.xTickInterval,
          xLabelRotateDeg: layoutV3.xLabelRotateDeg,
          enableDataZoom: layoutV3.enableDataZoom,
          layoutV3,
        },
        hiddenSeries,
        disableCanvasLegend: true,
        disableTodayWord: true,
        range,
      }),
    [v2Data, layoutV3.gridMain, layoutV3.baseFontSizePx, JSON.stringify([...hiddenSeries].sort()), range],
  );

  const handleToggle = useCallback((key: SeriesKey) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleRangeChange = useCallback((v: string | number) => {
    setRange(v as TrendRange);
    setHiddenSeries(new Set());
  }, []);

  const handleHighlightLegend = useCallback((key: SeriesKey | null) => {
    const insts = [mainChartRef.current, subChartRef.current]
      .map((r) => (r ? r.getEchartsInstance() : null))
      .filter((x): x is NonNullable<typeof x> => x !== null);
    if (key === null) {
      insts.forEach((inst) => inst.dispatchAction({ type: 'downplay' }));
      return;
    }
    const def = LEGEND_ITEMS.find((x) => x.key === key);
    if (!def) return;
    insts.forEach((inst) => {
      inst.dispatchAction({ type: 'highlight', name: def.chartLegendName });
    });
  }, []);

  const handleExport = useCallback(() => {
    const { blobContent, filename } = buildCsvContent(v2Data, range);
    const blob = new Blob([blobContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [v2Data, range]);

  /* ---- resize + ECharts resize debounce ---- */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = debounce(() => {
      if (mainChartRef.current) {
        mainChartRef.current.getEchartsInstance().resize();
      }
      if (subChartRef.current) {
        subChartRef.current.getEchartsInstance().resize();
      }
    }, layoutV3.resizeDebounceMs);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [layoutV3.resizeDebounceMs]);

  /* ---- hover 十字准星跨两栏同步 + KPI 瞬时高亮 ---- */
  const handleMainMouseMove = useCallback((e: { dataIndex?: number }) => {
    if (typeof window === 'undefined') return;
    if (e.dataIndex != null) {
      setHoverIdx(e.dataIndex);
      if (subChartRef.current) {
        const inst = subChartRef.current.getEchartsInstance();
        inst.dispatchAction({
          type: 'showTip',
          seriesIndex: 0,
          dataIndex: e.dataIndex,
        });
        inst.dispatchAction({
          type: 'showTip',
          seriesIndex: 1,
          dataIndex: e.dataIndex,
        });
      }
    }
  }, []);

  const handleMainMouseOut = useCallback(() => {
    if (typeof window === 'undefined') return;
    setHoverIdx(null);
    if (subChartRef.current) {
      const inst = subChartRef.current.getEchartsInstance();
      inst.dispatchAction({ type: 'hideTip' });
    }
  }, []);

  const handleSubMouseMove = useCallback((e: { dataIndex?: number }) => {
    if (typeof window === 'undefined') return;
    if (e.dataIndex != null) {
      setHoverIdx(e.dataIndex);
      if (mainChartRef.current) {
        const inst = mainChartRef.current.getEchartsInstance();
        inst.dispatchAction({
          type: 'showTip',
          seriesIndex: 0,
          dataIndex: e.dataIndex,
        });
      }
    }
  }, []);

  const bodyMinHeight = layoutV3.cardHeightPx - layoutV3.titleBarH - layoutV3.legendBarH;

  return (
    <Card
      className="TrendChart-root"
      title="数据趋势"
      extra={
        <Space className="TrendChart-extra-wrap" style={{ minWidth: 420 }}>
          <Segmented
            value={range}
            onChange={handleRangeChange}
            options={[
              { label: '近 7 天', value: 'week7' },
              { label: '近 30 天', value: 'week30' },
              { label: '近 90 天', value: 'week90' },
            ]}
          />
          <Button icon={<DownloadOutlined />} size="small" onClick={handleExport}>
            导出
          </Button>
        </Space>
      }
      role="region"
      aria-label="数据趋势模块 6:4 驾驶舱"
    >
      <div
        className={`TCC-body TrendChart-${layout.tier}`}
        style={{
          minHeight: bodyMinHeight,
          padding: layoutV3.bodyPadding,
          gap: layoutV3.columns.gapPx,
        }}
      >
        <div
          className="TCC-columns"
          style={{
            gridTemplateColumns: `${layoutV3.columns.leftPct}% ${layoutV3.columns.rightPct}%`,
            gap: layoutV3.columns.gapPx,
          }}
        >
          {/* 左侧 60%: 主图 + 辅图 纵向堆叠 */}
          <div
            className="TCC-left"
            aria-label="主辅双图"
            style={{ gap: layoutV3.leftColumn.gapPx }}
            role="region"
          >
            <div className="TCC-mainTitles" style={{ fontSize: Math.max(layoutV3.baseFontSizePx - 2, 11) }}>
              <span>左 Y：存量（羽）</span>
              <span className="TCC-mainTitles-sep">·</span>
              <span>右 Y：日增环比（%）</span>
            </div>
            <div
              className="TCC-mainChart"
              style={{ height: layoutV3.leftColumn.mainHeightPx }}
            >
              <ReactECharts
                key={`m-${range}-${[...hiddenSeries].sort().join('-')}`}
                ref={mainChartRef}
                option={mainOpt}
                notMerge={false}
                lazyUpdate
                style={{ width: '100%', height: '100%' }}
                onEvents={{
                  mousemove: handleMainMouseMove,
                  mouseout: handleMainMouseOut,
                }}
                aria-label="主图：基因档案存量趋势 + 日增环比增长率"
              />
            </div>
            <div
              className="TCC-subChart"
              style={{ height: layoutV3.leftColumn.subHeightPx }}
            >
              <ReactECharts
                key={`s-${range}-${[...hiddenSeries].sort().join('-')}`}
                ref={subChartRef}
                option={subOpt}
                notMerge={false}
                lazyUpdate
                style={{ width: '100%', height: '100%' }}
                onEvents={{
                  mousemove: handleSubMouseMove,
                }}
                aria-label="辅图：NFT 日铸量 vs 活跃用户数"
              />
            </div>
          </div>

          {/* 右侧 40%: KPI × 4 + 统计抽屉 + 洞察块 */}
          <div
            className="TCC-right"
            style={{
              gap: 0,
            }}
          >
            <KpiCardColumn
              v2Data={v2Data}
              layoutV3={layoutV3}
              highlighted={hoverIdx !== null}
              pulseIdx={hoverIdx}
            />
            <div style={{ height: layoutV3.rightColumn.afterKpiGap }} />
            <StatsDrawerVertical
              v2Data={v2Data}
              hiddenSeries={hiddenSeries}
              baseFontSizePx={layoutV3.baseFontSizePx}
              defaultHeightPx={layoutV3.rightColumn.statsDrawerH}
            />
            <div style={{ height: layoutV3.rightColumn.afterStatsGap }} />
            <div className="TrendChart-insight TCC-insight">
              {insightText}
            </div>
          </div>
        </div>

        {/* 底部图例条 */}
        <LegendBarBottom
          hiddenSeries={hiddenSeries}
          baseFontSizePx={layoutV3.baseFontSizePx}
          onToggle={handleToggle}
          onHighlight={handleHighlightLegend}
        />
      </div>
    </Card>
  );
};

export default TrendChart;
