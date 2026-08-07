import {
  ModalForm,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { Button, Popconfirm, Space, Tag } from 'antd';
import { CheckOutlined, CloseOutlined, ReloadOutlined } from '@ant-design/icons';
import { useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useAntdApp } from '../../hooks/useAntdApp';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import {
  approveNftAudit,
  getNftAuditList,
  getNftTasks,
  rejectNftAudit,
  retryNftTask,
  type NftAsset,
  type NftMintTask,
} from '../../services/nft';

// 资产状态选项
const ASSET_STATUS_OPTIONS = [
  { label: '待审核', value: 'pending' },
  { label: '审核通过', value: 'approved' },
  { label: '上链中', value: 'minting' },
  { label: '已上链', value: 'minted' },
  { label: '上链失败', value: 'failed' },
  { label: '草稿', value: 'draft' },
];

// 资产状态颜色映射
const ASSET_STATUS_COLOR: Record<string, string> = {
  draft: 'default',
  pending: 'processing',
  approved: 'blue',
  minting: 'gold',
  minted: 'success',
  failed: 'error',
};
const ASSET_STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  pending: '待审核',
  approved: '审核通过',
  minting: '上链中',
  minted: '已上链',
  failed: '上链失败',
};

// 任务状态颜色映射
const TASK_STATUS_COLOR: Record<string, string> = {
  pending: 'processing',
  processing: 'gold',
  success: 'success',
  failed: 'error',
};
const TASK_STATUS_LABEL: Record<string, string> = {
  pending: '待处理',
  processing: '处理中',
  success: '成功',
  failed: '失败',
};

// NFT 上链审核 + 上链任务状态查看
const NftAudit = () => {
  const { message } = useAntdApp();
  const currentUser = useCurrentUser();
  const canAudit = hasPermission(currentUser, 'nft:audit');

  // 待审核列表
  const auditActionRef = useRef<ActionType>();
  // 任务列表
  const taskActionRef = useRef<ActionType>();

  // 驳回弹窗
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  // 审核通过
  const handleApprove = async (record: NftAsset) => {
    try {
      await approveNftAudit(record.id);
      message.success('审核通过,已进入上链队列');
      auditActionRef.current?.reload();
      taskActionRef.current?.reload();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 打开驳回弹窗
  const openReject = (record: NftAsset) => {
    setRejectingId(record.id);
    setRejectModalOpen(true);
  };

  // 提交驳回
  const handleReject = async (values: Record<string, unknown>) => {
    if (rejectingId === null) return false;
    try {
      await rejectNftAudit(rejectingId, values.audit_remark as string);
      message.success('已驳回');
      setRejectModalOpen(false);
      auditActionRef.current?.reload();
      return true;
    } catch {
      return false;
    }
  };

  // 重试失败任务
  const handleRetry = async (record: NftMintTask) => {
    try {
      await retryNftTask(record.id);
      message.success('已重新触发上链任务');
      taskActionRef.current?.reload();
    } catch {
      // 拦截器已提示错误
    }
  };

  // ==================== 待审核资产列 ====================
  const auditColumns: ProColumns<NftAsset>[] = [
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
      width: 200,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space>
          {canAudit && record.status === 'pending' && (
            <Popconfirm title="确认审核通过?将进入上链队列异步铸造。" onConfirm={() => handleApprove(record)}>
              <Button type="link" size="small" icon={<CheckOutlined />}>
                通过
              </Button>
            </Popconfirm>
          )}
          {canAudit && record.status === 'pending' && (
            <Button type="link" size="small" danger icon={<CloseOutlined />} onClick={() => openReject(record)}>
              驳回
            </Button>
          )}
          {record.status !== 'pending' && (
            <span style={{ color: '#999' }}>-</span>
          )}
        </Space>
      ),
    },
  ];

  // ==================== 上链任务列 ====================
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
      title: '任务状态',
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      valueEnum: {
        pending: { text: '待处理' },
        processing: { text: '处理中' },
        success: { text: '成功' },
        failed: { text: '失败' },
      },
      render: (_, record) => (
        <Tag color={TASK_STATUS_COLOR[record.status] ?? 'default'}>
          {TASK_STATUS_LABEL[record.status] ?? record.status}
        </Tag>
      ),
    },
    {
      title: '重试次数',
      dataIndex: 'retry_count',
      width: 90,
      hideInSearch: true,
      render: (_, record) => record.retry_count,
    },
    {
      title: '失败原因',
      dataIndex: 'error_msg',
      width: 200,
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => record.error_msg || '-',
    },
    {
      title: '交易哈希',
      dataIndex: 'tx_hash',
      width: 180,
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => record.tx_hash || '-',
    },
    {
      title: '完成时间',
      dataIndex: 'finished_at',
      width: 160,
      hideInSearch: true,
      render: (_, record) =>
        record.finished_at ? dayjs(record.finished_at).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 110,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) =>
        canAudit && record.status === 'failed' ? (
          <Popconfirm title="确认重试该上链任务?" onConfirm={() => handleRetry(record)}>
            <Button type="link" size="small" icon={<ReloadOutlined />}>
              重试
            </Button>
          </Popconfirm>
        ) : (
          <span style={{ color: '#999' }}>-</span>
        ),
    },
  ];

  return (
    <>
      {/* 待审核资产列表 */}
      <ProTable<NftAsset>
        headerTitle="待审核资产"
        actionRef={auditActionRef}
        rowKey="id"
        columns={auditColumns}
        options={{ density: false }}
        scroll={{ x: 1100 }}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          const { current, pageSize, name, status, owner_name } = params;
          try {
            const res = await getNftAuditList({
              page: current,
              pageSize,
              name: name as string | undefined,
              status: (status as string | undefined) ?? 'pending',
              owner_name: owner_name as string | undefined,
            });
            return { data: res.list, success: true, total: res.total };
          } catch {
            return { data: [], success: false, total: 0 };
          }
        }}
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />

      {/* 上链任务列表 */}
      <ProTable<NftMintTask>
        headerTitle="上链任务状态"
        actionRef={taskActionRef}
        rowKey="id"
        columns={taskColumns}
        options={{ density: false }}
        scroll={{ x: 1300 }}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          const { current, pageSize, status, nft_asset_id } = params;
          try {
            const res = await getNftTasks({
              page: current,
              pageSize,
              status: status as string | undefined,
              nft_asset_id: nft_asset_id ? Number(nft_asset_id) : undefined,
            });
            return { data: res.list, success: true, total: res.total };
          } catch {
            return { data: [], success: false, total: 0 };
          }
        }}
        toolBarRender={() => [
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => taskActionRef.current?.reload()}
          >
            刷新
          </Button>,
        ]}
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />

      {/* 驳回弹窗 */}
      <ModalForm
        title="驳回审核"
        open={rejectModalOpen}
        onOpenChange={setRejectModalOpen}
        onFinish={handleReject}
        modalProps={{ destroyOnClose: true, maskClosable: false }}
      >
        <ProFormTextArea
          name="audit_remark"
          label="驳回理由"
          placeholder="请输入驳回理由"
          rules={[{ required: true, message: '请输入驳回理由' }]}
          fieldProps={{ autoSize: { minRows: 3, maxRows: 6 } }}
        />
      </ModalForm>
    </>
  );
};

export default NftAudit;
