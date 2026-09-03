import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { Alert, App, Avatar, Button, Card, Col, Descriptions, Drawer, Row, Space, Statistic, Tabs, Tag, Typography } from 'antd';
import {
  BarChartOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  CodeOutlined,
  DownloadOutlined,
  EditOutlined,
  ExclamationCircleFilled,
  EyeOutlined,
  FolderOutlined,
  HistoryOutlined,
  KeyOutlined,
  LogoutOutlined,
  MinusCircleFilled,
  PlayCircleFilled,
  PlusCircleFilled,
  SyncOutlined,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

import { useCurrentUser } from '../../app-context';
import { useTableRefresh } from '../../hooks/useTableRefresh';
import RefreshButton from '../../components/RefreshButton';
import { hasPermission } from '../../access';
import {
  getAuditActions,
  getAuditLogs,
  getAuditModules,
  getAuditStats,
  type AuditDiffItem,
  type AuditLogItem,
  type AuditLogStats,
} from '../../services/system';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Text, Paragraph } = Typography;

// ==================== 常量 ====================

// 操作类型 → 颜色和图标（用于 Tag）
const ACTION_STYLES: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  // 通用
  create: { color: 'blue', icon: <PlusCircleFilled />, label: '新增' },
  update: { color: 'orange', icon: <EditOutlined />, label: '修改' },
  delete: { color: 'red', icon: <MinusCircleFilled />, label: '删除' },
  publish: { color: 'green', icon: <CheckCircleFilled />, label: '发布' },
  offline: { color: 'default', icon: <MinusCircleFilled />, label: '下架' },
  update_status: { color: 'gold', icon: <EditOutlined />, label: '修改状态' },
  update_sort: { color: 'gold', icon: <EditOutlined />, label: '调整排序' },
  toggle_top: { color: 'gold', icon: <EditOutlined />, label: '置顶/取消置顶' },
  transition_status: { color: 'gold', icon: <EditOutlined />, label: '变更状态' },
  export: { color: 'blue', icon: <DownloadOutlined />, label: '导出' },
  import_participants: { color: 'blue', icon: <UploadOutlined />, label: '导入参与者' },
  // 登录
  login: { color: 'cyan', icon: <UserOutlined />, label: '登录' },
  logout: { color: 'default', icon: <LogoutOutlined />, label: '登出' },
  // 角色/权限
  assign_permissions: { color: 'geekblue', icon: <CodeOutlined />, label: '分配权限' },
  assign_roles: { color: 'geekblue', icon: <CodeOutlined />, label: '分配角色' },
  reset_password: { color: 'volcano', icon: <KeyOutlined />, label: '重置密码' },
  create_asset: { color: 'purple', icon: <PlusCircleFilled />, label: '新增资产' },
  // 审核类
  approve_submission: { color: 'purple', icon: <CheckCircleFilled />, label: '审核通过' },
  reject_submission: { color: 'volcano', icon: <CloseCircleFilled />, label: '审核驳回' },
  approve_application: { color: 'purple', icon: <CheckCircleFilled />, label: '审核通过' },
  reject_application: { color: 'volcano', icon: <CloseCircleFilled />, label: '审核驳回' },
  start_hearing: { color: 'orange', icon: <PlayCircleFilled />, label: '开始审理' },
  archive_case: { color: 'default', icon: <FolderOutlined />, label: '归档' },
  accept_case: { color: 'blue', icon: <CheckCircleFilled />, label: '受理' },
  execute_award: { color: 'green', icon: <CheckCircleFilled />, label: '执行裁决' },
  approve_mint: { color: 'purple', icon: <CheckCircleFilled />, label: '审核铸造' },
  reject_mint: { color: 'volcano', icon: <CloseCircleFilled />, label: '驳回铸造' },
  batch_approve_mint: { color: 'purple', icon: <CheckCircleFilled />, label: '批量通过' },
  batch_reject_mint: { color: 'volcano', icon: <CloseCircleFilled />, label: '批量驳回' },
  // 赛事
  verify_participant: { color: 'blue', icon: <CheckCircleFilled />, label: '核验参与者' },
  verify_participants_batch: { color: 'blue', icon: <CheckCircleFilled />, label: '批量核验' },
  batch_verify_competitions: { color: 'blue', icon: <CheckCircleFilled />, label: '批量核验赛事' },
  create_result: { color: 'green', icon: <PlusCircleFilled />, label: '录入成绩' },
  create_results_batch: { color: 'green', icon: <PlusCircleFilled />, label: '批量录入成绩' },
  auto_rank: { color: 'purple', icon: <BarChartOutlined />, label: '自动排名' },
  // 拍卖
  create_session: { color: 'blue', icon: <PlusCircleFilled />, label: '新增场次' },
  update_session: { color: 'orange', icon: <EditOutlined />, label: '修改场次' },
  transition_session: { color: 'gold', icon: <EditOutlined />, label: '变更场次状态' },
  delete_session: { color: 'red', icon: <MinusCircleFilled />, label: '删除场次' },
  create_item: { color: 'blue', icon: <PlusCircleFilled />, label: '新增标的' },
  start_item: { color: 'green', icon: <PlayCircleFilled />, label: '开拍' },
  pass_item: { color: 'default', icon: <MinusCircleFilled />, label: '流拍' },
  create_bid: { color: 'blue', icon: <PlusCircleFilled />, label: '出价' },
  confirm_deal_payment: { color: 'green', icon: <CheckCircleFilled />, label: '确认付款' },
  confirm_deal_delivery: { color: 'green', icon: <CheckCircleFilled />, label: '确认发货' },
  cancel_deal: { color: 'red', icon: <CloseCircleFilled />, label: '取消成交' },
  submit_audit: { color: 'blue', icon: <CodeOutlined />, label: '提交审核' },
  // 基因/检测
  create_profile: { color: 'blue', icon: <PlusCircleFilled />, label: '新增档案' },
  update_profile: { color: 'orange', icon: <EditOutlined />, label: '修改档案' },
  regen_qrcode: { color: 'gold', icon: <SyncOutlined />, label: '重新生成二维码' },
  create_test: { color: 'blue', icon: <PlusCircleFilled />, label: '新增检测' },
  update_test: { color: 'orange', icon: <EditOutlined />, label: '修改检测' },
  create_org: { color: 'blue', icon: <PlusCircleFilled />, label: '新增机构' },
  update_org: { color: 'orange', icon: <EditOutlined />, label: '修改机构' },
  toggle_org_status: { color: 'gold', icon: <EditOutlined />, label: '修改机构状态' },
  create_order: { color: 'blue', icon: <PlusCircleFilled />, label: '创建预约' },
  update_order: { color: 'orange', icon: <EditOutlined />, label: '修改预约' },
  confirm_order: { color: 'green', icon: <CheckCircleFilled />, label: '确认预约' },
  schedule_order: { color: 'blue', icon: <CalendarOutlined />, label: '排期' },
  cancel_order: { color: 'red', icon: <CloseCircleFilled />, label: '取消预约' },
  create_report: { color: 'green', icon: <PlusCircleFilled />, label: '录入报告' },
  update_report: { color: 'orange', icon: <EditOutlined />, label: '修改报告' },
};

