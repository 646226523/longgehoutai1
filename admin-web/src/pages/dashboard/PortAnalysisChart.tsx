import './PortAnalysisChart.css';
import { useState, useRef, useEffect } from 'react';
import { Card } from 'antd';
import type { CSSProperties } from 'react';
import type { PortAnalysisData } from './mockData';
import { useResolutionTier } from './useResolutionTier';

interface PieSliceWithLead {
  path: string;
  color: string;
  percent: number;
  labelAnchor: { x: number; y: number };
  labelSide: 'left' | 'right' | 'center';
  textOuter: boolean;
  innerText?: { x: number; y: number };
  leadPathD: string;
  textAnchor: 'start' | 'end' | 'middle';
}

type SliceDraft = Omit<PieSliceWithLead, 'leadPathD'> & {
  p1x: number;
  p1y: number;
  p2x: number;
  p2y: number;
  p2BarEndX: number;
  p2BarEndY: number;
  p1TanStartX: number;
  p1TanStartY: number;
  p1TanEndX: number;
  p1TanEndY: number;
  cosMid: number;
  sinMid: number;
  cx: number;
  cy: number;
};

function buildLeadPath(s: SliceDraft): string {
  return `M ${s.p1TanStartX} ${s.p1TanStartY} L ${s.p1TanEndX} ${s.p1TanEndY} M ${s.p1x} ${s.p1y} L ${s.p2x} ${s.p2y} L ${s.p2BarEndX} ${s.p2BarEndY}`;
}

