import {
  DrawerForm,
  ModalForm,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  Button,
  Descriptions,
  Drawer,
  Empty,
  Popconfirm,
  Space,
  Spin,
  Tabs,
  Tag,
  message,
} from 'antd';
import { EyeOutlined, PlusOutlined, SendOutlined } from '@ant-design/icons';
import { useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import { getGeneProfileOptions, type GeneProfileOption } from '../../services/gene';
import {
  createNftAsset,
  createNftTransfer,
  deleteNftAsset,
  getNftAssetDetail,
  getNftAssets,
  submitNftAssetAudit,
  updateNftAsset,
  type NftAsset,
  type NftAssetDetail,
  type NftTransfer,
} from '../../services/nft';

// 资产状态选项
const STATUS_OPTIONS = [
  { label: '草稿', value: 'draft' },
  { label: '待审核', value: 'pending' },
  { label: '审核通过', value: 'approved' },
  { label: '上链中', value: 'minting' },
  { label: '已上链', value: 'minted' },
  { label: '上链失败', value: 'failed' },
];

// 状态标签颜色映射
const STATUS_COLOR: Record<string, string> = {
  draft: 'default',
  pending: 'processing',
  approved: 'blue',
  minting: 'gold',
  minted: 'success',
  failed: 'error',
};

// 状态中文映射
const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  pending: '待审核',
  approved: '审核通过',
  minting: '上链中',
  minted: '已上链',
  failed: '上链失败',
};

// 流转类型选项
const TRANSFER_TYPE_OPTIONS = [
  { label: '转让', value: 'transfer' },
  { label: '拍卖', value: 'auction' },
  { label: '赠与', value: 'gift' },
];
const TRANSFER_TYPE_LABEL: Record<string, string> = {
  transfer: '转让',
  auction: '拍卖',
  gift: '赠与',
};

// 元数据 JSON 字符串格式化为可读文本
function formatMetadata(metadata: string | null): string {
  if (!metadata) return '-';
  try {
    return JSON.stringify(JSON.parse(metadata), null, 2);
  } catch {
    return metadata;
  }
}

