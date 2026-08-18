import {
  ModalForm,
  ProFormText,
  ProFormDigit,
  ProFormSelect,
  ProFormDateTimeRangePicker,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { App, Button, Image, InputNumber, Popconfirm, Space, Switch, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import RefreshButton from '../../components/RefreshButton';
import { useTableRefresh } from '../../hooks/useTableRefresh';
import {
  createBanner,
  deleteBanner,
  getBannerList,
  updateBanner,
  updateBannerSort,
  updateBannerStatus,
  type BannerItem,
} from '../../services/content';

// Banner 展示位置选项
const POSITION_OPTIONS = [
  { label: '首页顶部', value: 'home_top' },
  { label: '首页中部', value: 'home_mid' },
  { label: '首页底部', value: 'home_bottom' },
];

// 位置编码 → 中文名称(用于列表展示)
const POSITION_LABEL: Record<string, string> = {
  home_top: '首页顶部',
  home_mid: '首页中部',
  home_bottom: '首页底部',
};

// Banner 管理:首页 Banner 图管理,支持上下架、排序、定时上下架
const ContentBanner = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canEdit = hasPermission(currentUser, 'content:edit');
  const actionRef = useRef<ActionType>();
  const { tableLoading, handleRefresh } = useTableRefresh(actionRef, { messageApi: message });

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<BannerItem | null>(null);

  // 打开新增弹窗
  const openCreate = () => {
    setEditing(null);
    setModalVisible(true);
  };

  // 打开编辑弹窗
  const openEdit = (record: BannerItem) => {
    setEditing(record);
    setModalVisible(true);
  };

  // 提交新增/编辑
  const handleSubmit = async (values: Record<string, unknown>) => {
    // ProFormDateTimeRangePicker 返回的是 [dayjs, dayjs] 或字符串数组,这里统一转毫秒时间戳
    const range = values.range as unknown as [dayjs.Dayjs | string, dayjs.Dayjs | string] | undefined;
    const startTime = range && range[0] ? dayjs(range[0]).valueOf() : null;
    const endTime = range && range[1] ? dayjs(range[1]).valueOf() : null;

    const payload = {
      title: values.title as string,
      image_url: values.image_url as string,
      link_url: (values.link_url as string) ?? '',
      position: (values.position as string) ?? 'home_top',
      sort_order: (values.sort_order as number) ?? 0,
      status: (values.status as number) ?? 1,
      start_time: startTime,
      end_time: endTime,
    };

    if (editing) {
      await updateBanner(editing.id, payload);
      message.success('更新成功');
    } else {
      await createBanner(payload);
      message.success('新增成功');
    }
    setModalVisible(false);
    handleRefresh();
    return true;
  };

  // 切换上下架
  const handleToggleStatus = async (record: BannerItem, checked: boolean) => {
    try {
      await updateBannerStatus(record.id, checked ? 1 : 0);
      message.success(checked ? '已上架' : '已下架');
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 调整排序
  const handleSortChange = async (record: BannerItem, value: number | null) => {
    if (value === null || value === record.sort_order) return;
    try {
      await updateBannerSort(record.id, value);
      message.success('排序已更新');
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 删除
  const handleDelete = async (record: BannerItem) => {
    try {
      await deleteBanner(record.id);
      message.success('删除成功');
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  const columns: ProColumns<BannerItem>[] = [
    { title: '序号', dataIndex: 'index', valueType: 'index', width: 60, hideInSearch: true },
    {
      title: '缩略图',
      dataIndex: 'image_url',
      width: 120,
      hideInSearch: true,
      render: (_, record) =>
        record.image_url ? (
          <Image width={100} height={40} src={record.image_url} fallback="" style={{ objectFit: 'cover', borderRadius: 4 }} />
        ) : (
          <Tag>无图片</Tag>
        ),
    },
    { title: '标题', dataIndex: 'title', width: 200, ellipsis: true },
    {
      title: '位置',
      dataIndex: 'position',
      width: 110,
      valueType: 'select',
      valueEnum: {
        home_top: { text: '首页顶部' },
        home_mid: { text: '首页中部' },
        home_bottom: { text: '首页底部' },
      },
      render: (_, record) => <Tag color="blue">{POSITION_LABEL[record.position] ?? record.position}</Tag>,
    },
    { title: '跳转链接', dataIndex: 'link_url', width: 180, ellipsis: true, hideInSearch: true },
    {
      title: '排序',
      dataIndex: 'sort_order',
      width: 110,
      hideInSearch: true,
      render: (_, record) =>
        canEdit ? (
          <InputNumber
            size="small"
            min={0}
            defaultValue={record.sort_order}
            onBlur={(e) => {
              const v = Number((e.target as HTMLInputElement).value);
              if (Number.isFinite(v)) handleSortChange(record, v);
            }}
            style={{ width: 80 }}
          />
        ) : (
          record.sort_order
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      valueEnum: { 1: { text: '上架' }, 0: { text: '下架' } },
      render: (_, record) =>
        canEdit ? (
          <Popconfirm
            title={record.status === 1 ? '确认下架该 Banner?' : '确认上架该 Banner?'}
            onConfirm={() => handleToggleStatus(record, record.status !== 1)}
          >
            <Switch checked={record.status === 1} checkedChildren="上架" unCheckedChildren="下架" />
          </Popconfirm>
        ) : (
          <Tag color={record.status === 1 ? 'green' : 'default'}>{record.status === 1 ? '上架' : '下架'}</Tag>
        ),
    },
    {
      title: '上架时段',
      dataIndex: 'range',
      width: 220,
      hideInSearch: true,
      render: (_, record) => {
        if (!record.start_time && !record.end_time) return <Tag>永久</Tag>;
        return (
          <span style={{ fontSize: 12, color: '#888' }}>
            {record.start_time ? dayjs(record.start_time).format('YYYY-MM-DD HH:mm') : '-'}
            {' ~ '}
            {record.end_time ? dayjs(record.end_time).format('YYYY-MM-DD HH:mm') : '-'}
          </span>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 160,
      hideInSearch: true,
      render: (_, record) => (record.created_at ? dayjs(record.created_at).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space>
          {canEdit && (
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          )}
          {canEdit && (
            <Popconfirm title="确认删除该 Banner?" onConfirm={() => handleDelete(record)}>
              <Button type="link" size="small" danger>
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
      <ProTable<BannerItem>
        headerTitle="Banner 列表"
        actionRef={actionRef}
        loading={tableLoading}
        rowKey="id"
        columns={columns}
        options={{ density: false, reload: false }}
        scroll={{ x: 1280 }}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          const { current, pageSize, title, status, position } = params;
          try {
            const res = await getBannerList({
              page: current,
              pageSize,
              title: title as string | undefined,
              status: status as number | string | undefined,
              position: position as string | undefined,
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
                  新增 Banner
                </Button>,
                <RefreshButton key="refresh" actionRef={actionRef as any} />,
              ]
            : [
                <RefreshButton key="refresh" actionRef={actionRef as any} />,
              ]
        }
        pagination={{
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          defaultPageSize: 10,
        }}
      />

      {/* 新增/编辑弹窗 */}
      <ModalForm
        title={editing ? '编辑 Banner' : '新增 Banner'}
        open={modalVisible}
        onOpenChange={setModalVisible}
        onFinish={handleSubmit}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        width={640}
        initialValues={
          editing
            ? {
                title: editing.title,
                image_url: editing.image_url,
                link_url: editing.link_url,
                position: editing.position,
                sort_order: editing.sort_order,
                status: editing.status,
                range:
                  editing.start_time || editing.end_time
                    ? [editing.start_time ? dayjs(editing.start_time) : null, editing.end_time ? dayjs(editing.end_time) : null]
                    : undefined,
              }
            : { position: 'home_top', sort_order: 0, status: 1 }
        }
      >
        <ProFormText
          name="title"
          label="标题"
          placeholder="请输入 Banner 标题"
          rules={[{ required: true, message: '请输入标题' }]}
        />
        <ProFormText
          name="image_url"
          label="图片 URL"
          placeholder="请输入图片地址(图片上传占位,直接粘贴 URL 即可)"
          rules={[{ required: true, message: '请输入图片 URL' }]}
          extra="图片上传功能尚未接入,目前直接填写图片 URL"
        />
        <ProFormText name="link_url" label="跳转链接" placeholder="如 /competition/list 或 https://..." />
        <ProFormSelect
          name="position"
          label="展示位置"
          options={POSITION_OPTIONS}
          rules={[{ required: true, message: '请选择位置' }]}
        />
        <ProFormDigit name="sort_order" label="排序" min={0} fieldProps={{ precision: 0 }} extra="数值越小越靠前" />
        <ProFormSelect
          name="status"
          label="状态"
          options={[
            { label: '上架', value: 1 },
            { label: '下架', value: 0 },
          ]}
        />
        <ProFormDateTimeRangePicker
          name="range"
          label="上架时段"
          placeholder={['开始时间(可空)', '结束时间(可空)']}
          extra="留空表示永久有效;仅下架时段外不会自动生效"
        />
      </ModalForm>
    </>
  );
};

export default ContentBanner;
