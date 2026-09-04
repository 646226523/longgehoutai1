import {
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  App,
  Button,
  Card,
  Drawer,
  Empty,
  Image,
  Popconfirm,
  Space,
  Spin,
  Steps,
  Tag,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  TrophyOutlined,
  TruckOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useTableRefresh } from '../../hooks/useTableRefresh';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import RefreshButton from '../../components/RefreshButton';
import {
  cancelAuctionDeal,
  confirmDealDelivery,
  confirmDealPayment,
  getAuctionDealDetail,
  getAuctionDeals,
  getAuctionSessions,
  type AuctionDeal,
  type AuctionSession,
} from '../../services/auction';

// 成交单状态选项
const STATUS_OPTIONS = [
  { label: '待付款', value: 'pending_payment' },
  { label: '已付款', value: 'paid' },
  { label: '待交割', value: 'delivering' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
];

// 状态标签颜色映射
const STATUS_COLOR: Record<string, string> = {
  pending_payment: 'warning',
  paid: 'processing',
  delivering: 'gold',
  completed: 'success',
  cancelled: 'error',
};

// 状态中文映射
const STATUS_LABEL: Record<string, string> = {
  pending_payment: '待付款',
  paid: '已付款',
  delivering: '待交割',
  completed: '已完成',
  cancelled: '已取消',
};

// 拍卖成交管理:列表 + 状态流转操作 + 详情抽屉
const AuctionDeal = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canDeal = hasPermission(currentUser, 'auction:deal');
  const actionRef = useRef<ActionType>();
  const { tableLoading, handleRefresh } = useTableRefresh(actionRef, { messageApi: message });
  const [searchParams] = useSearchParams();
  const initialSessionId = searchParams.get('session_id');

  const [detailVisible, setDetailVisible] = useState(false);
  const [detail, setDetail] = useState<AuctionDeal | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sessionOptions, setSessionOptions] = useState<AuctionSession[]>([]);


  // 加载场次选项(用于筛选)
  const loadSessionOptions = () => {
    if (!sessionOptions.length) {
      getAuctionSessions({ page: 1, pageSize: 100 })
        .then((res) => setSessionOptions(res?.list ?? []))
        .catch(() => {
          // 拦截器已提示错误
        });
    }
  };

  const openDetail = async (record: AuctionDeal) => {
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const res = await getAuctionDealDetail(record.id);
      setDetail(res);
    } catch {
      // 拦截器已提示错误
    } finally {
      setDetailLoading(false);
    }
  };

  // 确认付款
  const handleConfirmPayment = async (record: AuctionDeal) => {
    try {
      await confirmDealPayment(record.id);
      message.success('已确认付款');
      handleRefresh();
      if (detail?.id === record.id) openDetail(record);
    } catch {
      // 拦截器已提示错误
    }
  };

  // 确认交割
  const handleConfirmDelivery = async (record: AuctionDeal) => {
    try {
      await confirmDealDelivery(record.id);
      message.success('交割状态已推进');
      handleRefresh();
      if (detail?.id === record.id) openDetail(record);
    } catch {
      // 拦截器已提示错误
    }
  };

  // 取消成交
  const handleCancel = async (record: AuctionDeal) => {
    try {
      await cancelAuctionDeal(record.id);
      message.success('成交已取消');
      handleRefresh();
      if (detail?.id === record.id) openDetail(record);
    } catch {
      // 拦截器已提示错误
    }
  };

  const columns: ProColumns<AuctionDeal>[] = [
    { title: '序号', dataIndex: 'index', valueType: 'index', width: 60, hideInSearch: true },
    {
      title: '成交单号',
      dataIndex: 'id',
      width: 90,
      hideInSearch: true,
      render: (_, record) => `#${record.id}`,
    },
    {
      title: '所属场次',
      dataIndex: 'session_id',
      width: 180,
      ellipsis: true,
      valueType: 'select',
      valueEnum: sessionOptions.reduce(
        (acc, cur) => ({ ...acc, [cur.id]: { text: cur.name } }),
        {} as Record<number, { text: string }>
      ),
      fieldProps: {
        showSearch: true,
        onOpenChange: (open: boolean) => {
          if (open) loadSessionOptions();
        },
      },
      render: (_, record) => record.session_name ?? `场次 #${record.session_id}`,
    },
    {
      title: '拍品',
      dataIndex: 'item_name',
      width: 180,
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => record.item_name ?? `拍品 #${record.item_id}`,
    },
    { title: '卖家', dataIndex: 'seller', width: 110, ellipsis: true, hideInSearch: true },
    { title: '买家', dataIndex: 'buyer', width: 110, ellipsis: true, hideInSearch: true },
    {
      title: '成交价',
      dataIndex: 'final_price',
      width: 110,
      hideInSearch: true,
      render: (_, record) => `¥${record.final_price}`,
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
      title: '买家/卖家',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '买家/卖家关键字' },
    },
    {
      title: '成交时间',
      dataIndex: 'deal_time',
      width: 160,
      hideInSearch: true,
      render: (_, record) =>
        record.deal_time ? dayjs(record.deal_time).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 260,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space size={0} wrap>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>
            详情
          </Button>
          {canDeal && record.status === 'pending_payment' && (
            <Popconfirm title="确认已收到付款?" onConfirm={() => handleConfirmPayment(record)}>
              <Button type="link" size="small" icon={<CheckCircleOutlined />}>
                确认付款
              </Button>
            </Popconfirm>
          )}
          {canDeal && (record.status === 'paid' || record.status === 'delivering') && (
            <Popconfirm
              title={record.status === 'paid' ? '确认进入交割阶段?' : '确认完成交割?'}
              onConfirm={() => handleConfirmDelivery(record)}
            >
              <Button type="link" size="small" icon={<TruckOutlined />}>
                {record.status === 'paid' ? '开始交割' : '完成交割'}
              </Button>
            </Popconfirm>
          )}
          {canDeal &&
            ['pending_payment', 'paid', 'delivering'].includes(record.status) && (
              <Popconfirm title="确认取消该成交?拍品将回退为流拍。" onConfirm={() => handleCancel(record)}>
                <Button type="link" size="small" danger icon={<CloseCircleOutlined />}>
                  取消
                </Button>
              </Popconfirm>
            )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <ProTable<AuctionDeal>
        headerTitle="拍卖成交列表"
        actionRef={actionRef}
        loading={tableLoading}
        rowKey="id"
        columns={columns}
        options={{ density: false, reload: false }}
        scroll={{ x: 1400 }}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          const { current, pageSize, session_id, status, keyword } = params;
          try {
            const res = await getAuctionDeals({
              page: current,
              pageSize,
              session_id: (session_id as number | undefined) ?? (initialSessionId ? Number(initialSessionId) : undefined),
              status: status as string | undefined,
              keyword: keyword as string | undefined,
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
        toolBarRender={() => [<RefreshButton key="refresh" actionRef={actionRef as any} />]}
      />

      {/* 详情抽屉 - 方案 B 卡片网格布局 */}
      <Drawer
        title={
          <Space>
            <span>成交单详情</span>
            {detail && (
              <Tag color={STATUS_COLOR[detail.status] ?? 'default'}>
                {detail.status_label}
              </Tag>
            )}
          </Space>
        }
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={800}
        destroyOnHidden
        styles={{ body: { padding: 0, background: '#f5f7fa' } }}
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <Spin tip="加载成交单详情..." />
          </div>
        ) : !detail ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <Empty description="暂无成交单数据" />
          </div>
        ) : (
          <div style={{ padding: 16 }}>
            {/* ===== 顶部拍品大卡片 ===== */}
            <Card
              size="small"
              bordered={false}
              style={{ marginBottom: 16, borderRadius: 10 }}
              bodyStyle={{ padding: 0 }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 8,
                    overflow: 'hidden',
                    background: '#f0f2f5',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {detail.item_image ? (
                    <Image
                      src={detail.item_image ?? ''}
                      alt={detail.item_name ?? ''}
                      width={96}
                      height={96}
                      style={{ objectFit: 'cover' }}
                      preview={{ mask: '查看大图' }}
                    />
                  ) : (
                    <div style={{ fontSize: 36, opacity: 0.35 }}>📦</div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Typography.Title
                    level={5}
                    style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    {detail.item_name}
                    <Tag color="blue">拍品 #{detail.item_id}</Tag>
                  </Typography.Title>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#8b949e',
                      marginBottom: 8,
                      display: 'flex',
                      gap: 16,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>🏛️ {detail.session_name ?? `场次 #${detail.session_id}`}</span>
                    {detail.item_increment != null && <span>📈 加价幅度 ¥{detail.item_increment}</span>}
                    <span>🎟️ 成交单 #{detail.id}</span>
                  </div>
                  {detail.item_description && (
                    <div
                      style={{
                        fontSize: 12,
                        color: '#57606a',
                        background: '#f6f8fa',
                        padding: '6px 10px',
                        borderRadius: 4,
                        marginBottom: 8,
                        lineHeight: 1.6,
                      }}
                    >
                      {detail.item_description}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                    <span style={{ fontSize: 24, fontWeight: 700, color: '#ff4d4f' }}>
                      ¥{detail.final_price.toLocaleString()}
                    </span>
                    {detail.item_start_price != null && detail.item_start_price > 0 && (
                      <>
                        <span style={{ fontSize: 12, color: '#8b949e' }}>
                          起拍 ¥{detail.item_start_price.toLocaleString()}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            color:
                              detail.final_price >= detail.item_start_price ? '#52c41a' : '#ff4d4f',
                            fontWeight: 600,
                          }}
                        >
                          {detail.final_price >= detail.item_start_price ? '+' : ''}
                          {(
                            ((detail.final_price - detail.item_start_price) /
                              detail.item_start_price) *
                            100
                          ).toFixed(0)}
                          %
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <Tag
                    color={STATUS_COLOR[detail.status] ?? 'default'}
                    style={{ fontSize: 13, padding: '4px 12px', marginBottom: 10 }}
                  >
                    {detail.status_label}
                  </Tag>
                  <div style={{ fontSize: 11, color: '#8b949e' }}>
                    <div>
                      成交于
                      <br />
                      {detail.deal_time
                        ? dayjs(detail.deal_time).format('YYYY-MM-DD HH:mm')
                        : '-'}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* ===== 2x2 卡片网格 ===== */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginBottom: 16,
              }}
            >
              {/* 左上: 交易双方 */}
              <Card
                size="small"
                title={
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    <UserOutlined /> 交易双方
                  </span>
                }
                bordered={false}
                style={{ borderRadius: 10 }}
              >
                <div style={{ fontSize: 13 }}>
                  <div style={{ padding: '8px 0', borderBottom: '1px solid #f0f2f5' }}>
                    <div style={{ color: '#8b949e', fontSize: 11, marginBottom: 4 }}>卖家</div>
                    <div style={{ fontWeight: 600 }}>{detail.seller}</div>
                  </div>
                  <div style={{ padding: '8px 0', borderBottom: '1px solid #f0f2f5' }}>
                    <div style={{ color: '#8b949e', fontSize: 11, marginBottom: 4 }}>买家</div>
                    <div style={{ fontWeight: 600 }}>{detail.buyer ?? '-'}</div>
                  </div>
                  <div style={{ padding: '8px 0' }}>
                    <div style={{ color: '#8b949e', fontSize: 11, marginBottom: 4 }}>NFT 资产</div>
                    <div>
                      {detail.nft_asset ? (
                        <span>
                          <Tag color="purple" style={{ marginRight: 6 }}>
                            #{detail.nft_asset.token_id ?? '—'}
                          </Tag>
                          {detail.nft_asset.name}
                        </span>
                      ) : (
                        <span style={{ color: '#8b949e' }}>— 未关联 —</span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              {/* 右上: 状态时间线 */}
              <Card
                size="small"
                title={
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    <CheckCircleOutlined /> 成交状态
                  </span>
                }
                bordered={false}
                style={{ borderRadius: 10 }}
                bodyStyle={{ padding: '16px 16px 4px' }}
              >
                {detail.timeline && detail.timeline.length > 0 ? (
                  <Steps
                    direction="vertical"
                    size="small"
                    current={detail.timeline.findIndex((s) => s.current) >= 0
                      ? detail.timeline.findIndex((s) => s.current)
                      : detail.timeline.findIndex((s) => s.done)}
                    status={detail.status === 'cancelled' ? 'error' : 'process'}
                    items={detail.timeline.map((step) => ({
                      title: (
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: 13,
                            color: step.current ? '#1677ff' : 'inherit',
                          }}
                        >
                          {step.label}
                        </span>
                      ),
                      description: step.time ? (
                        <span style={{ fontSize: 11, color: '#8b949e' }}>
                          {dayjs(step.time).format('MM-DD HH:mm')}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: '#d0d7de' }}>—</span>
                      ),
                    }))}
                  />
                ) : (
                  <div style={{ color: '#8b949e', fontSize: 12 }}>暂无时间线数据</div>
                )}
              </Card>

              {/* 左下: 竞价记录 */}
              <Card
                size="small"
                title={
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    <TrophyOutlined /> 竞价记录
                    {detail.bid_count != null && (
                      <span style={{ color: '#8b949e', fontSize: 12, fontWeight: 400, marginLeft: 6 }}>
                        ({detail.bid_count} 次)
                      </span>
                    )}
                  </span>
                }
                bordered={false}
                style={{ borderRadius: 10 }}
                bodyStyle={{ padding: '8px 16px 12px' }}
              >
                {detail.bids && detail.bids.length > 0 ? (
                  <div>
                    {detail.bids.slice(0, 5).map((b, idx) => (
                      <div
                        key={b.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '7px 0',
                          borderBottom: idx < detail.bids!.length - 1 ? '1px solid #f0f2f5' : 'none',
                          fontSize: 12.5,
                        }}
                      >
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            background:
                              idx === 0
                                ? '#fff7e6'
                                : idx === 1
                                ? '#f6f8fa'
                                : '#f6f8fa',
                            color: idx < 2 ? '#d48806' : '#8b949e',
                            fontSize: 10,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 10,
                            flexShrink: 0,
                          }}
                        >
                          {idx + 1}
                        </span>
                        <span style={{ flex: 1, fontWeight: idx === 0 ? 600 : 400 }}>
                          {b.bidder}
                        </span>
                        <span
                          style={{
                            fontWeight: 600,
                            color: idx === 0 ? '#ff4d4f' : '#1f2328',
                            marginRight: 12,
                          }}
                        >
                          ¥{b.bid_amount.toLocaleString()}
                        </span>
                        <span style={{ color: '#8b949e', fontSize: 11 }}>
                          {dayjs(b.created_at).format('HH:mm:ss')}
                        </span>
                      </div>
                    ))}
                    {detail.bids.length > 5 && (
                      <div
                        style={{
                          textAlign: 'center',
                          paddingTop: 6,
                          color: '#1677ff',
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        还有 {detail.bids.length - 5} 条竞价记录 →
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ color: '#8b949e', fontSize: 12, padding: '10px 0' }}>
                    暂无竞价记录
                  </div>
                )}
              </Card>

              {/* 右下: 快捷操作 */}
              <Card
                size="small"
                title={
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    🎯 快捷操作
                  </span>
                }
                bordered={false}
                style={{ borderRadius: 10 }}
                bodyStyle={{ padding: '12px 16px 16px' }}
              >
                {canDeal && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {detail.status === 'pending_payment' && (
                      <Popconfirm
                        title="确认已收到付款？"
                        description="此操作将成交单推进到「已付款」阶段"
                        onConfirm={() => {
                          handleConfirmPayment(detail);
                        }}
                      >
                        <Button
                          type="primary"
                          block
                          icon={<CheckCircleOutlined />}
                        >
                          确认已付款
                        </Button>
                      </Popconfirm>
                    )}
                    {(detail.status === 'pending_payment' ||
                      detail.status === 'paid' ||
                      detail.status === 'delivering') && (
                      <Popconfirm
                        title={
                          detail.status === 'pending_payment'
                            ? '成交单尚未付款,确定取消?'
                            : detail.status === 'paid'
                            ? '确认进入交割阶段?'
                            : '确认已完成交割?'
                        }
                        onConfirm={() => {
                          if (detail.status === 'pending_payment') {
                            handleCancel(detail);
                          } else {
                            handleConfirmDelivery(detail);
                          }
                        }}
                      >
                        {detail.status === 'pending_payment' ? (
                          <Button danger block icon={<CloseCircleOutlined />}>
                            取消成交（拍品流拍）
                          </Button>
                        ) : (
                          <Button block icon={<TruckOutlined />}>
                            {detail.status === 'paid' ? '🚚 开始交割' : '✅ 完成交割'}
                          </Button>
                        )}
                      </Popconfirm>
                    )}
                    {detail.status === 'completed' && (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '12px 0',
                          color: '#52c41a',
                          fontSize: 13,
                        }}
                      >
                        ✅ 已完成交割
                      </div>
                    )}
                    {detail.status === 'cancelled' && (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '12px 0',
                          color: '#ff4d4f',
                          fontSize: 13,
                        }}
                      >
                        ✗ 成交已取消
                      </div>
                    )}
                    {detail.status === 'pending_payment' ||
                    detail.status === 'paid' ||
                    detail.status === 'delivering' ? null : (
                      <div style={{ height: 12 }} />
                    )}
                  </div>
                )}
                {!canDeal && (
                  <div style={{ color: '#8b949e', fontSize: 12, padding: '10px 0' }}>
                    无操作权限
                  </div>
                )}
                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 10,
                    borderTop: '1px solid #f0f2f5',
                    fontSize: 11,
                    color: '#8b949e',
                  }}
                >
                  <div>创建时间: {dayjs(detail.created_at).format('YYYY-MM-DD HH:mm:ss')}</div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
};

export default AuctionDeal;
