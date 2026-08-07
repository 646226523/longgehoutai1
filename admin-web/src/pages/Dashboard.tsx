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

  return (
    <PageContainer
      header={{
        title: '工作台',
        breadcrumb: {},
      }}
    >
      {/* 1. 欢迎卡片 */}
      <Card style={{ marginBottom: 16 }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Title level={4} style={{ marginBottom: 8 }}>
              欢迎回来,{currentUser?.nickname || currentUser?.username || '管理员'} 👋
            </Title>
            <Text type="secondary">
              今天是 {dayjs().format('YYYY年MM月DD日 dddd')},祝您工作顺利!
            </Text>
          </Col>
        </Row>
      </Card>

      {/* 2. 4 个指标卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {metrics.map((metric) => (
          <Col key={metric.key} xs={24} sm={12} xl={6}>
            <MetricCard data={metric} onClick={() => navigate(metric.navigatePath)} />
          </Col>
        ))}
      </Row>

      {/* 3. 预警中心 + 端口分析(一行三列) */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16, display: 'flex', alignItems: 'stretch' }}>
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

      {/* 4. 快捷入口(独立行) */}
      <div style={{ marginBottom: 16 }}>
        <QuickEntryPanel
          entries={quickEntryState}
          onNavigate={(path) => navigate(path)}
        />
      </div>

      {/* 5. 运营趋势图(独立行) */}
      <div style={{ marginBottom: 16 }}>
        <TrendChart
          data7={trendData7}
          data30={trendData30}
          data90={trendData90}
          insights={trendInsights}
        />
      </div>

      {/* 6. 待办事项(独立行) */}
      <div>
        <TodoListPanel todos={todos} onNavigate={(path) => navigate(path)} />
      </div>
    </PageContainer>
  );
};

export default Dashboard;
