import { ModalForm, ProFormText, ProFormSelect, ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { App, Button, Popconfirm, Space, Switch, Tag, Modal, Select } from 'antd';
import { PlusOutlined, KeyOutlined, TeamOutlined } from '@ant-design/icons';
import { useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useCurrentUser } from '../../app-context';
import { useTableRefresh } from '../../hooks/useTableRefresh';
import RefreshButton from '../../components/RefreshButton';
import { hasPermission } from '../../access';
import {
  assignAdminRoles,
  createAdmin,
  deleteAdmin,
  getAdminList,
  getAdminRoleOptions,
  resetAdminPassword,
  updateAdmin,
  updateAdminStatus,
  type AdminItem,
  type RoleOption,
} from '../../services/system';

// 管理员管理:账号 CRUD、状态、重置密码、分配角色
const SystemAdmin = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canManage = hasPermission(currentUser, 'system:admin:manage');
  const actionRef = useRef<ActionType>();
  const { tableLoading, handleRefresh } = useTableRefresh(actionRef, { messageApi: message });

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<AdminItem | null>(null);
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);

  // 分配角色弹窗
  const [roleModal, setRoleModal] = useState<{ visible: boolean; record: AdminItem | null; selected: number[] }>({
    visible: false,
    record: null,
    selected: [],
  });

  // 重置密码弹窗
  const [pwdModal, setPwdModal] = useState<{ visible: boolean; id: number | null }>({
    visible: false,
    id: null,
  });

  // 打开新增弹窗(角色选项后台加载,不阻塞弹窗)
  const openCreate = () => {
    setEditing(null);
    setModalVisible(true);
    if (!roleOptions.length) {
      getAdminRoleOptions()
        .then(setRoleOptions)
        .catch(() => {
          // 拦截器已提示错误
        });
    }
  };

  // 打开编辑弹窗
  const openEdit = (record: AdminItem) => {
    setEditing(record);
    setModalVisible(true);
    if (!roleOptions.length) {
      getAdminRoleOptions()
        .then(setRoleOptions)
        .catch(() => {
          // 拦截器已提示错误
        });
    }
  };

  // 提交新增/编辑
  const handleSubmit = async (values: Record<string, unknown>) => {
    if (editing) {
      const payload: Record<string, unknown> = {
        nickname: values.nickname,
        phone: values.phone,
        email: values.email,
        status: values.status,
      };
      if (values.password) payload.password = values.password;
      await updateAdmin(editing.id, payload);
      await assignAdminRoles(editing.id, (values.role_ids as number[]) ?? []);
      message.success('更新成功');
    } else {
      await createAdmin({
        username: values.username as string,
        nickname: values.nickname as string,
        password: values.password as string,
        phone: values.phone as string,
        email: values.email as string,
        status: values.status as number,
        role_ids: (values.role_ids as number[]) ?? [],
      });
      message.success('新增成功');
    }
    setModalVisible(false);
    handleRefresh();
    return true;
  };

  // 切换状态
  const handleToggleStatus = async (record: AdminItem, checked: boolean) => {
    try {
      await updateAdminStatus(record.id, checked ? 1 : 0);
      message.success(checked ? '已启用' : '已禁用');
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 删除
  const handleDelete = async (record: AdminItem) => {
    try {
      await deleteAdmin(record.id);
      message.success('删除成功');
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 分配角色保存
  const handleAssignRoles = async () => {
    if (!roleModal.record) return;
    try {
      await assignAdminRoles(roleModal.record.id, roleModal.selected);
      message.success('角色分配成功');
      setRoleModal({ visible: false, record: null, selected: [] });
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 重置密码(错误抛出由 ModalForm 捕获,保持弹窗打开)
  const handleResetPassword = async (password: string) => {
    if (!pwdModal.id) return;
    await resetAdminPassword(pwdModal.id, password || undefined);
    message.success('密码重置成功');
    setPwdModal({ visible: false, id: null });
  };

  const columns: ProColumns<AdminItem>[] = [
    { title: '序号', dataIndex: 'index', valueType: 'index', width: 60, hideInSearch: true },
    { title: '用户名', dataIndex: 'username', width: 120, ellipsis: true },
    { title: '姓名', dataIndex: 'nickname', width: 100, ellipsis: true },
    {
      title: '角色',
      dataIndex: 'role_names',
      width: 180,
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) =>
        (record.role_names ?? []).length
          ? (record.role_names ?? []).map((n, i) => (
              <Tag color="blue" key={i} style={{ marginBottom: 4 }}>
                {n}
              </Tag>
            ))
          : <Tag>未分配</Tag>,
    },
    { title: '手机', dataIndex: 'phone', width: 130, ellipsis: true, hideInSearch: true },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      valueType: 'select',
      valueEnum: { 1: { text: '启用' }, 0: { text: '禁用' } },
      render: (_, record) =>
        canManage ? (
          <Popconfirm
            title={record.status === 1 ? '确认禁用该账号?' : '确认启用该账号?'}
            onConfirm={() => handleToggleStatus(record, record.status !== 1)}
          >
            <Switch checked={record.status === 1} checkedChildren="启用" unCheckedChildren="禁用" />
          </Popconfirm>
        ) : (
          <Tag color={record.status === 1 ? 'green' : 'default'}>{record.status === 1 ? '启用' : '禁用'}</Tag>
        ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 160,
      hideInSearch: true,
      render: (_, record) => (record.created_at ? dayjs(record.created_at).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: '最后登录',
      dataIndex: 'last_login_at',
      width: 160,
      hideInSearch: true,
      render: (_, record) => (record.last_login_at ? dayjs(record.last_login_at).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space>
          {canManage && (
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          )}
          {canManage && (
            <Button
              type="link"
              size="small"
              icon={<TeamOutlined />}
              onClick={() => setRoleModal({ visible: true, record, selected: record.role_ids })}
            >
              分配角色
            </Button>
          )}
          {canManage && (
            <Button
              type="link"
              size="small"
              icon={<KeyOutlined />}
              onClick={() => setPwdModal({ visible: true, id: record.id })}
            >
              重置密码
            </Button>
          )}
          {canManage && (
            <Popconfirm title="确认删除该管理员?" onConfirm={() => handleDelete(record)}>
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
      <ProTable<AdminItem>
        headerTitle="管理员列表"
        actionRef={actionRef}
        loading={tableLoading}
        rowKey="id"
        columns={columns}
        options={{ density: false, reload: false }}
        scroll={{ x: 1200 }}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          const { current, pageSize, username, status } = params;
          try {
            const res = await getAdminList({
              page: current,
              pageSize,
              username: username as string | undefined,
              status: status as number | string | undefined,
            });
            return { data: res.list, success: true, total: res.total };
          } catch {
            return { data: [], success: false, total: 0 };
          }
        }}
        toolBarRender={() =>
          canManage
            ? [
                <Button key="create" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                  新增管理员
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

      {/* 新增/编辑弹窗 */}
      <ModalForm
        title={editing ? '编辑管理员' : '新增管理员'}
        open={modalVisible}
        onOpenChange={setModalVisible}
        onFinish={handleSubmit}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        initialValues={
          editing
            ? {
                username: editing.username,
                nickname: editing.nickname,
                phone: editing.phone,
                email: editing.email,
                status: editing.status,
                role_ids: editing.role_ids,
              }
            : { status: 1, role_ids: [] }
        }
      >
        <ProFormText
          name="username"
          label="用户名"
          placeholder="请输入用户名"
          rules={[{ required: true, message: '请输入用户名' }]}
          disabled={!!editing}
        />
        <ProFormText
          name="nickname"
          label="姓名"
          placeholder="请输入姓名"
          rules={[{ required: true, message: '请输入姓名' }]}
        />
        <ProFormText
          name="password"
          label={editing ? '新密码(留空则不修改)' : '密码'}
          placeholder={editing ? '留空则不修改密码' : '请输入密码'}
          rules={editing ? [] : [{ required: true, message: '请输入密码' }]}
        />
        <ProFormText name="phone" label="手机号" placeholder="请输入手机号" />
        <ProFormText name="email" label="邮箱" placeholder="请输入邮箱" />
        <ProFormSelect
          name="status"
          label="状态"
          options={[
            { label: '启用', value: 1 },
            { label: '禁用', value: 0 },
          ]}
        />
        <ProFormSelect
          name="role_ids"
          label="关联角色"
          mode="multiple"
          placeholder="请选择角色(可多选)"
          options={(roleOptions ?? []).map((r) => ({ label: r.name, value: r.id, disabled: r.status !== 1 }))}
        />
      </ModalForm>

      {/* 分配角色弹窗 */}
      <Modal
        title="分配角色"
        open={roleModal.visible}
        onOk={handleAssignRoles}
        onCancel={() => setRoleModal({ visible: false, record: null, selected: [] })}
        destroyOnHidden
      >
        <div style={{ marginBottom: 8, color: '#888' }}>
          当前账号:{roleModal.record?.username}({roleModal.record?.nickname})
        </div>
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="请选择角色"
          value={roleModal.selected}
          onChange={(val) => setRoleModal((s) => ({ ...s, selected: val as number[] }))}
          options={(roleOptions ?? []).map((r) => ({ label: r.name, value: r.id, disabled: r.status !== 1 }))}
        />
      </Modal>

      {/* 重置密码弹窗 */}
      <ModalForm
        title="重置密码"
        open={pwdModal.visible}
        onOpenChange={(v) => setPwdModal({ visible: v, id: v ? pwdModal.id : null })}
        onFinish={async (values) => {
          await handleResetPassword(values.password as string);
          return true;
        }}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        width={420}
      >
        <ProFormText
          name="password"
          label="新密码"
          placeholder="留空则重置为默认密码 admin123"
          extra="不填写将重置为系统默认密码"
        />
      </ModalForm>
    </>
  );
};

export default SystemAdmin;