// NFT 资产管理:列表 + 新增/编辑抽屉 + 详情抽屉(含流转记录与链上状态)
const NftList = () => {
  const currentUser = useCurrentUser();
  const canEdit = hasPermission(currentUser, 'nft:edit');
  const actionRef = useRef<ActionType>();

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editing, setEditing] = useState<NftAsset | null>(null);
  const [parentOptions, setParentOptions] = useState<GeneProfileOption[]>([]);

  // 详情抽屉
  const [detailVisible, setDetailVisible] = useState(false);
  const [detail, setDetail] = useState<NftAssetDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 新增流转记录弹窗
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  // 加载基因档案下拉选项
  const loadParentOptions = () => {
    if (!parentOptions.length) {
      getGeneProfileOptions()
        .then(setParentOptions)
        .catch(() => {
          // 拦截器已提示错误
        });
    }
  };

  const openCreate = () => {
    setEditing(null);
    setDrawerVisible(true);
    loadParentOptions();
  };

  const openEdit = (record: NftAsset) => {
    setEditing(record);
    setDrawerVisible(true);
    loadParentOptions();
  };

  // 查看详情
  const openDetail = async (record: NftAsset) => {
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const res = await getNftAssetDetail(record.id);
      setDetail(res);
    } catch {
      // 拦截器已提示错误
    } finally {
      setDetailLoading(false);
    }
  };

  // 重新加载详情
  const reloadDetail = async () => {
    if (!detail) return;
    try {
      const res = await getNftAssetDetail(detail.id);
      setDetail(res);
    } catch {
      // 拦截器已提示错误
    }
  };

  // 提交新增/编辑
  const handleSubmit = async (values: Record<string, unknown>) => {
    // 构造 metadata 对象
    let metadata: Record<string, unknown> | undefined;
    if (values.metadata_obj) {
      metadata = values.metadata_obj as Record<string, unknown>;
    }

    const payload = {
      gene_profile_id: (values.gene_profile_id as number | undefined) ?? null,
      name: values.name as string,
      description: (values.description as string) ?? undefined,
      image_url: (values.image_url as string) ?? undefined,
      metadata,
      owner_name: (values.owner_name as string) ?? undefined,
    };
    if (editing) {
      await updateNftAsset(editing.id, payload);
      message.success('更新成功');
    } else {
      await createNftAsset(payload);
      message.success('铸造申请已创建(草稿状态)');
    }
    setDrawerVisible(false);
    actionRef.current?.reload();
    return true;
  };

  // 提交审核
  const handleSubmitAudit = async (record: NftAsset) => {
    try {
      await submitNftAssetAudit(record.id);
      message.success('已提交审核');
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 删除
  const handleDelete = async (record: NftAsset) => {
    try {
      await deleteNftAsset(record.id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 新增流转记录
  const handleCreateTransfer = async (values: Record<string, unknown>) => {
    if (!detail) return false;
    try {
      await createNftTransfer(detail.id, {
        from_owner: (values.from_owner as string) || null,
        to_owner: values.to_owner as string,
        transfer_type: (values.transfer_type as string) ?? 'transfer',
        price: (values.price as number) ?? null,
        tx_hash: (values.tx_hash as string) || null,
        status: 'success',
      });
      message.success('流转记录已新增');
      setTransferModalOpen(false);
      reloadDetail();
      return true;
    } catch {
      return false;
    }
  };

  const columns: ProColumns<NftAsset>[] = [
    { title: '资产名称', dataIndex: 'name', width: 200, ellipsis: true },
    {
      title: 'Token ID',
      dataIndex: 'token_id',
      width: 160,
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => record.token_id || '-',
    },
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
      valueEnum: STATUS_OPTIONS.reduce(
        (acc, cur) => ({ ...acc, [cur.value]: { text: cur.label } }),
        {} as Record<string, { text: string }>
      ),
      render: (_, record) => (
        <Tag color={STATUS_COLOR[record.status] ?? 'default'}>
          {STATUS_LABEL[record.status] ?? record.status}
        </Tag>
      ),
    },
    {
      title: '上链时间',
      dataIndex: 'minted_at',
      width: 160,
      hideInSearch: true,
      render: (_, record) =>
        record.minted_at ? dayjs(record.minted_at).format('YYYY-MM-DD HH:mm') : '-',
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
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => openDetail(record)}
          >
            详情
          </Button>
          {canEdit && (record.status === 'draft' || record.status === 'pending' || record.status === 'failed') && (
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          )}
          {canEdit && (record.status === 'draft' || record.status === 'failed') && (
            <Popconfirm title="确认提交审核?" onConfirm={() => handleSubmitAudit(record)}>
              <Button type="link" size="small" icon={<SendOutlined />}>
                提交审核
              </Button>
            </Popconfirm>
          )}
          {canEdit && (record.status === 'draft' || record.status === 'pending' || record.status === 'failed') && (
            <Popconfirm title="确认删除该 NFT 资产?" onConfirm={() => handleDelete(record)}>
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // 流转记录表格列
  const transferColumns: ProColumns<NftTransfer>[] = [
    {
      title: '类型',
      dataIndex: 'transfer_type',
      width: 80,
      render: (_, r) => TRANSFER_TYPE_LABEL[r.transfer_type] ?? r.transfer_type,
    },
    { title: '转出方', dataIndex: 'from_owner', width: 120, ellipsis: true, render: (_, r) => r.from_owner || '-' },
    { title: '转入方', dataIndex: 'to_owner', width: 120, ellipsis: true },
    {
      title: '成交价',
      dataIndex: 'price',
      width: 100,
      render: (_, r) => (r.price !== null ? `¥${r.price}` : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (_, r) => (
        <Tag color={r.status === 'success' ? 'success' : r.status === 'failed' ? 'error' : 'processing'}>
          {r.status === 'success' ? '成功' : r.status === 'failed' ? '失败' : '进行中'}
        </Tag>
      ),
    },
    {
      title: '交易哈希',
      dataIndex: 'tx_hash',
      width: 180,
      ellipsis: true,
      render: (_, r) => r.tx_hash || '-',
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 150,
      render: (_, r) => dayjs(r.created_at).format('YYYY-MM-DD HH:mm'),
    },
  ];

  return (
    <>
      <ProTable<NftAsset>
        headerTitle="NFT 资产列表"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        options={{ density: false }}
        scroll={{ x: 1400 }}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          const { current, pageSize, name, status, owner_name } = params;
          try {
            const res = await getNftAssets({
              page: current,
              pageSize,
              name: name as string | undefined,
              status: status as string | undefined,
              owner_name: owner_name as string | undefined,
            });
            return { data: res.list, success: true, total: res.total };
          } catch {
            return { data: [], success: false, total: 0 };
          }
        }}
        toolBarRender={() =>
          canEdit
            ? [
                <Button key="create" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                  新增铸造
                </Button>,
              ]
            : []
        }
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />

      {/* 新增/编辑抽屉 */}
      <DrawerForm
        title={editing ? '编辑 NFT 资产' : '新增铸造申请'}
        open={drawerVisible}
        onOpenChange={setDrawerVisible}
        onFinish={handleSubmit}
        drawerProps={{ destroyOnClose: true, maskClosable: false, width: 560 }}
        initialValues={
          editing
            ? {
                gene_profile_id: editing.gene_profile_id ?? undefined,
                name: editing.name,
                description: editing.description ?? undefined,
                image_url: editing.image_url ?? undefined,
                owner_name: editing.owner_name,
              }
            : {}
        }
      >
        <ProFormSelect
          name="gene_profile_id"
          label="关联基因档案"
          placeholder="请选择基因档案(铸造时关联)"
          showSearch
          options={parentOptions
            .filter((o) => o.id !== editing?.id)
            .map((o) => ({ label: `${o.ring_number} ${o.name}`, value: o.id }))}
        />
        <ProFormText
          name="name"
          label="资产名称"
          placeholder="请输入资产名称"
          rules={[{ required: true, message: '请输入资产名称' }]}
        />
        <ProFormTextArea
          name="description"
          label="资产描述"
          placeholder="请输入资产描述"
          fieldProps={{ autoSize: { minRows: 2, maxRows: 5 } }}
        />
        <ProFormText name="image_url" label="资产图片 URL" placeholder="请输入资产图片地址" />
        <ProFormText name="owner_name" label="持有者(鸽主)" placeholder="留空将自动取基因档案鸽主" />
        <ProFormTextArea
          name="metadata_obj"
          label="元数据(JSON)"
          placeholder='{"key":"value"} - 可选,将序列化为 JSON 存储'
          fieldProps={{ autoSize: { minRows: 3, maxRows: 8 } }}
          tooltip="可直接输入 JSON 字符串,也可输入对象结构"
        />
      </DrawerForm>

      {/* 详情抽屉 */}
      <Drawer
        title="NFT 资产详情"
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={820}
        destroyOnClose
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin tip="加载中..." />
          </div>
        ) : !detail ? (
          <Empty description="暂无数据" />
        ) : (
          <Tabs
            defaultActiveKey="info"
            items={[
              {
                key: 'info',
                label: '基本信息',
                children: (
                  <Descriptions column={2} bordered size="small">
                    <Descriptions.Item label="资产名称" span={2}>
                      {detail.name}
                    </Descriptions.Item>
                    <Descriptions.Item label="资产 ID">{detail.id}</Descriptions.Item>
                    <Descriptions.Item label="Token ID">{detail.token_id || '-'}</Descriptions.Item>
                    <Descriptions.Item label="状态">
                      <Tag color={STATUS_COLOR[detail.status] ?? 'default'}>
                        {STATUS_LABEL[detail.status] ?? detail.status}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="持有者">{detail.owner_name}</Descriptions.Item>
                    <Descriptions.Item label="关联基因档案" span={2}>
                      {detail.gene_profile
                        ? `${detail.gene_profile.ring_number} ${detail.gene_profile.name}(${detail.gene_profile.owner_name})`
                        : '未关联'}
                    </Descriptions.Item>
                    <Descriptions.Item label="资产描述" span={2}>
                      {detail.description || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="资产图片" span={2}>
                      {detail.image_url ? (
                        <a href={detail.image_url} target="_blank" rel="noreferrer">
                          {detail.image_url}
                        </a>
                      ) : (
                        '-'
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="元数据" span={2}>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {formatMetadata(detail.metadata)}
                      </pre>
                    </Descriptions.Item>
                    <Descriptions.Item label="创建时间">
                      {dayjs(detail.created_at).format('YYYY-MM-DD HH:mm:ss')}
                    </Descriptions.Item>
                    <Descriptions.Item label="更新时间">
                      {dayjs(detail.updated_at).format('YYYY-MM-DD HH:mm:ss')}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'transfers',
                label: `流转记录${detail.transfers.length ? `(${detail.transfers.length})` : ''}`,
                children: (
                  <>
                    <div style={{ marginBottom: 12 }}>
                      {canEdit && (
                        <Button
                          icon={<PlusOutlined />}
                          onClick={() => setTransferModalOpen(true)}
                          type="primary"
                          size="small"
                        >
                          新增流转记录
                        </Button>
                      )}
                    </div>
                    <ProTable<NftTransfer>
                      size="small"
                      rowKey="id"
                      columns={transferColumns}
                      dataSource={detail.transfers}
                      pagination={false}
                      scroll={{ x: 800 }}
                      search={false}
                      options={false}
                      toolBarRender={false}
                    />
                  </>
                ),
              },
              {
                key: 'chain',
                label: '链上状态',
                children: (
                  <Descriptions column={1} bordered size="small">
                    <Descriptions.Item label="链上状态">
                      <Tag color={STATUS_COLOR[detail.chain_status.status] ?? 'default'}>
                        {detail.chain_status.status_label}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Token ID">{detail.chain_status.token_id || '-'}</Descriptions.Item>
                    <Descriptions.Item label="合约地址">
                      {detail.chain_status.contract_address || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="铸造交易哈希">
                      {detail.chain_status.tx_hash || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="上链时间">
                      {detail.chain_status.minted_at
                        ? dayjs(detail.chain_status.minted_at).format('YYYY-MM-DD HH:mm:ss')
                        : '-'}
                    </Descriptions.Item>
                    {detail.mint_task && (
                      <>
                        <Descriptions.Item label="上链任务状态">
                          <Tag
                            color={
                              detail.mint_task.status === 'success'
                                ? 'success'
                                : detail.mint_task.status === 'failed'
                                ? 'error'
                                : 'processing'
                            }
                          >
                            {detail.mint_task.status === 'pending'
                              ? '待处理'
                              : detail.mint_task.status === 'processing'
                              ? '处理中'
                              : detail.mint_task.status === 'success'
                              ? '成功'
                              : '失败'}
                          </Tag>
                          <span style={{ marginLeft: 8, color: '#888' }}>
                            重试次数:{detail.mint_task.retry_count}
                          </span>
                        </Descriptions.Item>
                        {detail.mint_task.error_msg && (
                          <Descriptions.Item label="失败原因">
                            {detail.mint_task.error_msg}
                          </Descriptions.Item>
                        )}
                      </>
                    )}
                  </Descriptions>
                ),
              },
            ]}
          />
        )}
      </Drawer>

      {/* 新增流转记录弹窗 */}
      <ModalForm
        title="新增流转记录"
        open={transferModalOpen}
        onOpenChange={setTransferModalOpen}
        onFinish={handleCreateTransfer}
        modalProps={{ destroyOnClose: true, maskClosable: false }}
        initialValues={{ transfer_type: 'transfer' }}
      >
        <ProFormSelect
          name="transfer_type"
          label="流转类型"
          options={TRANSFER_TYPE_OPTIONS}
          rules={[{ required: true, message: '请选择流转类型' }]}
        />
        <ProFormText
          name="from_owner"
          label="转出方"
          placeholder="留空则取当前持有者"
        />
        <ProFormText
          name="to_owner"
          label="转入方"
          placeholder="请输入转入方"
          rules={[{ required: true, message: '请输入转入方' }]}
        />
        <ProFormDigit
          name="price"
          label="成交价"
          placeholder="请输入成交价(可选)"
          min={0}
          fieldProps={{ precision: 2 }}
        />
        <ProFormText name="tx_hash" label="交易哈希" placeholder="请输入交易哈希(可选)" />
      </ModalForm>
    </>
  );
};

export default NftList;
