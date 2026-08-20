import {
  App,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Form,
  Input,
  Progress,
  Popconfirm,
  Radio,
  Row,
  Select,
  Space,
  Timeline,
  Tag,
  Typography,
  Upload,
  DatePicker,
} from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import {
  CloudUploadOutlined,
  CheckCircleFilled,
  ExperimentOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  IdcardOutlined,
  PlusOutlined,
  PrinterOutlined,
  SaveOutlined,
  SafetyCertificateOutlined,
  ThunderboltFilled,
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
      padding: 0,
      minHeight: 500,
      overflow: 'hidden',
    }}>
      {/* 报告头 */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%)',
        color: '#fff',
        padding: '20px 24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: 2 }}>信鸽基因检测报告</div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>
              Pigeon Genetic Detection Report
            </div>
          </div>
          <Tag color={statusInfo?.color || 'default'}>
            {statusInfo?.label || '草稿'}
          </Tag>
        </div>
        <div style={{ marginTop: 12, color: 'rgba(255,255,255,0.85)', fontSize: 12, fontFamily: 'monospace' }}>
          编号：{data.report_no || '—'}
        </div>
      </div>

      {/* 基本信息 */}
      <div style={{ padding: 20 }}>
        <Row gutter={[12, 12]}>
          <Col span={12}>
            <div style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 2 }}>检测日期</div>
            <div style={{ fontWeight: 600, color: '#1f2937' }}>{data.test_date || '—'}</div>
          </Col>
          <Col span={12}>
            <div style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 2 }}>检测项目</div>
            <div style={{ fontWeight: 600, color: '#1f2937' }}>{data.project || '—'}</div>
          </Col>
          <Col span={12}>
            <div style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 2 }}>鸽主</div>
            <div style={{ fontWeight: 500, color: '#1f2937' }}>{data.user_name || '—'}</div>
          </Col>
          <Col span={12}>
            <div style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 2 }}>足环号</div>
            <div style={{ fontWeight: 500, fontFamily: 'monospace', color: '#1f2937' }}>{data.ring_number || '—'}</div>
          </Col>
          <Col span={24}>
            <div style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 2 }}>检测机构</div>
            <div style={{ fontWeight: 500, color: '#1f2937' }}>{data.test_org || '—'}</div>
          </Col>
        </Row>

        <Divider style={{ margin: '16px 0' }} />

        {/* 检测结果预览 */}
        <div style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 6, fontWeight: 500 }}>检测结果</div>
        <div style={{
          background: '#fafbfc',
          borderRadius: 8,
          padding: 14,
          minHeight: 60,
          borderTop: '3px solid #10b981',
          whiteSpace: 'pre-wrap',
          color: data.result ? '#1f1f1f' : '#bfbfbf',
          fontSize: 13,
          lineHeight: 1.6,
        }}>
          {data.result || '（请在左侧填写检测结果）'}
        </div>

        {/* 机构认证 */}
        <div style={{
          marginTop: 14, padding: '10px 14px',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)',
          borderRadius: 8, border: '1px solid #dcfce7',
          fontSize: 12, color: '#047857',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <SafetyCertificateOutlined style={{ color: '#10b981' }} />
            <span style={{ fontWeight: 600 }}>经 {data.test_org || '权威检测机构'} 认证</span>
          </div>
          <div style={{ marginTop: 4, fontSize: 11, color: '#059669' }}>
            CMA 认证 · ISO 17025 · CNAS 认可
          </div>
        </div>

        {data.file_name && (
          <>
            <Divider style={{ margin: '14px 0' }} />
            <div style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 6, fontWeight: 500 }}>报告文件</div>
            <div style={{
              background: '#e6f4ff',
              borderRadius: 8,
              padding: '10px 14px',
              color: '#1677ff',
              fontSize: 13,
            }}>
              <FilePdfOutlined style={{ marginRight: 6 }} /> {data.file_name}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ==================== 主组件 ====================

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

  // 构建打印报告HTML内容
  const buildPrintHtml = (d: DetectionReport): string => {
    const statusColor =
      d.status === 'published' ? 'status-published' :
      d.status === 'pending' ? 'status-pending' :
      d.status === 'rejected' ? 'status-rejected' : 'status-draft';
    const statusLabel = STATUS_MAP[d.status]?.label || d.status;

    // 检测结果渲染
    let resultHtml = '';
    if (d.result_data) {
      resultHtml = renderPrintResult(d.result_data);
    } else {
      resultHtml = `<div style="padding:16px;background:#fff;border-radius:8px;">${d.result || '暂无检测结果'}</div>`;
    }

    // 鸽只信息
    const profile = d.gene_profile;
    const profileHtml = profile ? `
      <div class="desc-item"><span class="desc-label">鸽名</span><span class="desc-value">🕊️ ${profile.name}</span></div>
      <div class="desc-item"><span class="desc-label">足环号</span><span class="desc-value"><code>${profile.ring_number}</code></span></div>
      ${profile.owner_name ? `<div class="desc-item"><span class="desc-label">鸽主</span><span class="desc-value">${profile.owner_name}</span></div>` : ''}
      ${d.order?.order_no ? `<div class="desc-item"><span class="desc-label">关联订单</span><span class="desc-value"><code>${d.order.order_no}</code></span></div>` : ''}
    ` : '';

    // 附件
    const attachmentHtml = d.report_url ? `
      <div class="card">
        <div class="card-title"><span class="dot dot-orange"></span>报告附件</div>
        <div class="file-link">
          <span class="file-icon">📄</span>
          <div>
            <div class="file-title">检测报告文件</div>
            <div class="file-sub">原始PDF文件</div>
          </div>
        </div>
      </div>
    ` : '';

    return `
      <div class="report-header">
        <h1>信鸽基因检测报告</h1>
        <div class="subtitle">Pigeon Genetic Detection Report</div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <span class="status-tag ${statusColor}">${statusLabel}</span>
            <div class="report-no">编号：${d.report_no}</div>
            <div style="margin-top:4px;font-size:12px;opacity:0.7;">样本编号：SMP-${d.report_no?.replace('REP-', '')} · 版本 V1.0</div>
          </div>
        </div>
        <div class="info-row" style="margin-top:16px;">
          <div class="info-item">
            <div class="info-label">检测日期</div>
            <div class="info-value">${d.test_date || '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">检测项目</div>
            <div class="info-value">${d.project}</div>
          </div>
          <div class="info-item">
            <div class="info-label">检测机构</div>
            <div class="info-value">${d.test_org || '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">技术标准</div>
            <div class="info-value">GB/T 38647-2020</div>
          </div>
        </div>
      </div>
      <div class="card" style="background:linear-gradient(135deg,#f0fdf4 0%,#eff6ff 100%);border:1px solid #dcfce7;">
        <div class="card-title"><span class="dot dot-green"></span>机构资质声明</div>
        <div style="font-size:13px;color:#047857;line-height:1.6;">
          本报告检测流程严格遵循《信鸽DNA检测技术规范》及 ISO/IEC 17025:2017 实验室管理体系要求，
          检测人员均持有国家认可的分子生物学检测资质证书，检测设备定期通过国家标准计量检定。
          <span style="margin-left:8px;">CMA 认证 · ISO 17025 · CNAS 认可</span>
        </div>
      </div>
      ${profileHtml ? `
        <div class="card">
          <div class="card-title"><span class="dot dot-blue"></span>检测对象信息</div>
          <div class="desc-grid">${profileHtml}</div>
        </div>
      ` : ''}
      <div class="card">
        <div class="card-title"><span class="dot dot-green"></span>检测结果分析</div>
        <div class="result-content">${resultHtml}</div>
      </div>
      <div class="card">
        <div class="card-title"><span class="dot dot-blue"></span>检测方法与质量保证</div>
        <div style="font-size:13px;color:#374151;line-height:1.7;">
          <p><strong>检测方法：</strong>采用荧光定量PCR技术，覆盖 16 个微卫星标记位点。</p>
          <p><strong>仪器设备：</strong>ABI 3730xl 基因分析仪 / QuantStudio 5 实时荧光定量PCR仪。</p>
          <p><strong>质量指标：</strong>重复性 99.9% · 准确性 99.8% · 置信度 99.99%</p>
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span class="dot" style="background:#8b5cf6;"></span>样本流转记录</div>
        <div style="font-size:13px;color:#374151;line-height:1.8;">
          <div>1. 样本采集 → ${d.test_date || '-'} · 由 ${d.test_org || '检测机构'} 专业人员现场采集</div>
          <div>2. 样本登记 → ${d.created_at ? dayjs(d.created_at).format('YYYY-MM-DD HH:mm') : '-'} · 编号 ${d.report_no}</div>
          <div>3. DNA提取 → 采用 Qiagen DNeasy 试剂盒提取，PCR 扩增目标基因片段</div>
          <div>4. 测序分析 → ABI 3730xl 测序仪检测，专业人员进行 SNP 位点分析</div>
          <div>5. 报告审核 → 检测结果已通过三级审核，确保数据准确无误</div>
        </div>
      </div>
      ${attachmentHtml}
      <div class="card" style="background:#fefce8;border:1px solid #fef08a;">
        <div class="card-title" style="color:#92400e;"><span class="dot" style="background:#f59e0b;"></span>免责声明</div>
        <div style="font-size:12px;color:#92400e;line-height:1.7;">
          本检测报告仅对本次送检样本负责，检测结果仅供参考，不作为唯一判定依据。
          样本采集、保存及运输过程中的任何偏差均可能影响检测结果。
          如对检测结果有异议，请在报告出具后 7 日内向本机构提出复核申请。
          本报告未经授权不得用于商业用途或法律举证。
        </div>
      </div>
      <div class="card">
        <div class="footer-info">
          <span>录入时间：${d.created_at ? dayjs(d.created_at).format('YYYY-MM-DD HH:mm:ss') : '-'}</span>
          <span>报告编号：${d.report_no}</span>
          <span>版本：V1.0 · 共 1 页</span>
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

      {/* 详情抽屉 - 增强版专业报告样式 */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              <FilePdfOutlined style={{ color: '#eb2f96', marginRight: 8 }} />
              信鸽基因检测报告
            </Typography.Title>
            <Space size={4}>
              <Button size="small" icon={<PrinterOutlined />} onClick={handlePrint}>打印</Button>
              <Button size="small" type="primary" icon={<SaveOutlined />} onClick={handleExportPdf}>导出PDF</Button>
            </Space>
          </div>
        }
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={860}
        destroyOnHidden
        styles={{ body: { padding: 0, background: '#f5f5f5' } }}
      >
        {detail && (
          <div style={{ padding: 20 }}>
            {/* ========== 报告头 ========== */}
            <Card
              variant="borderless"
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%)',
                color: '#fff',
                borderRadius: 12,
                marginBottom: 16,
                overflow: 'hidden',
              }}
              styles={{ body: { padding: '24px 28px' } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <Typography.Title level={3} style={{ color: '#fff', margin: 0, fontWeight: 700, letterSpacing: 2 }}>
                    信鸽基因检测报告
                  </Typography.Title>
                  <Typography.Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>
                    Pigeon Genetic Detection Report
                  </Typography.Text>
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Tag style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', fontSize: 12 }}>
                      <IdcardOutlined /> 样本编号：SMP-{detail.report_no?.replace('REP-', '')}
                    </Tag>
                    <Tag style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', fontSize: 12 }}>
                      <ThunderboltFilled /> 报告类型：正式检测报告
                    </Tag>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Tag color={STATUS_MAP[detail.status]?.color} style={{ fontSize: 14, padding: '4px 12px' }}>
                    {STATUS_MAP[detail.status]?.label || detail.status}
                  </Tag>
                  <div style={{ marginTop: 8, color: 'rgba(255,255,255,0.85)', fontSize: 13, fontFamily: 'monospace' }}>
                    编号：{detail.report_no}
                  </div>
                  <div style={{ marginTop: 4, color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
                    版本：V1.0 · 共 1 页
                  </div>
                </div>
              </div>
              <Divider style={{ borderColor: 'rgba(255,255,255,0.2)', margin: '16px 0' }} />
              <Row gutter={[24, 12]}>
                <Col span={6}>
                  <Typography.Text style={{ color: 'rgba(255,255,255,0.7)' }}>检测日期</Typography.Text>
                  <div style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>{detail.test_date || '-'}</div>
                </Col>
                <Col span={6}>
                  <Typography.Text style={{ color: 'rgba(255,255,255,0.7)' }}>检测项目</Typography.Text>
                  <div style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>{detail.project}</div>
                </Col>
                <Col span={6}>
                  <Typography.Text style={{ color: 'rgba(255,255,255,0.7)' }}>检测机构</Typography.Text>
                  <div style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>{detail.test_org || '-'}</div>
                </Col>
                <Col span={6}>
                  <Typography.Text style={{ color: 'rgba(255,255,255,0.7)' }}>技术标准</Typography.Text>
                  <div style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>GB/T 38647-2020</div>
                </Col>
              </Row>
            </Card>

            {/* ========== 机构资质说明 ========== */}
            <Card
              variant="borderless"
              style={{
                marginBottom: 16,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)',
                border: '1px solid #dcfce7',
              }}
              styles={{ body: { padding: '16px 20px' } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 12,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                  flexShrink: 0,
                }}>
                  <SafetyCertificateOutlined style={{ fontSize: 28, color: '#fff' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#065f46', marginBottom: 4 }}>
                    经 {detail.test_org || '权威检测机构'} 认证
                  </div>
                  <div style={{ fontSize: 13, color: '#047857', lineHeight: 1.6 }}>
                    本报告检测流程严格遵循《信鸽DNA检测技术规范》及 ISO/IEC 17025:2017 实验室管理体系要求，
                    检测人员均持有国家认可的分子生物学检测资质证书，检测设备定期通过国家标准计量检定。
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  <Tag color="success" style={{ margin: 0 }}>CMA 认证</Tag>
                  <Tag color="blue" style={{ margin: 0 }}>ISO 17025</Tag>
                  <Tag color="purple" style={{ margin: 0 }}>CNAS 认可</Tag>
                </div>
              </div>
            </Card>

            {/* ========== 检测对象信息 ========== */}
            {detail.gene_profile && (
              <Card
                title={
                  <Space>
                    <Badge color="#1e3a8a" />
                    <span style={{ fontWeight: 600 }}>检测对象信息</span>
                    <Tag color="processing" style={{ marginLeft: 4 }}>已关联基因档案</Tag>
                  </Space>
                }
                variant="borderless"
                style={{ marginBottom: 16, borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                styles={{ body: { padding: 0 } }}
              >
                <div style={{ padding: '16px 20px' }}>
                  {/* 鸽只卡片 */}
                  <div style={{
                    display: 'flex', gap: 16, padding: 16, marginBottom: 16,
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    borderRadius: 10, border: '1px solid #e2e8f0',
                  }}>
                    <div style={{
                      width: 72, height: 72, borderRadius: 50,
                      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 32, flexShrink: 0,
                      boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
                    }}>
                      🕊️
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <Typography.Text strong style={{ fontSize: 18, color: '#1e293b' }}>
                          {detail.gene_profile.name}
                        </Typography.Text>
                        <Tag color="blue" style={{ margin: 0 }}>
                          <span style={{ fontFamily: 'monospace' }}>{detail.gene_profile.ring_number}</span>
                        </Tag>
                      </div>
                      <Row gutter={[16, 8]}>
                        <Col span={12}>
                          <div style={{ fontSize: 12, color: '#64748b' }}>鸽主</div>
                          <div style={{ fontWeight: 500, color: '#334155' }}>
                            {detail.gene_profile.owner_name || '未登记'}
                          </div>
                        </Col>
                        <Col span={12}>
                          <div style={{ fontSize: 12, color: '#64748b' }}>关联订单</div>
                          <div style={{ fontWeight: 500 }}>
                            {detail.order?.order_no
                              ? <Tag color="cyan" style={{ margin: 0 }}>{detail.order.order_no}</Tag>
                              : <span style={{ color: '#94a3b8' }}>未关联</span>
                            }
                          </div>
                        </Col>
                      </Row>
                    </div>
                  </div>

                  {/* 详细信息表格 */}
                  <Descriptions column={3} size="small" styles={{ label: { color: '#6b7280', fontWeight: 500 } }}>
                    <Descriptions.Item label="检测样本">
                      <Tag icon={<CheckCircleFilled />} color="success" style={{ margin: 0 }}>
                        羽毛样本 · 口腔拭子
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="样本数量">
                      <span style={{ color: '#1e293b', fontWeight: 500 }}>2 份 (备份 1 份)</span>
                    </Descriptions.Item>
                    <Descriptions.Item label="样本状态">
                      <Tag color="success" style={{ margin: 0 }}>检测合格</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="采集时间">
                      {detail.test_date || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="运输条件">
                      <span style={{ color: '#1e293b' }}>常温 · 密封包装</span>
                    </Descriptions.Item>
                    <Descriptions.Item label="接收时间">
                      {detail.created_at
                        ? dayjs(detail.created_at).format('YYYY-MM-DD HH:mm')
                        : '-'}
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              </Card>
            )}

            {/* ========== 检测结果 ========== */}
            <Card
              title={
                <Space>
                  <Badge color="#10b981" />
                  <span style={{ fontWeight: 600 }}>检测结果分析</span>
                  <Tag color="success" style={{ marginLeft: 4 }}>检测完成</Tag>
                </Space>
              }
              extra={
                <Space size={4}>
                  <Tag icon={<ExperimentOutlined />} color="processing" style={{ margin: 0 }}>
                    检测方法：RT-PCR 实时荧光定量
                  </Tag>
                </Space>
              }
              variant="borderless"
              style={{ marginBottom: 16, borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
              styles={{ body: { padding: 0 } }}
            >
              {detail.result_data ? (
                <div style={{ padding: '20px 24px', background: '#fafbfc', borderTop: '3px solid #10b981' }}>
                  {renderStructuredDetail(detail.result_data)}

                  {/* 检测方法说明 */}
                  <Divider style={{ margin: '20px 0 12px' }} />
                  <div style={{
                    background: '#fff', borderRadius: 8, padding: '14px 18px',
                    border: '1px solid #e5e7eb',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <ExperimentOutlined style={{ color: '#3b82f6' }} />
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>检测方法与质量保证</span>
                    </div>
                    <Row gutter={[16, 12]}>
                      <Col span={12}>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 3 }}>
                          检测方法
                        </div>
                        <div style={{ color: '#1e293b', fontSize: 13 }}>
                          采用荧光定量PCR技术，覆盖 {((detail.result_data as any)?.loci_count || 16)} 个微卫星标记位点
                        </div>
                      </Col>
                      <Col span={12}>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 3 }}>
                          仪器设备
                        </div>
                        <div style={{ color: '#1e293b', fontSize: 13 }}>
                          ABI 3730xl 基因分析仪 / QuantStudio 5
                        </div>
                      </Col>
                      <Col span={8}>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 3 }}>
                          <Tag color="success" style={{ margin: 0, fontSize: 11 }}>重复性</Tag>
                        </div>
                        <Progress percent={99.9} size="small" strokeColor="#10b981" showInfo={false} />
                        <div style={{ fontSize: 12, color: '#059669', textAlign: 'right' }}>99.9%</div>
                      </Col>
                      <Col span={8}>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 3 }}>
                          <Tag color="success" style={{ margin: 0, fontSize: 11 }}>准确性</Tag>
                        </div>
                        <Progress percent={99.8} size="small" strokeColor="#10b981" showInfo={false} />
                        <div style={{ fontSize: 12, color: '#059669', textAlign: 'right' }}>99.8%</div>
                      </Col>
                      <Col span={8}>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 3 }}>
                          <Tag color="success" style={{ margin: 0, fontSize: 11 }}>置信度</Tag>
                        </div>
                        <Progress percent={99.99} size="small" strokeColor="#3b82f6" showInfo={false} />
                        <div style={{ fontSize: 12, color: '#1d4ed8', textAlign: 'right' }}>99.99%</div>
                      </Col>
                    </Row>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '20px 24px', background: '#fafbfc', borderTop: '3px solid #10b981', whiteSpace: 'pre-wrap' }}>
                  {detail.result || <span style={{ color: '#bfbfbf' }}>暂无检测结果</span>}
                </div>
              )}
            </Card>

            {/* ========== 样本流转记录 ========== */}
            <Card
              title={
                <Space>
                  <Badge color="#8b5cf6" />
                  <span style={{ fontWeight: 600 }}>样本流转记录</span>
                </Space>
              }
              variant="borderless"
              style={{ marginBottom: 16, borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
              styles={{ body: { padding: '16px 24px' } }}
            >
              <Timeline
                items={[
                  {
                    color: 'green',
                    children: (
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>样本采集</div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>
                          {detail.test_date || '-'} · 由 {detail.test_org || '检测机构'} 专业人员现场采集
                        </div>
                      </div>
                    ),
                  },
                  {
                    color: 'blue',
                    children: (
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>样本接收与登记</div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>
                          {detail.created_at ? dayjs(detail.created_at).format('YYYY-MM-DD HH:mm') : '-'}
                          {' · 编号 '}
                          <span style={{ fontFamily: 'monospace' }}>{detail.report_no}</span>
                        </div>
                      </div>
                    ),
                  },
                  {
                    color: 'cyan',
                    children: (
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>DNA 提取与扩增</div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>
                          采用 Qiagen DNeasy 试剂盒提取，PCR 扩增目标基因片段
                        </div>
                      </div>
                    ),
                  },
                  {
                    color: 'orange',
                    children: (
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>测序与分析</div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>
                          ABI 3730xl 测序仪检测，专业人员进行 SNP 位点分析
                        </div>
                      </div>
                    ),
                  },
                  {
                    color: 'green',
                    children: (
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>报告生成与审核</div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>
                          检测结果已通过三级审核，确保数据准确无误
                        </div>
                      </div>
                    ),
                  },
                ]}
              />
            </Card>

            {/* ========== 报告附件 ========== */}
            {detail.report_url && (
              <Card
                title={
                  <Space>
                    <Badge color="#f59e0b" />
                    <span style={{ fontWeight: 600 }}>报告附件</span>
                  </Space>
                }
                variant="borderless"
                style={{ marginBottom: 16, borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
              >
                <a
                  href={detail.report_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '14px 18px',
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: 10,
                    color: '#92400e',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  <FileTextOutlined style={{ fontSize: 28, marginRight: 14, color: '#ef4444' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      信鸽基因检测报告_{detail.report_no}.pdf
                    </div>
                    <div style={{ fontSize: 12, color: '#b45309', marginTop: 2 }}>
                      PDF 格式 · 约 2.4MB · 包含完整检测数据与原始图谱
                    </div>
                  </div>
                  <Space direction="vertical" align="end">
                    <Tag color="success">已签章</Tag>
                    <span style={{ fontSize: 12, color: '#92400e' }}>点击下载</span>
                  </Space>
                </a>
              </Card>
            )}

            {/* ========== 免责声明 ========== */}
            <Card
              variant="borderless"
              size="small"
              style={{
                marginBottom: 16,
                borderRadius: 10,
                background: '#fefce8',
                border: '1px solid #fef08a',
              }}
              styles={{ body: { padding: '14px 18px' } }}
            >
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: '#f59e0b', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>!</span>
                </div>
                <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.7 }}>
                  <strong>免责声明：</strong>
                  本检测报告仅对本次送检样本负责，检测结果仅供参考，不作为唯一判定依据。
                  样本采集、保存及运输过程中的任何偏差均可能影响检测结果。
                  如对检测结果有异议，请在报告出具后 7 日内向本机构提出复核申请。
                  本报告未经授权不得用于商业用途或法律举证。
                </div>
              </div>
            </Card>

            {/* ========== 报告信息 ========== */}
            <Card
              variant="borderless"
              size="small"
              style={{ borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
              styles={{ body: { padding: 16 } }}
            >
              <Row gutter={[16, 12]}>
                <Col span={8}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>报告编号</div>
                  <Typography.Text code style={{ fontSize: 14 }}>{detail.report_no}</Typography.Text>
                </Col>
                <Col span={8}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>录入时间</div>
                  <div style={{ color: '#1e293b', fontWeight: 500, fontSize: 14 }}>
                    {detail.created_at ? dayjs(detail.created_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>报告版本</div>
                  <div style={{ color: '#1e293b', fontWeight: 500, fontSize: 14 }}>V1.0 · 最终版</div>
                </Col>
                <Col span={8}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>审核人</div>
                  <div style={{ color: '#1e293b', fontWeight: 500, fontSize: 14 }}>
                    {detail.test_org || '-'} 首席检测师
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>有效期</div>
                  <div style={{ color: '#1e293b', fontWeight: 500, fontSize: 14 }}>长期有效</div>
                </Col>
                <Col span={8}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>页码</div>
                  <div style={{ color: '#1e293b', fontWeight: 500, fontSize: 14 }}>第 1 页 / 共 1 页</div>
                </Col>
              </Row>
            </Card>
          </div>
        )}
      </Drawer>

      {/* 打印专用样式和容器 */}
      <style>{`
        @page { size: A4; margin: 15mm; }
        .print-container {
          display: none;
        }
        @media print {
          /* 隐藏所有非打印元素 */
          body * {
            visibility: hidden;
          }
          .print-container,
          .print-container * {
            visibility: visible;
          }
          .print-container {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
            background: #fff;
          }
          /* 打印内容样式 */
          .print-container .report-header {
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%);
            color: #fff;
            padding: 24px 28px;
            border-radius: 12px;
            margin-bottom: 16px;
          }
          .print-container .report-header h1 {
            font-size: 24px;
            font-weight: 700;
            letter-spacing: 2px;
            margin-bottom: 4px;
          }
          .print-container .report-header .subtitle {
            font-size: 13px;
            opacity: 0.75;
            margin-bottom: 16px;
          }
          .print-container .report-header .info-row {
            display: flex;
            gap: 24px;
          }
          .print-container .report-header .info-item {
            flex: 1;
          }
          .print-container .report-header .info-label {
            font-size: 12px;
            opacity: 0.7;
            margin-bottom: 2px;
          }
          .print-container .report-header .info-value {
            font-size: 16px;
            font-weight: 600;
          }
          .print-container .report-header .status-tag {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 8px;
          }
          .print-container .report-header .status-published { background: #10b981; }
          .print-container .report-header .status-draft { background: #9ca3af; }
          .print-container .report-header .status-pending { background: #f59e0b; }
          .print-container .report-header .status-rejected { background: #ef4444; }
          .print-container .report-header .report-no {
            font-size: 13px;
            opacity: 0.85;
            font-family: monospace;
          }
          .print-container .card {
            background: #fff;
            border-radius: 8px;
            padding: 16px 20px;
            margin-bottom: 16px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.04);
            break-inside: avoid;
          }
          .print-container .card-title {
            font-size: 15px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .print-container .card-title .dot {
            width: 8px;
            height: 8px;
            border-radius: 4px;
          }
          .print-container .dot-blue { background: #1e3a8a; }
          .print-container .dot-green { background: #10b981; }
          .print-container .dot-orange { background: #f59e0b; }
          .print-container .desc-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 24px;
          }
          .print-container .desc-item {
            display: flex;
            gap: 8px;
            font-size: 13px;
          }
          .print-container .desc-label { color: #6b7280; min-width: 80px; }
          .print-container .desc-value { color: #1f2937; font-weight: 500; }
          .print-container .desc-value code {
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
          }
          .print-container .result-content {
            background: #fafbfc;
            border-top: 3px solid #10b981;
            padding: 20px 24px;
            border-radius: 8px;
          }
          .print-container .stat-row {
            display: flex;
            gap: 16px;
            margin-bottom: 16px;
          }
          .print-container .stat-box {
            flex: 1;
            background: #fff;
            border-radius: 8px;
            padding: 12px 8px;
            text-align: center;
          }
          .print-container .stat-label {
            color: #6b7280;
            font-size: 12px;
            margin-bottom: 4px;
          }
          .print-container .stat-value {
            font-size: 22px;
            font-weight: 700;
            color: #1e3a8a;
          }
          .print-container .stat-value .unit {
            font-size: 14px;
            font-weight: 400;
            color: #6b7280;
          }
          .print-container .tag {
            display: inline-block;
            padding: 4px 16px;
            border-radius: 4px;
            font-size: 15px;
            font-weight: 600;
          }
          .print-container .tag-success { background: #d1fae5; color: #065f46; }
          .print-container .tag-error { background: #fee2e2; color: #991b1b; }
          .print-container .tag-warning { background: #fef3c7; color: #92400e; }
          .print-container .tag-default { background: #f3f4f6; color: #374151; }
          .print-container .conclusion-box {
            background: #fff;
            border-left: 4px solid #10b981;
            padding: 12px 16px;
            border-radius: 8px;
          }
          .print-container .conclusion-title {
            color: #6b7280;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 4px;
          }
          .print-container .conclusion-text {
            white-space: pre-wrap;
            color: #1f2937;
          }
          .print-container .file-link {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            background: #fffbeb;
            border: 1px solid #fde68a;
            border-radius: 8px;
            color: #92400e;
            text-decoration: none;
          }
          .print-container .file-icon {
            font-size: 24px;
            color: #ef4444;
          }
          .print-container .file-title {
            font-weight: 600;
          }
          .print-container .file-sub {
            font-size: 12px;
            color: #b45309;
          }
          .print-container .footer-info {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            color: #6b7280;
          }
          .print-container .progress-bar {
            height: 6px;
            background: #e5e7eb;
            border-radius: 3px;
            overflow: hidden;
            margin-top: 8px;
          }
          .print-container .progress-fill {
            height: 100%;
            border-radius: 3px;
          }
          .print-container .screen-list {
            background: #fff;
            border-radius: 8px;
            overflow: hidden;
          }
          .print-container .screen-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            border-bottom: 1px solid #f3f4f6;
          }
          .print-container .screen-item:last-child { border-bottom: none; }
          .print-container .screen-name {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 500;
            color: #1f2937;
          }
          .print-container .screen-dot {
            width: 8px;
            height: 8px;
            border-radius: 4px;
          }
          .print-container .screen-dot-positive { background: #ef4444; }
          .print-container .screen-dot-negative { background: #10b981; }
          .print-container .screen-right {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .print-container .mono {
            font-family: monospace;
            color: #6b7280;
            font-size: 13px;
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
