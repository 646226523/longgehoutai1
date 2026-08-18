import { Card, Badge, Typography, List, Tag } from 'antd';
import {
  WarningOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';
import type { AlertItem } from './mockData';

const { Text } = Typography;

interface AlertCenterProps {
  alerts: AlertItem[];
  onViewAll?: () => void;
  style?: CSSProperties;
}

const levelConfig: Record<AlertItem['level'], { color: string; bg: string; icon: JSX.Element; label: string }> = {
  urgent: { color: '#ff4d4f', bg: '#fff1f0', icon: <CloseCircleOutlined />, label: '紧急' },
  warning: { color: '#faad14', bg: '#fffbe6', icon: <WarningOutlined />, label: '预警' },
  info: { color: '#1677ff', bg: '#e6f4ff', icon: <InfoCircleOutlined />, label: '信息' },
  success: { color: '#52c41a', bg: '#f6ffed', icon: <CheckCircleOutlined />, label: '成功' },
};

const AlertCenter = ({ alerts, onViewAll, style }: AlertCenterProps) => {
  const navigate = useNavigate();

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    }
  };

  return (
    <Card
      style={{
        ...style,
        borderRadius: 12,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
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
          预警中心
          <Badge
            count={alerts.length}
            style={{
              marginLeft: 8,
              backgroundColor: '#ff4d4f',
              animation: 'pulse-red 2s infinite',
            }}
          />
          <style>{`
            @keyframes pulse-red {
              0%, 100% { box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.4); }
              50% { box-shadow: 0 0 0 6px rgba(255, 77, 79, 0); }
            }
          `}</style>
        </span>
      }
      extra={
        <a
          onClick={handleViewAll}
          style={{ fontSize: 13, color: '#00d4ff', cursor: 'pointer' }}
        >
          查看全部 <ArrowRightOutlined style={{ fontSize: 10 }} />
        </a>
      }
    >
      <List
        dataSource={alerts}
        renderItem={(item) => {
          const cfg = levelConfig[item.level];
          return (
            <List.Item
              onClick={() => navigate(item.link)}
              style={{
                cursor: 'pointer',
                padding: '10px 0',
                borderBottom: '1px solid #f5f5f5',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'stretch',
                  width: '100%',
                  padding: '6px 10px',
                  background: cfg.bg,
                  borderRadius: 6,
                  borderLeft: `4px solid ${cfg.color}`,
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.background = cfg.color + '15';
                  el.style.boxShadow = `inset 4px 0 8px -4px ${cfg.color}40`;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.background = cfg.bg;
                  el.style.boxShadow = 'none';
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: cfg.color + '20',
                    color: cfg.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    marginRight: 8,
                    flexShrink: 0,
                  }}
                >
                  {cfg.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      color: '#1f1f1f',
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.title}
                  </Text>
                  <div style={{ marginTop: 4 }}>
                    <Tag
                      color={cfg.color}
                      bordered={false}
                      style={{ margin: 0, fontSize: 12, borderRadius: 4 }}
                    >
                      {cfg.label}
                    </Tag>
                  </div>
                </div>
                <Text type="secondary" style={{ fontSize: 13, flexShrink: 0, marginLeft: 8 }}>
                  {item.time}
                </Text>
              </div>
            </List.Item>
          );
        }}
      />
      {alerts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#8c8c8c' }}>
          暂无预警信息
        </div>
      )}
    </Card>
  );
};

export default AlertCenter;