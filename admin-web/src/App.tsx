import { Spin, App as AntdApp } from 'antd';
import ErrorBoundary from './components/ErrorBoundary';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import AdminLayout from './layouts/AdminLayout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import DataCenter from './pages/datacenter/index';
import { getCurrentUser, USER_INFO_KEY } from './services/auth';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from './services/request';
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
import VerifyList from './pages/competition/Verify';
import VerifyDetail from './pages/competition/VerifyDetail';
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
  const [token] = useState<string | null>(() => localStorage.getItem(ACCESS_TOKEN_KEY));
  const [loading, setLoading] = useState<boolean>(!!token);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [networkError, setNetworkError] = useState<boolean>(false);

  const loadUser = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setNetworkError(false);
    getCurrentUser()
      .then((u) => {
        setUser(u);
      })
      .catch((err: unknown) => {
        const axiosErr = err as { response?: { status?: number; data?: { error?: string } }; code?: string; data?: { error?: string } };
        if (axiosErr.response?.status === 401) {
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          localStorage.removeItem(USER_INFO_KEY);
          window.location.replace('/login');
          return;
        }

        const sessionErrorKeywords = ['session token', 'missing session', 'session expired', 'invalid session', 'session not found'];
        const errorMessage = (axiosErr.response?.data?.error || axiosErr.data?.error || '').toLowerCase();
        const isSessionError = sessionErrorKeywords.some((keyword) => errorMessage.includes(keyword));
        if (isSessionError) {
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          localStorage.removeItem(USER_INFO_KEY);
          window.location.replace('/login');
          return;
        }

        if (axiosErr.code && ['ERR_ABORTED'].includes(axiosErr.code)) {
          return;
        }

        setNetworkError(true);
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    const cached = localStorage.getItem(USER_INFO_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setUser({
          id: parsed.id,
          username: parsed.username,
          nickname: parsed.nickname,
          avatar: parsed.avatar,
          roles: parsed.roles || [],
          permissions: parsed.permissions || [],
        });
      } catch {
        // ignore cache parse errors
      }
    }
    loadUser();
  }, [token, loadUser]);

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (networkError) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100%', background: '#f0f2f5' }}>
        <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ margin: '0 0 8px', color: '#333' }}>后端服务连接失败</h2>
          <p style={{ color: '#666', margin: '0 0 24px' }}>请检查后端服务是否启动,点击重试按钮重新加载</p>
          <button onClick={loadUser} style={{ padding: '8px 24px', background: '#1677ff', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}>
            重试
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100%' }}>
        <Spin size="large">
          <div style={{ display: 'none' }} />
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
        {/* 中控数据中台 */}
        <Route path="datacenter" element={<DataCenter />} />
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
        <Route path="competition/verify" element={<VerifyList />} />
        <Route path="competition/verify/:id" element={<VerifyDetail />} />
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
      <ErrorBoundary>
        <Bootstrap />
      </ErrorBoundary>
    </AntdApp>
  );
}

export default App;
