import {
  App,
  Button,
  Card,
  Col,
  Divider,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Radio,
  Row,
  Select,
  Space,
  Tag,
  Upload,
  DatePicker,
} from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import {
  CloudUploadOutlined,
  EyeOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { useRef, useState } from 'react';
import dayjs from 'dayjs';

import { useTableRefresh } from '../../hooks/useTableRefresh';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import RefreshButton from '../../components/RefreshButton';
import { getGeneProfileOptions, type GeneProfileOption } from '../../services/gene';
import {
  createDetectionReport,
  deleteDetectionReport,
  getDetectionItemTypes,
  getDetectionOrderOptions,
  getDetectionOrgOptions,
  getDetectionReport,
  getDetectionReports,
  updateDetectionReport,
  type DetectionItemType,
  type DetectionOrderOption,
  type DetectionOrgOption,
  type DetectionReport,
  type DetectionReportStatus,
  type StructuredResultData,
  type DnaResultData,
  type DiseaseScreenResultData,
  type PaternityResultData,
  type VarietyResultData,
} from '../../services/detection';

// ==================== 辅助函数 ====================

// 根据项目名称生成项目类型 code
function getProjectCode(projectName: string): string {
  const map: Record<string, string> = {
    'DNA亲子鉴定': 'dna_paternity',
    'DNA品种鉴定': 'dna_variety',
    'DNA性别鉴定': 'dna_gender',
    'DNA赛程性能检测': 'dna_race',
    'DNA健康筛查': 'dna_health',
    'DNA血统分析': 'dna_ancestry',
  };
  return map[projectName] || 'general';
}

// 生成报告编号
function generateReportNo(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 900) + 100);
  return `REP-${y}-${m}-${d}-${rand}`;
}

// 状态标签映射
const STATUS_MAP: Record<DetectionReportStatus, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  pending: { color: 'warning', label: '待审核' },
  published: { color: 'success', label: '已发布' },
  rejected: { color: 'error', label: '已驳回' },
};

// ==================== 结构化结果表单组件 ====================

// DNA 身份认证/亲子鉴定 结果表单
const DnaResultForm = ({ value, onChange }: { value?: DnaResultData; onChange: (v: DnaResultData) => void }) => (
  <div className="structured-result-form">
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="DNA比对结果" required>
          <Radio.Group
            value={value?.match_result || 'match'}
            onChange={(e) => onChange({ ...(value || ({} as DnaResultData)), match_result: e.target.value })}
          >
            <Radio value="match">匹配</Radio>
            <Radio value="mismatch">不匹配</Radio>
            <Radio value="partial">部分匹配</Radio>
          </Radio.Group>
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="匹配度(%)">
          <Input
            type="number"
            min={0}
            max={100}
            value={value?.match_percent ?? ''}
            placeholder="如 99.98"
            onChange={(e) => onChange({ ...(value || ({} as DnaResultData)), match_percent: Number(e.target.value) || 0 })}
          />
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="检测位点数">
          <Input
            type="number"
            min={0}
            value={value?.loci_count ?? ''}
            placeholder="如 16"
            onChange={(e) => onChange({ ...(value || ({} as DnaResultData)), loci_count: Number(e.target.value) || 0 })}
          />
        </Form.Item>
      </Col>
    </Row>
    <Form.Item label="检测结论" required>
      <Input.TextArea
        rows={3}
        value={value?.conclusion || ''}
        placeholder="请输入检测结论..."
        onChange={(e) => onChange({ ...(value || ({} as DnaResultData)), conclusion: e.target.value })}
      />
    </Form.Item>
  </div>
);

