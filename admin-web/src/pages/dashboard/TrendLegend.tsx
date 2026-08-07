import React, { useMemo, useState } from 'react';
import type { TrendPointV2, ExtremePoint } from './trendUtils';
import { sum, getExtremesFor, formatDateShort } from './trendUtils';

export type SeriesKey = 'stock' | 'rate' | 'nft' | 'user';

export interface TrendLegendProps {
  data: TrendPointV2[];
  extremes: ExtremePoint;
  hiddenSeries: Set<SeriesKey>;
  onToggle: (key: SeriesKey) => void;
  baseFontSize?: number;
}

interface SeriesConfig {
  key: SeriesKey;
  name: string;
  color: string;
  type: 'line' | 'bar';
}

const SERIES_CONFIGS: SeriesConfig[] = [
  { key: 'stock', name: '基因档案存量', color: '#1677ff', type: 'line' },
  { key: 'rate', name: '日增环比', color: '#10B981', type: 'bar' },
  { key: 'nft', name: 'NFT 日铸', color: '#faad14', type: 'bar' },
  { key: 'user', name: '活跃用户', color: '#52c41a', type: 'bar' },
];

const LineIcon = ({ color }: { color: string }) => (
  <svg width={12} height={12} viewBox="0 0 12 12" style={{ flexShrink: 0 }}>
    <defs>
      <linearGradient id={`lineGrad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity={0.6} />
        <stop offset="100%" stopColor={color} stopOpacity={0.15} />
      </linearGradient>
    </defs>
    <rect x={2} y={4} width={8} height={6} rx={0} fill={`url(#lineGrad-${color.replace('#', '')})`} />
    <line x1={2} y1={7} x2={10} y2={3} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <rect x={2} y={6} width={2} height={2} fill={color} />
    <rect x={10} y={2} width={2} height={2} fill={color} transform="translate(-1, 1)" />
  </svg>
);

const BarIcon = ({ color }: { color: string }) => (
  <svg width={12} height={12} viewBox="0 0 12 12" style={{ flexShrink: 0 }}>
    <rect x={1.5} y={6} width={2.5} height={4.5} rx={0.5} fill={color} />
    <rect x={5} y={3} width={2.5} height={7.5} rx={0.5} fill={color} />
    <rect x={8.5} y={1} width={2.5} height={9.5} rx={0.5} fill={color} />
  </svg>
);

interface LegendItemProps {
  config: SeriesConfig;
  hidden: boolean;
  baseFontSize: number;
  onClick: () => void;
  dataCount: number;
}

const LegendItem: React.FC<LegendItemProps> = ({
  config,
  hidden,
  baseFontSize,
  onClick,
  dataCount,
}) => {
  const [showTip, setShowTip] = useState(false);
  const tipText = hidden
    ? `点击显示 共 ${dataCount} 条数据`
    : `点击隐藏 共 ${dataCount} 条数据`;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={`${config.name}，${hidden ? '已隐藏，点击显示' : '已显示，点击隐藏'}`}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          borderRadius: 4,
          cursor: 'pointer',
          pointerEvents: 'auto',
          opacity: hidden ? 0.4 : 1,
          transition: 'all 0.2s ease',
          userSelect: 'none',
          border: '1px solid transparent',
        }}
      >
        {config.type === 'line' ? (
          <LineIcon color={config.color} />
        ) : (
          <BarIcon color={config.color} />
        )}
        <span
          style={{
            fontSize: baseFontSize,
            fontStyle: hidden ? 'italic' : 'normal',
            color: hidden ? '#8c8c8c' : '#262626',
            fontWeight: 500,
          }}
        >
          {config.name}
        </span>
      </div>
      {showTip && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '6px 10px',
            background: '#262626',
            color: '#fff',
            fontSize: 12,
            borderRadius: 4,
            whiteSpace: 'nowrap',
            zIndex: 1001,
            pointerEvents: 'none',
            lineHeight: 1.4,
          }}
        >
          {tipText}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              border: '5px solid transparent',
              borderTopColor: '#262626',
            }}
          />
        </div>
      )}
    </div>
  );
};

interface SummaryRow {
  key: SeriesKey;
  name: string;
  color: string;
  total: string;
  avg: string;
  peakDate: string;
}

