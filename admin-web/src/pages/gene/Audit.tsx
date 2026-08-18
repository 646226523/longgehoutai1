import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { App, Button, Descriptions, Drawer, Input, Popconfirm, Space, Tag } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useRef, useState } from 'react';
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

const GENDER_MAP: Record<string, string> = { male: '雄', female: '雌', unknown: '未知' };

const STATUS_MAP: Record<string, { text: string; color: string }> = {
  pending: { text: '待审核', color: 'orange' },
  approved: { text: '已通过', color: 'green' },
  rejected: { text: '已驳回', color: 'red' },
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
      message.success('审核通过,已生成正式基因档案与溯源二维码');
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
      render: (_, record) => GENDER_MAP[record.gender] ?? record.gender,
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

  const descriptionItems = current
    ? [
        { key: 'ring_number', label: '足环号', children: current.ring_number },
        { key: 'name', label: '鸽名', children: current.name },
        { key: 'gender', label: '性别', children: GENDER_MAP[current.gender] ?? current.gender },
        { key: 'breed', label: '品种', children: current.breed || '-' },
        { key: 'bloodline', label: '血统', children: current.bloodline || '-' },
        { key: 'owner_name', label: '鸽主', children: current.owner_name || '-' },
        { key: 'owner_phone', label: '鸽主电话', children: current.owner_phone || '-' },
        { key: 'color', label: '羽色', children: current.color || '-' },
        { key: 'eye_color', label: '眼砂', children: current.eye_color || '-' },
        { key: 'birth_date', label: '出生日期', children: current.birth_date || '-' },
        { key: 'submitter_name', label: '提交人', children: current.submitter_name || '-' },
        { key: 'submitter_phone', label: '提交人电话', children: current.submitter_phone || '-' },
        {
          key: 'status',
          label: '状态',
          children: (() => {
            const s = STATUS_MAP[current.status] ?? { text: current.status, color: 'default' };
            return <Tag color={s.color}>{s.text}</Tag>;
          })(),
        },
        {
          key: 'created_at',
          label: '提交时间',
          children: current.created_at ? dayjs(current.created_at).format('YYYY-MM-DD HH:mm:ss') : '-',
        },
        { key: 'audit_remark', label: '审核备注', children: current.audit_remark || '-' },
      ]
    : [];

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
        toolBarRender={() => [
          <RefreshButton key="refresh" actionRef={actionRef as any} />,
        ]}
        request={async (params) => {
          const { current: page, pageSize, status, keyword } = params;
          try {
            const res = await getGeneSubmissions({
              page,
              pageSize,
              status: (status as string | undefined) ?? 'pending',
              keyword: keyword as string | undefined,
            });
            return { data: res.list, success: true, total: res.total };
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

      {/* 审核详情抽屉 */}
      <Drawer
        title="审核详情"
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={560}
        destroyOnHidden
        extra={
          current?.status === 'pending' && canAudit ? (
            <Space>
              <Popconfirm title="确认审核通过?将写入正式基因档案并生成溯源二维码。" onConfirm={handleApprove}>
                <Button type="primary" icon={<CheckOutlined />} loading={submitting} disabled={submitting}>
                  通过
                </Button>
              </Popconfirm>
              <Button danger icon={<CloseOutlined />} onClick={handleReject} loading={submitting}>
                驳回
              </Button>
            </Space>
          ) : null
        }
      >
        {current && (
          <>
            <Descriptions items={descriptionItems} column={2} bordered size="small" />
            {current.status === 'pending' && canAudit && (
              <div style={{ marginTop: 16 }}>
                <div style={{ marginBottom: 8, color: '#888' }}>驳回理由(驳回时必填):</div>
                <Input.TextArea
                  value={rejectRemark}
                  onChange={(e) => setRejectRemark(e.target.value)}
                  rows={4}
                  placeholder="请填写驳回理由,将通过站内通知告知提交人"
                  maxLength={200}
                  showCount
                />
              </div>
            )}
            {current.status !== 'pending' && (
              <div style={{ marginTop: 16, color: '#888' }}>
                该记录已审核完毕,无法重复操作。
              </div>
            )}
          </>
        )}
      </Drawer>
    </>
  );
};

export default GeneAudit;
