import {
  ModalForm,
  PageContainer,
  ProFormDigit,
  ProFormText,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Tabs,
  Tag,
  Tooltip,
  theme,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  SearchOutlined,
  StopOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useTableRefresh } from '../../hooks/useTableRefresh';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import RefreshButton from '../../components/RefreshButton';
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
  const { tableLoading, handleRefresh } = useTableRefresh(actionRef, { messageApi: message });

  const sid = sessionId ? Number(sessionId) : undefined;

  const { token } = theme.useToken();
  const [form] = Form.useForm();

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editing, setEditing] = useState<AuctionItem | null>(null);
  const [assetOptions, setAssetOptions] = useState<NftAssetBrief[]>([]);
  const [assetKeyword, setAssetKeyword] = useState('');

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
    setAssetKeyword('');
    loadAssetOptions();
    form.resetFields();
    form.setFieldsValue({ start_price: 0, increment: 0, sort_order: 0 });
  };

  const openEdit = (record: AuctionItem) => {
    setEditing(record);
    setDrawerVisible(true);
    setAssetKeyword('');
    loadAssetOptions();
    form.setFieldsValue({
      nft_asset_id: record.nft_asset_id ?? undefined,
      name: record.name,
      description: record.description ?? undefined,
      start_price: record.start_price,
      increment: record.increment,
      sort_order: record.sort_order,
    });
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
    handleRefresh();
    return true;
  };

  // 开拍
  const handleStart = async (record: AuctionItem) => {
    try {
      await startAuctionItem(record.id);
      message.success('拍品已开拍');
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 流拍
  const handlePass = async (record: AuctionItem) => {
    try {
      await passAuctionItem(record.id);
      message.success('拍品已流拍');
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 删除
  const handleDelete = async (record: AuctionItem) => {
    try {
      await deleteAuctionItem(record.id);
      message.success('删除成功');
      handleRefresh();
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
      handleRefresh();
      return true;
    } catch {
      return false;
    }
  };

  const columns: ProColumns<AuctionItem>[] = [
    { title: '序号', dataIndex: 'index', valueType: 'index', width: 60, hideInSearch: true },
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
        loading={tableLoading}
        rowKey="id"
        columns={columns}
        options={{ density: false, reload: false }}
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
                <RefreshButton key="refresh" actionRef={actionRef as any} />,
              ]
            : [<RefreshButton key="refresh" actionRef={actionRef as any} />]
        }
        pagination={{
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          defaultPageSize: 10,
        }}
      />

      {/* 上架/编辑抽屉 */}
      <Drawer
        title={editing ? '编辑拍品' : '上架拍品'}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={900}
        destroyOnHidden
        maskClosable={false}
        extra={
          <Space>
            <Button onClick={() => setDrawerVisible(false)}>取消</Button>
            <Button type="primary" onClick={() => form.submit()}>
              {editing ? '保存修改' : '确认上架'}
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark
          onFinish={handleSubmit}
          initialValues={{ start_price: 0, increment: 0, sort_order: 0 }}
        >
          <Row gutter={24}>
            {/* 左侧表单 */}
            <Col span={15}>
              {/* ① 关联 NFT 资产 */}
              <Card
                size="small"
                style={{ marginBottom: 16, borderLeft: `3px solid ${token.colorPrimary}` }}
                styles={{ body: { padding: 16 } }}
                title={
                  <Space>
                    <WalletOutlined style={{ color: token.colorPrimary }} />
                    <span>① 关联 NFT 资产</span>
                  </Space>
                }
              >
                <Form.Item
                  name="nft_asset_id"
                  label="选择 NFT 资产"
                  tooltip={{
                    title: '仅可选择已上链/审核通过的 NFT 资产,且未被同场次其他拍品占用',
                  }}
                >
                  <Select
                    showSearch
                    placeholder="请选择已上链 NFT 资产"
                    optionFilterProp="label"
                    onSearch={(v) => {
                      setAssetKeyword(v);
                      loadAssetOptions(v);
                    }}
                    notFoundContent={assetKeyword ? '无匹配的资产' : '请输入关键词搜索'}
                    options={assetOptions.map((a) => ({
                      label: `${a.name}${a.token_id ? ` (${a.token_id})` : ''} - ${a.owner_name}`,
                      value: a.id,
                    }))}
                    suffixIcon={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
                  />
                </Form.Item>
              </Card>

              {/* ② 拍品基本信息 */}
              <Card
                size="small"
                style={{ marginBottom: 16, borderLeft: `3px solid #13c2c2` }}
                styles={{ body: { padding: 16 } }}
                title={
                  <Space>
                    <InfoCircleOutlined style={{ color: '#13c2c2' }} />
                    <span>② 拍品基本信息</span>
                  </Space>
                }
              >
                <Form.Item
                  name="name"
                  label="拍品名称"
                  rules={[{ required: true, message: '请输入拍品名称' }]}
                >
                  <Input placeholder="请输入拍品名称" maxLength={60} showCount />
                </Form.Item>
                <Form.Item name="description" label="拍品描述">
                  <Input.TextArea
                    placeholder="请输入拍品描述"
                    autoSize={{ minRows: 3, maxRows: 6 }}
                    maxLength={500}
                    showCount
                  />
                </Form.Item>
              </Card>

              {/* ③ 竞拍参数 */}
              <Card
                size="small"
                style={{ marginBottom: 16, borderLeft: `3px solid #faad14` }}
                styles={{ body: { padding: 16 } }}
                title={
                  <Space>
                    <Tag color="warning">¥</Tag>
                    <span>③ 竞拍参数</span>
                  </Space>
                }
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="start_price"
                      label="起拍价(¥)"
                      rules={[{ required: true, message: '请输入起拍价' }]}
                    >
                      <InputNumber
                        min={0}
                        step={100}
                        precision={2}
                        style={{ width: '100%' }}
                        placeholder="请输入起拍价"
                        formatter={(v) => `¥ ${v}`}
                        parser={((v: string | undefined) => (v ? Number(v.replace(/[^\d.]/g, '')) : 0)) as any}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="increment"
                      label="加价幅度(¥)"
                      rules={[{ required: true, message: '请输入加价幅度' }]}
                    >
                      <InputNumber
                        min={0}
                        step={50}
                        precision={2}
                        style={{ width: '100%' }}
                        placeholder="请输入加价幅度"
                        formatter={(v) => `¥ ${v}`}
                        parser={((v: string | undefined) => (v ? Number(v.replace(/[^\d.]/g, '')) : 0)) as any}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="sort_order" label="排序" tooltip="数值越小越靠前">
                  <InputNumber
                    min={0}
                    step={1}
                    precision={0}
                    style={{ width: 200 }}
                    placeholder="数值越小越靠前"
                  />
                </Form.Item>
              </Card>
            </Col>

            {/* 右侧预览 */}
            <Col span={9}>
              <div style={{ position: 'sticky', top: 0 }}>
                <Card
                  styles={{
                    body: { padding: 0 },
                  }}
                  variant="borderless"
                  style={{
                    background: `linear-gradient(135deg, ${token.colorBgContainer} 0%, ${token.colorInfoBg} 100%)`,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                  title={
                    <Space>
                      <EyeOutlined style={{ color: token.colorPrimary }} />
                      <span>拍品预览</span>
                    </Space>
                  }
                >
                  <div style={{ padding: 16 }}>
                    <Form.Item noStyle shouldUpdate={(prev, cur) =>
                      prev.nft_asset_id !== cur.nft_asset_id
                      || prev.name !== cur.name
                      || prev.start_price !== cur.start_price
                      || prev.increment !== cur.increment
                    }>
                      {({ getFieldValue }) => {
                        const assetId = getFieldValue('nft_asset_id');
                        const name = getFieldValue('name');
                        const startPrice = getFieldValue('start_price') ?? 0;
                        const increment = getFieldValue('increment') ?? 0;
                        const selectedAsset = assetOptions.find((a) => a.id === assetId);

                        return (
                          <>
                            {/* 拍品标题区 */}
                            <div
                              style={{
                                background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorLink} 100%)`,
                                borderRadius: 8,
                                padding: 16,
                                color: '#fff',
                                marginBottom: 12,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 18,
                                  fontWeight: 700,
                                  marginBottom: 4,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {name || '拍品名称'}
                              </div>
                              <Space size={4}>
                                <Tag
                                  style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }}
                                >
                                  起拍 ¥{Number(startPrice).toLocaleString()}
                                </Tag>
                                <Tag
                                  style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }}
                                >
                                  加价 ¥{Number(increment).toLocaleString()}
                                </Tag>
                              </Space>
                            </div>

                            {/* NFT 资产信息 */}
                            {selectedAsset ? (
                              <>
                                <div style={{ fontSize: 12, color: token.colorTextSecondary, marginBottom: 4 }}>
                                  关联 NFT 资产
                                </div>
                                <Descriptions
                                  column={1}
                                  size="small"
                                  styles={{
                                    label: { color: token.colorTextSecondary, width: 80, fontSize: 12 },
                                    content: { fontSize: 13 },
                                  }}
                                >
                                  <Descriptions.Item label="资产名称">
                                    <Space>
                                      <span style={{ fontWeight: 500 }}>{selectedAsset.name}</span>
                                      {selectedAsset.token_id && (
                                        <Tag color="processing" style={{ margin: 0 }}>
                                          #{selectedAsset.token_id}
                                        </Tag>
                                      )}
                                    </Space>
                                  </Descriptions.Item>
                                  <Descriptions.Item label="持有者">
                                    {selectedAsset.owner_name || '-'}
                                  </Descriptions.Item>
                                  <Descriptions.Item label="状态">
                                    <Tag color={selectedAsset.status === 'minted' ? 'success' : 'default'}>
                                      {selectedAsset.status === 'minted' ? '已上链' : selectedAsset.status}
                                    </Tag>
                                  </Descriptions.Item>
                                </Descriptions>
                              </>
                            ) : (
                              <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="暂未选择 NFT 资产"
                                style={{ padding: '12px 0' }}
                              />
                            )}

                            <Divider style={{ margin: '12px 0' }} />

                            {/* 关键参数 */}
                            <Row gutter={8}>
                              <Col span={12}>
                                <div
                                  style={{
                                    textAlign: 'center',
                                    padding: 8,
                                    background: token.colorFill,
                                    borderRadius: 6,
                                  }}
                                >
                                  <div style={{ fontSize: 18, fontWeight: 700, color: token.colorPrimary }}>
                                    ¥{Number(startPrice).toLocaleString()}
                                  </div>
                                  <div style={{ fontSize: 12, color: token.colorTextSecondary }}>起拍价</div>
                                </div>
                              </Col>
                              <Col span={12}>
                                <div
                                  style={{
                                    textAlign: 'center',
                                    padding: 8,
                                    background: token.colorFill,
                                    borderRadius: 6,
                                  }}
                                >
                                  <div style={{ fontSize: 18, fontWeight: 700, color: '#cf1322' }}>
                                    ¥{Number(increment).toLocaleString()}
                                  </div>
                                  <div style={{ fontSize: 12, color: token.colorTextSecondary }}>加价幅度</div>
                                </div>
                              </Col>
                            </Row>

                            <Divider style={{ margin: '12px 0' }} />

                            {/* 提示 */}
                            <Tooltip title="拍卖师将按此起拍价开始竞拍,每次出价须为当前价加上加价幅度">
                              <div style={{ fontSize: 12, color: token.colorTextTertiary, lineHeight: 1.6 }}>
                                <InfoCircleOutlined style={{ marginRight: 4 }} />
                                {increment > 0
                                  ? `每次出价须在上一口价基础上增加 ¥${Number(increment).toLocaleString()} 或其倍数`
                                  : '请设置加价幅度,以保证竞拍正常进行'}
                              </div>
                            </Tooltip>
                          </>
                        );
                      }}
                    </Form.Item>
                  </div>
                </Card>
              </div>
            </Col>
          </Row>
        </Form>
      </Drawer>

      {/* 详情抽屉 */}
      <Drawer
        title="拍品详情"
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={820}
        destroyOnHidden
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
