// 用户与会员体系 - 用户管理
// 功能:ProTable 分页列表(用户名/手机/状态/认证状态筛选)、编辑、封禁/解封、
//      实名认证审核(通过/驳回)、鸽主认证审核、详情抽屉(精美用户档案详情)
//      更多操作:变更分销商/设置标签/重置密码/发放优惠券/调整余额/调整积分/黑名单
import {
  ModalForm,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  App,
  Avatar,
  Button,
  Card,
  Descriptions,
  Divider,
  Dropdown,
  Drawer,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Progress,
  Popconfirm,
  Radio,
  Select,
  Space,
  Steps,
  Switch,
  Tabs,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import {
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
  DownOutlined,
  EditOutlined,
  EyeOutlined,
  IdcardOutlined,
  LockOutlined,
  MoreOutlined,
  SafetyOutlined,
  SearchOutlined,
  StarFilled,
  StarOutlined,
  TeamOutlined,
  TrophyFilled,
  UnlockOutlined,
  UserOutlined,
  SwapOutlined,
  TagOutlined,
  KeyOutlined,
  GiftOutlined,
  WalletOutlined,
  ThunderboltOutlined,
  BlockOutlined,
} from '@ant-design/icons';
import { useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import RefreshButton from '../../components/RefreshButton';
import { useTableRefresh } from '../../hooks/useTableRefresh';
import {
  auditUserLoftOwner,
  auditUserRealName,
  getCoupons,
  getDistributors,
  getMemberLevels,
  getUserDetail,
  getUserList,
  grantUserCoupon,
  resetUserPassword,
  toggleUserBlacklist,
  updateUser,
  updateUserDistributor,
  updateUserStatus,
  updateUserTags,
  adjustUserBalance,
  adjustUserPoints,
  type CouponItem,
  type DistributorItem,
  type MemberLevelItem,
  type UserItem,
} from '../../services/user';

const { Text, Title } = Typography;

const CERT_STATUS_MAP: Record<string, { text: string; color: string }> = {
  none: { text: '未认证', color: 'default' },
  real: { text: '实名认证', color: 'blue' },
  loft_owner: { text: '鸽主认证', color: 'gold' },
  pigeon_loft: { text: '公棚认证', color: 'purple' },
};

const AUDIT_SUB_MAP: Record<string, { text: string; color: string }> = {
  none: { text: '未提交', color: 'default' },
  pending: { text: '待审核', color: 'orange' },
  approved: { text: '已通过', color: 'green' },
  rejected: { text: '已驳回', color: 'red' },
};

function maskIdCard(idCard: string | null): string {
  if (!idCard) return '-';
  if (idCard.length <= 10) return idCard;
  return `${idCard.slice(0, 6)}********${idCard.slice(-4)}`;
}

function maskPhone(phone: string | null): string {
  if (!phone) return '-';
  if (phone.length < 11) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

const getLevelTheme = (levelCode: string | null, _levelName: string | null) => {
  if (!levelCode) return { gradient: 'linear-gradient(135deg, #f0f0f0 0%, #d9d9d9 100%)', color: '#8c8c8c' };
  const themes: Record<string, { gradient: string; color: string }> = {
    bronze: { gradient: 'linear-gradient(135deg, #cd7f32 0%, #a0522d 100%)', color: '#cd7f32' },
    silver: { gradient: 'linear-gradient(135deg, #c0c0c0 0%, #808080 100%)', color: '#8c8c8c' },
    gold: { gradient: 'linear-gradient(135deg, #ffd700 0%, #daa520 100%)', color: '#faad14' },
    diamond: { gradient: 'linear-gradient(135deg, #b37feb 0%, #722ed1 100%)', color: '#722ed1' },
  };
  return themes[levelCode] || { gradient: 'linear-gradient(135deg, #1677ff 0%, #096dd9 100%)', color: '#1677ff' };
};

const getCertProgress = (record: UserItem) => {
  let total = 2;
  let done = 0;
  if (record.real_name_status === 'approved') done++;
  if (record.loft_owner_status === 'approved') done++;
  if (record.cert_status === 'pigeon_loft') total = 3;
  return { done, total, percent: Math.round((done / total) * 100) };
};

// 活动日志Mock数据
const generateActivityLogs = (record: UserItem) => {
  const logs = [
    {
      id: 1,
      time: record.created_at,
      type: 'login',
      typeLabel: '登录',
      typeColor: 'blue',
      content: '用户登录成功',
      ip: '192.168.1.100',
    },
    {
      id: 2,
      time: record.created_at + 3600000,
      type: 'bid',
      typeLabel: '出价',
      typeColor: 'green',
      content: '拍卖「闪电」出价 ¥68,000',
      ip: '192.168.1.100',
    },
    {
      id: 3,
      time: record.created_at + 7200000,
      type: 'compete',
      typeLabel: '参赛',
      typeColor: 'gold',
      content: '报名赛事「2026秋季大奖赛」',
      ip: '192.168.1.100',
    },
    {
      id: 4,
      time: record.created_at + 86400000,
      type: 'favorite',
      typeLabel: '收藏',
      typeColor: 'purple',
      content: '收藏鸽子「极速号」',
      ip: '192.168.1.101',
    },
    {
      id: 5,
      time: record.created_at + 172800000,
      type: 'login',
      typeLabel: '登录',
      typeColor: 'blue',
      content: '用户登录成功',
      ip: '192.168.1.102',
    },
  ];
  return logs;
};

// 鸽子Mock数据
const generatePigeonList = (_record: UserItem) => {
  return [
    {
      id: 1,
      ring_number: '2026-CN-001',
      name: '闪电号',
      breed: '詹森',
      gender: '雄',
      status: '参赛中',
    },
    {
      id: 2,
      ring_number: '2026-CN-002',
      name: '极速号',
      breed: '慕利门',
      gender: '雌',
      status: '休息',
    },
    {
      id: 3,
      ring_number: '2026-CN-003',
      name: '冠军号',
      breed: '盖比',
      gender: '雄',
      status: '训练中',
    },
  ];
};

// NFT资产Mock数据
const generateNftList = (record: UserItem) => {
  return [
    {
      id: 1,
      token_id: 'NFT-001',
      name: '黄金会员徽章',
      collection: '会员徽章系列',
      acquired_at: record.created_at,
      status: '正常',
    },
    {
      id: 2,
      token_id: 'NFT-002',
      name: '2026秋季大奖赛参与凭证',
      collection: '赛事纪念系列',
      acquired_at: record.created_at + 7200000,
      status: '正常',
    },
  ];
};

const UserList = () => {
  const { message, modal } = App.useApp();
  const currentUser = useCurrentUser();
  const canEdit = hasPermission(currentUser, 'user:edit');
  const actionRef = useRef<ActionType>();
  const { tableLoading, handleRefresh } = useTableRefresh(actionRef, { messageApi: message });

  const [editModal, setEditModal] = useState<{ visible: boolean; record: UserItem | null }>({
    visible: false,
    record: null,
  });
  const [detailDrawer, setDetailDrawer] = useState<{ visible: boolean; record: UserItem | null }>({
    visible: false,
    record: null,
  });
  const [auditModal, setAuditModal] = useState<{
    visible: boolean;
    userId: number | null;
    type: 'real' | 'loft_owner';
    action: 'approved' | 'rejected';
  }>({ visible: false, userId: null, type: 'real', action: 'approved' });
  const [auditRemark, setAuditRemark] = useState<string>('');
  const [detailTab, setDetailTab] = useState<string>('account');
  const [activityFilter, setActivityFilter] = useState<string>('all');

  const [levelOptions, setLevelOptions] = useState<MemberLevelItem[]>([]);
  const [editForm] = Form.useForm();

  // ============ 更多操作弹窗状态 ============
  const [distributorOptions, setDistributorOptions] = useState<DistributorItem[]>([]);
  const [couponOptions, setCouponOptions] = useState<CouponItem[]>([]);
  const [ensureMoreOptions, setEnsureMoreOptions] = useState(false);

  // 当前操作目标用户
  const [actionUser, setActionUser] = useState<UserItem | null>(null);
  const [actionType, setActionType] = useState<
    | 'distributor' | 'tags' | 'reset-pwd' | 'coupon' | 'balance' | 'points' | 'blacklist' | null
  >(null);
  const [actionLoading, setActionLoading] = useState(false);

  // 表单
  const [distForm] = Form.useForm();
  const [tagsForm] = Form.useForm();
  const [resetPwdForm] = Form.useForm();
  const [couponForm] = Form.useForm();
  const [balanceForm] = Form.useForm();
  const [pointsForm] = Form.useForm();

  // 标签分组配置（带主题色和emoji）
  const TAG_CATEGORIES: { key: string; label: string; icon: string; color: string; bg: string; border: string; tags: string[] }[] = [
    {
      key: 'premium',
      label: '高价值客户',
      icon: '👑',
      color: '#d48806',
      bg: 'linear-gradient(135deg, #fffbe6 0%, #fff1b8 100%)',
      border: '#ffe58f',
      tags: ['VIP用户', '重要客户'],
    },
    {
      key: 'growth',
      label: '活跃增长',
      icon: '🌱',
      color: '#389e0d',
      bg: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
      border: '#b7eb8f',
      tags: ['活跃用户', '新用户'],
    },
    {
      key: 'pipeline',
      label: '跟进转化',
      icon: '📋',
      color: '#722ed1',
      bg: 'linear-gradient(135deg, #f9f0ff 0%, #efdbff 100%)',
      border: '#d3adf7',
      tags: ['待跟进', '合作意向'],
    },
    {
      key: 'risk',
      label: '风险关注',
      icon: '⚠️',
      color: '#cf1322',
      bg: 'linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%)',
      border: '#ffa39e',
      tags: ['投诉用户'],
    },
  ];

  // 加载分销商和优惠券选项
  const loadMoreOptions = async () => {
    if (ensureMoreOptions) return;
    try {
      const [distRes, couponRes] = await Promise.all([
        getDistributors().catch(() => ({ list: [] })),
        getCoupons().catch(() => ({ list: [] })),
      ]);
      setDistributorOptions(distRes?.list ?? []);
      setCouponOptions(couponRes?.list ?? []);
      setEnsureMoreOptions(true);
    } catch { /* 静默失败 */ }
  };

  // 打开更多操作弹窗
  const openMoreAction = (record: UserItem, type: typeof actionType) => {
    setActionUser(record);
    setActionType(type);
    loadMoreOptions();
    // 根据类型初始化表单
    setTimeout(() => {
      switch (type) {
        case 'distributor':
          distForm.setFieldsValue({ distributor_id: record.distributor_id });
          break;
        case 'tags':
          tagsForm.setFieldsValue({ tags: record.tags ?? [] });
          break;
        case 'reset-pwd':
          resetPwdForm.resetFields();
          break;
        case 'coupon':
          couponForm.resetFields();
          break;
        case 'balance':
          balanceForm.resetFields();
          break;
        case 'points':
          pointsForm.resetFields();
          break;
      }
    }, 50);
  };

  // 提交更多操作
  const submitMoreAction = async () => {
    if (!actionUser || !actionType) return;
    setActionLoading(true);
    try {
      switch (actionType) {
        case 'distributor': {
          const values = await distForm.validateFields();
          await updateUserDistributor(actionUser.id, values.distributor_id ?? null);
          message.success('分销商已变更');
          break;
        }
        case 'tags': {
          const values = await tagsForm.validateFields();
          await updateUserTags(actionUser.id, values.tags ?? []);
          message.success('标签已更新');
          break;
        }
        case 'reset-pwd': {
          const values = await resetPwdForm.validateFields();
          const res = await resetUserPassword(actionUser.id, values.new_password);
          modal.info({
            title: '密码已重置',
            content: (
              <div>
                <div>用户 <Text strong>{actionUser.nickname || actionUser.username}</Text> 的密码已重置为：</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1677ff', margin: '12px 0', fontFamily: 'monospace' }}>
                  {res.new_password}
                </div>
                <div style={{ color: '#8c8c8c', fontSize: 12 }}>请及时将新密码告知用户,并提醒其登录后修改</div>
              </div>
            ),
            okText: '我知道了',
          });
          break;
        }
        case 'coupon': {
          const values = await couponForm.validateFields();
          const res = await grantUserCoupon(actionUser.id, values.coupon_id, values.count ?? 1);
          message.success(`已发放 ${res.granted} 张优惠券`);
          break;
        }
        case 'balance': {
          const values = await balanceForm.validateFields();
          const res = await adjustUserBalance(actionUser.id, values.amount, values.reason);
          message.success(`操作成功,当前余额: ¥${res.balance.toFixed(2)}`);
          break;
        }
        case 'points': {
          const values = await pointsForm.validateFields();
          const res = await adjustUserPoints(actionUser.id, values.amount, values.reason);
          message.success(`操作成功,当前积分: ${res.points}`);
          break;
        }
      }
      closeMoreAction();
      handleRefresh();
      // 如果详情抽屉打开的是同一用户,刷新详情
      if (detailDrawer.visible && detailDrawer.record?.id === actionUser.id) {
        try {
          const fresh = await getUserDetail(actionUser.id);
          setDetailDrawer({ visible: true, record: fresh });
        } catch { /* 忽略 */ }
      }
    } catch (err: any) {
      if (err?.errorFields) return; // 表单验证错误
      message.error(err?.message || '操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const closeMoreAction = () => {
    setActionType(null);
    setActionUser(null);
  };

  const ensureLevelOptions = () => {
    if (levelOptions.length) return;
    getMemberLevels()
      .then((res) => setLevelOptions(res?.list ?? []))
      .catch(() => {});
  };

  const openEdit = (record: UserItem) => {
    ensureLevelOptions();
    setEditModal({ visible: true, record });
    editForm.setFieldsValue({
      nickname: record.nickname,
      phone: record.phone,
      real_name: record.real_name,
      id_card: record.id_card,
      growth_value: record.growth_value,
      member_level_id: record.member_level_id ?? undefined,
      status: record.status,
    });
  };

  const handleEdit = async () => {
    if (!editModal.record) return;
    const values = await editForm.validateFields();
    await updateUser(editModal.record.id, {
      nickname: values.nickname,
      phone: values.phone,
      real_name: values.real_name,
      id_card: values.id_card,
      growth_value: values.growth_value,
      member_level_id: values.member_level_id ?? null,
    });
    if (values.status !== editModal.record.status) {
      await updateUserStatus(editModal.record.id, values.status);
    }
    message.success('更新成功');
    setEditModal({ visible: false, record: null });
    editForm.resetFields();
    handleRefresh();
  };

  const handleEditCancel = () => {
    modal.confirm({
      title: '确认取消？',
      content: '修改将不被保存',
      okText: '确认',
      cancelText: '继续编辑',
      onOk: () => {
        setEditModal({ visible: false, record: null });
        editForm.resetFields();
      },
    });
  };

  const handleToggleStatus = async (record: UserItem, next: number) => {
    try {
      await updateUserStatus(record.id, next);
      message.success(next === 1 ? '已解封' : '已封禁');
      handleRefresh();
    } catch {}
  };

  const openAudit = (
    record: UserItem,
    type: 'real' | 'loft_owner',
    action: 'approved' | 'rejected'
  ) => {
    setAuditModal({ visible: true, userId: record.id, type, action });
    setAuditRemark('');
  };

  const handleAudit = async () => {
    if (!auditModal.userId) return;
    try {
      if (auditModal.type === 'real') {
        await auditUserRealName(auditModal.userId, auditModal.action, auditRemark);
      } else {
        await auditUserLoftOwner(auditModal.userId, auditModal.action, auditRemark);
      }
      message.success(auditModal.action === 'approved' ? '审核已通过' : '审核已驳回');
      if (detailDrawer.record && detailDrawer.record.id === auditModal.userId) {
        const fresh = await getUserDetail(auditModal.userId);
        setDetailDrawer({ visible: true, record: fresh });
      }
      setAuditModal({ visible: false, userId: null, type: 'real', action: 'approved' });
      setAuditRemark('');
      handleRefresh();
    } catch {}
  };

  const openDetail = async (record: UserItem) => {
    try {
      const fresh = await getUserDetail(record.id);
      setDetailDrawer({ visible: true, record: fresh });
      setDetailTab('account');
      setActivityFilter('all');
    } catch {
      setDetailDrawer({ visible: true, record });
      setDetailTab('account');
      setActivityFilter('all');
    }
  };

  const columns: ProColumns<UserItem>[] = [
    { title: '序号', dataIndex: 'index', valueType: 'index', width: 60, hideInSearch: true },
    { title: 'ID', dataIndex: 'id', width: 60, hideInSearch: true },
    {
      title: '用户名/手机',
      dataIndex: 'username',
      width: 140,
      ellipsis: true,
      fieldProps: { placeholder: '用户名/昵称/手机号' },
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span>{record.username}</span>
          <span style={{ color: '#888', fontSize: 12 }}>{record.nickname || '-'}</span>
        </Space>
      ),
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 120,
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => record.phone || '-',
    },
    {
      title: '实名姓名',
      dataIndex: 'real_name',
      width: 100,
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => record.real_name || '-',
    },
    {
      title: '会员等级',
      dataIndex: 'member_level_id',
      width: 110,
      hideInSearch: true,
      render: (_, record) =>
        record.level_name ? (
          <Tag color={record.level_code === 'diamond' ? 'purple' : record.level_code === 'gold' ? 'gold' : record.level_code === 'silver' ? 'blue' : 'default'}>
            {record.level_name}
          </Tag>
        ) : (
          <Tag>无等级</Tag>
        ),
    },
    {
      title: '成长值',
      dataIndex: 'growth_value',
      width: 90,
      hideInSearch: true,
    },
    {
      title: '认证状态',
      dataIndex: 'cert_status',
      width: 110,
      valueType: 'select',
      valueEnum: {
        none: { text: '未认证' },
        real: { text: '实名认证' },
        loft_owner: { text: '鸽主认证' },
        pigeon_loft: { text: '公棚认证' },
      },
      render: (_, record) => {
        const cfg = CERT_STATUS_MAP[record.cert_status] || CERT_STATUS_MAP.none;
        return <Tag color={cfg.color}>{cfg.text}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      valueType: 'select',
      valueEnum: { 1: { text: '正常' }, 0: { text: '封禁' } },
      render: (_, record) =>
        canEdit ? (
          <Popconfirm
            title={record.status === 1 ? '确认封禁该用户?' : '确认解封该用户?'}
            onConfirm={() => handleToggleStatus(record, record.status === 1 ? 0 : 1)}
          >
            <Switch
              checked={record.status === 1}
              checkedChildren="正常"
              unCheckedChildren="封禁"
            />
          </Popconfirm>
        ) : (
          <Tag color={record.status === 1 ? 'green' : 'red'}>
            {record.status === 1 ? '正常' : '封禁'}
          </Tag>
        ),
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      width: 160,
      hideInSearch: true,
      render: (_, record) =>
        record.created_at ? dayjs(record.created_at).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>
            详情
          </Button>
          {canEdit && (
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          )}
          {canEdit && record.real_name_status === 'pending' && (
            <Button
              type="link"
              size="small"
              icon={<SafetyOutlined />}
              onClick={() => openAudit(record, 'real', 'approved')}
            >
              实名审核
            </Button>
          )}
          {canEdit && record.loft_owner_status === 'pending' && (
            <Button
              type="link"
              size="small"
              icon={<SafetyOutlined />}
              onClick={() => openAudit(record, 'loft_owner', 'approved')}
            >
              鸽主审核
            </Button>
          )}
          <Dropdown
            menu={{
              items: [
                { key: 'distributor', label: '变更上级分销商', icon: <SwapOutlined /> },
                { key: 'tag', label: '设置标签', icon: <TagOutlined /> },
                { type: 'divider' },
                { key: 'reset-pwd', label: '重置密码', icon: <KeyOutlined /> },
                { key: 'coupon', label: '发放优惠券', icon: <GiftOutlined /> },
                { key: 'balance', label: '调整余额', icon: <WalletOutlined /> },
                { key: 'points', label: '调整积分', icon: <ThunderboltOutlined /> },
                { type: 'divider' },
                { key: 'blacklist', label: record.is_blacklisted ? '移出黑名单' : '加入黑名单', icon: <BlockOutlined />, danger: true },
              ],
              onClick: async ({ key }) => {
                if (key === 'blacklist') {
                  // 黑名单操作(带确认)
                  const next = record.is_blacklisted ? 0 : 1;
                  modal.confirm({
                    title: next ? '确认加入黑名单？' : '确认移出黑名单？',
                    content: next
                      ? `用户「${record.nickname || record.username}」将被加入黑名单,限制其部分功能使用。`
                      : `用户「${record.nickname || record.username}」将被移出黑名单,恢复正常使用。`,
                    okText: '确认',
                    cancelText: '取消',
                    okButtonProps: { danger: next === 1 },
                    onOk: async () => {
                      try {
                        await toggleUserBlacklist(record.id, next);
                        message.success(next ? '已加入黑名单' : '已移出黑名单');
                        handleRefresh();
                      } catch (err: any) {
                        message.error(err?.message || '操作失败');
                      }
                    },
                  });
                  return;
                }
                // 其他操作打开对应弹窗
                const typeMap: Record<string, typeof actionType> = {
                  distributor: 'distributor',
                  tag: 'tags',
                  'reset-pwd': 'reset-pwd',
                  coupon: 'coupon',
                  balance: 'balance',
                  points: 'points',
                };
                openMoreAction(record, typeMap[key] ?? null);
              },
            }}
            placement="bottomRight"
            trigger={['click']}
          >
            <Button type="link" size="small">
              更多 <DownOutlined />
            </Button>
          </Dropdown>
        </Space>
      ),
    },
  ];

  const renderDetailDrawer = () => {
    const record = detailDrawer.record;
    if (!record) return null;

    const levelTheme = getLevelTheme(record.level_code, record.level_name);
    const certProgress = getCertProgress(record);
    const certCfg = CERT_STATUS_MAP[record.cert_status] || CERT_STATUS_MAP.none;
    const realNameCfg = AUDIT_SUB_MAP[record.real_name_status] || AUDIT_SUB_MAP.none;
    const loftOwnerCfg = AUDIT_SUB_MAP[record.loft_owner_status] || AUDIT_SUB_MAP.none;
    const displayName = record.nickname || record.username;
    const firstChar = (displayName?.charAt(0) || 'U').toUpperCase();

    const allLogs = generateActivityLogs(record);
    const activityLogs = activityFilter === 'all' ? allLogs : allLogs.filter((l) => l.type === activityFilter);

    return (
      <div style={{ paddingBottom: 80 }}>
        {/* ==================== 头部身份卡 - 重构版 ==================== */}
        <div
          style={{
            position: 'relative',
            margin: '-24px -24px 0',
            padding: '32px 28px 24px',
            background: levelTheme.gradient,
            color: '#fff',
            overflow: 'hidden',
          }}
        >
          {/* 装饰光晕 */}
          <div
            style={{
              position: 'absolute',
              top: -100,
              right: -80,
              width: 340,
              height: 340,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: -80,
              left: -40,
              width: 220,
              height: 220,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
            }}
          />

          {/* 主体布局：大头像在左 + 右侧全部信息 */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', gap: 28 }}>
            {/* ========= 左：大头像 ========= */}
            <div style={{ flexShrink: 0 }}>
              <div
                style={{
                  width: 112,
                  height: 112,
                  borderRadius: '50%',
                  padding: 3,
                  background: 'conic-gradient(from 0deg, rgba(255,255,255,0.95), rgba(255,255,255,0.2), rgba(255,255,255,0.95))',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
                  position: 'relative',
                }}
              >
                <Avatar
                  src={record.avatar || undefined}
                  size={106}
                  style={{
                    background: record.avatar ? 'transparent' : 'rgba(255,255,255,0.35)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 44,
                    border: '3px solid rgba(255,255,255,0.4)',
                  }}
                >
                  {firstChar}
                </Avatar>
                {/* 底部状态点 */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    right: 4,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: record.status === 1 ? '#52c41a' : '#ff4d4f',
                    border: '3px solid #fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  }}
                />
              </div>
            </div>

            {/* ========= 右：名字/标签/信息/按钮 ========= */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* 第一行：名字 + 等级徽章 + 认证标签 + 状态 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Title level={4} style={{ color: '#fff', margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: 0.5 }}>
                  {displayName}
                </Title>
                {/* 等级徽章 */}
                {record.level_name && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 14px',
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.15) 100%)',
                      borderRadius: 20,
                      border: '1px solid rgba(255,255,255,0.45)',
                      fontSize: 12,
                      fontWeight: 600,
                      backdropFilter: 'blur(6px)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}
                  >
                    <StarFilled style={{ fontSize: 13, color: '#ffd666' }} />
                    {record.level_name}
                  </div>
                )}
                {/* 认证状态 */}
                <Tag color={certCfg.color} style={{ borderRadius: 12, fontSize: 12, margin: 0, padding: '2px 12px', border: 'none', fontWeight: 500 }}>
                  {certCfg.text}
                </Tag>
                {/* 账号状态 */}
                <Tag color={record.status === 1 ? 'success' : 'error'} style={{ borderRadius: 12, fontSize: 12, margin: 0, padding: '2px 12px', border: 'none', fontWeight: 500 }}>
                  {record.status === 1 ? '● 正常' : '● 已封禁'}
                </Tag>
                {record.is_blacklisted === 1 && (
                  <Tag color="error" style={{ borderRadius: 12, fontSize: 12, margin: 0, padding: '2px 12px', border: 'none' }}>
                    🚫 黑名单
                  </Tag>
                )}
              </div>

              {/* 第二行：关键元信息（更紧凑的单行展示） */}
              <div
                style={{
                  marginTop: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flexWrap: 'wrap',
                  fontSize: 13,
                  opacity: 0.9,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ opacity: 0.6 }}>ID</span>
                  <Text strong style={{ color: '#fff' }}>#{record.id}</Text>
                </span>
                <span style={{ opacity: 0.35 }}>·</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Text type="secondary" style={{ color: 'rgba(255,255,255,0.65)' }}>📱</Text>
                  <Text style={{ color: '#fff' }}>{maskPhone(record.phone)}</Text>
                </span>
                {record.real_name && (
                  <>
                    <span style={{ opacity: 0.35 }}>·</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Text type="secondary" style={{ color: 'rgba(255,255,255,0.65)' }}>👤</Text>
                      <Text style={{ color: '#fff' }}>{record.real_name}</Text>
                    </span>
                  </>
                )}
                <span style={{ opacity: 0.35 }}>·</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Text type="secondary" style={{ color: 'rgba(255,255,255,0.65)' }}>📅 注册于</Text>
                  <Text style={{ color: '#fff' }}>{dayjs(record.created_at).format('YYYY-MM-DD')}</Text>
                </span>
                {record.distributor_name && (
                  <>
                    <span style={{ opacity: 0.35 }}>·</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Text type="secondary" style={{ color: 'rgba(255,255,255,0.65)' }}>🏢 分销商</Text>
                      <Text style={{ color: '#fff' }}>{record.distributor_name}</Text>
                    </span>
                  </>
                )}
              </div>

              {/* 第三行：KPI 数据横排 */}
              <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { icon: <WalletOutlined />, label: '余额', value: `¥${(record.balance ?? 0).toFixed(2)}`, highlight: '#ffd666' },
                  { icon: <ThunderboltOutlined />, label: '积分', value: (record.points ?? 0).toLocaleString(), highlight: '#91caff' },
                  { icon: <TrophyFilled />, label: '成长值', value: record.growth_value.toLocaleString(), highlight: '#ffd591' },
                  { icon: <SafetyOutlined />, label: '认证进度', value: `${certProgress.done}/${certProgress.total}`, highlight: '#b7eb8f' },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    style={{
                      flex: 1,
                      minWidth: 90,
                      background: 'rgba(255,255,255,0.15)',
                      borderRadius: 12,
                      padding: '10px 14px',
                      border: '1px solid rgba(255,255,255,0.22)',
                      backdropFilter: 'blur(6px)',
                    }}
                  >
                    <div style={{ fontSize: 11, opacity: 0.82, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                      {kpi.icon} {kpi.label}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: kpi.highlight }}>{kpi.value}</div>
                  </div>
                ))}
              </div>

              {/* 第四行：操作按钮 */}
              <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {canEdit && (
                  <Button
                    icon={<EditOutlined />}
                    size="small"
                    onClick={() => {
                      openEdit(record);
                      setDetailDrawer({ visible: false, record: null });
                    }}
                    style={{ borderColor: 'rgba(255,255,255,0.5)', color: '#fff', background: 'rgba(255,255,255,0.15)', borderRadius: 8, height: 32 }}
                  >
                    编辑信息
                  </Button>
                )}
                {canEdit && (
                  <Popconfirm
                    title={record.status === 1 ? '确认锁定该用户账号?' : '确认解锁该用户账号?'}
                    onConfirm={async () => {
                      await handleToggleStatus(record, record.status === 1 ? 0 : 1);
                      setDetailDrawer({ visible: false, record: null });
                    }}
                  >
                    <Button
                      size="small"
                      danger={record.status === 1}
                      icon={record.status === 1 ? <LockOutlined /> : <UnlockOutlined />}
                      style={{ borderColor: 'rgba(255,255,255,0.5)', color: record.status === 1 ? '#ffccc7' : '#fff', background: 'rgba(255,255,255,0.15)', borderRadius: 8, height: 32 }}
                    >
                      {record.status === 1 ? '锁定账号' : '解锁账号'}
                    </Button>
                  </Popconfirm>
                )}
                {canEdit && (
                  <Dropdown
                    getPopupContainer={() => document.body}
                    menu={{
                      items: [
                        {
                          key: 'logout',
                          label: '强制退出登录',
                          icon: <SafetyOutlined />,
                          onClick: () => message.info('强制退出功能开发中'),
                        },
                        {
                          key: 'export',
                          label: '导出用户数据',
                          icon: <EyeOutlined />,
                          onClick: () => message.info('导出功能开发中'),
                        },
                        { type: 'divider' },
                        {
                          key: 'balance',
                          label: '调整余额',
                          icon: <WalletOutlined />,
                          onClick: () => openMoreAction(record, 'balance'),
                        },
                        {
                          key: 'points',
                          label: '调整积分',
                          icon: <ThunderboltOutlined />,
                          onClick: () => openMoreAction(record, 'points'),
                        },
                        {
                          key: 'coupon',
                          label: '发放优惠券',
                          icon: <GiftOutlined />,
                          onClick: () => openMoreAction(record, 'coupon'),
                        },
                        {
                          key: 'tags',
                          label: '设置标签',
                          icon: <TagOutlined />,
                          onClick: () => openMoreAction(record, 'tags'),
                        },
                        {
                          key: 'distributor',
                          label: '变更分销商',
                          icon: <SwapOutlined />,
                          onClick: () => openMoreAction(record, 'distributor'),
                        },
                        { type: 'divider' },
                        {
                          key: 'blacklist',
                          label: record.is_blacklisted ? '移出黑名单' : '加入黑名单',
                          icon: <BlockOutlined />,
                          danger: true,
                          onClick: () => {
                            const next = record.is_blacklisted ? 0 : 1;
                            modal.confirm({
                              title: next ? '确认加入黑名单？' : '确认移出黑名单？',
                              content: next
                                ? `用户「${record.nickname || record.username}」将被加入黑名单。`
                                : `用户「${record.nickname || record.username}」将被移出黑名单。`,
                              okText: '确认',
                              cancelText: '取消',
                              okButtonProps: { danger: next === 1 },
                              onOk: async () => {
                                try {
                                  await toggleUserBlacklist(record.id, next);
                                  message.success(next ? '已加入黑名单' : '已移出黑名单');
                                  // 刷新详情
                                  const fresh = await getUserDetail(record.id);
                                  setDetailDrawer({ visible: true, record: fresh });
                                  handleRefresh();
                                } catch (err: any) {
                                  message.error(err?.message || '操作失败');
                                }
                              },
                            });
                          },
                        },
                        {
                          key: 'delete',
                          label: <span style={{ color: '#ff4d4f' }}>删除账号</span>,
                          icon: <CloseCircleFilled style={{ color: '#ff4d4f' }} />,
                          onClick: () => message.warning('删除功能开发中'),
                        },
                      ],
                    }}
                  >
                    <Button
                      size="small"
                      icon={<MoreOutlined />}
                      style={{
                        borderColor: 'rgba(255,255,255,0.5)',
                        color: '#fff',
                        background: 'rgba(255,255,255,0.15)',
                        borderRadius: 8,
                      }}
                    >
                      更多操作
                    </Button>
                  </Dropdown>
                )}
              </div>
            </div>

            {/* 右：KPI 指标列 */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                flexShrink: 0,
                minWidth: 120,
              }}
            >
              <div
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <WalletOutlined /> 余额
                </div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>
                  ¥{(record.balance ?? 0).toFixed(2)}
                </div>
              </div>
              <div
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <ThunderboltOutlined /> 积分
                </div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{record.points ?? 0}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab内容区 */}
        <div style={{ padding: '16px 16px 0' }}>
          <Tabs
            activeKey={detailTab}
            onChange={setDetailTab}
            size="small"
            items={[
              {
                key: 'account',
                label: (
                  <span>
                    <UserOutlined /> 账号信息
                  </span>
                ),
                children: (
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    {/* 左列 */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {/* 基本信息卡 */}
                      <Card
                        variant="borderless"
                        styles={{ body: { padding: 18 } }}
                        style={{ borderRadius: 12, border: '1px solid #f0f0f0' }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 14,
                            paddingBottom: 10,
                            borderBottom: '1px solid #f0f0f0',
                          }}
                        >
                          <IdcardOutlined style={{ color: '#1677ff' }} />
                          <Text strong style={{ fontSize: 15 }}>基本信息</Text>
                        </div>
                        <Descriptions
                          column={2}
                          size="small"
                          colon={false}
                          labelStyle={{ color: '#8c8c8c', width: 90 }}
                          contentStyle={{ fontWeight: 500 }}
                        >
                          <Descriptions.Item label="用户ID">#{record.id}</Descriptions.Item>
                          <Descriptions.Item label="用户名">{record.username}</Descriptions.Item>
                          <Descriptions.Item label="昵称">
                            {record.nickname || <Text type="secondary">未设置</Text>}
                          </Descriptions.Item>
                          <Descriptions.Item label="手机号">
                            {record.phone || <Text type="secondary">未绑定</Text>}
                          </Descriptions.Item>
                          <Descriptions.Item label="真实姓名">
                            {record.real_name || <Text type="secondary">未认证</Text>}
                          </Descriptions.Item>
                          <Descriptions.Item label="身份证号">
                            {record.id_card ? (
                              maskIdCard(record.id_card)
                            ) : (
                              <Text type="secondary">未认证</Text>
                            )}
                          </Descriptions.Item>
                          <Descriptions.Item label="账号状态">
                            <Space>
                              <Tag color={record.status === 1 ? 'green' : 'red'}>
                                {record.status === 1 ? '正常' : '已封禁'}
                              </Tag>
                              {record.is_blacklisted === 1 && (
                                <Tag color="error">🚫 黑名单</Tag>
                              )}
                            </Space>
                          </Descriptions.Item>
                          <Descriptions.Item label="分销商">
                            {record.distributor_name || <Text type="secondary">未设置</Text>}
                          </Descriptions.Item>
                          <Descriptions.Item label="注册时间">
                            {dayjs(record.created_at).format('YYYY-MM-DD HH:mm')}
                          </Descriptions.Item>
                          <Descriptions.Item label="更新时间">
                            {dayjs(record.updated_at).format('YYYY-MM-DD HH:mm')}
                          </Descriptions.Item>
                        </Descriptions>
                      </Card>

                      {/* 用户标签墙 */}
                      <Card
                        variant="borderless"
                        styles={{ body: { padding: 18 } }}
                        style={{ borderRadius: 12, border: '1px solid #f0f0f0' }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 14,
                            paddingBottom: 10,
                            borderBottom: '1px solid #f0f0f0',
                          }}
                        >
                          <TagOutlined style={{ color: '#722ed1' }} />
                          <Text strong style={{ fontSize: 15 }}>用户标签</Text>
                          {record.tags && record.tags.length > 0 && (
                            <Tag color="purple">{record.tags.length}</Tag>
                          )}
                        </div>
                        {record.tags && record.tags.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {record.tags.map((tag, i) => (
                              <span
                                key={i}
                                style={{
                                  padding: '3px 12px',
                                  borderRadius: 12,
                                  background: 'linear-gradient(135deg, #f9f0ff, #efdbff)',
                                  border: '1px solid #d3adf7',
                                  color: '#722ed1',
                                  fontSize: 12,
                                  fontWeight: 500,
                                }}
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div
                            style={{
                              padding: '20px 0',
                              textAlign: 'center',
                              color: '#bfbfbf',
                              fontSize: 13,
                            }}
                          >
                            🏷️ 暂无标签
                          </div>
                        )}
                      </Card>
                    </div>

                    {/* 右列 */}
                    <div
                      style={{
                        width: 280,
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      {/* 财务卡 */}
                      <Card
                        variant="borderless"
                        styles={{ body: { padding: 18 } }}
                        style={{
                          borderRadius: 12,
                          border: '1px solid #f0f0f0',
                          background: 'linear-gradient(135deg, #f6ffed 0%, #f0fff0 100%)',
                        }}
                      >
                        <div style={{ fontSize: 12, color: '#389e0d', fontWeight: 600, marginBottom: 12 }}>
                          💰 财务概览
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                          <span style={{ fontSize: 28, fontWeight: 700, color: '#389e0d' }}>
                            ¥{(record.balance ?? 0).toFixed(2)}
                          </span>
                          <span style={{ fontSize: 12, color: '#8c8c8c' }}>账户余额</span>
                        </div>
                        <div
                          style={{
                            marginTop: 14,
                            paddingTop: 14,
                            borderTop: '1px dashed #d9f7be',
                            display: 'flex',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 11, color: '#8c8c8c' }}>积分</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#1677ff' }}>
                              {record.points ?? 0}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: '#8c8c8c' }}>赛鸽</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#722ed1' }}>
                              {generatePigeonList(record).length}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: '#8c8c8c' }}>NFT</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#faad14' }}>
                              {generateNftList(record).length}
                            </div>
                          </div>
                        </div>
                      </Card>

                      {/* 会员卡 */}
                      {record.level_name ? (
                        <Card
                          variant="borderless"
                          styles={{ body: { padding: 18 } }}
                          style={{
                            borderRadius: 12,
                            border: '1px solid #f0f0f0',
                            background: levelTheme.gradient,
                            color: '#fff',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ fontSize: 11, opacity: 0.85 }}>当前等级</div>
                              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>
                                ⭐ {record.level_name}
                              </div>
                            </div>
                            <TrophyFilled style={{ fontSize: 36, opacity: 0.4 }} />
                          </div>
                          <div style={{ marginTop: 12 }}>
                            <Progress
                              percent={Math.min((record.growth_value / 1000) * 100, 100)}
                              strokeColor="#fff"
                              trailColor="rgba(255,255,255,0.2)"
                              showInfo={false}
                              size="small"
                            />
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginTop: 6,
                                fontSize: 11,
                                opacity: 0.85,
                              }}
                            >
                              <span>{record.growth_value.toLocaleString()} 成长值</span>
                              <span>还差 {Math.max(0, 1000 - record.growth_value)}</span>
                            </div>
                          </div>
                        </Card>
                      ) : (
                        <Card
                          variant="borderless"
                          styles={{ body: { padding: 18 } }}
                          style={{
                            borderRadius: 12,
                            border: '1px dashed #d9d9d9',
                            textAlign: 'center',
                          }}
                        >
                          <StarOutlined style={{ fontSize: 32, color: '#bfbfbf' }} />
                          <div style={{ marginTop: 8, fontSize: 13, color: '#8c8c8c' }}>暂无会员等级</div>
                        </Card>
                      )}
                    </div>
                  </div>
                ),
              },
              {
                key: 'audit',
                label: (
                  <span>
                    <SafetyOutlined /> 认证审核
                  </span>
                ),
                children: (
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    {/* 认证状态+时间 */}
                    <Card
                      variant="borderless"
                      styles={{ body: { padding: 16 } }}
                      style={{ borderRadius: 12, border: '1px solid #f0f0f0' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space>
                          <Text strong>认证状态：</Text>
                          <Tag color={certCfg.color} style={{ fontSize: 13 }}>
                            {certCfg.text}
                          </Tag>
                          {record.real_name_status === 'pending' && (
                            <Tag color="orange">待审核</Tag>
                          )}
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          提交时间：{dayjs(record.created_at).format('YYYY-MM-DD HH:mm')}
                        </Text>
                      </div>
                    </Card>

                    {/* 实名信息 */}
                    <Card
                      variant="borderless"
                      styles={{ body: { padding: 20 } }}
                      style={{ borderRadius: 12, border: '1px solid #f0f0f0' }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 16,
                          paddingBottom: 12,
                          borderBottom: '1px dashed #f0f0f0',
                        }}
                      >
                        <IdcardOutlined style={{ color: '#1677ff' }} />
                        <Text strong style={{ fontSize: 15 }}>实名信息</Text>
                      </div>
                      <Descriptions column={2} size="small" colon={false}>
                        <Descriptions.Item label="真实姓名">
                          {record.real_name || <Text type="secondary">未提交</Text>}
                        </Descriptions.Item>
                        <Descriptions.Item label="身份证号">
                          {record.id_card ? maskIdCard(record.id_card) : <Text type="secondary">未提交</Text>}
                        </Descriptions.Item>
                        <Descriptions.Item label="手机号">
                          {record.phone || <Text type="secondary">未绑定</Text>}
                        </Descriptions.Item>
                        <Descriptions.Item label="银行卡号">
                          <Text type="secondary">可选</Text>
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>

                    {/* 认证材料 */}
                    <Card
                      variant="borderless"
                      styles={{ body: { padding: 20 } }}
                      style={{ borderRadius: 12, border: '1px solid #f0f0f0' }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 16,
                          paddingBottom: 12,
                          borderBottom: '1px dashed #f0f0f0',
                        }}
                      >
                        <EyeOutlined style={{ color: '#722ed1' }} />
                        <Text strong style={{ fontSize: 15 }}>认证材料</Text>
                      </div>
                      <Image.PreviewGroup>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                          {[
                            { label: '身份证正面', src: record.id_card_front, key: 'front' },
                            { label: '身份证反面', src: record.id_card_back, key: 'back' },
                            { label: '手持身份证', src: record.id_card_handheld, key: 'handheld' },
                          ].map((item) => (
                            <div
                              key={item.key}
                              style={{
                                border: '2px dashed #e8e8e8',
                                borderRadius: 10,
                                padding: '16px 10px',
                                textAlign: 'center',
                                background: '#fafafa',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                overflow: 'hidden',
                              }}
                              onMouseEnter={(e) => {
                                const el = e.currentTarget as HTMLDivElement;
                                el.style.borderColor = '#1677ff';
                                el.style.background = '#f0f5ff';
                              }}
                              onMouseLeave={(e) => {
                                const el = e.currentTarget as HTMLDivElement;
                                el.style.borderColor = '#e8e8e8';
                                el.style.background = '#fafafa';
                              }}
                            >
                              <Image
                                src={item.src || ''}
                                alt={item.label}
                                width="100%"
                                height={80}
                                style={{
                                  objectFit: 'contain',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                                fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%23d9d9d9' stroke-width='2'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpolyline points='21 15 16 10 5 21'/%3E%3C/svg%3E"
                                placeholder={
                                  <div style={{ fontSize: 32, lineHeight: '80px' }}>🪪</div>
                                }
                              />
                              <div style={{ fontSize: 13, color: '#595959', marginTop: 8, fontWeight: 500 }}>
                                {item.label}
                              </div>
                              <div style={{ fontSize: 11, color: '#1677ff' }}>点击预览</div>
                            </div>
                          ))}
                        </div>
                      </Image.PreviewGroup>
                    </Card>

                    {/* 审核进度+操作 */}
                    <Card
                      variant="borderless"
                      styles={{ body: { padding: 20 } }}
                      style={{ borderRadius: 12, border: '1px solid #f0f0f0' }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 16,
                          paddingBottom: 12,
                          borderBottom: '1px dashed #f0f0f0',
                        }}
                      >
                        <SafetyOutlined style={{ color: '#faad14' }} />
                        <Text strong style={{ fontSize: 15 }}>审核流程</Text>
                      </div>

                      <Steps
                        current={certProgress.done}
                        direction="vertical"
                        size="small"
                        items={[
                          {
                            title: (
                              <span style={{ fontSize: 13 }}>
                                实名认证
                                <Tag color={realNameCfg.color} style={{ marginLeft: 8, fontSize: 11 }}>
                                  {realNameCfg.text}
                                </Tag>
                              </span>
                            ),
                            description: (
                              <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                                {record.real_name_status === 'approved'
                                  ? '已通过实名身份校验'
                                  : record.real_name_status === 'pending'
                                  ? '等待管理员审核'
                                  : record.real_name_status === 'rejected'
                                  ? `审核驳回: ${record.audit_remark || '材料不合格'}`
                                  : '尚未提交认证材料'}
                              </div>
                            ),
                            icon:
                              record.real_name_status === 'approved' ? (
                                <CheckCircleFilled style={{ color: '#52c41a' }} />
                              ) : record.real_name_status === 'rejected' ? (
                                <CloseCircleFilled style={{ color: '#ff4d4f' }} />
                              ) : (
                                <ClockCircleFilled style={{ color: '#faad14' }} />
                              ),
                          },
                          {
                            title: (
                              <span style={{ fontSize: 13 }}>
                                鸽主认证
                                <Tag color={loftOwnerCfg.color} style={{ marginLeft: 8, fontSize: 11 }}>
                                  {loftOwnerCfg.text}
                                </Tag>
                              </span>
                            ),
                            description: (
                              <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                                {record.loft_owner_status === 'approved'
                                  ? '已通过鸽主资质审核'
                                  : record.loft_owner_status === 'pending'
                                  ? '等待管理员审核'
                                  : record.loft_owner_status === 'rejected'
                                  ? '审核驳回,请重新提交资质材料'
                                  : '尚未提交鸽主资质证明'}
                              </div>
                            ),
                            icon:
                              record.loft_owner_status === 'approved' ? (
                                <CheckCircleFilled style={{ color: '#52c41a' }} />
                              ) : record.loft_owner_status === 'rejected' ? (
                                <CloseCircleFilled style={{ color: '#ff4d4f' }} />
                              ) : (
                                <ClockCircleFilled style={{ color: '#faad14' }} />
                              ),
                          },
                        ]}
                      />

                      {/* 审核操作按钮 */}
                      {canEdit &&
                        (record.real_name_status === 'pending' ||
                          record.loft_owner_status === 'pending') && (
                          <div
                            style={{
                              marginTop: 20,
                              padding: 16,
                              background: '#fffbe6',
                              borderRadius: 10,
                              border: '1px solid #ffe58f',
                            }}
                          >
                            <Text strong style={{ color: '#ad6800' }}>
                              ⚡ 待审核操作
                            </Text>
                            <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                              {record.real_name_status === 'pending' && (
                                <Space>
                                  <Text>实名认证：</Text>
                                  <Button
                                    size="small"
                                    type="primary"
                                    onClick={() => openAudit(record, 'real', 'approved')}
                                  >
                                    ✅ 审核通过
                                  </Button>
                                  <Button
                                    size="small"
                                    danger
                                    onClick={() => openAudit(record, 'real', 'rejected')}
                                  >
                                    驳回
                                  </Button>
                                </Space>
                              )}
                              {record.loft_owner_status === 'pending' && (
                                <Space>
                                  <Text>鸽主认证：</Text>
                                  <Button
                                    size="small"
                                    type="primary"
                                    onClick={() => openAudit(record, 'loft_owner', 'approved')}
                                  >
                                    ✅ 审核通过
                                  </Button>
                                  <Button
                                    size="small"
                                    danger
                                    onClick={() => openAudit(record, 'loft_owner', 'rejected')}
                                  >
                                    驳回
                                  </Button>
                                </Space>
                              )}
                            </div>
                          </div>
                        )}
                    </Card>
                  </Space>
                ),
              },
              {
                key: 'activity',
                label: (
                  <span>
                    <TeamOutlined /> 活动记录
                  </span>
                ),
                children: (
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    {/* 筛选条 */}
                    <Card
                      variant="borderless"
                      styles={{ body: { padding: 12 } }}
                      style={{ borderRadius: 12, border: '1px solid #f0f0f0' }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 10,
                        }}
                      >
                        <Space>
                          <Text type="secondary" style={{ fontSize: 13 }}>
                            筛选：
                          </Text>
                          {[
                            { key: 'all', label: '全部' },
                            { key: 'login', label: '登录' },
                            { key: 'bid', label: '出价' },
                            { key: 'compete', label: '参赛' },
                            { key: 'favorite', label: '收藏' },
                          ].map((f) => (
                            <Button
                              key={f.key}
                              size="small"
                              type={activityFilter === f.key ? 'primary' : 'default'}
                              onClick={() => setActivityFilter(f.key)}
                            >
                              {f.label}
                            </Button>
                          ))}
                        </Space>
                        <Input
                          prefix={<SearchOutlined />}
                          placeholder="搜索活动内容"
                          size="small"
                          style={{ width: 200 }}
                        />
                      </div>
                    </Card>

                    {/* Timeline 时间线 */}
                    <Card
                      variant="borderless"
                      styles={{ body: { padding: 20 } }}
                      style={{ borderRadius: 12, border: '1px solid #f0f0f0' }}
                    >
                      {activityLogs.length > 0 ? (
                        <Timeline
                          mode="left"
                          items={activityLogs.slice(0, 20).map((log: any) => ({
                            color: log.typeColor,
                            dot: (
                              <div
                                style={{
                                  width: 14,
                                  height: 14,
                                  borderRadius: '50%',
                                  background: log.typeColor,
                                  boxShadow: `0 0 0 3px ${log.typeColor}30`,
                                }}
                              />
                            ),
                            label: dayjs(log.time).format('MM-DD HH:mm'),
                            children: (
                              <Card
                                size="small"
                                variant="borderless"
                                style={{
                                  borderRadius: 10,
                                  border: '1px solid #f0f0f0',
                                  marginBottom: 8,
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                  <Tag color={log.typeColor}>{log.typeLabel}</Tag>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    {dayjs(log.time).format('YYYY-MM-DD HH:mm:ss')}
                                  </Text>
                                </div>
                                <div style={{ fontSize: 14, color: '#262626' }}>{log.content}</div>
                                {log.ip && (
                                  <div style={{ marginTop: 4, fontSize: 11, color: '#8c8c8c' }}>
                                    IP:{' '}
                                    <Text
                                      copyable={{ text: log.ip }}
                                      style={{ fontFamily: 'monospace' }}
                                    >
                                      {log.ip}
                                    </Text>
                                  </div>
                                )}
                              </Card>
                            ),
                          }))}
                        />
                      ) : (
                        <div
                          style={{
                            textAlign: 'center',
                            padding: '40px 0',
                            color: '#bfbfbf',
                            fontSize: 13,
                          }}
                        >
                          📭 暂无活动记录
                        </div>
                      )}
                      <div
                        style={{
                          marginTop: 10,
                          paddingTop: 10,
                          borderTop: '1px solid #f0f0f0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          共 {activityLogs.length} 条记录
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          展示最新 {Math.min(activityLogs.length, 20)} 条
                        </Text>
                      </div>
                    </Card>
                  </Space>
                ),
              },
              {
                key: 'pigeon',
                label: (
                  <span>
                    <IdcardOutlined /> 我的赛鸽
                  </span>
                ),
                children: (
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <Card
                      variant="borderless"
                      styles={{ body: { padding: 16 } }}
                      style={{ borderRadius: 12, border: '1px solid #f0f0f0' }}
                    >
                      {generatePigeonList(record).length > 0 ? (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: 12,
                          }}
                        >
                          {generatePigeonList(record).map((p: any) => {
                            const statusColor: Record<string, string> = {
                              参赛中: 'red',
                              训练中: 'blue',
                              休息: 'default',
                            };
                            return (
                              <div
                                key={p.id}
                                style={{
                                  borderRadius: 12,
                                  border: '1px solid #f0f0f0',
                                  overflow: 'hidden',
                                  transition: 'all 0.2s',
                                  cursor: 'pointer',
                                }}
                                onMouseEnter={(e) => {
                                  (e.currentTarget as HTMLDivElement).style.borderColor = '#1677ff';
                                  (e.currentTarget as HTMLDivElement).style.boxShadow =
                                    '0 4px 12px rgba(22,119,255,0.15)';
                                }}
                                onMouseLeave={(e) => {
                                  (e.currentTarget as HTMLDivElement).style.borderColor = '#f0f0f0';
                                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                                }}
                              >
                                <div
                                  style={{
                                    padding: '24px 16px',
                                    background: 'linear-gradient(135deg, #e6f4ff, #bae0ff)',
                                    textAlign: 'center',
                                  }}
                                >
                                  <div style={{ fontSize: 36 }}>🕊️</div>
                                </div>
                                <div style={{ padding: 12 }}>
                                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                                    {p.name}
                                  </div>
                                  <div
                                    style={{
                                      fontFamily: 'monospace',
                                      fontSize: 12,
                                      color: '#8c8c8c',
                                      marginBottom: 8,
                                    }}
                                  >
                                    {p.ring_number}
                                  </div>
                                  <div
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                                      {p.breed} · {p.gender}
                                    </span>
                                    <Tag color={statusColor[p.status] || 'default'} style={{ margin: 0 }}>
                                      {p.status}
                                    </Tag>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div
                          style={{
                            textAlign: 'center',
                            padding: '40px 0',
                            color: '#bfbfbf',
                            fontSize: 13,
                          }}
                        >
                          🕊️ 暂无赛鸽
                        </div>
                      )}
                    </Card>
                  </Space>
                ),
              },
              {
                key: 'nft',
                label: (
                  <span>
                    <StarFilled /> NFT资产
                  </span>
                ),
                children: (
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <Card
                      variant="borderless"
                      styles={{ body: { padding: 16 } }}
                      style={{ borderRadius: 12, border: '1px solid #f0f0f0' }}
                    >
                      {generateNftList(record).length > 0 ? (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: 12,
                          }}
                        >
                          {generateNftList(record).map((n: any) => {
                            const rarityColor: Record<string, string> = {
                              稀有: '#faad14',
                              史诗: '#722ed1',
                              传说: '#ff4d4f',
                              普通: '#8c8c8c',
                            };
                            const rarityText = n.rarity || '普通';
                            return (
                              <div
                                key={n.id}
                                style={{
                                  borderRadius: 12,
                                  border: '1px solid #f0f0f0',
                                  overflow: 'hidden',
                                  transition: 'all 0.2s',
                                  cursor: 'pointer',
                                }}
                                onMouseEnter={(e) => {
                                  (e.currentTarget as HTMLDivElement).style.borderColor = '#722ed1';
                                  (e.currentTarget as HTMLDivElement).style.boxShadow =
                                    '0 4px 12px rgba(114,46,209,0.15)';
                                }}
                                onMouseLeave={(e) => {
                                  (e.currentTarget as HTMLDivElement).style.borderColor = '#f0f0f0';
                                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                                }}
                              >
                                <div
                                  style={{
                                    padding: '24px 16px',
                                    background: 'linear-gradient(135deg, #f9f0ff, #efdbff)',
                                    textAlign: 'center',
                                  }}
                                >
                                  <div style={{ fontSize: 36 }}>💎</div>
                                </div>
                                <div style={{ padding: 12 }}>
                                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                                    {n.name}
                                  </div>
                                  <div
                                    style={{
                                      fontFamily: 'monospace',
                                      fontSize: 12,
                                      color: '#8c8c8c',
                                      marginBottom: 8,
                                    }}
                                  >
                                    #{n.token_id}
                                  </div>
                                  <div
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                                      {n.collection}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 600,
                                        padding: '2px 8px',
                                        borderRadius: 10,
                                        background:
                                          (rarityColor[rarityText] || '#8c8c8c') + '15',
                                        color: rarityColor[rarityText] || '#8c8c8c',
                                      }}
                                    >
                                      {rarityText}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div
                          style={{
                            textAlign: 'center',
                            padding: '40px 0',
                            color: '#bfbfbf',
                            fontSize: 13,
                          }}
                        >
                          💎 暂无 NFT 资产
                        </div>
                      )}
                    </Card>
                  </Space>
                ),
              },
            ]}
          />
        </div>
      </div>
    );
  };

  return (
    <>
      <ProTable<UserItem>
        headerTitle="用户列表"
        actionRef={actionRef}
        loading={tableLoading}
        rowKey="id"
        columns={columns}
        options={{ density: false, reload: false }}
        scroll={{ x: 1300 }}
        search={{ labelWidth: 'auto' }}
        toolBarRender={() => [<RefreshButton key="refresh" actionRef={actionRef as any} />]}
        request={async (params) => {
          const { current, pageSize, username, status, cert_status } = params;
          try {
            const res = await getUserList({
              page: current,
              pageSize,
              keyword: username as string | undefined,
              status: status as number | string | undefined,
              cert_status: cert_status as string | undefined,
            });
            return { data: res?.list ?? [], success: true, total: res?.total ?? 0 };
          } catch {
            return { data: [], success: false, total: 0 };
          }
        }}
        pagination={{
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          defaultPageSize: 10,
        }}
      />

      {/* 详情抽屉 */}
      <Drawer
        title={
          <Space>
            <span>用户详情</span>
            <Text type="secondary" style={{ fontSize: 13, fontWeight: 'normal' }}>
              {detailDrawer.record ? `${detailDrawer.record.nickname || detailDrawer.record.username} · ID: ${detailDrawer.record.id}` : ''}
            </Text>
          </Space>
        }
        width={860}
        open={detailDrawer.visible}
        onClose={() => setDetailDrawer({ visible: false, record: null })}
        destroyOnHidden
        zIndex={100}
        styles={{ body: { padding: 0, overflow: 'visible' } }}
      >
        {renderDetailDrawer()}
      </Drawer>

      {/* 编辑抽屉 */}
      <Drawer
        title={
          <Space>
            <span>编辑用户</span>
            {editModal.record && (
              <Text type="secondary" style={{ fontSize: 13, fontWeight: 'normal' }}>
                {editModal.record.nickname || editModal.record.username} · ID: {editModal.record.id}
              </Text>
            )}
          </Space>
        }
        width={560}
        open={editModal.visible}
        onClose={handleEditCancel}
        extra={
          <Space>
            <Button onClick={handleEditCancel}>取 消</Button>
            <Button type="primary" onClick={handleEdit}>
              确 定
            </Button>
          </Space>
        }
      >
        <Form
          form={editForm}
          layout="vertical"
          key={editModal.record?.id ?? 'empty'}
        >
          <Divider orientation="left" plain style={{ fontSize: 14, fontWeight: 600 }}>
            基础信息
          </Divider>

          <Form.Item label="用户ID">
            <Input value={editModal.record?.id} disabled />
          </Form.Item>

          <Form.Item label="用户名" extra="用户名为唯一登录账号,创建后不可修改">
            <Input value={editModal.record?.username} disabled />
          </Form.Item>

          <Form.Item
            name="nickname"
            label="昵称"
            rules={[
              { min: 2, max: 20, message: '昵称长度为2-20个字符' },
            ]}
          >
            <Input placeholder="请输入昵称" maxLength={20} showCount />
          </Form.Item>

          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的11位手机号' },
            ]}
          >
            <Input placeholder="请输入手机号" maxLength={11} />
          </Form.Item>

          <Form.Item name="real_name" label="真实姓名">
            <Input placeholder="请输入真实姓名" />
          </Form.Item>

          <Form.Item
            name="id_card"
            label="身份证号"
            rules={[
              {
                pattern: /(^\d{15}$)|(^\d{17}(\d|X|x)$)/,
                message: '请输入正确的15位或18位身份证号',
              },
            ]}
          >
            <Input placeholder="请输入身份证号" maxLength={18} />
          </Form.Item>

          <Divider orientation="left" plain style={{ fontSize: 14, fontWeight: 600, marginTop: 24 }}>
            账号状态与权限
          </Divider>

          <Form.Item
            name="status"
            label="账号状态"
            rules={[{ required: true, message: '请选择账号状态' }]}
          >
            <Radio.Group>
              <Radio value={1}>正常</Radio>
              <Radio value={0}>封禁</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="member_level_id" label="会员等级">
            <Select
              placeholder="请选择会员等级"
              allowClear
              options={levelOptions.map((l) => ({
                label: `${l.name}(${l.code})`,
                value: l.id,
                disabled: l.status !== 1,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="growth_value"
            label="成长值"
            rules={[{ type: 'number', min: 0, message: '成长值不能为负数' }]}
          >
            <InputNumber min={0} precision={0} placeholder="请输入成长值" style={{ width: '100%' }} />
          </Form.Item>

          <Divider orientation="left" plain style={{ fontSize: 14, fontWeight: 600, marginTop: 24 }}>
            鸽主信息
          </Divider>

          <Form.Item label="鸽主认证状态">
            {editModal.record ? (
              <Tag
                color={
                  AUDIT_SUB_MAP[editModal.record.loft_owner_status]?.color || 'default'
                }
              >
                {AUDIT_SUB_MAP[editModal.record.loft_owner_status]?.text || '未知'}
              </Tag>
            ) : null}
          </Form.Item>
        </Form>
      </Drawer>

      {/* 审核弹窗(通过/驳回 + 备注) */}
      <ModalForm
        title={`${auditModal.action === 'approved' ? '通过' : '驳回'}${
          auditModal.type === 'real' ? '实名认证' : '鸽主认证'
        }`}
        open={auditModal.visible}
        onOpenChange={(v) =>
          setAuditModal(
            v
              ? auditModal
              : { visible: false, userId: null, type: 'real', action: 'approved' }
          )
        }
        onFinish={async () => {
          await handleAudit();
          return true;
        }}
        modalProps={{ destroyOnHidden: true, maskClosable: false, zIndex: 1500 }}
        width={480}
      >
        <div style={{ marginBottom: 8, color: '#888' }}>
          {auditModal.action === 'approved'
            ? '确认通过该用户的认证申请?'
            : '确认驳回该用户的认证申请,请填写驳回理由。'}
        </div>
        <Input.TextArea
          rows={3}
          placeholder="审核备注(驳回理由)"
          value={auditRemark}
          onChange={(e) => setAuditRemark(e.target.value)}
        />
      </ModalForm>

      {/* ============ 更多操作弹窗 ============ */}

      {/* 变更上级分销商 */}
      <Modal
        title={
          <Space>
            <SwapOutlined style={{ color: '#1677ff' }} />
            <span>变更上级分销商</span>
          </Space>
        }
        open={actionType === 'distributor'}
        zIndex={1500}
        onCancel={closeMoreAction}
        onOk={submitMoreAction}
        confirmLoading={actionLoading}
        width={480}
        okText="确认变更"
        cancelText="取消"
      >
        {actionUser && (
          <div>
            <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f5f5f5', borderRadius: 6, fontSize: 13 }}>
              目标用户：<Text strong>{actionUser.nickname || actionUser.username}</Text>
              {actionUser.distributor_name && (
                <Text type="secondary"> | 当前：{actionUser.distributor_name}</Text>
              )}
            </div>
            <Form form={distForm} layout="vertical">
              <Form.Item label="选择分销商" name="distributor_id">
                <Select
                  allowClear
                  placeholder="请选择上级分销商(不选则清除)"
                  options={distributorOptions.map((d) => ({
                    label: (
                      <span>
                        {d.name}
                        <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                          {d.contact} {d.phone}
                        </Text>
                      </span>
                    ),
                    value: d.id,
                  }))}
                />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      {/* 设置用户标签 - 精美卡片式 */}
      <Modal
        open={actionType === 'tags'}
        zIndex={1500}
        onCancel={closeMoreAction}
        onOk={submitMoreAction}
        confirmLoading={actionLoading}
        width={640}
        okText="💾  保存标签"
        cancelText="取消"
        okButtonProps={{ size: 'large', style: { minWidth: 120, height: 40, fontWeight: 600 } }}
        cancelButtonProps={{ size: 'large', style: { height: 40 } }}
        styles={{
          body: { padding: 0 },
          footer: { padding: '16px 24px', borderTop: '1px solid #f0f0f0', background: '#fafafa' },
        }}
        title={null}
      >
        {actionUser && (() => {
          const currentTags: string[] = tagsForm.getFieldValue('tags') ?? [];
          const toggleTag = (tag: string, checked: boolean) => {
            const next = checked ? [...currentTags, tag] : currentTags.filter((t) => t !== tag);
            tagsForm.setFieldsValue({ tags: next });
          };
          const clearAllTags = () => tagsForm.setFieldsValue({ tags: [] });

          return (
            <div style={{ paddingBottom: 8 }}>
              {/* 顶部渐变用户卡片 */}
              <div
                style={{
                  margin: '-16px -16px 0',
                  padding: '24px 24px 20px',
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                  color: '#fff',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* 装饰光晕 */}
                <div style={{ position: 'absolute', top: -40, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(114,46,209,0.4) 0%, transparent 70%)' }} />
                <div style={{ position: 'absolute', bottom: -30, left: 100, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(22,119,255,0.3) 0%, transparent 70%)' }} />

                <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Avatar
                    src={actionUser.avatar}
                    size={56}
                    style={{ background: 'linear-gradient(135deg, #722ed1, #1677ff)', border: '2px solid rgba(255,255,255,0.3)', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}
                  >
                    {(actionUser.nickname || actionUser.username || 'U').charAt(0)}
                  </Avatar>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 17, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                      为「{actionUser.nickname || actionUser.username}」设置标签
                      {currentTags.length > 0 && (
                        <span style={{
                          fontSize: 11,
                          padding: '2px 10px',
                          borderRadius: 10,
                          background: 'linear-gradient(135deg, #722ed1, #9254de)',
                          fontWeight: 500,
                        }}>
                          已选 {currentTags.length} 个
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                      {actionUser.level_name || '普通会员'} · {actionUser.phone || '无手机号'}
                    </div>
                  </div>
                  {currentTags.length > 0 && (
                    <Button
                      size="small"
                      type="text"
                      onClick={clearAllTags}
                      style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                    >
                      清空
                    </Button>
                  )}
                </div>
              </div>

              {/* 统计条 */}
              <div
                style={{
                  margin: '16px 24px 0',
                  padding: '10px 16px',
                  background: currentTags.length > 0 ? 'linear-gradient(90deg, #f9f0ff 0%, #e6f4ff 100%)' : '#fafafa',
                  borderRadius: 10,
                  border: `1px solid ${currentTags.length > 0 ? '#d3adf7' : '#f0f0f0'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TagOutlined style={{ color: '#722ed1' }} />
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                    {currentTags.length > 0
                      ? `已选择 ${currentTags.length} 个标签，占 20 个上限的 ${Math.round((currentTags.length / 20) * 100)}%`
                      : '尚未选择任何标签，点击下方快捷标签或自定义添加'}
                  </Typography.Text>
                </div>
                {currentTags.length > 0 && (
                  <div style={{ width: 80, height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min((currentTags.length / 20) * 100, 100)}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #722ed1, #1677ff)',
                        borderRadius: 3,
                        transition: 'width 0.3s',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* 分组标签区域 */}
              <div style={{ padding: '16px 24px 0' }}>
                {TAG_CATEGORIES.map((cat) => {
                  const selectedInCat = currentTags.filter((t) => cat.tags.includes(t));
                  return (
                    <div key={cat.key} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 14 }}>{cat.icon}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: cat.color }}>{cat.label}</span>
                          {selectedInCat.length > 0 && (
                            <span style={{
                              fontSize: 10,
                              padding: '0 6px',
                              height: 16,
                              lineHeight: '16px',
                              borderRadius: 8,
                              background: cat.color,
                              color: '#fff',
                              fontWeight: 500,
                            }}>
                              {selectedInCat.length}/{cat.tags.length}
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 8,
                          padding: '10px 12px',
                          background: cat.bg,
                          borderRadius: 10,
                          border: `1px solid ${cat.border}`,
                        }}
                      >
                        {cat.tags.map((tag) => {
                          const checked = currentTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              onClick={() => toggleTag(tag, !checked)}
                              style={{
                                cursor: 'pointer',
                                border: checked ? `2px solid ${cat.color}` : `1.5px dashed ${cat.border}`,
                                borderRadius: 20,
                                padding: '4px 14px',
                                fontSize: 13,
                                fontWeight: checked ? 600 : 500,
                                background: checked ? '#fff' : 'rgba(255,255,255,0.7)',
                                color: checked ? cat.color : '#666',
                                transition: 'all 0.2s',
                                boxShadow: checked ? `0 2px 8px ${cat.color}30` : 'none',
                                transform: checked ? 'scale(1.02)' : 'scale(1)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              {checked && '✓ '}{tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 自定义标签区 */}
              <div style={{ padding: '8px 24px 4px' }}>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14 }}>🏷️</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1677ff' }}>自定义标签</span>
                  <span style={{ fontSize: 11, color: '#999', marginLeft: 4 }}>输入后按回车添加</span>
                </div>
                <Form form={tagsForm} layout="vertical">
                  <Form.Item name="tags" style={{ marginBottom: 0 }}>
                    <Select
                      mode="tags"
                      placeholder="输入新标签,按回车添加..."
                      style={{ width: '100%', minHeight: 40 }}
                      tagRender={(props) => {
                        const isQuick = TAG_CATEGORIES.some((c) => c.tags.includes(props.label as string));
                        const themeColor = isQuick
                          ? TAG_CATEGORIES.find((c) => c.tags.includes(props.label as string))?.color ?? '#1677ff'
                          : '#1677ff';
                        return (
                          <Tag
                            closable
                            onClose={(e) => { e.preventDefault(); props.onClose(); }}
                            style={{
                              margin: '2px 4px 2px 0',
                              padding: '0 8px',
                              height: 24,
                              lineHeight: '22px',
                              borderRadius: 12,
                              border: `1px solid ${themeColor}`,
                              background: `${themeColor}15`,
                              color: themeColor,
                              fontSize: 12,
                              fontWeight: 500,
                            }}
                          >
                            {props.label}
                          </Tag>
                        );
                      }}
                    />
                  </Form.Item>
                </Form>
              </div>

              {/* 底部提示 */}
              <div style={{ padding: '12px 24px 4px', fontSize: 11, color: '#bbb', textAlign: 'center' }}>
                🏷️ 标签帮助客服快速识别用户特征,提升服务效率 · 最多添加 20 个标签
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* 重置密码 */}
      <Modal
        title={
          <Space>
            <KeyOutlined style={{ color: '#faad14' }} />
            <span>重置用户密码</span>
          </Space>
        }
        open={actionType === 'reset-pwd'}
        zIndex={1500}
        onCancel={closeMoreAction}
        onOk={submitMoreAction}
        confirmLoading={actionLoading}
        width={480}
        okText="确认重置"
        cancelText="取消"
      >
        {actionUser && (
          <div>
            <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fffbe6', borderRadius: 6, fontSize: 13, color: '#ad6800' }}>
              ⚠️ 重置后用户原密码将失效,新密码将显示给管理员
            </div>
            <div style={{ marginBottom: 12, fontSize: 13 }}>
              目标用户：<Text strong>{actionUser.nickname || actionUser.username}</Text>
              <Text type="secondary"> ({actionUser.username})</Text>
            </div>
            <Form form={resetPwdForm} layout="vertical">
              <Form.Item label="自定义新密码(可选)" name="new_password" extra="不填则自动生成8位随机密码">
                <Input.Password placeholder="至少6位,留空自动生成" />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      {/* 发放优惠券 */}
      <Modal
        title={
          <Space>
            <GiftOutlined style={{ color: '#eb2f96' }} />
            <span>发放优惠券</span>
          </Space>
        }
        open={actionType === 'coupon'}
        zIndex={1500}
        onCancel={closeMoreAction}
        onOk={submitMoreAction}
        confirmLoading={actionLoading}
        width={520}
        okText="确认发放"
        cancelText="取消"
      >
        {actionUser && (
          <div>
            <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f5f5f5', borderRadius: 6, fontSize: 13 }}>
              目标用户：<Text strong>{actionUser.nickname || actionUser.username}</Text>
              {actionUser.level_name && <Tag color="gold" style={{ marginLeft: 8 }}>{actionUser.level_name}</Tag>}
            </div>
            <Form form={couponForm} layout="vertical">
              <Form.Item label="选择优惠券" name="coupon_id" rules={[{ required: true, message: '请选择优惠券' }]}>
                <Select
                  placeholder="请选择要发放的优惠券"
                  options={couponOptions.map((c) => ({
                    label: `${c.name} (${c.type === 'amount' ? `¥${c.value}` : `${(c.value * 10).toFixed(1)}折`})`,
                    value: c.id,
                  }))}
                />
              </Form.Item>
              <Form.Item label="发放数量" name="count" initialValue={1} rules={[{ type: 'number', min: 1, max: 10, message: '1-10张' }]}>
                <InputNumber min={1} max={10} style={{ width: '100%' }} />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      {/* 调整余额 */}
      <Modal
        title={
          <Space>
            <WalletOutlined style={{ color: '#52c41a' }} />
            <span>调整账户余额</span>
          </Space>
        }
        open={actionType === 'balance'}
        zIndex={1500}
        onCancel={closeMoreAction}
        onOk={submitMoreAction}
        confirmLoading={actionLoading}
        width={480}
        okText="确认调整"
        cancelText="取消"
      >
        {actionUser && (
          <div>
            <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f6ffed', borderRadius: 6, fontSize: 13, border: '1px solid #b7eb8f' }}>
              当前余额：<Text strong style={{ color: '#52c41a', fontSize: 16 }}>¥{(actionUser.balance ?? 0).toFixed(2)}</Text>
            </div>
            <Form form={balanceForm} layout="vertical">
              <Form.Item
                label="调整金额"
                name="amount"
                rules={[{ required: true, message: '请输入调整金额(正数增加/负数扣除)' }]}
                extra="正数表示增加余额,负数表示扣除余额"
              >
                <InputNumber
                  placeholder="例:100 增加 / -50 扣除"
                  style={{ width: '100%' }}
                  precision={2}
                  step={10}
                  addonBefore="¥"
                />
              </Form.Item>
              <Form.Item label="调整原因" name="reason">
                <Input.TextArea rows={2} placeholder="可填写调整原因(如:人工补偿/活动奖励等)" maxLength={100} showCount />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      {/* 调整积分 */}
      <Modal
        title={
          <Space>
            <ThunderboltOutlined style={{ color: '#1677ff' }} />
            <span>调整用户积分</span>
          </Space>
        }
        open={actionType === 'points'}
        zIndex={1500}
        onCancel={closeMoreAction}
        onOk={submitMoreAction}
        confirmLoading={actionLoading}
        width={480}
        okText="确认调整"
        cancelText="取消"
      >
        {actionUser && (
          <div>
            <div style={{ marginBottom: 12, padding: '8px 12px', background: '#e6f4ff', borderRadius: 6, fontSize: 13, border: '1px solid #91caff' }}>
              当前积分：<Text strong style={{ color: '#1677ff', fontSize: 16 }}>{actionUser.points ?? 0}</Text>
            </div>
            <Form form={pointsForm} layout="vertical">
              <Form.Item
                label="调整数量"
                name="amount"
                rules={[{ required: true, message: '请输入调整数量(正数增加/负数扣除)' }]}
                extra="正数表示增加积分,负数表示扣除积分"
              >
                <InputNumber
                  placeholder="例:100 增加 / -50 扣除"
                  style={{ width: '100%' }}
                  precision={0}
                  step={10}
                  addonAfter="分"
                />
              </Form.Item>
              <Form.Item label="调整原因" name="reason">
                <Input.TextArea rows={2} placeholder="可填写调整原因(如:签到奖励/违规扣除等)" maxLength={100} showCount />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </>
  );
};

export default UserList;