const OBJECT_TYPE_LABELS: Record<string, string> = {
  admin: '管理员',
  role: '角色',
  gene_profile: '基因档案',
  gene_test: '基因检测',
  nft_asset: 'NFT资产',
  competition: '赛事',
  competition_participant: '赛事参与者',
  loft: '公棚',
  loft_pigeon: '赛鸽',
  loft_application: '公棚申请',
  auction_session: '拍卖场次',
  auction_item: '拍卖标的',
  arbitration_case: '仲裁案件',
  arbitration_evidence: '仲裁证据',
  detection_org: '检测机构',
  detection_order: '检测预约',
  detection_report: '检测报告',
};

const MODULE_LABELS: Record<string, string> = {
  auth: '登录认证',
  admin: '管理员管理',
  role: '角色权限',
  user: '用户管理',
  content_news: '资讯管理',
  content_banner: '轮播管理',
  content_notice: '公告管理',
  content: '内容管理',
  detection: '检测预约',
  gene: '基因档案',
  nft: 'NFT 资产',
  competition: '赛事管理',
  loft: '公棚管理',
  auction: '拍卖管理',
  arbitration: '仲裁管理',
  system: '系统设置',
};

function formatJson(raw: string | null): string {
  if (!raw) return '-';
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function methodColor(method: string | null): string {
  switch (method) {
    case 'GET': return 'blue';
    case 'POST': return 'green';
    case 'PUT': return 'orange';
    case 'PATCH': return 'gold';
    case 'DELETE': return 'red';
    default: return 'default';
  }
}

// 操作类型 Tag 渲染
function ActionTag({ action }: { action: string | null }) {
  if (!action) return <Tag>未知</Tag>;
  const style = ACTION_STYLES[action] || { color: 'default' };
  const label = ACTION_STYLES[action]?.label ?? action.replace(/_/g, ' ');
  return (
    <Tag color={style.color} icon={style.icon} style={{ whiteSpace: 'nowrap' }}>
      {label}
    </Tag>
  );
}

// 结果状态 Tag
function ResultTag({ code }: { code: number | null }) {
  if (!code) return <Tag color="default">-</Tag>;
  if (code >= 200 && code < 400) {
    return (
      <Tag color="success" icon={<CheckCircleFilled />}>
        成功
      </Tag>
    );
  }
  if (code >= 400) {
    return (
      <Tag color="error" icon={<CloseCircleFilled />}>
        失败
      </Tag>
    );
  }
  return (
    <Tag color="warning" icon={<ExclamationCircleFilled />}>
      其他
    </Tag>
  );
}

// 解析 diff_json
function parseDiff(json: string | null): AuditDiffItem[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// ==================== 组件主体 ====================
const SystemAuditLog = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canView = hasPermission(currentUser, 'system:audit:view');
  const actionRef = useRef<ActionType>();
  const { tableLoading } = useTableRefresh(actionRef, { messageApi: message });

  // 下拉数据源
  const [modules, setModules] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);

  // 详情
  const [detail, setDetail] = useState<AuditLogItem | null>(null);

  // 统计 + 下拉 并行加载
  useEffect(() => {
    if (!canView) return;
    getAuditModules().then((d) => setModules(Array.isArray(d) ? d : []));
    getAuditActions().then((d) => setActions(Array.isArray(d) ? d : []));
    getAuditStats().then((d) => setStats(d ?? null)).catch(() => {});
  }, [canView]);

  const moduleValueEnum = useMemo(
    () =>
      (Array.isArray(modules) ? modules : []).reduce<Record<string, { text: string }>>((acc, m) => {
        acc[m] = { text: MODULE_LABELS[m] || m };
        return acc;
      }, {}),
    [modules],
  );

  const actionValueEnum = useMemo(
    () =>
      (Array.isArray(actions) ? actions : []).reduce<Record<string, { text: string }>>((acc, a) => {
        acc[a] = { text: a.replace(/_/g, ' ') };
        return acc;
      }, {}),
    [actions],
  );

  // ==================== 表格列 ====================
  const columns: ProColumns<AuditLogItem>[] = [
    { title: '序号', dataIndex: 'index', valueType: 'index', width: 60, hideInSearch: true },
    {
      title: '操作人',
      dataIndex: 'admin_username',
      width: 140,
      hideInSearch: true,
      render: (_, record) => {
        const name = record.admin_username || '未知';
        return (
          <Space>
            <Avatar
              size={32}
              style={{ backgroundColor: getAvatarColor(name), flexShrink: 0 }}
              icon={<UserOutlined />}
            >
              {name.charAt(0).toUpperCase()}
            </Avatar>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontWeight: 500 }}>{name}</div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                ID: {record.admin_user_id ?? '-'}
              </Text>
            </div>
          </Space>
        );
      },
    },
    {
      title: '业务摘要',
      dataIndex: 'summary',
      hideInSearch: true,
      ellipsis: true,
      render: (_, record) => {
        const summary = record.summary;
        if (summary) {
          return (
            <div style={{ maxWidth: 420 }}>
              <Text strong style={{ fontSize: 14 }}>
                {summary}
              </Text>
            </div>
          );
        }
        // 兜底：用技术字段拼一下
        const moduleLabel = MODULE_LABELS[record.module || ''] || record.module;
        return (
          <Text type="secondary" italic>
            （旧日志）{record.admin_username} 对 {moduleLabel || '-'} 执行了 {record.action || '-'}
          </Text>
        );
      },
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      width: 140,
      valueType: 'select',
      valueEnum: actionValueEnum,
      render: (_, record) => <ActionTag action={record.action} />,
    },
    {
      title: '业务模块',
      dataIndex: 'module',
      width: 120,
      valueType: 'select',
      valueEnum: moduleValueEnum,
      render: (_, record) => MODULE_LABELS[record.module || ''] || record.module || '-',
    },
    {
      title: '结果',
      dataIndex: 'status_code',
      width: 90,
      hideInSearch: true,
      render: (_, record) => <ResultTag code={record.status_code} />,
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 180,
      valueType: 'dateRange',
      hideInTable: false,
      render: (_, record) => (
        <div style={{ lineHeight: 1.2 }}>
          <div>{record.created_at ? dayjs(record.created_at).fromNow() : '-'}</div>
          <div style={{ fontSize: 11, color: '#999' }}>
            {record.created_at ? dayjs(record.created_at).format('MM-DD HH:mm:ss') : ''}
          </div>
        </div>
      ),
      search: {
        transform: (value) => {
          if (Array.isArray(value) && value.length === 2 && value[0] && value[1]) {
            return {
              startTime: dayjs(value[0]).startOf('day').valueOf(),
              endTime: dayjs(value[1]).endOf('day').valueOf(),
            };
          }
          return {};
        },
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setDetail(record)}>
          查看详情
        </Button>
      ),
    },
  ];

  // ==================== 渲染 ====================
  return (
    <>
      {/* 统计卡片区 */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}>
            <Card variant="borderless" style={{ background: 'linear-gradient(135deg,#e6f4ff,#bae0ff)' }}>
              <Statistic
                title="全部日志"
                value={stats.total}
                prefix={<HistoryOutlined style={{ color: '#1677ff' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card variant="borderless" style={{ background: 'linear-gradient(135deg,#f6ffed,#d9f7be)' }}>
              <Statistic
                title="今日新增"
                value={stats.todayCount}
                prefix={<PlusCircleFilled style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card variant="borderless" style={{ background: 'linear-gradient(135deg,#fff1f0,#ffccc7)' }}>
              <Statistic
                title="失败次数"
                value={stats.failCount}
                prefix={<CloseCircleFilled style={{ color: '#ff4d4f' }} />}
                valueStyle={{ color: stats.failCount > 0 ? '#ff4d4f' : undefined }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card variant="borderless" style={{ background: 'linear-gradient(135deg,#f9f0ff,#d3adf7)' }}>
              <Statistic
                title="涉及模块"
                value={stats.distinctModules}
                prefix={<CodeOutlined style={{ color: '#722ed1' }} />}
              />
            </Card>
          </Col>
        </Row>
      )}

      <ProTable<AuditLogItem>
        headerTitle={
          <Space>
            <span>操作日志</span>
            <Text type="secondary" style={{ fontSize: 12 }}>
              · 业务视角 · 一眼看懂谁对谁做了什么
            </Text>
          </Space>
        }
        actionRef={actionRef}
        loading={tableLoading}
        rowKey="id"
        columns={columns}
        options={{ density: false, reload: false, setting: false }}
        scroll={{ x: 1100 }}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        request={async (params) => {
          try {
            const res = await getAuditLogs({
              page: params.current,
              pageSize: params.pageSize,
              operator: params.operator as string | undefined,
              module: params.module as string | undefined,
              action: params.action as string | undefined,
              startTime: params.startTime as number | undefined,
              endTime: params.endTime as number | undefined,
            });
            return { data: res?.list ?? [], success: true, total: res?.total ?? 0 };
          } catch {
            return { data: [], success: false, total: 0 };
          }
        }}
        toolBarRender={() => [
          <RefreshButton key="refresh" actionRef={actionRef as any} />,
        ]}
        pagination={{
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          defaultPageSize: 10,
        }}
      />

      {/* ==================== 详情抽屉 ==================== */}
      <Drawer
        title={
          <Space>
            <span>📋 操作详情</span>
            {detail?.summary && (
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
                {detail.summary.length > 30 ? detail.summary.slice(0, 30) + '...' : detail.summary}
              </Text>
            )}
          </Space>
        }
        open={!!detail}
        onClose={() => setDetail(null)}
        width={900}
      >
        {detail && (
          <Tabs
            defaultActiveKey="basic"
            items={[
              {
                key: 'basic',
                label: '📋 操作详情',
                children: <DetailBasicTab item={detail} />,
              },
              {
                key: 'diff',
                label: '🔄 变更对比',
                children: <DetailDiffTab item={detail} />,
              },
              {
                key: 'tech',
                label: '⚙️ 技术信息',
                children: <DetailTechTab item={detail} />,
              },
            ]}
          />
        )}
      </Drawer>
    </>
  );
};

// ==================== 子组件 ====================

function DetailBasicTab({ item }: { item: AuditLogItem }) {
  const moduleLabel = MODULE_LABELS[item.module || ''] || item.module || '-';
  const createdAt = item.created_at ? dayjs(item.created_at).format('YYYY-MM-DD HH:mm:ss') : '-';
  return (
    <Descriptions column={2} size="small" bordered>
      <Descriptions.Item label="操作人">
        <Space>
          <Avatar
            size={28}
            style={{ backgroundColor: getAvatarColor(item.admin_username || '?') }}
          >
            {(item.admin_username || '?').charAt(0).toUpperCase()}
          </Avatar>
          <span>
            <strong>{item.admin_username || '-'}</strong>
            <Text type="secondary" style={{ marginLeft: 6 }}>
              ID: {item.admin_user_id ?? '-'}
            </Text>
          </span>
        </Space>
      </Descriptions.Item>
      <Descriptions.Item label="操作时间">{createdAt}</Descriptions.Item>

      <Descriptions.Item label="业务摘要" span={2}>
        <Text strong style={{ fontSize: 15 }}>
          {item.summary || '— 旧日志无摘要 —'}
        </Text>
      </Descriptions.Item>

      <Descriptions.Item label="操作类型">
        <ActionTag action={item.action} />
      </Descriptions.Item>
      <Descriptions.Item label="业务模块">{moduleLabel}</Descriptions.Item>

      <Descriptions.Item label="操作对象">
        {item.target_type || item.target_id != null ? (
          <Space size={6}>
            {item.target_type && (
              <Tag color="blue">
                {OBJECT_TYPE_LABELS[item.target_type] || item.target_type}
              </Tag>
            )}
            {item.target_name && (
              <Text strong>{item.target_name}</Text>
            )}
            {item.target_id != null && (
              <Text type="secondary">#{item.target_id}</Text>
            )}
          </Space>
        ) : (
          <Text type="secondary">-</Text>
        )}
      </Descriptions.Item>
      <Descriptions.Item label="结果状态">
        <ResultTag code={item.status_code} />
      </Descriptions.Item>

      <Descriptions.Item label="IP 地址">
        <Text copyable style={{ fontFamily: 'monospace' }}>
          {item.ip || '-'}
        </Text>
      </Descriptions.Item>
      <Descriptions.Item label="耗时">
        {item.duration_ms != null ? `${item.duration_ms}ms` : '-'}
      </Descriptions.Item>
    </Descriptions>
  );
}

function DetailDiffTab({ item }: { item: AuditLogItem }) {
  const diffs = parseDiff(item.diff_json);
  if (diffs.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
        <HistoryOutlined style={{ fontSize: 40, marginBottom: 12 }} />
        <div>此操作无变更对比信息</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>
          （新增/登录类操作，或旧格式日志）
        </div>
      </div>
    );
  }
  return (
    <div>
      <Alert
        type="info"
        showIcon
        message={`共 ${diffs.length} 个字段发生变更`}
        style={{ marginBottom: 16 }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {diffs.map((d, idx) => (
          <Card
            key={idx}
            size="small"
            variant="borderless"
            style={{
              borderLeft: '3px solid #faad14',
              background: '#fffbe6',
            }}
          >
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text strong>
                <EditOutlined style={{ marginRight: 6, color: '#faad14' }} />
                {d.label}
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 11 }}>
                  ({d.field})
                </Text>
              </Text>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 40px 1fr',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    background: '#fff2f0',
                    border: '1px solid #ffccc7',
                    borderRadius: 6,
                    padding: '8px 12px',
                    fontFamily: 'monospace',
                    fontSize: 13,
                    wordBreak: 'break-all',
                  }}
                >
                  {formatDiffValue(d.from)}
                </div>
                <div style={{ textAlign: 'center', color: '#1677ff', fontSize: 20 }}>
                  →
                </div>
                <div
                  style={{
                    background: '#f6ffed',
                    border: '1px solid #b7eb8f',
                    borderRadius: 6,
                    padding: '8px 12px',
                    fontFamily: 'monospace',
                    fontSize: 13,
                    wordBreak: 'break-all',
                  }}
                >
                  {formatDiffValue(d.to)}
                </div>
              </div>
            </Space>
          </Card>
        ))}
      </div>
    </div>
  );
}