export function calcPieSlicesWithLeads(
  data: PortAnalysisData[],
  cfg: { R: number; padOuter?: number; showOuterMinPct?: number; showInnerMinPct?: number },
): PieSliceWithLead[] {
  const { R, padOuter = 72, showOuterMinPct = 1 } = cfg;
  const cx = R + padOuter;
  const cy = R + padOuter;
  const viewBoxW = 2 * (R + padOuter);
  const viewBoxH = 2 * (R + padOuter);
  const total = data.reduce((s, d) => s + d.value, 0);

  let currentAngle = -Math.PI / 2;
  const drafts: SliceDraft[] = data.map((item) => {
    const angle = (item.value / total) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const midAngle = startAngle + angle / 2;
    const cosMid = Math.cos(midAngle);
    const sinMid = Math.sin(midAngle);

    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(endAngle);
    const y2 = cy + R * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    const p1x = cx + (R + 2) * cosMid;
    const p1y = cy + (R + 2) * sinMid;

    let anchorRadius = R + 32;
    let p2x = cx + anchorRadius * cosMid;
    let p2y = cy + anchorRadius * sinMid;

    const tanX = -sinMid;
    const tanY = cosMid;
    const p1TanStartX = p1x - 4 * tanX;
    const p1TanStartY = p1y - 4 * tanY;
    const p1TanEndX = p1x + 4 * tanX;
    const p1TanEndY = p1y + 4 * tanY;

    let labelSide: 'left' | 'right' | 'center';
    let textAnchor: 'start' | 'end' | 'middle';
    if (cosMid > 0.1) {
      labelSide = 'right';
      textAnchor = 'start';
    } else if (cosMid < -0.1) {
      labelSide = 'left';
      textAnchor = 'end';
    } else {
      labelSide = 'center';
      textAnchor = 'middle';
    }

    let p2BarEndX = p2x;
    let p2BarEndY = p2y;
    if (labelSide === 'right') {
      p2BarEndX = p2x + 4;
    } else if (labelSide === 'left') {
      p2BarEndX = p2x - 4;
    } else {
      p2BarEndX = p2x + 4;
    }

    const percentNum = (item.value / total) * 100;
    const percent = parseFloat(percentNum.toFixed(1));
    const textOuter = percent >= showOuterMinPct;

    let labelAnchorX: number;
    let labelAnchorY: number;
    if (labelSide === 'right') {
      labelAnchorX = p2BarEndX + 2;
      labelAnchorY = p2BarEndY;
    } else if (labelSide === 'left') {
      labelAnchorX = p2BarEndX - 2;
      labelAnchorY = p2BarEndY;
    } else {
      labelAnchorX = p2x;
      labelAnchorY = p2BarEndY + (p2BarEndY > cy ? 6 : -6);
    }

    return {
      path,
      color: item.color,
      percent,
      labelAnchor: { x: labelAnchorX, y: labelAnchorY },
      labelSide,
      textOuter,
      innerText: undefined,
      textAnchor,
      p1x,
      p1y,
      p2x,
      p2y,
      p2BarEndX,
      p2BarEndY,
      p1TanStartX,
      p1TanStartY,
      p1TanEndX,
      p1TanEndY,
      cosMid,
      sinMid,
      cx,
      cy,
    };
  });

  const GAP = 14;
  (['right', 'left', 'center'] as const).forEach((side) => {
    const groupIdxs = drafts
      .map((d, i) => ({ d, i }))
      .filter((x) => x.d.labelSide === side)
      .sort((a, b) => a.d.labelAnchor.y - b.d.labelAnchor.y);

    for (let k = 1; k < groupIdxs.length; k++) {
      const prev = groupIdxs[k - 1].d;
      const cur = groupIdxs[k].d;
      if (cur.labelAnchor.y - prev.labelAnchor.y < GAP) {
        const delta = GAP - (cur.labelAnchor.y - prev.labelAnchor.y);
        for (let j = k; j < groupIdxs.length; j++) {
          const t = groupIdxs[j].d;
          t.p2y += delta;
          t.p2BarEndY += delta;
          t.labelAnchor = { ...t.labelAnchor, y: t.labelAnchor.y + delta };
        }
      }
    }
  });

  const TXT_W_EST = 36;
  const TXT_H_EST = 14;
  const BUF = 6;
  drafts.forEach((d, idx) => {
    if (!d.textOuter) return;
    const shrinkRadii = [R + 32, R + 22, R + 14];
    for (const aR of shrinkRadii) {
      const p2xTrial = d.cx + aR * d.cosMid;

      let p2BarEndXTrial = p2xTrial;
      if (d.labelSide === 'right') p2BarEndXTrial = p2xTrial + 4;
      else if (d.labelSide === 'left') p2BarEndXTrial = p2xTrial - 4;
      else {
        p2BarEndXTrial = p2xTrial + 4;
      }

      let lx: number;
      if (d.labelSide === 'right') {
        lx = p2BarEndXTrial + 2;
      } else if (d.labelSide === 'left') {
        lx = p2BarEndXTrial - 2;
      } else {
        lx = p2xTrial;
      }

      const checkY = d.labelAnchor.y;
      const leftEdge = d.textAnchor === 'end' ? lx - TXT_W_EST : d.textAnchor === 'middle' ? lx - TXT_W_EST / 2 : lx;
      const rightEdge = d.textAnchor === 'end' ? lx : d.textAnchor === 'middle' ? lx + TXT_W_EST / 2 : lx + TXT_W_EST;
      const topEdge = checkY - TXT_H_EST / 2;
      const botEdge = checkY + TXT_H_EST / 2;

      const ok = leftEdge >= BUF && rightEdge <= viewBoxW - BUF && topEdge >= BUF && botEdge <= viewBoxH - BUF;
      if (ok || aR === shrinkRadii[shrinkRadii.length - 1]) {
        drafts[idx].p2x = p2xTrial;
        drafts[idx].p2y = d.labelAnchor.y;
        drafts[idx].p2BarEndX = p2BarEndXTrial;
        drafts[idx].p2BarEndY = d.labelAnchor.y;
        if (d.labelSide === 'right') {
          drafts[idx].labelAnchor = { x: p2BarEndXTrial + 2, y: d.labelAnchor.y };
        } else if (d.labelSide === 'left') {
          drafts[idx].labelAnchor = { x: p2BarEndXTrial - 2, y: d.labelAnchor.y };
        } else {
          drafts[idx].labelAnchor = {
            x: p2xTrial,
            y: d.labelAnchor.y,
          };
        }
        if (ok) break;
      }
    }
  });

  return drafts.map((d) => ({
    path: d.path,
    color: d.color,
    percent: d.percent,
    labelAnchor: d.labelAnchor,
    labelSide: d.labelSide,
    textOuter: d.textOuter,
    innerText: d.innerText,
    textAnchor: d.textAnchor,
    leadPathD: buildLeadPath(d),
  }));
}

interface PortAnalysisChartProps {
  title: string;
  data: PortAnalysisData[];
  style?: CSSProperties;
}

const DEFAULT_COLORS = ['#00d4ff', '#ffcc00', '#52c41a', '#722ed1', '#ff4d4f', '#13c2c2', '#fa541c'];

