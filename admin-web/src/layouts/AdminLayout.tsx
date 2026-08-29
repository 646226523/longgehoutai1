import { ProLayout } from '@ant-design/pro-components';
import type { MenuDataItem, ProLayoutProps } from '@ant-design/pro-components';
import { App, Dropdown, Spin, Grid } from 'antd';
import {
  ApiOutlined,
  AppstoreOutlined,
  AuditOutlined,
  BarChartOutlined,
  BellOutlined,
  ContainerOutlined,
  ControlOutlined,
  DashboardOutlined,
  EnvironmentOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  FundProjectionScreenOutlined,
  TransactionOutlined,
  LogoutOutlined,
  SafetyCertificateOutlined,
  ScheduleOutlined,
  SettingOutlined,
  ShopOutlined,
  SolutionOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useCurrentUser } from '../app-context';
import { hasPermission, isSuperAdmin } from '../access';
import { logout } from '../services/auth';

// 菜单配置:9 大业务模块 + 数据统计中心 + 系统管理
// 每个菜单项可指定所需权限,无权限则被过滤
interface MenuItem extends MenuDataItem {
  path: string;
  name: string;
  icon?: React.ReactNode;
  permission?: string;
  children?: MenuItem[];
}

const menuData: MenuItem[] = [
  {
    path: '/datacenter',
    name: '中控数据中台',
    icon: <ControlOutlined />,
  },
  {
    path: '/',
    name: '工作台',
    icon: <DashboardOutlined />,
  },
  {
    path: '/gene',
    name: '基因信息管理',
    icon: <ExperimentOutlined />,
    permission: 'gene:view',
    children: [
      { path: '/gene/list', name: '基因档案', permission: 'gene:view' },
      { path: '/gene/audit', name: '基因档案审核', permission: 'gene:audit' },
    ],
  },
  {
    path: '/nft',
    name: 'NFT 资产管理',
    icon: <SafetyCertificateOutlined />,
    permission: 'nft:view',
    children: [
      { path: '/nft/list', name: '资产列表', permission: 'nft:view' },
      { path: '/nft/audit', name: '上链审核', permission: 'nft:audit' },
    ],
  },
  {
    path: '/competition',
    name: '赛事管理',
    icon: <TrophyOutlined />,
    permission: 'competition:view',
    children: [
      { path: '/competition/list', name: '赛事列表', permission: 'competition:view' },
      { path: '/competition/verify', name: '赛事核验', permission: 'competition:verify' },
    ],
  },
  {
    path: '/loft',
    name: '公棚管理',
    icon: <EnvironmentOutlined />,
    permission: 'loft:view',
    children: [
      { path: '/loft/list', name: '公棚列表', permission: 'loft:view' },
      { path: '/loft/audit', name: '入驻审核', permission: 'loft:audit' },
    ],
  },
  {
    path: '/detection',
    name: '检测预约管理',
    icon: <ScheduleOutlined />,
    permission: 'detection:view',
    children: [
      { path: '/detection/order', name: '预约订单', permission: 'detection:view' },
      { path: '/detection/report', name: '检测报告', permission: 'detection:report' },
      { path: '/detection/org', name: '检测机构', permission: 'detection:view' },
    ],
  },
  {
    path: '/auction',
    name: '拍卖管理',
    icon: <TransactionOutlined />,
    permission: 'auction:view',
    children: [
      { path: '/auction/session', name: '拍卖场次', permission: 'auction:view' },
      { path: '/auction/deal', name: '成交管理', permission: 'auction:deal' },
    ],
  },
  {
    path: '/arbitration',
    name: '仲裁管理',
    icon: <SolutionOutlined />,
    permission: 'arbitration:view',
    children: [
      { path: '/arbitration/case', name: '仲裁案件', permission: 'arbitration:view' },
    ],
  },
  {
    path: '/user-member',
    name: '用户与会员体系',
    icon: <TeamOutlined />,
    permission: 'user:view',
    children: [
      { path: '/user-member/user', name: '用户管理', permission: 'user:view' },
      { path: '/user-member/level', name: '会员等级', permission: 'member:view' },
      { path: '/user-member/audit', name: '认证审核', permission: 'user:view' },
    ],
  },
  {
    path: '/content',
    name: '内容运营管理',
    icon: <FileTextOutlined />,
    permission: 'content:view',
    children: [
      { path: '/content/banner', name: 'Banner 管理', permission: 'content:view' },
      { path: '/content/news', name: '资讯管理', permission: 'content:view' },
      { path: '/content/notice', name: '公告管理', permission: 'content:view' },
    ],
  },
  {
    path: '/statistics',
    name: '数据统计中心',
    icon: <BarChartOutlined />,
    permission: 'statistics:view',
    children: [
      { path: '/statistics/overview', name: '数据看板', permission: 'statistics:view' },
    ],
  },
  {
    path: '/system',
    name: '系统管理',
    icon: <SettingOutlined />,
    permission: 'system:view',
    children: [
      { path: '/system/admin', name: '管理员管理', permission: 'system:admin:manage' },
      { path: '/system/role', name: '角色权限', permission: 'system:role:manage' },
      { path: '/system/audit-log', name: '操作日志', permission: 'system:audit:view' },
      { path: '/system/config', name: '系统配置', permission: 'system:config:manage' },
      { path: '/system/dict', name: '字典管理', permission: 'system:config:manage' },
    ],
  },
];

