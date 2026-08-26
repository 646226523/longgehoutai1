import {
  App,
  Button,
  Card,
  Col,
  Drawer,
  Dropdown,
  Form,
  Image,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import {
  AppstoreOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PushpinOutlined,
  PlusOutlined,
  SearchOutlined,
  SendOutlined,
  StopOutlined,
} from '@ant-design/icons';
import {
  ProFormSelect,
  ProFormText,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import ImageUploader from '../../components/ImageUploader';
import RefreshButton from '../../components/RefreshButton';
import RichTextEditor from '../../components/RichTextEditor';
import { useTableRefresh } from '../../hooks/useTableRefresh';
import {
  createNews,
  deleteNews,
  getNewsDetail,
  getNewsList,
  getNewsStats,
  offlineNews,
  publishNews,
  toggleNewsTop,
  updateNews,
  type NewsItem,
  type NewsSaveParams,
  type NewsStats,
} from '../../services/content';

const { Text } = Typography;

const CATEGORY_OPTIONS = ['赛事资讯', '行业资讯', '养鸽知识'];

const STATUS_MAP: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'orange' },
  published: { text: '已发布', color: 'green' },
  offline: { text: '已下架', color: 'default' },
};

const NO_COVER_SVG = (() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80">
    <rect width="120" height="80" rx="8" fill="#f5f5f5"/>
    <line x1="30" y1="40" x2="45" y2="55" stroke="#bfbfbf" stroke-width="2" stroke-linecap="round"/>
    <circle cx="40" cy="32" r="6" fill="none" stroke="#bfbfbf" stroke-width="2"/>
    <rect x="55" y="25" width="50" height="30" rx="4" fill="none" stroke="#bfbfbf" stroke-width="2" stroke-dasharray="4 2"/>
    <text x="60" y="72" font-size="8" fill="#bfbfbf" font-family="sans-serif">No Cover</text>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
})();

interface NewsSearchParams {
  title?: string;
  category?: string;
  status?: string;
}

