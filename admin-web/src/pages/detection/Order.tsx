import {
  DrawerForm,
  ModalForm,
  ProFormDatePicker,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
  type ProFormInstance,
} from '@ant-design/pro-components';
import {
  App,
  Badge,
  Button,
  Calendar,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Divider,
  Drawer,
  Form,
  List,
  Popconfirm,
  Radio,
  Row,
  Segmented,
  Space,
  Steps,
  Tag,
} from 'antd';
import {
  CalendarOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  CloseCircleFilled,
  EyeOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  TableOutlined,
} from '@ant-design/icons';
import { useRef, useState, useEffect } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { useTableRefresh } from '../../hooks/useTableRefresh';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import RefreshButton from '../../components/RefreshButton';
import { getGeneProfileOptions, type GeneProfileOption } from '../../services/gene';
import {
  cancelDetectionOrder,
  confirmDetectionOrder,
  createDetectionOrder,
  deleteDetectionOrder,
  getDetectionCalendar,
  getDetectionCalendarByDate,
  getDetectionItemTypes,
  getDetectionOrder,
  getDetectionOrgOptions,
  getDetectionOrders,
  scheduleDetectionOrder,
  updateDetectionOrder,
  type CalendarDayCount,
  type DetectionItemType,
  type DetectionOrder,
  type DetectionOrderDetail,
  type DetectionOrgOption,
} from '../../services/detection';

// 订单状态映射
const ORDER_STATUS_MAP: Record<
  string,
  { label: string; color: string }
> = {
  pending: { label: '待确认', color: 'orange' },
  confirmed: { label: '已确认', color: 'blue' },
  scheduled: { label: '已排期', color: 'cyan' },
  completed: { label: '已完成', color: 'green' },
  cancelled: { label: '已取消', color: 'default' },
};

// 检测项目默认价格（模拟数据，实际应由后端提供）
const ITEM_PRICES: Record<string, number> = {
  'DNA身份认证': 300,
  '遗传病筛查': 200,
  '亲子鉴定': 350,
  '品系鉴定': 250,
  '疾 病检测': 180,
  '性别鉴定': 120,
  '加急服务': 150,
};

// 可选排期时段（模拟数据）
const TIME_SLOTS = [
  { id: '09:00-10:00', label: '09:00 - 10:00', status: 'available' as const },
  { id: '10:00-11:00', label: '10:00 - 11:00', status: 'available' as const },
  { id: '11:00-12:00', label: '11:00 - 12:00', status: 'full' as const },
  { id: '14:00-15:00', label: '14:00 - 15:00', status: 'available' as const },
  { id: '15:00-16:00', label: '15:00 - 16:00', status: 'limited' as const },
  { id: '16:00-17:00', label: '16:00 - 17:00', status: 'available' as const },
];

// 排期弹窗的日期选择器值类型
type ScheduleValue = Dayjs | null;