const PortAnalysisChart = ({ title, data, style }: PortAnalysisChartProps) => {
  const { tier } = useResolutionTier();
  const actualR = tier === '2k' ? 78 : tier === '1080p' ? 66 : 56;
  const padOuter = 72;

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current !== null) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  const total = data.reduce((s, d) => s + d.value, 0);
  const prevTotal = data.reduce((s, d) => s + (d.prevValue ?? 0), 0);
  const deltaPct = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;
  const unit = data[0]?.unit ?? '人';

  const slices = calcPieSlicesWithLeads(data, { R: actualR, padOuter });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      let tx = e.clientX - rect.left + 12;
      let ty = e.clientY - rect.top + 12;
      const maxX = rect.width - 150;
      if (tx > maxX) tx = rect.width - 12 - 150;
      if (tx < 0) tx = 12;
      if (ty < 0) ty = 12;
      setTooltipPos({ x: tx, y: ty });
    }
  };

  const delayedClear = () => {
    if (hoverTimerRef.current !== null) {
      clearTimeout(hoverTimerRef.current);
    }
    hoverTimerRef.current = setTimeout(() => {
      setHoverIdx(null);
      setTooltipPos(null);
    }, 150);
  };

  const colors = data.map((d, i) => d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]);

  const svgSize = 2 * (actualR + padOuter);
  const viewBox = `0 0 ${svgSize} ${svgSize}`;

  return (
    <Card
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          <span
            style={{
              display: 'inline-block',
              width: 3,
              height: 16,
              background: 'linear-gradient(180deg, #00d4ff, #ffcc00)',
              borderRadius: 2,
              marginRight: 8,
            }}
          />
          {title}
        </span>
      }
      size="small"
      style={{
        ...style,
        borderRadius: 12,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      <div ref={containerRef} className="PAC-root" style={{ position: 'relative' }}>
        <div className="PAC-kpiRow">
          <div className="PAC-total">
            <span className="PAC-totalNum">{total.toLocaleString()}</span>
            <span className="PAC-totalUnit">{unit}</span>
          </div>
          <div className="PAC-compare">
            {deltaPct !== null ? (
              <span className={deltaPct >= 0 ? 'PAC-up' : 'PAC-down'}>
                {deltaPct >= 0 ? '↑' : '↓'} 较昨日 {Math.abs(deltaPct).toFixed(1)}%
              </span>
            ) : (
              <span className="PAC-dash">— —</span>
            )}
          </div>
        </div>

        <div className="PAC-bodyRow">
          <div className="PAC-legend">
            {data.map((item, i) => (
              <div
                key={i}
                className={`PAC-legendRow${hoverIdx === i ? ' is-hover' : ''}`}
                data-idx={i}
                onMouseEnter={() => {
                  if (hoverTimerRef.current !== null) {
                    clearTimeout(hoverTimerRef.current);
                    hoverTimerRef.current = null;
                  }
                  setHoverIdx(i);
                }}
                onMouseLeave={delayedClear}
              >
                <span className="PAC-swatch" style={{ background: colors[i] }} />
                <span className="PAC-channel">{item.channel}</span>
                <span className="PAC-count">{item.value.toLocaleString()}</span>
                <span className="PAC-pct">{slices[i].percent}%</span>
              </div>
            ))}
          </div>

          <div className="PAC-pieWrap">
            <svg
              viewBox={viewBox}
              className="PAC-pieSvg"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => {
                delayedClear();
              }}
            >
              {slices.map((s, i) => (
                <path
                  key={`slice-${i}`}
                  d={s.path}
                  fill={s.color}
                  stroke="#fff"
                  strokeWidth={2}
                  style={{
                    cursor: 'pointer',
                    opacity: hoverIdx === null || hoverIdx === i ? 1 : 0.6,
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={() => {
                    if (hoverTimerRef.current !== null) {
                      clearTimeout(hoverTimerRef.current);
                      hoverTimerRef.current = null;
                    }
                    setHoverIdx(i);
                  }}
                  onMouseLeave={delayedClear}
                />
              ))}

              <g>
                {slices.map((s, i) =>
                  s.textOuter ? <path key={`lead-${i}`} className="PAC-lead-line" d={s.leadPathD} /> : null,
                )}
              </g>

              <g>
                {slices.map((s, i) =>
                  s.textOuter ? (
                    <text
                      key={`leadText-${i}`}
                      className="PAC-leadText"
                      x={s.labelAnchor.x}
                      y={s.labelAnchor.y}
                      textAnchor={s.textAnchor}
                      dominantBaseline="middle"
                    >
                      {s.percent}%
                    </text>
                  ) : null,
                )}
              </g>

              <g>
                {slices.map((s, i) =>
                  s.innerText ? (
                    <text
                      key={`innerText-${i}`}
                      className="PAC-innerText"
                      x={s.innerText.x}
                      y={s.innerText.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {s.percent}%
                    </text>
                  ) : null,
                )}
              </g>
            </svg>
          </div>
        </div>

        {hoverIdx !== null && tooltipPos && (
          <div
            style={{
              position: 'absolute',
              left: tooltipPos.x,
              top: tooltipPos.y,
              backgroundColor: 'rgba(10, 20, 40, 0.92)',
              color: '#fff',
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              pointerEvents: 'none',
              zIndex: 1000,
              whiteSpace: 'nowrap',
              border: '1px solid #00d4ff',
              boxShadow: '0 4px 16px rgba(0,212,255,0.3)',
            }}
          >
            <div style={{ color: '#00d4ff', fontSize: 11, marginBottom: 4 }}>{data[hoverIdx].channel}</div>
            <div>
              {data[hoverIdx].value.toLocaleString()} ({slices[hoverIdx].percent}%)
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default PortAnalysisChart;