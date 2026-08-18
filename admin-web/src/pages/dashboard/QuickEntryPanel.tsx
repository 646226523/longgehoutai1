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
    title: '基因档案',
  },
  nft: {
    icon: <SafetyCertificateOutlined />,
    title: 'NFT 资产',
  },
  race: {
    icon: <TrophyOutlined />,
    title: '赛事管理',
  },
  user: {
    icon: <TeamOutlined />,
    title: '用户管理',
  },
};

const QuickEntryPanel = ({ entries, onNavigate }: QuickEntryPanelProps) => {
  const items = Object.entries(entries) as [keyof QuickEntryState, QuickEntryState[keyof QuickEntryState]][];

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
          快捷入口
        </span>
      }
      style={{
        borderRadius: 12,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      <Row gutter={[16, 16]}>
        {items.map(([key, entry]) => {
          const cfg = iconConfig[key];
          return (
            <Col xs={12} sm={6} key={key}>
              <Card
                hoverable
                size="small"
                onClick={() => onNavigate(entry.path)}
                style={{
                  borderRadius: 10,
                  transition: 'all 0.3s ease',
                  border: '1px solid #f0f0f0',
                }}
                styles={{
                  body: {
                    textAlign: 'center',
                    padding: '20px 12px',
                    transition: 'all 0.3s ease',
                  },
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.transform = 'translateY(-4px)';
                  el.style.boxShadow = '0 8px 24px rgba(0,212,255,0.15)';
                  const iconEl = el.querySelector('.QEP-icon') as HTMLElement | null;
                  if (iconEl) {
                    iconEl.style.animation = 'qep-pulse 1s infinite';
                  }
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.transform = 'translateY(0)';
                  el.style.boxShadow = 'none';
                  const iconEl = el.querySelector('.QEP-icon') as HTMLElement | null;
                  if (iconEl) {
                    iconEl.style.animation = 'none';
                  }
                }}
              >
                <div
                  className="QEP-icon"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #00d4ff15 0%, #ffcc0015 100%)',
                    color: '#00d4ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                    margin: '0 auto 12px',
                    boxShadow: '0 4px 16px rgba(0,212,255,0.15)',
                    transition: 'animation 0.3s ease',
                  }}
                >
                  {cfg.icon}
                </div>

                <Text style={{ fontSize: 14, color: '#1f1f1f', display: 'block', marginBottom: 4 }}>
                  {cfg.title}
                </Text>

                {entry.count > 0 && (
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '2px 10px',
                      borderRadius: 10,
                      background: '#ffcc0020',
                      color: '#d48806',
                      fontSize: 12,
                      fontWeight: 500,
                      marginBottom: 8,
                      border: '1px solid #ffcc00',
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
                    <ArrowRightOutlined style={{ fontSize: 12, color: '#00d4ff' }} />
                  </Space>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
      <style>{`
        @keyframes qep-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </Card>
  );
};

export default QuickEntryPanel;