// 遗传病筛查 结果表单
const DiseaseScreenResultForm = ({ value, onChange }: { value?: DiseaseScreenResultData; onChange: (v: DiseaseScreenResultData) => void }) => {
  const items = value?.items || [];
  const updateItem = (idx: number, field: string, val: string) => {
    const newItems = [...items];
    (newItems[idx] as any)[field] = val;
    onChange({ ...(value || { conclusion: '' }), items: newItems });
  };
  const addItem = () => {
    onChange({
      ...(value || { conclusion: '' }),
      items: [...items, { name: '', result: 'negative', value: '' }],
    });
  };
  const removeItem = (idx: number) => {
    const newItems = items.filter((_, i) => i !== idx);
    onChange({ ...(value || { conclusion: '' }), items: newItems });
  };

  return (
    <div className="structured-result-form">
      <Form.Item label="筛查项目列表">
        <div style={{ border: '1px dashed #d9d9d9', borderRadius: 8, padding: 12 }}>
          {items.map((item, idx) => (
            <Row key={idx} gutter={8} style={{ marginBottom: 8 }} align="middle">
              <Col span={8}>
                <Input
                  placeholder="项目名称"
                  value={item.name}
                  onChange={(e) => updateItem(idx, 'name', e.target.value)}
                />
              </Col>
              <Col span={6}>
                <Select
                  value={item.result}
                  onChange={(v) => updateItem(idx, 'result', v)}
                  options={[
                    { label: '阴性', value: 'negative' },
                    { label: '阳性', value: 'positive' },
                  ]}
                />
              </Col>
              <Col span={8}>
                <Input
                  placeholder="检测值"
                  value={item.value}
                  onChange={(e) => updateItem(idx, 'value', e.target.value)}
                />
              </Col>
              <Col span={2}>
                <Button danger type="link" onClick={() => removeItem(idx)}>删除</Button>
              </Col>
            </Row>
          ))}
          <Button type="dashed" onClick={addItem} icon={<PlusOutlined />} block>
            添加筛查项目
          </Button>
        </div>
      </Form.Item>
      <Form.Item label="综合结论">
        <Input.TextArea
          rows={3}
          value={value?.conclusion || ''}
          placeholder="请输入综合结论..."
          onChange={(e) => onChange({ ...(value || { items: [] }), conclusion: e.target.value } as DiseaseScreenResultData)}
        />
      </Form.Item>
    </div>
  );
};

// 亲子鉴定 结果表单
const PaternityResultForm = ({ value, onChange }: { value?: PaternityResultData; onChange: (v: PaternityResultData) => void }) => (
  <div className="structured-result-form">
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item label="父本确认">
          <Radio.Group
            value={value?.sire_confirmed ? 'yes' : 'no'}
            onChange={(e) => onChange({ ...(value || ({} as PaternityResultData)), sire_confirmed: e.target.value === 'yes' })}
          >
            <Radio value="yes">确认</Radio>
            <Radio value="no">不确认</Radio>
          </Radio.Group>
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="母本确认">
          <Radio.Group
            value={value?.dam_confirmed ? 'yes' : 'no'}
            onChange={(e) => onChange({ ...(value || ({} as PaternityResultData)), dam_confirmed: e.target.value === 'yes' })}
          >
            <Radio value="yes">确认</Radio>
            <Radio value="no">不确认</Radio>
          </Radio.Group>
        </Form.Item>
      </Col>
      <Col span={8}>
        <Form.Item label="亲权概率(%)">
          <Input
            type="number"
            min={0}
            max={100}
            value={value?.paternity_probability ?? ''}
            placeholder="如 99.99"
            onChange={(e) => onChange({ ...(value || ({} as PaternityResultData)), paternity_probability: Number(e.target.value) || 0 })}
          />
        </Form.Item>
      </Col>
    </Row>
    <Form.Item label="检测结论">
      <Input.TextArea
        rows={3}
        value={value?.conclusion || ''}
        placeholder="请输入检测结论..."
        onChange={(e) => onChange({ ...(value || ({} as PaternityResultData)), conclusion: e.target.value })}
      />
    </Form.Item>
  </div>
);

// 品种鉴定 结果表单
const VarietyResultForm = ({ value, onChange }: { value?: VarietyResultData; onChange: (v: VarietyResultData) => void }) => (
  <div className="structured-result-form">
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item label="品系匹配度(%)">
          <Input
            type="number"
            min={0}
            max={100}
            value={value?.breed_match_percent ?? ''}
            placeholder="如 95.5"
            onChange={(e) => onChange({ ...(value || ({} as VarietyResultData)), breed_match_percent: Number(e.target.value) || 0 })}
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="匹配品系">
          <Input
            value={value?.matched_breed || ''}
            placeholder="如 詹森×凡龙"
            onChange={(e) => onChange({ ...(value || ({} as VarietyResultData)), matched_breed: e.target.value })}
          />
        </Form.Item>
      </Col>
    </Row>
    <Form.Item label="检测结论">
      <Input.TextArea
        rows={3}
        value={value?.conclusion || ''}
        placeholder="请输入检测结论..."
        onChange={(e) => onChange({ ...(value || ({} as VarietyResultData)), conclusion: e.target.value })}
      />
    </Form.Item>
  </div>
);

