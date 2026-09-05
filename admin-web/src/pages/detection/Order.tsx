import {
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  App,
  Badge,
  Button,
  Calendar,
  Card,
  DatePicker,
  Drawer,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Steps,
  Tag,
  Tooltip,
} from 'antd';
import {
  CalendarOutlined,
  EyeOutlined,
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
// ===== 排期用日历热力图组件 =====

interface ScheduleCalendarProps {
  counts: Record<string, number>;
  selectedDate: Dayjs | null;
  onSelectDate: (d: Dayjs) => void;
  orderCountLoaded?: boolean;
}

const ScheduleCalendar = ({ counts, selectedDate, onSelectDate }: ScheduleCalendarProps) => {
  const [dayOrders, setDayOrders] = useState<DetectionOrder[]>([]);
  const [loadingDay, setLoadingDay] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(
    selectedDate ?? dayjs().startOf('month')
  );
  // 跟踪 Calendar 当前视图模式
  const [panelMode, setPanelMode] = useState<'date' | 'month'>('date');
  // 年视图下点击月份后选中的月份
  const [selectedMonth, setSelectedMonth] = useState<string>(
    (selectedDate ?? dayjs()).format('YYYY-MM')
  );

  // 选中某日 → 拉当日订单
  useEffect(() => {
    if (!selectedDate) return;
    const dateStr = selectedDate.format('YYYY-MM-DD');
    setLoadingDay(true);
    getDetectionCalendarByDate(dateStr)
      .then((list) => setDayOrders(list ?? []))
      .catch(() => setDayOrders([]))
      .finally(() => setLoadingDay(false));
  }, [selectedDate?.format('YYYY-MM-DD')]);

  // 获取某日的排单量
  const getCount = (day: Dayjs) => {
    const key = day.format('YYYY-MM-DD');
    return counts[key] ?? 0;
  };

  // 年视图：获取某月累计排单量（同月每天 count 之和）
  const getMonthCount = (yearMonth: string) => {
    // yearMonth 格式 "YYYY-MM"
    let total = 0;
    for (const [key, val] of Object.entries(counts)) {
      if (key.startsWith(yearMonth)) total += val;
    }
    return total;
  };

  // 日视图热力图（根据 count 等级）
  const getHeatStyle = (count: number): { bg: string; text: string; label: string } | null => {
    if (count === 0) return null;
    if (count <= 2) return { bg: '#e6f4ff', text: '#1677ff', label: `${count}` };
    if (count <= 5) return { bg: '#bae0ff', text: '#0958d9', label: `${count}` };
    if (count <= 10) return { bg: '#7cc8ff', text: '#ffffff', label: `${count}` };
    return { bg: '#1677ff', text: '#ffffff', label: `${count}+` };
  };

  // 排单量颜色等级 → 图例
  const HEAT_LEGEND = [
    { bg: '#e6f4ff', text: '#1677ff', range: '1-2' },
    { bg: '#bae0ff', text: '#0958d9', range: '3-5' },
    { bg: '#7cc8ff', text: '#ffffff', range: '6-10' },
    { bg: '#1677ff', text: '#ffffff', range: '10+' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: 480 }}>
      {/* 左侧日历 */}
      <div style={{ flex: 1, padding: 16, borderRight: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            📅 选择排期日期
          </div>
          <div style={{ display: 'flex', gap: 4, fontSize: 10, color: '#8b949e', alignItems: 'center' }}>
            {HEAT_LEGEND.map((l) => (
              <span
                key={l.range}
                style={{
                  background: l.bg,
                  color: l.text,
                  padding: '1px 6px',
                  borderRadius: 3,
                  fontSize: 10,
                  fontWeight: 600,
                }}
              >
                {l.range}
              </span>
            ))}
          </div>
        </div>
        <Calendar
          value={selectedDate ?? currentMonth}
          onSelect={(d) => {
            // 年视图下点击月份：切到月视图 + 选中该月第一天
            if (panelMode === 'month') {
              setSelectedMonth(d.format('YYYY-MM'));
              setPanelMode('date');
              setCurrentMonth(d.startOf('month'));
              onSelectDate(d.startOf('month'));
            } else {
              onSelectDate(d);
            }
          }}
          onPanelChange={(d, mode) => {
            setCurrentMonth(d);
            setPanelMode(mode as 'date' | 'month');
          }}
          fullscreen={false}
          fullCellRender={(day) => {
            const isYearView = panelMode === 'month';

            // === 年视图：每个 cell 是一个月份 ===
            if (isYearView) {
              const yearMonth = day.format('YYYY-MM');
              const total = getMonthCount(yearMonth);
              const heat = getHeatStyle(total);
              const monthName = day.format('M 月');
              const isSelectedMonth = selectedMonth === yearMonth;

              const yearTipTitle = (
                <div style={{ fontSize: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>
                    {day.format('YYYY 年 M 月')}
                  </div>
                  <div style={{ color: '#8b949e' }}>
                    累计排单 <strong style={{ color: '#1677ff' }}>{total}</strong> 单
                  </div>
                </div>
              );

              return (
                <Tooltip title={yearTipTitle} mouseEnterDelay={0.3} placement="top">
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: 54,
                      padding: 2,
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                    }}
                  >
                    {/* 月份名 */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 4,
                        left: 6,
                        fontSize: 11,
                        color: isSelectedMonth ? '#1677ff' : '#8b949e',
                        fontWeight: isSelectedMonth ? 700 : 400,
                      }}
                    >
                      {monthName}
                    </div>

                    {/* 累计排单量色块 */}
                    {heat ? (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 4,
                          left: 4,
                          right: 4,
                          height: 30,
                          background: heat.bg,
                          borderRadius: 5,
                          color: heat.text,
                          fontSize: 13,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: isSelectedMonth ? '0 0 0 2px #1677ff' : 'none',
                        }}
                      >
                        {heat.label} 单
                      </div>
                    ) : (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 4,
                          left: 4,
                          right: 4,
                          height: 30,
                          borderRadius: 5,
                          fontSize: 10,
                          color: '#d9d9d9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        无排单
                      </div>
                    )}
                  </div>
                </Tooltip>
              );
            }

            // === 月视图：每个 cell 是一个日期 ===
            const count = getCount(day);
            const heat = getHeatStyle(count);
            const isSelected = selectedDate?.format('YYYY-MM-DD') === day.format('YYYY-MM-DD');
            const isToday = dayjs().isSame(day, 'day');
            const isOtherMonth = !day.isSame(currentMonth, 'month');
            const isWeekend = day.day() === 0 || day.day() === 6;

            // Tooltip 内容
            const tipTitle = (
              <div style={{ fontSize: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>
                  {day.format('YYYY 年 MM 月 DD 日')}
                  {isToday && <span style={{ color: '#1677ff', marginLeft: 4 }}>· 今天</span>}
                  {isWeekend && <span style={{ color: '#faad14', marginLeft: 4 }}>· 周末</span>}
                </div>
                <div style={{ color: '#8b949e' }}>
                  {count > 0 ? (
                    <>
                      已排期 <strong style={{ color: '#1677ff' }}>{count}</strong> 单
                      {count >= 10 && <span style={{ color: '#ff4d4f', marginLeft: 4 }}>⚠️ 已满</span>}
                      {count >= 5 && count < 10 && <span style={{ color: '#faad14', marginLeft: 4 }}>⚠️ 较繁忙</span>}
                    </>
                  ) : (
                    <span style={{ color: '#52c41a' }}>🎉 暂无排期，可安排</span>
                  )}
                </div>
              </div>
            );

            return (
              <Tooltip title={tipTitle} mouseEnterDelay={0.3} placement="top">
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: 54,
                    padding: 2,
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                  }}
                >
                  {/* 日期小字（灰色角落） */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 4,
                      left: 6,
                      fontSize: 11,
                      color: isOtherMonth ? '#d9d9d9' : isWeekend ? '#faad14' : '#8b949e',
                      fontWeight: isToday ? 700 : 400,
                    }}
                  >
                    {day.date()}
                    {isToday && (
                      <span style={{ color: '#1677ff', marginLeft: 2, fontSize: 9 }}>今</span>
                    )}
                  </div>

                  {/* 排单量色块 */}
                  {heat && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 4,
                        left: 4,
                        right: 4,
                        height: 30,
                        background: heat.bg,
                        borderRadius: 5,
                        color: heat.text,
                        fontSize: 13,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isSelected ? '0 0 0 2px #1677ff' : 'none',
                      }}
                    >
                      {heat.label} 单
                    </div>
                  )}

                  {/* 选中态（无排单量的日期也能选中） */}
                  {isSelected && !heat && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 4,
                        left: 4,
                        right: 4,
                        height: 30,
                        background: '#e6f4ff',
                        border: '1px solid #1677ff',
                        borderRadius: 5,
                        color: '#1677ff',
                        fontSize: 11,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                      }}
                    >
                      在此排期
                    </div>
                  )}
                </div>
              </Tooltip>
            );
          }}
        />
      </div>

      {/* 右侧面板：月视图→当日订单 / 年视图→月份统计 */}
      <div style={{ width: 340, padding: 16, background: '#fafafa', display: 'flex', flexDirection: 'column' }}>
        {panelMode === 'month' ? (
          // ========== 年视图：月份统计 ==========
          (() => {
            const month = selectedMonth;
            const total = getMonthCount(month);
            // 取该月每天的 counts
            const daily: { date: string; count: number }[] = [];
            for (const [key, val] of Object.entries(counts)) {
              if (key.startsWith(month)) daily.push({ date: key, count: val });
            }
            daily.sort((a, b) => a.date.localeCompare(b.date));
            const maxDay = daily.reduce((m, d) => (d.count > m.count ? d : m), { date: '', count: 0 });
            const minDay = daily.filter((d) => d.count > 0).reduce(
              (m, d) => (d.count < m.count ? d : m),
              { date: '', count: Infinity }
            );
            const avg = daily.length > 0 ? (total / daily.length).toFixed(1) : '0';
            const maxCount = Math.max(1, ...daily.map((d) => d.count));

            return (
              <>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
                  📊 {month.replace('-', ' 年 ')} 月排单统计
                </div>

                {/* 3 个 KPI */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <div style={{ flex: 1, background: 'white', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#8b949e' }}>总排单量</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#1677ff' }}>{total}</div>
                    <div style={{ fontSize: 10, color: '#8b949e' }}>单</div>
                  </div>
                  <div style={{ flex: 1, background: 'white', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#8b949e' }}>日均排单</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#13c2c2' }}>{avg}</div>
                    <div style={{ fontSize: 10, color: '#8b949e' }}>单/天</div>
                  </div>
                  <div style={{ flex: 1, background: 'white', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#8b949e' }}>活跃天数</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#722ed1' }}>{daily.length}</div>
                    <div style={{ fontSize: 10, color: '#8b949e' }}>天</div>
                  </div>
                </div>

                {/* 最高/最低 */}
                <Card size="small" style={{ marginBottom: 12, borderRadius: 8 }} styles={{ body: { padding: 12 } }}>
                  {total === 0 ? (
                    <div style={{ textAlign: 'center', color: '#8b949e', fontSize: 12, padding: '20px 0' }}>
                      🎉 该月暂无排单
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ fontSize: 12, color: '#8b949e' }}>🔥 最高峰</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#ff4d4f' }}>
                          {maxDay.date.slice(8)} 日 · {maxDay.count} 单
                        </div>
                      </div>
                      {minDay.count < Infinity && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: 12, color: '#8b949e' }}>❄️ 最低谷</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#52c41a' }}>
                            {minDay.date.slice(8)} 日 · {minDay.count} 单
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </Card>

                {/* 每日柱状图（迷你） */}
                {daily.length > 0 && (
                  <Card size="small" style={{ borderRadius: 8, flex: 1 }} styles={{ body: { padding: 12 } }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>每日排单量</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80 }}>
                      {daily.map((d) => {
                        const h = Math.max(4, (d.count / maxCount) * 72);
                        const heat = getHeatStyle(d.count);
                        return (
                          <Tooltip key={d.date} title={`${d.date}: ${d.count} 单`} mouseEnterDelay={0.2}>
                            <div
                              style={{
                                flex: 1,
                                height: h,
                                background: heat?.bg ?? '#f0f0f0',
                                borderRadius: '3px 3px 0 0',
                                minWidth: 4,
                              }}
                            />
                          </Tooltip>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#8b949e', marginTop: 4 }}>
                      <span>{daily[0]?.date.slice(5)}</span>
                      <span>{daily[daily.length - 1]?.date.slice(5)}</span>
                    </div>
                  </Card>
                )}
              </>
            );
          })()
        ) : !selectedDate ? (
          <div style={{ color: '#8b949e', fontSize: 12, textAlign: 'center', padding: '40px 0' }}>
            左侧日历点选一个日期
          </div>
        ) : (
          <>
            {/* 当前订单排期预估 */}
            <Card
              size="small"
              style={{ marginBottom: 12, borderRadius: 8 }}
              styles={{ body: { padding: 12 } }}
            >
              <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 4 }}>当前订单排期预估</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1677ff', marginBottom: 6 }}>
                {selectedDate.format('YYYY年MM月DD日')}
              </div>
              <div style={{ fontSize: 11, color: '#8b949e' }}>
                当天已有 <strong style={{ color: '#1f2328' }}>{dayOrders.length}</strong> 个排期
                {dayOrders.length >= 5 && (
                  <Tag color="orange" style={{ marginLeft: 6, fontSize: 11 }}>⚠️ 较繁忙</Tag>
                )}
                {dayOrders.length >= 10 && (
                  <Tag color="red" style={{ marginLeft: 6, fontSize: 11 }}>⚠️ 爆满预警</Tag>
                )}
              </div>
            </Card>

            {/* 当日已有订单 */}
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
              当日已有订单 ({dayOrders.length})
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loadingDay ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#8b949e' }}>加载中...</div>
              ) : dayOrders.length === 0 ? (
                <div style={{ color: '#8b949e', fontSize: 12, textAlign: 'center', padding: '30px 0' }}>
                  🎉 当日暂无排期<br />适合安排
                </div>
              ) : (
                <div>
                  {dayOrders.map((o) => (
                    <div
                      key={o.id}
                      style={{
                        padding: '8px 10px',
                        background: 'white',
                        borderRadius: 6,
                        marginBottom: 6,
                        borderLeft: `3px solid ${ORDER_STATUS_MAP[o.status]?.color ?? '#d9d9d9'}`,
                        fontSize: 12,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontWeight: 600 }}>{o.order_no}</span>
                        <Tag
                          color={ORDER_STATUS_MAP[o.status]?.color ?? 'default'}
                          style={{ margin: 0, fontSize: 10 }}
                        >
                          {ORDER_STATUS_MAP[o.status]?.label ?? o.status}
                        </Tag>
                      </div>
                      <div style={{ color: '#8b949e', fontSize: 11 }}>
                        {o.user_name} · {o.project}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// 排期弹窗的日期选择器值类型
type ScheduleValue = Dayjs | null;

// 检测预约订单管理:列表 + 新增/编辑 + 状态流转 + 排期日历
const DetectionOrder = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canView = hasPermission(currentUser, 'detection:view');
  const actionRef = useRef<ActionType>();
  const { tableLoading, handleRefresh } = useTableRefresh(actionRef, { messageApi: message });
  const [formRef] = Form.useForm();

  // 提交按钮状态
  const [canSubmit, setCanSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
    setCanSubmit(false);
    formRef.resetFields();
    setDrawerVisible(true);
    loadOptions();
  };

  const openEdit = (record: DetectionOrder) => {
    setEditing(record);
    formRef.setFieldsValue({
      user_name: record.user_name,
      phone: record.phone ?? undefined,
      ring_number: record.ring_number,
      org_id: record.org_id ?? undefined,
      test_org: record.test_org,
      project: record.project,
      scheduled_date: record.scheduled_date ? dayjs(record.scheduled_date) : undefined,
      remark: record.remark ?? undefined,
    });
    setCanSubmit(!!record.user_name && !!record.project);
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
  // Drawer 提交按钮: 先校验, 失败时滚动+高亮
  const handleDrawerSubmit = async () => {
    try {
      const values = await formRef.validateFields();
      setSubmitting(true);
      await handleSubmit(values);
    } catch (err: any) {
      const firstField = err?.errorFields?.[0];
      if (firstField?.name?.length) {
        message.warning('请先完善必填项');
        setTimeout(() => {
          const name = firstField.name[0];
          const el = document.querySelector('label[for="' + name + '"]')?.closest('.ant-form-item');
          el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
          if (el instanceof HTMLElement) {
            el.style.transition = 'box-shadow 0.3s';
            el.style.boxShadow = '0 0 0 2px #ff4d4f';
            setTimeout(() => { el.style.boxShadow = ''; }, 2000);
          }
        }, 50);
      }
    } finally {
      setSubmitting(false);
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
    formRef.resetFields();
    setCanSubmit(false);
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
    // 打开排期弹窗前加载 3 个月范围的排单量（日历翻月也有数据）
    const anchor = record.scheduled_date ? dayjs(record.scheduled_date) : dayjs();
    const start = anchor.subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
    const end = anchor.add(2, 'month').endOf('month').format('YYYY-MM-DD');
    getDetectionCalendar(start, end)
      .then((rows: CalendarDayCount[] | null) => {
        if (!rows) return;
        const map: Record<string, number> = {};
        rows.forEach((r) => {
          map[r.date] = r.count;
        });
        setCalendarCounts(map);
      })
      .catch(() => {});
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

      {/* 新增/编辑抽屉 - 原生 Form + 3 步卡片 */}
      <Drawer
        title={
          <Space>
            <span>{editing ? '编辑预约订单' : '新增预约订单'}</span>
            <Tag color="blue">{editing ? '订单号 ' + editing.order_no : '新建订单'}</Tag>
          </Space>
        }
        open={drawerVisible}
        onClose={() => { setDrawerVisible(false); }}
        destroyOnClose={false}
        maskClosable={false}
        width="min(92vw, 960px)"
        extra={
          <Button
            type="primary"
            disabled={!canSubmit}
            loading={submitting}
            onClick={handleDrawerSubmit}
          >
            {editing ? '保存修改' : '确认提交'}
          </Button>
        }
      >
        <Form
          form={formRef}
          layout="vertical"
          preserve={false}
          initialValues={
            editing ? {
              user_name: editing.user_name,
              phone: editing.phone ?? undefined,
              ring_number: editing.ring_number,
              project: editing.project,
              remark: editing.remark ?? undefined,
            } : {}
          }
          onValuesChange={(_, all) => setCanSubmit(!!(all.user_name && all.project))}
          onFinish={handleSubmit}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '8px 4px' }}>

            {/* Step 1: 检测对象 */}
            <Card
              size="small"
              styles={{ body: { padding: 20 } }}
              style={{ borderLeft: '3px solid #1677ff' }}
              title={<Space><span style={{ fontSize: 16 }}>1️⃣</span><span style={{ fontWeight: 600 }}>检测对象</span><span style={{ color: '#ff4d4f', fontSize: 12 }}>* 必填</span></Space>}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Form.Item label="预约人姓名" name="user_name" rules={[{ required: true, message: '请输入预约人姓名' }]}>
                  <Input placeholder="请输入鸽主真实姓名" maxLength={32} />
                </Form.Item>
                <Form.Item label="联系电话" name="phone" rules={[{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' }]}>
                  <Input placeholder="选填，用于联系鸽主" maxLength={11} />
                </Form.Item>
                <Form.Item label="鸽子足环号" name="ring_number">
                  <Input placeholder="选填，如 CHN-2023-000001" maxLength={40} />
                </Form.Item>
                <div />
              </div>
            </Card>

            {/* Step 2: 检测服务 */}
            <Card
              size="small"
              styles={{ body: { padding: 20 } }}
              style={{ borderLeft: '3px solid #52c41a' }}
              title={<Space><span style={{ fontSize: 16 }}>2️⃣</span><span style={{ fontWeight: 600 }}>检测服务</span><span style={{ color: '#ff4d4f', fontSize: 12 }}>* 必填</span></Space>}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Form.Item label="检测机构" name="org_id">
                  <Select
                    allowClear
                    placeholder="选填，从已有机构选择"
                    options={orgOptions.map(o => ({ label: o.name, value: o.id }))}
                    onChange={(v) => {
                      if (v) {
                        const org = orgOptions.find(o => o.id === v);
                        if (org) formRef.setFieldsValue({ test_org: org.name });
                      } else {
                        formRef.setFieldsValue({ test_org: undefined });
                      }
                    }}
                  />
                </Form.Item>
                <Form.Item label="检测机构名称(手填)" name="test_org">
                  <Input placeholder="未选机构时可手填" maxLength={64} />
                </Form.Item>
                <Form.Item label="检测项目" name="project" rules={[{ required: true, message: '请选择检测项目' }]}>
                  <Select
                    placeholder="请选择需要的检测项目"
                    options={itemTypes.map(t => ({ label: t.name, value: t.name }))}
                  />
                </Form.Item>
                <div />
              </div>
            </Card>

            {/* Step 3: 排期 */}
            <Card
              size="small"
              styles={{ body: { padding: 20 } }}
              style={{ borderLeft: '3px solid #fa8c16' }}
              title={<Space><span style={{ fontSize: 16 }}>3️⃣</span><span style={{ fontWeight: 600 }}>排期安排</span><span style={{ color: '#999', fontSize: 12 }}>选填</span></Space>}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Form.Item label="预约日期" name="scheduled_date">
                  <DatePicker style={{ width: '100%' }} placeholder="选填" />
                </Form.Item>
                <Form.Item label="订单备注" name="remark">
                  <Input.TextArea rows={4} placeholder="选填，特别说明或注意事项" maxLength={200} showCount />
                </Form.Item>
              </div>
            </Card>

          </div>
        </Form>
      </Drawer>

      {/* 详情抽屉 - 卡片网格布局 */}
      <Drawer
        title={
          <Space>
            <span>预约订单详情</span>
            {detail && (
              <Tag color={ORDER_STATUS_MAP[detail.status]?.color ?? 'default'}>
                {ORDER_STATUS_MAP[detail.status]?.label ?? detail.status}
              </Tag>
            )}
          </Space>
        }
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={800}
        destroyOnHidden
        styles={{ body: { padding: 0, background: '#f5f7fa' } }}
      >
        {!detail ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#8b949e' }}>暂无数据</div>
        ) : (
          <div style={{ padding: 16 }}>
            {/* ===== 顶部渐变订单卡 ===== */}
            <Card
              size="small"
              variant="borderless"
              style={{ marginBottom: 12, borderRadius: 10 }}
              styles={{ body: { padding: 0 } }}
            >
              <div
                style={{
                  background: 'linear-gradient(135deg, #13c2c2 0%, #08979c 100%)',
                  color: 'white',
                  padding: '20px 24px',
                  borderRadius: '10px 10px 0 0',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 1 }}>
                    🧬 基因检测预约订单
                  </div>
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      padding: '4px 14px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {ORDER_STATUS_MAP[detail.status]?.label ?? detail.status}
                  </div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
                  {detail.order_no}
                </div>
                <div style={{ fontSize: 12, opacity: 0.9, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <span>👤 {detail.user_name} {detail.phone && `· ${detail.phone}`}</span>
                  <span>🔬 {detail.test_org}</span>
                  <span>📋 {detail.project}</span>
                </div>
              </div>
              {/* KPI 栏 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  borderTop: '1px solid #f0f2f5',
                }}
              >
                {[
                  { label: '鸽子足环', value: detail.ring_number ?? '-', color: '#1677ff' },
                  { label: '预约日期', value: detail.scheduled_date ?? '未排期', color: '#52c41a' },
                  { label: '报告数', value: detail.reports?.length ?? 0, color: '#722ed1' },
                  { label: '创建时间', value: detail.created_at ? dayjs(detail.created_at).format('MM-DD HH:mm') : '-', color: '#8b949e' },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    style={{
                      textAlign: 'center',
                      padding: '14px 6px',
                      borderRight: '1px solid #f0f2f5',
                    }}
                  >
                    <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4 }}>{kpi.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: kpi.color }}>
                      {kpi.value}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* ===== 2x2 卡片网格 ===== */}
            <div
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
            >
              {/* 左上: 鸽子档案 */}
              <Card
                size="small"
                title={<span style={{ fontSize: 13, fontWeight: 600 }}>🕊️ 鸽子档案</span>}
                variant="borderless"
                style={{ borderRadius: 10 }}
                styles={{ body: { padding: '12px 16px' } }}
              >
                {detail.gene_profile ? (
                  <div style={{ fontSize: 13 }}>
                    <div style={{ padding: '8px 0', borderBottom: '1px solid #f0f2f5' }}>
                      <span style={{ color: '#8b949e', width: 70, display: 'inline-block' }}>鸽子名称</span>
                      <span style={{ fontWeight: 600 }}>{detail.gene_profile.name}</span>
                    </div>
                    <div style={{ padding: '8px 0', borderBottom: '1px solid #f0f2f5' }}>
                      <span style={{ color: '#8b949e', width: 70, display: 'inline-block' }}>足环号</span>
                      <Tag color="blue">{detail.gene_profile.ring_number}</Tag>
                    </div>
                    <div style={{ padding: '8px 0' }}>
                      <span style={{ color: '#8b949e', width: 70, display: 'inline-block' }}>鸽主</span>
                      <span>{detail.gene_profile.owner_name ?? '-'}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#8b949e', fontSize: 12, padding: '12px 0' }}>
                    未关联鸽子档案
                  </div>
                )}
              </Card>

              {/* 右上: 检测信息 */}
              <Card
                size="small"
                title={<span style={{ fontSize: 13, fontWeight: 600 }}>🔬 检测信息</span>}
                variant="borderless"
                style={{ borderRadius: 10 }}
                styles={{ body: { padding: '12px 16px' } }}
              >
                <div style={{ fontSize: 13 }}>
                  <div style={{ padding: '8px 0', borderBottom: '1px solid #f0f2f5' }}>
                    <span style={{ color: '#8b949e', width: 70, display: 'inline-block' }}>检测机构</span>
                    <span>{detail.test_org ?? '-'}</span>
                  </div>
                  <div style={{ padding: '8px 0', borderBottom: '1px solid #f0f2f5' }}>
                    <span style={{ color: '#8b949e', width: 70, display: 'inline-block' }}>检测项目</span>
                    <Tag color="purple">{detail.project}</Tag>
                  </div>
                  <div style={{ padding: '8px 0', borderBottom: '1px solid #f0f2f5' }}>
                    <span style={{ color: '#8b949e', width: 70, display: 'inline-block' }}>预约日期</span>
                    <span>{detail.scheduled_date ?? '未排期'}</span>
                  </div>
                  <div style={{ padding: '8px 0' }}>
                    <span style={{ color: '#8b949e', width: 70, display: 'inline-block' }}>备注</span>
                    <span>{detail.remark || '—'}</span>
                  </div>
                </div>
              </Card>

              {/* 左下: 状态时间线 */}
              <Card
                size="small"
                title={<span style={{ fontSize: 13, fontWeight: 600 }}>📌 订单状态</span>}
                variant="borderless"
                style={{ borderRadius: 10 }}
                styles={{ body: { padding: '14px 16px 4px' } }}
              >
                <Steps
                  direction="vertical"
                  size="small"
                  status={detail.status === 'cancelled' ? 'error' : 'process'}
                  current={
                    ['pending', 'scheduled', 'testing', 'completed', 'cancelled'].indexOf(detail.status) >= 0
                      ? ['pending', 'scheduled', 'testing', 'completed', 'cancelled'].indexOf(detail.status)
                      : 0
                  }
                  items={[
                    { title: '待确认', description: '等待运营确认' },
                    { title: '已排期', description: detail.scheduled_date || '—' },
                    { title: '检测中', description: '样本送检中' },
                    { title: '已完成', description: detail.reports?.length > 0 ? `${detail.reports.length} 份报告` : '—' },
                  ]}
                />
              </Card>

              {/* 右下: 关联报告 */}
              <Card
                size="small"
                title={<span style={{ fontSize: 13, fontWeight: 600 }}>📄 关联报告 ({detail.reports?.length ?? 0})</span>}
                variant="borderless"
                style={{ borderRadius: 10 }}
                styles={{ body: { padding: '8px 16px 12px' } }}
              >
                {detail.reports && detail.reports.length > 0 ? (
                  <div>
                    {detail.reports.map((r) => (
                      <div
                        key={r.id}
                        style={{
                          padding: '10px 0',
                          borderBottom: '1px solid #f0f2f5',
                          fontSize: 12.5,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontWeight: 600 }}>
                            📋 {r.report_no}
                          </span>
                          <Tag color="purple">{r.project}</Tag>
                        </div>
                        <div style={{ color: '#8b949e', fontSize: 11, marginBottom: 4 }}>
                          {r.test_org} · {r.test_date || '-'}
                        </div>
                        {r.result && (
                          <div
                            style={{
                              background: '#f6f8fa',
                              padding: '6px 10px',
                              borderRadius: 4,
                              fontSize: 11.5,
                              color: '#57606a',
                              lineHeight: 1.6,
                            }}
                          >
                            {r.result}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#8b949e', fontSize: 12, padding: '12px 0', textAlign: 'center' }}>
                    暂无检测报告
                  </div>
                )}
              </Card>
            </div>

            <div
              style={{
                marginTop: 10,
                fontSize: 11,
                color: '#8b949e',
                paddingTop: 10,
                borderTop: '1px solid #f0f2f5',
                textAlign: 'right',
              }}
            >
              创建: {detail.created_at ? dayjs(detail.created_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
              {detail.updated_at && ` · 更新: ${dayjs(detail.updated_at).format('YYYY-MM-DD HH:mm:ss')}`}
            </div>
          </div>
        )}
      </Drawer>

      {/* 排期弹窗 - 日历热力图 + 当日订单 */}
      <Modal
        title={
          <Space>
            <span>订单排期</span>
            {scheduleTarget && (
              <span style={{ fontSize: 12, color: '#8b949e', fontWeight: 400 }}>
                {scheduleTarget.order_no} · {scheduleTarget.user_name} · {scheduleTarget.project}
              </span>
            )}
          </Space>
        }
        open={scheduleVisible}
        onCancel={() => setScheduleVisible(false)}
        onOk={async () => {
          if (!scheduleTarget || !scheduleDate) {
            message.warning('请在日历中选择排期日期');
            return;
          }
          try {
            await scheduleDetectionOrder(scheduleTarget.id, scheduleDate.format('YYYY-MM-DD'));
            message.success('排期成功');
            setScheduleVisible(false);
            handleRefresh();
          } catch (e: any) {
            message.error(e?.message || '排期失败');
          }
        }}
        okText="确认排期"
        cancelText="取消"
        width={960}
        destroyOnHidden
        maskClosable={false}
        styles={{ body: { padding: 0 } }}
      >
        {scheduleTarget && (
          <ScheduleCalendar
            key={scheduleTarget.id}
            counts={calendarCounts}
            selectedDate={scheduleDate}
            onSelectDate={setScheduleDate}
            orderCountLoaded={true}
          />
        )}
      </Modal>

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
