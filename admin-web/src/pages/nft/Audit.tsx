import {
  ModalForm,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  App,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Image,
  Popconfirm,
  Progress,
  Row,
  Space,
  Spin,
  Statistic,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import RefreshButton from '../../components/RefreshButton';
import { useTableRefresh } from '../../hooks/useTableRefresh';
import {
  approveNftAudit,
  batchApproveNftAudit,
  batchRejectNftAudit,
  getNftAuditList,
  getNftAuditStats,
  getNftTasks,
  rejectNftAudit,
  resubmitNftAudit,
  retryNftTask,
  type NftAsset,
  type NftAuditStats,
  type NftMintTask,
} from '../../services/nft';
import {
  parseMetadata,
  renderMetadataInfoSection,
  intelligentValueRenderer,
} from '../../utils/nft-metadata-render';

const PLUS_ICON_SVG =
  'data:image/svg+xml;base64,' +
  btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" rx="12" fill="#f5f5f5" stroke="#d9d9d9" stroke-width="1" stroke-dasharray="4 3"/><path d="M60 38V82M38 60H82" stroke="#bfbfbf" stroke-width="3" stroke-linecap="round"/></svg>`
  );

type TabKey = 'pending' | 'minting' | 'completed' | 'rejected';

const ASSET_STATUS_OPTIONS = [
  { label: '待审核', value: 'pending' },
  { label: '审核通过', value: 'approved' },
  { label: '上链中', value: 'minting' },
  { label: '已上链', value: 'minted' },
  { label: '上链失败', value: 'failed' },
  { label: '草稿', value: 'draft' },
  { label: '已驳回', value: 'rejected' },
];

const ASSET_STATUS_COLOR: Record<string, string> = {
  draft: 'default',
  pending: 'processing',
  approved: 'blue',
  minting: 'gold',
  minted: 'success',
  failed: 'error',
  rejected: 'error',
};
const ASSET_STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  pending: '待审核',
  approved: '审核通过',
  minting: '上链中',
  minted: '已上链',
  failed: '上链失败',
  rejected: '已驳回',
};

interface TaskStatusMeta {
  label: string;
  icon: string;
  color: string;
}
const TASK_STATUS_META: Record<string, TaskStatusMeta> = {
  pending: { label: '待执行', icon: '⏳', color: 'gold' },
  executing: { label: '执行中', icon: '🔵', color: 'blue' },
  confirming: { label: '区块确认中', icon: '🔄', color: 'purple' },
  completed: { label: '已完成', icon: '✅', color: 'green' },
  failed: { label: '失败', icon: '❌', color: 'red' },
  retry_scheduled: { label: '等待重试', icon: '⏸️', color: 'orange' },
};

