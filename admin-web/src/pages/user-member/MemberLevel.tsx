// 用户与会员体系 - 会员等级与权益配置
// 功能:等级 ProTable(新增/编辑/删除/调整排序)、每行可进入权益配置(抽屉内 ProTable)、
//      成长值重算按钮(按各等级 min_growth 重新匹配所有用户 member_level_id)
import {
  ModalForm,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  App,
  Button,
  Drawer,
  Popconfirm,
  Space,
  Switch,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  GiftOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import RefreshButton from '../../components/RefreshButton';
import { useTableRefresh } from '../../hooks/useTableRefresh';
import {
  createMemberBenefit,
  createMemberLevel,
  deleteMemberBenefit,
  deleteMemberLevel,
  getMemberBenefits,
  getMemberLevels,
  recomputeUserLevels,
  updateMemberBenefit,
  updateMemberLevel,
  updateMemberLevelSort,
  type MemberBenefitItem,
  type MemberLevelItem,
} from '../../services/user';

// 权益类型标签映射
const BENEFIT_TYPE_MAP: Record<string, { text: string; color: string }> = {
  discount: { text: '折扣', color: 'orange' },
  count: { text: '次数', color: 'blue' },
  privilege: { text: '特权', color: 'gold' },
};

// 等级图标映射(展示用)
const LEVEL_ICON_MAP: Record<string, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  diamond: '💎',
};

