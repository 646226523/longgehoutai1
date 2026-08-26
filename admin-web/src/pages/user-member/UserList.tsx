// 用户与会员体系 - 用户管理
// 功能:ProTable 分页列表(用户名/手机/状态/认证状态筛选)、编辑、封禁/解封、
//      实名认证审核(通过/驳回)、鸽主认证审核、详情抽屉(精美用户档案详情)
import {
  ModalForm,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  App,
  Avatar,
  Badge,
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
  Progress,
  Popconfirm,
  Radio,
  Select,
  Space,
  Steps,
  Switch,
  Table,
  Tabs,
  Tag,
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
  TeamOutlined,
  TrophyFilled,
  UnlockOutlined,
  UserOutlined,
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
  getMemberLevels,
  getUserDetail,
  getUserList,
  updateUser,
  updateUserStatus,
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
                { key: 'distributor', label: '变更上级分销商' },
                { key: 'tag', label: '设置标签' },
                { type: 'divider' },
                { key: 'reset-pwd', label: '重置密码' },
                { key: 'coupon', label: '发放优惠券' },
                { key: 'balance', label: '调整余额' },
                { key: 'points', label: '调整积分' },
                { type: 'divider' },
                { key: 'blacklist', label: '黑名单', danger: true },
              ],
              onClick: ({ key }) => {
                const actionMap: Record<string, string> = {
                  distributor: '变更上级分销商',
                  tag: '设置标签',
                  'reset-pwd': '重置密码',
                  coupon: '发放优惠券',
                  balance: '调整余额',
                  points: '调整积分',
                  blacklist: '加入黑名单',
                };
                message.info(`${actionMap[key]}功能开发中`);
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
        {/* 头部身份卡片 */}
        <div
          style={{
            position: 'relative',
            margin: '-24px -24px 0',
            padding: '28px 24px 24px',
            background: levelTheme.gradient,
            color: '#fff',
            overflow: 'hidden',
          }}
        >
          {/* 装饰背景 */}
          <div
            style={{
              position: 'absolute',
              top: -60,
              right: -40,
              width: 220,
              height: 220,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: -40,
              left: 120,
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
            }}
          />

          {/* 主体：头像+身份+状态+数据 */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', gap: 20 }}>
              {/* 头像区 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 100 }}>
                <div
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: '50%',
                    padding: 3,
                    background: 'conic-gradient(from 0deg, rgba(255,255,255,0.9), rgba(255,255,255,0.3), rgba(255,255,255,0.9))',
                    boxShadow: '0 6px 24px rgba(0,0,0,0.22)',
                  }}
                >
                  <Badge
                    count={record.status === 1 ? '' : '禁'}
                    style={{
                      backgroundColor: record.status === 1 ? '#52c41a' : '#ff4d4f',
                      fontSize: 11,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    }}
                    offset={[-6, 6]}
                  >
                    <div
                      style={{
                        width: 82,
                        height: 82,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        background: 'rgba(255,255,255,0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid rgba(255,255,255,0.5)',
                      }}
                    >
                      <Avatar
                        src={record.avatar}
                        size={72}
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.4)',
                          color: '#fff',
                          fontWeight: 600,
                          fontSize: 32,
                        }}
                      >
                        {firstChar}
                      </Avatar>
                    </div>
                  </Badge>
                </div>

                {/* 等级徽章 */}
                {record.level_name ? (
                  <div
                    style={{
                      marginTop: 10,
                      padding: '3px 10px',
                      background: 'rgba(255,255,255,0.22)',
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.4)',
                      backdropFilter: 'blur(6px)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <StarFilled style={{ fontSize: 11 }} />
                    {record.level_name}
                  </div>
                ) : null}
              </div>

              {/* 身份+状态+数据区 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* 第一行：姓名+状态标签 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <Title level={4} style={{ color: '#fff', margin: 0, fontSize: 20, fontWeight: 700 }}>
                    {displayName}
                  </Title>
                  <Tag
                    color={record.status === 1 ? 'green' : 'red'}
                    style={{ borderRadius: 10, fontSize: 12, marginRight: 0 }}
                  >
                    {record.status === 1 ? '正常' : '已封禁'}
                  </Tag>
                  <Tag color={certCfg.color} style={{ borderRadius: 10, fontSize: 12, marginRight: 0 }}>
                    {certCfg.text}
                  </Tag>
                </div>

                {/* 第二行：身份信息 */}
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 13,
                    lineHeight: 1.8,
                    opacity: 0.95,
                  }}
                >
                  <div>
                    <Text style={{ color: 'rgba(255,255,255,0.75)' }}>用户ID：</Text>
                    <Text strong>{record.id}</Text>
                    <Text style={{ margin: '0 10px', color: 'rgba(255,255,255,0.4)' }}>|</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.75)' }}>手机号：</Text>
                    <Text strong>{maskPhone(record.phone)}</Text>
                  </div>
                  <div>
                    <Text style={{ color: 'rgba(255,255,255,0.75)' }}>注册时间：</Text>
                    <Text>{dayjs(record.created_at).format('YYYY-MM-DD HH:mm:ss')}</Text>
                    {record.real_name ? (
                      <>
                        <Text style={{ margin: '0 10px', color: 'rgba(255,255,255,0.4)' }}>|</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.75)' }}>真实姓名：</Text>
                        <Text>{record.real_name}</Text>
                      </>
                    ) : null}
                  </div>
                </div>

                {/* 第三行：关键数据卡片 */}
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      background: 'rgba(255,255,255,0.15)',
                      borderRadius: 10,
                      padding: '8px 12px',
                      border: '1px solid rgba(255,255,255,0.18)',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    <div style={{ fontSize: 11, opacity: 0.85, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <TrophyFilled /> 成长值
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{record.growth_value.toLocaleString()}</div>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      background: 'rgba(255,255,255,0.15)',
                      borderRadius: 10,
                      padding: '8px 12px',
                      border: '1px solid rgba(255,255,255,0.18)',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    <div style={{ fontSize: 11, opacity: 0.85, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <SafetyOutlined /> 认证
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>
                      {certProgress.done}/{certProgress.total}
                    </div>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      background: 'rgba(255,255,255,0.15)',
                      borderRadius: 10,
                      padding: '8px 12px',
                      border: '1px solid rgba(255,255,255,0.18)',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    <div style={{ fontSize: 11, opacity: 0.85, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ClockCircleFilled /> 天数
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>
                      {dayjs().diff(dayjs(record.created_at), 'day')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 头部操作按钮 */}
            <div
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTop: '1px solid rgba(255,255,255,0.25)',
                display: 'flex',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              {canEdit && (
                <Button
                  icon={<EditOutlined />}
                  onClick={() => {
                    openEdit(record);
                    setDetailDrawer({ visible: false, record: null });
                  }}
                  style={{
                    borderColor: 'rgba(255,255,255,0.5)',
                    color: '#fff',
                    background: 'rgba(255,255,255,0.12)',
                  }}
                >
                  编辑信息
                </Button>
              )}
              {canEdit && (
                <Button
                  icon={<LockOutlined />}
                  style={{
                    borderColor: 'rgba(255,255,255,0.5)',
                    color: '#fff',
                    background: 'rgba(255,255,255,0.12)',
                  }}
                  onClick={() => {
                    message.info('密码重置功能开发中');
                  }}
                >
                  重置密码
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
                    danger={record.status === 1}
                    icon={record.status === 1 ? <LockOutlined /> : <UnlockOutlined />}
                    style={{
                      borderColor: 'rgba(255,255,255,0.5)',
                      color: record.status === 1 ? '#ff7875' : '#fff',
                      background: 'rgba(255,255,255,0.12)',
                    }}
                  >
                    {record.status === 1 ? '锁定账号' : '解锁账号'}
                  </Button>
                </Popconfirm>
              )}
              <Dropdown
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
                      key: 'delete',
                      label: <span style={{ color: '#ff4d4f' }}>删除账号</span>,
                      icon: <CloseCircleFilled style={{ color: '#ff4d4f' }} />,
                      onClick: () => message.warning('删除功能开发中'),
                    },
                  ],
                }}
              >
                <Button
                  icon={<MoreOutlined />}
                  style={{
                    borderColor: 'rgba(255,255,255,0.5)',
                    color: '#fff',
                    background: 'rgba(255,255,255,0.12)',
                  }}
                >
                  更多操作
                </Button>
              </Dropdown>
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
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
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
                        <Text strong style={{ fontSize: 15 }}>账号信息</Text>
                      </div>
                      <Descriptions column={2} size="small" colon={false}>
                        <Descriptions.Item label="用户ID">{record.id}</Descriptions.Item>
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
                          {record.id_card ? maskIdCard(record.id_card) : <Text type="secondary">未认证</Text>}
                        </Descriptions.Item>
                        <Descriptions.Item label="账号状态">
                          <Tag color={record.status === 1 ? 'green' : 'red'}>
                            {record.status === 1 ? '正常' : '已封禁'}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="注册时间">
                          {dayjs(record.created_at).format('YYYY-MM-DD HH:mm:ss')}
                        </Descriptions.Item>
                        <Descriptions.Item label="更新时间" span={2}>
                          {dayjs(record.updated_at).format('YYYY-MM-DD HH:mm:ss')}
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>

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
                        <TrophyFilled style={{ color: '#faad14' }} />
                        <Text strong style={{ fontSize: 15 }}>会员信息</Text>
                      </div>
                      <Descriptions column={2} size="small" colon={false}>
                        <Descriptions.Item label="当前等级">
                          {record.level_name ? (
                            <Tag
                              color={
                                record.level_code === 'diamond'
                                  ? 'purple'
                                  : record.level_code === 'gold'
                                  ? 'gold'
                                  : record.level_code === 'silver'
                                  ? 'blue'
                                  : 'default'
                              }
                              style={{ fontSize: 13, padding: '2px 10px' }}
                            >
                              <StarFilled /> {record.level_name}
                            </Tag>
                          ) : (
                            <Tag>无等级</Tag>
                          )}
                        </Descriptions.Item>
                        <Descriptions.Item label="成长值">
                          <span style={{ fontWeight: 600, fontSize: 16, color: '#faad14' }}>
                            {record.growth_value}
                          </span>
                        </Descriptions.Item>
                      </Descriptions>
                      {record.level_name && (
                        <div style={{ marginTop: 16 }}>
                          <Progress
                            percent={Math.min((record.growth_value / 1000) * 100, 100)}
                            strokeColor={{ from: levelTheme.color, to: levelTheme.color + 'cc' }}
                            trailColor="#f5f5f5"
                          />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            距离下一级还需 {Math.max(0, 1000 - record.growth_value)} 成长值
                          </Text>
                        </div>
                      )}
                      {record.level_name && (
                        <div style={{ marginTop: 16 }}>
                          <Text strong style={{ fontSize: 13 }}>会员权益：</Text>
                          <div style={{ marginTop: 8, paddingLeft: 8 }}>
                            <div style={{ fontSize: 13, color: '#595959' }}>· 每日可查看 50 羽鸽子详情</div>
                            <div style={{ fontSize: 13, color: '#595959' }}>· 竞拍保证金优惠 50%</div>
                            <div style={{ fontSize: 13, color: '#595959' }}>· 专属客服支持</div>
                          </div>
                        </div>
                      )}
                    </Card>
                  </Space>
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
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
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

                    {/* 活动日志表格 */}
                    <Card
                      variant="borderless"
                      styles={{ body: { padding: 0 } }}
                      style={{ borderRadius: 12, border: '1px solid #f0f0f0', overflow: 'hidden' }}
                    >
                      <Table
                        size="small"
                        pagination={false}
                        rowKey="id"
                        dataSource={activityLogs}
                        columns={[
                          {
                            title: '时间',
                            dataIndex: 'time',
                            width: 140,
                            render: (t: number) => (
                              <div>
                                <div style={{ fontWeight: 500 }}>{dayjs(t).format('MM-DD')}</div>
                                <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                                  {dayjs(t).format('HH:mm')}
                                </div>
                              </div>
                            ),
                          },
                          {
                            title: '类型',
                            dataIndex: 'typeLabel',
                            width: 80,
                            render: (label: string, row: any) => (
                              <Tag color={row.typeColor} style={{ borderRadius: 10 }}>
                                {label}
                              </Tag>
                            ),
                          },
                          {
                            title: '内容',
                            dataIndex: 'content',
                            ellipsis: true,
                            render: (text: string) => (
                              <span style={{ color: '#262626' }}>{text}</span>
                            ),
                          },
                          {
                            title: 'IP地址',
                            dataIndex: 'ip',
                            width: 130,
                            render: (ip: string) => (
                              <Text
                                copyable={{ text: ip }}
                                style={{
                                  fontFamily: 'monospace',
                                  cursor: 'pointer',
                                  transition: 'color 0.2s',
                                }}
                              >
                                {ip}
                              </Text>
                            ),
                          },
                          {
                            title: '操作',
                            key: 'action',
                            width: 60,
                            render: () => (
                              <Button type="link" size="small">
                                详情
                              </Button>
                            ),
                          },
                        ]}
                      />
                      <div
                        style={{
                          padding: '10px 16px',
                          borderTop: '1px solid #f0f0f0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: '#fafafa',
                        }}
                      >
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          共 {activityLogs.length} 条记录
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          展示最新 {activityLogs.length} 条
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
                      styles={{ body: { padding: 0 } }}
                      style={{ borderRadius: 12, border: '1px solid #f0f0f0', overflow: 'hidden' }}
                    >
                      <Table
                        size="small"
                        pagination={false}
                        rowKey="id"
                        dataSource={generatePigeonList(record)}
                        columns={[
                          {
                            title: '环号',
                            dataIndex: 'ring_number',
                            render: (v: string) => <Text code>{v}</Text>,
                          },
                          { title: '鸽名', dataIndex: 'name' },
                          { title: '品种', dataIndex: 'breed' },
                          { title: '性别', dataIndex: 'gender', width: 60 },
                          {
                            title: '状态',
                            dataIndex: 'status',
                            width: 100,
                            render: (s: string) => {
                              const colorMap: Record<string, string> = {
                                参赛中: 'red',
                                训练中: 'blue',
                                休息: 'default',
                              };
                              return <Tag color={colorMap[s] || 'default'}>{s}</Tag>;
                            },
                          },
                          {
                            title: '操作',
                            key: 'action',
                            width: 80,
                            render: () => (
                              <Button type="link" size="small">
                                详情
                              </Button>
                            ),
                          },
                        ]}
                      />
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
                      styles={{ body: { padding: 0 } }}
                      style={{ borderRadius: 12, border: '1px solid #f0f0f0', overflow: 'hidden' }}
                    >
                      <Table
                        size="small"
                        pagination={false}
                        rowKey="id"
                        dataSource={generateNftList(record)}
                        columns={[
                          {
                            title: 'Token ID',
                            dataIndex: 'token_id',
                            render: (v: string) => <Text code>{v}</Text>,
                          },
                          { title: '名称', dataIndex: 'name' },
                          { title: '系列', dataIndex: 'collection' },
                          {
                            title: '获取时间',
                            dataIndex: 'acquired_at',
                            render: (t: number) => dayjs(t).format('YYYY-MM-DD HH:mm'),
                          },
                          {
                            title: '状态',
                            dataIndex: 'status',
                            width: 80,
                            render: (s: string) => <Tag color="green">{s}</Tag>,
                          },
                          {
                            title: '操作',
                            key: 'action',
                            width: 80,
                            render: () => (
                              <Button type="link" size="small">
                                查看
                              </Button>
                            ),
                          },
                        ]}
                      />
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
            return { data: res.list, success: true, total: res.total };
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
        styles={{ body: { padding: 0 } }}
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
        destroyOnHidden
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
          preserve={false}
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
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
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
    </>
  );
};

export default UserList;
