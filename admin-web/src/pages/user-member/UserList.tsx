// 用户与会员体系 - 用户管理
// 功能:ProTable 分页列表(用户名/手机/状态/认证状态筛选)、编辑、封禁/解封、
//      实名认证审核(通过/驳回)、鸽主认证审核、详情抽屉(展示认证材料占位)
import {
  ModalForm,
  ProFormText,
  ProFormDigit,
  ProFormSelect,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { App, Button, Descriptions, Drawer, Popconfirm, Space, Switch, Tag, Input } from 'antd';
import { EyeOutlined, SafetyOutlined } from '@ant-design/icons';
import { useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import {
  auditUserLoftOwner,
  auditUserRealName,
  getMemberLevels,
  getUserDetail,
  getUserList,
  updateUser,
  updateUserStatus,
  type MemberLevelItem,
  type UserItem,
} from '../../services/user';

// 认证档位标签映射(整体)
const CERT_STATUS_MAP: Record<string, { text: string; color: string }> = {
  none: { text: '未认证', color: 'default' },
  real: { text: '实名认证', color: 'blue' },
  loft_owner: { text: '鸽主认证', color: 'gold' },
  pigeon_loft: { text: '公棚认证', color: 'purple' },
};

// 审核子状态标签映射
const AUDIT_SUB_MAP: Record<string, { text: string; color: string }> = {
  none: { text: '未提交', color: 'default' },
  pending: { text: '待审核', color: 'orange' },
  approved: { text: '已通过', color: 'green' },
  rejected: { text: '已驳回', color: 'red' },
};

// 身份证号脱敏(保留前 6 后 4)
function maskIdCard(idCard: string | null): string {
  if (!idCard) return '-';
  if (idCard.length <= 10) return idCard;
  return `${idCard.slice(0, 6)}********${idCard.slice(-4)}`;
}

const UserList = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canEdit = hasPermission(currentUser, 'user:edit');
  const actionRef = useRef<ActionType>();

  // 编辑弹窗
  const [editModal, setEditModal] = useState<{ visible: boolean; record: UserItem | null }>({
    visible: false,
    record: null,
  });
  // 详情抽屉
  const [detailDrawer, setDetailDrawer] = useState<{ visible: boolean; record: UserItem | null }>({
    visible: false,
    record: null,
  });
  // 审核弹窗(实名 / 鸽主)
  const [auditModal, setAuditModal] = useState<{
    visible: boolean;
    userId: number | null;
    type: 'real' | 'loft_owner';
    action: 'approved' | 'rejected';
  }>({ visible: false, userId: null, type: 'real', action: 'approved' });
  const [auditRemark, setAuditRemark] = useState<string>('');

  // 会员等级下拉选项(编辑时使用)
  const [levelOptions, setLevelOptions] = useState<MemberLevelItem[]>([]);

  // 加载会员等级选项(按需加载,不阻塞)
  const ensureLevelOptions = () => {
    if (levelOptions.length) return;
    getMemberLevels()
      .then((res) => setLevelOptions(res.list))
      .catch(() => {
        // 拦截器已提示错误
      });
  };

  // 打开编辑弹窗
  const openEdit = (record: UserItem) => {
    ensureLevelOptions();
    setEditModal({ visible: true, record });
  };

  // 提交编辑
  const handleEdit = async (values: Record<string, unknown>) => {
    if (!editModal.record) return true;
    await updateUser(editModal.record.id, {
      nickname: values.nickname as string,
      phone: values.phone as string,
      real_name: values.real_name as string,
      id_card: values.id_card as string,
      growth_value: values.growth_value as number,
      member_level_id: (values.member_level_id as number | undefined) ?? null,
    });
    message.success('更新成功');
    setEditModal({ visible: false, record: null });
    actionRef.current?.reload();
    return true;
  };

  // 切换封禁/解封
  const handleToggleStatus = async (record: UserItem, next: number) => {
    try {
      await updateUserStatus(record.id, next);
      message.success(next === 1 ? '已解封' : '已封禁');
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 打开审核弹窗
  const openAudit = (
    record: UserItem,
    type: 'real' | 'loft_owner',
    action: 'approved' | 'rejected'
  ) => {
    setAuditModal({ visible: true, userId: record.id, type, action });
    setAuditRemark('');
  };

  // 提交审核
  const handleAudit = async () => {
    if (!auditModal.userId) return;
    try {
      if (auditModal.type === 'real') {
        await auditUserRealName(auditModal.userId, auditModal.action, auditRemark);
      } else {
        await auditUserLoftOwner(auditModal.userId, auditModal.action, auditRemark);
      }
      message.success(auditModal.action === 'approved' ? '审核已通过' : '审核已驳回');
      // 同步刷新详情与列表
      if (detailDrawer.record && detailDrawer.record.id === auditModal.userId) {
        const fresh = await getUserDetail(auditModal.userId);
        setDetailDrawer({ visible: true, record: fresh });
      }
      setAuditModal({ visible: false, userId: null, type: 'real', action: 'approved' });
      setAuditRemark('');
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 打开详情抽屉
  const openDetail = async (record: UserItem) => {
    try {
      const fresh = await getUserDetail(record.id);
      setDetailDrawer({ visible: true, record: fresh });
    } catch {
      setDetailDrawer({ visible: true, record });
    }
  };

  const columns: ProColumns<UserItem>[] = [
    { title: 'ID', dataIndex: 'id', width: 60, hideInSearch: true },
    {
      title: '用户名/手机',
      dataIndex: 'username',
      width: 140,
      ellipsis: true,
      fieldProps: { placeholder: '用户名/昵称/手机号' },
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <span>{record.username}</span>
          <span style={{ color: '#888', fontSize: 12 }}>{record.nickname || '-'}</span>
        </Space>
      ),
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 120,
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => record.phone || '-',
    },
    {
      title: '实名姓名',
      dataIndex: 'real_name',
      width: 100,
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => record.real_name || '-',
    },
    {
      title: '会员等级',
      dataIndex: 'member_level_id',
      width: 110,
      hideInSearch: true,
      render: (_, record) =>
        record.level_name ? (
          <Tag color={record.level_code === 'diamond' ? 'purple' : record.level_code === 'gold' ? 'gold' : record.level_code === 'silver' ? 'blue' : 'default'}>
            {record.level_name}
          </Tag>
        ) : (
          <Tag>无等级</Tag>
        ),
    },
    {
      title: '成长值',
      dataIndex: 'growth_value',
      width: 90,
      hideInSearch: true,
    },
    {
      title: '认证状态',
      dataIndex: 'cert_status',
      width: 110,
      valueType: 'select',
      valueEnum: {
        none: { text: '未认证' },
        real: { text: '实名认证' },
        loft_owner: { text: '鸽主认证' },
        pigeon_loft: { text: '公棚认证' },
      },
      render: (_, record) => {
        const cfg = CERT_STATUS_MAP[record.cert_status] || CERT_STATUS_MAP.none;
        return <Tag color={cfg.color}>{cfg.text}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      valueType: 'select',
      valueEnum: { 1: { text: '正常' }, 0: { text: '封禁' } },
      render: (_, record) =>
        canEdit ? (
          <Popconfirm
            title={record.status === 1 ? '确认封禁该用户?' : '确认解封该用户?'}
            onConfirm={() => handleToggleStatus(record, record.status === 1 ? 0 : 1)}
          >
            <Switch
              checked={record.status === 1}
              checkedChildren="正常"
              unCheckedChildren="封禁"
            />
          </Popconfirm>
        ) : (
          <Tag color={record.status === 1 ? 'green' : 'red'}>
            {record.status === 1 ? '正常' : '封禁'}
          </Tag>
        ),
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      width: 160,
      hideInSearch: true,
      render: (_, record) =>
        record.created_at ? dayjs(record.created_at).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>
            详情
          </Button>
          {canEdit && (
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          )}
          {canEdit && record.real_name_status === 'pending' && (
            <Button
              type="link"
              size="small"
              icon={<SafetyOutlined />}
              onClick={() => openAudit(record, 'real', 'approved')}
            >
              实名审核
            </Button>
          )}
          {canEdit && record.loft_owner_status === 'pending' && (
            <Button
              type="link"
              size="small"
              icon={<SafetyOutlined />}
              onClick={() => openAudit(record, 'loft_owner', 'approved')}
            >
              鸽主审核
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <ProTable<UserItem>
        headerTitle="用户列表"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        options={{ density: false }}
        scroll={{ x: 1300 }}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          const { current, pageSize, username, status, cert_status } = params;
          try {
            const res = await getUserList({
              page: current,
              pageSize,
              keyword: username as string | undefined,
              status: status as number | string | undefined,
              cert_status: cert_status as string | undefined,
            });
            return { data: res.list, success: true, total: res.total };
          } catch {
            return { data: [], success: false, total: 0 };
          }
        }}
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />

      {/* 编辑/新增弹窗 */}
      <ModalForm
        title={editModal.record ? '编辑用户' : '新增用户'}
        open={editModal.visible}
        onOpenChange={(v) => setEditModal({ visible: v, record: v ? editModal.record : null })}
        onFinish={handleEdit}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        width={560}
        initialValues={
          editModal.record
            ? {
                username: editModal.record.username,
                nickname: editModal.record.nickname,
                phone: editModal.record.phone,
                real_name: editModal.record.real_name,
                id_card: editModal.record.id_card,
                growth_value: editModal.record.growth_value,
                member_level_id: editModal.record.member_level_id ?? undefined,
              }
            : { growth_value: 0 }
        }
      >
        <ProFormText
          name="username"
          label="用户名/手机号"
          placeholder="请输入用户名(手机号)"
          rules={[{ required: true, message: '请输入用户名' }]}
          disabled={!!editModal.record}
          extra={editModal.record ? '用户名为唯一登录账号,创建后不可修改' : undefined}
        />
        <ProFormText name="nickname" label="昵称" placeholder="请输入昵称" />
        <ProFormText name="phone" label="手机号" placeholder="请输入手机号" />
        <ProFormText name="real_name" label="实名姓名" placeholder="实名认证姓名" />
        <ProFormText name="id_card" label="身份证号" placeholder="身份证号" />
        <ProFormDigit
          name="growth_value"
          label="成长值"
          min={0}
          fieldProps={{ precision: 0 }}
          placeholder="请输入成长值"
        />
        <ProFormSelect
          name="member_level_id"
          label="会员等级"
          placeholder="请选择会员等级"
          allowClear
          options={levelOptions.map((l) => ({
            label: `${l.name}(${l.code})`,
            value: l.id,
            disabled: l.status !== 1,
          }))}
        />
      </ModalForm>

      {/* 详情抽屉 */}
      <Drawer
        title="用户详情"
        width={640}
        open={detailDrawer.visible}
        onClose={() => setDetailDrawer({ visible: false, record: null })}
        destroyOnClose
      >
        {detailDrawer.record && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="ID">{detailDrawer.record.id}</Descriptions.Item>
              <Descriptions.Item label="用户名">
                {detailDrawer.record.username}
              </Descriptions.Item>
              <Descriptions.Item label="昵称">
                {detailDrawer.record.nickname || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="手机号">
                {detailDrawer.record.phone || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="实名姓名">
                {detailDrawer.record.real_name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="身份证号">
                {maskIdCard(detailDrawer.record.id_card)}
              </Descriptions.Item>
              <Descriptions.Item label="会员等级">
                {detailDrawer.record.level_name || '无等级'}
              </Descriptions.Item>
              <Descriptions.Item label="成长值">
                {detailDrawer.record.growth_value}
              </Descriptions.Item>
              <Descriptions.Item label="账号状态">
                <Tag color={detailDrawer.record.status === 1 ? 'green' : 'red'}>
                  {detailDrawer.record.status === 1 ? '正常' : '封禁'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="整体认证档位">
                {(() => {
                  const cfg =
                    CERT_STATUS_MAP[detailDrawer.record.cert_status] || CERT_STATUS_MAP.none;
                  return <Tag color={cfg.color}>{cfg.text}</Tag>;
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="注册时间">
                {dayjs(detailDrawer.record.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {dayjs(detailDrawer.record.updated_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>

            {/* 认证审核状态 */}
            <Descriptions column={1} size="small" bordered title="认证审核">
              <Descriptions.Item label="实名认证">
                <Space>
                  {(() => {
                    const cfg =
                      AUDIT_SUB_MAP[detailDrawer.record.real_name_status] || AUDIT_SUB_MAP.none;
                    return <Tag color={cfg.color}>{cfg.text}</Tag>;
                  })()}
                  {canEdit && detailDrawer.record.real_name_status === 'pending' && (
                    <>
                      <Button
                        type="link"
                        size="small"
                        onClick={() =>
                          openAudit(detailDrawer.record!, 'real', 'approved')
                        }
                      >
                        通过
                      </Button>
                      <Button
                        type="link"
                        size="small"
                        danger
                        onClick={() =>
                          openAudit(detailDrawer.record!, 'real', 'rejected')
                        }
                      >
                        驳回
                      </Button>
                    </>
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="鸽主认证">
                <Space>
                  {(() => {
                    const cfg =
                      AUDIT_SUB_MAP[detailDrawer.record.loft_owner_status] ||
                      AUDIT_SUB_MAP.none;
                    return <Tag color={cfg.color}>{cfg.text}</Tag>;
                  })()}
                  {canEdit && detailDrawer.record.loft_owner_status === 'pending' && (
                    <>
                      <Button
                        type="link"
                        size="small"
                        onClick={() =>
                          openAudit(detailDrawer.record!, 'loft_owner', 'approved')
                        }
                      >
                        通过
                      </Button>
                      <Button
                        type="link"
                        size="small"
                        danger
                        onClick={() =>
                          openAudit(detailDrawer.record!, 'loft_owner', 'rejected')
                        }
                      >
                        驳回
                      </Button>
                    </>
                  )}
                </Space>
              </Descriptions.Item>
              {detailDrawer.record.audit_remark && (
                <Descriptions.Item label="审核备注">
                  {detailDrawer.record.audit_remark}
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* 认证材料占位(后续对接 OSS 上传) */}
            <Descriptions column={1} size="small" bordered title="认证材料">
              <Descriptions.Item label="身份证人像面">
                <span style={{ color: '#999' }}>(占位)待对接文件上传服务</span>
              </Descriptions.Item>
              <Descriptions.Item label="身份证国徽面">
                <span style={{ color: '#999' }}>(占位)待对接文件上传服务</span>
              </Descriptions.Item>
              <Descriptions.Item label="鸽主资质证明">
                <span style={{ color: '#999' }}>(占位)待对接文件上传服务</span>
              </Descriptions.Item>
            </Descriptions>
          </Space>
        )}
      </Drawer>

      {/* 审核弹窗(通过/驳回 + 备注) */}
      <ModalForm
        title={`${auditModal.action === 'approved' ? '通过' : '驳回'}${
          auditModal.type === 'real' ? '实名认证' : '鸽主认证'
        }`}
        open={auditModal.visible}
        onOpenChange={(v) =>
          setAuditModal(
            v
              ? auditModal
              : { visible: false, userId: null, type: 'real', action: 'approved' }
          )
        }
        onFinish={async () => {
          await handleAudit();
          return true;
        }}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        width={480}
      >
        <div style={{ marginBottom: 8, color: '#888' }}>
          {auditModal.action === 'approved'
            ? '确认通过该用户的认证申请?'
            : '确认驳回该用户的认证申请,请填写驳回理由。'}
        </div>
        <Input.TextArea
          rows={3}
          placeholder="审核备注(驳回理由)"
          value={auditRemark}
          onChange={(e) => setAuditRemark(e.target.value)}
        />
      </ModalForm>
    </>
  );
};

export default UserList;