// 根据当前用户权限过滤菜单
function filterMenuByPermission(items: MenuItem[], user: ReturnType<typeof useCurrentUser>): MenuItem[] {
  if (!user) return [];
  // 超管拥有所有菜单
  if (isSuperAdmin(user)) return items;
  return items
    .filter((item) => !item.permission || hasPermission(user, item.permission))
    .map((item) => ({
      ...item,
      children: item.children ? filterMenuByPermission(item.children as MenuItem[], user) : undefined,
    }))
    .filter((item) => !item.children || item.children.length > 0);
}

const AdminLayout = () => {
  const { message } = App.useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();

  // 过滤后的菜单
  const filteredMenu = useMemo(() => filterMenuByPermission(menuData, currentUser), [currentUser]);

  // 响应式: 小屏自动折叠 sider, 极窄屏切换为顶部导航
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md; // < 768px: 折叠 sider
  const isTiny = !screens.sm;   // < 576px: 切换顶部导航

  // 头像下拉菜单
  const handleMenuClick = (key: string) => {
    if (key === 'logout') {
      logout();
      message.success('已退出登录');
    } else if (key === 'profile') {
      navigate('/system/admin');
    }
  };

  const layoutProps: ProLayoutProps = {
    title: '赛鸽基因后台',
    logo: false,
    layout: isTiny ? 'top' : 'mix',
    fixedHeader: true,
    fixSiderbar: !isMobile,
    collapsed: isMobile,
    route: {
      path: '/',
      routes: filteredMenu,
    },
    location: {
      pathname: location.pathname,
    },
    menu: {
      type: 'sub',
    },
    avatarProps: {
      src: currentUser?.avatar,
      size: 'small',
      title: currentUser?.nickname || currentUser?.username || '管理员',
      render: (_, dom) => (
        <Dropdown
          menu={{
            items: [
              { key: 'profile', label: '个人资料', icon: <UserOutlined /> },
              { type: 'divider' },
              { key: 'logout', label: '退出登录', icon: <LogoutOutlined /> },
            ],
            onClick: (e) => handleMenuClick(e.key as string),
          }}
        >
          {dom}
        </Dropdown>
      ),
    },
    menuItemRender: (item, dom) => {
      if (!item.path) return dom;
      return <Link to={item.path}>{dom}</Link>;
    },
    onMenuHeaderClick: () => navigate('/'),
  };

  if (!currentUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <ProLayout {...layoutProps}>
      <Outlet />
    </ProLayout>
  );
};

// 导出图标(供其他组件复用)
export const ModuleIcons = {
  ApiOutlined,
  AppstoreOutlined,
  AuditOutlined,
  BarChartOutlined,
  BellOutlined,
  ContainerOutlined,
  ControlOutlined,
  DashboardOutlined,
  EnvironmentOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  FundProjectionScreenOutlined,
  TransactionOutlined,
  LogoutOutlined,
  SafetyCertificateOutlined,
  ScheduleOutlined,
  SettingOutlined,
  ShopOutlined,
  SolutionOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserOutlined,
};

export default AdminLayout;
