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

const iconColorMap = {
  gene: '#1677ff',
  nft: '#52c41a',
  race: '#faad14',
  user: '#eb2f96',
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
        borderRadius: 8,
        transition: 'all 0.3s ease',
      }}
      styles={{
        body: { padding: 20 },
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: iconColorMap[data.iconType] + '15',
            color: iconColorMap[data.iconType],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            marginRight: 12,
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
          <span style={{ fontSize: 32, fontWeight: 600, color: '#262626' }}>
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
                color: isTrendZero ? '#8c8c8c' : isPositive ? '#52c41a' : '#ff4d4f',
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
                color: isWeeklyPositive ? '#52c41a' : '#ff4d4f',
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
          style={{ margin: 0, borderRadius: 4 }}
          bordered={false}
        >
          {data.healthLabel}
        </Tag>
      </div>

      <div style={{ marginBottom: 8 }}>
        <Progress
          percent={data.progressPercent}
          strokeColor={data.healthColor}
          showInfo={false}
          size="small"
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
          borderTop: '1px dashed #f0f0f0',
        }}
      >
        <Space size={16}>
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>
            今日新增:
            <span style={{ color: '#262626', fontWeight: 500 }}> {data.todayNew}</span>
          </span>
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>
            本周累计:
            <span style={{ color: '#262626', fontWeight: 500 }}> {data.weekTotal}</span>
          </span>
        </Space>
        <span
          style={{
            fontSize: 12,
            color: iconColorMap[data.iconType],
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