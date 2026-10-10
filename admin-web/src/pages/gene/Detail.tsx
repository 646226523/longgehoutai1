import {
  PageContainer,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { App, Button, Card, Checkbox, DatePicker, Descriptions, Drawer, Empty, Form, Input, Popconfirm, Segmented, Space, Spin, Tabs, Tag, Tree } from 'antd';
import { ArrowLeftOutlined, CheckCircleFilled, DeleteOutlined, EyeOutlined, ExperimentOutlined, FileExcelOutlined, FileOutlined, FilePdfOutlined, FilePptOutlined, FileTextOutlined, FileWordOutlined, InfoCircleOutlined, LoadingOutlined, PlusOutlined, QrcodeOutlined, UploadOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';

import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import RefreshButton from '../../components/RefreshButton';
import { useTableRefresh } from '../../hooks/useTableRefresh';
import {
  createGeneTest,
  deleteGeneTest,
  getGeneDetail,
  getGeneLineage,
  getGeneTests,
  regenerateGeneQrcode,
  updateGeneTest,
  type GeneProfileDetail,
  type GeneTest,
  type LineageNode,
} from '../../services/gene';
import {
  getDetectionItemTypes,
  getDetectionOrgOptions,
  type DetectionItemType,
  type DetectionOrgOption,
} from '../../services/detection';
import { http } from '../../services/request';

const GENDER_MAP: Record<string, string> = { male: '雄', female: '雌', unknown: '未知' };

// 血统树角色标签(按谱系路径)
const ROLE_LABELS: Record<string, string> = {
  '': '本鸽',
  sire: '父',
  dam: '母',
  'sire.sire': '祖父',
  'sire.dam': '祖母',
  'dam.sire': '外祖父',
  'dam.dam': '外祖母',
};

interface TreeNode {
  key: string;
  title: ReactNode;
  children?: TreeNode[];
}

// 递归将血统节点转为 AntD Tree 数据
function toTreeData(node: LineageNode | null, path: string): TreeNode[] {
  if (!node) return [];
  const label = ROLE_LABELS[path] ?? path;
  const children: TreeNode[] = [];
  const sirePath = path ? `${path}.sire` : 'sire';
  const damPath = path ? `${path}.dam` : 'dam';
  if (node.sire) children.push(...toTreeData(node.sire, sirePath));
  if (node.dam) children.push(...toTreeData(node.dam, damPath));
  return [
    {
      key: `${path || 'root'}-${node.id}`,
      title: (
        <Space>
          <Tag color="blue">{label}</Tag>
          <span>{node.ring_number}</span>
          <span>{node.name}</span>
          <span style={{ color: '#888' }}>
            {node.breed}
            {node.bloodline ? ` · ${node.bloodline}` : ''}
          </span>
        </Space>
      ),
      children,
    },
  ];
}

// 基因档案详情
const GeneDetail = () => {
  const { message, modal } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const profileId = Number(id);
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const canEdit = hasPermission(currentUser, 'gene:edit');

  const [detail, setDetail] = useState<GeneProfileDetail | null>(null);
  const [lineage, setLineage] = useState<LineageNode | null>(null);
  const [loading, setLoading] = useState(true);

  // 检测记录弹窗
  const testActionRef = useRef<ActionType>();
  const { tableLoading, handleRefresh } = useTableRefresh(testActionRef, { messageApi: message });
  const [testDrawerVisible, setTestDrawerVisible] = useState(false);
  const [editingTest, setEditingTest] = useState<GeneTest | null>(null);
  const [photoError, setPhotoError] = useState(false);

  // 检测字典数据（复用检测中心数据源）
  const [orgOptions, setOrgOptions] = useState<DetectionOrgOption[]>([]);
  const [itemTypes, setItemTypes] = useState<DetectionItemType[]>([]);
  // 表单 form ref
  const [testForm] = Form.useForm();
  const [testSubmitting, setTestSubmitting] = useState(false);

  // 报告文件上传相关
  const reportFileInputRef = useRef<HTMLInputElement>(null);
  const [reportUploading, setReportUploading] = useState(false);

  const REPORT_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.gif';
  const REPORT_MAX_SIZE = 20 * 1024 * 1024;

  // 从 URL 推断文件类型
  const getReportFileMeta = (url?: string): { ext: string; isImage: boolean; iconColor: string } => {
    if (!url) return { ext: '', isImage: false, iconColor: '#8c8c8c' };
    const clean = url.split('?')[0].toLowerCase();
    const ext = clean.includes('.') ? clean.slice(clean.lastIndexOf('.')) : '';
    const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    return {
      ext,
      isImage: imageExts.includes(ext),
      iconColor:
        ext === '.pdf'
          ? '#ff4d4f'
          : ext === '.doc' || ext === '.docx'
          ? '#1890ff'
          : ext === '.xls' || ext === '.xlsx'
          ? '#52c41a'
          : ext === '.ppt' || ext === '.pptx'
          ? '#fa8c16'
          : '#8c8c8c',
    };
  };

  const ReportFileIcon: React.FC<{ ext: string; color: string }> = ({ ext, color }) => {
    if (['.pdf'].includes(ext)) return <FilePdfOutlined style={{ fontSize: 32, color }} />;
    if (['.doc', '.docx'].includes(ext)) return <FileWordOutlined style={{ fontSize: 32, color }} />;
    if (['.xls', '.xlsx'].includes(ext)) return <FileExcelOutlined style={{ fontSize: 32, color }} />;
    if (['.ppt', '.pptx'].includes(ext)) return <FilePptOutlined style={{ fontSize: 32, color }} />;
    return <FileOutlined style={{ fontSize: 32, color }} />;
  };

  // 文件 → base64 data URI
  const fileToDataURI = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const handleReportFile = async (file: File) => {
    // 校验扩展名
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const allowed = REPORT_ACCEPT.split(',');
    if (!allowed.includes(ext)) {
      message.error(`不支持的文件类型 ${ext || ''}，仅支持 ${REPORT_ACCEPT}`);
      return;
    }
    if (file.size > REPORT_MAX_SIZE) {
      message.error('文件大小超过 20MB 限制');
      return;
    }

    const msgKey = 'report_upload';
    try {
      setReportUploading(true);
      message.loading({ content: '正在读取文件...', key: msgKey, duration: 0 });
      const dataURI = await fileToDataURI(file);
      message.loading({ content: '正在上传到服务器...', key: msgKey, duration: 0 });

      const result = await http.post<{ url: string; originalName: string; size: number; mimeType: string }>(
        '/upload/file',
        { data: dataURI, name: file.name }
      );

      testForm.setFieldsValue({ report_url: result.url });
      message.success({ content: '报告上传成功', key: msgKey });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '未知错误';
      message.error({ content: `上传失败：${msg}`, key: msgKey });
    } finally {
      setReportUploading(false);
      // 重置 input value，允许再次选择同一文件
      if (reportFileInputRef.current) reportFileInputRef.current.value = '';
    }
  };

  // 打开抽屉：加载字典 + 回填表单
  const openTestDrawer = (test?: GeneTest) => {
    setEditingTest(test ?? null);
    testForm.resetFields();
    if (test) {
      // 编辑模式：回填（project 逗号分隔 → 数组）
      testForm.setFieldsValue({
        test_org: test.test_org,
        project: test.project
          ? test.project.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        report_no: test.report_no ?? undefined,
        result: test.result ?? undefined,
        report_url: test.report_url ?? undefined,
        test_date: test.test_date ? dayjs(test.test_date) : undefined,
      });
    } else {
      // 新增：默认值
      testForm.setFieldsValue({
        test_date: dayjs(),
        project: [],
      });
    }
    // 字典按需加载（只加载一次）
    if (orgOptions.length === 0 || itemTypes.length === 0) {
      Promise.all([
        getDetectionOrgOptions().catch(() => [] as DetectionOrgOption[]),
        getDetectionItemTypes().catch(() => [] as DetectionItemType[]),
      ])
        .then(([orgs, items]) => {
          setOrgOptions(orgs ?? []);
          setItemTypes(items ?? []);
        })
        .catch(() => {
          /* 忽略，保底为空数组 */
        });
    }
    setTestDrawerVisible(true);
  };

  const loadDetail = () => {
    setLoading(true);
    getGeneDetail(profileId)
      .then((d) => setDetail(d))
      .catch(() => {
        // 拦截器已提示错误
      })
      .finally(() => setLoading(false));
  };

  const loadLineage = () => {
    getGeneLineage(profileId)
      .then(setLineage)
      .catch(() => {
        // 拦截器已提示错误
      });
  };

  useEffect(() => {
    if (Number.isFinite(profileId)) {
      loadDetail();
      loadLineage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  useEffect(() => {
    setPhotoError(false);
  }, [detail?.photo_url]);

  // 重新生成二维码
  const handleRegenQrcode = async () => {
    try {
      const res = await regenerateGeneQrcode(profileId);
      setDetail((d) => (d ? { ...d, qr_code: res.qr_code } : d));
      message.success('二维码已重新生成');
    } catch {
      // 拦截器已提示错误
    }
  };

  // 检测记录提交 (keepOpen = 保存并新增下一条)
  const handleTestSubmit = async (keepOpen = false) => {
    try {
      const values = await testForm.validateFields();
      const testDate = values.test_date ? dayjs(values.test_date as string).format('YYYY-MM-DD') : null;
      // project: Checkbox.Group 提交 string[]，手动输入 Input 是 string → 统一处理
      const projectRaw = values.project;
      const projectArr: string[] = Array.isArray(projectRaw)
        ? projectRaw
        : projectRaw
        ? [String(projectRaw)]
        : [];
      const projectStr = projectArr.map((s) => String(s).trim()).filter(Boolean).join(',');
      if (!projectStr) {
        // validateFields 的 rules 会先拦截，这里是防御性兜底
        return;
      }
      const payload = {
        gene_profile_id: profileId,
        test_org: String(values.test_org ?? '').trim(),
        project: projectStr,
        report_no: (values.report_no as string)?.trim() || null,
        result: (values.result as string)?.trim() || null,
        report_url: (values.report_url as string)?.trim() || null,
        test_date: testDate,
      };
      setTestSubmitting(true);
      if (editingTest) {
        await updateGeneTest(editingTest.id, payload);
        message.success('更新成功');
        handleRefresh();
        setTestDrawerVisible(false);
      } else {
        await createGeneTest(payload);
        message.success(keepOpen ? '已保存，继续新增下一条' : '新增成功');
        handleRefresh();
        if (keepOpen) {
          // 清空可变字段，保留机构/项目(方便连续录入同一机构)
          testForm.setFieldsValue({
            report_no: undefined,
            result: undefined,
            report_url: undefined,
            test_date: dayjs(),
          });
        } else {
          setTestDrawerVisible(false);
        }
      }
    } catch (err) {
      if (err instanceof Error && err.message) {
        // AntD Form validateFields 的 error 会是一个 ValidationError[]，不是 Error
        // 这里只处理非表单校验的异常（如网络错误）
      }
      // 拦截器已提示错误（网络异常），表单校验错误由 antd 自己展示
    } finally {
      setTestSubmitting(false);
    }
  };

  const handleDeleteTest = async (record: GeneTest) => {
    try {
      await deleteGeneTest(record.id);
      message.success('删除成功');
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  const testColumns: ProColumns<GeneTest>[] = [
    { title: '检测机构', dataIndex: 'test_org', width: 160, ellipsis: true },
    {
      title: '检测项目',
      dataIndex: 'project',
      width: 260,
      render: (_dom, record) => {
        const items = record.project
          ? record.project.split(',').map((s) => s.trim()).filter(Boolean)
          : [];
        if (items.length === 0) return <span style={{ color: '#bfbfbf' }}>-</span>;
        return (
          <Space size={[4, 4]} wrap>
            {items.map((p) => (
              <Tag key={p} color="cyan" style={{ margin: 0 }}>
                {p}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    { title: '报告编号', dataIndex: 'report_no', width: 140, ellipsis: true },
    { title: '检测结果', dataIndex: 'result', ellipsis: true },
    {
      title: '检测日期',
      dataIndex: 'test_date',
      width: 120,
      render: (_, record) => record.test_date || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {canEdit && (
            <Button type="link" size="small" onClick={() => { openTestDrawer(record); }}>
              编辑
            </Button>
          )}
          {canEdit && (
            <Popconfirm title="确认删除该检测记录?" onConfirm={() => handleDeleteTest(record)}>
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!detail) {
    return (
      <PageContainer
        header={{
          title: '基因档案详情',
          onBack: () => navigate('/gene/list'),
          breadcrumb: {},
        }}
      >
        <Empty description="档案不存在或加载失败" />
      </PageContainer>
    );
  }

  const qrImageUrl = detail.qr_code
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(detail.qr_code)}`
    : '';

  const descriptionItems = [
    { key: 'ring_number', label: '足环号', children: detail.ring_number },
    { key: 'name', label: '鸽名', children: detail.name },
    { key: 'gender', label: '性别', children: GENDER_MAP[detail.gender] ?? detail.gender },
    { key: 'breed', label: '品种', children: detail.breed || '-' },
    { key: 'bloodline', label: '血统', children: detail.bloodline || '-' },
    { key: 'owner_name', label: '鸽主', children: detail.owner_name || '-' },
    { key: 'owner_phone', label: '鸽主电话', children: detail.owner_phone || '-' },
    {
      key: 'photo_url',
      label: '照片',
      children: detail.photo_url && !photoError ? (
        <img
          src={detail.photo_url}
          alt="鸽子照片"
          style={{ maxWidth: 120, maxHeight: 80, objectFit: 'cover', borderRadius: 4 }}
          onError={() => setPhotoError(true)}
        />
      ) : (
        <span style={{ color: '#999' }}>暂无照片</span>
      ),
    },
    { key: 'color', label: '羽色', children: detail.color || '-' },
    { key: 'eye_color', label: '眼砂', children: detail.eye_color || '-' },
    { key: 'birth_date', label: '出生日期', children: detail.birth_date || '-' },
    {
      key: 'sire',
      label: '父鸽',
      children: detail.sire ? `${detail.sire.ring_number} ${detail.sire.name}` : '-',
    },
    {
      key: 'dam',
      label: '母鸽',
      children: detail.dam ? `${detail.dam.ring_number} ${detail.dam.name}` : '-',
    },
    {
      key: 'status',
      label: '档案状态',
      children: <Tag color={detail.status === 1 ? 'green' : 'default'}>{detail.status === 1 ? '正常' : '停用'}</Tag>,
    },
    {
      key: 'created_at',
      label: '创建时间',
      children: detail.created_at ? dayjs(detail.created_at).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
  ];

  return (
    <PageContainer
      header={{
        title: `基因档案:${detail.ring_number}`,
        onBack: () => navigate('/gene/list'),
        breadcrumb: {},
      }}
    >
      {/* 档案信息卡 */}
      <Card title="档案信息" style={{ marginBottom: 16 }}>
        <Descriptions items={descriptionItems} column={3} bordered size="small" />
      </Card>

      {/* 鸽子照片卡 */}
      <Card title="鸽子照片" style={{ marginBottom: 16 }}>
        {detail.photo_url && !photoError ? (
          <img
            src={detail.photo_url}
            alt="鸽子照片"
            style={{ maxWidth: 400, maxHeight: 300, objectFit: 'contain', borderRadius: 8 }}
            onError={() => setPhotoError(true)}
          />
        ) : (
          <div
            style={{
              width: 300,
              height: 200,
              lineHeight: '200px',
              textAlign: 'center',
              color: '#999',
              border: '1px dashed #d9d9d9',
              borderRadius: 8,
            }}
          >
            暂无照片
          </div>
        )}
      </Card>

      {/* 溯源二维码卡 */}
      <Card title="溯源二维码" style={{ marginBottom: 16 }}>
        <Space align="start" size={24}>
          {qrImageUrl ? (
            <img
              src={qrImageUrl}
              alt="溯源二维码"
              width={200}
              height={200}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div style={{ width: 200, height: 200, lineHeight: '200px', textAlign: 'center', color: '#999', border: '1px dashed #ddd' }}>
              暂无二维码
            </div>
          )}
          <div style={{ maxWidth: 420 }}>
            <div style={{ marginBottom: 8, color: '#888' }}>二维码内容(详情访问 URL):</div>
            <div style={{ wordBreak: 'break-all', marginBottom: 16, padding: 8, background: '#fafafa', borderRadius: 4 }}>
              {detail.qr_code || '-'}
            </div>
            {canEdit && (
              <Button icon={<QrcodeOutlined />} onClick={handleRegenQrcode}>
                重新生成二维码
              </Button>
            )}
          </div>
        </Space>
      </Card>

      {/* 检测记录 / 血统树 Tab */}
      <Card>
        <Tabs
          defaultActiveKey="tests"
          items={[
            {
              key: 'tests',
              label: '检测记录',
              children: (
                <ProTable<GeneTest>
                  headerTitle="检测记录"
                  actionRef={testActionRef}
                  loading={tableLoading}
                  rowKey="id"
                  columns={testColumns}
                  options={{ density: false, reload: false }}
                  search={false}
                  pagination={false}
                  scroll={{ x: 800 }}
                  request={async () => {
                    try {
                      const res = await getGeneTests(profileId);
                      const data = Array.isArray(res) ? res : [];
                      return { data, success: true, total: data.length };
                    } catch {
                      return { data: [], success: false, total: 0 };
                    }
                  }}
                  toolBarRender={() =>
                    canEdit
                      ? [
                          <Button
                            key="create-test"
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => { openTestDrawer(); }}
                          >
                            新增检测记录
                          </Button>,
                          <RefreshButton key="refresh" actionRef={testActionRef as any} />,
                        ]
                      : [
                          <RefreshButton key="refresh" actionRef={testActionRef as any} />,
                        ]
                  }
                />
              ),
            },
            {
              key: 'lineage',
              label: '血统树',
              children: lineage ? (
                <Tree
                  treeData={toTreeData(lineage, '')}
                  defaultExpandAll
                  showLine
                />
              ) : (
                <Empty description="暂无血统关系数据" />
              ),
            },
          ]}
        />
      </Card>

      {/* 检测记录 新增/编辑 抽屉（全新重构） */}
      <Drawer
        open={testDrawerVisible}
        onClose={() => setTestDrawerVisible(false)}
        width={640}
        destroyOnHidden
        title={null}
        styles={{ header: { display: 'none' }, body: { padding: 0 }, footer: { padding: '12px 24px', borderTop: '1px solid #f0f0f0', background: '#fafafa' } }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 20 }}>
            <Button onClick={() => setTestDrawerVisible(false)}>取消</Button>
            {!editingTest && (
              <Button onClick={() => handleTestSubmit(true)} loading={testSubmitting}>
                保存并新增下一条
              </Button>
            )}
            <Button
              type="primary"
              icon={<CheckCircleFilled />}
              loading={testSubmitting}
              onClick={() => handleTestSubmit(false)}
            >
              {editingTest ? '保存修改' : '保存'}
            </Button>
          </div>
        }
      >
        {detail && (
          <Form
            form={testForm}
            layout="vertical"
            requiredMark
            initialValues={editingTest ? undefined : { test_date: dayjs() }}
            style={{ padding: '0 24px 24px', overflow: 'auto' }}
          >
            {/* ============ Hero: 档案信息卡（只读） ============ */}
            <div
              style={{
                margin: '0 -24px 16px',
                padding: '20px 24px 18px',
                background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 60%, #2dd4bf 100%)',
                color: '#fff',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute', top: -40, right: -30, width: 140, height: 140,
                  borderRadius: '50%', background: 'rgba(255,255,255,0.08)',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
                <div
                  style={{
                    width: 54, height: 54, borderRadius: 12,
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, fontWeight: 700, color: '#fff', flexShrink: 0,
                  }}
                >
                  {(detail.name || '?').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>
                    检测登记 · {detail.name || '未命名'}
                  </div>
                  <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13, opacity: 0.9 }}>
                    {detail.ring_number}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                    {GENDER_MAP[detail.gender] ?? detail.gender}
                    {detail.breed ? ` · ${detail.breed}` : ''}
                    {detail.bloodline ? ` · ${detail.bloodline}` : ''}
                  </div>
                </div>
                <Tag color="cyan" style={{ margin: 0, background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }}>
                  Gene #{profileId}
                </Tag>
              </div>
            </div>

            {/* ============ 🔬 检测服务 ============ */}
            <Card
              size="small"
              title={
                <span style={{ fontWeight: 600, fontSize: 14 }}>
                  <ExperimentOutlined style={{ marginRight: 6, color: '#14b8a6' }} />
                  检测服务
                </span>
              }
              style={{ marginBottom: 16, borderRadius: 8, border: '1px solid #e8e8e8' }}
              styles={{ header: { borderBottom: '1px solid #f0f0f0', background: '#fafcff' } }}
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {/* 检测机构 */}
                <div>
                  <div style={{ marginBottom: 6, fontSize: 13, color: '#595959', fontWeight: 500 }}>
                    <span style={{ color: '#ff4d4f' }}>*</span> 检测机构
                    <span style={{ color: '#bfbfbf', fontSize: 12, fontWeight: 400, marginLeft: 8 }}>
                      {orgOptions.length > 0 ? `已加载 ${orgOptions.length} 家机构` : '手动输入模式'}
                    </span>
                  </div>
                  {orgOptions.length > 0 ? (
                    <Form.Item
                      name="test_org"
                      rules={[{ required: true, message: '请选择检测机构' }]}
                      noStyle
                    >
                      <Segmented
                        block
                        options={orgOptions.map((o) => ({
                          label: (
                            <span>
                              <span style={{ fontWeight: 600 }}>{o.name}</span>
                              {o.code && <span style={{ color: '#bfbfbf', marginLeft: 6, fontSize: 11 }}>({o.code})</span>}
                            </span>
                          ),
                          value: o.name,
                        }))}
                      />
                    </Form.Item>
                  ) : (
                    <Form.Item
                      name="test_org"
                      rules={[{ required: true, message: '请输入检测机构' }]}
                      noStyle
                    >
                      <Input placeholder="请输入检测机构名称" allowClear />
                    </Form.Item>
                  )}
                  {/* 已选机构详情预览 */}
                  <Form.Item shouldUpdate={(prev) => prev.test_org} noStyle>
                    {({ getFieldValue }) => {
                      const orgName = getFieldValue('test_org') as string | undefined;
                      const org = orgName ? orgOptions.find((o) => o.name === orgName) : undefined;
                      if (!org) return null;
                      return (
                        <div
                          style={{
                            marginTop: 10,
                            padding: '10px 14px',
                            background: '#f0fdfa',
                            border: '1px solid #99f6e4',
                            borderRadius: 6,
                            fontSize: 12,
                          }}
                        >
                          {org.code && (
                            <div style={{ color: '#595959' }}>
                              机构编码：<span style={{ fontFamily: 'monospace', color: '#0f766e' }}>{org.code}</span>
                            </div>
                          )}
                          {org.projects && (
                            <div style={{ color: '#595959', marginTop: 2 }}>
                              可检测项目：<span style={{ color: '#0f766e' }}>{org.projects}</span>
                            </div>
                          )}
                        </div>
                      );
                    }}
                  </Form.Item>
                </div>

                {/* 检测项目 (多选 Checkbox 网格) */}
                <div>
                  <div style={{ marginBottom: 10, fontSize: 13, color: '#595959', fontWeight: 500 }}>
                    <span style={{ color: '#ff4d4f' }}>*</span> 检测项目
                    <span style={{ color: '#bfbfbf', fontSize: 12, fontWeight: 400, marginLeft: 8 }}>
                      {itemTypes.length > 0 ? `共 ${itemTypes.length} 项，可多选` : '手动输入模式'}
                    </span>
                    {/* 选中计数 */}
                    {itemTypes.length > 0 && (
                      <Form.Item shouldUpdate={(prev) => prev.project} noStyle>
                        {({ getFieldValue }) => {
                          const arr: string[] = Array.isArray(getFieldValue('project'))
                            ? getFieldValue('project')
                            : [];
                          const selected = arr.filter(Boolean).length;
                          if (selected === 0) return null;
                          return (
                            <Tag color="cyan" style={{ marginLeft: 10, marginRight: 0 }}>
                              已选 {selected}
                            </Tag>
                          );
                        }}
                      </Form.Item>
                    )}
                  </div>
                  {itemTypes.length > 0 ? (
                    <Form.Item
                      name="project"
                      rules={[
                        {
                          validator: (_rule, value: string[]) => {
                            if (!value || value.filter(Boolean).length === 0) {
                              return Promise.reject(new Error('请至少选择一项检测项目'));
                            }
                            return Promise.resolve();
                          },
                        },
                      ]}
                      noStyle
                    >
                      <Checkbox.Group
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '8px 10px',
                          width: '100%',
                        }}
                      >
                        {itemTypes.map((t) => (
                          <Checkbox
                            key={t.code || t.name}
                            value={t.name}
                            style={{
                              margin: 0,
                              padding: '10px 14px',
                              border: '1px solid #e8e8e8',
                              borderRadius: 8,
                              cursor: 'pointer',
                              background: '#fff',
                              transition: 'all 0.18s ease',
                              userSelect: 'none',
                            }}
                          >
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{t.name}</span>
                          </Checkbox>
                        ))}
                      </Checkbox.Group>
                    </Form.Item>
                  ) : (
                    <Form.Item
                      name="project"
                      rules={[
                        {
                          validator: (_rule, value: string[] | string) => {
                            const arr = Array.isArray(value) ? value : value ? [value] : [];
                            if (arr.length === 0 || !arr[0].trim()) {
                              return Promise.reject(new Error('请输入检测项目名称'));
                            }
                            return Promise.resolve();
                          },
                        },
                      ]}
                      noStyle
                    >
                      <Input placeholder="请输入检测项目名称（多项用逗号分隔）" allowClear />
                    </Form.Item>
                  )}
                </div>
              </Space>
            </Card>

            {/* ============ 📋 检测报告 ============ */}
            <Card
              size="small"
              title={
                <span style={{ fontWeight: 600, fontSize: 14 }}>
                  <FileTextOutlined style={{ marginRight: 6, color: '#faad14' }} />
                  检测报告
                  <span style={{ color: '#bfbfbf', fontSize: 12, fontWeight: 400, marginLeft: 8 }}>
                    事后录入
                  </span>
                </span>
              }
              style={{ marginBottom: 16, borderRadius: 8, border: '1px solid #e8e8e8' }}
              styles={{ header: { borderBottom: '1px solid #f0f0f0', background: '#fffbf0' } }}
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Form.Item
                    label="检测日期"
                    name="test_date"
                  >
                    <DatePicker style={{ width: '100%' }} placeholder="请选择" />
                  </Form.Item>
                  <Form.Item
                    label="报告编号"
                    name="report_no"
                  >
                    <Input placeholder="如 DT2025-0888" allowClear />
                  </Form.Item>
                </div>
                <Form.Item label="检测结果" name="result">
                  <Input.TextArea
                    rows={4}
                    placeholder="粘贴或输入检测结果，例如：父系相似度 99.2% / 抗病基因检测通过..."
                    showCount
                    maxLength={2000}
                  />
                </Form.Item>
                <Form.Item label="检测报告文件">
                  <Form.Item name="report_url" hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item shouldUpdate={(prev) => prev.report_url} noStyle>
                    {({ getFieldValue }) => {
                      const currentUrl = getFieldValue('report_url') as string | undefined;
                      const meta = getReportFileMeta(currentUrl);

                      // ========== 已上传：预览卡片 ==========
                      if (currentUrl) {
                        const previewSrc = meta.isImage ? currentUrl : '';
                        return (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 14,
                              padding: 14,
                              background: '#fafafa',
                              border: '1px solid #e8e8e8',
                              borderRadius: 10,
                              position: 'relative',
                            }}
                          >
                            {/* 图片预览 / 文件图标 */}
                            <div
                              style={{
                                width: 72,
                                height: 72,
                                borderRadius: 8,
                                background: '#fff',
                                border: '1px solid #f0f0f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                flexShrink: 0,
                              }}
                            >
                              {meta.isImage ? (
                                <img
                                  src={previewSrc}
                                  alt="报告预览"
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <ReportFileIcon ext={meta.ext} color={meta.iconColor} />
                              )}
                            </div>

                            {/* 文件信息 */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, color: '#262626', fontSize: 14, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {meta.isImage ? `检测报告 ${meta.ext.toUpperCase()}` : `检测报告${meta.ext.toUpperCase()}`}
                              </div>
                              <div style={{ fontSize: 12, color: '#8c8c8c', fontFamily: 'ui-monospace, Menlo, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {currentUrl}
                              </div>
                              {!meta.isImage && (
                                <div style={{ fontSize: 11, color: '#bfbfbf', marginTop: 2 }}>
                                  {meta.ext.toUpperCase()} · 可下载查看
                                </div>
                              )}
                            </div>

                            {/* 操作按钮 */}
                            <Space size={8}>
                              <Button
                                size="small"
                                type="text"
                                icon={<EyeOutlined />}
                                onClick={() => {
                                  window.open(currentUrl, '_blank', 'noopener,noreferrer');
                                }}
                              >
                                查看
                              </Button>
                              <Button
                                size="small"
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => {
                                  modal.confirm({
                                    title: '移除检测报告文件？',
                                    content: '仅移除表单关联，服务器上的原文件不会被删除',
                                    okText: '确认移除',
                                    okButtonProps: { danger: true },
                                    cancelText: '取消',
                                    onOk: () => {
                                      testForm.setFieldsValue({ report_url: undefined });
                                    },
                                  });
                                }}
                              >
                                移除
                              </Button>
                            </Space>
                          </div>
                        );
                      }

                      // ========== 未上传：拖拽上传区 ==========
                      return (
                        <>
                          <input
                            ref={reportFileInputRef}
                            type="file"
                            accept={REPORT_ACCEPT}
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleReportFile(file);
                            }}
                          />
                          <div
                            onClick={() => !reportUploading && reportFileInputRef.current?.click()}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (reportUploading) return;
                              const file = e.dataTransfer.files?.[0];
                              if (file) handleReportFile(file);
                            }}
                            style={{
                              border: '2px dashed #d9d9d9',
                              borderRadius: 10,
                              padding: '24px 20px',
                              textAlign: 'center',
                              cursor: reportUploading ? 'not-allowed' : 'pointer',
                              background: reportUploading ? '#fafafa' : '#fff',
                              transition: 'all 0.2s ease',
                              opacity: reportUploading ? 0.6 : 1,
                            }}
                            onMouseEnter={(e) => {
                              if (!reportUploading) {
                                (e.currentTarget as HTMLDivElement).style.borderColor = '#14b8a6';
                                (e.currentTarget as HTMLDivElement).style.background = '#f0fdfa';
                              }
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLDivElement).style.borderColor = '#d9d9d9';
                              (e.currentTarget as HTMLDivElement).style.background = '#fff';
                            }}
                          >
                            {reportUploading ? (
                              <div>
                                <LoadingOutlined style={{ fontSize: 28, color: '#14b8a6', marginBottom: 8 }} />
                                <div style={{ fontSize: 13, color: '#595959' }}>正在上传报告文件...</div>
                              </div>
                            ) : (
                              <div>
                                <UploadOutlined style={{ fontSize: 28, color: '#14b8a6', marginBottom: 8 }} />
                                <div style={{ fontSize: 13, color: '#262626', marginBottom: 4 }}>
                                  点击选择文件，或将文件拖拽到此处
                                </div>
                                <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                                  支持 PDF / Word / Excel / PPT · JPG / PNG · ≤ 20MB
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      );
                    }}
                  </Form.Item>
                </Form.Item>
              </Space>
            </Card>

            {/* ============ 提示信息 ============ */}
            <div
              style={{
                padding: '10px 14px',
                background: '#f0f5ff',
                border: '1px solid #adc6ff',
                borderRadius: 6,
                fontSize: 12,
                color: '#1d39c4',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <InfoCircleOutlined style={{ flexShrink: 0 }} />
              <span>
                检测记录保存后不可撤销，请确保数据真实准确。
                {!editingTest && (
                  <>
                    同一鸽子可能有 <b>多项检测</b>（DNA亲子鉴定 / 疾病筛查 / 品种鉴定），
                    可使用"保存并新增下一条"连续录入。
                  </>
                )}
              </span>
            </div>
          </Form>
        )}
      </Drawer>

      {/* 返回列表(底部辅助按钮) */}
      <div style={{ marginTop: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/gene/list')}>
          返回列表
        </Button>
      </div>
    </PageContainer>
  );
};

export default GeneDetail;


