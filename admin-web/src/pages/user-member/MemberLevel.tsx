import {
  ModalForm,
  ProFormText,
  ProFormTextArea,
  ProFormSelect,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  App,
  Button,
  Card,
  Form,
  Drawer,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  GiftOutlined,
  ReloadOutlined,
  StarFilled,
  TrophyFilled,
} from '@ant-design/icons';
import { useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import RefreshButton from '../../components/RefreshButton';
import IconPicker from '../../components/IconPicker';
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

const { Text } = Typography;

const BENEFIT_TYPE_MAP: Record<string, { text: string; color: string }> = {
  discount: { text: '折扣', color: 'orange' },
  count: { text: '次数', color: 'blue' },
  privilege: { text: '特权', color: 'gold' },
};

const LEVEL_ICON_MAP: Record<string, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  diamond: '💎',
};

const THEME_PRESETS = [
  { key: 'auto', label: '自动(跟随图标)', from: '#1677ff', to: '#096dd9', accent: '#1677ff' },
  { key: 'gold', label: '尊贵金', from: '#ffd700', to: '#daa520', accent: '#ffd700' },
  { key: 'silver', label: '典雅银', from: '#c0c0c0', to: '#808080', accent: '#c0c0c0' },
  { key: 'bronze', label: '青铜褐', from: '#cd7f32', to: '#a0522d', accent: '#cd7f32' },
  { key: 'emerald', label: '翡翠绿', from: '#52c41a', to: '#389e0d', accent: '#52c41a' },
  { key: 'ocean', label: '深海蓝', from: '#1890ff', to: '#096dd9', accent: '#1890ff' },
  { key: 'sunset', label: '日落橙', from: '#fa8c16', to: '#d46b08', accent: '#fa8c16' },
  { key: 'violet', label: '紫罗兰', from: '#722ed1', to: '#531dab', accent: '#722ed1' },
  { key: 'rose', label: '玫瑰粉', from: '#eb2f96', to: '#c41d7f', accent: '#eb2f96' },
  { key: 'midnight', label: '深夜黑', from: '#262626', to: '#000000', accent: '#595959' },
  { key: 'crimson', label: '赤焰红', from: '#ff4d4f', to: '#cf1322', accent: '#ff4d4f' },
  { key: 'teal', label: '孔雀青', from: '#13c2c2', to: '#006d75', accent: '#13c2c2' },
];

const getLevelColor = (icon?: string, themeKey?: string): { from: string; to: string; accent: string } => {
  if (themeKey && themeKey !== 'auto') {
    const theme = THEME_PRESETS.find((t) => t.key === themeKey);
    if (theme) return { from: theme.from, to: theme.to, accent: theme.accent };
  }
  const colorMap: Record<string, { from: string; to: string; accent: string }> = {
    '🥉': { from: '#cd7f32', to: '#a0522d', accent: '#cd7f32' },
    '🥈': { from: '#b8b8b8', to: '#808080', accent: '#b8b8b8' },
    '🥇': { from: '#ffd700', to: '#daa520', accent: '#ffd700' },
    '💎': { from: '#00ced1', to: '#1890ff', accent: '#1890ff' },
    '👑': { from: '#faad14', to: '#d48806', accent: '#faad14' },
    '🏆': { from: '#ffd700', to: '#b8860b', accent: '#ffd700' },
    '🎖️': { from: '#ff7a45', to: '#d4380d', accent: '#ff7a45' },
    '⭐': { from: '#ffc53d', to: '#fa8c16', accent: '#ffc53d' },
    '🌟': { from: '#ffd666', to: '#ffa940', accent: '#ffd666' },
    '✨': { from: '#e6f7ff', to: '#91d5ff', accent: '#1890ff' },
    '🔥': { from: '#ff4d4f', to: '#cf1322', accent: '#ff4d4f' },
    '⚡': { from: '#722ed1', to: '#531dab', accent: '#722ed1' },
    '🚀': { from: '#52c41a', to: '#389e0d', accent: '#52c41a' },
    '💫': { from: '#eb2f96', to: '#c41d7f', accent: '#eb2f96' },
    '🦅': { from: '#fa8c16', to: '#d46b08', accent: '#fa8c16' },
    '🕊️': { from: '#8c8c8c', to: '#595959', accent: '#8c8c8c' },
    '🔰': { from: '#13c2c2', to: '#08979c', accent: '#13c2c2' },
    '⚔️': { from: '#595959', to: '#262626', accent: '#595959' },
    '🌸': { from: '#ffadd2', to: '#ff85c0', accent: '#ff85c0' },
    '🌙': { from: '#262626', to: '#000000', accent: '#595959' },
    '☀️': { from: '#faad14', to: '#d48806', accent: '#faad14' },
  };
  return colorMap[icon || ''] || THEME_PRESETS[0];
};

