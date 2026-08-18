import {
  ProFormText,
  ProFormSelect,
  ProFormSwitch,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { App, Button, Drawer, Image, Popconfirm, Space, Tag, Input, Tabs, Form } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import RefreshButton from '../../components/RefreshButton';
import { useTableRefresh } from '../../hooks/useTableRefresh';
import {
  createNews,
  deleteNews,
  getNewsDetail,
  getNewsList,
  offlineNews,
  publishNews,
  toggleNewsTop,
  updateNews,
  type NewsItem,
  type NewsSaveParams,
} from '../../services/content';

// 状态映射:颜色 + 文本
const STATUS_MAP: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  published: { text: '已发布', color: 'green' },
  offline: { text: '已下架', color: 'orange' },
};

// 资讯管理:支持草稿/发布/下架、置顶,正文使用 HTML 输入 + 预览(未引入富文本库)
const ContentNews = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canEdit = hasPermission(currentUser, 'content:edit');
  const actionRef = useRef<ActionType>();
  const { tableLoading, handleRefresh } = useTableRefresh(actionRef, { messageApi: message });
  const [form] = Form.useForm();

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editing, setEditing] = useState<NewsItem | null>(null);

  // 正文 HTML 内容(Input.TextArea 受控,便于切换预览)
  const [contentHtml, setContentHtml] = useState<string>('');
  // 详情预览
  const [previewRecord, setPreviewRecord] = useState<NewsItem | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);

  // 打开新增抽屉
  const openCreate = () => {
    setEditing(null);
    setContentHtml('');
    form.resetFields();
    form.setFieldsValue({
      status: 'draft',
      is_top: 0,
      category: '行业资讯',
      author: '平台运营',
    });
    setDrawerVisible(true);
  };

  // 打开编辑抽屉(异步拉详情拿 content)
  const openEdit = async (record: NewsItem) => {
    setEditing(record);
    setDrawerVisible(true);
    setPreviewLoading(false);
    try {
      const detail = await getNewsDetail(record.id);
      setContentHtml(detail.content ?? '');
      form.setFieldsValue({
        title: detail.title,
        category: detail.category,
        cover_url: detail.cover_url,
        summary: detail.summary,
        author: detail.author,
        status: detail.status,
        is_top: detail.is_top === 1,
      });
    } catch {
      // 拦截器已提示错误
    }
  };

  // 打开详情预览
  const openPreview = async (record: NewsItem) => {
    setPreviewRecord(record);
    setPreviewContent('');
    setPreviewLoading(true);
    try {
      const detail = await getNewsDetail(record.id);
      setPreviewContent(detail.content ?? '');
    } catch {
      // 拦截器已提示错误
    } finally {
      setPreviewLoading(false);
    }
  };

  // 提交新增/编辑
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload: NewsSaveParams = {
        title: values.title as string,
        category: values.category as string,
        cover_url: values.cover_url as string,
        summary: values.summary as string,
        content: contentHtml,
        author: values.author as string,
        status: values.status as 'draft' | 'published' | 'offline',
        is_top: values.is_top ? 1 : 0,
      };
      if (editing) {
        await updateNews(editing.id, payload);
        message.success('更新成功');
      } else {
        await createNews(payload);
        message.success('新增成功');
      }
      setDrawerVisible(false);
      handleRefresh();
      return true;
    } catch {
      return false;
    }
  };

  // 发布
  const handlePublish = async (record: NewsItem) => {
    try {
      await publishNews(record.id);
      message.success('发布成功');
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 下架
  const handleOffline = async (record: NewsItem) => {
    try {
      await offlineNews(record.id);
      message.success('已下架');
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 置顶/取消置顶
  const handleToggleTop = async (record: NewsItem) => {
    try {
      await toggleNewsTop(record.id, record.is_top === 1 ? 0 : 1);
      message.success(record.is_top === 1 ? '已取消置顶' : '已置顶');
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 删除
  const handleDelete = async (record: NewsItem) => {
    try {
      await deleteNews(record.id);
      message.success('删除成功');
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  const columns: ProColumns<NewsItem>[] = [
    { title: '序号', dataIndex: 'index', valueType: 'index', width: 60, hideInSearch: true },
    {
      title: '封面',
      dataIndex: 'cover_url',
      width: 100,
      hideInSearch: true,
      render: (_, record) =>
        record.cover_url ? (
          <Image width={80} height={48} src={record.cover_url} fallback="" style={{ objectFit: 'cover', borderRadius: 4 }} />
        ) : (
          <Tag>无封面</Tag>
        ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      width: 220,
      ellipsis: true,
      render: (_, record) => (
        <Space size={4}>
          {record.is_top === 1 && <Tag color="red">置顶</Tag>}
          <a onClick={() => openPreview(record)}>{record.title}</a>
        </Space>
      ),
    },
    { title: '分类', dataIndex: 'category', width: 110, ellipsis: true },
    { title: '作者', dataIndex: 'author', width: 110, ellipsis: true, hideInSearch: true },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      valueEnum: {
        draft: { text: '草稿' },
        published: { text: '已发布' },
        offline: { text: '已下架' },
      },
      render: (_, record) => {
        const s = STATUS_MAP[record.status] ?? { text: record.status, color: 'default' };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
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
      width: 280,
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
            <Popconfirm title="确认发布该资讯?" onConfirm={() => handlePublish(record)}>
              <Button type="link" size="small">
                发布
              </Button>
            </Popconfirm>
          )}
          {canEdit && record.status === 'published' && (
            <Popconfirm title="确认下架该资讯?" onConfirm={() => handleOffline(record)}>
              <Button type="link" size="small">
                下架
              </Button>
            </Popconfirm>
          )}
          {canEdit && (
            <Popconfirm
              title={record.is_top === 1 ? '确认取消置顶?' : '确认置顶?'}
              onConfirm={() => handleToggleTop(record)}
            >
              <Button type="link" size="small">
                {record.is_top === 1 ? '取消置顶' : '置顶'}
              </Button>
            </Popconfirm>
          )}
          {canEdit && (
            <Popconfirm title="确认删除该资讯?" onConfirm={() => handleDelete(record)}>
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
      <ProTable<NewsItem>
        headerTitle="资讯列表"
        actionRef={actionRef}
        loading={tableLoading}
        rowKey="id"
        columns={columns}
        options={{ density: false, reload: false }}
        scroll={{ x: 1280 }}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          const { current, pageSize, title, category, status } = params;
          try {
            const res = await getNewsList({
              page: current,
              pageSize,
              title: title as string | undefined,
              category: category as string | undefined,
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
                  新增资讯
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

      {/* 新增/编辑抽屉 */}
      <Drawer
        title={editing ? '编辑资讯' : '新增资讯'}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={760}
        destroyOnHidden
        extra={
          <Space>
            <Button onClick={() => setDrawerVisible(false)}>取消</Button>
            <Button type="primary" onClick={handleSubmit}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <ProFormText
            name="title"
            label="标题"
            placeholder="请输入资讯标题"
            rules={[{ required: true, message: '请输入标题' }]}
          />
          <ProFormText name="category" label="分类" placeholder="如 行业资讯/赛事资讯/养鸽知识" />
          <ProFormText name="cover_url" label="封面图 URL" placeholder="请输入封面图地址" />
          <ProFormText name="author" label="作者" placeholder="请输入作者" />
          <ProFormSelect
            name="status"
            label="状态"
            options={[
              { label: '草稿', value: 'draft' },
              { label: '已发布', value: 'published' },
              { label: '已下架', value: 'offline' },
            ]}
          />
          <ProFormSwitch name="is_top" label="置顶" />
          <Form.Item label="摘要" name="summary">
            <Input.TextArea rows={2} maxLength={200} showCount placeholder="一句话摘要(选填)" />
          </Form.Item>
          <Form.Item label="正文(HTML)">
            <Tabs
              defaultActiveKey="edit"
              items={[
                {
                  key: 'edit',
                  label: '编辑',
                  children: (
                    <Input.TextArea
                      value={contentHtml}
                      onChange={(e) => setContentHtml(e.target.value)}
                      rows={14}
                      placeholder="请输入正文 HTML 内容。如需引入富文本编辑器,推荐安装 react-quill(本占位未引入,直接粘贴 HTML 即可)"
                      style={{ fontFamily: 'monospace' }}
                    />
                  ),
                },
                {
                  key: 'preview',
                  label: '预览',
                  children: (
                    <div
                      style={{
                        minHeight: 300,
                        padding: 16,
                        border: '1px solid #f0f0f0',
                        borderRadius: 4,
                        overflow: 'auto',
                      }}
                      dangerouslySetInnerHTML={{ __html: contentHtml || '<p style="color:#999">暂无内容</p>' }}
                    />
                  ),
                },
              ]}
            />
          </Form.Item>
        </Form>
      </Drawer>

      {/* 详情预览抽屉 */}
      <Drawer
        title="资讯预览"
        open={!!previewRecord}
        onClose={() => setPreviewRecord(null)}
        width={760}
        destroyOnHidden
      >
        {previewRecord && (
          <div>
            <h2 style={{ marginBottom: 8 }}>{previewRecord.title}</h2>
            <Space size={12} style={{ color: '#888', marginBottom: 12 }}>
              <span>分类:{previewRecord.category || '-'}</span>
              <span>作者:{previewRecord.author || '-'}</span>
              <span>
                发布时间:
                {previewRecord.published_at ? dayjs(previewRecord.published_at).format('YYYY-MM-DD HH:mm') : '-'}
              </span>
            </Space>
            {previewRecord.cover_url && (
              <Image
                width="100%"
                src={previewRecord.cover_url}
                fallback=""
                style={{ maxHeight: 320, objectFit: 'cover', borderRadius: 4, marginBottom: 12 }}
              />
            )}
            <div
              style={{ minHeight: 200 }}
              dangerouslySetInnerHTML={{
                __html: previewLoading ? '<p style="color:#999">加载中...</p>' : previewContent || '<p style="color:#999">暂无内容</p>',
              }}
            />
          </div>
        )}
      </Drawer>
    </>
  );
};

export default ContentNews;