const NewsDashboard = ({ stats, loading }: { stats: NewsStats | null; loading?: boolean }) => {
  const isLoading = loading ?? !stats;

  const metrics = useMemo(
    () => ({
      total: stats?.total ?? 0,
      published: stats?.published ?? 0,
      draft: stats?.draft ?? 0,
      top: stats?.top ?? 0,
      views: (stats?.total ?? 0) * 120,
    }),
    [stats]
  );

  const cards = [
    {
      title: '总资讯',
      value: metrics.total,
      icon: <AppstoreOutlined style={{ fontSize: 28 }} />,
      color: '#1677ff',
      bgColor: 'rgba(22, 119, 255, 0.08)',
    },
    {
      title: '已发布',
      value: metrics.published,
      icon: <SendOutlined style={{ fontSize: 28 }} />,
      color: '#52c41a',
      bgColor: 'rgba(82, 196, 26, 0.08)',
    },
    {
      title: '草稿',
      value: metrics.draft,
      icon: <EditOutlined style={{ fontSize: 28 }} />,
      color: '#fa8c16',
      bgColor: 'rgba(250, 140, 22, 0.08)',
    },
    {
      title: '置顶',
      value: metrics.top,
      icon: <PushpinOutlined style={{ fontSize: 28 }} />,
      color: '#ff4d4f',
      bgColor: 'rgba(255, 77, 79, 0.08)',
    },
    {
      title: '总浏览量',
      value: metrics.views,
      icon: <EyeOutlined style={{ fontSize: 28 }} />,
      color: '#722ed1',
      bgColor: 'rgba(114, 46, 209, 0.08)',
      formatter: (v: number) => v.toLocaleString(),
    },
  ];

  return (
    <div style={{ marginBottom: 16 }}>
      <Row gutter={[16, 16]}>
        {cards.map((card, idx) => (
          <Col xs={12} sm={8} md={4} key={idx}>
            <Card
              variant="borderless"
              loading={isLoading}
              style={{
                borderRadius: 12,
                background: card.bgColor,
                transition: 'all 0.3s ease',
              }}
              styles={{ body: { padding: 20 } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: card.color,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    flexShrink: 0,
                  }}
                >
                  {card.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#666', fontSize: 13, marginBottom: 4 }}>{card.title}</div>
                  <Statistic
                    value={card.value}
                    valueStyle={{ color: card.color, fontSize: 26, fontWeight: 700 }}
                    formatter={card.formatter as any}
                  />
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

const NewsDrawer = ({
  open,
  editing,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editing: NewsItem | null;
  onClose: () => void;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
}) => {
  const [form] = Form.useForm();
  const [contentHtml, setContentHtml] = useState('');
  const [editorReady, setEditorReady] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEditorReady(false);

    const timer = setTimeout(async () => {
      if (editing) {
        try {
          const detail = await getNewsDetail(editing.id);
          console.log('[NewsDrawer] 获取详情成功:', { id: editing.id, content: detail.content?.substring(0, 100) });
          setContentHtml(detail.content ?? '');
          form.resetFields();
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
          console.error('[NewsDrawer] 获取详情失败');
          form.resetFields();
        }
      } else {
        console.log('[NewsDrawer] 新增模式，content置空');
        setContentHtml('');
        form.resetFields();
        form.setFieldsValue({
          status: 'draft',
          is_top: false,
          category: '行业资讯',
          author: '平台运营',
        });
      }
      setEditorReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [open, editing, form]);

  const handleSubmit = async () => {
    console.log('[NewsDrawer] handleSubmit called, contentHtml length:', contentHtml?.length);
    console.log('[NewsDrawer] contentHtml value:', JSON.stringify(contentHtml));
    try {
      const values = await form.validateFields();
      console.log('[NewsDrawer] validateFields success, values:', Object.keys(values));
      const submitData = { ...values, content: contentHtml };
      console.log('[NewsDrawer] submitData keys:', Object.keys(submitData));
      console.log('[NewsDrawer] submitData.content:', JSON.stringify(submitData.content));
      console.log('[NewsDrawer] 调用 onSubmit...');
      await onSubmit(submitData);
      console.log('[NewsDrawer] onSubmit 完成');
    } catch (err) {
      console.error('[NewsDrawer] validateFields failed:', err);
      return;
    }
  };

  return (
    <Drawer
      title={editing ? '编辑资讯' : '新增资讯'}
      open={open}
      onClose={onClose}
      width={760}
      destroyOnHidden
      extra={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit}>
          保存
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Card title="基础信息" variant="borderless" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={16}>
              <ProFormText
                name="title"
                label="标题"
                placeholder="请输入资讯标题"
                rules={[{ required: true, message: '请输入标题' }]}
              />
            </Col>
            <Col span={8}>
              <ProFormSelect
                name="category"
                label="分类"
                placeholder="请选择分类"
                options={CATEGORY_OPTIONS.map((c) => ({ label: c, value: c }))}
                rules={[{ required: true, message: '请选择分类' }]}
              />
            </Col>
          </Row>
          <ProFormText name="author" label="作者" placeholder="请输入作者名称" />
        </Card>

        <Card title="封面图片" variant="borderless" style={{ marginBottom: 16 }}>
          <Form.Item
            name="cover_url"
            label="封面图"
            valuePropName="value"
            extra={<Text type="secondary">建议尺寸 750×420px,支持 JPG/PNG/WEBP</Text>}
          >
            <ImageUploader />
          </Form.Item>
        </Card>

        <Card title="内容编辑" variant="borderless" style={{ marginBottom: 16 }}>
          <Form.Item label="正文" required>
            <Tabs
              defaultActiveKey="edit"
              items={[
                {
                  key: 'edit',
                  label: '编辑',
                  children: editorReady ? (
                    <RichTextEditor
                      key={editing?.id ?? 'new'}
                      value={contentHtml}
                      onChange={setContentHtml}
                      height={340}
                    />
                  ) : (
                    <div style={{ height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                      正在加载编辑器...
                    </div>
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
                        borderRadius: 8,
                        overflow: 'auto',
                        background: '#fafafa',
                      }}
                      dangerouslySetInnerHTML={{
                        __html: contentHtml || '<p style="color:#999;text-align:center;padding:40px 0">暂无内容</p>',
                      }}
                    />
                  ),
                },
              ]}
            />
          </Form.Item>
        </Card>

        <Card title="发布设置" variant="borderless" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="is_top" label="置顶" valuePropName="checked">
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <ProFormSelect
                name="status"
                label="状态"
                options={[
                  { label: '草稿', value: 'draft' },
                  { label: '已发布', value: 'published' },
                  { label: '已下架', value: 'offline' },
                ]}
                rules={[{ required: true, message: '请选择状态' }]}
              />
            </Col>
          </Row>
          <Form.Item label="摘要" name="summary">
            <Input.TextArea rows={2} maxLength={200} showCount placeholder="一句话摘要(选填)" />
          </Form.Item>
        </Card>
      </Form>
    </Drawer>
  );
};

const NewsPreview = ({
  record,
  onClose,
}: {
  record: NewsItem | null;
  onClose: () => void;
}) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!record) return;
    setContent('');
    setLoading(true);
    getNewsDetail(record.id)
      .then((detail) => {
        setContent(detail.content ?? '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [record]);

  if (!record) return null;

  return (
    <Modal
      title="资讯预览"
      open={!!record}
      onCancel={onClose}
      footer={[<Button key="close" onClick={onClose}>关闭</Button>]}
      width={420}
      styles={{ body: { padding: 0 } }}
    >
      <div
        style={{
          width: 320,
          height: 560,
          border: '10px solid #1a1a1a',
          borderRadius: 40,
          overflow: 'hidden',
          margin: '0 auto',
          background: '#f8f9fa',
          position: 'relative',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 120,
            height: 24,
            background: '#1a1a1a',
            borderRadius: '0 0 16px 16px',
            zIndex: 100,
          }}
        />

        <div
          style={{
            background: '#fff',
            padding: '32px 12px 8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 12,
            fontWeight: 600,
            borderBottom: '1px solid #f0f0f0',
            flexShrink: 0,
          }}
        >
          <span>9:41</span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span>📶</span>
            <span>5G</span>
            <span>🔋</span>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 12,
          }}
        >
          {record.cover_url ? (
            <img
              src={record.cover_url}
              alt={record.title}
              style={{
                width: '100%',
                height: 160,
                objectFit: 'cover',
                borderRadius: 8,
                marginBottom: 12,
                display: 'block',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: 160,
                borderRadius: 8,
                background: '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#bfbfbf',
                marginBottom: 12,
              }}
            >
              <EyeOutlined style={{ fontSize: 32 }} />
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {record.category && (
              <Tag color="blue" style={{ margin: 0 }}>
                {record.category}
              </Tag>
            )}
            {record.is_top === 1 && (
              <Tag color="red" style={{ margin: 0 }}>
                📌 置顶
              </Tag>
            )}
          </div>

          <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.4 }}>
            {record.title}
          </h2>

          <div style={{ fontSize: 11, color: '#999', marginBottom: 12 }}>
            {record.published_at
              ? dayjs(record.published_at).format('YYYY-MM-DD HH:mm')
              : record.created_at
                ? dayjs(record.created_at).format('YYYY-MM-DD HH:mm')
                : '-'}
          </div>

          <div
            style={{ fontSize: 13, lineHeight: 1.8, color: '#333' }}
            dangerouslySetInnerHTML={{
              __html: loading
                ? '<div style="color:#999;text-align:center;padding:40px 0">加载中...</div>'
                : content || '<div style="color:#999;text-align:center;padding:40px 0">暂无内容</div>',
            }}
          />
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 4,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 120,
            height: 4,
            background: '#1a1a1a',
            borderRadius: 2,
            zIndex: 101,
          }}
        />
      </div>

      <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: '#666' }}>
        资讯预览 · {record.category || '未分类'}
      </div>
    </Modal>
  );
};

const ContentNews = () => {
  const { message, modal } = App.useApp();
  const currentUser = useCurrentUser();
  const canEdit = hasPermission(currentUser, 'content:edit');
  const actionRef = useRef<ActionType>();
  const { tableLoading, handleRefresh } = useTableRefresh(actionRef, { messageApi: message });

  const [stats, setStats] = useState<NewsStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState<NewsItem[]>([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [previewRecord, setPreviewRecord] = useState<NewsItem | null>(null);
  const [searchParams, setSearchParams] = useState<NewsSearchParams>({});

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await getNewsStats();
      setStats(data);
    } catch (err) {
      console.error('[News] loadStats error:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const openCreate = () => {
    setEditing(null);
    setDrawerVisible(true);
  };

  const openEdit = (record: NewsItem) => {
    setEditing(record);
    setDrawerVisible(true);
  };

  const openPreview = (record: NewsItem) => {
    setPreviewRecord(record);
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    console.log('[News] handleSubmit received values keys:', Object.keys(values));
    console.log('[News] handleSubmit received content:', JSON.stringify((values as any).content));
    const payload: NewsSaveParams = {
      title: values.title as string,
      category: values.category as string,
      cover_url: values.cover_url as string,
      summary: values.summary as string,
      author: values.author as string,
      content: values.content as string,
      status: values.status as 'draft' | 'published' | 'offline',
      is_top: values.is_top ? 1 : 0,
    };
    console.log('[News] 保存payload:', { ...payload, content: payload.content?.substring(0, 100) });
    try {
      if (editing) {
        await updateNews(editing.id, payload);
        message.success('更新成功');
      } else {
        await createNews(payload);
        message.success('新增成功');
      }
      setDrawerVisible(false);
      loadStats();
      handleRefresh();
    } catch {
      // handled by interceptor
    }
  };

  const handlePublish = async (record: NewsItem) => {
    try {
      await publishNews(record.id);
      message.success('发布成功');
      loadStats();
      handleRefresh();
    } catch {
      // handled by interceptor
    }
  };

  const handleOffline = async (record: NewsItem) => {
    try {
      await offlineNews(record.id);
      message.success('已下架');
      loadStats();
      handleRefresh();
    } catch {
      // handled by interceptor
    }
  };

  const handleToggleTop = async (record: NewsItem) => {
    try {
      await toggleNewsTop(record.id, record.is_top === 1 ? 0 : 1);
      message.success(record.is_top === 1 ? '已取消置顶' : '已置顶');
      loadStats();
      handleRefresh();
    } catch {
      // handled by interceptor
    }
  };

  const handleDelete = async (record: NewsItem) => {
    try {
      await deleteNews(record.id);
      message.success('删除成功');
      loadStats();
      handleRefresh();
    } catch {
      // handled by interceptor
    }
  };

  const handleBatchPublish = async () => {
    if (selectedRows.length === 0) return;
    modal.confirm({
      title: '批量发布',
      content: `确认发布选中的 ${selectedRows.length} 条资讯?`,
      okText: '确认发布',
      cancelText: '取消',
      onOk: async () => {
        try {
          await Promise.all(selectedRows.map((row) => publishNews(row.id)));
          message.success(`成功发布 ${selectedRows.length} 条资讯`);
          setSelectedRows([]);
          loadStats();
          handleRefresh();
        } catch {
          // handled by interceptor
        }
      },
    });
  };

  const handleBatchOffline = async () => {
    if (selectedRows.length === 0) return;
    modal.confirm({
      title: '批量下架',
      content: `确认下架选中的 ${selectedRows.length} 条资讯?`,
      okText: '确认下架',
      cancelText: '取消',
      onOk: async () => {
        try {
          await Promise.all(selectedRows.map((row) => offlineNews(row.id)));
          message.success(`成功下架 ${selectedRows.length} 条资讯`);
          setSelectedRows([]);
          loadStats();
          handleRefresh();
        } catch {
          // handled by interceptor
        }
      },
    });
  };

  const handleBatchDelete = async () => {
    if (selectedRows.length === 0) return;
    modal.confirm({
      title: '批量删除',
      content: `确认删除选中的 ${selectedRows.length} 条资讯?此操作不可恢复!`,
      okText: '确认删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await Promise.all(selectedRows.map((row) => deleteNews(row.id)));
          message.success(`成功删除 ${selectedRows.length} 条资讯`);
          setSelectedRows([]);
          loadStats();
          handleRefresh();
        } catch {
          // handled by interceptor
        }
      },
    });
  };

  const columns: ProColumns<NewsItem>[] = [
    { title: '序号', dataIndex: 'index', valueType: 'index', width: 60, hideInSearch: true },
    {
      title: '封面',
      dataIndex: 'cover_url',
      width: 120,
      hideInSearch: true,
      render: (_, record) =>
        record.cover_url ? (
          <Image
            width={120}
            height={80}
            src={record.cover_url}
            fallback={NO_COVER_SVG}
            style={{
              objectFit: 'cover',
              borderRadius: 8,
              cursor: 'zoom-in',
              border: '1px solid #f0f0f0',
            }}
          />
        ) : (
          <img
            src={NO_COVER_SVG}
            alt="无封面"
            width={120}
            height={80}
            style={{ borderRadius: 8, border: '1px solid #f0f0f0' }}
          />
        ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      width: 260,
      hideInSearch: true,
      ellipsis: true,
      render: (_, record) => (
        <Space size={4}>
          {record.is_top === 1 && (
            <Tag color="red" style={{ marginRight: 0 }}>
              📌 置顶
            </Tag>
          )}
          <a onClick={() => openPreview(record)}>{record.title}</a>
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      width: 120,
      hideInSearch: true,
    },
    { title: '作者', dataIndex: 'author', width: 110, ellipsis: true, hideInSearch: true },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      hideInSearch: true,
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
      render: (_, record) =>
        record.published_at ? dayjs(record.published_at).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 160,
      hideInSearch: true,
      render: (_, record) =>
        record.created_at ? dayjs(record.created_at).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 320,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space size={4} wrap>
          {canEdit && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
              编辑
            </Button>
          )}
          <Button type="link" size="small" onClick={() => openPreview(record)}>
            预览
          </Button>
          {canEdit && record.status !== 'published' && (
            <Popconfirm title="确认发布该资讯?" onConfirm={() => handlePublish(record)}>
              <Button type="link" size="small" icon={<SendOutlined />}>
                发布
              </Button>
            </Popconfirm>
          )}
          {canEdit && record.status === 'published' && (
            <Popconfirm title="确认下架该资讯?" onConfirm={() => handleOffline(record)}>
              <Button type="link" size="small" icon={<StopOutlined />}>
                下架
              </Button>
            </Popconfirm>
          )}
          {canEdit && (
            <Popconfirm
              title={record.is_top === 1 ? '确认取消置顶?' : '确认置顶?'}
              onConfirm={() => handleToggleTop(record)}
            >
              <Button type="link" size="small" icon={<PushpinOutlined />}>
                {record.is_top === 1 ? '取消置顶' : '置顶'}
              </Button>
            </Popconfirm>
          )}
          {canEdit && (
            <Popconfirm title="确认删除该资讯?此操作不可恢复!" onConfirm={() => handleDelete(record)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const handleSearch = (params: NewsSearchParams) => {
    setSearchParams(params);
    actionRef.current?.reload();
  };

  const handleResetSearch = () => {
    setSearchParams({});
    actionRef.current?.reload();
  };

  return (
    <>
      <NewsDashboard stats={stats} loading={statsLoading} />

      <div
        style={{
          background: '#fff',
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 12,
        }}
      >
        <Space size="middle" wrap>
          <Input
            placeholder="搜索标题"
            prefix={<SearchOutlined />}
            allowClear
            value={searchParams.title}
            onChange={(e) => setSearchParams((prev) => ({ ...prev, title: e.target.value }))}
            onPressEnter={() => handleSearch(searchParams)}
            style={{ width: 240 }}
          />
          <Select
            key="category-select"
            placeholder="分类"
            allowClear
            value={searchParams.category}
            onChange={(val) => setSearchParams((prev) => ({ ...prev, category: val }))}
            style={{ width: 140 }}
            options={CATEGORY_OPTIONS.map((c) => ({ label: c, value: c }))}
          />
          <Select
            key="status-select"
            placeholder="状态"
            allowClear
            value={searchParams.status}
            onChange={(val) => setSearchParams((prev) => ({ ...prev, status: val }))}
            style={{ width: 140 }}
            options={[
              { label: '草稿', value: 'draft' },
              { label: '已发布', value: 'published' },
              { label: '已下架', value: 'offline' },
            ]}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={() => handleSearch(searchParams)}>
            查询
          </Button>
          <Button onClick={handleResetSearch}>重置</Button>
        </Space>
      </div>

      <ProTable<NewsItem>
        headerTitle="资讯列表"
        actionRef={actionRef}
        loading={tableLoading}
        rowKey="id"
        columns={columns}
        options={{ density: false, reload: false }}
        scroll={{ x: 1360 }}
        search={false}
        rowSelection={{
          selectedRowKeys: selectedRows.map((r) => r.id),
          onChange: (_, rows) => setSelectedRows(rows),
        }}
        request={async (params) => {
          const { current, pageSize } = params;
          try {
            const res = await getNewsList({
              page: current,
              pageSize,
              title: searchParams.title || undefined,
              category: searchParams.category || undefined,
              status: searchParams.status || undefined,
            });
            return { data: res.list, success: true, total: res.total };
          } catch {
            return { data: [], success: false, total: 0 };
          }
        }}
        toolBarRender={() => {
          const buttons: React.ReactNode[] = [];

          if (selectedRows.length > 0 && canEdit) {
            buttons.push(
              <Dropdown
                key="batch"
                menu={{
                  items: [
                    {
                      key: 'publish',
                      label: '批量发布',
                      icon: <SendOutlined />,
                      onClick: handleBatchPublish,
                    },
                    {
                      key: 'offline',
                      label: '批量下架',
                      icon: <StopOutlined />,
                      onClick: handleBatchOffline,
                    },
                    {
                      key: 'delete',
                      label: '批量删除',
                      icon: <DeleteOutlined />,
                      danger: true,
                      onClick: handleBatchDelete,
                    },
                  ],
                }}
              >
                <Button danger>
                  批量操作 ({selectedRows.length})
                </Button>
              </Dropdown>
            );
          }

          if (canEdit) {
            buttons.push(
              <Button key="create" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                新增资讯
              </Button>
            );
          }

          buttons.push(<RefreshButton key="refresh" actionRef={actionRef as any} />);

          return buttons;
        }}
        pagination={{
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          defaultPageSize: 10,
        }}
      />

      <NewsDrawer
        open={drawerVisible}
        editing={editing}
        onClose={() => setDrawerVisible(false)}
        onSubmit={handleSubmit}
      />

      <NewsPreview record={previewRecord} onClose={() => setPreviewRecord(null)} />
    </>
  );
};

export default ContentNews;