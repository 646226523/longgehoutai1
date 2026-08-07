import { Card, Row, Col, Typography, Space } from 'antd';
import {
  ExperimentOutlined,
  SafetyCertificateOutlined,
  TrophyOutlined,
  TeamOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import type { QuickEntryState } from './mockData';

const { Text } = Typography;

interface QuickEntryPanelProps {
  entries: QuickEntryState;
  onNavigate: (path: string) => void;
}

const iconConfig = {
  gene: {
    icon: <ExperimentOutlined />,
    color: '#1677ff',
    title: '基因档案',
    bg: '#1677ff15',
  },
  nft: {
    icon: <SafetyCertificateOutlined />,
    color: '#52c41a',
    title: 'NFT 资产',
    bg: '#52c41a15',
  },
  race: {
    icon: <TrophyOutlined />,
    color: '#faad14',
    title: '赛事管理',
    bg: '#faad1415',
  },
  user: {
    icon: <TeamOutlined />,
    color: '#eb2f96',
    title: '用户管理',
    bg: '#eb2f9615',
  },
};

const QuickEntryPanel = ({ entries, onNavigate }: QuickEntryPanelProps) => {
  const items = Object.entries(entries) as [keyof QuickEntryState, QuickEntryState[keyof QuickEntryState]][];

  return (
    <Card title="快捷入口">
      <Row gutter={[16, 16]}>
        {items.map(([key, entry]) => {
          const cfg = iconConfig[key];
          return (
            <Col xs={12} sm={6} key={key}>
              <Card
                hoverable
                size="small"
                onClick={() => onNavigate(entry.path)}
                styles={{
                  body: {
                    textAlign: 'center',
                    padding: '20px 12px',
                    transition: 'all 0.3s ease',
                  },
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: cfg.bg,
                    color: cfg.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                    margin: '0 auto 12px',
                  }}
                >
                  {cfg.icon}
                </div>

                <Text style={{ fontSize: 14, color: '#262626', display: 'block', marginBottom: 4 }}>
                  {cfg.title}
                </Text>

                {entry.count > 0 && (
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '2px 10px',
                      borderRadius: 10,
                      background: cfg.bg,
                      color: cfg.color,
                      fontSize: 12,
                      fontWeight: 500,
                      marginBottom: 8,
                    }}
                  >
                    {entry.label} {entry.count}
                  </div>
                )}

                <div style={{ marginTop: 4 }}>
                  <Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      进入
                    </Text>
                    <ArrowRightOutlined style={{ fontSize: 12, color: cfg.color }} />
                  </Space>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
    </Card>
  );
};

export default QuickEntryPanel;