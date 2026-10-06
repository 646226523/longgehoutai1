import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { App, Button, Collapse, Drawer, Input, Popconfirm, Space, Tag, Tooltip } from 'antd';
import {
  AlertOutlined,
  CheckCircleFilled,
  CheckOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';

import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import RefreshButton from '../../components/RefreshButton';
import { useTableRefresh } from '../../hooks/useTableRefresh';
import {
  approveGeneSubmission,
  getGeneSubmissions,
  rejectGeneSubmission,
  type GeneSubmission,
} from '../../services/gene';

const GENDER_MAP: Record<string, { label: string; color: string }> = {
  male: { label: '雄 ♂', color: 'blue' },
  female: { label: '雌 ♀', color: 'magenta' },
  unknown: { label: '未知', color: 'default' },
};

const STATUS_MAP: Record<string, { text: string; color: string }> = {
  pending: { text: '待审核', color: 'warning' },
  approved: { text: '已通过', color: 'success' },
  rejected: { text: '已驳回', color: 'error' },
};

// 字段完整性评分权重
const COMPLETENESS_CHECKS: Array<{
  key: keyof GeneSubmission;
  label: string;
}> = [
  { key: 'breed', label: '品种' },
  { key: 'bloodline', label: '血统' },
  { key: 'color', label: '羽色' },
  { key: 'eye_color', label: '眼砂' },
  { key: 'birth_date', label: '出生日期' },
  { key: 'owner_phone', label: '鸽主电话' },
];

// 取首字作为头像字母（中文取第一字，英文取首字母大写）
function getAvatarText(name?: string | null): string {
  if (!name) return '?';
  const ch = name.trim().charAt(0);
  return ch.toUpperCase();
}

// 审核诊断项类型
type DiagnosticItem = {
  level: 'warning' | 'pass' | 'suggest';
  icon: string;
  title: string;
  desc?: string;
};

/**
 * 根据提交数据自动生成审核诊断 checklist
 * 帮助审核员快速识别重点关注项
 */
function buildDiagnostics(s: GeneSubmission): DiagnosticItem[] {
  const items: DiagnosticItem[] = [];

  // 鸽主 ≠ 提交人
  if (s.submitter_name && s.owner_name && s.submitter_name !== s.owner_name) {
    items.push({
      level: 'warning',
      icon: '👤',
      title: '非鸽主本人提交',
      desc: `鸽主「${s.owner_name}」≠ 提交人「${s.submitter_name}」，建议核实授权关系`,
    });
  } else if (s.submitter_name && s.owner_name && s.submitter_name === s.owner_name) {
    items.push({ level: 'pass', icon: '✅', title: '鸽主本人提交', desc: '提交人 = 鸽主，身份一致' });
  }

  // 鸽主电话
  if (!s.owner_phone) {
    items.push({ level: 'warning', icon: '📞', title: '鸽主电话缺失', desc: '无法联系鸽主核实信息' });
  } else {
    items.push({ level: 'pass', icon: '📞', title: '鸽主电话已填写', desc: s.owner_phone });
  }

  // 必填字段完整性
  const missing: string[] = [];
  COMPLETENESS_CHECKS.forEach((c) => {
    const v = s[c.key];
    if (!v || (typeof v === 'string' && v.trim() === '')) missing.push(c.label);
  });
  if (missing.length > 0) {
    items.push({
      level: 'suggest',
      icon: '📝',
      title: `描述信息缺失 ${missing.length} 项`,
      desc: missing.join('、'),
    });
  } else {
    items.push({ level: 'pass', icon: '📝', title: '描述信息完整', desc: '品种/血统/羽色/眼砂/出生日期全部已填' });
  }

  // 足环号格式（宽松校验）
  const ringOk = s.ring_number && /[A-Za-z0-9\u4e00-\u9fa5]/.test(s.ring_number);
  if (ringOk) {
    items.push({ level: 'pass', icon: '🔢', title: '足环号格式正常', desc: s.ring_number });
  } else {
    items.push({ level: 'warning', icon: '🔢', title: '足环号疑似异常' });
  }

  // 提交时间（如果超过 7 天未审核，提示紧急）
  if (s.created_at) {
    const days = dayjs().diff(dayjs(s.created_at), 'day');
    if (days >= 7 && s.status === 'pending') {
      items.push({ level: 'warning', icon: '⏰', title: `滞留 ${days} 天未审核`, desc: '建议尽快处理' });
    } else if (days < 7) {
      items.push({ level: 'pass', icon: '⏰', title: `提交于 ${days === 0 ? '今天' : `${days} 天前`}`, desc: dayjs(s.created_at).format('YYYY-MM-DD HH:mm') });
    }
  }

  // 性别
  if (!s.gender || s.gender === 'unknown') {
    items.push({ level: 'suggest', icon: '⚧', title: '性别未确定', desc: '可通过 DNA 检测补充' });
  }

  return items;
}

// 分隔线样式
const DIVIDER = { height: 1, background: 'linear-gradient(90deg, transparent, #e8e8e8, transparent)', margin: '12px 0' };

// 字段行样式（替代 Descriptions 的统一 label-value 行）
const fieldRowStyle = {
  display: 'flex',
  padding: '6px 0',
  fontSize: 13,
  lineHeight: '22px',
} as const;

const fieldLabelStyle = {
  width: 88,
  flexShrink: 0,
  color: '#8c8c8c',
  fontWeight: 500,
} as const;

const fieldValueStyle = {
  flex: 1,
  color: '#262626',
  wordBreak: 'break-all' as const,
};

// 基因档案审核:待审列表 + 审核详情抽屉(通过/驳回)
const GeneAudit = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canAudit = hasPermission(currentUser, 'gene:audit');
  const actionRef = useRef<ActionType>();
  const { tableLoading, handleRefresh } = useTableRefresh(actionRef, { messageApi: message });

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [current, setCurrent] = useState<GeneSubmission | null>(null);
  const [rejectRemark, setRejectRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const diagnostics = useMemo(() => (current ? buildDiagnostics(current) : []), [current]);

  const openDetail = (record: GeneSubmission) => {
    setCurrent(record);
    setRejectRemark('');
    setDrawerVisible(true);
  };

  // 审核通过
  const handleApprove = async () => {
    if (!current) return;
    setSubmitting(true);
    try {
      await approveGeneSubmission(current.id);
      message.success('审核通过，已生成正式基因档案与溯源二维码');
      setDrawerVisible(false);
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    } finally {
      setSubmitting(false);
    }
  };

  // 驳回
  const handleReject = async () => {
    if (!current) return;
    const remark = rejectRemark.trim();
    if (!remark) {
      message.warning('请填写驳回理由');
      return;
    }
    setSubmitting(true);
    try {
      await rejectGeneSubmission(current.id, remark);
      message.success('已驳回');
      setDrawerVisible(false);
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ProColumns<GeneSubmission>[] = [
    { title: '序号', dataIndex: 'index', valueType: 'index', width: 60, hideInSearch: true },
    { title: '足环号', dataIndex: 'ring_number', width: 160, ellipsis: true, hideInSearch: true },
    { title: '鸽名', dataIndex: 'name', width: 110, ellipsis: true, hideInSearch: true },
    {
      title: '性别',
      dataIndex: 'gender',
      width: 80,
      hideInSearch: true,
      render: (_, record) => GENDER_MAP[record.gender]?.label ?? record.gender,
    },
    { title: '品种', dataIndex: 'breed', width: 100, ellipsis: true, hideInSearch: true },
    { title: '鸽主', dataIndex: 'owner_name', width: 100, ellipsis: true, hideInSearch: true },
    { title: '提交人', dataIndex: 'submitter_name', width: 100, ellipsis: true, hideInSearch: true },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      valueEnum: {
        pending: { text: '待审核' },
        approved: { text: '已通过' },
        rejected: { text: '已驳回' },
      },
      render: (_, record) => {
        const s = STATUS_MAP[record.status] ?? { text: record.status, color: 'default' };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: '关键词',
      dataIndex: 'keyword',
      hideInTable: true,
    },
    {
      title: '提交时间',
      dataIndex: 'created_at',
      width: 160,
      hideInSearch: true,
      render: (_, record) => (record.created_at ? dayjs(record.created_at).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => openDetail(record)}>
          审核
        </Button>
      ),
    },
  ];

  // ========== 审核详情抽屉内容 ==========

  const drawerContent = () => {
    if (!current) return null;
    const g = GENDER_MAP[current.gender] ?? { label: current.gender, color: 'default' };
    const st = STATUS_MAP[current.status] ?? { text: current.status, color: 'default' };
    const isPending = current.status === 'pending';

    return (
      <div style={{ padding: '0 24px 24px', overflow: 'auto' }}>
        {/* ============ HERO 概览卡 ============ */}
        <div
          style={{
            margin: '0 -24px 16px',
            padding: '28px 24px 24px',
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 60%, #3b7db5 100%)',
            color: '#fff',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* 装饰圆 */}
          <div
            style={{
              position: 'absolute',
              top: -60,
              right: -40,
              width: 180,
              height: 180,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: -30,
              right: 80,
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.04)',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative' }}>
            {/* 头像 */}
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #f0c674, #cb7a23)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                fontWeight: 700,
                color: '#fff',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                flexShrink: 0,
              }}
            >
              {getAvatarText(current.name)}
            </div>

            {/* 基本信息 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>{current.name || '未命名'}</span>
                <Tag color={g.color} style={{ margin: 0, background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }}>
                  {g.label}
                </Tag>
                <Tag
                  color={st.color}
                  style={{
                    margin: 0,
                    background: isPending ? '#faad14' : st.color === 'success' ? '#52c41a' : '#ff4d4f',
                    color: '#fff',
                    border: 'none',
                  }}
                >
                  {st.text}
                </Tag>
              </div>
              <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 14, opacity: 0.9 }}>
                {current.ring_number}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                {current.breed || '未知品种'}
                {current.bloodline ? ` · ${current.bloodline}` : ''}
              </div>
            </div>
          </div>

          {/* 提交元信息 */}
          <div
            style={{
              display: 'flex',
              gap: 24,
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid rgba(255,255,255,0.15)',
              fontSize: 12,
              opacity: 0.85,
              position: 'relative',
            }}
          >
            <div>
              <span style={{ opacity: 0.6 }}>提交人</span>{' '}
              <span style={{ fontWeight: 500 }}>{current.submitter_name || current.owner_name || '-'}</span>
            </div>
            <div>
              <span style={{ opacity: 0.6 }}>鸽主</span>{' '}
              <span style={{ fontWeight: 500 }}>{current.owner_name || '-'}</span>
            </div>
            <div>
              <span style={{ opacity: 0.6 }}>提交时间</span>{' '}
              <span>{current.created_at ? dayjs(current.created_at).format('MM-DD HH:mm') : '-'}</span>
            </div>
          </div>
        </div>

        {/* ============ 审核诊断卡 ============ */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <AlertOutlined style={{ color: '#faad14' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#262626' }}>审核诊断</span>
            <span style={{ fontSize: 12, color: '#8c8c8c' }}>— 自动识别需关注项</span>
          </div>

          <div style={{ background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0', overflow: 'hidden' }}>
            {diagnostics.map((d, i) => {
              const levelStyle = {
                warning: { bg: '#fffbe6', border: '#ffe58f', text: '#ad6800', iconBg: '#faad14' },
                pass: { bg: '#f6ffed', border: '#b7eb8f', text: '#389e0d', iconBg: '#52c41a' },
                suggest: { bg: '#e6f4ff', border: '#91caff', text: '#0958d9', iconBg: '#1677ff' },
              }[d.level];

              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '10px 14px',
                    background: levelStyle.bg,
                    borderLeft: `3px solid ${levelStyle.iconBg}`,
                    borderBottom: i < diagnostics.length - 1 ? '1px solid #f0f0f0' : 'none',
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontSize: 14, lineHeight: '18px' }}>{d.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: levelStyle.text }}>{d.title}</div>
                    {d.desc && <div style={{ color: '#595959', fontSize: 12, marginTop: 2 }}>{d.desc}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ============ 分组详细信息 ============ */}
        <Collapse
          ghost
          defaultActiveKey={['bird', 'person']}
          items={[
            {
              key: 'bird',
              label: (
                <span style={{ fontWeight: 600, fontSize: 14 }}>
                  🐦 鸽子身份信息
                  <span style={{ color: '#8c8c8c', fontSize: 12, fontWeight: 400, marginLeft: 8 }}>
                    品种 / 血统 / 外观
                  </span>
                </span>
              ),
              children: (
                <div style={{ padding: '4px 4px 8px' }}>
                  <div style={fieldRowStyle}>
                    <div style={fieldLabelStyle}>足环号</div>
                    <div style={{ ...fieldValueStyle, fontFamily: 'ui-monospace, Menlo, monospace' }}>{current.ring_number}</div>
                  </div>
                  <div style={DIVIDER} />
                  <div style={{ display: 'flex', gap: 32 }}>
                    <div style={{ flex: 1 }}>
                      <div style={fieldRowStyle}>
                        <div style={fieldLabelStyle}>鸽名</div>
                        <div style={fieldValueStyle}>{current.name}</div>
                      </div>
                      <div style={fieldRowStyle}>
                        <div style={fieldLabelStyle}>品种</div>
                        <div style={fieldValueStyle}>{current.breed || <span style={{ color: '#bfbfbf' }}>未填写</span>}</div>
                      </div>
                      <div style={fieldRowStyle}>
                        <div style={fieldLabelStyle}>血统</div>
                        <div style={fieldValueStyle}>{current.bloodline || <span style={{ color: '#bfbfbf' }}>未填写</span>}</div>
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={fieldRowStyle}>
                        <div style={fieldLabelStyle}>羽色</div>
                        <div style={fieldValueStyle}>{current.color || <span style={{ color: '#bfbfbf' }}>未填写</span>}</div>
                      </div>
                      <div style={fieldRowStyle}>
                        <div style={fieldLabelStyle}>眼砂</div>
                        <div style={fieldValueStyle}>{current.eye_color || <span style={{ color: '#bfbfbf' }}>未填写</span>}</div>
                      </div>
                      <div style={fieldRowStyle}>
                        <div style={fieldLabelStyle}>出生日期</div>
                        <div style={fieldValueStyle}>{current.birth_date || <span style={{ color: '#bfbfbf' }}>未填写</span>}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: 'person',
              label: (
                <span style={{ fontWeight: 600, fontSize: 14 }}>
                  👥 鸽主与提交人
                  <span style={{ color: '#8c8c8c', fontSize: 12, fontWeight: 400, marginLeft: 8 }}>
                    联系人信息
                  </span>
                </span>
              ),
              children: (
                <div style={{ padding: '4px 4px 8px' }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 16,
                    }}
                  >
                    {/* 鸽主卡 */}
                    <div
                      style={{
                        padding: 14,
                        borderRadius: 8,
                        background: '#f6ffed',
                        border: '1px solid #b7eb8f',
                      }}
                    >
                      <div style={{ fontSize: 12, color: '#389e0d', marginBottom: 8, fontWeight: 600 }}>
                        <UserOutlined style={{ marginRight: 4 }} />
                        鸽主
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#1f1f1f', marginBottom: 4 }}>
                        {current.owner_name || '未填写'}
                      </div>
                      <div style={{ fontSize: 12, color: '#595959' }}>
                        {current.owner_phone ? `📞 ${current.owner_phone}` : <span style={{ color: '#ff4d4f' }}>⚠️ 电话缺失</span>}
                      </div>
                    </div>

                    {/* 提交人卡 */}
                    <div
                      style={{
                        padding: 14,
                        borderRadius: 8,
                        background: current.submitter_name && current.submitter_name !== current.owner_name ? '#fffbe6' : '#f6ffed',
                        border: `1px solid ${current.submitter_name && current.submitter_name !== current.owner_name ? '#ffe58f' : '#b7eb8f'}`,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          marginBottom: 8,
                          fontWeight: 600,
                          color: current.submitter_name && current.submitter_name !== current.owner_name ? '#ad6800' : '#389e0d',
                        }}
                      >
                        <UserOutlined style={{ marginRight: 4 }} />
                        提交人
                        {current.submitter_name && current.owner_name && current.submitter_name === current.owner_name && (
                          <Tag color="success" style={{ marginLeft: 6, fontSize: 11 }}>
                            同一人
                          </Tag>
                        )}
                        {current.submitter_name && current.owner_name && current.submitter_name !== current.owner_name && (
                          <Tooltip title="提交人非鸽主本人，建议核实">
                            <Tag color="warning" style={{ marginLeft: 6, fontSize: 11 }}>
                              不同人
                            </Tag>
                          </Tooltip>
                        )}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#1f1f1f', marginBottom: 4 }}>
                        {current.submitter_name || current.owner_name || '未填写'}
                      </div>
                      <div style={{ fontSize: 12, color: '#595959' }}>
                        {current.submitter_phone ? `📞 ${current.submitter_phone}` : <span style={{ color: '#bfbfbf' }}>未填写</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: 'flow',
              label: (
                <span style={{ fontWeight: 600, fontSize: 14 }}>
                  📋 提交流水
                  <span style={{ color: '#8c8c8c', fontSize: 12, fontWeight: 400, marginLeft: 8 }}>
                    审核轨迹
                  </span>
                </span>
              ),
              children: (
                <div style={{ padding: '4px 4px 8px' }}>
                  <div style={fieldRowStyle}>
                    <div style={fieldLabelStyle}>提交时间</div>
                    <div style={fieldValueStyle}>
                      {current.created_at ? dayjs(current.created_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
                    </div>
                  </div>
                  <div style={fieldRowStyle}>
                    <div style={fieldLabelStyle}>当前状态</div>
                    <div style={fieldValueStyle}>
                      <Tag color={st.color}>{st.text}</Tag>
                    </div>
                  </div>
                  {current.status !== 'pending' && (
                    <>
                      <div style={fieldRowStyle}>
                        <div style={fieldLabelStyle}>审核人</div>
                        <div style={fieldValueStyle}>
                          {current.auditor_id ? `ID ${current.auditor_id}` : '-'}
                        </div>
                      </div>
                      <div style={fieldRowStyle}>
                        <div style={fieldLabelStyle}>审核时间</div>
                        <div style={fieldValueStyle}>
                          {current.audited_at ? dayjs(current.audited_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
                        </div>
                      </div>
                      <div style={fieldRowStyle}>
                        <div style={fieldLabelStyle}>审核备注</div>
                        <div style={fieldValueStyle}>{current.audit_remark || <span style={{ color: '#bfbfbf' }}>-</span>}</div>
                      </div>
                    </>
                  )}
                </div>
              ),
            },
          ]}
        />

        {/* ============ 驳回理由区 (仅 pending 显示) ============ */}
        {isPending && canAudit && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <InfoCircleOutlined style={{ color: '#8c8c8c', fontSize: 13 }} />
              <span style={{ fontSize: 13, color: '#595959' }}>驳回理由（驳回时必填，将通过站内通知告知提交人）</span>
            </div>
            <Input.TextArea
              value={rejectRemark}
              onChange={(e) => setRejectRemark(e.target.value)}
              rows={3}
              placeholder="例如：品种血统描述过于模糊，请补充详细信息后重新提交"
              maxLength={200}
              showCount
            />
          </div>
        )}

        {/* 已处理提示 */}
        {!isPending && (
          <div
            style={{
              marginTop: 8,
              padding: '12px 16px',
              borderRadius: 8,
              background: current.status === 'approved' ? '#f6ffed' : '#fff2f0',
              border: `1px solid ${current.status === 'approved' ? '#b7eb8f' : '#ffccc7'}`,
              color: current.status === 'approved' ? '#389e0d' : '#cf1322',
              fontSize: 13,
              textAlign: 'center' as const,
            }}
          >
            {current.status === 'approved' ? (
              <CheckCircleFilled style={{ marginRight: 6 }} />
            ) : (
              <CloseOutlined style={{ marginRight: 6 }} />
            )}
            该记录已审核完毕，无法重复操作
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <ProTable<GeneSubmission>
        headerTitle="基因档案审核"
        actionRef={actionRef}
        loading={tableLoading}
        rowKey="id"
        columns={columns}
        options={{ density: false, reload: false }}
        scroll={{ x: 1200 }}
        search={{ labelWidth: 'auto' }}
        form={{ initialValues: { status: 'pending' } }}
        toolBarRender={() => [<RefreshButton key="refresh" actionRef={actionRef as any} />]}
        request={async (params) => {
          const { current: page, pageSize, status, keyword } = params;
          try {
            const res = await getGeneSubmissions({
              page,
              pageSize,
              status: (status as string | undefined) ?? 'pending',
              keyword: keyword as string | undefined,
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
      />

      {/* 审核详情抽屉 — 全新重构版 */}
      <Drawer
        title={null}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={680}
        destroyOnHidden
        styles={{ header: { display: 'none' }, body: { padding: 0 }, footer: { padding: '12px 24px', borderTop: '1px solid #f0f0f0', background: '#fafafa' } }}
        footer={
          current?.status === 'pending' && canAudit ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                诊断项 {diagnostics.filter((d) => d.level === 'warning').length} 项需关注
              </div>
              <Space size={12}>
                <Button onClick={() => setDrawerVisible(false)}>关闭</Button>
                <Button danger icon={<CloseOutlined />} onClick={handleReject} loading={submitting}>
                  驳回
                </Button>
                <Popconfirm
                  title="确认审核通过？将写入正式基因档案并生成溯源二维码"
                  okText="确认通过"
                  cancelText="再看看"
                  okButtonProps={{ danger: false }}
                  onConfirm={handleApprove}
                >
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    loading={submitting}
                    disabled={submitting}
                    style={{
                      background: 'linear-gradient(135deg, #52c41a, #389e0d)',
                      border: 'none',
                      boxShadow: '0 2px 8px rgba(82,196,26,0.3)',
                      fontWeight: 600,
                    }}
                  >
                    审核通过
                  </Button>
                </Popconfirm>
              </Space>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <Button onClick={() => setDrawerVisible(false)}>关闭</Button>
            </div>
          )
        }
      >
        {drawerContent()}
      </Drawer>
    </>
  );
};

export default GeneAudit;