const MemberLevel = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canEdit = hasPermission(currentUser, 'member:edit');
  const actionRef = useRef<ActionType>();
  const { tableLoading, handleRefresh } = useTableRefresh(actionRef, { messageApi: message });

  // 等级新增/编辑弹窗
  const [levelModal, setLevelModal] = useState<{
    visible: boolean;
    record: MemberLevelItem | null;
  }>({ visible: false, record: null });

  // 权益配置抽屉
  const [benefitDrawer, setBenefitDrawer] = useState<{
    visible: boolean;
    level: MemberLevelItem | null;
  }>({ visible: false, level: null });
  const benefitActionRef = useRef<ActionType>();

  // 权益新增/编辑弹窗
  const [benefitModal, setBenefitModal] = useState<{
    visible: boolean;
    record: MemberBenefitItem | null;
  }>({ visible: false, record: null });

  // 等级提交
  const handleLevelSubmit = async (values: Record<string, unknown>) => {
    const payload = {
      code: values.code as string,
      name: values.name as string,
      min_growth: (values.min_growth as number) ?? 0,
      sort: (values.sort as number) ?? 0,
      icon: values.icon as string,
      benefits: values.benefits as string,
      status: (values.status as number) ?? 1,
    };
    if (levelModal.record) {
      await updateMemberLevel(levelModal.record.id, {
        name: payload.name,
        min_growth: payload.min_growth,
        sort: payload.sort,
        icon: payload.icon,
        benefits: payload.benefits,
        status: payload.status,
      });
      message.success('更新成功');
    } else {
      await createMemberLevel(payload);
      message.success('新增成功');
    }
    setLevelModal({ visible: false, record: null });
    handleRefresh();
    return true;
  };

  // 调整排序(上移/下移)
  const handleSort = async (record: MemberLevelItem, delta: number) => {
    try {
      await updateMemberLevelSort(record.id, record.sort + delta);
      message.success('排序已更新');
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 删除等级
  const handleDeleteLevel = async (record: MemberLevelItem) => {
    try {
      await deleteMemberLevel(record.id);
      message.success('删除成功');
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 成长值重算
  const handleRecompute = async () => {
    try {
      const res = await recomputeUserLevels();
      message.success(`已重算 ${res.affected} 个用户的会员等级`);
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 权益提交
  const handleBenefitSubmit = async (values: Record<string, unknown>) => {
    if (!benefitDrawer.level) return true;
    const payload = {
      name: values.name as string,
      type: (values.type as string) ?? 'privilege',
      value: values.value as string,
      description: values.description as string,
      status: (values.status as number) ?? 1,
    };
    if (benefitModal.record) {
      await updateMemberBenefit(benefitModal.record.id, payload);
      message.success('权益已更新');
    } else {
      await createMemberBenefit(benefitDrawer.level.id, payload);
      message.success('权益已添加');
    }
    setBenefitModal({ visible: false, record: null });
    benefitActionRef.current?.reload();
    // 同步刷新等级表(权益数量变化)
    handleRefresh();
    return true;
  };

  // 删除权益
  const handleDeleteBenefit = async (record: MemberBenefitItem) => {
    try {
      await deleteMemberBenefit(record.id);
      message.success('权益已删除');
      benefitActionRef.current?.reload();
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 切换权益启用状态
  const handleToggleBenefitStatus = async (record: MemberBenefitItem, next: number) => {
    try {
      await updateMemberBenefit(record.id, {
        name: record.name,
        type: record.type,
        value: record.value ?? undefined,
        description: record.description ?? undefined,
        status: next,
      });
      message.success(next === 1 ? '已启用' : '已禁用');
      benefitActionRef.current?.reload();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 等级表列定义
  const levelColumns: ProColumns<MemberLevelItem>[] = [
    {
      title: '排序',
      dataIndex: 'sort',
      width: 80,
      hideInSearch: true,
      render: (_, record) => (
        <Space size={2}>
          <span>{record.sort}</span>
          {canEdit && (
            <>
              <Button
                type="text"
                size="small"
                icon={<ArrowUpOutlined />}
                onClick={() => handleSort(record, -1)}
              />
              <Button
                type="text"
                size="small"
                icon={<ArrowDownOutlined />}
                onClick={() => handleSort(record, 1)}
              />
            </>
          )}
        </Space>
      ),
    },
    {
      title: '图标',
      dataIndex: 'icon',
      width: 70,
      hideInSearch: true,
      render: (_, record) => (
        <span style={{ fontSize: 20 }}>
          {record.icon || LEVEL_ICON_MAP[record.code] || '⭐'}
        </span>
      ),
    },
    { title: '编码', dataIndex: 'code', width: 100, ellipsis: true, hideInSearch: true },
    { title: '等级名称', dataIndex: 'name', width: 120, ellipsis: true },
    {
      title: '最低成长值',
      dataIndex: 'min_growth',
      width: 110,
      hideInSearch: true,
    },
    {
      title: '权益数量',
      dataIndex: 'benefit_count',
      width: 90,
      hideInSearch: true,
      render: (_, record) => <Tag color="blue">{record.benefit_count}</Tag>,
    },
    {
      title: '关联用户',
      dataIndex: 'user_count',
      width: 90,
      hideInSearch: true,
      render: (_, record) => <Tag>{record.user_count}</Tag>,
    },
    {
      title: '权益概要',
      dataIndex: 'benefits',
      width: 220,
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => record.benefits || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      valueType: 'select',
      valueEnum: { 1: { text: '启用' }, 0: { text: '禁用' } },
      render: (_, record) => (
        <Tag color={record.status === 1 ? 'green' : 'default'}>
          {record.status === 1 ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 160,
      hideInSearch: true,
      render: (_, record) => dayjs(record.created_at).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<GiftOutlined />}
            onClick={() => setBenefitDrawer({ visible: true, level: record })}
          >
            权益配置
          </Button>
          {canEdit && (
            <Button
              type="link"
              size="small"
              onClick={() => setLevelModal({ visible: true, record })}
            >
              编辑
            </Button>
          )}
          {canEdit && (
            <Popconfirm
              title="确认删除该等级?关联用户的等级将被置空。"
              onConfirm={() => handleDeleteLevel(record)}
            >
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // 权益表列定义
  const benefitColumns: ProColumns<MemberBenefitItem>[] = [
    { title: '权益名称', dataIndex: 'name', width: 160, ellipsis: true },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      valueEnum: {
        discount: { text: '折扣' },
        count: { text: '次数' },
        privilege: { text: '特权' },
      },
      render: (_, record) => {
        const cfg = BENEFIT_TYPE_MAP[record.type] || BENEFIT_TYPE_MAP.privilege;
        return <Tag color={cfg.color}>{cfg.text}</Tag>;
      },
    },
    {
      title: '权益值',
      dataIndex: 'value',
      width: 120,
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => record.value || '-',
    },
    {
      title: '描述',
      dataIndex: 'description',
      width: 200,
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => record.description || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      hideInSearch: true,
      render: (_, record) =>
        canEdit ? (
          <Popconfirm
            title={record.status === 1 ? '确认禁用该权益?' : '确认启用该权益?'}
            onConfirm={() => handleToggleBenefitStatus(record, record.status === 1 ? 0 : 1)}
          >
            <Switch checked={record.status === 1} checkedChildren="启用" unCheckedChildren="禁用" />
          </Popconfirm>
        ) : (
          <Tag color={record.status === 1 ? 'green' : 'default'}>
            {record.status === 1 ? '启用' : '禁用'}
          </Tag>
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space>
          {canEdit && (
            <Button
              type="link"
              size="small"
              onClick={() => setBenefitModal({ visible: true, record })}
            >
              编辑
            </Button>
          )}
          {canEdit && (
            <Popconfirm title="确认删除该权益?" onConfirm={() => handleDeleteBenefit(record)}>
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
      {/* 会员等级 ProTable */}
      <ProTable<MemberLevelItem>
        headerTitle="会员等级配置"
        actionRef={actionRef}
        loading={tableLoading}
        rowKey="id"
        columns={levelColumns}
        options={{ density: false, reload: false }}
        scroll={{ x: 1400 }}
        search={false}
        request={async (params) => {
          try {
            const res = await getMemberLevels({
              status: params.status as number | string | undefined,
            });
            return { data: res.list, success: true, total: res.total };
          } catch {
            return { data: [], success: false, total: 0 };
          }
        }}
        pagination={false}
        toolBarRender={() =>
          canEdit
            ? [
                <Popconfirm
                  key="recompute"
                  title="确认按各等级最低成长值重新计算所有用户的会员等级?"
                  onConfirm={handleRecompute}
                >
                  <Button icon={<ReloadOutlined />}>成长值重算</Button>
                </Popconfirm>,
                <Button
                  key="create"
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setLevelModal({ visible: true, record: null })}
                >
                  新增等级
                </Button>,
                <RefreshButton key="refresh" actionRef={actionRef as any} />,
              ]
            : [
                <RefreshButton key="refresh" actionRef={actionRef as any} />,
              ]
        }
      />

      {/* 等级新增/编辑弹窗 */}
      <ModalForm
        title={levelModal.record ? '编辑会员等级' : '新增会员等级'}
        open={levelModal.visible}
        onOpenChange={(v) => setLevelModal({ visible: v, record: v ? levelModal.record : null })}
        onFinish={handleLevelSubmit}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        width={560}
        initialValues={
          levelModal.record
            ? {
                code: levelModal.record.code,
                name: levelModal.record.name,
                min_growth: levelModal.record.min_growth,
                sort: levelModal.record.sort,
                icon: levelModal.record.icon,
                benefits: levelModal.record.benefits,
                status: levelModal.record.status,
              }
            : { min_growth: 0, sort: 0, status: 1 }
        }
      >
        <ProFormText
          name="code"
          label="等级编码"
          placeholder="如 bronze/silver/gold/diamond"
          rules={[{ required: true, message: '请输入等级编码' }]}
          disabled={!!levelModal.record}
          extra={levelModal.record ? '编码创建后不可修改' : '唯一标识,建议与字典 member_level 对齐'}
        />
        <ProFormText
          name="name"
          label="等级名称"
          placeholder="请输入等级名称"
          rules={[{ required: true, message: '请输入等级名称' }]}
        />
        <ProFormDigit
          name="min_growth"
          label="最低成长值"
          min={0}
          fieldProps={{ precision: 0 }}
          placeholder="达到该成长值自动升级"
          rules={[{ required: true, message: '请输入最低成长值' }]}
        />
        <ProFormDigit
          name="sort"
          label="排序"
          min={0}
          fieldProps={{ precision: 0 }}
          placeholder="数值越小等级越低(升序)"
        />
        <ProFormText
          name="icon"
          label="等级图标"
          placeholder="图标 URL 或 emoji 标识(如 💎)"
        />
        <ProFormTextArea
          name="benefits"
          label="权益概要"
          placeholder="该等级权益概要描述"
          fieldProps={{ rows: 3 }}
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

      {/* 权益配置抽屉 */}
      <Drawer
        title={`权益配置 - ${benefitDrawer.level?.name ?? ''}`}
        width={960}
        open={benefitDrawer.visible}
        onClose={() => setBenefitDrawer({ visible: false, level: null })}
        destroyOnHidden
      >
        <ProTable<MemberBenefitItem>
          headerTitle={`${benefitDrawer.level?.name ?? ''} 权益列表`}
          actionRef={benefitActionRef}
          rowKey="id"
          columns={benefitColumns}
          options={{ density: false, reload: false }}
          scroll={{ x: 900 }}
          search={false}
          request={async () => {
            if (!benefitDrawer.level) return { data: [], success: true, total: 0 };
            try {
              const res = await getMemberBenefits(benefitDrawer.level.id);
              return { data: res.list, success: true, total: res.total };
            } catch {
              return { data: [], success: false, total: 0 };
            }
          }}
          pagination={false}
          toolBarRender={() =>
            canEdit
              ? [
                  <Button
                    key="add"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setBenefitModal({ visible: true, record: null })}
                  >
                    新增权益
                  </Button>,
                ]
              : []
          }
        />
      </Drawer>

      {/* 权益新增/编辑弹窗 */}
      <ModalForm
        title={benefitModal.record ? '编辑权益' : '新增权益'}
        open={benefitModal.visible}
        onOpenChange={(v) =>
          setBenefitModal({ visible: v, record: v ? benefitModal.record : null })
        }
        onFinish={handleBenefitSubmit}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        width={520}
        initialValues={
          benefitModal.record
            ? {
                name: benefitModal.record.name,
                type: benefitModal.record.type,
                value: benefitModal.record.value,
                description: benefitModal.record.description,
                status: benefitModal.record.status,
              }
            : { type: 'privilege', status: 1 }
        }
      >
        <ProFormText
          name="name"
          label="权益名称"
          placeholder="如 赛事报名折扣"
          rules={[{ required: true, message: '请输入权益名称' }]}
        />
        <ProFormSelect
          name="type"
          label="权益类型"
          options={[
            { label: '折扣(discount)', value: 'discount' },
            { label: '次数(count)', value: 'count' },
            { label: '特权(privilege)', value: 'privilege' },
          ]}
        />
        <ProFormText
          name="value"
          label="权益值"
          placeholder="折扣率(如 0.9)/ 次数 / 特权说明"
        />
        <ProFormTextArea
          name="description"
          label="描述"
          placeholder="权益详细描述"
          fieldProps={{ rows: 2 }}
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
    </>
  );
};

export default MemberLevel;