const NftAudit = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canAudit = hasPermission(currentUser, 'nft:audit');

  const [activeTab, setActiveTab] = useState<TabKey>('pending');

  const [pendingCount, setPendingCount] = useState(0);
  const [mintingCount, setMintingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);

  const assetActionRef = useRef<ActionType>();
  const taskActionRef = useRef<ActionType>();
  const { tableLoading, handleRefresh } = useTableRefresh(assetActionRef, { messageApi: message });
  const { handleRefresh: handleTaskRefresh } = useTableRefresh(taskActionRef, { messageApi: message, showToast: false });

  const safeReloadTask = useCallback(async () => {
    for (let i = 0; i < 3; i++) {
      if (taskActionRef.current) {
        try {
          await taskActionRef.current.reload();
        } catch {
          /* silent */
        }
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }, []);

  const [stats, setStats] = useState<NftAuditStats>({
    today_approved: 0,
    today_mint_success: 0,
    today_mint_failed: 0,
    avg_duration_sec: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const lastCompletedCountRef = useRef<number>(0);
  void lastCompletedCountRef;

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<NftAsset | null>(null);

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [batchRejectOpen, setBatchRejectOpen] = useState(false);

  async function refreshStats(_force = false) {
    setStatsLoading(true);
    try {
      const r = await getNftAuditStats();
      if (r) {
        setStats(r);
      }
    } catch {
      // 拦截器已提示
    } finally {
      setStatsLoading(false);
    }
  }

  const refreshBadgeCounts = async () => {
    const reqs: Array<Promise<unknown>> = [
      getNftAuditList({ page: 1, pageSize: 1, status: 'pending' }),
      getNftAuditList({ page: 1, pageSize: 1, status: 'rejected' }),
      getNftTasks({ page: 1, pageSize: 1, status: 'pending,executing,confirming' }),
      getNftTasks({ page: 1, pageSize: 1, status: 'completed,failed' }),
    ];
    const statusKeys = ['pending', 'rejected', 'minting', 'completed'] as const;
    const setters = [setPendingCount, setRejectedCount, setMintingCount, setCompletedCount];
    const results = await Promise.allSettled(reqs);
    results.forEach((r, i) => {
      const key = statusKeys[i];
      if (r.status === 'fulfilled') {
        const page = r.value as { total?: number | null } | null;
        setters[i](page?.total ?? 0);
      } else {
        console.warn(`refreshBadgeCounts: ${key} failed`, r.reason);
      }
    });
  };

  async function afterAuditAction(
    opts: { reloadAssetTable?: boolean; reloadTaskTable?: boolean } = {
      reloadAssetTable: true,
      reloadTaskTable: true,
    }
  ) {
    await Promise.all([refreshBadgeCounts(), refreshStats(true)]);
    if (opts.reloadAssetTable) handleRefresh();
    if (opts.reloadTaskTable) handleTaskRefresh();
  }

  useEffect(() => {
    refreshStats(true);
    refreshBadgeCounts();
  }, []);

  useEffect(() => {
    if (activeTab !== 'minting') return;
    const timerId = setInterval(() => { safeReloadTask(); }, 2000);
    return () => clearInterval(timerId);
  }, [activeTab, safeReloadTask]);

  useEffect(() => {
    if (activeTab !== 'minting' && activeTab !== 'completed') return;
    const id = setInterval(() => refreshStats(false), 20000);
    return () => clearInterval(id);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'minting' && activeTab !== 'completed') return;
    const id = setInterval(() => {
      void refreshBadgeCounts();
    }, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'completed') return;
    const id = setInterval(() => { safeReloadTask(); }, 5000);
    return () => clearInterval(id);
  }, [activeTab, safeReloadTask]);

  const handleApprove = async (record: NftAsset) => {
    try {
      const { task_id } = await approveNftAudit(record.id);
      message.success(`审核通过，已创建上链任务 T${task_id}`);
      await afterAuditAction();
      setActiveTab('minting');
    } catch {
      // 拦截器已提示
    }
  };

  const openReject = (record: NftAsset) => {
    setRejectingId(record.id);
    setRejectModalOpen(true);
  };

  const handleReject = async (values: Record<string, unknown>) => {
    if (rejectingId === null) return false;
    try {
      await rejectNftAudit(rejectingId, values.audit_remark as string);
      message.success('已驳回');
      setRejectModalOpen(false);
      await afterAuditAction();
      return true;
    } catch {
      return false;
    }
  };

  const handleResubmit = async (record: NftAsset) => {
    try {
      await resubmitNftAudit(record.id);
      message.success('已重新提交，该资产已回到待审核资产队列');
      await afterAuditAction();
      setSelectedRowKeys([]);
    } catch {
      // 拦截器已提示
    }
  };

  const handleRetry = async (record: NftMintTask) => {
    const msgKey = 'retry_' + record.id;
    try {
      message.loading({ content: '正在重新加入执行队列...', key: msgKey, duration: 0 });
      await retryNftTask(record.id);
      message.success({
        content: '已重新触发上链任务，进度将在下一次轮询（≤2 秒）显示',
        key: msgKey,
        duration: 2,
      });
      await afterAuditAction({ reloadAssetTable: false, reloadTaskTable: true });
      if (activeTab === 'completed' && record.status === 'failed') {
        setActiveTab('minting');
      }
    } catch {
      message.destroy(msgKey);
    }
  };

  const onBatchApprove = async () => {
    const ids = selectedRowKeys.map(Number);
    if (!ids.length) return;
    try {
      const r = await batchApproveNftAudit(ids);
      message.success(`批量通过完成：成功 ${r.success} / 共 ${r.total}${r.failed > 0 ? `，失败 ${r.failed}` : ''}`);
      setSelectedRowKeys([]);
      await afterAuditAction();
    } catch {
      // 拦截器已提示
    }
  };

  const handleBatchRejectFinish = async (values: Record<string, unknown>) => {
    if (!selectedRowKeys.length) return false;
    try {
      const r = await batchRejectNftAudit(
        selectedRowKeys.map(Number),
        String(values.reject_reason || '')
      );
      message.success(`批量驳回完成：成功 ${r.success} / 共 ${r.total}${r.failed > 0 ? `，失败 ${r.failed}` : ''}`);
      setBatchRejectOpen(false);
      setSelectedRowKeys([]);
      await afterAuditAction();
      return true;
    } catch {
      return false;
    }
  };

  const handleBatchResubmit = async () => {
    const ids = selectedRowKeys.map(Number);
    if (!ids.length) return;
    let success = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await resubmitNftAudit(id);
        success++;
      } catch {
        failed++;
      }
    }
    message.success(`批量复审完成：成功 ${success} / 共 ${ids.length}${failed > 0 ? `，失败 ${failed}` : ''}`);
    setSelectedRowKeys([]);
    await afterAuditAction();
  };

  const buildDefaultColumns = (): ProColumns<NftAsset>[] => [
    { title: '资产名称', dataIndex: 'name', width: 200, ellipsis: true },
    {
      title: '关联基因档案',
      dataIndex: 'gene_profile_id',
      width: 180,
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => {
        const g = record.gene_profile;
        if (!g) return <Tag>未关联</Tag>;
        return (
          <Space size={4}>
            <span>{g.ring_number}</span>
            <span style={{ color: '#888' }}>{g.name}</span>
          </Space>
        );
      },
    },
    { title: '鸽主', dataIndex: 'owner_name', width: 110, ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      valueType: 'select',
      valueEnum: ASSET_STATUS_OPTIONS.reduce(
        (acc, cur) => ({ ...acc, [cur.value]: { text: cur.label } }),
        {} as Record<string, { text: string }>
      ),
      render: (_, record) => (
        <Tag color={ASSET_STATUS_COLOR[record.status] ?? 'default'}>
          {ASSET_STATUS_LABEL[record.status] ?? record.status}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 160,
      hideInSearch: true,
      render: (_, record) =>
        record.created_at ? dayjs(record.created_at).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 260,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => {
        if (activeTab === 'pending') {
          return (
            <Space>
              {canAudit && (
                <Button
                  type="link"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => {
                    setPreviewAsset(record);
                    setPreviewOpen(true);
                  }}
                >
                  预览
                </Button>
              )}
              {canAudit && (
                <Popconfirm
                  title="确认审核通过?将进入上链队列异步铸造。"
                  onConfirm={() => handleApprove(record)}
                >
                  <Button type="link" size="small" icon={<CheckOutlined />}>
                    通过
                  </Button>
                </Popconfirm>
              )}
              {canAudit && (
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => openReject(record)}
                >
                  驳回
                </Button>
              )}
            </Space>
          );
        }
        return <span style={{ color: '#999' }}>-</span>;
      },
    },
  ];

  const buildRejectedColumns = (): ProColumns<NftAsset>[] => [
    { title: '资产名称', dataIndex: 'name', width: 200, ellipsis: true },
    {
      title: '关联基因档案',
      dataIndex: 'gene_profile_id',
      width: 180,
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => {
        const g = record.gene_profile;
        if (!g) return <Tag>未关联</Tag>;
        return (
          <Space size={4}>
            <span>{g.ring_number}</span>
            <span style={{ color: '#888' }}>{g.name}</span>
          </Space>
        );
      },
    },
    { title: '鸽主', dataIndex: 'owner_name', width: 110, ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      valueType: 'select',
      valueEnum: ASSET_STATUS_OPTIONS.reduce(
        (acc, cur) => ({ ...acc, [cur.value]: { text: cur.label } }),
        {} as Record<string, { text: string }>
      ),
      render: (_, record) => (
        <Tag color={ASSET_STATUS_COLOR[record.status] ?? 'default'}>
          {ASSET_STATUS_LABEL[record.status] ?? record.status}
        </Tag>
      ),
    },
    {
      title: '驳回时间',
      dataIndex: 'rejected_at',
      width: 170,
      hideInSearch: true,
      sorter: (a, b) => (a.rejected_at ?? 0) - (b.rejected_at ?? 0),
      render: (_, record) =>
        record.rejected_at ? dayjs(record.rejected_at).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '驳回理由',
      dataIndex: 'audit_remark',
      width: 220,
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => (
        <Tooltip title={record.audit_remark || '-'}>
          <span style={{ color: record.audit_remark ? '#595959' : '#bfbfbf' }}>
            {record.audit_remark || '-'}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 260,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space>
          {canAudit && (
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setPreviewAsset(record);
                setPreviewOpen(true);
              }}
            >
              预览
            </Button>
          )}
          {canAudit && (
            <Popconfirm
              title="将重新提交至待审核资产队列，原驳回记录将保留但不再显示该资产在驳回列表中，是否继续？"
              onConfirm={() => handleResubmit(record)}
            >
              <Button type="link" size="small" icon={<ReloadOutlined />}>
                重新提交审核
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // ==================== 资产审核列（pending & rejected） ====================
  const assetColumns = useMemo<ProColumns<NftAsset>[]>(
    () => (activeTab === 'rejected' ? buildRejectedColumns() : buildDefaultColumns()),
    [activeTab, currentUser, canAudit, previewOpen]
  );

  // ==================== 上链任务列（minting & completed） ====================
  const taskColumns: ProColumns<NftMintTask>[] = [
    { title: '任务 ID', dataIndex: 'id', width: 80, hideInSearch: true },
    {
      title: '资产名称',
      dataIndex: 'asset_name',
      width: 180,
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => record.asset_name || '-',
    },
    {
      title: 'Token ID',
      dataIndex: 'token_id',
      width: 160,
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => record.token_id || '-',
    },
    { title: '鸽主', dataIndex: 'owner_name', width: 110, ellipsis: true, hideInSearch: true, render: (_, r) => r.owner_name || '-' },
    {
      title: '任务状态与进度',
      dataIndex: 'status',
      width: 260,
      hideInSearch: true,
      render: (_, record) => {
        const meta = TASK_STATUS_META[record.status] ?? {
          label: record.status,
          icon: '⚪',
          color: 'default',
        };
        const percent = Math.round(
          (record.block_current / Math.max(1, record.block_target ?? 12)) * 100
        );
        const confirmingExtra =
          record.status === 'confirming'
            ? ` (${record.block_current ?? 0}/${record.block_target ?? 12})`
            : '';
        let progressStatus: 'normal' | 'exception' | 'success' | 'active' = 'active';
        if (record.status === 'failed') progressStatus = 'exception';
        else if (record.status === 'completed') progressStatus = 'success';
        else if (record.status === 'pending') progressStatus = 'normal';

        return (
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Space>
              <span>{meta.icon}</span>
              <Tag color={meta.color}>{meta.label}{confirmingExtra}</Tag>
            </Space>
            <Progress percent={percent} size="small" status={progressStatus} />
          </Space>
        );
      },
    },
    {
      title: '重试次数',
      dataIndex: 'retry_count',
      width: 110,
      hideInSearch: true,
      render: (_, record) => {
        const count = record.retry_count ?? 0;
        let color: string | undefined;
        let tooltipText: string;
        if (count === 0) {
          color = '#8c8c8c';
          tooltipText = 'Gas 不足 / 网络拥堵将自动重试，最多 3 次，达到上限后可人工重试。第 1/2 次自动重试等待 30 秒。';
        } else if (count < 3) {
          color = '#FA8C16';
          tooltipText = `已自动重试第 ${count} 次，仍有 ${3 - count} 次自动重试机会。`;
        } else {
          color = record.status === 'failed' ? '#FF4D4F' : '#FA8C16';
          tooltipText = '已达自动重试上限，请点击右侧「🔁 重试」按钮人工干预。';
        }
        return (
          <Space size={4}>
            <span style={{ color }}>
              {count} / 3
            </span>
            <Tooltip title={tooltipText}>
              <QuestionCircleOutlined style={{ color: '#8c8c8c' }} />
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: '失败原因',
      dataIndex: 'error_msg',
      width: 220,
      hideInSearch: true,
      render: (_, record) => {
        if (!record.error_msg) return '-';
        const msg = record.error_msg;
        let categoryTag: React.ReactNode;
        if (msg.includes('Gas 不足') || msg.includes('Gas不足')) {
          categoryTag = <Tag color="orange">Gas</Tag>;
        } else if (msg.includes('网络拥堵') || msg.includes('网络')) {
          categoryTag = <Tag color="blue">网络</Tag>;
        } else if (msg.includes('合约异常') || msg.includes('合约')) {
          categoryTag = <Tag color="red">合约</Tag>;
        } else {
          categoryTag = <Tag color="default">错误</Tag>;
        }
        return (
          <Tooltip title={msg}>
            <Space size={4} style={{ width: '100%' }}>
              {categoryTag}
              <Typography.Paragraph
                ellipsis={{ rows: 1, expandable: false }}
                style={{ marginBottom: 0, flex: 1 }}
              >
                {msg}
              </Typography.Paragraph>
            </Space>
          </Tooltip>
        );
      },
    },
    {
      title: '交易哈希',
      dataIndex: 'tx_hash',
      width: 200,
      hideInSearch: true,
      render: (_, record) => (
        <Typography.Paragraph
          copyable
          style={{ marginBottom: 0 }}
          ellipsis={{ rows: 1, expandable: false }}
        >
          {record.tx_hash || '-'}
        </Typography.Paragraph>
      ),
    },
    {
      title: '合约地址',
      dataIndex: 'contract_address',
      width: 200,
      hideInSearch: true,
      render: (_, record) => (
        <Typography.Paragraph
          copyable
          style={{ marginBottom: 0 }}
          ellipsis={{ rows: 1, expandable: false }}
        >
          {record.contract_address || '-'}
        </Typography.Paragraph>
      ),
    },
    {
      title: '完成时间',
      dataIndex: 'finished_at',
      width: 170,
      hideInSearch: true,
      render: (_, record) =>
        record.finished_at ? dayjs(record.finished_at).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => {
        if (canAudit && record.status === 'failed') {
          return (
            <Popconfirm
              title={
                <Space direction="vertical" size={4}>
                  <div>确认重新触发这条失败的上链任务？</div>
                  <div style={{ color: '#888' }}>
                    当前失败原因：<Typography.Text code>{record.error_msg || '未知'}</Typography.Text>
                    <br />
                    本次将作为第 <Typography.Text strong>{(record.retry_count | 0) + 1}</Typography.Text> 次重试。
                  </div>
                </Space>
              }
              onConfirm={() => handleRetry(record)}
            >
              <Button type="link" size="small" icon={<ReloadOutlined />}>
                重试
              </Button>
            </Popconfirm>
          );
        }
        if (record.status === 'completed') {
          return (
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => message.info(`交易哈希：${record.tx_hash}`)}
            >
              查看链上记录
            </Button>
          );
        }
        return <span style={{ color: '#999' }}>-</span>;
      },
    },
  ];

  const tabItems = [
    {
      key: 'pending',
      label: (
        <Badge count={pendingCount} showZero offset={[6, 0]}>
          <span>待审核资产</span>
        </Badge>
      ),
    },
    {
      key: 'minting',
      label: (
        <Badge count={mintingCount} color="blue" offset={[6, 0]}>
          <span>上链中</span>
        </Badge>
      ),
    },
    {
      key: 'completed',
      label: (
        <Badge count={completedCount} color="green" offset={[6, 0]}>
          <span>已完成</span>
        </Badge>
      ),
    },
    {
      key: 'rejected',
      label: (
        <Badge count={rejectedCount} color="volcano" offset={[6, 0]}>
          <span>已驳回</span>
        </Badge>
      ),
    },
  ];

  const renderAssetTable = () => (
    <ProTable<NftAsset>
      key={`asset-${activeTab}`}
      headerTitle={activeTab === 'pending' ? '待审核资产' : '已驳回资产'}
      actionRef={assetActionRef}
      loading={tableLoading}
      rowKey="id"
      columns={assetColumns}
      options={{ density: false, reload: false }}
      scroll={{ x: 1200 }}
      search={{ labelWidth: 'auto' }}
      rowSelection={
        activeTab === 'pending'
          ? {
              selectedRowKeys,
              onChange: (nextKeys) => setSelectedRowKeys(nextKeys),
              preserveSelectedRowKeys: true,
              getCheckboxProps: (r: NftAsset) => ({ disabled: r.status !== 'pending' }),
            }
          : activeTab === 'rejected'
          ? {
              selectedRowKeys,
              onChange: (nextKeys) => setSelectedRowKeys(nextKeys),
              preserveSelectedRowKeys: true,
              getCheckboxProps: (r: NftAsset) => ({ disabled: r.status !== 'rejected' }),
            }
          : undefined
      }
      toolBarRender={() =>
        activeTab === 'pending'
          ? [
              <Popconfirm
                key="batch-approve"
                title={`将对选中的 ${selectedRowKeys.length} 条资产审核通过并自动创建上链任务，是否继续？`}
                disabled={!selectedRowKeys.length}
                onConfirm={onBatchApprove}
              >
                <Button type="primary" icon={<CheckOutlined />} disabled={!selectedRowKeys.length}>
                  批量通过 ({selectedRowKeys.length})
                </Button>
              </Popconfirm>,
              <Button
                key="batch-reject"
                danger
                icon={<CloseOutlined />}
                disabled={!selectedRowKeys.length}
                onClick={() => setBatchRejectOpen(true)}
              >
                批量驳回 ({selectedRowKeys.length})
              </Button>,
              <RefreshButton key="refresh" actionRef={assetActionRef as any} />,
            ]
          : activeTab === 'rejected'
          ? [
              <Popconfirm
                key="batch-resubmit"
                title={`将对选中的 ${selectedRowKeys.length} 条已驳回资产重新提交至待审核资产队列，原驳回记录将保留但不再显示在驳回列表中，是否继续？`}
                disabled={!selectedRowKeys.length}
                onConfirm={handleBatchResubmit}
              >
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  disabled={!selectedRowKeys.length}
                >
                  一键复审 ({selectedRowKeys.length})
                </Button>
              </Popconfirm>,
              <RefreshButton key="refresh" actionRef={assetActionRef as any} />,
            ]
          : [
              <RefreshButton key="refresh" actionRef={assetActionRef as any} />,
            ]
      }
      request={async (params) => {
        const { current, pageSize, name, status, owner_name } = params;
        try {
          const res = await getNftAuditList({
            page: current,
            pageSize,
            name: name as string | undefined,
            status: (status as string | undefined) ?? activeTab,
            owner_name: owner_name as string | undefined,
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
  );

  const renderTaskTable = () => (
    <ProTable<NftMintTask>
      key={`task-${activeTab}`}
      headerTitle={activeTab === 'minting' ? '上链中任务' : '已完成/失败任务'}
      actionRef={taskActionRef}
      rowKey="id"
      columns={taskColumns}
      options={{ density: false, reload: false }}
      scroll={{ x: 1800 }}
      search={{ labelWidth: 'auto' }}
      request={async (params) => {
        const { current, pageSize, status, nft_asset_id } = params;
        const taskStatus =
          activeTab === 'minting' ? 'pending,executing,confirming' : 'completed,failed';
        try {
          const res = await getNftTasks({
            page: current,
            pageSize,
            status: (status as string | undefined) ?? taskStatus,
            nft_asset_id: nft_asset_id ? Number(nft_asset_id) : undefined,
          });
          return { data: res?.list ?? [], success: true, total: res?.total ?? 0 };
        } catch {
          return { data: [], success: false, total: 0 };
        }
      }}
      toolBarRender={() => [
        <RefreshButton key="refresh" actionRef={taskActionRef as any} />,
      ]}
      pagination={{
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          defaultPageSize: 10,
        }}
    />
  );

  return (
    <>
      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as TabKey)}
        items={tabItems}
      />

      {(activeTab === 'pending' || activeTab === 'rejected') && renderAssetTable()}
      {(activeTab === 'minting' || activeTab === 'completed') && renderTaskTable()}

      <Row gutter={[16, 16]} style={{ marginTop: 24 }} wrap>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" styles={{ body: { padding: '20px 24px' } }}>
            <Spin spinning={statsLoading}>
              <div>
                <Statistic
                  title="今日审核通过"
                  value={stats.today_approved}
                  valueStyle={{ color: '#3B82F6' }}
                />
              </div>
            </Spin>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" styles={{ body: { padding: '20px 24px' } }}>
            <Spin spinning={statsLoading}>
              <div>
                <Statistic
                  title="今日上链成功"
                  value={stats.today_mint_success}
                  valueStyle={{ color: '#10B981' }}
                />
              </div>
            </Spin>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" styles={{ body: { padding: '20px 24px' } }}>
            <Spin spinning={statsLoading}>
              <div>
                <Statistic
                  title="今日上链失败"
                  value={stats.today_mint_failed}
                  valueStyle={{ color: '#EF4444' }}
                />
              </div>
            </Spin>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card variant="borderless" styles={{ body: { padding: '20px 24px' } }}>
            <Spin spinning={statsLoading}>
              <div>
                <Statistic
                  title="平均耗时"
                  value={stats.avg_duration_sec}
                  formatter={(value) => {
                    const sec = Number(value) || 0;
                    if (sec === 0) return '-';
                    return `${Math.floor(sec / 60)}分 ${sec % 60}秒`;
                  }}
                  valueStyle={{ color: '#6B7280' }}
                />
              </div>
            </Spin>
          </Card>
        </Col>
      </Row>

      <ModalForm
        title="驳回审核"
        open={rejectModalOpen}
        onOpenChange={setRejectModalOpen}
        onFinish={handleReject}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
      >
        <ProFormTextArea
          name="audit_remark"
          label="驳回理由"
          placeholder="请输入驳回理由"
          rules={[{ required: true, message: '请输入驳回理由' }]}
          fieldProps={{ autoSize: { minRows: 3, maxRows: 6 } }}
        />
      </ModalForm>

      <ModalForm
        title="批量驳回"
        open={batchRejectOpen}
        onOpenChange={setBatchRejectOpen}
        onFinish={handleBatchRejectFinish}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
      >
        <ProFormTextArea
          name="reject_reason"
          label="驳回理由"
          rules={[{ required: true, min: 3, message: '请至少输入 3 个字符的驳回理由' }]}
          fieldProps={{
            autoSize: { minRows: 3, maxRows: 6 },
            placeholder: '请输入驳回理由，将统一写入所选资产的审核备注',
          }}
        />
      </ModalForm>

      <Drawer
        title="NFT 审核预览"
        width={760}
        placement="right"
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        destroyOnHidden
        maskClosable={false}
        extra={
          <Button onClick={() => setPreviewOpen(false)}>关闭</Button>
        }
        footer={
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={() => setPreviewOpen(false)}>取消</Button>
            {canAudit && previewAsset?.status === 'pending' && (
              <Popconfirm
                title="确认审核通过该资产并自动创建上链任务？"
                onConfirm={async () => {
                  if (!previewAsset) return;
                  try {
                    const { task_id } = await approveNftAudit(previewAsset.id);
                    message.success(`审核通过，已创建上链任务 T${task_id}`);
                    setPreviewOpen(false);
                    await afterAuditAction();
                    setActiveTab('minting');
                  } catch {
                    // 拦截器已提示
                  }
                }}
              >
                <Button type="primary">审核通过</Button>
              </Popconfirm>
            )}
          </Space>
        }
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card
            variant="outlined"
            title={<span style={{ fontSize: 14, fontWeight: 600 }}>🕊️ NFT 预览卡片</span>}
            styles={{ body: { padding: 16 } }}
          >
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 220,
                  height: 220,
                  flexShrink: 0,
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: '#f5f5f5',
                  border: '1px solid #f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {previewAsset?.image_url ? (
                  <Image
                    src={previewAsset.image_url}
                    alt={previewAsset.name || 'asset'}
                    width={220}
                    height={220}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    fallback={PLUS_ICON_SVG}
                  />
                ) : (
                  <img
                    src={PLUS_ICON_SVG}
                    alt="placeholder"
                    style={{ width: 120, height: 120, opacity: 0.8 }}
                  />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#1f1f1f', lineHeight: 1.3 }}>
                    {previewAsset?.name || '（未填写资产名称）'}
                  </div>
                  <div style={{ fontSize: 13, color: '#8c8c8c', marginTop: 4 }}>
                    Token ID：{previewAsset?.token_id || '# ----'}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    padding: '4px 10px',
                    borderRadius: 12,
                    background: '#fff2e8',
                    color: '#fa8c16',
                    fontWeight: 600,
                    alignSelf: 'flex-start',
                  }}
                >
                  未定价
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  {previewAsset?.owner_name && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#8c8c8c' }}>鸽主</span>
                      <span style={{ color: '#1f1f1f', fontWeight: 500 }}>{previewAsset.owner_name}</span>
                    </div>
                  )}
                  {(() => {
                    const md = parseMetadata(previewAsset?.metadata);
                    const breed = md?.breed || md?.bloodline;
                    const achievement = md?.achievement || md?.race;
                    const color = md?.color;
                    const eye_color = md?.eye_color;
                    return (
                      <>
                        {breed && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                            <span style={{ color: '#8c8c8c' }}>品系</span>
                            <span style={{ color: '#1f1f1f', fontWeight: 500 }}>{String(breed)}</span>
                          </div>
                        )}
                        {color && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                            <span style={{ color: '#8c8c8c' }}>羽色</span>
                            <span style={{ color: '#1f1f1f', fontWeight: 500 }}>{String(color)}</span>
                          </div>
                        )}
                        {eye_color && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                            <span style={{ color: '#8c8c8c' }}>眼砂</span>
                            <span style={{ color: '#1f1f1f', fontWeight: 500 }}>{String(eye_color)}</span>
                          </div>
                        )}
                        {achievement && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                            <span style={{ color: '#8c8c8c' }}>赛绩</span>
                            <span style={{ color: '#1f1f1f', fontWeight: 500 }}>{String(achievement)}</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                  {previewAsset?.description && (
                    <div style={{ marginTop: 8, padding: '10px 12px', background: '#fafafa', borderRadius: 8, fontSize: 13, lineHeight: 1.6, color: '#434343' }}>
                      {intelligentValueRenderer('description', previewAsset.description, previewAsset.name)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {renderMetadataInfoSection(previewAsset?.metadata ?? null, previewAsset?.image_url, previewAsset?.description)}

          <Card
            variant="outlined"
            title={<span style={{ fontSize: 14, fontWeight: 600 }}>🧬 基因档案信息</span>}
            styles={{ body: { padding: 12 } }}
          >
            {previewAsset?.gene_profile ? (
              (() => {
                const g = previewAsset.gene_profile;
                const md = parseMetadata(previewAsset.metadata);
                const breed = md?.breed || md?.bloodline;
                const achievement = md?.achievement || md?.race;
                return (
                  <Descriptions column={1} bordered size="small">
                    <Descriptions.Item label="足环号">
                      <Tag color="blue">{g.ring_number}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="鸽名">{g.name}</Descriptions.Item>
                    <Descriptions.Item label="鸽主">{g.owner_name}</Descriptions.Item>
                    {breed && (
                      <Descriptions.Item label="品系">{String(breed)}</Descriptions.Item>
                    )}
                    {achievement && (
                      <Descriptions.Item label="赛绩">{String(achievement)}</Descriptions.Item>
                    )}
                  </Descriptions>
                );
              })()
            ) : (
              <Empty description="未关联基因档案" />
            )}
          </Card>
        </Space>
      </Drawer>
    </>
  );
};

export default NftAudit;
