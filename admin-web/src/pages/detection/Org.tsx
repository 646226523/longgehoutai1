import {
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  App,
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Row,
  Segmented,
  Space,
  Tag,
  Typography,
  Upload,
} from 'antd';
import {
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useRef, useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import type { RcFile } from 'antd/es/upload';

import { useTableRefresh } from '../../hooks/useTableRefresh';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import RefreshButton from '../../components/RefreshButton';
import LoftMapPicker from '../../components/LoftMapPicker';
import { http } from '../../services/request';
import {
  createDetectionOrg,
  getDetectionOrgs,
  getDetectionItemTypes,
  toggleDetectionOrgStatus,
  updateDetectionOrg,
  type DetectionOrg,
  type DetectionItemType,
} from '../../services/detection';

const { Text } = Typography;

// 机构状态: 1 合作中 2 暂停合作 0 已终止
const STATUS_TAG_MAP: Record<number, { color: string; text: string }> = {
  1: { color: 'green', text: '合作中' },
  2: { color: 'orange', text: '暂停合作' },
  0: { color: 'default', text: '已终止' },
};

// 生成机构编码 LAB-YYYY-MMDD-XXX
function generateOrgCode(): string {
  const now = dayjs();
  const dateStr = now.format('YYYY-MMDD');
  const seq = String(Math.floor(Math.random() * 900) + 100);
  return `LAB-${dateStr}-${seq}`;
}

// 机构表单数据类型
interface OrgFormData {
  name: string;
  code: string;
  contact: string;
  phone: string;
  address: string;
  location?: string; // JSON: {"lng":x,"lat":y,"address":"..."}
  longitude?: number; // 从 location 解析,用于显示
  latitude?: number;
  qualification: string;
  qualification_files: string[];
  projects: string[];
  status: number;
}

// 解析 location JSON
function parseLocation(locationStr?: string): { lng: number; lat: number; address: string } | null {
  if (!locationStr) return null;
  try {
    const parsed = JSON.parse(locationStr);
    if (typeof parsed.lng === 'number' && typeof parsed.lat === 'number') {
      return { lng: parsed.lng, lat: parsed.lat, address: parsed.address || '' };
    }
  } catch {
    // ignore
  }
  return null;
}

// 检测机构管理:列表 + 新增/编辑 + 状态切换
const DetectionOrg = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canView = hasPermission(currentUser, 'detection:view');
  const actionRef = useRef<ActionType>();
  const { tableLoading, handleRefresh } = useTableRefresh(actionRef, { messageApi: message });

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editing, setEditing] = useState<DetectionOrg | null>(null);

  // 表单数据（非受控模式，实时更新预览）
  const [formData, setFormData] = useState<OrgFormData>({
    name: '',
    code: generateOrgCode(),
    contact: '',
    phone: '',
    address: '',
    location: undefined,
    longitude: undefined,
    latitude: undefined,
    qualification: '',
    qualification_files: [],
    projects: [],
    status: 1,
  });

  // 地图选点（内联模式，实时同步）
  const [mapLocation, setMapLocation] = useState<{ lng: number; lat: number; address: string } | null>(null);

  // 检测项目库
  const [itemTypes, setItemTypes] = useState<DetectionItemType[]>([]);
  const [itemTypesLoaded, setItemTypesLoaded] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectPrice, setNewProjectPrice] = useState<number | null>(null);

  // 资质文件上传
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // 加载检测项目库
  useEffect(() => {
    if (drawerVisible) {
      setItemTypesLoaded(false);
      getDetectionItemTypes()
        .then((data) => {
          if (Array.isArray(data)) {
            setItemTypes(data);
          }
        })
        .catch(() => {})
        .finally(() => setItemTypesLoaded(true));
    }
  }, [drawerVisible]);

  const openCreate = () => {
    setEditing(null);
    setFormData({
      name: '',
      code: generateOrgCode(),
      contact: '',
      phone: '',
      address: '',
      location: undefined,
      longitude: undefined,
      latitude: undefined,
      qualification: '',
      qualification_files: [],
      projects: [],
      status: 1,
    });
    setFileList([]);
    setProjectSearch('');
    setMapLocation(null);
    setDrawerVisible(true);
  };

  const openEdit = (record: DetectionOrg) => {
    setEditing(record);
    // 解析已有的可检项目
    const projects = record.projects
      ? record.projects.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    // 解析已有的资质文件
    let qualificationFiles: string[] = [];
    if (record.qualification) {
      try {
        const parsed = JSON.parse(record.qualification);
        if (Array.isArray(parsed)) {
          qualificationFiles = parsed;
        }
      } catch {
        // 如果不是JSON，则当作纯文本备注
      }
    }
    // 解析已有的位置信息
    const loc = parseLocation(record.location ?? undefined);
    setFormData({
      name: record.name,
      code: record.code,
      contact: record.contact ?? '',
      phone: record.phone ?? '',
      address: record.address ?? '',
      location: record.location ?? undefined,
      longitude: loc?.lng,
      latitude: loc?.lat,
      qualification: '',
      qualification_files: qualificationFiles,
      projects,
      status: record.status,
    });
    // 同步地图选点状态
    if (loc) {
      setMapLocation({ lng: loc.lng, lat: loc.lat, address: loc.address });
    } else {
      setMapLocation(null);
    }
    // 构建文件列表用于上传组件
    setFileList(
      qualificationFiles.map((url, idx) => ({
        uid: `existing-${idx}`,
        name: `资质文件${idx + 1}`,
        status: 'done',
        url,
      }))
    );
    setProjectSearch('');
    setDrawerVisible(true);
  };

  // 更新表单字段
  const updateField = useCallback(
    <K extends keyof OrgFormData>(key: K, value: OrgFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  // 项目选择/取消
  const toggleProject = (projectName: string) => {
    setFormData((prev) => {
      const exists = prev.projects.includes(projectName);
      return {
        ...prev,
        projects: exists
          ? prev.projects.filter((p) => p !== projectName)
          : [...prev.projects, projectName],
      };
    });
  };

  // 全选项目
  const toggleSelectAll = () => {
    const allNames = filteredProjects.map((p) => p.name);
    const currentProjects = Array.isArray(formData.projects) ? formData.projects : [];
    const allSelected = allNames.length > 0 && allNames.every((n) => currentProjects.includes(n));
    if (allSelected) {
      setFormData((prev) => {
        const projects = Array.isArray(prev?.projects) ? prev.projects : [];
        return {
          ...prev,
          projects: projects.filter((p) => !allNames.includes(p)),
        };
      });
    } else {
      setFormData((prev) => {
        const projects = Array.isArray(prev?.projects) ? prev.projects : [];
        return {
          ...prev,
          projects: Array.from(new Set([...projects, ...allNames])),
        };
      });
    }
  };

  // 创建新项目到项目库
  const handleCreateProject = () => {
    if (!newProjectName.trim()) {
      message.warning('请输入项目名称');
      return;
    }
    const newItem: DetectionItemType = {
      code: `custom-${Date.now()}`,
      name: newProjectName.trim(),
    };
    setItemTypes((prev) => [...prev, newItem]);
    toggleProject(newItem.name);
    setNewProjectName('');
    setNewProjectPrice(null);
    setShowProjectModal(false);
    message.success(`已添加检测项目：${newItem.name}`);
  };

  // 过滤项目（按搜索关键字）
  const filteredProjects = (Array.isArray(itemTypes) ? itemTypes : []).filter((item) =>
    item.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  // 上传资质证书 - 使用 customRequest 替代 beforeUpload，让 Upload 组件正确管理文件状态
  const uploadProps: UploadProps = {
    multiple: true,
    accept: '.pdf,.jpg,.jpeg,.png',
    fileList,
    beforeUpload: (file: RcFile) => {
      const isValid = file.size / 1024 / 1024 < 10;
      if (!isValid) {
        message.error('文件不能超过 10MB');
      }
      return isValid;
    },
    customRequest: async (options) => {
      const { file, onSuccess, onError } = options;
      const rcFile = file as RcFile;

      try {
        const formData = new FormData();
        formData.append('file', rcFile);
        const res = await http.post<{ url: string }>('/upload', formData);
        const fileUrl = res?.url || (res as any)?.url;

        if (fileUrl) {
          onSuccess?.({ url: fileUrl }, new XMLHttpRequest());
        } else {
          message.error(`${rcFile.name} 上传失败: 无URL返回`);
          onError?.(new Error('无URL返回'));
        }
      } catch (err) {
        message.error(`${rcFile.name} 上传失败`);
        onError?.(err as Error);
      }
    },
    onChange: (info) => {
      // 从 response 中提取 URL 并更新文件列表
      const processedList = info.fileList.map((f) => {
        if (f.status === 'done') {
          const response = (f as any).response;
          if (response?.url && !f.url) {
            return { ...f, url: response.url };
          }
        }
        return f;
      });
      setFileList(processedList);

      // 同步已完成文件的 URL 到表单数据
      const doneUrls = processedList
        .filter((f) => f.status === 'done')
        .map((f) => f.url || (f as any)?.response?.url)
        .filter((u): u is string => !!u);

      setFormData((prev) => ({
        ...prev,
        qualification_files: doneUrls,
      }));
    },
    onRemove: (file: UploadFile) => {
      const url = file.url || (file as any)?.response?.url;
      if (url) {
        setFormData((prev) => {
          const files = Array.isArray(prev?.qualification_files) ? prev.qualification_files : [];
          return {
            ...prev,
            qualification_files: files.filter((u) => u !== url),
          };
        });
      }
    },
  };

  // 提交
  const handleSubmit = async () => {
    // 校验必填
    if (!formData.name.trim()) {
      message.warning('请填写机构名称');
      return;
    }
    if (!formData.contact.trim()) {
      message.warning('请填写联系人');
      return;
    }
    if (!formData.phone.trim()) {
      message.warning('请填写联系电话');
      return;
    }
    if (formData.projects.length === 0) {
      message.warning('请至少添加一个可检项目');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      code: formData.code.trim() || generateOrgCode(),
      contact: formData.contact.trim(),
      phone: formData.phone.trim(),
      address: formData.address.trim() || undefined,
      location: formData.location || undefined,
      qualification:
        formData.qualification_files.length > 0
          ? JSON.stringify(formData.qualification_files)
          : undefined,
      projects: formData.projects.join(','),
      status: formData.status,
    };

    try {
      if (editing) {
        await updateDetectionOrg(editing.id, payload);
        message.success('机构更新成功');
      } else {
        await createDetectionOrg(payload);
        message.success('机构创建成功');
      }
      setDrawerVisible(false);
      handleRefresh();
      return true;
    } catch {
      return false;
    }
  };

  // 切换状态
  const handleToggleStatus = async (record: DetectionOrg) => {
    try {
      const res = await toggleDetectionOrgStatus(record.id);
      message.success(res.status === 1 ? '已启用' : '已停用');
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 渲染项目标签
  const renderProjects = (projects: string) => {
    if (!projects) return '-';
    const items = projects.split(',').map((s) => s.trim()).filter(Boolean);
    if (!items.length) return '-';
    return (
      <Space size={[4, 4]} wrap>
        {items.map((p) => (
          <Tag key={p} color="blue" style={{ borderRadius: 4 }}>
            {p}
          </Tag>
        ))}
      </Space>
    );
  };

  const columns: ProColumns<DetectionOrg>[] = [
    { title: '序号', dataIndex: 'index', valueType: 'index', width: 60, hideInSearch: true },
    { title: '机构名称', dataIndex: 'name', width: 180, ellipsis: true },
    { title: '编码', dataIndex: 'code', width: 160, ellipsis: true, hideInSearch: true },
    { title: '联系人', dataIndex: 'contact', width: 100, hideInSearch: true, ellipsis: true },
    { title: '联系电话', dataIndex: 'phone', width: 130, hideInSearch: true, ellipsis: true },
    {
      title: '可检项目',
      dataIndex: 'projects',
      width: 260,
      hideInSearch: true,
      render: (_, record) => renderProjects(record.projects),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      valueEnum: { 1: { text: '合作中' }, 2: { text: '暂停合作' }, 0: { text: '已终止' } },
      render: (_, record) => {
        const s = STATUS_TAG_MAP[record.status] ?? STATUS_TAG_MAP[0];
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 110,
      hideInSearch: true,
      render: (_, record) =>
        record.created_at ? dayjs(record.created_at).format('YYYY-MM-DD') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space>
          {canView && (
            <Button type="link" size="small" onClick={() => openEdit(record)} icon={<EditOutlined />}>
              编辑
            </Button>
          )}
          {canView && (
            <Popconfirm
              title={record.status === 1 ? '确认停用该机构?' : '确认启用该机构?'}
              onConfirm={() => handleToggleStatus(record)}
            >
              <Button type="link" size="small" danger={record.status === 1}>
                {record.status === 1 ? '停用' : '启用'}
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <ProTable<DetectionOrg>
        headerTitle="检测机构管理"
        actionRef={actionRef}
        loading={tableLoading}
        rowKey="id"
        columns={columns}
        options={{ density: false, reload: false }}
        scroll={{ x: 1200 }}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          const { current, pageSize, status } = params;
          const keyword = (params as { name?: string }).name;
          try {
            const res = await getDetectionOrgs({
              page: current,
              pageSize,
              keyword: keyword as string | undefined,
              status: status as number | string | undefined,
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
                  新增机构
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

      {/* 新增/编辑抽屉 - 左表单右预览 */}
      <Drawer
        title={editing ? '编辑检测机构' : '新增检测机构'}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width="min(95vw, 1100px)"
        destroyOnHidden={true}
        maskClosable={false}
        extra={
          <Space>
            <Button onClick={() => setDrawerVisible(false)}>取消</Button>
            <Button type="primary" onClick={handleSubmit}>
              {editing ? '保存修改' : '确认创建'}
            </Button>
          </Space>
        }
        styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
      >
        <div
          style={{
            display: 'flex',
            height: 'calc(100vh - 120px)',
            minHeight: 600,
          }}
        >
          {/* ========== 左侧：表单区 ========== */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px 24px',
              borderRight: '1px solid #f0f0f0',
            }}
          >
            {/* ① 基础信息 */}
            <Card
              size="small"
              title={
                <Space>
                  <Tag color="blue" style={{ borderRadius: 10 }}>①</Tag>
                  <span style={{ fontWeight: 600 }}>基础信息</span>
                </Space>
              }
              style={{ marginBottom: 16, borderRadius: 8 }}
              styles={{ body: { padding: 16 } }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="机构名称"
                    required
                    style={{ marginBottom: 12 }}
                  >
                    <Input
                      placeholder="请输入机构名称"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      allowClear
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="机构编码"
                    tooltip="系统自动生成,格式:LAB-YYYY-MMDD-XXX"
                    style={{ marginBottom: 12 }}
                  >
                    <Space.Compact style={{ width: '100%' }}>
                      <Input
                        value={formData.code}
                        onChange={(e) => updateField('code', e.target.value)}
                        placeholder="系统自动生成"
                        style={{ flex: 1 }}
                      />
                      <Button
                        onClick={() => updateField('code', generateOrgCode())}
                        style={{ fontSize: 12 }}
                      >
                        重新生成
                      </Button>
                    </Space.Compact>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="联系人" required style={{ marginBottom: 12 }}>
                    <Input
                      placeholder="请输入联系人姓名"
                      value={formData.contact}
                      onChange={(e) => updateField('contact', e.target.value)}
                      allowClear
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="联系电话" required style={{ marginBottom: 12 }}>
                    <Input
                      placeholder="请输入联系电话"
                      value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      allowClear
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* ② 资质认证 */}
            <Card
              size="small"
              title={
                <Space>
                  <Tag color="purple" style={{ borderRadius: 10 }}>②</Tag>
                  <span style={{ fontWeight: 600 }}>资质认证</span>
                  <span style={{ color: '#999', fontSize: 12, fontWeight: 400 }}>
                    上传资质证明文件
                  </span>
                </Space>
              }
              style={{ marginBottom: 16, borderRadius: 8 }}
              styles={{ body: { padding: 16 } }}
            >
              <Form.Item label="资质证书" style={{ marginBottom: 12 }}>
                <Upload
                  {...uploadProps}
                  listType="text"
                  accept=".pdf,.jpg,.jpeg,.png"
                >
                  <Button icon={<UploadOutlined />}>
                    上传资质文件 (PDF/JPG/PNG, ≤10MB)
                  </Button>
                </Upload>
                {fileList.length > 0 && (
                  <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                    已上传 {fileList.length} 个文件
                  </Text>
                )}
              </Form.Item>
              <Form.Item label="资质说明" style={{ marginBottom: 4 }}>
                <Input.TextArea
                  placeholder="请输入资质说明,如:CMA认证编号XXX、省级重点实验室资质等"
                  rows={2}
                  value={formData.qualification}
                  onChange={(e) => updateField('qualification', e.target.value)}
                  showCount
                  maxLength={200}
                />
              </Form.Item>
            </Card>

            {/* ③ 位置信息 - 内联地图选点 */}
            <Card
              size="small"
              title={
                <Space>
                  <Tag color="green" style={{ borderRadius: 10 }}>③</Tag>
                  <span style={{ fontWeight: 600 }}>位置信息</span>
                  <span style={{ color: '#999', fontSize: 12, fontWeight: 400 }}>
                    在地图上点击选点，或通过地址搜索定位
                  </span>
                </Space>
              }
              style={{ marginBottom: 16, borderRadius: 8 }}
              styles={{ body: { padding: 16 } }}
            >
              {/* 地址输入 + 搜索联动 */}
              <Form.Item label="机构地址" required style={{ marginBottom: 12 }}>
                <Input
                  placeholder="请输入机构详细地址,或在下方地图上点击选点"
                  value={formData.address}
                  onChange={(e) => {
                    const newAddr = e.target.value;
                    updateField('address', newAddr);
                    // 地址手动清空时,同步清除地图选点
                    if (!newAddr && formData.longitude !== undefined) {
                      setFormData((prev) => ({
                        ...prev,
                        longitude: undefined,
                        latitude: undefined,
                        location: undefined,
                      }));
                      setMapLocation(null);
                    }
                  }}
                  allowClear
                  style={{ marginBottom: 8 }}
                />
              </Form.Item>

              {/* 内联地图选点 */}
              <div
                style={{
                  border: '1px solid #e8e8e8',
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: '#fafafa',
                }}
              >
                <LoftMapPicker
                  lng={formData.longitude ?? null}
                  lat={formData.latitude ?? null}
                  address={formData.address || undefined}
                  height={340}
                  onChange={(data) => {
                    setMapLocation(data);
                    // 实时同步到表单数据
                    const locationJson = JSON.stringify({
                      lng: Number(data.lng.toFixed(6)),
                      lat: Number(data.lat.toFixed(6)),
                      address: data.address,
                    });
                    setFormData((prev) => ({
                      ...prev,
                      location: locationJson,
                      longitude: data.lng,
                      latitude: data.lat,
                      address: data.address || prev.address,
                    }));
                  }}
                />
              </div>

              {/* 选点状态指示 */}
              {mapLocation ? (
                <div
                  style={{
                    marginTop: 12,
                    padding: '8px 12px',
                    background: '#f6ffed',
                    borderRadius: 6,
                    border: '1px solid #b7eb8f',
                    fontSize: 13,
                    color: '#389e0d',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontWeight: 500 }}>✓ 位置已选定</span>
                  <Tag color="blue" style={{ margin: 0 }}>
                    经度: {mapLocation.lng.toFixed(6)}
                  </Tag>
                  <Tag color="blue" style={{ margin: 0 }}>
                    纬度: {mapLocation.lat.toFixed(6)}
                  </Tag>
                  {mapLocation.address && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      📍 {mapLocation.address}
                    </Text>
                  )}
                  <Button
                    type="link"
                    size="small"
                    danger
                    style={{ marginLeft: 'auto' }}
                    onClick={() => {
                      setMapLocation(null);
                      setFormData((prev) => ({
                        ...prev,
                        longitude: undefined,
                        latitude: undefined,
                        location: undefined,
                      }));
                      message.info('已清除位置选点');
                    }}
                  >
                    清除选点
                  </Button>
                </div>
              ) : (
                <div
                  style={{
                    marginTop: 12,
                    padding: '8px 12px',
                    background: '#fffbe6',
                    borderRadius: 6,
                    border: '1px dashed #ffe58f',
                    fontSize: 12,
                    color: '#874d00',
                    textAlign: 'center',
                  }}
                >
                  💡 在上方地图中点击以选定机构位置,或使用地图搜索功能定位地址
                </div>
              )}
            </Card>

            {/* ④ 服务能力 - 可检项目 */}
            <Card
              size="small"
              title={
                <Space>
                  <Tag color="orange" style={{ borderRadius: 10 }}>④</Tag>
                  <span style={{ fontWeight: 600 }}>服务能力</span>
                  <span style={{ color: '#999', fontSize: 12, fontWeight: 400 }}>
                    从项目库中选择可检项目
                  </span>
                </Space>
              }
              style={{ marginBottom: 16, borderRadius: 8 }}
              styles={{ body: { padding: 16 } }}
            >
              {/* 搜索和新建 */}
              <Row gutter={8} style={{ marginBottom: 12 }}>
                <Col flex={1}>
                  <Input
                    placeholder="🔍 搜索检测项目..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    allowClear
                    prefix={<SearchOutlined />}
                  />
                </Col>
                <Col>
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => setShowProjectModal(true)}
                  >
                    新建项目
                  </Button>
                </Col>
              </Row>

              {/* 全选/已选统计 */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                  padding: '4px 8px',
                  background: '#fafafa',
                  borderRadius: 4,
                  fontSize: 12,
                }}
              >
                <Space>
                  <Checkbox
                    checked={
                      filteredProjects.length > 0 &&
                      filteredProjects.every((p) => formData.projects.includes(p.name))
                    }
                    indeterminate={
                      filteredProjects.some((p) => formData.projects.includes(p.name)) &&
                      !filteredProjects.every((p) => formData.projects.includes(p.name))
                    }
                    onChange={toggleSelectAll}
                    disabled={filteredProjects.length === 0}
                  >
                    全选
                  </Checkbox>
                  <Text type="secondary">
                    已选 {formData.projects.length} / {itemTypes.length} 个项目
                  </Text>
                </Space>
              </div>

              {/* 项目列表 */}
              {!itemTypesLoaded ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                  加载项目库中...
                </div>
              ) : itemTypes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                  暂无检测项目，请点击"新建项目"添加
                </div>
              ) : filteredProjects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                  未找到匹配的检测项目
                </div>
              ) : (
                <Row gutter={[8, 8]}>
                  {filteredProjects.map((item) => {
                    const checked = formData.projects.includes(item.name);
                    return (
                      <Col span={12} key={item.code}>
                        <div
                          onClick={() => toggleProject(item.name)}
                          style={{
                            padding: '8px 12px',
                            border: `1px solid ${checked ? '#1677ff' : '#f0f0f0'}`,
                            borderRadius: 6,
                            background: checked ? '#e6f4ff' : '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            transition: 'all 0.2s',
                          }}
                        >
                          <Checkbox checked={checked} onClick={(e) => e.stopPropagation()} />
                          <span style={{ fontSize: 13, color: '#333', flex: 1 }}>
                            {item.name}
                          </span>
                          {checked && <Tag color="blue" style={{ margin: 0 }}>已选</Tag>}
                        </div>
                      </Col>
                    );
                  })}
                </Row>
              )}

              {/* 已选项目快速移除 */}
              {formData.projects.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>
                    已选项目:
                  </Text>
                  <Space size={[4, 4]} wrap>
                    {formData.projects.map((p) => (
                      <Tag
                        key={p}
                        color="blue"
                        closable
                        onClose={() => toggleProject(p)}
                        style={{ borderRadius: 4 }}
                      >
                        {p}
                      </Tag>
                    ))}
                  </Space>
                </div>
              )}
            </Card>

            {/* ⑤ 运营状态 */}
            <Card
              size="small"
              title={
                <Space>
                  <Tag color="cyan" style={{ borderRadius: 10 }}>⑤</Tag>
                  <span style={{ fontWeight: 600 }}>运营状态</span>
                </Space>
              }
              style={{ marginBottom: 16, borderRadius: 8 }}
              styles={{ body: { padding: 16 } }}
            >
              <Form.Item label="机构状态" required style={{ marginBottom: 0 }}>
                <Segmented
                  value={formData.status}
                  onChange={(val) => updateField('status', val as number)}
                  options={[
                    { label: '🟢 合作中', value: 1 },
                    { label: '🟡 暂停合作', value: 2 },
                    { label: '🔴 已终止', value: 0 },
                  ]}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
                {formData.status === 1 && '合作中：机构正常提供检测服务,可在预约订单中选择'}
                {formData.status === 2 && '暂停合作：机构暂不可选择,但历史数据保留'}
                {formData.status === 0 && '已终止：机构不再合作,仅历史记录可查'}
              </div>
            </Card>
          </div>

          {/* ========== 右侧：实时预览面板 ========== */}
          <div
            style={{
              width: 360,
              flexShrink: 0,
              overflowY: 'auto',
              padding: '20px',
              background: '#fafafa',
              position: 'sticky',
              top: 0,
              height: '100%',
            }}
          >
            {/* 机构预览卡片 */}
            <Card
              size="small"
              title={
                <Space>
                  <span style={{ fontSize: 16 }}>🏛️</span>
                  <span style={{ fontWeight: 600 }}>机构预览</span>
                </Space>
              }
              style={{ borderRadius: 8, marginBottom: 12 }}
              styles={{ body: { padding: 16 } }}
            >
              {/* 状态徽章 */}
              <div style={{ marginBottom: 12 }}>
                {(() => {
                  const s = STATUS_TAG_MAP[formData.status] ?? STATUS_TAG_MAP[1];
                  return (
                    <Badge
                      color={
                        formData.status === 1
                          ? 'green'
                          : formData.status === 2
                            ? 'orange'
                            : 'default'
                      }
                      text={s.text}
                    />
                  );
                })()}
              </div>

              {/* 机构名称 */}
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#1677ff',
                  marginBottom: 8,
                  padding: '8px 12px',
                  background: '#e6f4ff',
                  borderRadius: 6,
                  textAlign: 'center',
                }}
              >
                {formData.name || '机构名称'}
              </div>

              {/* 机构编码 */}
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  机构编码
                </Text>
                <div style={{ fontSize: 12, color: '#555', fontFamily: 'monospace' }}>
                  {formData.code || '—'}
                </div>
              </div>

              <Divider style={{ margin: '12px 0' }} />

              {/* 基础信息 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    联系人
                  </Text>
                  <div style={{ fontSize: 13, color: '#333' }}>
                    {formData.contact || '—'}
                  </div>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    联系电话
                  </Text>
                  <div style={{ fontSize: 13, color: '#333' }}>
                    {formData.phone || '—'}
                  </div>
                </div>
              </div>

              {/* 地址 + 位置 */}
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  机构地址
                </Text>
                <div style={{ fontSize: 13, color: '#333', lineHeight: 1.4, marginBottom: 4 }}>
                  {formData.address || '—'}
                </div>
                {mapLocation && (
                  <div
                    style={{
                      fontSize: 11,
                      color: '#52c41a',
                      display: 'flex',
                      gap: 6,
                      flexWrap: 'wrap',
                      alignItems: 'center',
                    }}
                  >
                    <Tag color="green" style={{ margin: 0 }}>
                      📍 已定位
                    </Tag>
                    <span style={{ color: '#888' }}>
                      {mapLocation.lng.toFixed(4)}, {mapLocation.lat.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>

              {/* 资质文件 */}
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  资质文件
                </Text>
                {fileList.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#bbb' }}>暂无资质文件</div>
                ) : (
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    {fileList.map((f) => (
                      <div
                        key={f.uid}
                        style={{
                          fontSize: 12,
                          color: '#1677ff',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <span>📄</span>
                        <span>{f.name}</span>
                      </div>
                    ))}
                  </Space>
                )}
              </div>

              {/* 资质说明 */}
              {formData.qualification && (
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    资质说明
                  </Text>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#555',
                      background: '#f9f9f9',
                      padding: 8,
                      borderRadius: 4,
                      maxHeight: 60,
                      overflow: 'auto',
                    }}
                  >
                    {formData.qualification}
                  </div>
                </div>
              )}
            </Card>

            {/* 可检项目预览 */}
            <Card
              size="small"
              title={
                <Space>
                  <span>🧪</span>
                  <span style={{ fontWeight: 600 }}>可检项目</span>
                  <Tag color="blue">{formData.projects.length}</Tag>
                </Space>
              }
              style={{ borderRadius: 8, marginBottom: 12 }}
              styles={{ body: { padding: 12 } }}
            >
              {formData.projects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 0', color: '#bbb' }}>
                  尚未选择任何检测项目
                </div>
              ) : (
                <List
                  size="small"
                  dataSource={formData.projects}
                  renderItem={(item) => (
                    <List.Item style={{ padding: '6px 0', borderBottom: '1px dashed #f0f0f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#1677ff' }}>●</span>
                        <span style={{ fontSize: 13, color: '#333' }}>{item}</span>
                      </div>
                    </List.Item>
                  )}
                />
              )}
            </Card>

            {/* 填写提示 */}
            <div
              style={{
                padding: 12,
                background: '#fffbe6',
                borderRadius: 6,
                border: '1px solid #ffe58f',
                fontSize: 12,
                color: '#874d00',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>💡 填写提示</div>
              <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.6 }}>
                <li>机构编码由系统自动生成,可手动修改</li>
                <li>可检项目支持多选,从项目库中选择或新建</li>
                <li>资质文件支持 PDF/JPG/PNG 格式</li>
                <li>在地图上点击选点可自动填充地址和经纬度</li>
              </ul>
            </div>
          </div>
        </div>
      </Drawer>

      {/* 新建检测项目弹窗 */}
      <Modal
        title="新建检测项目"
        open={showProjectModal}
        onOk={handleCreateProject}
        onCancel={() => {
          setShowProjectModal(false);
          setNewProjectName('');
          setNewProjectPrice(null);
        }}
        okText="添加到项目库"
        cancelText="取消"
      >
        <Form.Item label="项目名称" required>
          <Input
            placeholder="请输入检测项目名称,如:DNA身份认证"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
          />
        </Form.Item>
        <Form.Item label="参考价格(元)" tooltip="用于订单费用参考">
          <InputNumber
            placeholder="选填"
            value={newProjectPrice}
            onChange={(val) => setNewProjectPrice(val as number | null)}
            min={0}
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Text type="secondary" style={{ fontSize: 12 }}>
          添加后可在"服务能力"板块勾选此项目
        </Text>
      </Modal>

    </>
  );
};

export default DetectionOrg;
