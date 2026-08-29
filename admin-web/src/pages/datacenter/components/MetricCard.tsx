import * as echarts from 'echarts';
import ReactECharts from 'echarts-for-react';
import { Progress } from 'antd';
import { RiseOutlined, SyncOutlined } from '@ant-design/icons';
import { COLORS } from '../constants';

const MetricCard = ({
  title, value, unit, change, trend, progress, progressLabel, icon, color, extra,
}: {
  title: string; value: number; unit: string; change: number;
  trend?: number[]; progress?: number; progressLabel?: string;
  icon: React.ReactNode; color: string; extra?: React.ReactNode;
}) => {
  const isUp = change >= 0;
  const sparkOption = trend && trend.length > 0 ? {
    grid: { left: 0, right: 0, top: 2, bottom: 2 },
    xAxis: { type: 'category', show: false, data: trend.map((_, i) => i) },
    yAxis: { type: 'value', show: false },
    series: [{
      type: 'line', data: trend, showSymbol: false, smooth: true,
      lineStyle: { color: color, width: 2 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: color + '60' },
          { offset: 1, color: color + '05' },
        ]),
      },
    }],
  } : null;
  return (
    <div style={{
      background: `linear-gradient(135deg, ${COLORS.bgCard} 0%, #151d2d 100%)`,
      border: `1px solid ${COLORS.border}`, borderRadius: 6,
      padding: '10px 12px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
      }} />
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6, background: `${color}20`,
          color, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, marginRight: 8,
        }}>{icon}</div>
        <span style={{ color: COLORS.textSecondary, fontSize: 12 }}>{title}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: COLORS.textPrimary, textShadow: `0 0 12px ${color}60` }}>
          {value.toLocaleString()}
        </span>
        <span style={{ color: COLORS.textSecondary, fontSize: 11, marginLeft: 4 }}>{unit}</span>
      </div>
      <div style={{ fontSize: 11, color: isUp ? COLORS.accentCyan : '#ff4d4f', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
        {isUp ? <RiseOutlined /> : <SyncOutlined />}
        环比{isUp ? '上升' : '下降'} {Math.abs(change)}%
      </div>
      {sparkOption && (
        <div style={{ marginTop: 2 }}>
          <ReactECharts option={sparkOption} style={{ height: 24, width: '100%' }} opts={{ renderer: 'canvas' }} />
        </div>
      )}
      {progress !== undefined && (
        <div style={{ marginTop: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: COLORS.textSecondary, marginBottom: 2 }}>
            <span>{progressLabel}</span>
            <span style={{ color: color }}>{progress}%</span>
          </div>
          <Progress percent={progress} showInfo={false} strokeColor={color} size="small" />
        </div>
      )}
      {extra}
    </div>
  );
};

export default MetricCard;
