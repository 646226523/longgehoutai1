import React from 'react';
import type { TrendPointV2, ExtremePoint } from './trendUtils';
import { formatDateShort } from './trendUtils';

export interface MainChartProps {
  data: TrendPointV2[];
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  extremes: ExtremePoint;
  baseFontSize: number;
  hiddenSeries?: Set<string>;
  xTickInterval?: number;
  xLabelRotate?: number;
  hoverIndex?: number | null;
  crosshairX?: number | null;
}

const COLOR_STOCK = '#1677ff';
const COLOR_RATE_START = '#10B981';
const COLOR_RATE_END = '#34D399';
const COLOR_MAX = '#ff4d4f';
const COLOR_MIN = '#52c41a';
const COLOR_GRID = '#d9d9d9';
const COLOR_TEXT = '#8c8c8c';

const MainChart: React.FC<MainChartProps> = ({
  data,
  width,
  height,
  margin,
  extremes,
  baseFontSize,
  hiddenSeries,
  xTickInterval,
  xLabelRotate = 0,
  hoverIndex = null,
  crosshairX = null,
}) => {
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const dataLen = data.length;

  const xStep = dataLen > 1 ? plotW / (dataLen - 1) : plotW;
  const getX = (i: number) => margin.left + i * xStep;

  const maxStock = Math.max(...data.map((d) => d.geneStock), 1);
  const yMaxStock = Math.ceil(maxStock * 1.1);
  const getYStock = (v: number) => margin.top + plotH - (v / yMaxStock) * plotH;

  let yMinRate = -50;
  let yMaxRate = 100;
  const validRates = data.filter((d) => !d.rateIsMissing).map((d) => d.geneRatePct);
  if (validRates.length > 0) {
    const actualMin = Math.min(...validRates);
    const actualMax = Math.max(...validRates);
    if (actualMin < yMinRate) {
      yMinRate = Math.floor(actualMin * 1.2);
    }
    if (actualMax > yMaxRate) {
      yMaxRate = Math.ceil(actualMax * 1.2);
    }
  }
  const rateRange = yMaxRate - yMinRate;
  const getYRate = (v: number) => margin.top + plotH - ((v - yMinRate) / rateRange) * plotH;

  const yTicks = 5;
  const yStockTickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round((yMaxStock / yTicks) * i),
  );

  const buildStockPath = () => {
    return data
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getYStock(d.geneStock)}`)
      .join(' ');
  };

  const buildStockArea = () => {
    const top = data
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getYStock(d.geneStock)}`)
      .join(' ');
    return `${top} L ${getX(dataLen - 1)} ${margin.top + plotH} L ${getX(0)} ${margin.top + plotH} Z`;
  };

  const barWidth = (plotW / Math.max(dataLen, 1)) * 0.6;
  const interval = xTickInterval ?? (dataLen <= 7 ? 1 : dataLen <= 30 ? 5 : 10);

  const stockHidden = hiddenSeries?.has('stock');
  const rateHidden = hiddenSeries?.has('rate');

  const gradientId = `mainChart-stock-grad-${Math.random().toString(36).slice(2, 8)}`;
  const rateGradId = `mainChart-rate-grad-${Math.random().toString(36).slice(2, 8)}`;
  const bgGradId = `mainChart-bg-grad-${Math.random().toString(36).slice(2, 8)}`;

  const lastPt = data[dataLen - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
      <defs>
        <linearGradient id={bgGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={COLOR_STOCK} stopOpacity={0.3} />
          <stop offset="100%" stopColor={COLOR_STOCK} stopOpacity={0} />
        </linearGradient>
        <linearGradient id={rateGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={COLOR_RATE_END} />
          <stop offset="100%" stopColor={COLOR_RATE_START} />
        </linearGradient>
      </defs>

      <rect
        className="chart-bg"
        x={margin.left}
        y={margin.top}
        width={plotW}
        height={plotH}
        rx={6}
        fill={`url(#${bgGradId})`}
      />

      <g className="yaxis-left">
        {yStockTickValues.map((val) => (
          <g key={val}>
            <line
              x1={margin.left}
              y1={getYStock(val)}
              x2={width - margin.right}
              y2={getYStock(val)}
              stroke={val === 0 ? COLOR_GRID : COLOR_GRID}
              strokeDasharray={val === 0 ? '0' : '4 4'}
              strokeWidth={val === 0 ? 2 : 1}
              opacity={val === 0 ? 1 : 0.3}
            />
            <text
              x={margin.left - 8}
              y={getYStock(val)}
              textAnchor="end"
              dominantBaseline="middle"
              fill={COLOR_TEXT}
              fontSize={baseFontSize - 2}
            >
              {val}羽
            </text>
          </g>
        ))}
        <text
          x={margin.left}
          y={margin.top - 10}
          textAnchor="start"
          fill={COLOR_TEXT}
          fontSize={baseFontSize - 1}
          fontWeight={500}
        >
          存量（羽）
        </text>
      </g>

      <g className="yaxis-right">
        {[yMinRate, yMinRate + rateRange / 4, yMinRate + rateRange / 2, yMinRate + (rateRange * 3) / 4, yMaxRate].map(
          (val, idx) => (
            <text
              key={idx}
              x={width - margin.right + 8}
              y={getYRate(val)}
              textAnchor="start"
              dominantBaseline="middle"
              fill={COLOR_TEXT}
              fontSize={baseFontSize - 2}
            >
              {val}%
            </text>
          ),
        )}
        <text
          x={width - margin.right}
          y={margin.top - 10}
          textAnchor="end"
          fill={COLOR_TEXT}
          fontSize={baseFontSize - 1}
          fontWeight={500}
        >
          增长率（%）
        </text>
      </g>

      <line
        x1={margin.left}
        y1={margin.top + plotH}
        x2={width - margin.right}
        y2={margin.top + plotH}
        stroke={COLOR_GRID}
        strokeWidth={2}
      />
      {yMinRate < 0 && yMaxRate > 0 && (
        <line
          x1={margin.left}
          y1={getYRate(0)}
          x2={width - margin.right}
          y2={getYRate(0)}
          stroke={COLOR_GRID}
          strokeWidth={2}
        />
      )}

      {!rateHidden &&
        data.map((d, i) => {
          if (d.rateIsMissing) return null;
          const val = d.geneRatePct;
          const xCenter = getX(i);
          const yBottom = getYRate(0);
          const yTop = getYRate(val);
          const x = xCenter - barWidth / 2;
          const h = Math.abs(yBottom - yTop);
          const y = val >= 0 ? yTop : yBottom;
          return (
            <rect
              key={`rate-${i}`}
              className="rate-bar"
              data-index={i}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(h, 1)}
              rx={2}
              fill={`url(#${rateGradId})`}
            />
          );
        })}

      {!stockHidden && (
        <>
          <path d={buildStockArea()} fill={`url(#${gradientId})`} />
          <path
            d={buildStockPath()}
            fill="none"
            stroke={COLOR_STOCK}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}

      {!stockHidden &&
        data.map((d, i) => {
          const cx = getX(i);
          const cy = getYStock(d.geneStock);
          const isHover = hoverIndex === i;
          let r = 3;
          let fill = COLOR_STOCK;
          if (i === extremes.maxIndex) {
            r = 5;
            fill = COLOR_MAX;
          } else if (i === extremes.minIndex) {
            r = 5;
            fill = COLOR_MIN;
          }
          if (isHover) r = Math.max(r + 2, 6);
          return (
            <g key={`pt-${i}`}>
              {isHover && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={r + 4}
                  fill={fill}
                  opacity={0.18}
                  pointerEvents="none"
                />
              )}
              <circle
                className="stock-point"
                data-index={i}
                cx={cx}
                cy={cy}
                r={r}
                fill={fill}
                stroke={isHover ? '#ffffff' : 'none'}
                strokeWidth={isHover ? 2 : 0}
              />
            </g>
          );
        })}

      {!stockHidden && lastPt && (
        <text
          className="end-label-main"
          x={getX(dataLen - 1)}
          y={getYStock(lastPt.geneStock) - 12}
          textAnchor="middle"
          fill={COLOR_STOCK}
          fontSize={baseFontSize + 2}
          fontWeight={700}
        >
          今日: {lastPt.geneStock} 羽
        </text>
      )}

      <g>
        {data.map((d, i) =>
          i % interval === 0 || i === dataLen - 1 ? (
            <text
              key={`xt-${i}`}
              x={getX(i)}
              y={height - margin.bottom + 18}
              textAnchor="middle"
              fill={COLOR_TEXT}
              fontSize={baseFontSize - 2}
              transform={
                xLabelRotate !== 0
                  ? `rotate(${xLabelRotate}, ${getX(i)}, ${height - margin.bottom + 18})`
                  : undefined
              }
            >
              {formatDateShort(d.date)}
            </text>
          ) : null,
        )}
      </g>

      {crosshairX !== null && (
        <line
          x1={crosshairX}
          y1={margin.top}
          x2={crosshairX}
          y2={margin.top + plotH}
          stroke={COLOR_TEXT}
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.6}
          pointerEvents="none"
        />
      )}
    </svg>
  );
};

export default MainChart;