const MemberLevel = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canEdit = hasPermission(currentUser, 'member:edit');
  const actionRef = useRef<ActionType>();
  const { tableLoading, handleRefresh } = useTableRefresh(actionRef, { messageApi: message });

  const [levelModal, setLevelModal] = useState<{
    visible: boolean;
    record: MemberLevelItem | null;
  }>({ visible: false, record: null });

  const [benefitDrawer, setBenefitDrawer] = useState<{
    visible: boolean;
    level: MemberLevelItem | null;
  }>({ visible: false, level: null });
  const benefitActionRef = useRef<ActionType>();

  const [benefitModal, setBenefitModal] = useState<{
    visible: boolean;
    record: MemberBenefitItem | null;
  }>({ visible: false, record: null });

  const [form] = Form.useForm();
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  const getInitialValues = (record: MemberLevelItem | null) => {
    if (record) {
      return {
        code: record.code,
        name: record.name,
        min_growth: record.min_growth,
        sort: record.sort,
        icon: record.icon,
        benefits: record.benefits,
        status: record.status,
        theme_color: (record as any).theme_color || 'auto',
      };
    }
    return { min_growth: 0, sort: 0, status: 1, theme_color: 'auto' };
  };

  const handleLevelSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        code: values.code as string,
        name: values.name as string,
        min_growth: (values.min_growth as number) ?? 0,
        sort: (values.sort as number) ?? 0,
        icon: values.icon as string,
        benefits: values.benefits as string,
        status: (values.status as number) ?? 1,
        theme_color: (values.theme_color as string) || 'auto',
      };
      if (levelModal.record) {
        await updateMemberLevel(levelModal.record.id, {
          name: payload.name,
          min_growth: payload.min_growth,
          sort: payload.sort,
          icon: payload.icon,
          benefits: payload.benefits,
          status: payload.status,
          theme_color: payload.theme_color,
        });
        message.success('更新成功');
      } else {
        await createMemberLevel(payload);
        message.success('新增成功');
      }
      setLevelModal({ visible: false, record: null });
      form.resetFields();
      handleRefresh();
    } catch {
      // validation failed
    }
  };

  const handleSort = async (record: MemberLevelItem, delta: number) => {
    try {
      await updateMemberLevelSort(record.id, record.sort + delta);
      message.success('排序已更新');
      handleRefresh();
    } catch {
      // interceptor handled
    }
  };

  const handleDeleteLevel = async (record: MemberLevelItem) => {
    try {
      await deleteMemberLevel(record.id);
      message.success('删除成功');
      handleRefresh();
    } catch {
      // interceptor handled
    }
  };

  const handleRecompute = async () => {
    try {
      const res = await recomputeUserLevels();
      message.success(`已重算 ${res.affected} 个用户的会员等级`);
      handleRefresh();
    } catch {
      // interceptor handled
    }
  };

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
    handleRefresh();
    return true;
  };

  const handleDeleteBenefit = async (record: MemberBenefitItem) => {
    try {
      await deleteMemberBenefit(record.id);
      message.success('权益已删除');
      benefitActionRef.current?.reload();
      handleRefresh();
    } catch {
      // interceptor handled
    }
  };

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
      // interceptor handled
    }
  };

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

  const currentIcon = formValues.icon || levelModal.record?.icon || '🥉';
  const currentName = formValues.name || levelModal.record?.name || '等级名称';
  const currentGrowth = formValues.min_growth ?? levelModal.record?.min_growth ?? 0;
  const currentStatus = formValues.status ?? levelModal.record?.status ?? 1;
  const currentTheme = formValues.theme_color || 'auto';
  const colors = getLevelColor(currentIcon, currentTheme);

  return (
    <>
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
                  onClick={() => {
                    setLevelModal({ visible: true, record: null });
                    setFormValues({ min_growth: 0, sort: 0, status: 1, theme_color: 'auto' });
                  }}
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

      <Modal
        title={levelModal.record ? '编辑会员等级' : '新增会员等级'}
        open={levelModal.visible}
        afterOpenChange={(open) => {
          if (open) {
            const values = getInitialValues(levelModal.record);
            form.setFieldsValue(values);
          } else {
            form.resetFields();
          }
        }}
        onCancel={() => {
          setLevelModal({ visible: false, record: null });
        }}
        width={820}
        destroyOnHidden
        maskClosable={false}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setLevelModal({ visible: false, record: null });
            }}
          >
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={handleLevelSubmit}>
            {levelModal.record ? '保存修改' : '确认新增'}
          </Button>,
        ]}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 320px',
            gap: 20,
            maxHeight: '70vh',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              overflowY: 'auto',
              maxHeight: '70vh',
              paddingRight: 4,
            }}
          >
            <Form
              form={form}
              layout="vertical"
              onValuesChange={(_, allValues) => setFormValues(allValues)}
            >
              <Card
                variant="borderless"
                styles={{ body: { padding: 16 } }}
                style={{
                  borderRadius: 12,
                  border: '1px solid #f0f0f0',
                  marginBottom: 16,
                  borderLeft: '4px solid #1677ff',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <StarFilled style={{ color: '#1677ff' }} />
                  <Text strong style={{ fontSize: 14 }}>
                    基本信息
                  </Text>
                </div>

                <Form.Item
                  name="code"
                  label="等级编码"
                  rules={[{ required: true, message: '请输入等级编码' }]}
                  extra={
                    levelModal.record
                      ? '编码创建后不可修改'
                      : '唯一标识,建议与字典 member_level 对齐'
                  }
                >
                  <Input
                    placeholder="如 bronze/silver/gold/diamond"
                    disabled={!!levelModal.record}
                  />
                </Form.Item>

                <Form.Item
                  name="name"
                  label="等级名称"
                  rules={[{ required: true, message: '请输入等级名称' }]}
                >
                  <Input placeholder="请输入等级名称" maxLength={20} showCount />
                </Form.Item>

                <Form.Item name="status" label="状态">
                  <Select
                    options={[
                      { label: '启用', value: 1 },
                      { label: '禁用', value: 0 },
                    ]}
                  />
                </Form.Item>
              </Card>

              <Card
                variant="borderless"
                styles={{ body: { padding: 16 } }}
                style={{
                  borderRadius: 12,
                  border: '1px solid #f0f0f0',
                  marginBottom: 16,
                  borderLeft: '4px solid #faad14',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <TrophyFilled style={{ color: '#faad14' }} />
                  <Text strong style={{ fontSize: 14 }}>
                    图标与排序
                  </Text>
                </div>

                <Form.Item
                  name="icon"
                  label="等级图标"
                  tooltip="从图标库中选择,点击即可切换"
                  extra="从预置图标库中选择等级徽章图标"
                >
                  <IconPicker placeholder="请选择等级图标" />
                </Form.Item>

                <Form.Item
                  name="theme_color"
                  label="主题配色"
                  tooltip="选择等级徽章的主题颜色,自动模式根据图标自动配色"
                  extra="选择后右侧预览区将实时更新等级样式"
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {THEME_PRESETS.map((theme) => {
                      const isActive = currentTheme === theme.key;
                      return (
                        <div
                          key={theme.key}
                          onClick={() => {
                            form.setFieldValue('theme_color', theme.key);
                            setFormValues((prev) => ({ ...prev, theme_color: theme.key }));
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 10px',
                            borderRadius: 8,
                            cursor: 'pointer',
                            border: isActive ? '2px solid ' + theme.from : '2px solid #f0f0f0',
                            background: isActive ? theme.from + '15' : '#fff',
                            transition: 'all 0.2s ease',
                            fontSize: 12,
                            color: isActive ? theme.from : '#595959',
                            fontWeight: isActive ? 600 : 400,
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) {
                              (e.currentTarget as HTMLDivElement).style.borderColor = theme.from;
                              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.03)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) {
                              (e.currentTarget as HTMLDivElement).style.borderColor = '#f0f0f0';
                              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
                            }
                          }}
                        >
                          {theme.key !== 'auto' && (
                            <div
                              style={{
                                width: 14,
                                height: 14,
                                borderRadius: '50%',
                                background: `linear-gradient(135deg, ${theme.from} 0%, ${theme.to} 100%)`,
                                border: '1px solid rgba(0,0,0,0.08)',
                              }}
                            />
                          )}
                          {theme.label}
                        </div>
                      );
                    })}
                  </div>
                </Form.Item>

                <Form.Item
                  name="min_growth"
                  label="最低成长值"
                  rules={[{ required: true, message: '请输入最低成长值' }]}
                >
                  <InputNumber
                    min={0}
                    precision={0}
                    placeholder="达到该成长值自动升级"
                    style={{ width: '100%' }}
                  />
                </Form.Item>

                <Form.Item name="sort" label="排序">
                  <InputNumber
                    min={0}
                    precision={0}
                    placeholder="数值越小等级越低(升序)"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Card>

              <Card
                variant="borderless"
                styles={{ body: { padding: 16 } }}
                style={{
                  borderRadius: 12,
                  border: '1px solid #f0f0f0',
                  borderLeft: '4px solid #52c41a',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                    <GiftOutlined style={{ color: '#52c41a' }} />
                    <Text strong style={{ fontSize: 14 }}>
                      权益描述
                    </Text>
                  </div>

                  <Form.Item name="benefits" label="权益概要">
                    <Input.TextArea
                      placeholder="该等级权益概要描述,如:赛事报名9折优惠、每月专属客服、优先参与活动等"
                      rows={4}
                      maxLength={200}
                      showCount
                    />
                  </Form.Item>
              </Card>
            </Form>
          </div>

          <div
            style={{
              position: 'sticky',
              top: 0,
              alignSelf: 'start',
              maxHeight: '70vh',
              overflowY: 'auto',
            }}
          >
            <Card
              variant="borderless"
              styles={{
                body: {
                  padding: 0,
                },
              }}
              style={{
                overflow: 'hidden',
                borderRadius: 12,
                border: '1px solid #f0f0f0',
              }}
            >
              <div
                style={{
                  padding: '24px 16px 28px',
                  background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`,
                  color: '#fff',
                  textAlign: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: -30,
                    right: -30,
                    width: 100,
                    height: 100,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.08)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: -20,
                    left: -20,
                    width: 70,
                    height: 70,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.06)',
                  }}
                />
                <div
                  style={{
                    width: 84,
                    height: 84,
                    margin: '0 auto 14px',
                    background: 'rgba(255,255,255,0.22)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(6px)',
                    fontSize: 44,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                    border: '2px solid rgba(255,255,255,0.3)',
                    position: 'relative',
                    zIndex: 1,
                    transition: 'all 0.3s ease',
                  }}
                >
                  {currentIcon}
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    marginBottom: 6,
                    textShadow: '0 2px 6px rgba(0,0,0,0.25)',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  {currentName || '等级名称'}
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    justifyContent: 'center',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      opacity: 0.92,
                      background: 'rgba(0,0,0,0.18)',
                      padding: '4px 12px',
                      borderRadius: 12,
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    成长值 ≥ {currentGrowth}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      opacity: 0.92,
                      background: 'rgba(255,255,255,0.2)',
                      padding: '4px 10px',
                      borderRadius: 12,
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    {THEME_PRESETS.find((t) => t.key === currentTheme)?.label || '自动'}
                  </span>
                </div>
              </div>

              <div style={{ padding: '16px 20px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: '1px dashed #f0f0f0',
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    状态
                  </Text>
                  <Tag color={currentStatus === 1 ? 'green' : 'default'}>
                    {currentStatus === 1 ? '已启用' : '已禁用'}
                  </Tag>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: '1px dashed #f0f0f0',
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    等级编码
                  </Text>
                  <Text strong style={{ fontSize: 13 }}>
                    {formValues.code || levelModal.record?.code || '自动生成'}
                  </Text>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: '1px dashed #f0f0f0',
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    排序权重
                  </Text>
                  <Text strong style={{ fontSize: 13 }}>
                    {formValues.sort ?? levelModal.record?.sort ?? 0}
                  </Text>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: '1px dashed #f0f0f0',
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    主题配色
                  </Text>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`,
                        border: '1px solid rgba(0,0,0,0.08)',
                      }}
                    />
                    <Text strong style={{ fontSize: 13 }}>
                      {THEME_PRESETS.find((t) => t.key === currentTheme)?.label || '自动'}
                    </Text>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 12,
                    padding: '10px 12px',
                    background: '#fafafa',
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#8c8c8c',
                    lineHeight: 1.8,
                  }}
                >
                  {formValues.benefits || levelModal.record?.benefits || '暂无权益描述'}
                </div>
              </div>
            </Card>

            <div
              style={{
                marginTop: 12,
                padding: '12px 14px',
                background: '#fffbe6',
                borderRadius: 8,
                border: '1px solid #ffe58f',
                fontSize: 12,
                color: '#ad6800',
              }}
            >
              💡 选择图标后可在此预览等级样式。图标将在用户端作为徽章展示。
            </div>
          </div>
        </div>
      </Modal>

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