// 通用文本结果表单
const GenericResultForm = ({ value, onChange }: { value?: string; onChange: (v: string) => void }) => (
  <Form.Item label="检测结果描述">
    <Input.TextArea
      rows={4}
      value={value || ''}
      placeholder="请输入检测结果描述..."
      onChange={(e) => onChange(e.target.value)}
    />
  </Form.Item>
);

// 根据项目类型渲染结构化结果表单
function renderResultForm(
  projectName: string,
  resultData: StructuredResultData | null,
  onResultDataChange: (d: StructuredResultData | null) => void,
  onTextChange: (t: string) => void,
  resultText: string,
) {
  void resultText; // 用于通用表单回显

  const code = getProjectCode(projectName);
  switch (code) {
    case 'dna_paternity':
      return (
        <PaternityResultForm
          value={resultData as PaternityResultData | undefined}
          onChange={(v) => { onResultDataChange(v); onTextChange(v.conclusion || ''); }}
        />
      );
    case 'dna_variety':
    case 'dna_ancestry':
      return (
        <VarietyResultForm
          value={resultData as VarietyResultData | undefined}
          onChange={(v) => { onResultDataChange(v); onTextChange(v.conclusion || ''); }}
        />
      );
    case 'dna_health':
      return (
        <DiseaseScreenResultForm
          value={resultData as DiseaseScreenResultData | undefined}
          onChange={(v) => { onResultDataChange(v); onTextChange(v.conclusion || ''); }}
        />
      );
    case 'dna_gender':
    case 'dna_race':
      return (
        <DnaResultForm
          value={resultData as DnaResultData | undefined}
          onChange={(v) => { onResultDataChange(v); onTextChange(v.conclusion || ''); }}
        />
      );
    default:
      return <GenericResultForm value={resultText} onChange={onTextChange} />;
  }
}

// ==================== 预览面板 ====================

const ReportPreview = ({ data }: { data: {
  report_no: string;
  test_org: string;
  project: string;
  test_date: string;
  ring_number: string;
  user_name: string;
  result: string;
  status: DetectionReportStatus;
  file_name: string;
} }) => {
  const statusInfo = STATUS_MAP[data.status];
  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      padding: 24,
      minHeight: 500,
    }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, color: '#1f1f1f' }}>信鸽基因检测报告</h2>
        <Tag color={statusInfo?.color || 'default'} style={{ marginTop: 8 }}>
          {statusInfo?.label || '草稿'}
        </Tag>
      </div>
      <Divider style={{ margin: '12px 0' }} />
      <Row gutter={[12, 12]}>
        <Col span={12}>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>报告编号</div>
          <div style={{ fontWeight: 500 }}>{data.report_no || '—'}</div>
        </Col>
        <Col span={12}>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>检测日期</div>
          <div style={{ fontWeight: 500 }}>{data.test_date || '—'}</div>
        </Col>
        <Col span={12}>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>鸽主</div>
          <div style={{ fontWeight: 500 }}>{data.user_name || '—'}</div>
        </Col>
        <Col span={12}>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>足环号</div>
          <div style={{ fontWeight: 500 }}>{data.ring_number || '—'}</div>
        </Col>
        <Col span={12}>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>检测机构</div>
          <div style={{ fontWeight: 500 }}>{data.test_org || '—'}</div>
        </Col>
        <Col span={12}>
          <div style={{ color: '#8c8c8c', fontSize: 12 }}>检测项目</div>
          <div style={{ fontWeight: 500 }}>{data.project || '—'}</div>
        </Col>
      </Row>
      <Divider style={{ margin: '16px 0' }} />
      <div style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 4 }}>检测结果</div>
      <div style={{
        background: '#fafafa',
        borderRadius: 8,
        padding: 12,
        minHeight: 80,
        whiteSpace: 'pre-wrap',
        color: data.result ? '#1f1f1f' : '#bfbfbf',
      }}>
        {data.result || '（请在左侧填写检测结果）'}
      </div>
      {data.file_name && (
        <>
          <Divider style={{ margin: '16px 0' }} />
          <div style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 4 }}>报告文件</div>
          <div style={{
            background: '#e6f4ff',
            borderRadius: 8,
            padding: '8px 12px',
            color: '#1677ff',
          }}>
            📎 {data.file_name}
          </div>
        </>
      )}
    </div>
  );
};

