import React, { useMemo } from 'react';
import type { TrendPointV2, ExtremePoint } from './trendUtils';
import {
  formatDateShort,
  formatPct,
  calcDailyRate,
  calcShare,
  sum,
} from './trendUtils';

export interface TrendTooltipProps {
  data: TrendPointV2[];
  extremes: ExtremePoint;
  hoverIndex: number | null;
  svgWidth: number;
  mainY: number;
  mainHeight: number;
  subY: number;
  subHeight: number;
  containerW: number;
  containerH: number;
  svgPixelXForIndex: (i: number) => number;
}

const TOOLTIP_MIN_W = 220;
const TOOLTIP_ESTIMATED_W = 260;
const TOOLTIP_ESTIMATED_H = 180;
const GAP = 12;
const TAG_HEIGHT = 18;

const TrendTooltip: React.FC<TrendTooltipProps> = ({
  data,
  extremes,
  hoverIndex,
  svgWidth,
  mainY,
  mainHeight: _mainHeight,
  subY,
  subHeight,
  containerW,
  containerH,
  svgPixelXForIndex,
}) => {
  const totals = useMemo(() => {
    const geneDailyTotal = sum(data.map((d) => d.geneDaily));
    const nftTotal = sum(data.map((d) => d.nftDaily));
    const userTotal = sum(data.map((d) => d.userDaily));
    return { geneDailyTotal, nftTotal, userTotal };
  }, [data]);

  const nftDailyArr = useMemo(() => data.map((d) => d.nftDaily), [data]);
  const userDailyArr = useMemo(() => data.map((d) => d.userDaily), [data]);

  const position = useMemo(() => {
    if (hoverIndex === null) return null;
    const svgX = svgPixelXForIndex(hoverIndex);
    const scale = containerW > 0 && svgWidth > 0 ? containerW / svgWidth : 1;
    const pixelX = svgX * scale;
    const crossTopY = mainY * scale;
    const crossBottomY = (subY + subHeight) * scale;

    let left = pixelX + GAP;
    const rightEdge = left + TOOLTIP_ESTIMATED_W;
    if (rightEdge > containerW) {
      left = pixelX - TOOLTIP_ESTIMATED_W - GAP;
    }
    left = Math.max(0, Math.min(containerW - TOOLTIP_MIN_W, left));

    const preferredTop = Math.max(20, crossTopY);
    let top = preferredTop;
    const bottomEdge = top + TOOLTIP_ESTIMATED_H;
    if (bottomEdge > containerH) {
      top = containerH - TOOLTIP_ESTIMATED_H;
    }
    top = Math.max(0, Math.min(containerH - 40, top));

    return {
      left,
      top,
      pixelX,
      crossTopY,
      crossBottomY,
    };
  }, [hoverIndex, svgPixelXForIndex, containerW, containerH, svgWidth, mainY, subY, subHeight]);

  const content = useMemo(() => {
    if (hoverIndex === null || !data[hoverIndex]) return null;
    const pt = data[hoverIndex];
    const i = hoverIndex;

    const isPeak = i === extremes.maxIndex;
    const isValley = i === extremes.minIndex;

    const nftRate = calcDailyRate(nftDailyArr, i);
    const userRate = calcDailyRate(userDailyArr, i);

    const geneShare = calcShare(pt.geneDaily, totals.geneDailyTotal);
    const nftShare = calcShare(pt.nftDaily, totals.nftTotal);
    const userShare = calcShare(pt.userDaily, totals.userTotal);

    return {
      date: pt.date,
      isPeak,
      isValley,
      stock: pt.geneStock,
      daily: pt.geneDaily,
      geneRatePct: pt.geneRatePct,
      geneRateMissing: pt.rateIsMissing ?? false,
      geneShare,
      nft: pt.nftDaily,
      nftRate: nftRate.rate,
      nftRateMissing: nftRate.missing,
      nftShare,
      user: pt.userDaily,
      userRate: userRate.rate,
      userRateMissing: userRate.missing,
      userShare,
    };
  }, [hoverIndex, data, extremes, nftDailyArr, userDailyArr, totals]);

  if (hoverIndex === null || !position || !content) {
    return null;
  }

  const { pixelX, crossTopY, crossBottomY } = position;

  return (
    <>
      <div
        className="trend-tooltip"
        style={{
          position: 'absolute',
          zIndex: 1000,
          pointerEvents: 'none',
          left: position.left,
          top: position.top,
          minWidth: TOOLTIP_MIN_W,
          padding: 12,
          background: '#ffffff',
          borderRadius: 6,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
          border: '1px solid #f0f0f0',
          fontSize: 13,
          lineHeight: 1.6,
          color: '#262626',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 10,
            paddingBottom: 8,
            borderBottom: '1px solid #f5f5f5',
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 14 }}>
            {formatDateShort(content.date)}
          </span>
          {content.isPeak && (
            <span
              className="peak-tag"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: TAG_HEIGHT,
                padding: '0 6px',
                borderRadius: 3,
                background: '#ff4d4f',
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              峰值
            </span>
          )}
          {content.isValley && (
            <span
              className="valley-tag"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: TAG_HEIGHT,
                padding: '0 6px',
                borderRadius: 3,
                background: '#52c41a',
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              谷值
            </span>
          )}
        </div>

        <div style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#1677ff',
                flexShrink: 0,
              }}
            />
            <span style={{ color: '#8c8c8c', flexShrink: 0 }}>基因档案</span>
          </div>
          <div style={{ paddingLeft: 14, marginTop: 2 }}>
            <div>
              存量 <strong>{content.stock}</strong> 羽
            </div>
            <div style={{ color: '#595959' }}>
              日增 {content.daily} 羽　较昨日{' '}
              {formatPct(content.geneRatePct, 1, content.geneRateMissing)}
              {' · '}占周期 {content.geneShare.toFixed(1)}%
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#faad14',
                flexShrink: 0,
              }}
            />
            <span style={{ color: '#8c8c8c', flexShrink: 0 }}>NFT 日铸</span>
          </div>
          <div style={{ paddingLeft: 14, marginTop: 2 }}>
            <div>
              <strong>{content.nft}</strong> 个
            </div>
            <div style={{ color: '#595959' }}>
              较昨日 {formatPct(content.nftRate, 1, content.nftRateMissing)}
              {' · '}占周期 {content.nftShare.toFixed(1)}%
            </div>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#52c41a',
                flexShrink: 0,
              }}
            />
            <span style={{ color: '#8c8c8c', flexShrink: 0 }}>活跃用户</span>
          </div>
          <div style={{ paddingLeft: 14, marginTop: 2 }}>
            <div>
              <strong>{content.user}</strong> 人
            </div>
            <div style={{ color: '#595959' }}>
              较昨日 {formatPct(content.userRate, 1, content.userRateMissing)}
              {' · '}占周期 {content.userShare.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: pixelX,
          top: crossTopY,
          width: 1,
          height: Math.max(crossBottomY - crossTopY, 0),
          background:
            'repeating-linear-gradient(to bottom, #8c8c8c 0, #8c8c8c 4px, transparent 4px, transparent 8px)',
          pointerEvents: 'none',
          zIndex: 999,
          display: hoverIndex === null ? 'none' : 'block',
        }}
      />
    </>
  );
};

export default TrendTooltip;
