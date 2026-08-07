import {
  DrawerForm,
  ProFormText,
  ProFormTextArea,
  ProFormSelect,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { Button, Popconfirm, Space, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useAntdApp } from '../../hooks/useAntdApp';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import {
  createDetectionOrg,
  getDetectionOrgs,
  toggleDetectionOrgStatus,
  updateDetectionOrg,
  type DetectionOrg,
} from '../../services/detection';

// 机构状态选项:1 合作中 0 停用
const STATUS_OPTIONS = [
  { label: '合作中', value: 1 },
  { label: '停用', value: 0 },
];

// 检测机构管理:列表 + 新增/编辑 + 状态切换
const DetectionOrg = () => {
  const { message } = useAntdApp();
  const currentUser = useCurrentUser();
  const canView = hasPermission(currentUser, 'detection:view');
  const actionRef = useRef<ActionType>();

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editing, setEditing] = useState<DetectionOrg | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDrawerVisible(true);
  };

  const openEdit = (record: DetectionOrg) => {
    setEditing(record);
    setDrawerVisible(true);
  };

  // 提交新增/编辑
  const handleSubmit = async (values: Record<string, unknown>) => {
    const payload = {
      name: values.name as string,
      code: (values.code as string) ?? '',
      contact: (values.contact as string) ?? undefined,
      phone: (values.phone as string) ?? undefined,
      address: (values.address as string) ?? undefined,
      qualification: (values.qualification as string) ?? undefined,
      projects: (values.projects as string) ?? '',
      status: (values.status as number) ?? 1,
    };
    if (editing) {
      await updateDetectionOrg(editing.id, payload);
      message.success('更新成功');
    } else {
      await createDetectionOrg(payload);
      message.success('新增成功');
    }
    setDrawerVisible(false);
    actionRef.current?.reload();
    return true;
  };

  // 切换机构状态
  const handleToggleStatus = async (record: DetectionOrg) => {
    try {
      const res = await toggleDetectionOrgStatus(record.id);
      message.success(res.status === 1 ? '已启用' : '已停用');
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 将逗号分隔的可检项目渲染为标签
  const renderProjects = (projects: string) => {
    if (!projects) return '-';
    const items = projects.split(',').map((s) => s.trim()).filter(Boolean);
    if (!items.length) return '-';
    return (
      <Space size={[4, 4]} wrap>
        {items.map((p) => (
          <Tag key={p}>{p}</Tag>
        ))}
      </Space>
    );
  };

  const columns: ProColumns<DetectionOrg>[] = [
    { title: '机构名称', dataIndex: 'name', width: 200, ellipsis: true },
    { title: '编码', dataIndex: 'code', width: 110, ellipsis: true, hideInSearch: true },
    { title: '联系人', dataIndex: 'contact', width: 100, hideInSearch: true, ellipsis: true },
    { title: '联系电话', dataIndex: 'phone', width: 130, hideInSearch: true, ellipsis: true },
    { title: '地址', dataIndex: 'address', width: 200, ellipsis: true, hideInSearch: true },
    {
      title: '可检项目',
      dataIndex: 'projects',
      width: 220,
      hideInSearch: true,
      render: (_, record) => renderProjects(record.projects),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      valueEnum: { 1: { text: '合作中' }, 0: { text: '停用' } },
      render: (_, record) => (
        <Tag color={record.status === 1 ? 'green' : 'default'}>
          {record.status === 1 ? '合作中' : '停用'}
        </Tag>
      ),
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
            <Button type="link" size="small" onClick={() => openEdit(record)}>
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
        rowKey="id"
        columns={columns}
        options={{ density: false }}
        scroll={{ x: 1200 }}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          const { current, pageSize, status } = params;
          // ProTable 搜索字段 name 映射为后端的 keyword 参数
          const keyword = (params as { name?: string }).name;
          try {
            const res = await getDetectionOrgs({
              page: current,
              pageSize,
              keyword: keyword as string | undefined,
              status: status as number | string | undefined,
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
                  新增机构
                </Button>,
              ]
            : []
        }
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />

      {/* 新增/编辑抽屉 */}
      <DrawerForm
        title={editing ? '编辑检测机构' : '新增检测机构'}
        open={drawerVisible}
        onOpenChange={setDrawerVisible}
        onFinish={handleSubmit}
        drawerProps={{ destroyOnClose: true, maskClosable: false, width: 560 }}
        initialValues={
          editing
            ? {
                name: editing.name,
                code: editing.code,
                contact: editing.contact ?? undefined,
                phone: editing.phone ?? undefined,
                address: editing.address ?? undefined,
                qualification: editing.qualification ?? undefined,
                projects: editing.projects,
                status: editing.status,
              }
            : { status: 1 }
        }
      >
        <ProFormText
          name="name"
          label="机构名称"
          placeholder="请输入机构名称"
          rules={[{ required: true, message: '请输入机构名称' }]}
        />
        <ProFormText name="code" label="机构编码" placeholder="请输入机构编码(唯一,可选)" />
        <ProFormText name="contact" label="联系人" placeholder="请输入联系人" />
        <ProFormText name="phone" label="联系电话" placeholder="请输入联系电话" />
        <ProFormText name="address" label="机构地址" placeholder="请输入机构地址" />
        <ProFormText name="qualification" label="资质信息" placeholder="请输入资质信息(如 CMA 认证)" />
        <ProFormTextArea
          name="projects"
          label="可检项目"
          placeholder="多个项目用英文逗号分隔,如:DNA 检测,性别鉴定,疾病检测"
          fieldProps={{ autoSize: { minRows: 2, maxRows: 4 } }}
        />
        <ProFormSelect name="status" label="状态" options={STATUS_OPTIONS} />
      </DrawerForm>
    </>
  );
};

export default DetectionOrg;

