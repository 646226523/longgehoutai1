import React, { useRef, useState } from 'react';
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
  Col,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Row,
  Space,
  Statistic,
  Steps,
  Tag,
  Typography,
  theme,
} from 'antd';
import {
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
  FileTextOutlined,
  IdcardOutlined,
  SafetyOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getAuditList, auditUserRealName, auditUserLoftOwner, type AuditItem } from '../../services/user';
import RefreshButton from '../../components/RefreshButton';
import { useTableRefresh } from '../../hooks/useTableRefresh';

const { Text } = Typography;

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'gold';
    case 'approved': return 'green';
    case 'rejected': return 'red';
    default: return 'default';
  }
};

const BASE_URL = '';

const getImageUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  if (url.startsWith('data:image')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return BASE_URL + (url.startsWith('/') ? url : '/' + url);
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending': return '待审核';
    case 'approved': return '已通过';
    case 'rejected': return '已驳回';
    default: return '未提交';
  }
};

const AuditList: React.FC = () => {
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>();
  const { handleRefresh } = useTableRefresh(actionRef, { messageApi: message });
  const { token } = theme.useToken();
  const [form] = Form.useForm();

  const [auditModal, setAuditModal] = useState<{
    visible: boolean;
    record: AuditItem | null;
    type: 'real_name' | 'loft_owner';
    action: 'approved' | 'rejected';
  }>({ visible: false, record: null, type: 'real_name', action: 'approved' });

  const [detailDrawer, setDetailDrawer] = useState<{
    visible: boolean;
    record: AuditItem | null;
  }>({ visible: false, record: null });

  const [statistics, setStatistics] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [previewModal, setPreviewModal] = useState<{
    visible: boolean;
    list: string[];
    index: number;
  }>({ visible: false, list: [], index: 0 });

  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    content: React.ReactNode;
    okText: string;
    cancelText: string;
    onOk: (() => Promise<void> | void) | null;
    loading: boolean;
  }>({ visible: false, title: '', content: '', okText: '确定', cancelText: '取消', onOk: null, loading: false });

  const openPreview = (index: number, list: string[]) => {
    setPreviewModal({ visible: true, list, index });
  };

  const handleAudit = async (values: { remark?: string }) => {
    if (!auditModal.record) return;
    try {
      const api = auditModal.type === 'real_name' ? auditUserRealName : auditUserLoftOwner;
      await api(auditModal.record.id, auditModal.action, values.remark);
      message.success(auditModal.action === 'approved' ? '审核通过' : '已驳回');
      setAuditModal({ visible: false, record: null, type: 'real_name', action: 'approved' });
      handleRefresh();
    } catch {}
  };

  const handleBatchAudit = async (action: 'approved' | 'rejected') => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择记录');
      return;
    }
    setConfirmModal({
      visible: true,
      title: action === 'approved' ? '批量审核通过' : '批量驳回',
      content: `确定要${action === 'approved' ? '通过' : '驳回'}选中的 ${selectedRowKeys.length} 条记录吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          for (const key of selectedRowKeys) {
            await auditUserRealName(key as number, action, '');
          }
          message.success(`${action === 'approved' ? '通过' : '驳回'}成功`);
          setSelectedRowKeys([]);
          handleRefresh();
        } catch {}
      },
      loading: false,
    });
  };

  const handleQuickAudit = (record: AuditItem, type: 'real_name' | 'loft_owner', action: 'approved' | 'rejected') => {
    setAuditModal({ visible: true, record, type, action });
  };

  const handleDetail = (record: AuditItem) => {
    setDetailDrawer({ visible: true, record });
  };

  const handleStatClick = (status: string) => {
    const next = statusFilter === status ? '' : status;
    setStatusFilter(next);
    if (actionRef.current) {
      actionRef.current.reload();
    }
  };

  const updateStatistics = (list: AuditItem[]) => {
    const stats = { pending: 0, approved: 0, rejected: 0, total: list.length };
    list.forEach((item) => {
      if (item.real_name_status === 'pending' || item.loft_owner_status === 'pending') {
        stats.pending++;
      }
      if (item.real_name_status === 'approved' || item.loft_owner_status === 'approved') {
        stats.approved++;
      }
      if (item.real_name_status === 'rejected' || item.loft_owner_status === 'rejected') {
        stats.rejected++;
      }
    });
    setStatistics(stats);
  };

  const columns: ProColumns<AuditItem>[] = [
    {
      title: '申请人',
      width: 220,
      dataIndex: 'nickname',
      hideInSearch: true,
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar
            size={36}
            src={record.avatar}
            icon={<UserOutlined />}
            style={{ border: '2px solid #e6f4ff', flexShrink: 0 }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {record.nickname || record.username}
            </div>
            <div style={{ color: token.colorTextSecondary, fontSize: 12 }}>
              {record.phone}
            </div>
            {record.level_name && (
              <Tag color="gold" style={{ fontSize: 11, margin: '2px 0 0', padding: '0 6px', lineHeight: '18px' }}>
                {record.level_name}
              </Tag>
            )}
          </div>
        </div>
      ),
    },
    {
      title: '实名认证',
      width: 180,
      dataIndex: 'real_name_status',
      hideInSearch: true,
      render: (_, record) => (
        <Space direction="vertical" size={4}>
          <Tag
            color={getStatusColor(record.real_name_status)}
            style={{ margin: 0 }}
            icon={
              record.real_name_status === 'pending' ? <ClockCircleFilled /> :
              record.real_name_status === 'approved' ? <CheckCircleFilled /> :
              record.real_name_status === 'rejected' ? <CloseCircleFilled /> : null
            }
          >
            {getStatusText(record.real_name_status)}
          </Tag>
          {record.real_name && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.real_name}
            </Text>
          )}
          {record.id_card && (
            <Text type="secondary" style={{ fontSize: 12, cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.title = '点击查看详情'; }}
              onClick={() => handleDetail(record)}
            >
              身份证: {record.id_card.slice(0, 6)}********{record.id_card.slice(-4)}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: '认证材料',
      width: 100,
      dataIndex: 'id_card_front',
      hideInSearch: true,
      render: (_, record) => {
        const hasMaterial = record.id_card_front || record.id_card_back || record.id_card_handheld;
        if (!hasMaterial) {
          return <Text type="secondary" style={{ fontSize: 12 }}>暂无材料</Text>;
        }
        return (
          <img
            src={getImageUrl(record.id_card_front)}
            alt="身份证正面"
            style={{ width: 50, height: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid #e8e8e8', cursor: 'zoom-in' }}
            onClick={() => {
              const list = [record.id_card_front, record.id_card_back, record.id_card_handheld].filter(Boolean) as string[];
              openPreview(0, list);
            }}
          />
        );
      },
    },
    {
      title: '鸽主认证',
      width: 160,
      dataIndex: 'loft_owner_status',
      hideInSearch: true,
      render: (_, record) => (
        <Space direction="vertical" size={4}>
          <Tag
            color={getStatusColor(record.loft_owner_status)}
            style={{ margin: 0 }}
            icon={
              record.loft_owner_status === 'pending' ? <ClockCircleFilled /> :
              record.loft_owner_status === 'approved' ? <CheckCircleFilled /> :
              record.loft_owner_status === 'rejected' ? <CloseCircleFilled /> : null
            }
          >
            {getStatusText(record.loft_owner_status)}
          </Tag>
          {record.level_name && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.level_name}
            </Text>
          )}
          <Text type="secondary" style={{ fontSize: 12 }}>
            成长值: {record.growth_value}
          </Text>
        </Space>
      ),
    },
    {
      title: '会员等级',
      dataIndex: 'level_name',
      width: 100,
      hideInSearch: true,
      render: (val) => val ? <Tag color="gold" style={{ margin: 0 }}>{val}</Tag> : <Text type="secondary">普通会员</Text>,
    },
    {
      title: '申请时间',
      dataIndex: 'updated_at',
      width: 130,
      hideInSearch: true,
      render: (val) => (
        <Text type="secondary" style={{ fontSize: 13 }}>
          {dayjs(val as number).format('YYYY-MM-DD HH:mm')}
        </Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'audit_status',
      width: 100,
      hideInSearch: true,
      render: (_, record) => {
        const overallStatus =
          record.real_name_status === 'rejected' || record.loft_owner_status === 'rejected' ? 'rejected' :
          record.real_name_status === 'pending' || record.loft_owner_status === 'pending' ? 'pending' :
          'approved';
        return (
          <Tag
            color={getStatusColor(overallStatus)}
            style={{ margin: 0, fontWeight: 500 }}
          >
            {getStatusText(overallStatus)}
          </Tag>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => {
        const hasPending = record.real_name_status === 'pending' || record.loft_owner_status === 'pending';
        const hasRejected = record.real_name_status === 'rejected' || record.loft_owner_status === 'rejected';

        return (
          <Space size="small">
            {hasPending && (
              <>
                <Button
                  type="link"
                  size="small"
                  style={{ color: '#52c41a' }}
                  onClick={() => {
                    const pendingType = record.real_name_status === 'pending' ? 'real_name' : 'loft_owner';
                    handleQuickAudit(record, pendingType, 'approved');
                  }}
                >
                  通过
                </Button>
                <Button
                  type="link"
                  size="small"
                  danger
                  onClick={() => {
                    const pendingType = record.real_name_status === 'pending' ? 'real_name' : 'loft_owner';
                    handleQuickAudit(record, pendingType, 'rejected');
                  }}
                >
                  驳回
                </Button>
              </>
            )}
            <Button
              type="link"
              size="small"
              onClick={() => handleDetail(record)}
            >
              详情
            </Button>
            {hasRejected && !hasPending && (
              <Button
                type="link"
                size="small"
                onClick={() => {
                  setConfirmModal({
                    visible: true,
                    title: '重新提交认证',
                    content: `确定要让用户 ${record.nickname || record.username} 重新提交认证材料吗？`,
                    okText: '确定',
                    cancelText: '取消',
                    onOk: async () => {
                      message.success('已重置，请用户重新提交认证材料');
                      handleRefresh();
                    },
                    loading: false,
                  });
                }}
              >
                重试
              </Button>
            )}
          </Space>
        );
      },
    },
    {
      title: '搜索',
      dataIndex: 'keyword',
      valueType: 'text',
      hideInTable: true,
    },
    {
      title: '认证类型',
      dataIndex: 'audit_type',
      valueType: 'select',
      hideInTable: true,
      valueEnum: {
        real_name: { text: '实名认证' },
        loft_owner: { text: '鸽主认证' },
      },
    },
    {
      title: '认证状态',
      dataIndex: 'audit_status',
      valueType: 'select',
      hideInTable: true,
      valueEnum: {
        pending: { text: '待审核' },
        approved: { text: '已通过' },
        rejected: { text: '已驳回' },
      },
    },
  ];

  const renderDetailDrawer = () => {
    if (!detailDrawer.record) return null;
    const record = detailDrawer.record;
    const hasIdCardFront = !!record.id_card_front;
    const hasIdCardBack = !!record.id_card_back;
    const hasIdCardHandheld = !!record.id_card_handheld;
    const hasAnyMaterial = hasIdCardFront || hasIdCardBack || hasIdCardHandheld;

    return (
      <Drawer
        title={
          <Space>
            <span style={{ fontWeight: 600, fontSize: 16 }}>认证审核详情</span>
            <Tag color="blue">申请人：{record.nickname || record.username}</Tag>
          </Space>
        }
        placement="right"
        width={680}
        onClose={() => setDetailDrawer({ visible: false, record: null })}
        open={detailDrawer.visible}
        extra={
          <Space>
            <Button
              danger
              onClick={() => handleQuickAudit(record, 'real_name', 'rejected')}
            >
              驳回
            </Button>
            <Button
              type="primary"
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              onClick={() => handleQuickAudit(record, 'real_name', 'approved')}
            >
              通过
            </Button>
          </Space>
        }
      >
        {/* 申请人信息 */}
        <Card
          size="small"
          title={
            <Space>
              <div style={{ width: 4, height: 16, background: 'linear-gradient(180deg, #1890ff 0%, #722ed1 100%)', borderRadius: 2 }} />
              <UserOutlined style={{ color: '#1890ff' }} />
              <span style={{ fontWeight: 600 }}>申请人信息</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
          variant="borderless"
        >
          <Descriptions column={2} size="small">
            <Descriptions.Item label="头像">
              <Avatar src={record.avatar} icon={<UserOutlined />} size={48} />
            </Descriptions.Item>
            <Descriptions.Item label="用户ID">{record.id}</Descriptions.Item>
            <Descriptions.Item label="昵称">{record.nickname || record.username}</Descriptions.Item>
            <Descriptions.Item label="手机号">{record.phone}</Descriptions.Item>
            <Descriptions.Item label="会员等级">
              <Tag color="gold">{record.level_name || '普通会员'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="成长值">{record.growth_value}</Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 实名认证审核 */}
        <Card
          size="small"
          title={
            <Space>
              <div style={{ width: 4, height: 16, background: 'linear-gradient(180deg, #52c41a 0%, #1890ff 100%)', borderRadius: 2 }} />
              <IdcardOutlined style={{ color: '#52c41a' }} />
              <span style={{ fontWeight: 600 }}>实名认证审核</span>
              <Tag color={getStatusColor(record.real_name_status)}>
                {getStatusText(record.real_name_status)}
              </Tag>
            </Space>
          }
          style={{ marginBottom: 16 }}
          variant="borderless"
        >
          <Descriptions column={2} size="small" style={{ marginBottom: 12 }}>
            <Descriptions.Item label="真实姓名">{record.real_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="身份证号">
              {record.id_card ? (
                <Text copyable style={{ fontFamily: 'monospace' }}>
                  {record.id_card}
                </Text>
              ) : '-'}
            </Descriptions.Item>
          </Descriptions>
          {hasAnyMaterial && (
            <Row gutter={[12, 12]}>
              {hasIdCardFront && (
                <Col span={8}>
                  <MaterialCard
                    title="身份证正面"
                    src={record.id_card_front}
                    color="#1890ff"
                    onPreview={() => {
                      const list = [record.id_card_front, record.id_card_back, record.id_card_handheld].filter(Boolean) as string[];
                      openPreview(0, list);
                    }}
                  />
                </Col>
              )}
              {hasIdCardBack && (
                <Col span={8}>
                  <MaterialCard
                    title="身份证反面"
                    src={record.id_card_back}
                    color="#52c41a"
                    onPreview={() => {
                      const list = [record.id_card_front, record.id_card_back, record.id_card_handheld].filter(Boolean) as string[];
                      openPreview(record.id_card_front ? 1 : 0, list);
                    }}
                  />
                </Col>
              )}
              {hasIdCardHandheld && (
                <Col span={8}>
                  <MaterialCard
                    title="手持身份证"
                    src={record.id_card_handheld}
                    color="#fa8c16"
                    onPreview={() => {
                      const list = [record.id_card_front, record.id_card_back, record.id_card_handheld].filter(Boolean) as string[];
                      let index = 0;
                      if (record.id_card_front) index++;
                      if (record.id_card_back) index++;
                      openPreview(index, list);
                    }}
                  />
                </Col>
              )}
            </Row>
          )}
        </Card>

        {/* 鸽主认证审核 */}
        <Card
          size="small"
          title={
            <Space>
              <div style={{ width: 4, height: 16, background: 'linear-gradient(180deg, #722ed1 0%, #eb2f96 100%)', borderRadius: 2 }} />
              <FileTextOutlined style={{ color: '#722ed1' }} />
              <span style={{ fontWeight: 600 }}>鸽主认证审核</span>
              <Tag color={getStatusColor(record.loft_owner_status)}>
                {getStatusText(record.loft_owner_status)}
              </Tag>
            </Space>
          }
          style={{ marginBottom: 16 }}
          variant="borderless"
        >
          <Descriptions column={2} size="small">
            <Descriptions.Item label="会员等级">{record.level_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="成长值">{record.growth_value}</Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 审核状态进度 */}
        <Card
          size="small"
          title={
            <Space>
              <SafetyOutlined style={{ color: '#1890ff' }} />
              <span style={{ fontWeight: 600 }}>审核状态进度</span>
            </Space>
          }
          variant="borderless"
        >
          <Steps
            direction="vertical"
            size="small"
            current={
              record.real_name_status === 'approved' && record.loft_owner_status === 'approved' ? 2 :
              record.real_name_status === 'pending' || record.loft_owner_status === 'pending' ? 1 :
              0
            }
            status={
              record.real_name_status === 'rejected' || record.loft_owner_status === 'rejected' ? 'error' :
              record.real_name_status === 'approved' && record.loft_owner_status === 'approved' ? 'finish' :
              'process'
            }
            items={[
              {
                title: '提交认证申请',
                description: dayjs(record.created_at).format('YYYY-MM-DD HH:mm'),
              },
              {
                title: '管理员审核中',
                description: '等待审核处理',
              },
              {
                title: '审核完成',
                description: dayjs(record.updated_at).format('YYYY-MM-DD HH:mm'),
              },
            ]}
          />
        </Card>
      </Drawer>
    );
  };

  const renderStatCard = (
    title: string,
    value: number,
    icon: React.ReactNode,
    color: string,
    bgGradient: string,
    isActive: boolean,
    onClick: () => void,
    hint?: string,
  ) => (
    <Card
      variant="borderless"
      onClick={onClick}
      style={{
        background: bgGradient,
        borderRadius: 12,
        cursor: 'pointer',
        border: isActive ? `2px solid ${color}` : '2px solid transparent',
        transition: 'all 0.3s',
        boxShadow: isActive ? `0 4px 16px ${color}40` : '0 2px 8px rgba(0,0,0,0.06)',
        position: 'relative',
        overflow: 'hidden',
      }}
      styles={{ body: { padding: 16 } }}
    >
      <div style={{ position: 'absolute', right: -20, top: -20, width: 60, height: 60, borderRadius: '50%', background: `${color}15` }} />
      <Space direction="vertical" size={6} style={{ width: '100%', position: 'relative' }}>
        <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Text strong style={{ color, fontSize: 13 }}>{title}</Text>
          <div style={{ fontSize: 18 }}>{icon}</div>
        </Space>
        <Statistic value={value} valueStyle={{ color, fontSize: 28, fontWeight: 700 }} />
        {hint && <Text type="secondary" style={{ fontSize: 11, color }}>{hint}</Text>}
      </Space>
    </Card>
  );

  return (
    <App>
      <div style={{ padding: 24, background: 'linear-gradient(180deg, #f0f2f5 0%, #f5f7fa 100%)', minHeight: '100vh' }}>
        {/* 统计卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col span={8}>
            {renderStatCard('已通过', statistics.approved, <CheckCircleFilled style={{ color: '#52c41a' }} />, '#389e0d', 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)', statusFilter === 'approved', () => handleStatClick('approved'))}
          </Col>
          <Col span={8}>
            {renderStatCard('已驳回', statistics.rejected, <CloseCircleFilled style={{ color: '#f5222d' }} />, '#cf1322', 'linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%)', statusFilter === 'rejected', () => handleStatClick('rejected'))}
          </Col>
          <Col span={8}>
            {renderStatCard('全部', statistics.total, <SafetyOutlined style={{ color: '#1890ff' }} />, '#096dd9', 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)', statusFilter === '', () => handleStatClick(''))}
          </Col>
        </Row>

        {/* 审核列表 */}
        <Card
          variant="borderless"
          style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}
          styles={{ body: { padding: 0 } }}
        >
          <ProTable<AuditItem>
            actionRef={actionRef}
            rowKey="id"
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            search={{
              labelWidth: 'auto',
              defaultCollapsed: false,
              span: 6,
              style: { padding: '16px 16px 0', background: '#fafafa', borderRadius: '8px 8px 0 0' },
            }}
            headerTitle={
              <Space size={8}>
                <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <SafetyOutlined style={{ color: '#fff' }} />
                </div>
                <span style={{ fontWeight: 600, fontSize: 16 }}>认证审核管理</span>
                <Tag color="blue">实名认证 + 鸽主认证</Tag>
              </Space>
            }
            toolBarRender={() => [
              <Button
                key="batch-approve"
                type="primary"
                disabled={selectedRowKeys.length === 0}
                onClick={() => handleBatchAudit('approved')}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                批量通过
              </Button>,
              <Button
                key="batch-reject"
                danger
                disabled={selectedRowKeys.length === 0}
                onClick={() => handleBatchAudit('rejected')}
              >
                批量驳回
              </Button>,
              <RefreshButton key="refresh" actionRef={actionRef} />,
            ]}
            request={async (params) => {
              try {
                const { current, pageSize, keyword, audit_type, audit_status } = params;
                const finalAuditStatus = statusFilter || (audit_status as string | undefined);
                const data = await getAuditList({
                  page: current,
                  pageSize,
                  keyword: keyword as string | undefined,
                  audit_type: audit_type as string | undefined,
                  audit_status: finalAuditStatus as string | undefined,
                });
                updateStatistics(data.list);
                return { data: data.list, total: data.total, success: true };
              } catch {
                return { data: [], total: 0, success: false };
              }
            }}
            columns={columns}
            pagination={{
              defaultPageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条审核记录`,
            }}
            options={{ density: false, fullScreen: false, reload: false, setting: false }}
            scroll={{ x: 1200 }}
          />
        </Card>
      </div>

      {/* 通用确认弹窗 */}
      <Modal
        title={confirmModal.title}
        open={confirmModal.visible}
        onOk={async () => {
          setConfirmModal(prev => ({ ...prev, loading: true }));
          try {
            await confirmModal.onOk?.();
            setConfirmModal({ visible: false, title: '', content: '', okText: '确定', cancelText: '取消', onOk: null, loading: false });
          } catch {
            setConfirmModal(prev => ({ ...prev, loading: false }));
          }
        }}
        onCancel={() => {
          setConfirmModal({ visible: false, title: '', content: '', okText: '确定', cancelText: '取消', onOk: null, loading: false });
        }}
        okText={confirmModal.okText}
        cancelText={confirmModal.cancelText}
        confirmLoading={confirmModal.loading}
      >
        {confirmModal.content}
      </Modal>

      {/* 审核操作弹窗 */}
      <ModalForm
        modalProps={{ destroyOnHidden: true, width: 480, centered: true }}
        title={
          <Space>
            <span style={{ fontWeight: 600 }}>
              {auditModal.action === 'approved' ? '确认审核通过' : '确认驳回申请'}
            </span>
            <Tag color={auditModal.action === 'approved' ? 'green' : 'red'}>
              {auditModal.type === 'real_name' ? '实名认证' : '鸽主认证'}
            </Tag>
          </Space>
        }
        form={form}
        open={auditModal.visible}
        onOpenChange={(visible) => !visible && setAuditModal({ visible: false, record: null, type: 'real_name', action: 'approved' })}
        onFinish={handleAudit}
        submitter={{
          searchConfig: { submitText: auditModal.action === 'approved' ? '确认通过' : '确认驳回' },
          render: (_, dom) => [
            dom[0],
            <Button
              key="submit"
              type="primary"
              danger={auditModal.action === 'rejected'}
              onClick={() => form.submit()}
            >
              {auditModal.action === 'approved' ? '确认通过' : '确认驳回'}
            </Button>,
          ],
        }}
      >
        {auditModal.record && (
          <>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="申请人">
                <Space>
                  <Avatar src={auditModal.record.avatar} icon={<UserOutlined />} size={32} />
                  <Text strong>{auditModal.record.nickname || auditModal.record.username}</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="手机号">{auditModal.record.phone}</Descriptions.Item>
              <Descriptions.Item label="会员等级">{auditModal.record.level_name || '普通会员'}</Descriptions.Item>
            </Descriptions>
            <Form.Item
              label={auditModal.action === 'rejected' ? '驳回原因' : '审核备注'}
              name="remark"
              rules={auditModal.action === 'rejected' ? [{ required: true, message: '驳回时必须填写原因' }] : []}
            >
              <Input.TextArea
                rows={3}
                placeholder={auditModal.action === 'rejected' ? '请输入驳回原因...' : '审核备注（可选）'}
                showCount
                maxLength={200}
              />
            </Form.Item>
          </>
        )}
      </ModalForm>

      {/* 详情抽屉 */}
      {renderDetailDrawer()}

      {/* 大图预览 */}
      <Modal
        open={previewModal.visible}
        onCancel={() => setPreviewModal({ visible: false, list: [], index: 0 })}
        footer={null}
        width={600}
        centered
        title="认证材料预览"
        zIndex={2000}
        styles={{ mask: { zIndex: 1999 } }}
      >
        {previewModal.visible && previewModal.list.length > 0 && (
          <div>
            <img
              src={previewModal.list[previewModal.index]}
              alt="预览"
              style={{ width: '100%', maxHeight: 500, objectFit: 'contain' }}
            />
            <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
              <Button disabled={previewModal.index <= 0} onClick={() => setPreviewModal({ ...previewModal, index: previewModal.index - 1 })}>上一张</Button>
              <Text>{previewModal.index + 1} / {previewModal.list.length}</Text>
              <Button disabled={previewModal.index >= previewModal.list.length - 1} onClick={() => setPreviewModal({ ...previewModal, index: previewModal.index + 1 })}>下一张</Button>
            </div>
          </div>
        )}
      </Modal>
    </App>
  );
};

const MaterialCard: React.FC<{
  title: string;
  src: string | null;
  color: string;
  compact?: boolean;
  onPreview?: () => void;
}> = ({ title, src, color, compact, onPreview }) => {
  const height = compact ? 90 : 150;
  const imageUrl = getImageUrl(src);
  return (
    <div style={{ border: '2px solid #e8e8e8', borderRadius: 8, overflow: 'hidden', background: '#fafafa', transition: 'all 0.3s', cursor: imageUrl ? 'zoom-in' : 'default' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e8e8e8'; }}
    >
      {imageUrl ? (
        <div style={{ position: 'relative' }}>
          <img src={imageUrl} alt={title} style={{ width: '100%', height, objectFit: 'contain', display: 'block', backgroundColor: '#fff' }} onClick={onPreview} />
          <div style={{ position: 'absolute', top: 4, right: 4, background: color, color: '#fff', padding: '2px 6px', borderRadius: 4, fontSize: 10 }}>{title}</div>
        </div>
      ) : (
        <div style={{ height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>🖼️</div>
          <Text type="secondary" style={{ fontSize: 11 }}>暂无图片</Text>
        </div>
      )}
    </div>
  );
};

export default AuditList;
