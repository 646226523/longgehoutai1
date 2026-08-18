import type { CSSProperties } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Col, Row, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '../app-context';
import dayjs from 'dayjs';
import MetricCard from './dashboard/MetricCard';
import TrendChart from './dashboard/TrendChart';
import AlertCenter from './dashboard/AlertCenter';
import QuickEntryPanel from './dashboard/QuickEntryPanel';
import TodoListPanel from './dashboard/TodoListPanel';
import PortAnalysisChart from './dashboard/PortAnalysisChart';
import {
  metrics,
  trendData7,
  trendData30,
  trendData90,
  alerts,
  quickEntryState,
  trendInsights,
  todos,
  registerPortData,
  loginPortData,
} from './dashboard/mockData';

const { Title, Text } = Typography;

const Dashboard = () => {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();

  const cardStyle: CSSProperties = {
    borderRadius: 12,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  };

  return (
    <PageContainer
      header={{
        title: '工作台',
        breadcrumb: {},
      }}
    >
      <Card style={{ ...cardStyle, marginBottom: 16, overflow: 'hidden' }}>
        <div
          style={{
            background: 'linear-gradient(90deg, #00d4ff10 0%, #ffcc0010 100%)',
            margin: -24,
            padding: '24px 24px',
          }}
        >
          <Row align="middle" justify="space-between">
            <Col>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 4,
                    height: 32,
                    background: 'linear-gradient(180deg, #00d4ff, #ffcc00)',
                    borderRadius: 2,
                    marginRight: 12,
                  }}
                />
                <div>
                  <Title level={4} style={{ marginBottom: 4 }}>
                    欢迎回来,{currentUser?.nickname || currentUser?.username || '管理员'} 👋
                  </Title>
                  <Text type="secondary">
                    今天是 {dayjs().format('YYYY年MM月DD日 dddd')},祝您工作顺利!
                  </Text>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </Card>

      <Row gutter={[20, 20]} style={{ marginBottom: 16 }}>
        {metrics.map((metric) => (
          <Col key={metric.key} xs={24} sm={12} xl={6}>
            <MetricCard data={metric} onClick={() => navigate(metric.navigatePath)} />
          </Col>
        ))}
      </Row>

      <Row gutter={[20, 20]} style={{ marginBottom: 16, display: 'flex', alignItems: 'stretch' }}>
        <Col xs={24} xl={8} style={{ display: 'flex' }}>
          <AlertCenter alerts={alerts} onViewAll={() => navigate('/alert/list')} style={{ height: '100%', width: '100%' }} />
        </Col>
        <Col xs={24} xl={8} style={{ display: 'flex' }}>
          <PortAnalysisChart title="注册端口分析" data={registerPortData} style={{ height: '100%', width: '100%' }} />
        </Col>
        <Col xs={24} xl={8} style={{ display: 'flex' }}>
          <PortAnalysisChart title="登录端口分析" data={loginPortData} style={{ height: '100%', width: '100%' }} />
        </Col>
      </Row>

      <div style={{ marginBottom: 16 }}>
        <QuickEntryPanel
          entries={quickEntryState}
          onNavigate={(path) => navigate(path)}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <TrendChart
          data7={trendData7}
          data30={trendData30}
          data90={trendData90}
          insights={trendInsights}
        />
      </div>

      <div>
        <TodoListPanel todos={todos} onNavigate={(path) => navigate(path)} />
      </div>
    </PageContainer>
  );
};

export default Dashboard;