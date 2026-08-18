import {
  ModalForm,
  ProFormText,
  ProFormSelect,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { App, Button, Drawer, Space, Spin, Tag, Tree, Popconfirm } from 'antd';
import { PlusOutlined, SafetyOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useCurrentUser } from '../../app-context';
import { useTableRefresh } from '../../hooks/useTableRefresh';
import RefreshButton from '../../components/RefreshButton';
import { hasPermission } from '../../access';
import {
  assignRolePermissions,
  createRole,
  deleteRole,
  getAllPermissions,
  getRoleList,
  getRolePermissions,
  updateRole,
  type PermissionGroup,
  type RoleItem,
} from '../../services/system';

// 角色权限管理:角色列表 + 新增/编辑 + 分配权限(Tree)
const SystemRole = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canManage = hasPermission(currentUser, 'system:role:manage');
  const actionRef = useRef<ActionType>();
  const { tableLoading, handleRefresh } = useTableRefresh(actionRef, { messageApi: message });

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<RoleItem | null>(null);

  // 权限分配抽屉
  const [permDrawer, setPermDrawer] = useState<{
    visible: boolean;
    role: RoleItem | null;
    checked: number[];
    expanded: string[];
  }>({ visible: false, role: null, checked: [], expanded: [] });
  const [permGroups, setPermGroups] = useState<PermissionGroup[]>([]);
  const [permLoading, setPermLoading] = useState(false);

  // 加载权限分组(按需加载,首次打开抽屉时获取)
  useEffect(() => {
    if (!permDrawer.visible || permGroups.length) return;
    getAllPermissions().then(setPermGroups).catch(() => {});
  }, [permDrawer.visible, permGroups.length]);

  // 将权限分组转为 Tree 数据(按模块分组 -> 权限项)
  const treeData = permGroups.map((g) => ({
    key: `module:${g.module}`,
    title: `${g.module}(${g.permissions.length})`,
    children: g.permissions.map((p) => ({
      key: `perm:${p.id}`,
      title: (
        <Space size={4}>
          <span>{p.name}</span>
          <Tag style={{ marginRight: 0 }}>{p.code}</Tag>
          <Tag color={p.type === 'menu' ? 'blue' : p.type === 'button' ? 'orange' : 'purple'} style={{ marginRight: 0 }}>
            {p.type}
          </Tag>
        </Space>
      ),
      isLeaf: true,
    })),
  }));

  // 打开权限分配抽屉
  const openPermDrawer = async (role: RoleItem) => {
    setPermDrawer({ visible: true, role, checked: [], expanded: [] });
    setPermLoading(true);
    try {
      const [checked] = await Promise.all([getRolePermissions(role.id)]);
      // 展开所有模块节点
      const expandedKeys = permGroups.length
        ? permGroups.map((g) => `module:${g.module}`)
        : [];
      setPermDrawer((s) => ({ ...s, checked, expanded: expandedKeys }));
    } catch {
      // 拦截器已提示错误
    } finally {
      setPermLoading(false);
    }
  };

  // 处理 Tree 勾选(父子关联)
  const handleCheck = (checkedKeys: unknown) => {
    // antd Tree onCheck 返回数组或 { checked, halfChecked }
    const keys: Array<string | number> = Array.isArray(checkedKeys)
      ? checkedKeys
      : (checkedKeys as { checked: Array<string | number> }).checked;
    // 仅保留权限项 ID(以 perm: 开头)
    const permIds = keys
      .map((k) => String(k))
      .filter((k) => k.startsWith('perm:'))
      .map((k) => Number(k.replace('perm:', '')));
    setPermDrawer((s) => ({ ...s, checked: permIds }));
  };

  // 保存权限分配
  const handleSavePermissions = async () => {
    if (!permDrawer.role) return;
    try {
      await assignRolePermissions(permDrawer.role.id, permDrawer.checked);
      message.success('权限分配成功');
      setPermDrawer({ visible: false, role: null, checked: [], expanded: [] });
    } catch {
      // 拦截器已提示错误
    }
  };

  // 新增/编辑提交
  const handleSubmit = async (values: Record<string, unknown>) => {
    if (editing) {
      await updateRole(editing.id, {
        name: values.name as string,
        description: values.description as string,
        status: values.status as number,
      });
      message.success('更新成功');
    } else {
      await createRole({
        code: values.code as string,
        name: values.name as string,
        description: values.description as string,
        status: values.status as number,
      });
      message.success('新增成功');
    }
    setModalVisible(false);
    handleRefresh();
    return true;
  };

  // 删除角色
  const handleDelete = async (record: RoleItem) => {
    try {
      await deleteRole(record.id);
      message.success('删除成功');
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  const columns: ProColumns<RoleItem>[] = [
    { title: '序号', dataIndex: 'index', valueType: 'index', width: 60, hideInSearch: true },
    { title: 'ID', dataIndex: 'id', width: 60, hideInSearch: true },
    { title: '角色编码', dataIndex: 'code', width: 140, ellipsis: true },
    { title: '角色名称', dataIndex: 'name', width: 140, ellipsis: true },
    {
      title: '关键字',
      dataIndex: 'keyword',
      hideInTable: true,
    },
    { title: '描述', dataIndex: 'description', width: 200, ellipsis: true, hideInSearch: true },
    {
      title: '类型',
      dataIndex: 'is_super',
      width: 100,
      hideInSearch: true,
      render: (_, record) =>
        record.is_super === 1 ? <Tag color="red">超级角色</Tag> : <Tag color="blue">普通角色</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      valueType: 'select',
      valueEnum: { 1: { text: '启用' }, 0: { text: '禁用' } },
      render: (_, record) => (
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
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space>
          {canManage && (
            <Button type="link" size="small" icon={<SafetyOutlined />} onClick={() => openPermDrawer(record)}>
              分配权限
            </Button>
          )}
          {canManage && record.is_super !== 1 && (
            <Button
              type="link"
              size="small"
              onClick={() => {
                setEditing(record);
                setModalVisible(true);
              }}
            >
              编辑
            </Button>
          )}
          {canManage && record.is_super !== 1 && (
            <Popconfirm title="确认删除该角色?" onConfirm={() => handleDelete(record)}>
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
      <ProTable<RoleItem>
        headerTitle="角色列表"
        actionRef={actionRef}
        loading={tableLoading}
        rowKey="id"
        columns={columns}
        options={{ density: false, reload: false }}
        scroll={{ x: 1100 }}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          try {
            const res = await getRoleList({
              page: params.current,
              pageSize: params.pageSize,
              keyword: params.keyword as string | undefined,
            });
            return { data: res.list, success: true, total: res.total };
          } catch {
            return { data: [], success: false, total: 0 };
          }
        }}
        toolBarRender={() =>
          canManage
            ? [
                <Button
                  key="create"
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditing(null);
                    setModalVisible(true);
                  }}
                >
                  新增角色
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

      {/* 新增/编辑角色弹窗 */}
      <ModalForm
        title={editing ? '编辑角色' : '新增角色'}
        open={modalVisible}
        onOpenChange={setModalVisible}
        onFinish={handleSubmit}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        width={520}
        initialValues={
          editing
            ? { code: editing.code, name: editing.name, description: editing.description, status: editing.status }
            : { status: 1 }
        }
      >
        <ProFormText
          name="code"
          label="角色编码"
          placeholder="如 operator / auditor"
          rules={[{ required: true, message: '请输入角色编码' }]}
          disabled={!!editing}
          extra={editing ? '角色编码创建后不可修改' : '唯一标识,建议使用英文小写与下划线'}
        />
        <ProFormText
          name="name"
          label="角色名称"
          placeholder="请输入角色名称"
          rules={[{ required: true, message: '请输入角色名称' }]}
        />
        <ProFormTextArea
          name="description"
          label="描述"
          placeholder="请输入角色描述"
          fieldProps={{ rows: 2, maxLength: 200 }}
        />
        <ProFormSelect
          name="status"
          label="状态"
          options={[
            { label: '启用', value: 1 },
            { label: '禁用', value: 0 },
          ]}
        />
      </ModalForm>

      {/* 分配权限抽屉 */}
      <Drawer
        title={`分配权限 - ${permDrawer.role?.name ?? ''}`}
        open={permDrawer.visible}
        onClose={() => setPermDrawer({ visible: false, role: null, checked: [], expanded: [] })}
        width={520}
        extra={
          <Button type="primary" loading={permLoading} onClick={handleSavePermissions}>
            保存
          </Button>
        }
      >
        {permDrawer.role?.is_super === 1 && (
          <div style={{ marginBottom: 12, color: '#faad14' }}>
            超级管理员角色拥有全部权限,无需分配。
          </div>
        )}
        <Spin spinning={permLoading}>
          <Tree
            key={treeData.length}
            checkable
            defaultExpandAll
            treeData={treeData}
            checkedKeys={permDrawer.checked.map((id) => `perm:${id}`)}
            onCheck={handleCheck}
          />
        </Spin>
        {permGroups.length === 0 && !permLoading && (
          <div style={{ color: '#999', marginTop: 16 }}>暂无权限数据</div>
        )}
      </Drawer>
    </>
  );
};

export default SystemRole;