// ==================== 主组件 ====================

const DetectionReport = () => {
  const { message: msg } = App.useApp();
  const currentUser = useCurrentUser();
  const canReport = hasPermission(currentUser, 'detection:report');
  const actionRef = useRef<ActionType>();
  const { tableLoading, handleRefresh } = useTableRefresh(actionRef, { messageApi: msg });

  // 新增/编辑抽屉
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editing, setEditing] = useState<DetectionReport | null>(null);

  // 详情抽屉
  const [detailVisible, setDetailVisible] = useState(false);
  const [detail, setDetail] = useState<DetectionReport | null>(null);

  // 下拉数据
  const [orgOptions, setOrgOptions] = useState<DetectionOrgOption[]>([]);
  const [itemTypes, setItemTypes] = useState<DetectionItemType[]>([]);
  const [profileOptions, setProfileOptions] = useState<GeneProfileOption[]>([]);
  const [orderOptions, setOrderOptions] = useState<DetectionOrderOption[]>([]);

  // 表单状态（非 ProForm，手动管理以支持结构化表单）
  const [formValues, setFormValues] = useState<{
    order_id?: number | null;
    gene_profile_id?: number | null;
    report_no: string;
    test_org: string;
    org_id?: number | null;
    project: string;
    test_date: string;
    result: string;
    result_data: StructuredResultData | null;
    report_url?: string;
    status: DetectionReportStatus;
    file_name?: string;
    file_size?: number;
  }>({
    report_no: '',
    test_org: '',
    project: '',
    test_date: dayjs().format('YYYY-MM-DD'),
    result: '',
    result_data: null,
    status: 'draft',
  });

  // 文件上传
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // 加载下拉数据
  const loadOptions = () => {
    if (!orgOptions.length) {
      getDetectionOrgOptions().then(setOrgOptions).catch(() => {});
    }
    if (!itemTypes.length) {
      getDetectionItemTypes().then(setItemTypes).catch(() => {});
    }
    if (!profileOptions.length) {
      getGeneProfileOptions().then(setProfileOptions).catch(() => {});
    }
    if (!orderOptions.length) {
      getDetectionOrderOptions().then(setOrderOptions).catch(() => {});
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFileList([]);
    setFormValues({
      report_no: generateReportNo(),
      test_org: '',
      project: '',
      test_date: dayjs().format('YYYY-MM-DD'),
      result: '',
      result_data: null,
      status: 'draft',
    });
    setDrawerVisible(true);
    loadOptions();
  };

  const openEdit = (record: DetectionReport) => {
    setEditing(record);
    setFileList([]);
    setFormValues({
      order_id: record.order_id ?? undefined,
      gene_profile_id: record.gene_profile_id ?? undefined,
      report_no: record.report_no,
      test_org: record.test_org,
      project: record.project,
      test_date: record.test_date || dayjs().format('YYYY-MM-DD'),
      result: record.result || '',
      result_data: record.result_data || null,
      report_url: record.report_url || undefined,
      status: record.status || 'draft',
    });
    setDrawerVisible(true);
    loadOptions();
  };

  // 查看详情
  const openDetail = async (record: DetectionReport) => {
    try {
      const d = await getDetectionReport(record.id);
      setDetail(d);
      setDetailVisible(true);
    } catch {
      // 拦截器已提示错误
    }
  };

  // 选择订单后自动带出所有信息
  const handleOrderChange = (orderId: number | null) => {
    if (!orderId) {
      setFormValues((v) => ({
        ...v,
        order_id: null,
        gene_profile_id: null,
        test_org: '',
        org_id: null,
        project: '',
        result: '',
        result_data: null,
      }));
      return;
    }
    const order = orderOptions.find((o) => o.id === orderId);
    if (order) {
      setFormValues((v) => ({
        ...v,
        order_id: order.id,
        // 自动带出鸽只基因档案
        gene_profile_id: order.gene_profile_id ?? v.gene_profile_id,
        // 自动带出检测机构
        org_id: order.org_id ?? null,
        test_org: order.test_org || '',
        // 自动带出检测项目
        project: order.project || '',
        // 重置结果（因为项目可能改变）
        result: '',
        result_data: null,
      }));
    }
  };

  // 选择机构后自动带出名称
  const handleOrgChange = (orgId: number | null) => {
    if (!orgId) {
      setFormValues((v) => ({ ...v, org_id: null, test_org: '' }));
      return;
    }
    const org = orgOptions.find((o) => o.id === orgId);
    if (org) {
      setFormValues((v) => ({ ...v, org_id: org.id, test_org: org.name }));
    }
  };

  // 提交
  const handleSubmit = async (publishStatus?: DetectionReportStatus) => {
    const currentStatus = publishStatus || formValues.status;

    if (!formValues.test_org) {
      msg.warning('请选择检测机构');
      return false;
    }
    if (!formValues.project) {
      msg.warning('请选择检测项目');
      return false;
    }
    if (!formValues.report_no) {
      msg.warning('报告编号不能为空');
      return false;
    }
    if (!formValues.result && !formValues.result_data) {
      msg.warning('请填写检测结果');
      return false;
    }

    const payload = {
      order_id: formValues.order_id ?? null,
      gene_profile_id: formValues.gene_profile_id ?? null,
      report_no: formValues.report_no,
      test_org: formValues.test_org,
      project: formValues.project,
      result: formValues.result || undefined,
      result_data: formValues.result_data || null,
      report_url: formValues.report_url || undefined,
      test_date: formValues.test_date || undefined,
      status: currentStatus,
      file_name: fileList[0]?.name || undefined,
      file_size: fileList[0]?.size || undefined,
    };

    try {
      if (editing) {
        await updateDetectionReport(editing.id, payload);
        msg.success('报告更新成功');
      } else {
        await createDetectionReport(payload);
        msg.success(
          currentStatus === 'published' ? '报告已发布' :
          currentStatus === 'pending' ? '报告已提交审核' :
          '报告草稿已保存'
        );
      }
      setDrawerVisible(false);
      handleRefresh();
      return true;
    } catch {
      return false;
    }
  };

  // 删除报告
  const handleDelete = async (record: DetectionReport) => {
    try {
      await deleteDetectionReport(record.id);
      msg.success('删除成功');
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 文件上传处理
  const uploadProps: UploadProps = {
    fileList,
    beforeUpload: () => false, // 阻止自动上传，手动处理
    onChange: ({ fileList: newList }) => {
      setFileList(newList.slice(-1)); // 只保留最后一个文件
    },
    onRemove: () => {
      setFileList([]);
    },
  };

  const columns: ProColumns<DetectionReport>[] = [
    { title: '序号', dataIndex: 'index', valueType: 'index', width: 60, hideInSearch: true },
    {
      title: '报告编号',
      dataIndex: 'report_no',
      width: 180,
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => (
        <span style={{ fontFamily: 'monospace' }}>{record.report_no}</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      hideInSearch: true,
      render: (_, record) => {
        const s = STATUS_MAP[record.status];
        return <Tag color={s?.color || 'default'}>{s?.label || record.status}</Tag>;
      },
    },
    {
      title: '检测机构',
      dataIndex: 'test_org',
      width: 160,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '检测项目',
      dataIndex: 'project',
      width: 130,
      hideInSearch: true,
      ellipsis: true,
    },
    {
      title: '检测结果',
      dataIndex: 'result',
      width: 200,
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => (record.result ? record.result : '-'),
    },
    {
      title: '关联鸽只',
      dataIndex: 'gene_profile',
      width: 170,
      hideInSearch: true,
      render: (_, record) => {
        const g = record.gene_profile;
        if (!g) return '-';
        return (
          <span>
            {g.ring_number} {g.name}
          </span>
        );
      },
    },
    {
      title: '检测日期',
      dataIndex: 'test_date',
      width: 110,
      hideInSearch: true,
      render: (_, record) => (record.test_date ? record.test_date : '-'),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 140,
      hideInSearch: true,
      render: (_, record) =>
        record.created_at ? dayjs(record.created_at).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '报告编号',
      dataIndex: 'report_no_search',
      hideInTable: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>
            详情
          </Button>
          {canReport && record.status !== 'published' && (
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          )}
          {canReport && (
            <Popconfirm title="确认删除该检测报告?" onConfirm={() => handleDelete(record)}>
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
      <ProTable<DetectionReport>
        headerTitle="检测报告管理"
        actionRef={actionRef}
        loading={tableLoading}
        rowKey="id"
        columns={columns}
        options={{ density: false, reload: false }}
        scroll={{ x: 1200 }}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          const { current, pageSize, report_no_search, order_id, gene_profile_id } = params;
          try {
            const res = await getDetectionReports({
              page: current,
              pageSize,
              report_no: report_no_search as string | undefined,
              order_id: order_id as number | string | undefined,
              gene_profile_id: gene_profile_id as number | string | undefined,
            });
            return { data: res.list, success: true, total: res.total };
          } catch {
            return { data: [], success: false, total: 0 };
          }
        }}
        toolBarRender={() =>
          canReport
            ? [
                <Button key="create" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                  录入报告
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

      {/* 新增/编辑抽屉 - 左表单右预览布局 */}
      <Drawer
        title={editing ? '编辑检测报告' : '录入检测报告'}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={1100}
        destroyOnHidden
        maskClosable={false}
        extra={
          <Space>
            <Button onClick={() => setDrawerVisible(false)}>取消</Button>
            <Button type="default" onClick={() => handleSubmit('draft')}>
              保存草稿
            </Button>
            <Button type="primary" onClick={() => handleSubmit('published')}>
              {editing ? '保存修改' : '确认发布'}
            </Button>
          </Space>
        }
      >
        <Row gutter={24}>
          {/* 左侧表单 */}
          <Col span={14}>
            {/* ① 选择预约订单 */}
            <Card
              size="small"
              title={<span style={{ fontWeight: 600 }}>① 选择预约订单</span>}
              style={{ marginBottom: 16 }}
              styles={{ body: { padding: 16 } }}
            >
              <Form layout="vertical">
                <Form.Item label="关联预约订单">
                  <Select
                    showSearch
                    allowClear
                    placeholder="选择订单(可选,录入后订单自动置为已完成)"
                    optionFilterProp="label"
                    value={formValues.order_id ?? undefined}
                    onChange={(v) => handleOrderChange(v ?? null)}
                    options={orderOptions.map((o) => ({
                      label: `${o.order_no} - ${o.user_name}${o.ring_number ? ` (${o.ring_number})` : ''}`,
                      value: o.id,
                    }))}
                  />
                </Form.Item>
                {formValues.order_id && (
                  <div style={{
                    background: '#f6ffed',
                    border: '1px solid #b7eb8f',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 12,
                    color: '#389e0d',
                  }}>
                    ✅ 已自动带出: 检测机构「{formValues.test_org}」 · 检测项目「{formValues.project}」
                  </div>
                )}
              </Form>
            </Card>

            {/* ② 检测信息确认 */}
            <Card
              size="small"
              title={<span style={{ fontWeight: 600 }}>② 检测信息确认</span>}
              style={{ marginBottom: 16 }}
              styles={{ body: { padding: 16 } }}
            >
              <Form layout="vertical">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="报告编号" required>
                      <Input
                        value={formValues.report_no}
                        onChange={(e) => setFormValues((v) => ({ ...v, report_no: e.target.value }))}
                        placeholder="系统自动生成"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="检测日期">
                      <DatePicker
                        style={{ width: '100%' }}
                        value={formValues.test_date ? dayjs(formValues.test_date) : null}
                        onChange={(d) => setFormValues((v) => ({
                          ...v,
                          test_date: d ? d.format('YYYY-MM-DD') : '',
                        }))}
                        placeholder="请选择检测日期"
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="检测机构">
                      <Select
                        showSearch
                        allowClear
                        placeholder="选择机构"
                        optionFilterProp="label"
                        value={formValues.org_id ?? undefined}
                        onChange={(v) => handleOrgChange(v ?? null)}
                        options={orgOptions.map((o) => ({
                          label: `${o.name}${o.code ? ` (${o.code})` : ''}`,
                          value: o.id,
                        }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="检测机构名称">
                      <Input
                        value={formValues.test_org}
                        onChange={(e) => setFormValues((v) => ({ ...v, test_org: e.target.value }))}
                        placeholder="选择机构后自动带出,也可手动输入"
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="检测项目" required>
                      <Select
                        showSearch
                        allowClear
                        placeholder="选择检测项目"
                        value={formValues.project || undefined}
                        onChange={(v) => setFormValues((val) => ({
                          ...val,
                          project: v || '',
                          result: '',
                          result_data: null,
                        }))}
                        options={itemTypes.map((i) => ({ label: i.name, value: i.name }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="关联鸽只基因档案">
                      <Select
                        showSearch
                        allowClear
                        placeholder="选择鸽只(可选)"
                        optionFilterProp="label"
                        value={formValues.gene_profile_id ?? undefined}
                        onChange={(v) => setFormValues((val) => ({
                          ...val,
                          gene_profile_id: v ?? null,
                        }))}
                        options={profileOptions.map((o) => ({
                          label: `${o.ring_number} ${o.name}`,
                          value: o.id,
                        }))}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </Card>

            {/* ③ 录入检测结果 */}
            <Card
              size="small"
              title={<span style={{ fontWeight: 600 }}>③ 录入检测结果</span>}
              style={{ marginBottom: 16 }}
              styles={{ body: { padding: 16 } }}
            >
              {formValues.project ? (
                renderResultForm(
                  formValues.project,
                  formValues.result_data,
                  (d) => setFormValues((v) => ({ ...v, result_data: d })),
                  (t) => setFormValues((v) => ({ ...v, result: t })),
                  formValues.result,
                )
              ) : (
                <div style={{ color: '#8c8c8c', textAlign: 'center', padding: '20px 0' }}>
                  请先在上方选择检测项目
                </div>
              )}
            </Card>

            {/* ④ 报告文件上传 */}
            <Card
              size="small"
              title={<span style={{ fontWeight: 600 }}>④ 报告文件上传</span>}
              style={{ marginBottom: 16 }}
              styles={{ body: { padding: 16 } }}
            >
              <Upload.Dragger {...uploadProps} maxCount={1}>
                <p className="ant-upload-drag-icon">
                  <CloudUploadOutlined />
                </p>
                <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                <p className="ant-upload-hint" style={{ fontSize: 12 }}>
                  支持 PDF、JPG、PNG 格式,单个文件不超过 20MB
                </p>
              </Upload.Dragger>
            </Card>

            {/* ⑤ 报告状态 */}
            <Card
              size="small"
              title={<span style={{ fontWeight: 600 }}>⑤ 报告状态</span>}
              styles={{ body: { padding: 16 } }}
            >
              <Form layout="vertical">
                <Form.Item label="状态">
                  <Radio.Group
                    value={formValues.status}
                    onChange={(e) => setFormValues((v) => ({ ...v, status: e.target.value }))}
                  >
                    <Radio value="draft">草稿</Radio>
                    <Radio value="pending">待审核</Radio>
                    <Radio value="published">已发布</Radio>
                  </Radio.Group>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          {/* 右侧预览 */}
          <Col span={10}>
            <div style={{ position: 'sticky', top: 0 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>📄 报告实时预览</div>
              <ReportPreview
                data={{
                  report_no: formValues.report_no,
                  test_org: formValues.test_org,
                  project: formValues.project,
                  test_date: formValues.test_date,
                  ring_number: orderOptions.find((o) => o.id === formValues.order_id)?.ring_number || '',
                  user_name: orderOptions.find((o) => o.id === formValues.order_id)?.user_name || '',
                  result: formValues.result,
                  status: formValues.status,
                  file_name: fileList[0]?.name || '',
                }}
              />
            </div>
          </Col>
        </Row>
      </Drawer>

      {/* 详情抽屉 */}
      <Drawer
        title="检测报告详情"
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={600}
        destroyOnHidden
      >
        {detail && (
          <div style={{ lineHeight: 2 }}>
            <p>
              <strong>报告编号:</strong> {detail.report_no}
            </p>
            <p>
              <strong>状态:</strong>{' '}
              <Tag color={STATUS_MAP[detail.status]?.color}>{STATUS_MAP[detail.status]?.label || detail.status}</Tag>
            </p>
            <p>
              <strong>检测机构:</strong> {detail.test_org || '-'}
            </p>
            <p>
              <strong>检测项目:</strong> {detail.project}
            </p>
            <p>
              <strong>检测日期:</strong> {detail.test_date || '-'}
            </p>
            {detail.order_id && (
              <p>
                <strong>关联订单 ID:</strong> {detail.order_id}
              </p>
            )}
            {detail.gene_profile && (
              <p>
                <strong>关联鸽只:</strong> {detail.gene_profile.ring_number} {detail.gene_profile.name}
                {detail.gene_profile.owner_name ? `(鸽主:${detail.gene_profile.owner_name})` : ''}
              </p>
            )}
            <Divider />
            <p>
              <strong>检测结果:</strong>
            </p>
            {detail.result_data ? (
              <div style={{ background: '#fafafa', padding: 12, borderRadius: 4 }}>
                {renderStructuredDetail(detail.result_data)}
              </div>
            ) : (
              <div
                style={{
                  background: '#fafafa',
                  padding: 12,
                  borderRadius: 4,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {detail.result || '-'}
              </div>
            )}
            {detail.report_url && (
              <p>
                <strong>报告文件:</strong>{' '}
                <a href={detail.report_url} target="_blank" rel="noreferrer">
                  {detail.report_url}
                </a>
              </p>
            )}
            <p>
              <strong>录入时间:</strong>{' '}
              {detail.created_at ? dayjs(detail.created_at).format('YYYY-MM-DD HH:mm') : '-'}
            </p>
          </div>
        )}
      </Drawer>
    </>
  );
};

// 详情中渲染结构化结果
function renderStructuredDetail(data: StructuredResultData): React.ReactNode {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;

  if ('match_result' in d) {
    // DNA 类型
    const matchMap: Record<string, string> = { match: '✅ 匹配', mismatch: '❌ 不匹配', partial: '⚠️ 部分匹配' };
    const matchResult = d.match_result as string;
    const conclusion = d.conclusion as string | undefined;
    return (
      <div>
        <div>DNA比对结果: {matchMap[matchResult] || matchResult}</div>
        <div>匹配度: {d.match_percent as number}%</div>
        <div>检测位点数: {d.loci_count as number} 个</div>
        {conclusion && (
          <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>结论: {conclusion}</div>
        )}
      </div>
    );
  }
  if ('sire_confirmed' in d) {
    // 亲子鉴定
    const conclusion = d.conclusion as string | undefined;
    return (
      <div>
        <div>父本确认: {d.sire_confirmed ? '✅ 确认' : '❌ 不确认'}</div>
        <div>母本确认: {d.dam_confirmed ? '✅ 确认' : '❌ 不确认'}</div>
        <div>亲权概率: {d.paternity_probability as number}%</div>
        {conclusion && (
          <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>结论: {conclusion}</div>
        )}
      </div>
    );
  }
  if ('breed_match_percent' in d) {
    // 品种鉴定
    const conclusion = d.conclusion as string | undefined;
    return (
      <div>
        <div>品系匹配度: {d.breed_match_percent as number}%</div>
        <div>匹配品系: {(d.matched_breed as string) || '-'}</div>
        {conclusion && (
          <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>结论: {conclusion}</div>
        )}
      </div>
    );
  }
  if ('items' in d && Array.isArray(d.items)) {
    // 遗传病筛查
    const conclusion = d.conclusion as string | undefined;
    const items = d.items as Array<{ name: string; result: string; value: string }>;
    return (
      <div>
        {items.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span>{item.name}</span>
            <span>
              {item.result === 'positive' ? (
                <Tag color="error">阳性</Tag>
              ) : (
                <Tag color="success">阴性</Tag>
              )}
              <span style={{ marginLeft: 8, color: '#8c8c8c' }}>{item.value}</span>
            </span>
          </div>
        ))}
        {conclusion && (
          <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>综合结论: {conclusion}</div>
        )}
      </div>
    );
  }
  // 通用: JSON 展示
  return <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(data, null, 2)}</pre>;
}

export default DetectionReport;
