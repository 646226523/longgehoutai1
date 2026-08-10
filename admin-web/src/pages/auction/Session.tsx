import {
  DrawerForm,
  ProFormDateTimePicker,
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
  Popconfirm,
  Space,
  Tag,
} from 'antd';
import {
  ArrowRightOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ProfileOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import {
  createAuctionSession,
  deleteAuctionSession,
  getAuctionSessionDetail,
  getAuctionSessions,
  transitionAuctionSession,
  updateAuctionSession,
  type AuctionSession,
} from '../../services/auction';

// 场次状态选项
const STATUS_OPTIONS = [
  { label: '草稿', value: 'draft' },
  { label: '未开始', value: 'pending' },
  { label: '进行中', value: 'ongoing' },
  { label: '已结束', value: 'ended' },
  { label: '已取消', value: 'cancelled' },
];

// 状态标签颜色映射
const STATUS_COLOR: Record<string, string> = {
  draft: 'default',
  pending: 'processing',
  ongoing: 'success',
  ended: 'blue',
  cancelled: 'error',
};

// 状态中文映射
const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  pending: '未开始',
  ongoing: '进行中',
  ended: '已结束',
  cancelled: '已取消',
};

// 拍卖场次管理:列表 + 新增/编辑 + 状态流转 + 进入拍品/成交入口
const AuctionSession = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canEdit = hasPermission(currentUser, 'auction:edit');
  const canDeal = hasPermission(currentUser, 'auction:deal');
  const actionRef = useRef<ActionType>();
  const navigate = useNavigate();

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editing, setEditing] = useState<AuctionSession | null>(null);

  // 详情抽屉
  const [detailVisible, setDetailVisible] = useState(false);
  const [detail, setDetail] = useState<AuctionSession | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setDrawerVisible(true);
  };

  const openEdit = (record: AuctionSession) => {
    setEditing(record);
    setDrawerVisible(true);
  };

  const openDetail = async (record: AuctionSession) => {
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const res = await getAuctionSessionDetail(record.id);
      setDetail(res);
    } catch {
      // 拦截器已提示错误
    } finally {
      setDetailLoading(false);
    }
  };

  // 提交新增/编辑
  const handleSubmit = async (values: Record<string, unknown>) => {
    const startTime = values.start_time
      ? dayjs(values.start_time as string).valueOf()
      : null;
    const endTime = values.end_time ? dayjs(values.end_time as string).valueOf() : null;
    const payload = {
      name: values.name as string,
      start_time: startTime,
      end_time: endTime,
      location: (values.location as string) ?? undefined,
      description: (values.description as string) ?? undefined,
    };
    if (editing) {
      await updateAuctionSession(editing.id, payload);
      message.success('更新成功');
    } else {
      await createAuctionSession(payload);
      message.success('场次创建成功');
    }
    setDrawerVisible(false);
    actionRef.current?.reload();
    return true;
  };

  // 状态流转
  const handleTransition = async (record: AuctionSession, next: string) => {
    try {
      await transitionAuctionSession(record.id, next);
      message.success(`场次已${STATUS_LABEL[next] ?? next}`);
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 删除
  const handleDelete = async (record: AuctionSession) => {
    try {
      await deleteAuctionSession(record.id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示错误
    }
  };

  const columns: ProColumns<AuctionSession>[] = [
    { title: '场次名称', dataIndex: 'name', width: 220, ellipsis: true },
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
      title: '拍品数',
      dataIndex: 'item_count',
      width: 80,
      hideInSearch: true,
      render: (_, record) => record.item_count ?? 0,
    },
    {
      title: '成交数',
      dataIndex: 'deal_count',
      width: 80,
      hideInSearch: true,
      render: (_, record) => record.deal_count ?? 0,
    },
    {
      title: '开始时间',
      dataIndex: 'start_time',
      width: 160,
      hideInSearch: true,
      render: (_, record) =>
        record.start_time ? dayjs(record.start_time).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '结束时间',
      dataIndex: 'end_time',
      width: 160,
      hideInSearch: true,
      render: (_, record) =>
        record.end_time ? dayjs(record.end_time).format('YYYY-MM-DD HH:mm') : '-',
    },
    { title: '地点', dataIndex: 'location', width: 140, ellipsis: true, hideInSearch: true },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 160,
      hideInSearch: true,
      render: (_, record) => dayjs(record.created_at).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 320,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space size={0} wrap>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>
            详情
          </Button>
          {canEdit && record.status !== 'ended' && record.status !== 'cancelled' && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
              编辑
            </Button>
          )}
          {canEdit && (
            <Button
              type="link"
              size="small"
              icon={<ProfileOutlined />}
              onClick={() => navigate(`/auction/items/${record.id}`)}
            >
              拍品
            </Button>
          )}
          {canEdit && record.status === 'draft' && (
            <Popconfirm title="确认发布场次为未开始?" onConfirm={() => handleTransition(record, 'pending')}>
              <Button type="link" size="small" icon={<ArrowRightOutlined />}>
                发布
              </Button>
            </Popconfirm>
          )}
          {canEdit && record.status === 'pending' && (
            <Popconfirm title="确认开始拍卖?" onConfirm={() => handleTransition(record, 'ongoing')}>
              <Button type="link" size="small" icon={<ArrowRightOutlined />}>
                开始
              </Button>
            </Popconfirm>
          )}
          {canEdit && record.status === 'ongoing' && (
            <Popconfirm
              title="确认结束拍卖?将自动按最高出价生成成交单。"
              onConfirm={() => handleTransition(record, 'ended')}
            >
              <Button type="link" size="small" icon={<ArrowRightOutlined />}>
                结束
              </Button>
            </Popconfirm>
          )}
          {canDeal && (record.status === 'ongoing' || record.status === 'ended') && (
            <Button
              type="link"
              size="small"
              onClick={() => navigate(`/auction/deal?session_id=${record.id}`)}
            >
              成交
            </Button>
          )}
          {canEdit &&
            record.status !== 'ended' &&
            record.status !== 'cancelled' &&
            record.status !== 'draft' && (
              <Popconfirm title="确认取消场次?" onConfirm={() => handleTransition(record, 'cancelled')}>
                <Button type="link" size="small" danger icon={<StopOutlined />}>
                  取消
                </Button>
              </Popconfirm>
            )}
          {canEdit && (record.status === 'draft' || record.status === 'cancelled') && (
            <Popconfirm title="确认删除该场次?" onConfirm={() => handleDelete(record)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <ProTable<AuctionSession>
        headerTitle="拍卖场次列表"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        options={{ density: false }}
        scroll={{ x: 1500 }}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          const { current, pageSize, name, status } = params;
          try {
            const res = await getAuctionSessions({
              page: current,
              pageSize,
              name: name as string | undefined,
              status: status as string | undefined,
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
                  新增场次
                </Button>,
              ]
            : []
        }
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />

      {/* 新增/编辑抽屉 */}
      <DrawerForm
        title={editing ? '编辑拍卖场次' : '新增拍卖场次'}
        open={drawerVisible}
        onOpenChange={setDrawerVisible}
        onFinish={handleSubmit}
        drawerProps={{ destroyOnClose: true, maskClosable: false, width: 560 }}
        initialValues={
          editing
            ? {
                name: editing.name,
                start_time: editing.start_time
                  ? dayjs(editing.start_time).format('YYYY-MM-DD HH:mm:ss')
                  : undefined,
                end_time: editing.end_time
                  ? dayjs(editing.end_time).format('YYYY-MM-DD HH:mm:ss')
                  : undefined,
                location: editing.location ?? undefined,
                description: editing.description ?? undefined,
              }
            : {}
        }
      >
        <ProFormText
          name="name"
          label="场次名称"
          placeholder="请输入场次名称"
          rules={[{ required: true, message: '请输入场次名称' }]}
        />
        <ProFormDateTimePicker
          name="start_time"
          label="开始时间"
          placeholder="请选择开始时间"
          fieldProps={{ style: { width: '100%' } }}
        />
        <ProFormDateTimePicker
          name="end_time"
          label="结束时间"
          placeholder="请选择结束时间(须晚于开始时间)"
          fieldProps={{ style: { width: '100%' } }}
        />
        <ProFormText name="location" label="拍卖地点" placeholder="请输入拍卖地点" />
        <ProFormTextArea
          name="description"
          label="场次描述"
          placeholder="请输入场次描述"
          fieldProps={{ autoSize: { minRows: 2, maxRows: 5 } }}
        />
      </DrawerForm>

      {/* 详情抽屉 */}
      <Drawer
        title="拍卖场次详情"
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={720}
        destroyOnClose
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>加载中...</div>
        ) : !detail ? (
          <div style={{ textAlign: 'center', padding: 48 }}>暂无数据</div>
        ) : (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="场次名称" span={2}>
              {detail.name}
            </Descriptions.Item>
            <Descriptions.Item label="场次 ID">{detail.id}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={STATUS_COLOR[detail.status] ?? 'default'}>
                {STATUS_LABEL[detail.status] ?? detail.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="开始时间">
              {detail.start_time ? dayjs(detail.start_time).format('YYYY-MM-DD HH:mm:ss') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="结束时间">
              {detail.end_time ? dayjs(detail.end_time).format('YYYY-MM-DD HH:mm:ss') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="拍品数">{detail.item_count ?? 0}</Descriptions.Item>
            <Descriptions.Item label="成交数">{detail.deal_count ?? 0}</Descriptions.Item>
            <Descriptions.Item label="拍卖地点" span={2}>
              {detail.location || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="场次描述" span={2}>
              {detail.description || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(detail.created_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {dayjs(detail.updated_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </>
  );
};

export default AuctionSession;
