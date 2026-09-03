import {
  App,
  Button,
  Card,
  Col,
  Descriptions,
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
  Typography,
  Upload,
  DatePicker,
} from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import {
  AuditOutlined,
  CheckCircleFilled,
  CloudUploadOutlined,
  ExperimentOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileSearchOutlined,
  PlusOutlined,
  PrinterOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
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

function getDetectionProtocol(project: string) {
  const code = getProjectCode(project);
  const protocols: Record<string, { method: string; basis: string; sample: string }> = {
    dna_paternity: {
      method: 'STR 多位点基因分型与亲权指数分析',
      basis: '依据检测项目标准操作规程进行位点扩增、分型与亲缘关系判定',
      sample: '口腔拭子 / 羽毛毛囊 / 血液样本',
    },
    dna_variety: {
      method: '遗传标记分型与参考群体比对分析',
      basis: '依据检测项目标准操作规程进行特征位点比对与品系相似度评估',
      sample: '口腔拭子 / 羽毛毛囊 / 血液样本',
    },
    dna_health: {
      method: '目标病原核酸扩增与定性分析',
      basis: '依据检测项目标准操作规程进行目标序列筛查与结果判读',
      sample: '口腔拭子 / 泄殖腔拭子 / 血液样本',
    },
    dna_ancestry: {
      method: '遗传标记分型与血统特征比对分析',
      basis: '依据检测项目标准操作规程进行血统特征位点分析',
      sample: '口腔拭子 / 羽毛毛囊 / 血液样本',
    },
  };
  return protocols[code] || {
    method: '目标基因位点检测与生物信息学分析',
    basis: '依据检测项目标准操作规程完成样本处理、数据分析与结果判读',
    sample: '生物样本（具体类型未记录）',
  };
}

function getReportIntegrity(report: DetectionReport) {
  const checks = [report.report_no, report.test_org, report.project, report.test_date, report.result || report.result_data];
  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
}

function getVerificationCode(report: DetectionReport) {
  const source = `${report.id}-${report.report_no}-${report.created_at}`;
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  return `PGR-${hash.toString(16).toUpperCase().padStart(8, '0')}`;
}

// 统一数据准备函数 - 确保详情抽屉和打印使用完全相同的数据
function prepareReportData(report: DetectionReport) {
  const protocol = getDetectionProtocol(report.project);
  const integrity = getReportIntegrity(report);
  const verificationCode = getVerificationCode(report);
  const issuedAt = report.created_at ? dayjs(report.created_at).format('YYYY-MM-DD HH:mm:ss') : '未记录';
  const issuedDate = report.created_at ? dayjs(report.created_at).format('YYYY-MM-DD') : '未记录';
  const statusLabel = STATUS_MAP[report.status]?.label || report.status;
  const profile = report.gene_profile;
  const order = report.order;

  return {
    protocol,
    integrity,
    verificationCode,
    issuedAt,
    issuedDate,
    statusLabel,
    profile,
    order,
    hasTestOrg: !!report.test_org,
    hasResultData: !!(report.result_data || report.result),
    hasFile: !!report.report_url,
    profileOwnerName: profile?.owner_name || '未记录',
    orderNo: order?.order_no || '未关联订单',
    objectName: profile?.name || '未记录',
    ringNumber: profile?.ring_number || '未记录',
    archiveNo: report.gene_profile_id ? `GP-${String(report.gene_profile_id).padStart(6, '0')}` : '未关联档案',
    sampleNo: report.order_id ? `SMP-${String(report.order_id).padStart(6, '0')}` : '未记录',
    testOrg: report.test_org || '未记录',
    project: report.project || '未记录',
    testDate: report.test_date || '未记录',
    reportNo: report.report_no,
    result: report.result || '',
    resultData: report.result_data,
    reportUrl: report.report_url || null,
    status: report.status,
  };
}

const DetectionReport = () => {
  const { message: msg } = App.useApp();
  const currentUser = useCurrentUser();
  const canReport = hasPermission(currentUser, 'detection:report');
  const actionRef = useRef<ActionType>();
  const printContainerRef = useRef<HTMLDivElement>(null);
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

  // 构建打印报告HTML内容 - 权威实验室报告布局
  const buildPrintHtml = (d: DetectionReport): string => {
    const reportData = prepareReportData(d);
    const { protocol, integrity, verificationCode, issuedAt, statusLabel, hasTestOrg, hasResultData, profileOwnerName, orderNo, objectName, ringNumber, archiveNo, sampleNo, testOrg, project, testDate, reportNo, result, resultData, reportUrl, status } = reportData;

    // 检测结果渲染
    let resultHtml = '';
    if (resultData) {
      resultHtml = renderPrintResult(resultData);
    } else {
      resultHtml = `<div class="print-report-raw-result">${result || '暂无检测结果'}</div>`;
    }

    return `
      <div class="print-report-root">
        <!-- 报告抬头 -->
        <div class="print-report-header">
          <div class="print-report-header-top">
            <div class="print-report-header-left">
              <div class="print-report-logo">🧬</div>
              <div>
                <h1 class="print-report-title">信鸽基因检测报告</h1>
                <div class="print-report-subtitle">PIGEON GENETIC TEST REPORT</div>
                <div class="print-report-hint">实验室检测结果电子凭证</div>
              </div>
            </div>
            <div class="print-report-header-right">
              <span class="print-report-status print-status-${status}">${statusLabel}</span>
              <div class="print-report-no-label">报告编号 REPORT NO.</div>
              <div class="print-report-no">${reportNo}</div>
            </div>
          </div>
          <div class="print-report-meta">
            <div class="print-report-meta-cell"><span>检测项目</span><strong>${project || '未记录'}</strong></div>
            <div class="print-report-meta-cell"><span>检测日期</span><strong>${testDate || '未记录'}</strong></div>
            <div class="print-report-meta-cell"><span>签发时间</span><strong>${issuedAt.split(' ')[0]}</strong></div>
            <div class="print-report-meta-cell print-report-meta-last"><span>报告版本</span><strong>V1.0</strong></div>
          </div>
        </div>

        <!-- 01 · 委托方与检测对象信息 + 报告可信状态 -->
        <div class="print-report-row">
          <div class="print-section print-section-main">
            <div class="print-section-title">01 · 委托方与检测对象信息</div>
            <table class="print-desc-table">
              <tr>
                <th>委托人 / 鸽主</th>
                <td>${profileOwnerName}</td>
                <th>关联订单号</th>
                <td>${orderNo}</td>
              </tr>
              <tr>
                <th>检测对象</th>
                <td>${objectName}</td>
                <th>足环号</th>
                <td><code>${ringNumber}</code></td>
              </tr>
              <tr>
                <th>档案编号</th>
                <td>${archiveNo}</td>
                <th>样本编号</th>
                <td>${sampleNo}</td>
              </tr>
              <tr>
                <th>样本类型</th>
                <td colspan="3">${protocol.sample}</td>
              </tr>
            </table>
          </div>
          <div class="print-section print-section-trust">
            <div class="print-section-title">
              <span>🛡️</span> 报告可信状态
            </div>
            <div class="print-trust-list">
              <div class="print-trust-item"><span class="print-trust-dot print-trust-dot-green"></span>报告已纳入系统档案</div>
              <div class="print-trust-item">
                <span class="print-trust-dot ${integrity === 100 ? 'print-trust-dot-green' : 'print-trust-dot-orange'}"></span>
                ${integrity === 100 ? '关键检测字段完整' : '部分检测字段未记录'}
              </div>
              <div class="print-trust-item">
                <span class="print-trust-dot ${hasResultData ? 'print-trust-dot-green' : 'print-trust-dot-orange'}"></span>
                ${hasResultData ? '检测结果可追溯' : '暂无结构化检测结果'}
              </div>
            </div>
            <hr class="print-divider" />
            <div class="print-trust-bar-label"><span>数据完整度</span><strong>${integrity}%</strong></div>
            <div class="print-trust-bar"><div class="print-trust-bar-fill" style="width:${integrity}%;background:${integrity === 100 ? '#2f855a' : '#d97706'}"></div></div>
          </div>
        </div>

        <!-- 02 · 检测机构与技术信息 -->
        <div class="print-section">
          <div class="print-section-title">02 · 检测机构与技术信息</div>
          <table class="print-desc-table print-desc-table-bordered">
            <tr>
              <th>检测机构</th>
              <td>${testOrg}</td>
              <th>机构记录状态</th>
              <td>${hasTestOrg ? '<span class="print-tag print-tag-green">系统有效机构</span>' : '<span class="print-tag print-tag-orange">机构信息未记录</span>'}</td>
            </tr>
            <tr>
              <th>检测项目</th>
              <td>${project || '未记录'}</td>
              <th>质量控制</th>
              <td>${hasResultData ? '<span class="print-tag print-tag-blue">结果字段校验通过</span>' : '<span class="print-tag print-tag-orange">待结果数据</span>'}</td>
            </tr>
            <tr>
              <th>检测方法</th>
              <td colspan="3">${protocol.method}</td>
            </tr>
            <tr>
              <th>检测依据</th>
              <td colspan="3">${protocol.basis}</td>
            </tr>
            <tr>
              <th>检测日期</th>
              <td>${testDate || '未记录'}</td>
              <th>报告签发时间</th>
              <td>${issuedAt}</td>
            </tr>
          </table>
        </div>

        <!-- 03 · 检测结果与专业判读 -->
        <div class="print-section print-section-result">
          <div class="print-section-title print-section-title-dark">03 · 检测结果与专业判读</div>
          <div class="print-result-wrapper">
            <div class="print-result-header">
              <span>🔍 核心检测数据</span>
              <span class="print-tag print-tag-green">数据判读完成</span>
            </div>
            ${resultHtml}
          </div>
        </div>

        <!-- 04 · 结果解释与报告声明 -->
        <div class="print-section print-section-declaration">
          <div class="print-section-title">04 · 结果解释与报告声明</div>
          <div class="print-declaration-content">
            <p>本报告结果仅对本次送检样本负责。检测结论依据当前提交的样本、检测项目及系统记录的结构化数据形成，不应脱离样本身份与检测条件单独使用。</p>
            <p>如样本身份、采集过程或保存条件存在疑问，建议重新采样复检。涉及亲缘、健康或品系判断时，应结合谱系资料、临床表现及其他专业证据综合评估。</p>
            <p>未经检测机构书面许可，不得对本报告进行部分复制、修改或用于超出检测目的的证明活动。</p>
          </div>
        </div>

        <!-- 05 · 原始文件与记录 / 06 · 电子追溯信息 -->
        <div class="print-report-row">
          <div class="print-section print-section-half">
            <div class="print-section-title">05 · 原始文件与记录</div>
            <div class="print-file-box">
              ${reportUrl ? `
                <div class="print-file-item">
                  <span class="print-file-icon">📄</span>
                  <div>
                    <strong>原始检测报告附件</strong>
                    <div class="print-file-sub">已上传归档</div>
                  </div>
                </div>
              ` : '<div class="print-file-empty">未上传原始报告附件</div>'}
            </div>
          </div>
          <div class="print-section print-section-half">
            <div class="print-section-title">06 · 电子追溯信息</div>
            <table class="print-desc-table print-desc-table-single">
              <tr><th>校验码</th><td><code>${verificationCode}</code></td></tr>
              <tr><th>记录 ID</th><td>DR-${String(d.id).padStart(8, '0')}</td></tr>
              <tr><th>报告版本</th><td>V1.0 · 电子报告</td></tr>
            </table>
          </div>
        </div>

        <!-- 签章栏页脚 -->
        <div class="print-report-signature">
          <div class="print-signature-col">
            <div class="print-signature-line">检测人员：系统未记录</div>
          </div>
          <div class="print-signature-col">
            <div class="print-signature-line">审核人员：系统未记录</div>
          </div>
          <div class="print-signature-col">
            <div class="print-signature-line">签发机构：电子归档</div>
          </div>
        </div>
        <div class="print-report-footer">
          <span>📋 本报告由检测报告管理系统生成并留存</span>
          <span>第 1 页 / 共 1 页</span>
        </div>
      </div>
    `;
  };

  // 打印/导出PDF
  const handlePrint = () => {
    if (!detail) {
      msg.warning('报告数据未加载完成，请稍候重试');
      return;
    }
    try {
      // 将报告内容注入到隐藏的打印容器中
      if (printContainerRef.current) {
        printContainerRef.current.innerHTML = buildPrintHtml(detail);
      }
      // 触发打印（浏览器打印对话框支持"另存为PDF"）
      window.print();
      // 打印后清空打印容器
      if (printContainerRef.current) {
        printContainerRef.current.innerHTML = '';
      }
    } catch (err) {
      console.error('打印失败:', err);
      msg.error('打印失败，请重试');
    }
  };

  // 导出PDF（与打印共用同一逻辑，浏览器打印对话框中选择"另存为PDF"即可）
  const handleExportPdf = () => {
    handlePrint();
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
            return { data: res?.list ?? [], success: true, total: res?.total ?? 0 };
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

      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingRight: 12 }}>
            <div>
              <Typography.Title level={4} style={{ margin: 0, color: '#102a43' }}>检测报告详情</Typography.Title>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>实验室电子报告 · 完整检测记录</Typography.Text>
            </div>
            <Space>
              <Button icon={<PrinterOutlined />} onClick={handlePrint}>打印</Button>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleExportPdf}>导出 PDF</Button>
            </Space>
          </div>
        }
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={960}
        destroyOnHidden
        styles={{ body: { padding: 0, background: '#e9edf2' }, header: { padding: '16px 24px', borderBottom: '1px solid #d7dee8' } }}
      >
        {detail && (() => {
          const reportData = prepareReportData(detail);
          const { protocol, integrity, verificationCode, issuedAt, statusLabel, hasTestOrg, hasResultData, profileOwnerName, orderNo, objectName, ringNumber, archiveNo, sampleNo, testOrg, project, testDate, reportNo, result, resultData, reportUrl, status } = reportData;
          const sectionStyle = { border: '1px solid #d9e2ec', borderRadius: 2, marginBottom: 20, background: '#fff' };
          const sectionTitleStyle = { padding: '11px 16px', background: '#f4f7fa', borderBottom: '1px solid #d9e2ec', color: '#102a43', fontWeight: 700, letterSpacing: 1 };
          return (
            <div style={{ padding: '28px 32px 40px' }}>
              <div style={{ maxWidth: 880, margin: '0 auto', background: '#fff', boxShadow: '0 8px 30px rgba(16,42,67,0.10)', borderTop: '6px solid #102a43' }}>
                <div style={{ padding: '30px 36px 24px', borderBottom: '1px solid #d9e2ec' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                        <div style={{ width: 46, height: 46, display: 'grid', placeItems: 'center', background: '#102a43', color: '#d6b36a' }}>
                          <ExperimentOutlined style={{ fontSize: 25 }} />
                        </div>
                        <div>
                          <Typography.Title level={2} style={{ margin: 0, color: '#102a43', letterSpacing: 4 }}>信鸽基因检测报告</Typography.Title>
                          <Typography.Text style={{ color: '#627d98', letterSpacing: 1.3 }}>PIGEON GENETIC TEST REPORT</Typography.Text>
                        </div>
                      </div>
                      <Typography.Text style={{ color: '#486581' }}>实验室检测结果电子凭证</Typography.Text>
                    </div>
                    <div style={{ minWidth: 225, textAlign: 'right' }}>
                      <Tag color={STATUS_MAP[status]?.color} style={{ margin: 0, padding: '4px 12px', fontWeight: 700 }}>
                        {statusLabel}
                      </Tag>
                      <div style={{ marginTop: 12, color: '#627d98', fontSize: 12 }}>报告编号 REPORT NO.</div>
                      <Typography.Text strong style={{ color: '#102a43', fontFamily: 'monospace', fontSize: 15 }}>{reportNo}</Typography.Text>
                    </div>
                  </div>
                  <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', border: '1px solid #d9e2ec' }}>
                    {[
                      ['检测项目', project || '未记录'],
                      ['检测日期', testDate || '未记录'],
                      ['签发时间', issuedAt.split(' ')[0]],
                      ['报告版本', 'V1.0'],
                    ].map(([label, value], index) => (
                      <div key={label} style={{ padding: '12px 14px', borderRight: index < 3 ? '1px solid #d9e2ec' : undefined }}>
                        <div style={{ color: '#829ab1', fontSize: 11, marginBottom: 4 }}>{label}</div>
                        <div style={{ color: '#243b53', fontWeight: 650 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ padding: '24px 36px 34px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 250px', gap: 20, marginBottom: 20 }}>
                    <div style={{ ...sectionStyle, marginBottom: 0 }}>
                      <div style={sectionTitleStyle}>01 · 委托方与检测对象信息</div>
                      <Descriptions column={2} size="small" colon={false} styles={{ label: { color: '#627d98', width: 92 }, content: { color: '#102a43', fontWeight: 500 } }} style={{ padding: '16px 18px' }}>
                        <Descriptions.Item label="委托人 / 鸽主">{profileOwnerName}</Descriptions.Item>
                        <Descriptions.Item label="关联订单号">{orderNo}</Descriptions.Item>
                        <Descriptions.Item label="检测对象">{objectName}</Descriptions.Item>
                        <Descriptions.Item label="足环号"><Typography.Text code>{ringNumber}</Typography.Text></Descriptions.Item>
                        <Descriptions.Item label="档案编号">{archiveNo}</Descriptions.Item>
                        <Descriptions.Item label="样本编号">{sampleNo}</Descriptions.Item>
                        <Descriptions.Item label="样本类型" span={2}>{protocol.sample}</Descriptions.Item>
                      </Descriptions>
                    </div>
                    <div style={{ border: '1px solid #cbd5e1', background: '#f8fafc', padding: 18 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#176b4d', fontWeight: 700, marginBottom: 14 }}>
                        <SafetyCertificateOutlined /> 报告可信状态
                      </div>
                      <Space direction="vertical" size={10} style={{ width: '100%' }}>
                        <div><CheckCircleFilled style={{ color: '#2f855a', marginRight: 8 }} />报告已纳入系统档案</div>
                        <div>
                          <CheckCircleFilled style={{ color: integrity === 100 ? '#2f855a' : '#d97706', marginRight: 8 }} />
                          {integrity === 100 ? '关键检测字段完整' : '部分检测字段未记录'}
                        </div>
                        <div>
                          {hasResultData ? (
                            <CheckCircleFilled style={{ color: '#2f855a', marginRight: 8 }} />
                          ) : (
                            <CheckCircleFilled style={{ color: '#d97706', marginRight: 8 }} />
                          )}
                          {hasResultData ? '检测结果可追溯' : '暂无结构化检测结果'}
                        </div>
                      </Space>
                      <Divider style={{ margin: '15px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#627d98', fontSize: 12 }}><span>数据完整度</span><strong style={{ color: '#102a43' }}>{integrity}%</strong></div>
                      <div style={{ height: 5, background: '#d9e2ec', marginTop: 7 }}><div style={{ width: `${integrity}%`, height: '100%', background: integrity === 100 ? '#2f855a' : '#d97706' }} /></div>
                    </div>
                  </div>

                  <div style={sectionStyle}>
                    <div style={sectionTitleStyle}>02 · 检测机构与技术信息</div>
                    <Descriptions bordered column={2} size="small" colon={false} styles={{ label: { width: 140, color: '#486581', background: '#f8fafc' }, content: { color: '#102a43' } }}>
                      <Descriptions.Item label="检测机构">{testOrg}</Descriptions.Item>
                      <Descriptions.Item label="机构记录状态">{hasTestOrg ? <Tag color="green">系统有效机构</Tag> : <Tag color="orange">机构信息未记录</Tag>}</Descriptions.Item>
                      <Descriptions.Item label="检测项目">{project || '未记录'}</Descriptions.Item>
                      <Descriptions.Item label="质量控制">{hasResultData ? <Tag color="blue">结果字段校验通过</Tag> : <Tag color="orange">待结果数据</Tag>}</Descriptions.Item>
                      <Descriptions.Item label="检测方法" span={2}>{protocol.method}</Descriptions.Item>
                      <Descriptions.Item label="检测依据" span={2}>{protocol.basis}</Descriptions.Item>
                      <Descriptions.Item label="检测日期">{testDate || '未记录'}</Descriptions.Item>
                      <Descriptions.Item label="报告签发时间">{issuedAt}</Descriptions.Item>
                    </Descriptions>
                  </div>

                  <div style={{ ...sectionStyle, borderColor: '#b7c7d8' }}>
                    <div style={{ ...sectionTitleStyle, background: '#102a43', color: '#fff', borderBottom: 0 }}>03 · 检测结果与专业判读</div>
                    <div style={{ padding: 20, background: '#f8fafc' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <Space><FileSearchOutlined style={{ color: '#d6b36a', fontSize: 20 }} /><Typography.Text strong style={{ color: '#102a43', fontSize: 16 }}>核心检测数据</Typography.Text></Space>
                        <Tag color="success">数据判读完成</Tag>
                      </div>
                      {resultData ? renderStructuredDetail(resultData) : (
                        <div style={{ padding: 18, background: '#fff', border: '1px solid #d9e2ec', whiteSpace: 'pre-wrap' }}>{result || '暂无检测结果'}</div>
                      )}
                    </div>
                  </div>

                  <div style={{ ...sectionStyle, borderLeft: '4px solid #d6b36a' }}>
                    <div style={sectionTitleStyle}>04 · 结果解释与报告声明</div>
                    <div style={{ padding: '16px 18px', color: '#334e68', lineHeight: 1.85 }}>
                      <p style={{ marginTop: 0 }}>本报告结果仅对本次送检样本负责。检测结论依据当前提交的样本、检测项目及系统记录的结构化数据形成，不应脱离样本身份与检测条件单独使用。</p>
                      <p>如样本身份、采集过程或保存条件存在疑问，建议重新采样复检。涉及亲缘、健康或品系判断时，应结合谱系资料、临床表现及其他专业证据综合评估。</p>
                      <p style={{ marginBottom: 0 }}>未经检测机构书面许可，不得对本报告进行部分复制、修改或用于超出检测目的的证明活动。</p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div style={{ ...sectionStyle, marginBottom: 0 }}>
                      <div style={sectionTitleStyle}>05 · 原始文件与记录</div>
                      <div style={{ padding: 16 }}>
                        {reportUrl ? (
                          <a href={reportUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, color: '#102a43', background: '#f8fafc', border: '1px solid #d9e2ec', textDecoration: 'none' }}>
                            <FilePdfOutlined style={{ fontSize: 26, color: '#b42318' }} />
                            <div><strong>原始检测报告附件</strong><div style={{ color: '#627d98', fontSize: 12 }}>点击查看归档文件</div></div>
                          </a>
                        ) : <Typography.Text type="secondary">未上传原始报告附件</Typography.Text>}
                      </div>
                    </div>
                    <div style={{ ...sectionStyle, marginBottom: 0 }}>
                      <div style={sectionTitleStyle}>06 · 电子追溯信息</div>
                      <div style={{ padding: '14px 16px' }}>
                        <Descriptions column={1} size="small" colon={false} styles={{ label: { width: 90, color: '#627d98' }, content: { color: '#102a43' } }}>
                          <Descriptions.Item label="校验码"><Typography.Text code>{verificationCode}</Typography.Text></Descriptions.Item>
                          <Descriptions.Item label="记录 ID">DR-{String(detail.id).padStart(8, '0')}</Descriptions.Item>
                          <Descriptions.Item label="报告版本">V1.0 · 电子报告</Descriptions.Item>
                        </Descriptions>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 30, paddingTop: 20, borderTop: '1px solid #d9e2ec', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 28, textAlign: 'center' }}>
                    {['检测人员：系统未记录', '审核人员：系统未记录', '签发机构：电子归档'].map((item) => <div key={item} style={{ borderBottom: '1px solid #829ab1', padding: '28px 8px 8px', color: '#486581', fontSize: 12 }}>{item}</div>)}
                  </div>
                  <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', color: '#829ab1', fontSize: 11 }}>
                    <span><AuditOutlined /> 本报告由检测报告管理系统生成并留存</span>
                    <span>第 1 页 / 共 1 页</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </Drawer>

      {/* 打印专用样式和容器 - 权威实验室报告布局 */}
      <style>{`
        @page { size: A4; margin: 12mm; }
        .print-container {
          display: none;
        }
        @media print {
          body * { visibility: hidden; }
          .print-container,
          .print-container * { visibility: visible; }
          .print-container {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
            background: #fff;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            color: #102a43;
            font-size: 13px;
            line-height: 1.5;
          }

          /* ===== 根容器 ===== */
          .print-container .print-report-root {
            max-width: 780px;
            margin: 0 auto;
            padding: 0;
            background: #fff;
            border-top: 5px solid #102a43;
          }

          /* ===== 报告抬头 ===== */
          .print-container .print-report-header {
            border-bottom: 1px solid #d9e2ec;
            padding-bottom: 18px;
            margin-bottom: 16px;
          }
          .print-container .print-report-header-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 16px;
          }
          .print-container .print-report-header-left {
            display: flex;
            gap: 12px;
            align-items: center;
          }
          .print-container .print-report-logo {
            width: 42px;
            height: 42px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #102a43;
            color: #d6b36a;
            font-size: 22px;
          }
          .print-container .print-report-title {
            margin: 0;
            font-size: 22px;
            font-weight: 700;
            color: #102a43;
            letter-spacing: 3px;
          }
          .print-container .print-report-subtitle {
            font-size: 11px;
            color: #627d98;
            letter-spacing: 1px;
          }
          .print-container .print-report-hint {
            font-size: 11px;
            color: #486581;
            margin-top: 4px;
          }
          .print-container .print-report-header-right {
            text-align: right;
          }
          .print-container .print-report-status {
            display: inline-block;
            padding: 4px 12px;
            font-size: 13px;
            font-weight: 700;
            border-radius: 2px;
          }
          .print-container .print-status-published { background: #d1fae5; color: #065f46; }
          .print-container .print-status-draft { background: #e5e7eb; color: #374151; }
          .print-container .print-status-pending { background: #fef3c7; color: #92400e; }
          .print-container .print-status-rejected { background: #fee2e2; color: #991b1b; }
          .print-container .print-report-no-label {
            font-size: 10px;
            color: #829ab1;
            margin-top: 10px;
            letter-spacing: 1px;
          }
          .print-container .print-report-no {
            font-size: 14px;
            font-weight: 600;
            color: #102a43;
            font-family: monospace;
          }
          .print-container .print-report-meta {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            border: 1px solid #d9e2ec;
          }
          .print-container .print-report-meta-cell {
            padding: 10px 14px;
            border-right: 1px solid #d9e2ec;
          }
          .print-container .print-report-meta-cell:last-child {
            border-right: none;
          }
          .print-container .print-report-meta-cell span {
            display: block;
            font-size: 10px;
            color: #829ab1;
            margin-bottom: 3px;
          }
          .print-container .print-report-meta-cell strong {
            font-size: 13px;
            color: #243b53;
            font-weight: 600;
          }

          /* ===== 板块布局 ===== */
          .print-container .print-report-row {
            display: grid;
            grid-template-columns: 1fr 220px;
            gap: 14px;
            margin-bottom: 14px;
          }
          .print-container .print-report-row:has(.print-section-half) {
            grid-template-columns: 1fr 1fr;
          }

          /* ===== 通用板块 ===== */
          .print-container .print-section {
            border: 1px solid #d9e2ec;
            border-radius: 2px;
            background: #fff;
            margin-bottom: 14px;
            break-inside: avoid;
          }
          .print-container .print-section-main { margin-bottom: 0; }
          .print-container .print-section-half { margin-bottom: 0; }
          .print-container .print-section-trust {
            border-color: #cbd5e1;
            background: #f8fafc;
          }
          .print-container .print-section-title {
            padding: 10px 14px;
            background: #f4f7fa;
            border-bottom: 1px solid #d9e2ec;
            font-size: 12px;
            font-weight: 700;
            color: #102a43;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .print-container .print-section-title-dark {
            background: #102a43;
            color: #fff;
            border-bottom: none;
          }

          /* ===== 描述表格 ===== */
          .print-container .print-desc-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          .print-container .print-desc-table th,
          .print-container .print-desc-table td {
            padding: 8px 14px;
            text-align: left;
            border-bottom: 1px solid #f3f4f6;
          }
          .print-container .print-desc-table th {
            width: 90px;
            color: #627d98;
            font-weight: 500;
            font-size: 11px;
          }
          .print-container .print-desc-table td {
            color: #102a43;
          }
          .print-container .print-desc-table td code {
            background: #f3f4f6;
            padding: 1px 5px;
            font-size: 11px;
          }
          .print-container .print-desc-table-bordered th {
            background: #f8fafc;
            border-right: 1px solid #d9e2ec;
            color: #486581;
            font-weight: 500;
          }
          .print-container .print-desc-table-bordered td {
            border-right: 1px solid #d9e2ec;
          }
          .print-container .print-desc-table-bordered tr:last-child th,
          .print-container .print-desc-table-bordered tr:last-child td {
            border-bottom: none;
          }
          .print-container .print-desc-table-single th {
            width: 100px;
          }

          /* ===== 标签 ===== */
          .print-container .print-tag {
            display: inline-block;
            padding: 2px 8px;
            font-size: 11px;
            font-weight: 600;
            border-radius: 2px;
          }
          .print-container .print-tag-green { background: #d1fae5; color: #065f46; }
          .print-container .print-tag-blue { background: #dbeafe; color: #1e40af; }
          .print-container .print-tag-orange { background: #fed7aa; color: #9a3412; }
          .print-container .print-tag-red { background: #fee2e2; color: #991b1b; }

          /* ===== 可信状态 ===== */
          .print-container .print-trust-list {
            padding: 12px 14px;
            font-size: 12px;
          }
          .print-container .print-trust-item {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
          }
          .print-container .print-trust-item:last-child {
            margin-bottom: 0;
          }
          .print-container .print-trust-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
          }
          .print-container .print-trust-dot-green { background: #2f855a; }
          .print-container .print-trust-dot-orange { background: #d97706; }
          .print-container .print-divider {
            border: none;
            border-top: 1px solid #d9e2ec;
            margin: 10px 0;
          }
          .print-container .print-trust-bar-label {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #627d98;
            padding: 0 14px;
          }
          .print-container .print-trust-bar-label strong {
            color: #102a43;
          }
          .print-container .print-trust-bar {
            height: 4px;
            background: #d9e2ec;
            margin: 6px 14px 0;
          }
          .print-container .print-trust-bar-fill {
            height: 100%;
            transition: width 0.3s;
          }

          /* ===== 检测结果 ===== */
          .print-container .print-section-result {
            border-color: #b7c7d8;
          }
          .print-container .print-result-wrapper {
            padding: 14px 18px;
            background: #f8fafc;
          }
          .print-container .print-result-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 14px;
            font-size: 13px;
            font-weight: 600;
            color: #102a43;
          }
          .print-container .print-result-wrapper .stat-row {
            display: flex;
            gap: 12px;
            margin-bottom: 14px;
          }
          .print-container .print-result-wrapper .stat-box {
            flex: 1;
            background: #fff;
            padding: 10px 6px;
            text-align: center;
            border: 1px solid #e2e8f0;
          }
          .print-container .print-result-wrapper .stat-label {
            color: #6b7280;
            font-size: 11px;
            margin-bottom: 3px;
          }
          .print-container .print-result-wrapper .stat-value {
            font-size: 20px;
            font-weight: 700;
            color: #1e3a8a;
          }
          .print-container .print-result-wrapper .stat-value .unit {
            font-size: 12px;
            font-weight: 400;
            color: #6b7280;
          }
          .print-container .print-result-wrapper .tag {
            display: inline-block;
            padding: 3px 12px;
            font-size: 13px;
            font-weight: 600;
          }
          .print-container .print-result-wrapper .tag-success { background: #d1fae5; color: #065f46; }
          .print-container .print-result-wrapper .tag-error { background: #fee2e2; color: #991b1b; }
          .print-container .print-result-wrapper .tag-warning { background: #fef3c7; color: #92400e; }
          .print-container .print-result-wrapper .progress-bar {
            height: 5px;
            background: #e5e7eb;
            margin-top: 6px;
          }
          .print-container .print-result-wrapper .progress-fill {
            height: 100%;
          }
          .print-container .print-result-wrapper .conclusion-box {
            background: #fff;
            border-left: 3px solid #2f855a;
            padding: 10px 14px;
            margin-top: 10px;
          }
          .print-container .print-result-wrapper .conclusion-title {
            color: #6b7280;
            font-size: 11px;
            font-weight: 600;
            margin-bottom: 3px;
          }
          .print-container .print-result-wrapper .conclusion-text {
            white-space: pre-wrap;
            color: #1f2937;
            font-size: 12px;
          }
          .print-container .print-result-wrapper .screen-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background: #fff;
            border-bottom: 1px solid #f3f4f6;
            font-size: 12px;
          }
          .print-container .print-result-wrapper .screen-item:last-child {
            border-bottom: none;
          }
          .print-container .print-result-wrapper .screen-name {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .print-container .print-result-wrapper .screen-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
          }
          .print-container .print-result-wrapper .screen-dot-positive { background: #ef4444; }
          .print-container .print-result-wrapper .screen-dot-negative { background: #10b981; }
          .print-container .print-result-wrapper .screen-right {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .print-container .print-result-wrapper .mono {
            font-family: monospace;
            color: #6b7280;
            font-size: 11px;
          }
          .print-container .print-report-raw-result {
            padding: 12px 14px;
            background: #fff;
            border: 1px solid #d9e2ec;
            white-space: pre-wrap;
          }

          /* ===== 声明 ===== */
          .print-container .print-section-declaration {
            border-left: 4px solid #d6b36a;
          }
          .print-container .print-declaration-content {
            padding: 12px 14px;
            font-size: 12px;
            color: #334e68;
            line-height: 1.7;
          }
          .print-container .print-declaration-content p {
            margin: 0 0 8px;
          }
          .print-container .print-declaration-content p:last-child {
            margin-bottom: 0;
          }

          /* ===== 文件与追溯 ===== */
          .print-container .print-file-box {
            padding: 12px 14px;
          }
          .print-container .print-file-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 14px;
            background: #f8fafc;
            border: 1px solid #d9e2ec;
          }
          .print-container .print-file-icon {
            font-size: 20px;
          }
          .print-container .print-file-sub {
            font-size: 11px;
            color: #627d98;
            margin-top: 2px;
          }
          .print-container .print-file-empty {
            color: #829ab1;
            font-size: 12px;
          }

          /* ===== 签章与页脚 ===== */
          .print-container .print-report-signature {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-top: 24px;
            padding-top: 18px;
            border-top: 1px solid #d9e2ec;
          }
          .print-container .print-signature-col {
            text-align: center;
          }
          .print-container .print-signature-line {
            border-bottom: 1px solid #829ab1;
            padding-bottom: 6px;
            font-size: 11px;
            color: #486581;
          }
          .print-container .print-report-footer {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #829ab1;
            margin-top: 14px;
            padding-top: 10px;
            border-top: 1px solid #f3f4f6;
          }
        }
      `}</style>

      {/* 隐藏的打印内容容器 */}
      <div
        ref={printContainerRef}
        className="print-container"
        aria-hidden="true"
      />
    </>
  );
};

// 详情中渲染结构化结果
function renderStructuredDetail(data: StructuredResultData): React.ReactNode {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;

  if ('match_result' in d) {
    // DNA 类型 (身份认证/性别鉴定/赛程性能)
    const matchResult = d.match_result as string;
    const conclusion = d.conclusion as string | undefined;
    const matchColor = matchResult === 'match' ? '#10b981' : matchResult === 'mismatch' ? '#ef4444' : '#f59e0b';
    const matchLabel = matchResult === 'match' ? '匹配' : matchResult === 'mismatch' ? '不匹配' : '部分匹配';
    return (
      <div>
        <Row gutter={[16, 12]}>
          <Col span={8}>
            <div style={{ textAlign: 'center', padding: '12px 8px', background: '#fff', borderRadius: 8 }}>
              <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>DNA比对结果</div>
              <Tag color={matchColor} style={{ fontSize: 15, padding: '4px 16px', fontWeight: 600 }}>
                {matchLabel}
              </Tag>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center', padding: '12px 8px', background: '#fff', borderRadius: 8 }}>
              <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>匹配度</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1e3a8a' }}>{(d.match_percent as number) ?? '-'}%</div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center', padding: '12px 8px', background: '#fff', borderRadius: 8 }}>
              <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>检测位点数</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1e3a8a' }}>{(d.loci_count as number) ?? '-'}<span style={{ fontSize: 14, fontWeight: 400, color: '#6b7280' }}> 个</span></div>
            </div>
          </Col>
        </Row>
        {conclusion && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: '#fff', borderRadius: 8, borderLeft: '4px solid #10b981' }}>
            <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>📋 检测结论</div>
            <div style={{ whiteSpace: 'pre-wrap', color: '#1f2937' }}>{conclusion}</div>
          </div>
        )}
      </div>
    );
  }
  if ('sire_confirmed' in d) {
    // 亲子鉴定
    const conclusion = d.conclusion as string | undefined;
    return (
      <div>
        <Row gutter={[16, 12]}>
          <Col span={8}>
            <div style={{ textAlign: 'center', padding: '12px 8px', background: '#fff', borderRadius: 8 }}>
              <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>父本确认</div>
              <Tag color={d.sire_confirmed ? 'success' : 'error'} style={{ fontSize: 15, padding: '4px 16px', fontWeight: 600 }}>
                {d.sire_confirmed ? '✅ 确认' : '❌ 不确认'}
              </Tag>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center', padding: '12px 8px', background: '#fff', borderRadius: 8 }}>
              <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>母本确认</div>
              <Tag color={d.dam_confirmed ? 'success' : 'error'} style={{ fontSize: 15, padding: '4px 16px', fontWeight: 600 }}>
                {d.dam_confirmed ? '✅ 确认' : '❌ 不确认'}
              </Tag>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center', padding: '12px 8px', background: '#fff', borderRadius: 8 }}>
              <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>亲权概率</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1e3a8a' }}>{(d.paternity_probability as number) ?? '-'}%</div>
            </div>
          </Col>
        </Row>
        {conclusion && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: '#fff', borderRadius: 8, borderLeft: '4px solid #10b981' }}>
            <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>📋 检测结论</div>
            <div style={{ whiteSpace: 'pre-wrap', color: '#1f2937' }}>{conclusion}</div>
          </div>
        )}
      </div>
    );
  }
  if ('breed_match_percent' in d) {
    // 品种鉴定/血统分析
    const conclusion = d.conclusion as string | undefined;
    const matchPercent = d.breed_match_percent as number;
    return (
      <div>
        <Row gutter={[16, 12]}>
          <Col span={12}>
            <div style={{ textAlign: 'center', padding: '16px 12px', background: '#fff', borderRadius: 8 }}>
              <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>品系匹配度</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: matchPercent >= 90 ? '#10b981' : matchPercent >= 70 ? '#f59e0b' : '#ef4444' }}>
                {matchPercent ?? '-'}<span style={{ fontSize: 16, fontWeight: 400, color: '#6b7280' }}>%</span>
              </div>
              {/* 进度条 */}
              <div style={{ marginTop: 8, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(matchPercent, 100) || 0}%`,
                  background: matchPercent >= 90 ? '#10b981' : matchPercent >= 70 ? '#f59e0b' : '#ef4444',
                  borderRadius: 3,
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ textAlign: 'center', padding: '16px 12px', background: '#fff', borderRadius: 8 }}>
              <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>匹配品系</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1e3a8a' }}>
                {(d.matched_breed as string) || '-'}
              </div>
            </div>
          </Col>
        </Row>
        {conclusion && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: '#fff', borderRadius: 8, borderLeft: '4px solid #10b981' }}>
            <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>📋 检测结论</div>
            <div style={{ whiteSpace: 'pre-wrap', color: '#1f2937' }}>{conclusion}</div>
          </div>
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
        <div style={{ background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
          {items.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderBottom: idx < items.length - 1 ? '1px solid #f3f4f6' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: item.result === 'positive' ? '#ef4444' : '#10b981' }} />
                <span style={{ fontWeight: 500, color: '#1f2937' }}>{item.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Tag color={item.result === 'positive' ? 'error' : 'success'} style={{ fontWeight: 600 }}>
                  {item.result === 'positive' ? '阳性' : '阴性'}
                </Tag>
                <span style={{ color: '#6b7280', fontFamily: 'monospace', fontSize: 13 }}>{item.value}</span>
              </div>
            </div>
          ))}
        </div>
        {conclusion && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: '#fff', borderRadius: 8, borderLeft: '4px solid #f59e0b' }}>
            <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>📋 综合结论</div>
            <div style={{ whiteSpace: 'pre-wrap', color: '#1f2937' }}>{conclusion}</div>
          </div>
        )}
      </div>
    );
  }
  // 通用: JSON 展示
  return (
    <div style={{ background: '#fff', padding: 16, borderRadius: 8 }}>
      <Typography.Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>结构化检测数据</Typography.Text>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 13, color: '#374151' }}>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

// 打印中渲染结构化结果（输出HTML字符串）
function renderPrintResult(data: StructuredResultData): string {
  if (!data || typeof data !== 'object') return '';
  const d = data as Record<string, unknown>;

  if ('match_result' in d) {
    const matchResult = d.match_result as string;
    const conclusion = d.conclusion as string | undefined;
    const matchLabel = matchResult === 'match' ? '匹配' : matchResult === 'mismatch' ? '不匹配' : '部分匹配';
    const matchClass = matchResult === 'match' ? 'tag-success' : matchResult === 'mismatch' ? 'tag-error' : 'tag-warning';
    return `
      <div class="stat-row">
        <div class="stat-box">
          <div class="stat-label">DNA比对结果</div>
          <span class="tag ${matchClass}">${matchLabel}</span>
        </div>
        <div class="stat-box">
          <div class="stat-label">匹配度</div>
          <div class="stat-value">${(d.match_percent as number) ?? '-'}<span class="unit">%</span></div>
        </div>
        <div class="stat-box">
          <div class="stat-label">检测位点数</div>
          <div class="stat-value">${(d.loci_count as number) ?? '-'}<span class="unit">个</span></div>
        </div>
      </div>
      ${conclusion ? `<div class="conclusion-box"><div class="conclusion-title">📋 检测结论</div><div class="conclusion-text">${conclusion}</div></div>` : ''}
    `;
  }
  if ('sire_confirmed' in d) {
    const conclusion = d.conclusion as string | undefined;
    return `
      <div class="stat-row">
        <div class="stat-box">
          <div class="stat-label">父本确认</div>
          <span class="tag ${d.sire_confirmed ? 'tag-success' : 'tag-error'}">${d.sire_confirmed ? '✅ 确认' : '❌ 不确认'}</span>
        </div>
        <div class="stat-box">
          <div class="stat-label">母本确认</div>
          <span class="tag ${d.dam_confirmed ? 'tag-success' : 'tag-error'}">${d.dam_confirmed ? '✅ 确认' : '❌ 不确认'}</span>
        </div>
        <div class="stat-box">
          <div class="stat-label">亲权概率</div>
          <div class="stat-value">${(d.paternity_probability as number) ?? '-'}<span class="unit">%</span></div>
        </div>
      </div>
      ${conclusion ? `<div class="conclusion-box"><div class="conclusion-title">📋 检测结论</div><div class="conclusion-text">${conclusion}</div></div>` : ''}
    `;
  }
  if ('breed_match_percent' in d) {
    const conclusion = d.conclusion as string | undefined;
    const matchPercent = d.breed_match_percent as number;
    const progressColor = matchPercent >= 90 ? '#10b981' : matchPercent >= 70 ? '#f59e0b' : '#ef4444';
    return `
      <div class="stat-row">
        <div class="stat-box">
          <div class="stat-label">品系匹配度</div>
          <div class="stat-value" style="color:${progressColor}">${matchPercent ?? '-'}<span class="unit">%</span></div>
          <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(matchPercent, 100) || 0}%;background:${progressColor}"></div></div>
        </div>
        <div class="stat-box">
          <div class="stat-label">匹配品系</div>
          <div class="stat-value">${(d.matched_breed as string) || '-'}</div>
        </div>
      </div>
      ${conclusion ? `<div class="conclusion-box"><div class="conclusion-title">📋 检测结论</div><div class="conclusion-text">${conclusion}</div></div>` : ''}
    `;
  }
  if ('items' in d && Array.isArray(d.items)) {
    const conclusion = d.conclusion as string | undefined;
    const items = d.items as Array<{ name: string; result: string; value: string }>;
    const itemsHtml = items.map((item) => `
      <div class="screen-item">
        <div class="screen-name">
          <span class="screen-dot ${item.result === 'positive' ? 'screen-dot-positive' : 'screen-dot-negative'}"></span>
          ${item.name}
        </div>
        <div class="screen-right">
          <span class="tag ${item.result === 'positive' ? 'tag-error' : 'tag-success'}">${item.result === 'positive' ? '阳性' : '阴性'}</span>
          <span class="mono">${item.value}</span>
        </div>
      </div>
    `).join('');
    return `
      <div class="screen-list">${itemsHtml}</div>
      ${conclusion ? `<div class="conclusion-box" style="border-left-color:#f59e0b"><div class="conclusion-title">📋 综合结论</div><div class="conclusion-text">${conclusion}</div></div>` : ''}
    `;
  }
  return `<pre style="margin:0;white-space:pre-wrap;font-size:13px;">${JSON.stringify(data, null, 2)}</pre>`;
}

export default DetectionReport;