function formatDiffValue(v: unknown): string {
  if (v === null || v === undefined) return '— 空 —';
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

function DetailTechTab({ item }: { item: AuditLogItem }) {
  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Descriptions column={2} size="small" bordered>
        <Descriptions.Item label="HTTP 方法">
          <Tag color={methodColor(item.method)}>{item.method || '-'}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="状态码">
          <Tag
            color={
              (item.status_code ?? 0) >= 200 && (item.status_code ?? 0) < 300
                ? 'green'
                : (item.status_code ?? 0) >= 400
                  ? 'red'
                  : 'orange'
            }
          >
            {item.status_code ?? '-'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="请求 URL" span={2}>
          <Text copyable style={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>
            {item.path || '-'}
          </Text>
        </Descriptions.Item>
        <Descriptions.Item label="User-Agent" span={2}>
          <Text type="secondary" style={{ wordBreak: 'break-all', fontSize: 12 }}>
            {item.user_agent || '-'}
          </Text>
        </Descriptions.Item>
      </Descriptions>

      <JsonBlock title="查询参数 (params)" raw={item.params} />
      <JsonBlock title="请求体 (request_body)" raw={item.request_body} />
      <JsonBlock title="响应体 (response_body)" raw={item.response_body} />
    </Space>
  );
}

function JsonBlock({ title, raw }: { title: string; raw: string | null }) {
  return (
    <div>
      <Text strong>{title}</Text>
      <Paragraph style={{ marginBottom: 0, marginTop: 4 }}>
        <pre
          style={{
            background: '#f5f5f5',
            padding: 12,
            borderRadius: 6,
            maxHeight: 260,
            overflow: 'auto',
            fontSize: 12,
            fontFamily: 'monospace',
          }}
        >
          {formatJson(raw)}
        </pre>
      </Paragraph>
    </div>
  );
}

// ==================== 工具函数 ====================
function getAvatarColor(name: string): string {
  const colors = ['#1677ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default SystemAuditLog;
