import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { App, Button, Card, Checkbox, Col, Input, Modal, Popconfirm, Progress, Row, Segmented, Space, Statistic, Tag } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ExportOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useCurrentUser } from '../../app-context';
import { useTableRefresh } from '../../hooks/useTableRefresh';
import RefreshButton from '../../components/RefreshButton';
import { hasPermission } from '../../access';
import {
  getVerificationList,
  batchVerifyCompetitions,
  exportVerificationReport,
  type VerificationItem,
} from '../../services/competition';

const VERIFY_STATUS_LABELS: Record<string, string> = {
  pending: '待核验',
  in_progress: '核验中',
  completed: '已完成',
  exception: '异常',
};

const VERIFY_STATUS_TAG_COLORS: Record<string, string> = {
  pending: 'default',
  in_progress: 'processing',
  completed: 'success',
  exception: 'error',
};

const VERIFY_PROGRESS_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  EXCEPTION: 'exception',
} as const;

type VerifyProgressStatus = (typeof VERIFY_PROGRESS_STATUS)[keyof typeof VERIFY_PROGRESS_STATUS];

const VerifyList = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canVerify = hasPermission(currentUser, 'competition:verify');
  const navigate = useNavigate();
  const actionRef = useRef<ActionType>();
  const { tableLoading, handleRefresh } = useTableRefresh(actionRef, { messageApi: message });

  const [stats, setStats] = useState({ total: 0, verified: 0, pending: 0, exception: 0 });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportRange, setExportRange] = useState<'all' | 'current' | 'selected'>('all');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [exportOptions, setExportOptions] = useState({
    include_detail: true,
    include_exception_only: false,
    include_summary: true,
  });
  const [fileName, setFileName] = useState('');

  const fetchStats = async () => {
    try {
      const res = await getVerificationList({ page: 1, pageSize: 9999 });
      const all = res?.list ?? [];
      setStats({
        total: all.reduce((s, x) => s + (x.participant_total || 0), 0),
        verified: all.reduce((s, x) => s + (x.verified_count || 0), 0),
        pending: all.reduce((s, x) => s + (x.pending_count || 0), 0),
        exception: all.reduce((s, x) => s + (x.failed_count || 0), 0),
      });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleBatchVerify = async () => {
    if (selectedIds.length === 0) {
      message.warning('请先选择赛事');
      return;
    }
    try {
      const result = await batchVerifyCompetitions(selectedIds);
      message.success(
        `批量核验完成:成功 ${result.summary.succeeded} 个,失败 ${result.summary.failed} 个`,
      );
      setSelectedIds([]);
      handleRefresh();
      fetchStats();
    } catch {
      // 拦截器已提示错误
    }
  };

  const handleExport = () => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setFileName(`赛事核验报告_${dateStr}`);
    setExportModalOpen(true);
  };

  const handleExportConfirm = async () => {
    let raceIds: number[] = [];
    if (exportRange === 'selected') {
      if (selectedIds.length === 0) {
        message.warning('请先勾选赛事');
        return;
      }
      raceIds = selectedIds;
    } else if (exportRange === 'current') {
      raceIds = selectedIds.length > 0 ? selectedIds : [];
    }

    setExportLoading(true);
    try {
      const res = await exportVerificationReport({
        race_ids: raceIds,
        format: exportFormat,
        include_detail: exportOptions.include_detail,
        include_exception_only: exportOptions.include_exception_only,
        include_summary: exportOptions.include_summary,
        file_name: fileName || undefined,
      });

      message.success('报告导出成功');
      setExportModalOpen(false);

      const downloadUrl = res.file_url;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = res.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      // Error handled by interceptor
    } finally {
      setExportLoading(false);
    }
  };

  const columns: ProColumns<VerificationItem>[] = [
    { title: '序号', dataIndex: 'index', valueType: 'index', width: 60, hideInSearch: true },
    { title: '赛事名称', dataIndex: 'name', width: 220, ellipsis: true },
    {
      title: '主办方/公棚',
      dataIndex: 'organizer',
      width: 160,
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => record.organizer || '-',
    },
    {
      title: '参赛羽数',
      dataIndex: 'participant_total',
      width: 100,
      hideInSearch: true,
    },
    {
      title: '已核验',
      dataIndex: 'verified_count',
      width: 90,
      hideInSearch: true,
    },
    {
      title: '核验率',
      dataIndex: 'verify_progress',
      width: 160,
      hideInSearch: true,
      render: (_, record) => {
        const status = record.verify_status as VerifyProgressStatus;
        const percent = Math.round(record.verify_progress || 0);
        let progressStatus: 'success' | 'exception' | 'active' | 'normal' = 'active';
        if (status === VERIFY_PROGRESS_STATUS.COMPLETED) progressStatus = 'success';
        else if (status === VERIFY_PROGRESS_STATUS.EXCEPTION) progressStatus = 'exception';
        else if (status === VERIFY_PROGRESS_STATUS.PENDING) progressStatus = 'normal';
        return <Progress percent={percent} size="small" status={progressStatus} />;
      },
    },
    {
      title: '状态',
      dataIndex: 'verify_status',
      width: 100,
      valueType: 'select',
      valueEnum: {
        pending: { text: '待核验' },
        in_progress: { text: '核验中' },
        completed: { text: '已完成' },
        exception: { text: '异常' },
      },
      render: (_, record) => (
        <Tag color={VERIFY_STATUS_TAG_COLORS[record.verify_status] || 'default'}>
          {VERIFY_STATUS_LABELS[record.verify_status] || record.verify_status}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            disabled={!canVerify}
            onClick={() => navigate(`/competition/verify/${record.id}`)}
          >
            开始核验
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/competition/verify/${record.id}`)}
          >
            查看详情
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="总参赛羽数"
              value={stats.total}
              prefix={<SafetyCertificateOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="已核验"
              value={stats.verified}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="待核验"
              value={stats.pending}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="异常"
              value={stats.exception}
              prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
            />
          </Col>
        </Row>
      </Card>

      <ProTable<VerificationItem>
        headerTitle="赛事核验"
        actionRef={actionRef}
        loading={tableLoading}
        rowKey="id"
        columns={columns}
        options={{ density: false, reload: false }}
        scroll={{ x: 1200 }}
        search={{ labelWidth: 'auto' }}
        rowSelection={{
          selectedRowKeys: selectedIds,
          onChange: (keys) => setSelectedIds(keys as number[]),
        }}
        request={async (params) => {
          const { current, pageSize, name, status } = params;
          try {
            const res = await getVerificationList({
              page: current,
              pageSize,
              name: name as string | undefined,
              status: status as string | undefined,
            });
            return { data: res?.list ?? [], success: true, total: res?.total ?? 0 };
          } catch {
            return { data: [], success: false, total: 0 };
          }
        }}
        toolBarRender={() =>
          canVerify
            ? [
                <Popconfirm
                  key="batchVerify"
                  title={`确认批量核验选中的 ${selectedIds.length} 个赛事?`}
                  onConfirm={handleBatchVerify}
                  okButtonProps={{ disabled: selectedIds.length === 0 }}
                >
                  <Button
                    icon={<CheckCircleOutlined />}
                    disabled={selectedIds.length === 0}
                  >
                    批量核验{selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
                  </Button>
                </Popconfirm>,
                <Button
                  key="export"
                  icon={<ExportOutlined />}
                  onClick={handleExport}
                >
                  导出核验报告
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

      <Modal
        title="📄 导出核验报告"
        open={exportModalOpen}
        onCancel={() => setExportModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setExportModalOpen(false)}>
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={exportLoading}
            onClick={handleExportConfirm}
          >
            ⬇️ 立即导出
          </Button>,
        ]}
        width={520}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>导出范围</div>
          <Segmented
            value={exportRange}
            onChange={(val) => setExportRange(val as any)}
            options={[
              { label: '全部赛事', value: 'all' },
              { label: `勾选赛事(${selectedIds.length})`, value: 'selected' },
            ]}
            block
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>导出格式</div>
          <Segmented
            value={exportFormat}
            onChange={(val) => setExportFormat(val as any)}
            options={[
              { label: '📄 PDF', value: 'pdf' },
              { label: '📊 Excel', value: 'excel' },
              { label: '📋 CSV', value: 'csv' },
            ]}
            block
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>内容选项</div>
          <Space direction="vertical">
            <Checkbox
              checked={exportOptions.include_detail}
              onChange={(e) =>
                setExportOptions((p) => ({ ...p, include_detail: e.target.checked }))
              }
            >
              核验明细（足环号/鸽主/核验时间/结果）
            </Checkbox>
            <Checkbox
              checked={exportOptions.include_exception_only}
              onChange={(e) =>
                setExportOptions((p) => ({ ...p, include_exception_only: e.target.checked }))
              }
            >
              异常记录（仅导出核验异常的鸽子）
            </Checkbox>
            <Checkbox
              checked={exportOptions.include_summary}
              onChange={(e) =>
                setExportOptions((p) => ({ ...p, include_summary: e.target.checked }))
              }
            >
              统计摘要（总羽数/通过率/异常数）
            </Checkbox>
          </Space>
        </div>

        <div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>文件命名</div>
          <Input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="赛事核验报告"
          />
        </div>
      </Modal>
    </>
  );
};

export default VerifyList;