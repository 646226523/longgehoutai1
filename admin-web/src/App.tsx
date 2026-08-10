import { Spin, App as AntdApp } from 'antd';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import AdminLayout from './layouts/AdminLayout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import { getCurrentUser } from './services/auth';
import type { CurrentUser } from './access';
import { CurrentUserContext } from './app-context';
import { setAppInstance } from './utils/antd-app-instance';

// 各业务模块占位页面
import GeneList from './pages/gene/List';
import GeneAudit from './pages/gene/Audit';
import GeneDetail from './pages/gene/Detail';
import NftList from './pages/nft/List';
import NftAudit from './pages/nft/Audit';
import CompetitionList from './pages/competition/List';
import CompetitionVerify from './pages/competition/Verify';
import CompetitionResult from './pages/competition/Result';
import LoftList from './pages/loft/List';
import LoftAudit from './pages/loft/Audit';
import LoftPigeons from './pages/loft/Pigeons';
import DetectionOrg from './pages/detection/Org';
import ContentNotice from './pages/content/Notice';
import DetectionOrder from './pages/detection/Order';
import DetectionReport from './pages/detection/Report';
import AuctionSession from './pages/auction/Session';
import AuctionDeal from './pages/auction/Deal';
import AuctionItems from './pages/auction/Items';
import ArbitrationCase from './pages/arbitration/Case';
import UserList from './pages/user-member/UserList';
import MemberLevel from './pages/user-member/MemberLevel';
import ContentBanner from './pages/content/Banner';
import ContentNews from './pages/content/News';
import StatisticsOverview from './pages/statistics/Overview';
import SystemAdmin from './pages/system/Admin';
import SystemRole from './pages/system/Role';
import SystemAuditLog from './pages/system/AuditLog';
import SystemConfig from './pages/system/Config';
import SystemDict from './pages/system/Dict';

// 受保护路由包装:无 Token 跳登录,有 Token 自动加载用户信息
function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const token = localStorage.getItem('admin_access_token');
  const [loading, setLoading] = useState<boolean>(!!token);
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    // 启动时若有 Token,自动获取用户信息
    getCurrentUser()
      .then((u) => setUser(u))
      .catch(() => {
        // Token 失效,清除本地存储
        localStorage.removeItem('admin_access_token');
        localStorage.removeItem('admin_refresh_token');
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100%' }}>
        <Spin size="large" tip="加载中...">
          <div style={{ display: 'inline-block', width: 200, height: 200 }} />
        </Spin>
      </div>
    );
  }

  return <CurrentUserContext.Provider value={user}>{children}</CurrentUserContext.Provider>;
}

function Bootstrap() {
  const app = AntdApp.useApp();
  useEffect(() => {
    setAppInstance(app);
  }, [app]);
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />

        {/* 基因信息管理 */}
        <Route path="gene/list" element={<GeneList />} />
        <Route path="gene/audit" element={<GeneAudit />} />
        <Route path="gene/detail/:id" element={<GeneDetail />} />

        {/* NFT 资产管理 */}
        <Route path="nft/list" element={<NftList />} />
        <Route path="nft/audit" element={<NftAudit />} />

        {/* 赛事管理 */}
        <Route path="competition/list" element={<CompetitionList />} />
        <Route path="competition/verify" element={<CompetitionVerify />} />
        <Route path="competition/verify/:id" element={<CompetitionVerify />} />
        <Route path="competition/result/:id" element={<CompetitionResult />} />

        {/* 公棚管理 */}
        <Route path="loft/list" element={<LoftList />} />
        <Route path="loft/audit" element={<LoftAudit />} />
        <Route path="loft/pigeons/:id" element={<LoftPigeons />} />

        {/* 检测预约管理 */}
        <Route path="detection/order" element={<DetectionOrder />} />
        <Route path="detection/report" element={<DetectionReport />} />
        <Route path="detection/org" element={<DetectionOrg />} />

        {/* 拍卖管理 */}
        <Route path="auction/session" element={<AuctionSession />} />
        <Route path="auction/deal" element={<AuctionDeal />} />
        <Route path="auction/items/:sessionId" element={<AuctionItems />} />

        {/* 仲裁管理 */}
        <Route path="arbitration/case" element={<ArbitrationCase />} />

        {/* 用户与会员体系 */}
        <Route path="user-member/user" element={<UserList />} />
        <Route path="user-member/level" element={<MemberLevel />} />

        {/* 内容运营管理 */}
        <Route path="content/banner" element={<ContentBanner />} />
        <Route path="content/news" element={<ContentNews />} />
        <Route path="content/notice" element={<ContentNotice />} />

        {/* 数据统计中心 */}
        <Route path="statistics/overview" element={<StatisticsOverview />} />

        {/* 系统管理 */}
        <Route path="system/admin" element={<SystemAdmin />} />
        <Route path="system/role" element={<SystemRole />} />
        <Route path="system/audit-log" element={<SystemAuditLog />} />
        <Route path="system/config" element={<SystemConfig />} />
        <Route path="system/dict" element={<SystemDict />} />

        {/* 404 兜底 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AntdApp>
      <Bootstrap />
    </AntdApp>
  );
}

export default App;
