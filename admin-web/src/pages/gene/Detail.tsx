import {
  ModalForm,
  PageContainer,
  ProFormDatePicker,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { App, Button, Card, Descriptions, Empty, Popconfirm, Space, Spin, Tabs, Tag, Tree } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, QrcodeOutlined } from '@ant-design/icons';
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
  const { message } = App.useApp();
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
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [editingTest, setEditingTest] = useState<GeneTest | null>(null);
  const [photoError, setPhotoError] = useState(false);

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

  // 检测记录提交
  const handleTestSubmit = async (values: Record<string, unknown>) => {
    const testDate = values.test_date ? dayjs(values.test_date as string).format('YYYY-MM-DD') : null;
    const payload = {
      gene_profile_id: profileId,
      test_org: values.test_org as string,
      project: values.project as string,
      report_no: (values.report_no as string) || null,
      result: (values.result as string) || null,
      report_url: (values.report_url as string) || null,
      test_date: testDate,
    };
    if (editingTest) {
      await updateGeneTest(editingTest.id, payload);
      message.success('更新成功');
    } else {
      await createGeneTest(payload);
      message.success('新增成功');
    }
    setTestModalVisible(false);
    handleRefresh();
    return true;
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
    { title: '检测项目', dataIndex: 'project', width: 140, ellipsis: true },
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
            <Button type="link" size="small" onClick={() => { setEditingTest(record); setTestModalVisible(true); }}>
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
                            onClick={() => { setEditingTest(null); setTestModalVisible(true); }}
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

      {/* 检测记录新增/编辑弹窗 */}
      <ModalForm
        title={editingTest ? '编辑检测记录' : '新增检测记录'}
        open={testModalVisible}
        onOpenChange={setTestModalVisible}
        onFinish={handleTestSubmit}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        width={520}
        initialValues={
          editingTest
            ? {
                test_org: editingTest.test_org,
                project: editingTest.project,
                report_no: editingTest.report_no ?? undefined,
                result: editingTest.result ?? undefined,
                report_url: editingTest.report_url ?? undefined,
                test_date: editingTest.test_date ? dayjs(editingTest.test_date) : undefined,
              }
            : {}
        }
      >
        <ProFormText
          name="test_org"
          label="检测机构"
          rules={[{ required: true, message: '请输入检测机构' }]}
          placeholder="请输入检测机构"
        />
        <ProFormText
          name="project"
          label="检测项目"
          rules={[{ required: true, message: '请输入检测项目' }]}
          placeholder="请输入检测项目"
        />
        <ProFormText name="report_no" label="报告编号" placeholder="请输入报告编号" />
        <ProFormTextArea name="result" label="检测结果" placeholder="请输入检测结果" fieldProps={{ autoSize: { minRows: 3, maxRows: 6 } }} />
        <ProFormText name="report_url" label="报告 URL" placeholder="请输入报告文件地址" />
        <ProFormDatePicker name="test_date" label="检测日期" />
      </ModalForm>

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