const TrendLegend: React.FC<TrendLegendProps> = ({
  data,
  extremes,
  hiddenSeries,
  onToggle,
  baseFontSize = 14,
}) => {
  const summaryRows = useMemo<SummaryRow[]>(() => {
    const visibleKeys = SERIES_CONFIGS.filter((c) => !hiddenSeries.has(c.key)).map(
      (c) => c.key,
    );
    const len = data.length;
    if (len === 0) return [];

    const nftExt = getExtremesFor(data, (d) => d.nftDaily);
    const userExt = getExtremesFor(data, (d) => d.userDaily);

    return visibleKeys.map((key) => {
      const config = SERIES_CONFIGS.find((c) => c.key === key)!;
      let total = '—';
      let avg = '—';
      let peakDate = '—';

      switch (key) {
        case 'stock': {
          const stockVal = data[len - 1]?.geneStock ?? 0;
          total = stockVal.toLocaleString();
          avg = (stockVal / len).toFixed(1);
          peakDate = extremes.maxPoint?.date
            ? formatDateShort(extremes.maxPoint.date)
            : '—';
          break;
        }
        case 'rate': {
          total = '—';
          avg = '—';
          peakDate = '—';
          break;
        }
        case 'nft': {
          const nftSum = sum(data.map((d) => d.nftDaily));
          total = nftSum.toLocaleString();
          avg = len > 0 ? (nftSum / len).toFixed(1) : '0';
          peakDate =
            nftExt.maxIndex >= 0 && data[nftExt.maxIndex]
              ? formatDateShort(data[nftExt.maxIndex].date)
              : '—';
          break;
        }
        case 'user': {
          const userSum = sum(data.map((d) => d.userDaily));
          total = userSum.toLocaleString();
          avg = len > 0 ? (userSum / len).toFixed(1) : '0';
          peakDate =
            userExt.maxIndex >= 0 && data[userExt.maxIndex]
              ? formatDateShort(data[userExt.maxIndex].date)
              : '—';
          break;
        }
      }

      return {
        key,
        name: config.name,
        color: config.color,
        total,
        avg,
        peakDate,
      };
    });
  }, [data, extremes, hiddenSeries]);

  const showSummary = hiddenSeries.size > 0;

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 4,
          padding: '8px 4px',
        }}
      >
        {SERIES_CONFIGS.map((config) => (
          <LegendItem
            key={config.key}
            config={config}
            hidden={hiddenSeries.has(config.key)}
            baseFontSize={baseFontSize}
            onClick={() => onToggle(config.key)}
            dataCount={data.length}
          />
        ))}
      </div>

      {showSummary && (
        <div
          style={{
            marginTop: 12,
            background: '#ffffff',
            border: '1px solid #f0f0f0',
            borderRadius: 6,
            padding: 12,
          }}
        >
          <div
            style={{
              fontSize: baseFontSize - 1,
              fontWeight: 600,
              color: '#262626',
              marginBottom: 12,
            }}
          >
            统计面板
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr 1fr 1fr',
              rowGap: 24,
              columnGap: 16,
            }}
          >
            <div
              style={{
                fontSize: baseFontSize - 2,
                color: '#8c8c8c',
                fontWeight: 500,
              }}
            >
              序列
            </div>
            <div
              style={{
                fontSize: baseFontSize - 2,
                color: '#8c8c8c',
                fontWeight: 500,
              }}
            >
              周期总计
            </div>
            <div
              style={{
                fontSize: baseFontSize - 2,
                color: '#8c8c8c',
                fontWeight: 500,
              }}
            >
              日均值
            </div>
            <div
              style={{
                fontSize: baseFontSize - 2,
                color: '#8c8c8c',
                fontWeight: 500,
              }}
            >
              峰值日期
            </div>

            {summaryRows.map((row) => (
              <React.Fragment key={row.key}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: baseFontSize - 1,
                    color: '#262626',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: row.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontWeight: 500 }}>{row.name}</span>
                </div>
                <div
                  style={{
                    fontSize: baseFontSize - 1,
                    color: '#262626',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {row.total}
                </div>
                <div
                  style={{
                    fontSize: baseFontSize - 1,
                    color: '#262626',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {row.avg}
                </div>
                <div
                  style={{
                    fontSize: baseFontSize - 1,
                    color: '#262626',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {row.peakDate}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrendLegend;
