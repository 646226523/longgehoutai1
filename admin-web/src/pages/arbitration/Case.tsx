import {
  DrawerForm,
  ModalForm,
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
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileAddOutlined,
  TransactionOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useTableRefresh } from '../../hooks/useTableRefresh';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import RefreshButton from '../../components/RefreshButton';
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
  const currentUser = useCurrentUser();
  const canView = hasPermission(currentUser, 'arbitration:view');
  const canJudge = hasPermission(currentUser, 'arbitration:judge');
  const actionRef = useRef<ActionType>();
  const { tableLoading, handleRefresh } = useTableRefresh(actionRef, { messageApi: message });

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editing, setEditing] = useState<ArbitrationCase | null>(null);
  const [dealOptions, setDealOptions] = useState<DealOption[]>([]);

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

  const openCreate = () => {
    setEditing(null);
    setDrawerVisible(true);
    loadDealOptions();
  };

  const openEdit = (record: ArbitrationCase) => {
    setEditing(record);
    setDrawerVisible(true);
    loadDealOptions();
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
            return { data: res.list, success: true, total: res.total };
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
      <DrawerForm
        title={editing ? '编辑仲裁案件' : '登记仲裁案件'}
        open={drawerVisible}
        onOpenChange={setDrawerVisible}
        onFinish={handleSubmit}
        drawerProps={{ destroyOnHidden: true, maskClosable: false, width: 560 }}
        initialValues={
          editing
            ? {
                type: editing.type,
                related_deal_id: editing.related_deal_id ?? undefined,
                complainant: editing.complainant,
                respondent: editing.respondent,
                amount: editing.amount,
                description: editing.description ?? undefined,
              }
            : { type: 'other', amount: 0 }
        }
      >
        <ProFormSelect
          name="type"
          label="纠纷类型"
          options={TYPE_OPTIONS}
          rules={[{ required: true, message: '请选择纠纷类型' }]}
        />
        <ProFormSelect
          name="related_deal_id"
          label="关联成交单"
          placeholder="可选,选择关联的拍卖成交单"
          showSearch
          allowClear
          options={dealOptions.map((d) => ({ label: d.label, value: d.id }))}
          tooltip="可选,选择后系统将自动回填买卖双方信息(此处仅记录关联,不自动回填)"
        />
        <ProFormText
          name="complainant"
          label="申诉人"
          placeholder="请输入申诉人"
          rules={[{ required: true, message: '请输入申诉人' }]}
        />
        <ProFormText
          name="respondent"
          label="被诉人"
          placeholder="请输入被诉人"
          rules={[{ required: true, message: '请输入被诉人' }]}
        />
        <ProFormDigit
          name="amount"
          label="争议金额(¥)"
          placeholder="请输入争议金额"
          min={0}
          fieldProps={{ precision: 2 }}
          rules={[{ required: true, message: '请输入争议金额' }]}
        />
        <ProFormTextArea
          name="description"
          label="问题描述"
          placeholder="请详细描述纠纷情况"
          fieldProps={{ autoSize: { minRows: 3, maxRows: 8 } }}
        />
      </DrawerForm>

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
