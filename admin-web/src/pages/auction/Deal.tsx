import {
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  App,
  Button,
  Descriptions,
  Drawer,
  Popconfirm,
  Space,
  Spin,
  Tag,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
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
        .then((res) => setSessionOptions(res.list))
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
      actionRef.current?.reload();
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
      actionRef.current?.reload();
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
      actionRef.current?.reload();
      if (detail?.id === record.id) openDetail(record);
    } catch {
      // 拦截器已提示错误
    }
  };

  const columns: ProColumns<AuctionDeal>[] = [
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
        onDropdownVisibleChange: (open: boolean) => {
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
        rowKey="id"
        columns={columns}
        options={{ density: false }}
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
            return { data: res.list, success: true, total: res.total };
          } catch {
            return { data: [], success: false, total: 0 };
          }
        }}
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />

      {/* 详情抽屉 */}
      <Drawer
        title="成交单详情"
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={720}
        destroyOnClose
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin tip="加载中...">
              <div style={{ minHeight: 200, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
            </Spin>
          </div>
        ) : !detail ? (
          <div style={{ textAlign: 'center', padding: 48 }}>暂无数据</div>
        ) : (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="成交单号" span={2}>
              #{detail.id}
            </Descriptions.Item>
            <Descriptions.Item label="所属场次" span={2}>
              {detail.session_name ?? `场次 #${detail.session_id}`}
            </Descriptions.Item>
            <Descriptions.Item label="拍品" span={2}>
              {detail.item_name ?? `拍品 #${detail.item_id}`}
            </Descriptions.Item>
            <Descriptions.Item label="卖家">{detail.seller}</Descriptions.Item>
            <Descriptions.Item label="买家">{detail.buyer ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="成交价">¥{detail.final_price}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={STATUS_COLOR[detail.status] ?? 'default'}>
                {STATUS_LABEL[detail.status] ?? detail.status}
              </Tag>
            </Descriptions.Item>
            {detail.nft_asset && (
              <Descriptions.Item label="关联 NFT 资产" span={2}>
                {detail.nft_asset.name}
                {detail.nft_asset.token_id ? ` (${detail.nft_asset.token_id})` : ''}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="成交时间">
              {detail.deal_time ? dayjs(detail.deal_time).format('YYYY-MM-DD HH:mm:ss') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="付款时间">
              {detail.paid_time ? dayjs(detail.paid_time).format('YYYY-MM-DD HH:mm:ss') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="交割时间" span={2}>
              {detail.delivered_at
                ? dayjs(detail.delivered_at).format('YYYY-MM-DD HH:mm:ss')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间" span={2}>
              {dayjs(detail.created_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </>
  );
};

export default AuctionDeal;
