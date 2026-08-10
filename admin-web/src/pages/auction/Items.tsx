import {
  DrawerForm,
  ModalForm,
  PageContainer,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  App,
  Button,
  Descriptions,
  Drawer,
  Empty,
  Popconfirm,
  Space,
  Spin,
  Tabs,
  Tag,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import {
  createAuctionBid,
  createAuctionItem,
  deleteAuctionItem,
  getAuctionItemDetail,
  getAuctionItems,
  getAvailableNftAssets,
  passAuctionItem,
  startAuctionItem,
  updateAuctionItem,
  type AuctionBid,
  type AuctionItem,
  type AuctionItemDetail,
  type NftAssetBrief,
} from '../../services/auction';

// 拍品状态选项
const STATUS_OPTIONS = [
  { label: '待上架', value: 'pending' },
  { label: '拍卖中', value: 'bidding' },
  { label: '已成交', value: 'dealt' },
  { label: '流拍', value: 'passed' },
];

// 状态标签颜色映射
const STATUS_COLOR: Record<string, string> = {
  pending: 'default',
  bidding: 'success',
  dealt: 'blue',
  passed: 'error',
};

// 状态中文映射
const STATUS_LABEL: Record<string, string> = {
  pending: '待上架',
  bidding: '拍卖中',
  dealt: '已成交',
  passed: '流拍',
};

// 拍品管理(按场次):列表 + 上架/编辑 + 开拍/流拍 + 详情(含竞价历史)
const AuctionItems = () => {
  const { message } = App.useApp();
  const { sessionId } = useParams<{ sessionId: string }>();
  const currentUser = useCurrentUser();
  const canEdit = hasPermission(currentUser, 'auction:edit');
  const actionRef = useRef<ActionType>();

  const sid = sessionId ? Number(sessionId) : undefined;

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editing, setEditing] = useState<AuctionItem | null>(null);
  const [assetOptions, setAssetOptions] = useState<NftAssetBrief[]>([]);

  // 详情抽屉
  const [detailVisible, setDetailVisible] = useState(false);
  const [detail, setDetail] = useState<AuctionItemDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 出价弹窗
  const [bidModalOpen, setBidModalOpen] = useState(false);

  const loadAssetOptions = (keyword?: string) => {
    if (!sid) return;
    getAvailableNftAssets(sid, keyword)
      .then(setAssetOptions)
      .catch(() => {
        // 拦截器已提示错误
      });
  };

  const openCreate = () => {
    setEditing(null);
    setDrawerVisible(true);
    loadAssetOptions();
  };

  const openEdit = (record: AuctionItem) => {
    setEditing(record);
    setDrawerVisible(true);
    loadAssetOptions();
  };

  const openDetail = async (record: AuctionItem) => {
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const res = await getAuctionItemDetail(record.id);
      setDetail(res);
    } catch {
      // 拦截器已提示错误
    } finally {
      setDetailLoading(false);
    }
  };

  const reloadDetail = async () => {
    if (!detail) return;
    try {
      const res = await getAuctionItemDetail(detail.id);
      setDetail(res);
    } catch {
      // 拦截器已提示错误
    }
  };

  // 提交新增/编辑
  const handleSubmit = async (values: Record<string, unknown>) => {
    const payload = {
      nft_asset_id: (values.nft_asset_id as number | undefined) ?? null,
      name: values.name as string,
      description: (values.description as string) ?? undefined,
      start_price: Number(values.start_price),
      increment: Number(values.increment),
      sort_order: values.sort_order !== undefined ? Number(values.sort_order) : 0,
    };
    if (editing) {
      await updateAuctionItem(editing.id, payload);
      message.success('更新成功');
    } else {
      if (!sid) {
        message.error('缺少场次 ID');
        return false;
      }
      await createAuctionItem({ ...payload, session_id: sid });
      message.success('拍品上架成功');
    }
    setDrawerVisible(false);
    actionRef.current?.reload();
    return true;
  };

  // 开拍
  const handleStart = async (record: AuctionItem) => {
    try {
      await startAuctionItem(record.id);
      message.success('拍品已开拍');
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 流拍
  const handlePass = async (record: AuctionItem) => {
    try {
      await passAuctionItem(record.id);
      message.success('拍品已流拍');
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 删除
  const handleDelete = async (record: AuctionItem) => {
    try {
      await deleteAuctionItem(record.id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 手动录入出价
  const handleCreateBid = async (values: Record<string, unknown>) => {
    if (!detail) return false;
    try {
      await createAuctionBid(detail.id, {
        bidder: values.bidder as string,
        bid_amount: Number(values.bid_amount),
      });
      message.success('出价成功');
      setBidModalOpen(false);
      reloadDetail();
      actionRef.current?.reload();
      return true;
    } catch {
      return false;
    }
  };

  const columns: ProColumns<AuctionItem>[] = [
    { title: '拍品名称', dataIndex: 'name', width: 200, ellipsis: true },
    {
      title: '关联 NFT 资产',
      dataIndex: 'nft_asset_id',
      width: 180,
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => {
        const a = record.nft_asset;
        if (!a) return <Tag>未关联</Tag>;
        return (
          <Space size={4}>
            <span>{a.name}</span>
            {a.token_id && <span style={{ color: '#888' }}>{a.token_id}</span>}
          </Space>
        );
      },
    },
    {
      title: '起拍价',
      dataIndex: 'start_price',
      width: 100,
      hideInSearch: true,
      render: (_, record) => `¥${record.start_price}`,
    },
    {
      title: '加价幅度',
      dataIndex: 'increment',
      width: 100,
      hideInSearch: true,
      render: (_, record) => `¥${record.increment}`,
    },
    {
      title: '当前价',
      dataIndex: 'current_price',
      width: 110,
      hideInSearch: true,
      render: (_, record) => (
        <span style={{ color: '#cf1322', fontWeight: 500 }}>¥{record.current_price}</span>
      ),
    },
    { title: '最高出价人', dataIndex: 'current_bidder', width: 110, ellipsis: true, hideInSearch: true, render: (_, r) => r.current_bidder || '-' },
    {
      title: '出价数',
      dataIndex: 'bid_count',
      width: 80,
      hideInSearch: true,
      render: (_, record) => record.bid_count ?? 0,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
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
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space size={0} wrap>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>
            详情
          </Button>
          {canEdit && record.status !== 'dealt' && record.status !== 'passed' && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
              编辑
            </Button>
          )}
          {canEdit && record.status === 'pending' && (
            <Popconfirm title="确认开拍该拍品?" onConfirm={() => handleStart(record)}>
              <Button type="link" size="small" icon={<PlayCircleOutlined />}>
                开拍
              </Button>
            </Popconfirm>
          )}
          {canEdit && (record.status === 'pending' || record.status === 'bidding') && (
            <Popconfirm title="确认流拍该拍品?" onConfirm={() => handlePass(record)}>
              <Button type="link" size="small" danger icon={<StopOutlined />}>
                流拍
              </Button>
            </Popconfirm>
          )}
          {canEdit && (record.status === 'pending' || record.status === 'passed') && (
            <Popconfirm title="确认删除该拍品?" onConfirm={() => handleDelete(record)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // 竞价历史表格列
  const bidColumns: ProColumns<AuctionBid>[] = [
    { title: '出价人', dataIndex: 'bidder', width: 120 },
    {
      title: '出价金额',
      dataIndex: 'bid_amount',
      width: 120,
      render: (_, r) => `¥${r.bid_amount}`,
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 160,
      render: (_, r) => dayjs(r.created_at).format('YYYY-MM-DD HH:mm:ss'),
    },
  ];

  if (!sid) {
    return (
      <PageContainer header={{ title: '拍品管理' }}>
        <Empty description="缺少场次 ID,请从拍卖场次页进入" />
      </PageContainer>
    );
  }

  return (
    <PageContainer header={{ title: '拍品管理', breadcrumb: {} }}>
      <ProTable<AuctionItem>
        headerTitle={`场次 #${sid} 拍品列表`}
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        options={{ density: false }}
        scroll={{ x: 1400 }}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          const { current, pageSize, status, name } = params;
          try {
            const res = await getAuctionItems({
              page: current,
              pageSize,
              session_id: sid,
              status: status as string | undefined,
              name: name as string | undefined,
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
                  上架拍品
                </Button>,
              ]
            : []
        }
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />

      {/* 上架/编辑抽屉 */}
      <DrawerForm
        title={editing ? '编辑拍品' : '上架拍品'}
        open={drawerVisible}
        onOpenChange={setDrawerVisible}
        onFinish={handleSubmit}
        drawerProps={{ destroyOnClose: true, maskClosable: false, width: 560 }}
        initialValues={
          editing
            ? {
                nft_asset_id: editing.nft_asset_id ?? undefined,
                name: editing.name,
                description: editing.description ?? undefined,
                start_price: editing.start_price,
                increment: editing.increment,
                sort_order: editing.sort_order,
              }
            : { start_price: 0, increment: 0, sort_order: 0 }
        }
      >
        <ProFormSelect
          name="nft_asset_id"
          label="关联 NFT 资产"
          placeholder="请选择已上链 NFT 资产"
          showSearch
          options={assetOptions.map((a) => ({
            label: `${a.name}${a.token_id ? ` (${a.token_id})` : ''} - ${a.owner_name}`,
            value: a.id,
          }))}
          fieldProps={{
            onSearch: (v: string) => loadAssetOptions(v),
          }}
          tooltip="仅可选择已上链/审核通过的 NFT 资产,且未被同场次其他拍品占用"
        />
        <ProFormText
          name="name"
          label="拍品名称"
          placeholder="请输入拍品名称"
          rules={[{ required: true, message: '请输入拍品名称' }]}
        />
        <ProFormTextArea
          name="description"
          label="拍品描述"
          placeholder="请输入拍品描述"
          fieldProps={{ autoSize: { minRows: 2, maxRows: 5 } }}
        />
        <ProFormDigit
          name="start_price"
          label="起拍价(¥)"
          placeholder="请输入起拍价"
          min={0}
          fieldProps={{ precision: 2 }}
          rules={[{ required: true, message: '请输入起拍价' }]}
        />
        <ProFormDigit
          name="increment"
          label="加价幅度(¥)"
          placeholder="请输入加价幅度"
          min={0}
          fieldProps={{ precision: 2 }}
          rules={[{ required: true, message: '请输入加价幅度' }]}
        />
        <ProFormDigit
          name="sort_order"
          label="排序"
          placeholder="数值越小越靠前"
          min={0}
          fieldProps={{ precision: 0 }}
        />
      </DrawerForm>

      {/* 详情抽屉 */}
      <Drawer
        title="拍品详情"
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={820}
        destroyOnClose
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin tip="加载中...">
              <div style={{ minHeight: 200, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
            </Spin>
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
                    <Descriptions.Item label="拍品名称" span={2}>
                      {detail.name}
                    </Descriptions.Item>
                    <Descriptions.Item label="拍品 ID">{detail.id}</Descriptions.Item>
                    <Descriptions.Item label="状态">
                      <Tag color={STATUS_COLOR[detail.status] ?? 'default'}>
                        {STATUS_LABEL[detail.status] ?? detail.status}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="起拍价">¥{detail.start_price}</Descriptions.Item>
                    <Descriptions.Item label="加价幅度">¥{detail.increment}</Descriptions.Item>
                    <Descriptions.Item label="当前最高价">
                      <span style={{ color: '#cf1322', fontWeight: 500 }}>
                        ¥{detail.current_price}
                      </span>
                    </Descriptions.Item>
                    <Descriptions.Item label="最高出价人">
                      {detail.current_bidder ?? '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="关联 NFT 资产" span={2}>
                      {detail.nft_asset
                        ? `${detail.nft_asset.name}${detail.nft_asset.token_id ? ` (${detail.nft_asset.token_id})` : ''}`
                        : '未关联'}
                    </Descriptions.Item>
                    <Descriptions.Item label="拍品描述" span={2}>
                      {detail.description || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="创建时间" span={2}>
                      {dayjs(detail.created_at).format('YYYY-MM-DD HH:mm:ss')}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'bids',
                label: `竞价历史${detail.bids.length ? `(${detail.bids.length})` : ''}`,
                children: (
                  <>
                    <div style={{ marginBottom: 12 }}>
                      {canEdit && detail.status === 'bidding' && (
                        <Button
                          icon={<PlusOutlined />}
                          onClick={() => setBidModalOpen(true)}
                          type="primary"
                          size="small"
                        >
                          手动录入出价
                        </Button>
                      )}
                    </div>
                    <ProTable<AuctionBid>
                      size="small"
                      rowKey="id"
                      columns={bidColumns}
                      dataSource={detail.bids}
                      pagination={false}
                      scroll={{ x: 500 }}
                      search={false}
                      options={false}
                      toolBarRender={false}
                    />
                  </>
                ),
              },
            ]}
          />
        )}
      </Drawer>

      {/* 手动录入出价弹窗 */}
      <ModalForm
        title="手动录入出价"
        open={bidModalOpen}
        onOpenChange={setBidModalOpen}
        onFinish={handleCreateBid}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        initialValues={{}}
      >
        <ProFormText
          name="bidder"
          label="出价人"
          placeholder="请输入出价人"
          rules={[{ required: true, message: '请输入出价人' }]}
        />
        <ProFormDigit
          name="bid_amount"
          label="出价金额(¥)"
          placeholder={`须高于当前最高价 ¥${detail?.current_price ?? 0}`}
          min={0}
          fieldProps={{ precision: 2 }}
          rules={[{ required: true, message: '请输入出价金额' }]}
          tooltip={
            detail
              ? `当前最高价 ¥${detail.current_price},加价幅度 ¥${detail.increment}`
              : undefined
          }
        />
      </ModalForm>
    </PageContainer>
  );
};

export default AuctionItems;
