import {
  ModalForm,
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
  AlertOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileAddOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  PictureOutlined,
  PlusOutlined,
  SearchOutlined,
  TransactionOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useTableRefresh } from '../../hooks/useTableRefresh';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import RefreshButton from '../../components/RefreshButton';
import ImageUploader from '../../components/ImageUploader';
import {
  acceptArbitrationCase,
  archiveArbitrationCase,
  createArbitrationCase,
  createArbitrationAward,
  createArbitrationEvidence,
  deleteArbitrationCase,
  deleteArbitrationEvidence,
  executeArbitrationAward,
  getArbitrationCaseDetail,
  getArbitrationCases,
  getDealOptions,
  startHearingArbitrationCase,
  updateArbitrationCase,
  type ArbitrationCase,
  type ArbitrationCaseDetail,
  type ArbitrationEvidence,
  type DealOption,
} from '../../services/arbitration';
import { getUserList, type UserItem } from '../../services/user';

// 案件状态选项
const STATUS_OPTIONS = [
  { label: '待受理', value: 'pending' },
  { label: '已立案', value: 'accepted' },
  { label: '审理中', value: 'hearing' },
  { label: '已裁决', value: 'ruled' },
  { label: '已归档', value: 'archived' },
];

// 状态标签颜色映射
const STATUS_COLOR: Record<string, string> = {
  pending: 'default',
  accepted: 'processing',
  hearing: 'gold',
  ruled: 'blue',
  archived: 'success',
};

// 状态中文映射
const STATUS_LABEL: Record<string, string> = {
  pending: '待受理',
  accepted: '已立案',
  hearing: '审理中',
  ruled: '已裁决',
  archived: '已归档',
};

// 纠纷类型选项
const TYPE_OPTIONS = [
  { label: '拍卖纠纷', value: 'auction' },
  { label: '交易纠纷', value: 'trade' },
  { label: '其他', value: 'other' },
];
const TYPE_LABEL: Record<string, string> = {
  auction: '拍卖纠纷',
  trade: '交易纠纷',
  other: '其他',
};

// 证据提交方选项
const PARTY_OPTIONS = [
  { label: '申诉人', value: 'complainant' },
  { label: '被诉人', value: 'respondent' },
];

// 证据文件类型选项
const FILE_TYPE_OPTIONS = [
  { label: '图片', value: 'image' },
  { label: '文档', value: 'document' },
  { label: '视频', value: 'video' },
];
const FILE_TYPE_COLOR: Record<string, string> = {
  image: 'blue',
  document: 'default',
  video: 'magenta',
};

// 裁决执行动作选项
const ACTION_OPTIONS = [
  { label: '退款', value: 'refund' },
  { label: '强制交割', value: 'force_deliver' },
  { label: '其他', value: 'other' },
];

// 裁决执行状态颜色
const EXECUTE_STATUS_COLOR: Record<string, string> = {
  pending: 'warning',
  executing: 'processing',
  executed: 'success',
};

