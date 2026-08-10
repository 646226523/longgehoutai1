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
  DatePicker,
  Drawer,
  List,
  Popconfirm,
  Segmented,
  Space,
  Tag,
} from 'antd';
import {
  CalendarOutlined,
  EyeOutlined,
  PlusOutlined,
  TableOutlined,
} from '@ant-design/icons';
import { useRef, useState, useEffect } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
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

// 排期弹窗的日期选择器值类型
type ScheduleValue = Dayjs | null;

// 检测预约订单管理:列表 + 新增/编辑 + 状态流转 + 排期日历
const DetectionOrder = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canView = hasPermission(currentUser, 'detection:view');
  const actionRef = useRef<ActionType>();
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

  // 切换到日历视图时加载当月排期数据
  useEffect(() => {
    if (view !== 'calendar') return;
    const start = dayjs().startOf('month').format('YYYY-MM-DD');
    const end = dayjs().endOf('month').format('YYYY-MM-DD');
    getDetectionCalendar(start, end)
      .then((rows: CalendarDayCount[]) => {
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
        .then(setOrgOptions)
        .catch(() => {});
    }
    if (!itemTypes.length) {
      getDetectionItemTypes()
        .then(setItemTypes)
        .catch(() => {});
    }
    if (!profileOptions.length) {
      getGeneProfileOptions()
        .then(setProfileOptions)
        .catch(() => {});
    }
  };

  const openCreate = () => {
    setEditing(null);
    setDrawerVisible(true);
    loadOptions();
  };

  const openEdit = (record: DetectionOrder) => {
    setEditing(record);
    setDrawerVisible(true);
    loadOptions();
  };

  // 查看详情
  const openDetail = async (record: DetectionOrder) => {
    try {
      const d = await getDetectionOrder(record.id);
      setDetail(d);
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

    const payload = {
      user_name: values.user_name as string,
      phone: (values.phone as string) ?? undefined,
      gene_profile_id: geneProfileId,
      ring_number: profile?.ring_number ?? (values.ring_number as string) ?? '',
      test_org: org?.name ?? (values.test_org as string) ?? '',
      org_id: orgId,
      project: values.project as string,
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
    actionRef.current?.reload();
    return true;
  };

  // 确认预约
  const handleConfirm = async (record: DetectionOrder) => {
    try {
      await confirmDetectionOrder(record.id);
      message.success('已确认预约');
      actionRef.current?.reload();
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
      actionRef.current?.reload();
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
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 删除订单
  const handleDelete = async (record: DetectionOrder) => {
    try {
      await deleteDetectionOrder(record.id);
      message.success('删除成功');
      actionRef.current?.reload();
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
        setDateOrders(rows);
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
              return { data: res.list, success: true, total: res.total };
            } catch {
              return { data: [], success: false, total: 0 };
            }
          }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          options={{ density: false }}
        />
      ) : (
        <Card title="检测排期日历">
          <Calendar cellRender={(date) => dateCellRender(date)} onSelect={handleDateSelect} />
        </Card>
      )}

      {/* 新增/编辑抽屉 */}
      <DrawerForm
        title={editing ? '编辑预约订单' : '新增预约订单'}
        open={drawerVisible}
        onOpenChange={setDrawerVisible}
        onFinish={handleSubmit}
        formRef={formRef}
        drawerProps={{ destroyOnClose: true, maskClosable: false, width: 560 }}
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
      >
        <ProFormText
          name="user_name"
          label="预约人姓名"
          placeholder="请输入预约人姓名"
          rules={[{ required: true, message: '请输入预约人姓名' }]}
        />
        <ProFormText name="phone" label="联系电话" placeholder="请输入联系电话" />
        <ProFormSelect
          name="gene_profile_id"
          label="关联鸽只基因档案"
          placeholder="选择鸽只(可选,自动带出足环号)"
          showSearch
          allowClear
          options={profileOptions.map((o) => ({
            label: `${o.ring_number} ${o.name}`,
            value: o.id,
          }))}
          fieldProps={{
            optionFilterProp: 'label',
            onChange: (value: number) => {
              // 选择鸽只后自动带出足环号
              const profile = profileOptions.find((p) => p.id === value);
              if (profile) {
                formRef.current?.setFieldsValue({ ring_number: profile.ring_number });
              }
            },
          }}
        />
        <ProFormText
          name="ring_number"
          label="足环号"
          placeholder="请输入足环号(未关联档案时可手填)"
        />
        <ProFormSelect
          name="org_id"
          label="检测机构"
          placeholder="选择机构自动带出名称"
          showSearch
          allowClear
          options={orgOptions.map((o) => ({
            label: `${o.name}${o.code ? `(${o.code})` : ''}`,
            value: o.id,
          }))}
          fieldProps={{
            optionFilterProp: 'label',
            onChange: (value: number) => {
              // 选择机构后自动带出机构名称
              const org = orgOptions.find((o) => o.id === value);
              if (org) {
                formRef.current?.setFieldsValue({ test_org: org.name });
              }
            },
          }}
        />
        <ProFormText
          name="test_org"
          label="机构名称"
          placeholder="选择机构后自动带出,或手动输入"
        />
        <ProFormSelect
          name="project"
          label="检测项目"
          placeholder="请选择检测项目"
          rules={[{ required: true, message: '请选择检测项目' }]}
          showSearch
          options={itemTypes.map((i) => ({ label: i.name, value: i.name }))}
        />
        <ProFormDatePicker
          name="scheduled_date"
          label="预约/排期日期"
          placeholder="请选择日期(可选,待确认状态可不填)"
        />
        <ProFormTextArea
          name="remark"
          label="备注"
          placeholder="请输入备注信息(可选)"
          fieldProps={{ autoSize: { minRows: 2, maxRows: 5 } }}
        />
      </DrawerForm>

      {/* 详情抽屉 */}
      <Drawer
        title="预约订单详情"
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={560}
        destroyOnClose
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
        destroyOnClose
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
