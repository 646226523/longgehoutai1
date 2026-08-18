import { Card, Tag, Progress, Typography, Space } from 'antd';
import {
  ExperimentOutlined,
  SafetyCertificateOutlined,
  TrophyOutlined,
  TeamOutlined,
  ArrowRightOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { MetricItem } from './mockData';

const { Text } = Typography;

interface MetricCardProps {
  data: MetricItem;
  onClick?: () => void;
}

const iconMap = {
  gene: <ExperimentOutlined />,
  nft: <SafetyCertificateOutlined />,
  race: <TrophyOutlined />,
  user: <TeamOutlined />,
};

const MetricCard = ({ data, onClick }: MetricCardProps) => {
  const navigate = useNavigate();
  const isPositive = data.trend >= 0;
  const isWeeklyPositive = data.weeklyTrend >= 0;
  const isTrendZero = data.trend === 0;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(data.navigatePath);
    }
  };

  return (
    <Card
      hoverable
      onClick={handleClick}
      style={{
        height: '100%',
        borderRadius: 12,
        transition: 'all 0.3s ease',
        background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%, #fefce8 100%)',
        border: '1px solid #e6f4ff',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
      styles={{
        body: { padding: 20 },
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,212,255,0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #00d4ff20 0%, #ffcc0020 100%)',
            color: '#00d4ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            marginRight: 12,
            boxShadow: '0 2px 8px rgba(0,212,255,0.1)',
          }}
        >
          {iconMap[data.iconType]}
        </div>
        <Text type="secondary" style={{ fontSize: 14 }}>
          {data.title}
        </Text>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: '#00d4ff',
              textShadow: '0 0 20px rgba(0,212,255,0.15)',
            }}
          >
            {data.value.toLocaleString()}
          </span>
          <Text type="secondary" style={{ marginLeft: 4, fontSize: 14 }}>
            {data.unit}
          </Text>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <Space size={16} wrap>
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>
            {data.trendLabel}
            <span
              style={{
                marginLeft: 4,
                color: isTrendZero ? '#8c8c8c' : isPositive ? '#00d4ff' : '#ff4d4f',
                fontWeight: 500,
              }}
            >
              {isTrendZero ? '持平' : isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              {isTrendZero ? '' : `${Math.abs(data.trend)}%`}
            </span>
          </span>
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>
            {data.weeklyTrendLabel}
            <span
              style={{
                marginLeft: 4,
                color: isWeeklyPositive ? '#00d4ff' : '#ff4d4f',
                fontWeight: 500,
              }}
            >
              {isWeeklyPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              {isWeeklyPositive ? '' : ''}
              {Math.abs(data.weeklyTrend)}%
            </span>
          </span>
        </Space>
      </div>

      <div style={{ marginBottom: 12 }}>
        <Tag
          color={data.healthColor}
          style={{
            margin: 0,
            borderRadius: 4,
            fontSize: 12,
            background: data.healthColor === '#faad14' ? '#fffbe6' : undefined,
            color: data.healthColor === '#faad14' ? '#d48806' : undefined,
            border: data.healthColor === '#faad14' ? '1px solid #ffcc00' : undefined,
          }}
          bordered={false}
        >
          {data.healthLabel}
        </Tag>
      </div>

      <div style={{ marginBottom: 8 }}>
        <Progress
          percent={data.progressPercent}
          strokeColor="#00d4ff"
          showInfo={false}
          size="small"
          style={{ height: 6 }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 4,
            fontSize: 12,
            color: '#8c8c8c',
          }}
        >
          <span>{data.goalText}</span>
          <span>{data.progressPercent}%</span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 12,
          borderTop: '1px solid transparent',
          borderImage: 'linear-gradient(90deg, transparent, #e6f4ff, transparent) 1',
        }}
      >
        <Space size={16}>
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>
            今日新增:
            <span style={{ color: '#1f1f1f', fontWeight: 500 }}> {data.todayNew}</span>
          </span>
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>
            本周累计:
            <span style={{ color: '#1f1f1f', fontWeight: 500 }}> {data.weekTotal}</span>
          </span>
        </Space>
        <span
          style={{
            fontSize: 12,
            color: '#00d4ff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          点击进入 <ArrowRightOutlined style={{ fontSize: 10 }} />
        </span>
      </div>
    </Card>
  );
};

export default MetricCard;