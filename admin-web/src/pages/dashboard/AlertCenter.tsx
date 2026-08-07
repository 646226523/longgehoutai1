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

const levelConfig = {
  urgent: { color: '#ff4d4f', icon: <CloseCircleOutlined />, label: '紧急' },
  warning: { color: '#faad14', icon: <WarningOutlined />, label: '预警' },
  info: { color: '#1677ff', icon: <InfoCircleOutlined />, label: '信息' },
  success: { color: '#52c41a', icon: <CheckCircleOutlined />, label: '成功' },
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
      style={style}
      title={
        <span>
          预警中心
          <Badge
            count={alerts.length}
            style={{ marginLeft: 8, backgroundColor: '#ff4d4f' }}
          />
        </span>
      }
      extra={
        <a
          onClick={handleViewAll}
          style={{ fontSize: 13, color: '#1677ff', cursor: 'pointer' }}
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
                padding: '8px 0',
                borderBottom: '1px solid #f5f5f5',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: cfg.color + '15',
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
                      color: '#262626',
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