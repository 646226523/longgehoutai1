import React from 'react';
import type { TrendPointV2 } from './trendUtils';
import { formatDateShort } from './trendUtils';

export interface SubChartProps {
  data: TrendPointV2[];
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  baseFontSize: number;
  hiddenSeries?: Set<string>;
  xTickInterval?: number;
  xLabelRotate?: number;
  hoverIndex?: number | null;
  crosshairX?: number | null;
}

const COLOR_NFT = '#faad14';
const COLOR_USER = '#52c41a';
const COLOR_GRID = '#d9d9d9';
const COLOR_TEXT = '#8c8c8c';

const SubChart: React.FC<SubChartProps> = ({
  data,
  width,
  height,
  margin,
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

  const xStep = dataLen > 0 ? plotW / dataLen : plotW;
  const groupWidth = xStep * 0.9;
  const barWidthNft = groupWidth * 0.45;
  const barWidthUser = groupWidth * 0.45;
  const barGap = groupWidth * 0.1;

  const getGroupCenterX = (i: number) => margin.left + i * xStep + xStep / 2;

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.nftDaily, d.userDaily)),
    1,
  );
  const yMax = Math.ceil(maxVal * 1.15);
  const getY = (v: number) => margin.top + plotH - (v / yMax) * plotH;

  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round((yMax / yTicks) * i),
  );

  const interval = xTickInterval ?? (dataLen <= 7 ? 1 : dataLen <= 30 ? 5 : 10);

  const nftHidden = hiddenSeries?.has('nft');
  const userHidden = hiddenSeries?.has('user');

  const bgGradId = `subChart-bg-grad-${Math.random().toString(36).slice(2, 8)}`;

  const lastIdx = dataLen - 1;
  const lastPt = data[lastIdx];

  const endLabelFontSize = Math.max(baseFontSize + 1, 12);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
      <defs>
        <linearGradient id={bgGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#FFFFFF" />
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

      <g className="yaxis">
        {yTickValues.map((val) => (
          <g key={val}>
            <line
              x1={margin.left}
              y1={getY(val)}
              x2={width - margin.right}
              y2={getY(val)}
              stroke={COLOR_GRID}
              strokeDasharray={val === 0 ? '0' : '4 4'}
              strokeWidth={val === 0 ? 2 : 1}
              opacity={val === 0 ? 1 : 0.3}
            />
            <text
              x={margin.left - 8}
              y={getY(val)}
              textAnchor="end"
              dominantBaseline="middle"
              fill={COLOR_TEXT}
              fontSize={baseFontSize - 2}
            >
              {val}
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
          数量（个·人）
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

      <g className="subchart-bars">
        {data.map((d, i) => {
          const groupCenter = getGroupCenterX(i);
          const groupLeft = groupCenter - groupWidth / 2;
          const nftX = groupLeft;
          const userX = groupLeft + barWidthNft + barGap;
          const isHover = hoverIndex === i;

          return (
            <g key={`bar-group-${i}`} data-index={i}>
              {!nftHidden && (
                <>
                  {isHover && (
                    <rect
                      x={nftX - 1}
                      y={getY(d.nftDaily) - 1}
                      width={barWidthNft + 2}
                      height={Math.max(margin.top + plotH - getY(d.nftDaily) + 2, 2)}
                      rx={3}
                      fill={COLOR_NFT}
                      opacity={0.2}
                      pointerEvents="none"
                    />
                  )}
                  <rect
                    className="bar-nft"
                    data-index={i}
                    x={nftX}
                    y={getY(d.nftDaily)}
                    width={barWidthNft}
                    height={Math.max(margin.top + plotH - getY(d.nftDaily), 1)}
                    rx={2}
                    fill={COLOR_NFT}
                    stroke={isHover ? '#ffffff' : 'none'}
                    strokeWidth={isHover ? 1 : 0}
                  />
                </>
              )}
              {!userHidden && (
                <>
                  {isHover && (
                    <rect
                      x={userX - 1}
                      y={getY(d.userDaily) - 1}
                      width={barWidthUser + 2}
                      height={Math.max(margin.top + plotH - getY(d.userDaily) + 2, 2)}
                      rx={3}
                      fill={COLOR_USER}
                      opacity={0.2}
                      pointerEvents="none"
                    />
                  )}
                  <rect
                    className="bar-user"
                    data-index={i}
                    x={userX}
                    y={getY(d.userDaily)}
                    width={barWidthUser}
                    height={Math.max(margin.top + plotH - getY(d.userDaily), 1)}
                    rx={2}
                    fill={COLOR_USER}
                    stroke={isHover ? '#ffffff' : 'none'}
                    strokeWidth={isHover ? 1 : 0}
                  />
                </>
              )}
            </g>
          );
        })}
      </g>

      {lastPt && !nftHidden && (
        <text
          className="end-label-sub end-label-sub-nft"
          x={getGroupCenterX(lastIdx) + groupWidth / 2 + 4}
          y={getY(lastPt.nftDaily) - 6}
          textAnchor="start"
          fill={COLOR_NFT}
          fontSize={endLabelFontSize}
          fontWeight={600}
        >
          今日 {lastPt.nftDaily} 个
        </text>
      )}

      {lastPt && !userHidden && (
        <text
          className="end-label-sub end-label-sub-user"
          x={getGroupCenterX(lastIdx) + groupWidth / 2 + 4}
          y={getY(lastPt.userDaily) - 6}
          textAnchor="start"
          fill={COLOR_USER}
          fontSize={endLabelFontSize}
          fontWeight={600}
        >
          今日 {lastPt.userDaily} 人
        </text>
      )}

      <g>
        {data.map((d, i) =>
          i % interval === 0 || i === dataLen - 1 ? (
            <text
              key={`xt-${i}`}
              x={getGroupCenterX(i)}
              y={height - margin.bottom + 18}
              textAnchor="middle"
              fill={COLOR_TEXT}
              fontSize={baseFontSize - 2}
              transform={
                xLabelRotate !== 0
                  ? `rotate(${-xLabelRotate}, ${getGroupCenterX(i)}, ${height - margin.bottom + 18})`
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

export default SubChart;
