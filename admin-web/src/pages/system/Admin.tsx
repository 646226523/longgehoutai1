import { ModalForm, ProFormText, ProFormSelect, ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { App, Button, Card, Col, Row, Popconfirm, Space, Switch, Tag, Modal, Select, Tabs, Empty, Tooltip } from 'antd';
import { PlusOutlined, KeyOutlined, TeamOutlined, SafetyOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useRef, useState, useMemo } from 'react';
import dayjs from 'dayjs';
import { useCurrentUser } from '../../app-context';
import { useTableRefresh } from '../../hooks/useTableRefresh';
import RefreshButton from '../../components/RefreshButton';
import PermissionSelector from '../../components/PermissionSelector';
import { hasPermission } from '../../access';
import {
  assignAdminRoles,
  assignAdminPermissions,
  createAdmin,
  deleteAdmin,
  getAllPermissions,
  getAdminList,
  getAdminPermissions,
  getAdminRoleOptions,
  resetAdminPassword,
  updateAdmin,
  updateAdminStatus,
  type AdminItem,
  type PermissionGroup,
  type RoleOption,
} from '../../services/system';

// ==================== 类型定义 ====================

// ==================== 工具函数 ====================

// ==================== 主组件 ====================
const SystemAdmin = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canManage = hasPermission(currentUser, 'system:admin:manage');
  const actionRef = useRef<ActionType>();
  const { tableLoading, handleRefresh } = useTableRefresh(actionRef, { messageApi: message });

  // 弹窗状态
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<AdminItem | null>(null);

  // 角色选项（下拉）
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);

  // 权限数据
  const [permGroups, setPermGroups] = useState<PermissionGroup[]>([]);
  const [permLoading, setPermLoading] = useState(false);
  const [checkedPermIds, setCheckedPermIds] = useState<Set<number>>(new Set());
  const [inheritedPermIds, setInheritedPermIds] = useState<Set<number>>(new Set());

  // 关联角色选择（弹窗内）
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);

  // 分配角色/权限弹窗
  const [assignModal, setAssignModal] = useState<{ visible: boolean; record: AdminItem | null; tab: string }>({
    visible: false,
    record: null,
    tab: 'roles',
  });
  const [assignRoleIds, setAssignRoleIds] = useState<number[]>([]);
  const [assignPermIds, setAssignPermIds] = useState<Set<number>>(new Set());

  // 重置密码弹窗
  const [pwdModal, setPwdModal] = useState<{ visible: boolean; id: number | null }>({
    visible: false,
    id: null,
  });

  // ===== 打开新增弹窗 =====
  const openCreate = () => {
    setEditing(null);
    setSelectedRoleIds([]);
    setCheckedPermIds(new Set());
    setInheritedPermIds(new Set());
    setModalVisible(true);
    loadFormData();
  };

  // ===== 打开编辑弹窗 =====
  const openEdit = (record: AdminItem) => {
    setEditing(record);
    setSelectedRoleIds(record.role_ids ?? []);
    setModalVisible(true);
    loadFormData(record);
  };

  // ===== 加载表单所需的全部数据 =====
  const loadFormData = async (record?: AdminItem) => {
    // 并行加载角色选项和权限树
    if (!roleOptions.length) {
      getAdminRoleOptions().then(setRoleOptions).catch(() => {});
    }

    if (permGroups.length === 0) {
      setPermLoading(true);
      try {
        const groups = await getAllPermissions();
        setPermGroups(groups);
      } catch {
        // 拦截器已提示
      } finally {
        setPermLoading(false);
      }
    }

    // 编辑时加载该管理员的直接权限和继承权限
    if (record) {
      try {
        const result = await getAdminPermissions(record.id);
        setCheckedPermIds(new Set(result.direct));
        setInheritedPermIds(new Set(result.inherited));
      } catch {
        // 拦截器已提示
      }
    } else {
      // 新增时：根据已选角色计算继承权限
      recalcInheritedByRoles(selectedRoleIds);
    }
  };

  // ===== 根据选中角色重新计算继承权限（从权限树中推算）=====
  const recalcInheritedByRoles = (roleIds: number[]) => {
    // 简易方案：在新增模式下不自动计算，仅编辑模式从后端拉取
    // 这里清空，让 UI 提示"保存后将根据角色自动获得权限"
    setInheritedPermIds(new Set());
    void roleIds;
  };

  // ===== 弹窗内切换角色时，重新计算继承权限 =====
  // 由于新增时后端还没这个管理员，无法查询继承权限
  // 我们改为显示所选角色的权限概览（Tag 展示）
  const selectedRoleDetails = useMemo(() => {
    return roleOptions.filter((r) => selectedRoleIds.includes(r.id));
  }, [roleOptions, selectedRoleIds]);

  // ===== 提交新增/编辑 =====
  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      if (editing) {
        // 编辑基本信息
        const payload: Record<string, unknown> = {
          nickname: values.nickname,
          phone: values.phone,
          email: values.email,
          status: values.status,
        };
        if (values.password) payload.password = values.password;
        await updateAdmin(editing.id, payload);

        // 分配角色
        await assignAdminRoles(editing.id, selectedRoleIds);

        // 分配直接权限
        const permArr = Array.from(checkedPermIds);
        await assignAdminPermissions(editing.id, permArr);

        message.success('更新成功');
      } else {
        // 新增管理员
        const result = await createAdmin({
          username: values.username as string,
          nickname: values.nickname as string,
          password: values.password as string,
          phone: values.phone as string,
          email: values.email as string,
          status: values.status as number,
          role_ids: selectedRoleIds,
        });

        // 新增后分配直接权限（如果有）
        const permArr = Array.from(checkedPermIds);
        if (permArr.length) {
          await assignAdminPermissions(result.id, permArr);
        }

        message.success('新增成功');
      }
      setModalVisible(false);
      handleRefresh();
      return true;
    } catch {
      // 拦截器已提示
      return false;
    }
  };

  // ===== 切换状态 =====
  const handleToggleStatus = async (record: AdminItem, checked: boolean) => {
    try {
      await updateAdminStatus(record.id, checked ? 1 : 0);
      message.success(checked ? '已启用' : '已禁用');
      handleRefresh();
    } catch {
      // 拦截器已提示
    }
  };

  // ===== 删除 =====
  const handleDelete = async (record: AdminItem) => {
    try {
      await deleteAdmin(record.id);
      message.success('删除成功');
      handleRefresh();
    } catch {
      // 拦截器已提示
    }
  };

  // ===== 打开分配角色/权限弹窗 =====
  const openAssignModal = async (record: AdminItem) => {
    setAssignModal({ visible: true, record, tab: 'roles' });
    setAssignRoleIds(record.role_ids ?? []);

    // 加载权限数据
    if (permGroups.length === 0) {
      setPermLoading(true);
      try {
        const groups = await getAllPermissions();
        setPermGroups(groups);
      } catch {
      } finally {
        setPermLoading(false);
      }
    }

    // 加载该管理员的权限详情
    try {
      const result = await getAdminPermissions(record.id);
      setAssignPermIds(new Set(result.direct));
      setInheritedPermIds(new Set(result.inherited));
    } catch {
    }

    if (!roleOptions.length) {
      getAdminRoleOptions().then(setRoleOptions).catch(() => {});
    }
  };

  // ===== 保存分配弹窗 =====
  const handleAssignSave = async () => {
    if (!assignModal.record) return;
    try {
      await assignAdminRoles(assignModal.record.id, assignRoleIds);
      await assignAdminPermissions(assignModal.record.id, Array.from(assignPermIds));
      message.success('权限分配成功');
      setAssignModal({ visible: false, record: null, tab: 'roles' });
      handleRefresh();
    } catch {
    }
  };

  // ===== 重置密码 =====
  const handleResetPassword = async (password: string) => {
    if (!pwdModal.id) return;
    await resetAdminPassword(pwdModal.id, password || undefined);
    message.success('密码重置成功');
    setPwdModal({ visible: false, id: null });
  };

  // ===== 表格列定义 =====
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
      width: 280,
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
              icon={<SafetyOutlined />}
              onClick={() => openAssignModal(record)}
            >
              分配权限
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

  // 已选角色的权限概览（计算这些角色关联的权限数量）
  const selectedRolesPermCount = useMemo(() => {
    if (!permGroups.length) return 0;
    // 简化：仅展示已选角色数量，实际权限数量需要后端查询
    return selectedRoleIds.length;
  }, [selectedRoleIds, permGroups]);

  // 计算最终权限 = 继承 + 直接（去重）
  const finalPermCount = useMemo(() => {
    const merged = new Set<number>();
    inheritedPermIds.forEach((id) => merged.add(id));
    checkedPermIds.forEach((id) => merged.add(id));
    return merged.size;
  }, [inheritedPermIds, checkedPermIds]);

  // ===== 渲染 JSX =====
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
            return { data: res?.list ?? [], success: true, total: res?.total ?? 0 };
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

      {/* ==================== 新增/编辑弹窗 ==================== */}
      <ModalForm
        title={editing ? '编辑管理员' : '新增管理员'}
        open={modalVisible}
        onOpenChange={setModalVisible}
        onFinish={handleSubmit}
        modalProps={{
          destroyOnHidden: true,
          maskClosable: false,
          width: 1100,
        }}
        submitter={{
          render: (props) => [
            <Button key="cancel" onClick={() => setModalVisible(false)}>
              取消
            </Button>,
            <Button key="submit" type="primary" onClick={() => props.submit()}>
              {editing ? '保存修改' : '确认创建'}
            </Button>,
          ],
        }}
      >
        <div style={{ padding: '8px 0' }}>
          <Row gutter={24}>
            {/* ===== 左栏：基本信息 ===== */}
            <Col xs={24} md={10}>
              <Card
                size="small"
                title={<span style={{ fontWeight: 600 }}>基本信息</span>}
                variant="borderless"
                styles={{ body: { padding: 16 } }}
                style={{ marginBottom: 16, background: '#fafbfc' }}
              >
                <ProFormText
                  name="username"
                  label="用户名"
                  placeholder="请输入登录用户名"
                  rules={[{ required: true, message: '请输入用户名' }]}
                  disabled={!!editing}
                  fieldProps={{ autoComplete: 'off' }}
                />
                <ProFormText
                  name="nickname"
                  label="姓名"
                  placeholder="请输入真实姓名"
                  rules={[{ required: true, message: '请输入姓名' }]}
                />
                <ProFormText.Password
                  name="password"
                  label={editing ? '新密码' : '初始密码'}
                  placeholder={editing ? '留空则不修改' : '请输入初始密码'}
                  rules={editing ? [] : [{ required: true, message: '请输入初始密码' }]}
                />
                <ProFormText name="phone" label="手机号" placeholder="选填" />
                <ProFormText name="email" label="邮箱" placeholder="选填" />
                <ProFormSelect
                  name="status"
                  label="账号状态"
                  initialValue={1}
                  options={[
                    { label: '启用', value: 1 },
                    { label: '禁用', value: 0 },
                  ]}
                />
              </Card>

              {/* 权限概览卡 */}
              <Card
                size="small"
                title={<span style={{ fontWeight: 600 }}>权限概览</span>}
                variant="borderless"
                styles={{ body: { padding: 16 } }}
                style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }}
              >
                <div style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <div>
                      <span style={{ color: '#888' }}>已选角色：</span>
                      <span style={{ fontWeight: 600, color: '#1677ff' }}>{selectedRoleDetails.length}</span> 个
                    </div>
                    {editing && (
                      <div>
                        <span style={{ color: '#888' }}>角色继承权限：</span>
                        <span style={{ fontWeight: 600 }}>{inheritedPermIds.size}</span> 项
                      </div>
                    )}
                    <div>
                      <span style={{ color: '#888' }}>直接分配权限：</span>
                      <span style={{ fontWeight: 600, color: '#fa8c16' }}>{checkedPermIds.size}</span> 项
                    </div>
                    <div style={{ borderTop: '1px dashed #d9d9d9', paddingTop: 6 }}>
                      <span style={{ color: '#888' }}>最终生效权限：</span>
                      <span style={{ fontWeight: 700, fontSize: 15, color: '#52c41a' }}>{finalPermCount}</span> 项
                    </div>
                  </Space>
                </div>
                <div style={{ fontSize: 12, color: '#999' }}>
                  <InfoCircleOutlined /> 最终权限 = 角色继承 + 直接分配（去重）
                </div>
              </Card>
            </Col>

            {/* ===== 右栏：权限分配 ===== */}
            <Col xs={24} md={14}>
              <Card
                size="small"
                title={<span style={{ fontWeight: 600 }}>权限分配</span>}
                variant="borderless"
                styles={{ body: { padding: 0 } }}
              >
                <Tabs
                  defaultActiveKey="roles"
                  onChange={(key) => {
                    if (key === 'permissions') {
                      // 切换到权限 Tab 时确保数据已加载
                      if (permGroups.length === 0 && !permLoading) {
                        setPermLoading(true);
                        getAllPermissions().then((groups) => {
                          setPermGroups(groups);
                          setPermLoading(false);
                        }).catch(() => setPermLoading(false));
                      }
                      // 编辑时刷新继承权限
                      if (editing) {
                        getAdminPermissions(editing.id).then((result) => {
                          setCheckedPermIds(new Set(result.direct));
                          setInheritedPermIds(new Set(result.inherited));
                        }).catch(() => {});
                      }
                    }
                  }}
                  items={[
                    {
                      key: 'roles',
                      label: (
                        <span>
                          <TeamOutlined style={{ marginRight: 4 }} />
                          关联角色
                          {selectedRoleDetails.length > 0 && (
                            <Tag color="blue" style={{ marginLeft: 6, marginRight: 0 }}>
                              {selectedRoleDetails.length}
                            </Tag>
                          )}
                        </span>
                      ),
                      children: (
                        <div style={{ padding: 16 }}>
                          <div style={{ marginBottom: 12, color: '#666', fontSize: 13 }}>
                            选择一个或多个角色，该管理员将自动获得角色关联的所有权限。
                            {!editing && (
                              <span style={{ color: '#fa8c16' }}>
                                （新增后根据角色自动获得对应权限）
                              </span>
                            )}
                          </div>
                          <Select
                            mode="multiple"
                            size="large"
                            style={{ width: '100%' }}
                            placeholder="请选择角色（可多选）"
                            value={selectedRoleIds}
                            onChange={setSelectedRoleIds}
                            options={(roleOptions ?? []).map((r) => ({
                              label: (
                                <Space>
                                  <span>{r.name}</span>
                                  {r.status !== 1 && <Tag color="default">已禁用</Tag>}
                                </Space>
                              ),
                              value: r.id,
                              disabled: r.status !== 1,
                            }))}
                            maxTagCount={8}
                          />

                          {/* 已选角色展示 */}
                          {selectedRoleDetails.length > 0 && (
                            <div style={{ marginTop: 16 }}>
                              <div style={{ marginBottom: 8, color: '#666', fontSize: 13 }}>
                                已选角色：
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {selectedRoleDetails.map((role) => (
                                  <Tooltip key={role.id} title={`角色编码：${role.code}`}>
                                    <Tag color="blue" style={{ padding: '4px 10px', fontSize: 13 }}>
                                      {role.name}
                                    </Tag>
                                  </Tooltip>
                                ))}
                              </div>
                              {selectedRolesPermCount > 0 && editing && (
                                <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                                  上述角色将自动继承其关联的所有权限
                                </div>
                              )}
                            </div>
                          )}

                          {roleOptions.length === 0 && !permLoading && (
                            <Empty description="暂无可用角色" style={{ padding: 20 }} />
                          )}
                        </div>
                      ),
                    },
                    {
                      key: 'permissions',
                      label: (
                        <span>
                          <SafetyOutlined style={{ marginRight: 4 }} />
                          直接权限
                          {checkedPermIds.size > 0 && (
                            <Tag color="orange" style={{ marginLeft: 6, marginRight: 0 }}>
                              {checkedPermIds.size}
                            </Tag>
                          )}
                        </span>
                      ),
                      children: (
                        <div style={{ padding: 16 }}>
                          <div style={{ marginBottom: 12, color: '#666', fontSize: 13 }}>
                            在角色继承权限的基础上，为该管理员额外分配特定权限（或覆盖角色权限）。
                            <span style={{ color: '#fa8c16' }}> 直接权限与角色权限取并集。</span>
                          </div>

                          {/* 继承权限提示 */}
                          {editing && inheritedPermIds.size > 0 && (
                            <div
                              style={{
                                marginBottom: 12,
                                padding: '8px 12px',
                                background: '#e6f4ff',
                                borderRadius: 6,
                                fontSize: 12,
                                color: '#1677ff',
                              }}
                            >
                              <InfoCircleOutlined /> 该管理员当前通过角色已继承{' '}
                              <strong>{inheritedPermIds.size}</strong> 项权限，
                              下方勾选的权限将在继承基础上<span style={{ color: '#fa8c16' }}>额外增加</span>。
                            </div>
                          )}

                          <PermissionSelector
                            groups={permGroups}
                            checkedIds={checkedPermIds}
                            onCheckedChange={setCheckedPermIds}
                            loading={permLoading}
                            maxHeight={420}
                          />
                        </div>
                      ),
                    },
                  ]}
                />
              </Card>
            </Col>
          </Row>
        </div>
      </ModalForm>

      {/* ==================== 分配角色/权限弹窗 ==================== */}
      <Modal
        title="分配角色与权限"
        open={assignModal.visible}
        onOk={handleAssignSave}
        onCancel={() => setAssignModal({ visible: false, record: null, tab: 'roles' })}
        destroyOnHidden
        width={720}
        okText="保存"
        cancelText="取消"
      >
        <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f5f5f5', borderRadius: 6 }}>
          当前账号：<strong>{assignModal.record?.username}</strong>
          <span style={{ color: '#888' }}>（{assignModal.record?.nickname}）</span>
        </div>
        <Tabs
          activeKey={assignModal.tab}
          onChange={(key) => setAssignModal((s) => ({ ...s, tab: key }))}
          items={[
            {
              key: 'roles',
              label: (
                <span>
                  <TeamOutlined style={{ marginRight: 4 }} />
                  关联角色
                </span>
              ),
              children: (
                <Select
                  mode="multiple"
                  size="large"
                  style={{ width: '100%' }}
                  placeholder="请选择角色"
                  value={assignRoleIds}
                  onChange={setAssignRoleIds}
                  options={(roleOptions ?? []).map((r) => ({
                    label: r.name,
                    value: r.id,
                    disabled: r.status !== 1,
                  }))}
                />
              ),
            },
            {
              key: 'permissions',
              label: (
                <span>
                  <SafetyOutlined style={{ marginRight: 4 }} />
                  直接权限
                </span>
              ),
              children: (
                <PermissionSelector
                  groups={permGroups}
                  checkedIds={assignPermIds}
                  onCheckedChange={setAssignPermIds}
                  loading={permLoading}
                  maxHeight={400}
                />
              ),
            },
          ]}
        />
      </Modal>

      {/* ==================== 重置密码弹窗 ==================== */}
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
        <ProFormText.Password
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