// 检测预约订单管理:列表 + 新增/编辑 + 状态流转 + 排期日历
const DetectionOrder = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canView = hasPermission(currentUser, 'detection:view');
  const actionRef = useRef<ActionType>();
  const { tableLoading, handleRefresh } = useTableRefresh(actionRef, { messageApi: message });
  const formRef = useRef<ProFormInstance>();

  // 视图切换:列表 / 排期日历
  const [view, setView] = useState<'list' | 'calendar'>('list');

  // 新增/编辑抽屉
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editing, setEditing] = useState<DetectionOrder | null>(null);

  // 详情抽屉
  const [detailVisible, setDetailVisible] = useState(false);
  const [detail, setDetail] = useState<DetectionOrderDetail | null>(null);

  // 排期弹窗
  const [scheduleVisible, setScheduleVisible] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState<DetectionOrder | null>(null);
  const [scheduleDate, setScheduleDate] = useState<ScheduleValue>(null);

  // 机构下拉
  const [orgOptions, setOrgOptions] = useState<DetectionOrgOption[]>([]);
  // 检测项目类型字典
  const [itemTypes, setItemTypes] = useState<DetectionItemType[]>([]);
  // 基因档案下拉(跨模块复用 gene 模块接口)
  const [profileOptions, setProfileOptions] = useState<GeneProfileOption[]>([]);

  // 排期日历:每日订单数
  const [calendarCounts, setCalendarCounts] = useState<Record<string, number>>({});
  // 排期日历:点击某日查看订单
  const [dateOrders, setDateOrders] = useState<DetectionOrder[]>([]);
  const [dateDrawerVisible, setDateDrawerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');

  // ===== 新增表单的实时联动状态（用于右侧预览） =====
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [selectedDateValue, setSelectedDateValue] = useState<Dayjs | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  // 派生值：供右侧预览使用
  const getFormNumber = (key: string): number | undefined => {
    const v = formValues[key];
    return typeof v === 'number' ? v : undefined;
  };
  const getFormString = (key: string): string => {
    const v = formValues[key];
    return typeof v === 'string' ? v : '';
  };
  const selectedProfileId = getFormNumber('gene_profile_id');
  const selectedProfile: GeneProfileOption | undefined = selectedProfileId
    ? profileOptions.find((p) => p.id === selectedProfileId)
    : undefined;


  // 切换到日历视图时加载当月排期数据
  useEffect(() => {
    if (view !== 'calendar') return;
    const start = dayjs().startOf('month').format('YYYY-MM-DD');
    const end = dayjs().endOf('month').format('YYYY-MM-DD');
    getDetectionCalendar(start, end)
      .then((rows: CalendarDayCount[] | null) => {
        if (!rows) return;
        const map: Record<string, number> = {};
        rows.forEach((r) => {
          map[r.date] = r.count;
        });
        setCalendarCounts(map);
      })
      .catch(() => {
        // 拦截器已提示错误
      });
  }, [view]);

  // 加载下拉数据
  const loadOptions = () => {
    if (!orgOptions.length) {
      getDetectionOrgOptions()
        .then((d) => setOrgOptions(d ?? []))
        .catch(() => {});
    }
    if (!itemTypes.length) {
      getDetectionItemTypes()
        .then((d) => setItemTypes(d ?? []))
        .catch(() => {});
    }
    if (!profileOptions.length) {
      getGeneProfileOptions()
        .then((d) => setProfileOptions(d ?? []))
        .catch(() => {});
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormValues({});
    setSelectedTimeSlot('');
    setSelectedDateValue(null);
    setCurrentStep(0);
    setDrawerVisible(true);
    loadOptions();
  };

  const openEdit = (record: DetectionOrder) => {
    setEditing(record);
    setFormValues({
      user_name: record.user_name,
      phone: record.phone ?? undefined,
      gene_profile_id: record.gene_profile_id ?? undefined,
      ring_number: record.ring_number,
      org_id: record.org_id ?? undefined,
      test_org: record.test_org,
      project: record.project,
      scheduled_date: record.scheduled_date ? dayjs(record.scheduled_date) : undefined,
      remark: record.remark ?? undefined,
    });
    setSelectedDateValue(record.scheduled_date ? dayjs(record.scheduled_date) : null);
    setDrawerVisible(true);
    loadOptions();
  };

  // 查看详情
  const openDetail = async (record: DetectionOrder) => {
    try {
      const d = await getDetectionOrder(record.id);
      setDetail(d ?? null);
      setDetailVisible(true);
    } catch {
      // 拦截器已提示错误
    }
  };

  // 提交新增/编辑
  const handleSubmit = async (values: Record<string, unknown>) => {
    const scheduledDate = values.scheduled_date
      ? dayjs(values.scheduled_date as string).format('YYYY-MM-DD')
      : null;
    // 若选择机构,同步机构名称
    const orgId = (values.org_id as number | undefined) ?? null;
    const org = orgId ? orgOptions.find((o) => o.id === orgId) : undefined;
    // 若选择鸽只,同步足环号
    const geneProfileId = (values.gene_profile_id as number | undefined) ?? null;
    const profile = geneProfileId
      ? profileOptions.find((p) => p.id === geneProfileId)
      : undefined;
    // 多选项目:数组转逗号分隔字符串
    const projectVal = values.project;
    const projectStr = Array.isArray(projectVal)
      ? projectVal.join(',')
      : (projectVal as string) ?? '';

    const payload = {
      user_name: values.user_name as string,
      phone: (values.phone as string) ?? undefined,
      gene_profile_id: geneProfileId,
      ring_number: profile?.ring_number ?? (values.ring_number as string) ?? '',
      test_org: org?.name ?? '',
      org_id: orgId,
      project: projectStr,
      scheduled_date: scheduledDate,
      remark: (values.remark as string) ?? undefined,
    };
    if (editing) {
      await updateDetectionOrder(editing.id, payload);
      message.success('更新成功');
    } else {
      await createDetectionOrder(payload);
      message.success('新增成功');
    }
    setDrawerVisible(false);
    // 重置表单联动状态
    setFormValues({});
    setSelectedTimeSlot('');
    setSelectedDateValue(null);
    setCurrentStep(0);
    handleRefresh();
    return true;
  };

  // 确认预约
  const handleConfirm = async (record: DetectionOrder) => {
    try {
      await confirmDetectionOrder(record.id);
      message.success('已确认预约');
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 打开排期弹窗
  const openSchedule = (record: DetectionOrder) => {
    setScheduleTarget(record);
    setScheduleDate(record.scheduled_date ? dayjs(record.scheduled_date) : null);
    setScheduleVisible(true);
  };

  // 提交排期
  const handleScheduleSubmit = async () => {
    if (!scheduleTarget || !scheduleDate) {
      message.warning('请选择排期日期');
      return false;
    }
    try {
      await scheduleDetectionOrder(scheduleTarget.id, scheduleDate.format('YYYY-MM-DD'));
      message.success('排期成功');
      setScheduleVisible(false);
      handleRefresh();
      return true;
    } catch {
      return false;
    }
  };

  // 取消订单
  const handleCancel = async (record: DetectionOrder) => {
    try {
      await cancelDetectionOrder(record.id);
      message.success('已取消订单');
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 删除订单
  const handleDelete = async (record: DetectionOrder) => {
    try {
      await deleteDetectionOrder(record.id);
      message.success('删除成功');
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 日历:点击日期查看当日订单
  const handleDateSelect = (date: Dayjs) => {
    const ds = date.format('YYYY-MM-DD');
    setSelectedDate(ds);
    getDetectionCalendarByDate(ds)
      .then((rows) => {
        setDateOrders(rows ?? []);
        setDateDrawerVisible(true);
      })
      .catch(() => {});
  };

  // 日历单元格渲染:显示当日预约数 Badge
  const dateCellRender = (date: Dayjs) => {
    const ds = date.format('YYYY-MM-DD');
    const count = calendarCounts[ds];
    if (!count) return null;
    return (
      <div style={{ textAlign: 'center' }}>
        <Badge count={count} style={{ backgroundColor: '#1677ff' }} />
      </div>
    );
  };

  const columns: ProColumns<DetectionOrder>[] = [
    { title: '序号', dataIndex: 'index', valueType: 'index', width: 60, hideInSearch: true },
    { title: '订单号', dataIndex: 'order_no', width: 150, ellipsis: true },
    { title: '预约人', dataIndex: 'user_name', width: 100 },
    { title: '联系电话', dataIndex: 'phone', width: 130, hideInSearch: true, ellipsis: true },
    { title: '足环号', dataIndex: 'ring_number', width: 150, ellipsis: true },
    {
      title: '检测机构',
      dataIndex: 'test_org',
      width: 160,
      ellipsis: true,
      hideInSearch: true,
    },
    { title: '检测项目', dataIndex: 'project', width: 110, hideInSearch: true, ellipsis: true },
    {
      title: '预约日期',
      dataIndex: 'scheduled_date',
      width: 120,
      hideInSearch: true,
      render: (_, record) => (record.scheduled_date ? record.scheduled_date : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      valueEnum: Object.fromEntries(
        Object.entries(ORDER_STATUS_MAP).map(([k, v]) => [k, { text: v.label }])
      ),
      render: (_, record) => {
        const s = ORDER_STATUS_MAP[record.status] ?? { label: record.status, color: 'default' };
        return <Tag color={s.color}>{s.label}</Tag>;
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
      title: '时间范围',
      dataIndex: 'dateRange',
      hideInTable: true,
      valueType: 'dateRange',
      search: {
        transform: (value: [string, string]) => ({
          startDate: value?.[0],
          endDate: value?.[1],
        }),
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => {
        const s = record.status;
        return (
          <Space>
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>
              详情
            </Button>
            {canView && s !== 'completed' && s !== 'cancelled' && (
              <Button type="link" size="small" onClick={() => openEdit(record)}>
                编辑
              </Button>
            )}
            {canView && s === 'pending' && (
              <Popconfirm title="确认该预约?" onConfirm={() => handleConfirm(record)}>
                <Button type="link" size="small">
                  确认
                </Button>
              </Popconfirm>
            )}
            {canView && (s === 'confirmed' || s === 'scheduled') && (
              <Button type="link" size="small" onClick={() => openSchedule(record)}>
                排期
              </Button>
            )}
            {canView && s !== 'cancelled' && s !== 'completed' && (
              <Popconfirm title="确认取消该订单?" onConfirm={() => handleCancel(record)}>
                <Button type="link" size="small" danger>
                  取消
                </Button>
              </Popconfirm>
            )}
            {canView && (
              <Popconfirm title="确认删除该订单?关联报告将一并删除。" onConfirm={() => handleDelete(record)}>
                <Button type="link" size="small" danger>
                  删除
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Segmented
          value={view}
          onChange={(v) => setView(v as 'list' | 'calendar')}
          options={[
            { label: '列表', value: 'list', icon: <TableOutlined /> },
            { label: '排期日历', value: 'calendar', icon: <CalendarOutlined /> },
          ]}
        />
        {canView && view === 'list' && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增预约
          </Button>
        )}
      </div>

      {view === 'list' ? (
        <ProTable<DetectionOrder>
          headerTitle="检测预约订单"
          actionRef={actionRef}
          loading={tableLoading}
          rowKey="id"
          columns={columns}
          scroll={{ x: 1400 }}
          search={{ labelWidth: 'auto' }}
          request={async (params) => {
            const {
              current,
              pageSize,
              order_no,
              status,
              user_name,
              ring_number,
              startDate,
              endDate,
            } = params;
            try {
              const res = await getDetectionOrders({
                page: current,
                pageSize,
                order_no: order_no as string | undefined,
                status: status as string | undefined,
                user_name: user_name as string | undefined,
                ring_number: ring_number as string | undefined,
                startDate: startDate as string | undefined,
                endDate: endDate as string | undefined,
              });
              return { data: res?.list ?? [], success: true, total: res?.total ?? 0 };
            } catch {
              return { data: [], success: false, total: 0 };
            }
          }}
          pagination={{
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            defaultPageSize: 10,
          }}
          options={{ density: false, reload: false }}
          toolBarRender={() => [<RefreshButton key="refresh" actionRef={actionRef as any} />]}
        />
      ) : (
        <Card title="检测排期日历">
          <Calendar cellRender={(date) => dateCellRender(date)} onSelect={handleDateSelect} />
        </Card>
      )}

      {/* 新增/编辑抽屉 */}
      <DrawerForm
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>{editing ? '编辑预约订单' : '新增预约订单'}</span>
            <Steps
              size="small"
              current={currentStep}
              items={[
                { title: '选择检测对象' },
                { title: '选择检测服务' },
                { title: '确认排期' },
                { title: '提交确认' },
              ]}
              style={{ minWidth: 420 }}
            />
          </div>
        }
        open={drawerVisible}
        onOpenChange={setDrawerVisible}
        onFinish={handleSubmit}
        formRef={formRef}
        drawerProps={{
          destroyOnHidden: true,
          maskClosable: false,
          width: 'min(92vw, 960px)',
          styles: { body: { padding: 0 } },
        }}
        initialValues={
          editing
            ? {
                user_name: editing.user_name,
                phone: editing.phone ?? undefined,
                gene_profile_id: editing.gene_profile_id ?? undefined,
                ring_number: editing.ring_number,
                org_id: editing.org_id ?? undefined,
                test_org: editing.test_org,
                project: editing.project,
                scheduled_date: editing.scheduled_date ? dayjs(editing.scheduled_date) : undefined,
                remark: editing.remark ?? undefined,
              }
            : {}
        }
        submitter={{
          render: () => [
            <Button
              key="cancel"
              onClick={() => {
                setDrawerVisible(false);
                setFormValues({});
                setSelectedTimeSlot('');
                setSelectedDateValue(null);
                setCurrentStep(0);
              }}
            >
              取消
            </Button>,
            !editing && (
              <Button
                key="draft"
                onClick={() => {
                  formRef.current?.submit?.();
                }}
              >
                保存草稿
              </Button>
            ),
            <Button key="submit" type="primary" onClick={() => formRef.current?.submit?.()}>
              {editing ? '保存修改' : '确认提交'}
            </Button>,
          ],
        }}
      >
        {/* 主布局：单栏自适应，顶部概览+表单+底部费用 */}
        <div style={{ height: 'calc(100vh - 180px)', minHeight: 580, display: 'flex', flexDirection: 'column' }}>
          {/* ============ 顶部：订单概览（sticky） ============ */}
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              background: 'linear-gradient(135deg, #f0f5ff 0%, #ffffff 100%)',
              borderBottom: '1px solid #e6f4ff',
              padding: '10px 20px',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: '#1677ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12 }}>📋</div>
                <span style={{ fontWeight: 600, fontSize: 13, color: '#333' }}>订单概览</span>
              </div>
              <Divider type="vertical" style={{ height: 20 }} />
              {/* 足环号 */}
              <div style={{ fontSize: 12, color: '#555' }}>
                <span style={{ color: '#999' }}>足环：</span>
                <span style={{ fontWeight: 500 }}>{getFormString('ring_number') || '未填写'}</span>
              </div>
              {/* 检测机构 */}
              <div style={{ fontSize: 12, color: '#555' }}>
                <span style={{ color: '#999' }}>机构：</span>
                <span style={{ fontWeight: 500 }}>{getFormString('test_org') || '未选择'}</span>
              </div>
              {/* 检测项目 */}
              <div style={{ fontSize: 12, color: '#555', flex: 1, minWidth: 200 }}>
                <span style={{ color: '#999' }}>项目：</span>
                <span style={{ fontWeight: 500 }}>
                  {(() => {
                    const p = formValues['project'];
                    const list = Array.isArray(p) ? (p as string[]) : p ? [p as string] : [];
                    return list.length > 0 ? list.join('、') : '未选择';
                  })()}
                </span>
              </div>
              {/* 合计金额 */}
              <div
                style={{
                  marginLeft: 'auto',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 4,
                  padding: '4px 12px',
                  background: '#fffbe6',
                  border: '1px solid #ffe58f',
                  borderRadius: 6,
                }}
              >
                <span style={{ fontSize: 12, color: '#d48806' }}>合计</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#fa8c16' }}>
                  ¥{(() => {
                    const p = formValues['project'];
                    const list = Array.isArray(p) ? (p as string[]) : p ? [p as string] : [];
                    return list.reduce((sum, name) => sum + (ITEM_PRICES[name] ?? 0), 0);
                  })()}
                </span>
              </div>
            </div>
          </div>

          {/* ============ 表单内容区（可滚动） ============ */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 20px',
            }}
          >
            {/* ===== ① 选择检测对象 ===== */}
            <Card
              size="small"
              title={
                <Space>
                  <Tag color="blue" style={{ borderRadius: 10 }}>
                    ①
                  </Tag>
                  <span style={{ fontWeight: 600 }}>选择检测对象</span>
                  <span style={{ color: '#999', fontSize: 12, fontWeight: 400 }}>
                    搜索基因档案或手动输入足环号
                  </span>
                </Space>
              }
              style={{ marginBottom: 16, borderRadius: 8, border: '1px solid #e6f4ff' }}
              styles={{ header: { borderBottom: '1px solid #f0f0f0', background: '#fafcff' } }}
            >
              <ProFormSelect
                name="gene_profile_id"
                label="选择基因档案（可选）"
                placeholder="🔍 搜索足环号或鸽名"
                showSearch
                allowClear
                options={profileOptions.map((o) => ({
                  label: `${o.ring_number} ${o.name}${o.breed ? ' · ' + o.breed : ''}`,
                  value: o.id,
                }))}
                fieldProps={{
                  optionFilterProp: 'label',
                  onChange: (value: number | undefined) => {
                    setCurrentStep(value ? 1 : 0);
                    if (value) {
                      const profile = profileOptions.find((p) => p.id === value);
                      if (profile) {
                        formRef.current?.setFieldsValue({ ring_number: profile.ring_number });
                        setFormValues((prev) => ({ ...prev, gene_profile_id: value }));
                      }
                    } else {
                      setFormValues((prev) => ({ ...prev, gene_profile_id: undefined }));
                    }
                  },
                }}
              />
              {/* 已选档案信息卡片 */}
              {!!formValues.gene_profile_id && (() => {
                const p = profileOptions.find(
                  (o) => o.id === (formValues.gene_profile_id as number)
                );
                if (!p) return null;
                return (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '12px 16px',
                      background: 'linear-gradient(135deg, #f6ffed 0%, #e6fffb 100%)',
                      border: '1px solid #b7eb8f',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <CheckCircleFilled style={{ color: '#52c41a', fontSize: 20 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#389e0d', marginBottom: 2 }}>
                        ✅ 已关联基因档案
                      </div>
                      <div style={{ fontSize: 13, color: '#555' }}>
                        <strong>{p.name}</strong>
                        {p.breed && ` · ${p.breed}`}
                        {p.gender && ` · ${p.gender === 'male' ? '♂ 雄' : p.gender === 'female' ? '♀ 雌' : ''}`}
                        {p.owner_name && ` · 鸽主：${p.owner_name}`}
                      </div>
                      <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                        足环号：{p.ring_number}
                      </div>
                    </div>
                  </div>
                );
              })()}
              <div style={{ marginTop: 12 }}>
                <ProFormText
                  name="ring_number"
                  label={<span><span style={{ color: '#ff4d4f' }}>*</span> 足环号</span>}
                  placeholder="请输入足环号(已选档案时自动带出)"
                  rules={[{ required: true, message: '请输入足环号' }]}
                  fieldProps={{
                    onChange: (e) => {
                      setFormValues((prev) => ({ ...prev, ring_number: e.target.value }));
                    },
                  }}
                />
                {!formValues.gene_profile_id && !!formValues.ring_number && (
                  <div
                    style={{
                      marginTop: -8,
                      marginBottom: 12,
                      padding: '8px 12px',
                      background: '#fffbe6',
                      border: '1px solid #ffe58f',
                      borderRadius: 6,
                      fontSize: 12,
                      color: '#d48806',
                    }}
                  >
                    <InfoCircleOutlined /> 该足环号未关联基因档案，将在提交时自动创建新档案
                  </div>
                )}
              </div>
              <Row gutter={12}>
                <Col span={12}>
                  <ProFormText
                    name="user_name"
                    label="预约人姓名"
                    placeholder="请输入预约人姓名"
                    rules={[{ required: true, message: '请输入预约人姓名' }]}
                    fieldProps={{
                      onChange: (e) => {
                        setFormValues((prev) => ({ ...prev, user_name: e.target.value }));
                      },
                    }}
                  />
                </Col>
                <Col span={12}>
                  <ProFormText
                    name="phone"
                    label="联系电话"
                    placeholder="请输入联系电话"
                    fieldProps={{
                      onChange: (e) => {
                        setFormValues((prev) => ({ ...prev, phone: e.target.value }));
                      },
                    }}
                  />
                </Col>
              </Row>
            </Card>

            {/* ===== ② 选择检测服务 ===== */}
            <Card
              size="small"
              title={
                <Space>
                  <Tag color="cyan" style={{ borderRadius: 10 }}>
                    ②
                  </Tag>
                  <span style={{ fontWeight: 600 }}>选择检测服务</span>
                  <span style={{ color: '#999', fontSize: 12, fontWeight: 400 }}>
                    选择机构和检测项目
                  </span>
                </Space>
              }
              style={{ marginBottom: 16, borderRadius: 8, border: '1px solid #e6fffb' }}
              styles={{ header: { borderBottom: '1px solid #f0f0f0', background: '#fafcff' } }}
            >
              <ProFormSelect
                name="org_id"
                label={<span><span style={{ color: '#ff4d4f' }}>*</span> 检测机构</span>}
                placeholder="选择检测机构"
                showSearch
                allowClear
                rules={[{ required: true, message: '请选择检测机构' }]}
                options={orgOptions.map((o) => ({
                  label: `${o.name}${o.code ? `(${o.code})` : ''}`,
                  value: o.id,
                }))}
                fieldProps={{
                  optionFilterProp: 'label',
                  onChange: (value: number | undefined) => {
                    if (value) {
                      const org = orgOptions.find((o) => o.id === value);
                      if (org) {
                        // 自动带出机构信息（不再需要 test_org 字段）
                        formRef.current?.setFieldsValue({
                          test_org: org.name,
                        });
                        setFormValues((prev) => ({
                          ...prev,
                          org_id: value,
                          test_org: org.name,
                        }));
                        setCurrentStep(2);
                      }
                    } else {
                      setFormValues((prev) => ({ ...prev, org_id: undefined, test_org: '' }));
                    }
                  },
                }}
              />
              {/* 已选机构信息 */}
              {!!formValues.org_id && (() => {
                const org = orgOptions.find((o) => o.id === (formValues.org_id as number));
                if (!org) return null;
                return (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '12px 16px',
                      background: '#f0f5ff',
                      border: '1px solid #adc6ff',
                      borderRadius: 8,
                      display: 'flex',
                      gap: 16,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#1d39c4', marginBottom: 4 }}>
                        {org.name}
                      </div>
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>
                        {org.code && <>机构编码：{org.code}</>}
                      </div>
                    </div>
                    {org.projects && (
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                          可检测项目：
                        </div>
                        <div style={{ fontSize: 12, color: '#333' }}>{org.projects}</div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <Divider style={{ margin: '16px 0' }} />

              {/* 隐藏字段：存储机构名称（用于提交） */}
              <ProFormText name="test_org" hidden />

              {/* 多选检测项目 */}
              <Form.Item
                label={<span><span style={{ color: '#ff4d4f' }}>*</span> 检测项目（可多选）</span>}
                required
              >
                <Checkbox.Group
                  style={{ width: '100%' }}
                  onChange={(checkedValues) => {
                    setFormValues((prev) => ({ ...prev, project: checkedValues }));
                    if (checkedValues.length > 0) setCurrentStep(2);
                  }}
                >
                  <Row gutter={[12, 12]}>
                    {itemTypes.length > 0 ? (
                      itemTypes.map((item) => {
                        const price = ITEM_PRICES[item.name] ?? 0;
                        const isUrgent = item.name.includes('加急');
                        return (
                          <Col span={12} key={item.name}>
                            <div
                              style={{
                                padding: '8px 12px',
                                border: '1px solid #e8e8e8',
                                borderRadius: 6,
                                transition: 'all 0.2s',
                                cursor: 'pointer',
                              }}
                            >
                              <Checkbox
                                value={item.name}
                                style={{ display: 'flex', alignItems: 'center' }}
                              >
                                <span style={{ fontWeight: 500 }}>{item.name}</span>
                                <Tag
                                  color={isUrgent ? 'orange' : 'blue'}
                                  style={{ marginLeft: 8, fontSize: 11 }}
                                >
                                  {isUrgent ? `+¥${price}` : `¥${price}`}
                                </Tag>
                              </Checkbox>
                            </div>
                          </Col>
                        );
                      })
                    ) : (
                      <Col span={24}>
                        <div style={{ padding: 16, color: '#999', textAlign: 'center' }}>
                          加载检测项目中...
                        </div>
                      </Col>
                    )}
                  </Row>
                </Checkbox.Group>
                {/* 自定义校验：至少选一项 */}
                <ProFormText
                  name="project"
                  hidden
                  rules={[
                    {
                      validator: (_, value) => {
                        if (!value || (Array.isArray(value) && value.length === 0)) {
                          return Promise.reject(new Error('请至少选择一个检测项目'));
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                />
              </Form.Item>
            </Card>

            {/* ===== ③ 确认排期 ===== */}
            <Card
              size="small"
              title={
                <Space>
                  <Tag color="gold" style={{ borderRadius: 10 }}>
                    ③
                  </Tag>
                  <span style={{ fontWeight: 600 }}>确认排期</span>
                  <span style={{ color: '#999', fontSize: 12, fontWeight: 400 }}>
                    选择预约日期和时段
                  </span>
                </Space>
              }
              style={{ marginBottom: 16, borderRadius: 8, border: '1px solid #fff1b8' }}
              styles={{ header: { borderBottom: '1px solid #f0f0f0', background: '#fafcff' } }}
            >
              <ProFormDatePicker
                name="scheduled_date"
                label="预约日期"
                placeholder="请选择预约日期"
                fieldProps={{
                  style: { width: '100%' },
                  onChange: (date: Dayjs | null) => {
                    setSelectedDateValue(date);
                    setSelectedTimeSlot('');
                    if (date) setCurrentStep(3);
                  },
                }}
              />
              {/* 时段选择 */}
              {selectedDateValue && (
                <div style={{ marginTop: 12 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#666',
                      marginBottom: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <ClockCircleOutlined />
                    可选时段（{selectedDateValue.format('YYYY-MM-DD dddd')}）
                  </div>
                  <Radio.Group
                    value={selectedTimeSlot}
                    onChange={(e) => setSelectedTimeSlot(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <Row gutter={[8, 8]}>
                      {TIME_SLOTS.map((slot) => {
                        const isFull = slot.status === 'full';
                        const isLimited = slot.status === 'limited';
                        const color = isFull
                          ? '#d9d9d9'
                          : isLimited
                            ? '#faad14'
                            : '#52c41a';
                        return (
                          <Col span={8} key={slot.id}>
                            <Radio
                              value={slot.id}
                              disabled={isFull}
                              style={{
                                width: '100%',
                                margin: 0,
                                padding: '8px 12px',
                                border: `1px solid ${color}`,
                                borderRadius: 6,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 4,
                              }}
                            >
                              {isFull ? (
                                <CloseCircleFilled style={{ color: '#bfbfbf' }} />
                              ) : isLimited ? (
                                <ClockCircleOutlined style={{ color: '#faad14' }} />
                              ) : (
                                <CheckCircleFilled style={{ color: '#52c41a' }} />
                              )}
                              <span style={{ color: isFull ? '#999' : '#333', fontSize: 13 }}>
                                {slot.label}
                              </span>
                              <Tag
                                color={isFull ? 'default' : isLimited ? 'warning' : 'success'}
                                style={{ fontSize: 10, marginLeft: 4 }}
                              >
                                {isFull ? '已满' : isLimited ? '紧张' : '可约'}
                              </Tag>
                            </Radio>
                          </Col>
                        );
                      })}
                    </Row>
                  </Radio.Group>
                </div>
              )}
            </Card>

            {/* ===== ④ 备注与提交 ===== */}
            <Card
              size="small"
              title={
                <Space>
                  <Tag color="green" style={{ borderRadius: 10 }}>
                    ④
                  </Tag>
                  <span style={{ fontWeight: 600 }}>备注信息</span>
                </Space>
              }
              style={{ marginBottom: 16, borderRadius: 8, border: '1px solid #d9f7be' }}
              styles={{ header: { borderBottom: '1px solid #f0f0f0', background: '#fafcff' } }}
            >
              <ProFormTextArea
                name="remark"
                label="备注"
                placeholder="请输入备注信息(可选)"
                fieldProps={{
                  autoSize: { minRows: 2, maxRows: 4 },
                  onChange: (e) => {
                    setFormValues((prev) => ({ ...prev, remark: e.target.value }));
                  },
                }}
              />
            </Card>

            {/* ===== ⑤ 费用明细与提交确认 ===== */}
            <Card
              size="small"
              title={
                <Space>
                  <Tag color="orange" style={{ borderRadius: 10 }}>
                    ⑤
                  </Tag>
                  <span style={{ fontWeight: 600 }}>费用明细</span>
                  <span style={{ color: '#999', fontSize: 12, fontWeight: 400 }}>
                    确认订单信息和费用
                  </span>
                </Space>
              }
              style={{ marginBottom: 16, borderRadius: 8, border: '1px solid #ffd666', background: '#fffbe6' }}
              styles={{ body: { padding: 16 } }}
            >
              {/* 预约信息汇总 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div style={{ padding: '10px 12px', background: '#fff', borderRadius: 6, border: '1px solid #f0f0f0' }}>
                  <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>检测对象</div>
                  <div style={{ fontSize: 13, color: '#333', fontWeight: 500 }}>
                    {getFormString('ring_number') || '未选择'}
                  </div>
                  {selectedProfile && (
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                      {selectedProfile.name}
                    </div>
                  )}
                </div>
                <div style={{ padding: '10px 12px', background: '#fff', borderRadius: 6, border: '1px solid #f0f0f0' }}>
                  <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>检测机构</div>
                  <div style={{ fontSize: 13, color: '#333', fontWeight: 500 }}>
                    {getFormString('test_org') || '未选择'}
                  </div>
                </div>
                <div style={{ padding: '10px 12px', background: '#fff', borderRadius: 6, border: '1px solid #f0f0f0' }}>
                  <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>预约排期</div>
                  <div style={{ fontSize: 13, color: '#333', fontWeight: 500 }}>
                    {selectedDateValue
                      ? `${selectedDateValue.format('YYYY-MM-DD')} ${selectedTimeSlot || ''}`.trim()
                      : '未选择'}
                  </div>
                </div>
              </div>

              {/* 费用明细列表 */}
              <div style={{ background: '#fff', borderRadius: 6, padding: 12, border: '1px solid #ffe58f' }}>
                <div style={{ fontSize: 12, color: '#d48806', marginBottom: 8, fontWeight: 600 }}>
                  💰 费用明细
                </div>
                {(() => {
                  const projects = Array.isArray(formValues.project)
                    ? (formValues.project as string[])
                    : formValues.project
                      ? [formValues.project as string]
                      : [];
                  if (projects.length === 0) {
                    return (
                      <div style={{ fontSize: 12, color: '#bbb', textAlign: 'center', padding: '12px 0' }}>
                        选择检测项目后显示费用
                      </div>
                    );
                  }
                  let total = 0;
                  return (
                    <div>
                      {projects.map((p) => {
                        const price = ITEM_PRICES[p] ?? 0;
                        total += price;
                        const isUrgent = p.includes('加急');
                        return (
                          <div
                            key={p}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              padding: '6px 0',
                              fontSize: 13,
                              borderBottom: '1px dashed #f0f0f0',
                            }}
                          >
                            <span style={{ color: '#555' }}>
                              {isUrgent ? '+ ' : ''}
                              {p}
                            </span>
                            <span
                              style={{
                                color: isUrgent ? '#fa541c' : '#555',
                                fontWeight: 500,
                              }}
                            >
                              ¥{price}
                            </span>
                          </div>
                        );
                      })}
                      <Divider style={{ margin: '10px 0' }} />
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontWeight: 600, color: '#d48806' }}>合计</span>
                        <span
                          style={{
                            fontSize: 20,
                            fontWeight: 700,
                            color: '#fa8c16',
                          }}
                        >
                          ¥{total}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </Card>
          </div>
        </div>
      </DrawerForm>

      {/* 详情抽屉 */}
      <Drawer
        title="预约订单详情"
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={560}
        destroyOnHidden
      >
        {detail && (
          <div style={{ lineHeight: 2 }}>
            <p>
              <strong>订单号:</strong>
              {detail.order_no}
            </p>
            <p>
              <strong>状态:</strong>
              <Tag color={ORDER_STATUS_MAP[detail.status]?.color ?? 'default'}>
                {ORDER_STATUS_MAP[detail.status]?.label ?? detail.status}
              </Tag>
            </p>
            <p>
              <strong>预约人:</strong>
              {detail.user_name}
              {detail.phone ? `(${detail.phone})` : ''}
            </p>
            <p>
              <strong>足环号:</strong>
              {detail.ring_number || '-'}
            </p>
            {detail.gene_profile && (
              <p>
                <strong>关联档案:</strong>
                {detail.gene_profile.ring_number} {detail.gene_profile.name}
                {detail.gene_profile.owner_name ? ` - 鸽主:${detail.gene_profile.owner_name}` : ''}
              </p>
            )}
            <p>
              <strong>检测机构:</strong>
              {detail.test_org || '-'}
            </p>
            <p>
              <strong>检测项目:</strong>
              {detail.project}
            </p>
            <p>
              <strong>预约日期:</strong>
              {detail.scheduled_date || '-'}
            </p>
            <p>
              <strong>备注:</strong>
              {detail.remark || '-'}
            </p>
            <p>
              <strong>创建时间:</strong>
              {detail.created_at ? dayjs(detail.created_at).format('YYYY-MM-DD HH:mm') : '-'}
            </p>
            <p>
              <strong>关联报告:</strong>
              {detail.reports && detail.reports.length > 0
                ? detail.reports.map((r) => r.report_no).join(', ')
                : '暂无'}
            </p>
          </div>
        )}
      </Drawer>

      {/* 排期弹窗 */}
      <ModalForm
        title="订单排期"
        open={scheduleVisible}
        onOpenChange={setScheduleVisible}
        onFinish={handleScheduleSubmit}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        submitter={{ searchConfig: { submitText: '确认排期' } }}
        initialValues={
          scheduleTarget?.scheduled_date
            ? { scheduled_date: dayjs(scheduleTarget.scheduled_date) }
            : {}
        }
      >
        {scheduleTarget && (
          <p>
            订单号:<strong>{scheduleTarget.order_no}</strong> / 预约人:
            {scheduleTarget.user_name} / 检测项目:{scheduleTarget.project}
          </p>
        )}
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>排期日期</label>
          <DatePicker
            value={scheduleDate}
            onChange={(v) => setScheduleDate(v as ScheduleValue)}
            style={{ width: '100%' }}
            placeholder="请选择排期日期"
          />
        </div>
      </ModalForm>

      {/* 日历点击日期查看当日订单 */}
      <Drawer
        title={`${selectedDate} 当日预约订单`}
        open={dateDrawerVisible}
        onClose={() => setDateDrawerVisible(false)}
        width={680}
        destroyOnHidden
      >
        <List
          dataSource={dateOrders}
          locale={{ emptyText: '当日暂无预约订单' }}
          renderItem={(item) => (
            <List.Item
              actions={
                canView
                  ? [
                      <Button
                        key="detail"
                        type="link"
                        size="small"
                        onClick={() => {
                          setDateDrawerVisible(false);
                          openDetail(item);
                        }}
                      >
                        详情
                      </Button>,
                    ]
                  : undefined
              }
            >
              <List.Item.Meta
                title={`${item.order_no} - ${item.user_name}`}
                description={
                  <Space size="small" wrap>
                    <Tag color={ORDER_STATUS_MAP[item.status]?.color ?? 'default'}>
                      {ORDER_STATUS_MAP[item.status]?.label ?? item.status}
                    </Tag>
                    <span>项目:{item.project}</span>
                    {item.ring_number && <span>足环:{item.ring_number}</span>}
                    {item.test_org && <span>机构:{item.test_org}</span>}
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Drawer>
    </>
  );
};

export default DetectionOrder;