// 仲裁案件管理:列表 + 受理/立案 + 详情抽屉(证据 + 裁决)
const ArbitrationCase = () => {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const currentUser = useCurrentUser();
  const canView = hasPermission(currentUser, 'arbitration:view');
  const canJudge = hasPermission(currentUser, 'arbitration:judge');
  const actionRef = useRef<ActionType>();
  const { tableLoading, handleRefresh } = useTableRefresh(actionRef, { messageApi: message });

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editing, setEditing] = useState<ArbitrationCase | null>(null);
  const [dealOptions, setDealOptions] = useState<DealOption[]>([]);
  const [form] = Form.useForm();
  const [evidenceImages, setEvidenceImages] = useState<string[]>([]);
  const [userOptions, setUserOptions] = useState<{label: string, value: string}[]>([]);
  const [complainantTouched, setComplainantTouched] = useState(false);
  const [respondentTouched, setRespondentTouched] = useState(false);
  const [userSearchTimer, setUserSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // 详情抽屉
  const [detailVisible, setDetailVisible] = useState(false);
  const [detail, setDetail] = useState<ArbitrationCaseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 证据新增弹窗
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  // 裁决弹窗
  const [awardModalOpen, setAwardModalOpen] = useState(false);


  const loadDealOptions = () => {
    if (!dealOptions.length) {
      getDealOptions()
        .then(setDealOptions)
        .catch(() => {
          // 拦截器已提示错误
        });
    }
  };

  const loadUserOptions = (keyword: string) => {
    if (userSearchTimer) {
      clearTimeout(userSearchTimer);
    }
    const timer = setTimeout(async () => {
      try {
        const res = await getUserList({ keyword, page: 1, pageSize: 20 });
        const options = res?.list?.map((u: UserItem) => ({
          label: u.nickname || u.username,
          value: u.nickname || u.username,
        })) ?? [];
        setUserOptions(options);
      } catch {
        // 静默处理错误
      }
    }, 300);
    setUserSearchTimer(timer);
  };

  const handleDealChange = (dealId: number | undefined) => {
    if (!dealId) {
      return;
    }
    const deal = dealOptions.find((d) => d.id === dealId);
    if (!deal) return;
    
    // 自动回填申诉人（seller）
    if (!complainantTouched) {
      form.setFieldsValue({ complainant: deal.seller });
    }
    
    // 自动回填被诉人（buyer），buyer 不为 null 时才填充
    if (deal.buyer && !respondentTouched) {
      form.setFieldsValue({ respondent: deal.buyer });
    }
    
    // 自动回填争议金额
    form.setFieldsValue({ amount: deal.final_price });
  };

  const openCreate = () => {
    setEditing(null);
    setDrawerVisible(true);
    setEvidenceImages([]);
    setComplainantTouched(false);
    setRespondentTouched(false);
    setUserOptions([]);
    loadDealOptions();
    form.resetFields();
    form.setFieldsValue({ type: 'other', amount: 0 });
  };

  const openEdit = (record: ArbitrationCase) => {
    setEditing(record);
    setDrawerVisible(true);
    setEvidenceImages([]);
    loadDealOptions();
    form.setFieldsValue({
      type: record.type,
      related_deal_id: record.related_deal_id ?? undefined,
      complainant: record.complainant,
      respondent: record.respondent,
      amount: record.amount,
      description: record.description ?? undefined,
    });
  };

  const openDetail = async (record: ArbitrationCase) => {
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const res = await getArbitrationCaseDetail(record.id);
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
      const res = await getArbitrationCaseDetail(detail.id);
      setDetail(res);
    } catch {
      // 拦截器已提示错误
    }
  };

  // 提交新增/编辑
  const handleSubmit = async (values: Record<string, unknown>) => {
    const payload = {
      type: (values.type as string) ?? 'other',
      related_deal_id: (values.related_deal_id as number | undefined) ?? null,
      complainant: values.complainant as string,
      respondent: values.respondent as string,
      amount: Number(values.amount),
      description: (values.description as string) ?? undefined,
    };
    if (editing) {
      await updateArbitrationCase(editing.id, payload);
      message.success('更新成功');
    } else {
      await createArbitrationCase(payload);
      message.success('案件登记成功');
    }
    setDrawerVisible(false);
    handleRefresh();
    return true;
  };

  // 受理立案
  const handleAccept = async (record: ArbitrationCase) => {
    try {
      await acceptArbitrationCase(record.id);
      message.success('案件已受理立案');
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 开始审理
  const handleStartHearing = async (record: ArbitrationCase) => {
    try {
      await startHearingArbitrationCase(record.id);
      message.success('案件已进入审理');
      handleRefresh();
      if (detail?.id === record.id) reloadDetail();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 归档
  const handleArchive = async (record: ArbitrationCase) => {
    try {
      await archiveArbitrationCase(record.id);
      message.success('案件已归档');
      handleRefresh();
      if (detail?.id === record.id) reloadDetail();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 删除案件
  const handleDelete = async (record: ArbitrationCase) => {
    try {
      await deleteArbitrationCase(record.id);
      message.success('删除成功');
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 新增证据
  const handleCreateEvidence = async (values: Record<string, unknown>) => {
    if (!detail) return false;
    try {
      await createArbitrationEvidence(detail.id, {
        party: (values.party as string) ?? 'complainant',
        title: values.title as string,
        file_url: values.file_url as string,
        file_type: (values.file_type as string) ?? 'document',
        description: (values.description as string) ?? undefined,
      });
      message.success('证据已新增');
      setEvidenceModalOpen(false);
      reloadDetail();
      handleRefresh();
      return true;
    } catch {
      return false;
    }
  };

  // 删除证据
  const handleDeleteEvidence = async (ev: ArbitrationEvidence) => {
    try {
      await deleteArbitrationEvidence(ev.id);
      message.success('删除成功');
      reloadDetail();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 作出裁决
  const handleCreateAward = async (values: Record<string, unknown>) => {
    if (!detail) return false;
    try {
      await createArbitrationAward(detail.id, {
        ruling: values.ruling as string,
        action: (values.action as string) ?? 'other',
      });
      message.success('裁决已作出');
      setAwardModalOpen(false);
      reloadDetail();
      handleRefresh();
      return true;
    } catch {
      return false;
    }
  };

  // 执行裁决
  const handleExecuteAward = async () => {
    if (!detail?.award) return;
    try {
      await executeArbitrationAward(detail.award.id);
      message.success('裁决执行状态已推进');
      reloadDetail();
    } catch {
      // 拦截器已提示错误
    }
  };

  const columns: ProColumns<ArbitrationCase>[] = [
    { title: '序号', dataIndex: 'index', valueType: 'index', width: 60, hideInSearch: true },
    { title: '案件号', dataIndex: 'case_no', width: 170, ellipsis: true },
    {
      title: '纠纷类型',
      dataIndex: 'type',
      width: 110,
      valueType: 'select',
      valueEnum: TYPE_OPTIONS.reduce(
        (acc, cur) => ({ ...acc, [cur.value]: { text: cur.label } }),
        {} as Record<string, { text: string }>
      ),
      render: (_, record) => (
        <Tag color={record.type === 'auction' ? 'volcano' : record.type === 'trade' ? 'orange' : 'default'}>
          {TYPE_LABEL[record.type] ?? record.type}
        </Tag>
      ),
    },
    { title: '申诉人', dataIndex: 'complainant', width: 110, ellipsis: true },
    { title: '被诉人', dataIndex: 'respondent', width: 110, ellipsis: true },
    {
      title: '争议金额',
      dataIndex: 'amount',
      width: 110,
      hideInSearch: true,
      render: (_, record) => `¥${record.amount}`,
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
      title: '案件号/当事人',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '案件号/申诉人/被诉人' },
    },
    {
      title: '立案时间',
      dataIndex: 'accepted_at',
      width: 160,
      hideInSearch: true,
      render: (_, record) =>
        record.accepted_at ? dayjs(record.accepted_at).format('YYYY-MM-DD HH:mm') : '-',
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
          {canView && record.status === 'pending' && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
              编辑
            </Button>
          )}
          {canJudge && record.status === 'pending' && (
            <Popconfirm title="确认受理立案?" onConfirm={() => handleAccept(record)}>
              <Button type="link" size="small" icon={<CheckCircleOutlined />}>
                受理
              </Button>
            </Popconfirm>
          )}
          {canJudge && record.status === 'accepted' && (
            <Popconfirm title="确认开始审理?" onConfirm={() => handleStartHearing(record)}>
              <Button type="link" size="small" icon={<TransactionOutlined />}>
                审理
              </Button>
            </Popconfirm>
          )}
          {canJudge && record.status === 'ruled' && (
            <Popconfirm title="确认归档该案件?" onConfirm={() => handleArchive(record)}>
              <Button type="link" size="small">
                归档
              </Button>
            </Popconfirm>
          )}
          {canJudge && record.status === 'pending' && (
            <Popconfirm title="确认删除该案件?" onConfirm={() => handleDelete(record)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // 证据列表列
  const evidenceColumns: ProColumns<ArbitrationEvidence>[] = [
    {
      title: '提交方',
      dataIndex: 'party',
      width: 90,
      render: (_, r) => (
        <Tag color={r.party === 'complainant' ? 'blue' : 'orange'}>{r.party_label}</Tag>
      ),
    },
    { title: '证据名称', dataIndex: 'title', width: 180, ellipsis: true },
    {
      title: '类型',
      dataIndex: 'file_type',
      width: 80,
      render: (_, r) => (
        <Tag color={FILE_TYPE_COLOR[r.file_type] ?? 'default'}>{r.file_type_label}</Tag>
      ),
    },
    {
      title: '文件',
      dataIndex: 'file_url',
      width: 160,
      ellipsis: true,
      render: (_, r) => (
        <a href={r.file_url} target="_blank" rel="noreferrer">
          {r.file_url}
        </a>
      ),
    },
    { title: '描述', dataIndex: 'description', width: 200, ellipsis: true, render: (_, r) => r.description || '-' },
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 150,
      render: (_, r) => dayjs(r.created_at).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, r) =>
        canJudge ? (
          <Popconfirm title="确认删除该证据?" onConfirm={() => handleDeleteEvidence(r)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        ) : (
          '-'
        ),
    },
  ];

  return (
    <>
      <ProTable<ArbitrationCase>
        headerTitle="仲裁案件列表"
        actionRef={actionRef}
        loading={tableLoading}
        rowKey="id"
        columns={columns}
        options={{ density: false, reload: false }}
        scroll={{ x: 1500 }}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          const { current, pageSize, case_no, status, type, keyword } = params;
          try {
            const res = await getArbitrationCases({
              page: current,
              pageSize,
              case_no: case_no as string | undefined,
              status: status as string | undefined,
              type: type as string | undefined,
              keyword: keyword as string | undefined,
            });
            return { data: res?.list ?? [], success: true, total: res?.total ?? 0 };
          } catch {
            return { data: [], success: false, total: 0 };
          }
        }}
        toolBarRender={() =>
          canView
            ? [
                <Button key="create" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                  登记案件
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

      {/* 新增/编辑抽屉 */}
      <Drawer
        title={editing ? '编辑仲裁案件' : '登记仲裁案件'}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={960}
        maskClosable={false}
        extra={
          <Space>
            <Button onClick={() => setDrawerVisible(false)}>取消</Button>
            <Button type="primary" onClick={() => form.submit()}>
              {editing ? '保存修改' : '确认登记'}
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark
          key={editing?.id ?? 'empty'}
          onFinish={handleSubmit}
          initialValues={{ type: 'other', amount: 0 }}
        >
          <Row gutter={24}>
            {/* 左侧表单 */}
            <Col span={15}>
              {/* ① 纠纷基本信息 */}
              <Card
                size="small"
                style={{ marginBottom: 16, borderLeft: `3px solid ${token.colorPrimary}` }}
                styles={{ body: { padding: 16 } }}
                title={
                  <Space>
                    <AlertOutlined style={{ color: token.colorPrimary }} />
                    <span>① 纠纷基本信息</span>
                  </Space>
                }
              >
                <Form.Item
                  name="type"
                  label="纠纷类型"
                  rules={[{ required: true, message: '请选择纠纷类型' }]}
                >
                  <Select
                    placeholder="请选择纠纷类型"
                    options={TYPE_OPTIONS}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
                <Form.Item
                  name="related_deal_id"
                  label="关联成交单"
                  tooltip="可选,选择后系统将自动回填双方当事人和争议金额"
                >
                  <Select
                    showSearch
                    placeholder="可选,选择关联的拍卖成交单"
                    optionFilterProp="label"
                    allowClear
                    options={dealOptions.map((d) => ({ label: d.label, value: d.id }))}
                    suffixIcon={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
                    onChange={(value) => handleDealChange(value as number | undefined)}
                  />
                </Form.Item>
              </Card>

              {/* ② 双方当事人 */}
              <Card
                size="small"
                style={{ marginBottom: 16, borderLeft: `3px solid #fa8c16` }}
                styles={{ body: { padding: 16 } }}
                title={
                  <Space>
                    <UserOutlined style={{ color: '#fa8c16' }} />
                    <span>② 双方当事人信息</span>
                  </Space>
                }
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <div
                      style={{
                        background: token.colorInfoBg,
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color: token.colorTextSecondary,
                          marginBottom: 4,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <UserOutlined />
                        申诉人
                      </div>
                      <Form.Item
                        name="complainant"
                        rules={[{ required: true, message: '请输入申诉人' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Select
                          showSearch
                          allowClear
                          placeholder="请输入或搜索申诉人"
                          onSearch={(v) => loadUserOptions(v)}
                          onInputKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setComplainantTouched(true);
                            }
                          }}
                          onChange={() => setComplainantTouched(true)}
                          options={userOptions}
                          filterOption={false}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div
                      style={{
                        background: '#fff2f0',
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color: token.colorTextSecondary,
                          marginBottom: 4,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <UserOutlined style={{ color: '#ff4d4f' }} />
                        被诉人
                      </div>
                      <Form.Item
                        name="respondent"
                        rules={[{ required: true, message: '请输入被诉人' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Select
                          showSearch
                          allowClear
                          placeholder="请输入或搜索被诉人"
                          onSearch={(v) => loadUserOptions(v)}
                          onChange={() => setRespondentTouched(true)}
                          options={userOptions}
                          filterOption={false}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </div>
                  </Col>
                </Row>
              </Card>

              {/* ③ 争议详情 */}
              <Card
                size="small"
                style={{ marginBottom: 16, borderLeft: `3px solid #eb2f96` }}
                styles={{ body: { padding: 16 } }}
                title={
                  <Space>
                    <Tag color="magenta">¥</Tag>
                    <span>③ 争议详情</span>
                  </Space>
                }
              >
                <Form.Item
                  name="amount"
                  label="争议金额(¥)"
                  rules={[{ required: true, message: '请输入争议金额' }]}
                >
                  <InputNumber
                    min={0}
                    step={100}
                    precision={2}
                    style={{ width: '100%' }}
                    placeholder="请输入争议金额"
                    formatter={(v) => `¥ ${v}`}
                    parser={((v: string | undefined) => (v ? Number(v.replace(/[^\d.]/g, '')) : 0)) as any}
                  />
                </Form.Item>
                <Form.Item name="description" label="问题描述">
                  <Input.TextArea
                    placeholder="请详细描述纠纷情况,包括事件经过、争议焦点等"
                    autoSize={{ minRows: 4, maxRows: 8 }}
                    maxLength={1000}
                    showCount
                  />
                </Form.Item>
              </Card>

              {/* ④ 证据材料 */}
              <Card
                size="small"
                style={{ marginBottom: 16, borderLeft: `3px solid #52c41a` }}
                styles={{ body: { padding: 16 } }}
                title={
                  <Space>
                    <PictureOutlined style={{ color: '#52c41a' }} />
                    <span>④ 证据材料</span>
                    <Tag color="green" style={{ marginLeft: 0 }}>
                      可选
                    </Tag>
                  </Space>
                }
              >
                <div
                  style={{
                    background: token.colorFill,
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: token.colorTextSecondary,
                      marginBottom: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <PictureOutlined />
                    上传证据图片(最多6张)
                    <Tooltip title="支持上传合同照片、聊天记录截图、交易凭证等证据材料">
                      <InfoCircleOutlined style={{ color: token.colorTextTertiary }} />
                    </Tooltip>
                  </div>
                  <ImageUploader
                    value={evidenceImages}
                    onChange={(urls) => {
                      if (Array.isArray(urls)) {
                        setEvidenceImages(urls);
                      } else if (urls) {
                        setEvidenceImages([urls]);
                      } else {
                        setEvidenceImages([]);
                      }
                    }}
                    maxCount={6}
                  />
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: token.colorTextTertiary,
                    display: 'flex',
                    gap: 16,
                  }}
                >
                  <span>
                    <FileTextOutlined /> 支持 JPG/PNG/WEBP 格式
                  </span>
                  <span>• 单张不超过 5MB</span>
                  <span>• 最多上传 6 张</span>
                </div>
              </Card>
            </Col>

            {/* 右侧预览 */}
            <Col span={9}>
              <div style={{ position: 'sticky', top: 0 }}>
                <Card
                  styles={{ body: { padding: 0 } }}
                  variant="borderless"
                  style={{
                    background: `linear-gradient(135deg, ${token.colorBgContainer} 0%, ${token.colorInfoBg} 100%)`,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                  title={
                    <Space>
                      <EyeOutlined style={{ color: token.colorPrimary }} />
                      <span>案件预览</span>
                    </Space>
                  }
                >
                  <div style={{ padding: 16 }}>
                    <Form.Item noStyle shouldUpdate={(prev, cur) =>
                      prev.type !== cur.type
                      || prev.complainant !== cur.complainant
                      || prev.respondent !== cur.respondent
                      || prev.amount !== cur.amount
                    }>
                      {({ getFieldValue }) => {
                        const type = getFieldValue('type');
                        const complainant = getFieldValue('complainant') || '待填写';
                        const respondent = getFieldValue('respondent') || '待填写';
                        const amount = getFieldValue('amount') ?? 0;

                        return (
                          <>
                            {/* 案件标题区 */}
                            <div
                              style={{
                                background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorLink} 100%)`,
                                borderRadius: 8,
                                padding: 16,
                                color: '#fff',
                                marginBottom: 12,
                              }}
                            >
                              <div style={{ fontSize: 14, marginBottom: 4, opacity: 0.9 }}>
                                仲裁案件
                              </div>
                              <Space size={8}>
                                <Tag
                                  style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    color: '#fff',
                                    border: 'none',
                                  }}
                                >
                                  {TYPE_LABEL[type as string] || '待定纠纷类型'}
                                </Tag>
                                <Tag
                                  style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    color: '#fff',
                                    border: 'none',
                                  }}
                                >
                                  争议 ¥{Number(amount).toLocaleString()}
                                </Tag>
                              </Space>
                            </div>

                            {/* 双方当事人对比 */}
                            <div style={{ marginBottom: 12 }}>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: token.colorTextSecondary,
                                  marginBottom: 8,
                                }}
                              >
                                双方当事人
                              </div>
                              <Row gutter={8}>
                                <Col span={12}>
                                  <div
                                    style={{
                                      background: token.colorInfoBg,
                                      borderRadius: 6,
                                      padding: 10,
                                      textAlign: 'center',
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: 11,
                                        color: token.colorTextTertiary,
                                        marginBottom: 4,
                                      }}
                                    >
                                      <UserOutlined /> 申诉人
                                    </div>
                                    <div
                                      style={{
                                        fontSize: 14,
                                        fontWeight: 600,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {complainant}
                                    </div>
                                  </div>
                                </Col>
                                <Col span={12}>
                                  <div
                                    style={{
                                      background: '#fff2f0',
                                      borderRadius: 6,
                                      padding: 10,
                                      textAlign: 'center',
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: 11,
                                        color: token.colorTextTertiary,
                                        marginBottom: 4,
                                      }}
                                    >
                                      <UserOutlined style={{ color: '#ff4d4f' }} /> 被诉人
                                    </div>
                                    <div
                                      style={{
                                        fontSize: 14,
                                        fontWeight: 600,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        color: '#cf1322',
                                      }}
                                    >
                                      {respondent}
                                    </div>
                                  </div>
                                </Col>
                              </Row>
                            </div>

                            <Divider style={{ margin: '8px 0' }} />

                            {/* 争议金额 */}
                            <Row gutter={8} style={{ marginBottom: 12 }}>
                              <Col span={24}>
                                <div
                                  style={{
                                    textAlign: 'center',
                                    padding: 12,
                                    background: token.colorFill,
                                    borderRadius: 6,
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: 24,
                                      fontWeight: 700,
                                      color: token.colorPrimary,
                                    }}
                                  >
                                    ¥{Number(amount).toLocaleString()}
                                  </div>
                                  <div style={{ fontSize: 12, color: token.colorTextSecondary }}>
                                    争议金额
                                  </div>
                                </div>
                              </Col>
                            </Row>

                            {/* 证据材料预览 */}
                            {evidenceImages.length > 0 && (
                              <>
                                <Divider style={{ margin: '8px 0' }} />
                                <div>
                                  <div
                                    style={{
                                      fontSize: 12,
                                      color: token.colorTextSecondary,
                                      marginBottom: 8,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4,
                                    }}
                                  >
                                    <PictureOutlined /> 证据材料 ({evidenceImages.length})
                                  </div>
                                  <div
                                    style={{
                                      display: 'flex',
                                      flexWrap: 'wrap',
                                      gap: 6,
                                    }}
                                  >
                                    {evidenceImages.slice(0, 4).map((url, idx) => (
                                      <img
                                        key={idx}
                                        src={url}
                                        alt={`证据 ${idx + 1}`}
                                        style={{
                                          width: 48,
                                          height: 48,
                                          objectFit: 'cover',
                                          borderRadius: 4,
                                          border: '1px solid ' + token.colorBorderSecondary,
                                        }}
                                      />
                                    ))}
                                    {evidenceImages.length > 4 && (
                                      <div
                                        style={{
                                          width: 48,
                                          height: 48,
                                          borderRadius: 4,
                                          background: token.colorFill,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: 12,
                                          color: token.colorTextTertiary,
                                        }}
                                      >
                                        +{evidenceImages.length - 4}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
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
        title="仲裁案件详情"
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={920}
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
                label: '案件信息',
                children: (
                  <>
                    <Descriptions column={2} bordered size="small">
                      <Descriptions.Item label="案件号" span={2}>
                        {detail.case_no}
                      </Descriptions.Item>
                      <Descriptions.Item label="纠纷类型">
                        <Tag color={detail.type === 'auction' ? 'volcano' : detail.type === 'trade' ? 'orange' : 'default'}>
                          {TYPE_LABEL[detail.type] ?? detail.type}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="状态">
                        <Tag color={STATUS_COLOR[detail.status] ?? 'default'}>
                          {STATUS_LABEL[detail.status] ?? detail.status}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="申诉人">{detail.complainant}</Descriptions.Item>
                      <Descriptions.Item label="被诉人">{detail.respondent}</Descriptions.Item>
                      <Descriptions.Item label="争议金额">¥{detail.amount}</Descriptions.Item>
                      <Descriptions.Item label="证据数量">
                        {detail.evidences?.length ?? 0}
                      </Descriptions.Item>
                      <Descriptions.Item label="关联成交单" span={2}>
                        {detail.related_deal
                          ? `#${detail.related_deal.id} ${detail.related_deal.session_name ?? ''} - ${detail.related_deal.item_name ?? '拍品'}(¥${detail.related_deal.final_price})`
                          : '无'}
                      </Descriptions.Item>
                      <Descriptions.Item label="问题描述" span={2}>
                        {detail.description || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="立案时间">
                        {detail.accepted_at
                          ? dayjs(detail.accepted_at).format('YYYY-MM-DD HH:mm:ss')
                          : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="创建时间">
                        {dayjs(detail.created_at).format('YYYY-MM-DD HH:mm:ss')}
                      </Descriptions.Item>
                    </Descriptions>
                    <div style={{ marginTop: 16 }}>
                      {canJudge && detail.status === 'pending' && (
                        <Popconfirm title="确认受理立案?" onConfirm={() => handleAccept(detail)}>
                          <Button type="primary" icon={<CheckCircleOutlined />}>
                            受理立案
                          </Button>
                        </Popconfirm>
                      )}
                      {canJudge && detail.status === 'accepted' && (
                        <Popconfirm title="确认开始审理?" onConfirm={() => handleStartHearing(detail)}>
                          <Button type="primary" icon={<TransactionOutlined />}>
                            开始审理
                          </Button>
                        </Popconfirm>
                      )}
                      {canJudge && detail.status === 'ruled' && (
                        <Popconfirm title="确认归档该案件?" onConfirm={() => handleArchive(detail)}>
                          <Button type="primary">
                            归档
                          </Button>
                        </Popconfirm>
                      )}
                    </div>
                  </>
                ),
              },
              {
                key: 'evidence',
                label: `证据材料${detail.evidences?.length ? `(${detail.evidences.length})` : ''}`,
                children: (
                  <>
                    <div style={{ marginBottom: 12 }}>
                      {canView && detail.status !== 'archived' && (
                        <Button
                          icon={<FileAddOutlined />}
                          onClick={() => setEvidenceModalOpen(true)}
                          type="primary"
                          size="small"
                        >
                          新增证据
                        </Button>
                      )}
                    </div>
                    <ProTable<ArbitrationEvidence>
                      size="small"
                      rowKey="id"
                      columns={evidenceColumns}
                      dataSource={detail.evidences ?? []}
                      pagination={false}
                      scroll={{ x: 900 }}
                      search={false}
                      options={false}
                      toolBarRender={false}
                    />
                  </>
                ),
              },
              {
                key: 'award',
                label: '仲裁裁决',
                children: detail.award ? (
                  <>
                    <Descriptions column={1} bordered size="small">
                      <Descriptions.Item label="执行动作">
                        <Tag color="purple">{detail.award.action_label}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="执行状态">
                        <Tag color={EXECUTE_STATUS_COLOR[detail.award.execute_status] ?? 'default'}>
                          {detail.award.execute_status_label}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="裁决结果">
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                          {detail.award.ruling}
                        </pre>
                      </Descriptions.Item>
                      <Descriptions.Item label="裁决时间">
                        {detail.award.award_time
                          ? dayjs(detail.award.award_time).format('YYYY-MM-DD HH:mm:ss')
                          : '-'}
                      </Descriptions.Item>
                    </Descriptions>
                    {canJudge && detail.award.execute_status !== 'executed' && (
                      <div style={{ marginTop: 16 }}>
                        <Popconfirm
                          title={
                            detail.award.execute_status === 'pending'
                              ? '确认开始执行裁决?'
                              : '确认裁决已执行完毕?'
                          }
                          onConfirm={handleExecuteAward}
                        >
                          <Button type="primary" icon={<CheckCircleOutlined />}>
                            {detail.award.execute_status === 'pending' ? '开始执行' : '完成执行'}
                          </Button>
                        </Popconfirm>
                      </div>
                    )}
                  </>
                ) : canJudge &&
                  (detail.status === 'accepted' || detail.status === 'hearing') ? (
                  <div style={{ textAlign: 'center', padding: 32 }}>
                    <Empty description="尚未作出裁决" />
                    <Button
                      type="primary"
                      icon={<TransactionOutlined />}
                      style={{ marginTop: 16 }}
                      onClick={() => setAwardModalOpen(true)}
                    >
                      作出裁决
                    </Button>
                  </div>
                ) : (
                  <Empty description="尚未作出裁决" />
                ),
              },
            ]}
          />
        )}
      </Drawer>

      {/* 新增证据弹窗 */}
      <ModalForm
        title="新增证据材料"
        open={evidenceModalOpen}
        onOpenChange={setEvidenceModalOpen}
        onFinish={handleCreateEvidence}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        initialValues={{ party: 'complainant', file_type: 'document' }}
      >
        <ProFormSelect
          name="party"
          label="提交方"
          options={PARTY_OPTIONS}
          rules={[{ required: true, message: '请选择提交方' }]}
        />
        <ProFormText
          name="title"
          label="证据名称"
          placeholder="请输入证据名称"
          rules={[{ required: true, message: '请输入证据名称' }]}
        />
        <ProFormSelect
          name="file_type"
          label="文件类型"
          options={FILE_TYPE_OPTIONS}
          rules={[{ required: true, message: '请选择文件类型' }]}
        />
        <ProFormText
          name="file_url"
          label="文件 URL"
          placeholder="请输入文件 URL(图片/文档/视频地址)"
          rules={[{ required: true, message: '请输入文件 URL' }]}
        />
        <ProFormTextArea
          name="description"
          label="证据描述"
          placeholder="请输入证据描述(可选)"
          fieldProps={{ autoSize: { minRows: 2, maxRows: 5 } }}
        />
      </ModalForm>

      {/* 作出裁决弹窗 */}
      <ModalForm
        title="作出仲裁裁决"
        open={awardModalOpen}
        onOpenChange={setAwardModalOpen}
        onFinish={handleCreateAward}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        initialValues={{ action: 'other' }}
      >
        <ProFormSelect
          name="action"
          label="执行动作"
          options={ACTION_OPTIONS}
          rules={[{ required: true, message: '请选择执行动作' }]}
        />
        <ProFormTextArea
          name="ruling"
          label="裁决结果"
          placeholder="请详细描述裁决结果"
          fieldProps={{ autoSize: { minRows: 4, maxRows: 10 } }}
          rules={[{ required: true, message: '请输入裁决结果' }]}
        />
      </ModalForm>
    </>
  );
};

export default ArbitrationCase;
