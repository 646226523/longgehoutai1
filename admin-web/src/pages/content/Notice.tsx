import {
  ModalForm,
  ProFormText,
  ProFormSelect,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { Button, Popconfirm, Space, Tag, Input } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useAntdApp } from '../../hooks/useAntdApp';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import {
  createNotice,
  deleteNotice,
  getNoticeList,
  publishNotice,
  updateNotice,
  type NoticeItem,
  type NoticeSaveParams,
} from '../../services/content';

// 类型映射
const TYPE_MAP: Record<string, { text: string; color: string }> = {
  system: { text: '系统', color: 'blue' },
  activity: { text: '活动', color: 'green' },
  maintenance: { text: '维护', color: 'orange' },
};

// 推送对象映射
const PUSH_TARGET_MAP: Record<string, string> = {
  all: '全部用户',
  level: '按会员等级',
};

// 公告与推送管理:支持草稿/发布、按类型筛选
const ContentNotice = () => {
  const { message } = useAntdApp();
  const currentUser = useCurrentUser();
  const canEdit = hasPermission(currentUser, 'content:edit');
  const actionRef = useRef<ActionType>();

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<NoticeItem | null>(null);
  // 公告内容(Input.TextArea 受控,便于编辑纯文本或 HTML)
  const [content, setContent] = useState<string>('');

  // 打开新增弹窗
  const openCreate = () => {
    setEditing(null);
    setContent('');
    setModalVisible(true);
  };

  // 打开编辑弹窗
  const openEdit = (record: NoticeItem) => {
    setEditing(record);
    setContent(record.content ?? '');
    setModalVisible(true);
  };

  // 提交新增/编辑
  const handleSubmit = async (values: Record<string, unknown>) => {
    if (!content.trim()) {
      message.error('公告内容不能为空');
      return false;
    }
    const payload: NoticeSaveParams = {
      title: values.title as string,
      content,
      type: (values.type as 'system' | 'activity' | 'maintenance') ?? 'system',
      status: (values.status as 'draft' | 'published') ?? 'draft',
      push_target: (values.push_target as string) ?? 'all',
    };

    if (editing) {
      await updateNotice(editing.id, payload);
      message.success('更新成功');
    } else {
      await createNotice(payload);
      message.success('新增成功');
    }
    setModalVisible(false);
    actionRef.current?.reload();
    return true;
  };

  // 发布
  const handlePublish = async (record: NoticeItem) => {
    try {
      await publishNotice(record.id);
      message.success('发布成功');
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 删除
  const handleDelete = async (record: NoticeItem) => {
    try {
      await deleteNotice(record.id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示错误
    }
  };

  const columns: ProColumns<NoticeItem>[] = [
    { title: '标题', dataIndex: 'title', width: 240, ellipsis: true },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      valueType: 'select',
      valueEnum: {
        system: { text: '系统' },
        activity: { text: '活动' },
        maintenance: { text: '维护' },
      },
      render: (_, record) => {
        const t = TYPE_MAP[record.type] ?? { text: record.type, color: 'default' };
        return <Tag color={t.color}>{t.text}</Tag>;
      },
    },
    {
      title: '推送对象',
      dataIndex: 'push_target',
      width: 120,
      hideInSearch: true,
      render: (_, record) => <span>{PUSH_TARGET_MAP[record.push_target] ?? record.push_target}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      valueEnum: {
        draft: { text: '草稿' },
        published: { text: '已发布' },
      },
      render: (_, record) => (
        <Tag color={record.status === 'published' ? 'green' : 'default'}>
          {record.status === 'published' ? '已发布' : '草稿'}
        </Tag>
      ),
    },
    {
      title: '内容',
      dataIndex: 'content',
      width: 280,
      hideInSearch: true,
      ellipsis: true,
      render: (_, record) => (
        <span
          style={{ color: '#666' }}
          // 公告内容可能含 HTML,纯展示时取纯文本预览
          dangerouslySetInnerHTML={{
            __html: record.content
              ? record.content.length > 60
                ? record.content.slice(0, 60) + '...'
                : record.content
              : '-',
          }}
        />
      ),
    },
    {
      title: '发布时间',
      dataIndex: 'published_at',
      width: 160,
      hideInSearch: true,
      render: (_, record) => (record.published_at ? dayjs(record.published_at).format('YYYY-MM-DD HH:mm:ss') : '-'),
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
      width: 200,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space>
          {canEdit && (
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          )}
          {canEdit && record.status !== 'published' && (
            <Popconfirm title="确认发布该公告?" onConfirm={() => handlePublish(record)}>
              <Button type="link" size="small">
                发布
              </Button>
            </Popconfirm>
          )}
          {canEdit && (
            <Popconfirm title="确认删除该公告?" onConfirm={() => handleDelete(record)}>
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
      <ProTable<NoticeItem>
        headerTitle="公告列表"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        options={{ density: false }}
        scroll={{ x: 1280 }}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          const { current, pageSize, title, type, status } = params;
          try {
            const res = await getNoticeList({
              page: current,
              pageSize,
              title: title as string | undefined,
              type: type as string | undefined,
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
                  新增公告
                </Button>,
              ]
            : []
        }
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />

      {/* 新增/编辑弹窗 */}
      <ModalForm
        title={editing ? '编辑公告' : '新增公告'}
        open={modalVisible}
        onOpenChange={setModalVisible}
        onFinish={handleSubmit}
        modalProps={{ destroyOnClose: true, maskClosable: false }}
        width={640}
        initialValues={
          editing
            ? {
                title: editing.title,
                type: editing.type,
                status: editing.status,
                push_target: editing.push_target,
              }
            : { type: 'system', status: 'draft', push_target: 'all' }
        }
      >
        <ProFormText
          name="title"
          label="公告标题"
          placeholder="请输入公告标题"
          rules={[{ required: true, message: '请输入标题' }]}
        />
        <ProFormSelect
          name="type"
          label="类型"
          options={[
            { label: '系统', value: 'system' },
            { label: '活动', value: 'activity' },
            { label: '维护', value: 'maintenance' },
          ]}
        />
        <ProFormSelect
          name="status"
          label="状态"
          options={[
            { label: '草稿', value: 'draft' },
            { label: '已发布', value: 'published' },
          ]}
          extra="选择「已发布」将立即发布并记录发布时间"
        />
        <ProFormSelect
          name="push_target"
          label="推送对象"
          options={[
            { label: '全部用户', value: 'all' },
            { label: '按会员等级', value: 'level' },
          ]}
        />
        {/* 公告内容:用 Input.TextArea 占位,可输入纯文本或 HTML */}
        <div style={{ marginBottom: 4, color: '#666' }}>公告内容</div>
        <Input.TextArea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          placeholder="请输入公告内容(支持纯文本或简单 HTML)"
          maxLength={2000}
          showCount
        />
      </ModalForm>
    </>
  );
};

export default ContentNotice;
