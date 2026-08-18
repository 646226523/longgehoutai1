import {
  ProTable,
  ModalForm,
  ProFormTextArea,
  ProFormText,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { App, Button, Card, Tag, Popconfirm, Input, List, Space } from 'antd';
import {
  ImportOutlined,
  CheckOutlined,
  ArrowLeftOutlined,
  SafetyCertificateOutlined,
  ScanOutlined,
} from '@ant-design/icons';
import { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import { useCurrentUser } from '../../app-context';
import { useTableRefresh } from '../../hooks/useTableRefresh';
import RefreshButton from '../../components/RefreshButton';
import { hasPermission } from '../../access';
import {
  getParticipantList,
  getCompetitionDetail,
  importParticipants,
  verifyParticipant,
  verifyParticipantsBatch,
  type ParticipantItem,
  type CompetitionItem,
  VERIFY_STATUS,
  VERIFY_STATUS_LABELS,
  VERIFY_STATUS_COLORS,
} from '../../services/competition';

interface ScanLogItem {
  id: string;
  ringNumber: string;
  time: string;
  status: 'success' | 'failed' | 'not-found';
  detail?: string;
}

const VerifyDetail = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canVerify = hasPermission(currentUser, 'competition:verify');
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const competitionId = Number(params.id);

  const [competition, setCompetition] = useState<CompetitionItem | null>(null);
  const actionRef = useRef<ActionType>();
  const { tableLoading, handleRefresh } = useTableRefresh(actionRef, { messageApi: message });
  const [importVisible, setImportVisible] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [scanLogs, setScanLogs] = useState<ScanLogItem[]>([]);

  useEffect(() => {
    if (!competitionId) return;
    getCompetitionDetail(competitionId)
      .then((data) => setCompetition(data))
      .catch(() => setCompetition(null));
  }, [competitionId]);

  const handleImport = async (values: Record<string, unknown>) => {
    const text = String(values.ring_numbers ?? '');
    const ringNumbers = text
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (ringNumbers.length === 0) {
      message.warning('请输入至少一个足环号');
      return false;
    }
    const res = await importParticipants(competitionId, {
      ring_numbers: ringNumbers,
      owner_name: (values.owner_name as string) || undefined,
    });
    message.success(`导入完成:新增 ${res.inserted} 条,跳过重复 ${res.skipped} 条`);
    handleRefresh();
    return true;
  };

  const handleVerify = async (record: ParticipantItem) => {
    try {
      const res = await verifyParticipant(competitionId, record.id);
      message.success(res.status === 'passed' ? '核验通过:已匹配基因档案' : '核验不通过');
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  const handleVerifyAll = async () => {
    try {
      const res = await verifyParticipantsBatch(competitionId);
      message.success(`批量核验完成:通过 ${res.passed} 只,不通过 ${res.failed} 只`);
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  const handleScan = async () => {
    const ringNumber = scanInput.trim();
    if (!ringNumber) {
      message.warning('请输入足环号');
      return;
    }

    const newLog: ScanLogItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ringNumber,
      time: dayjs().format('HH:mm:ss'),
      status: 'failed',
    };

    try {
      const searchRes = await getParticipantList(competitionId, {
        page: 1,
        pageSize: 1,
        ringNumber,
      });

      if (searchRes.list.length === 0) {
        newLog.status = 'not-found';
        newLog.detail = '未找到该足环号的参赛鸽';
        setScanLogs((prev) => [newLog, ...prev].slice(0, 20));
        message.warning(`未找到足环号:${ringNumber}`);
        setScanInput('');
        return;
      }

      const participant = searchRes.list[0];

      if (participant.verify_status !== VERIFY_STATUS.PENDING) {
        newLog.status = 'success';
        newLog.detail = `已核验(${VERIFY_STATUS_LABELS[participant.verify_status] || participant.verify_status})`;
        setScanLogs((prev) => [newLog, ...prev].slice(0, 20));
        message.info(`该鸽已核验:${ringNumber}`);
        setScanInput('');
        return;
      }

      const verifyRes = await verifyParticipant(competitionId, participant.id);
      newLog.status = verifyRes.status === 'passed' ? 'success' : 'failed';
      newLog.detail =
        verifyRes.status === 'passed'
          ? '核验通过:已匹配基因档案'
          : `核验不通过${verifyRes.reason ? `:${verifyRes.reason}` : ''}`;
      setScanLogs((prev) => [newLog, ...prev].slice(0, 20));
      message.success(`${verifyRes.status === 'passed' ? '核验通过' : '核验不通过'}:${ringNumber}`);
      handleRefresh();
    } catch {
      newLog.status = 'failed';
      newLog.detail = '扫码核验请求失败';
      setScanLogs((prev) => [newLog, ...prev].slice(0, 20));
    }

    setScanInput('');
  };

  const columns: ProColumns<ParticipantItem>[] = [
    { title: '序号', dataIndex: 'index', valueType: 'index', width: 60, hideInSearch: true },
    { title: '足环号', dataIndex: 'ring_number', width: 180 },
    { title: '鸽主', dataIndex: 'owner_name', width: 120, ellipsis: true, hideInSearch: true },
    {
      title: '核验状态',
      dataIndex: 'verify_status',
      width: 110,
      valueType: 'select',
      valueEnum: {
        pending: { text: '未核验' },
        passed: { text: '通过' },
        failed: { text: '不通过' },
      },
      render: (_, record) => (
        <Tag color={VERIFY_STATUS_COLORS[record.verify_status] || 'default'}>
          {VERIFY_STATUS_LABELS[record.verify_status] || record.verify_status}
        </Tag>
      ),
    },
    {
      title: '核验原因',
      dataIndex: 'verify_reason',
      width: 220,
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => record.verify_reason || '-',
    },
    {
      title: '核验时间',
      dataIndex: 'verified_at',
      width: 160,
      hideInSearch: true,
      render: (_, record) =>
        record.verified_at ? dayjs(record.verified_at).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '基因档案',
      dataIndex: 'gene_profile_id',
      width: 100,
      hideInSearch: true,
      render: (_, record) => (record.gene_profile_id ? `#${record.gene_profile_id}` : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) =>
        canVerify && record.verify_status === VERIFY_STATUS.PENDING ? (
          <Popconfirm title="确认核验该参赛鸽?" onConfirm={() => handleVerify(record)}>
            <Button type="link" size="small" icon={<CheckOutlined />}>
              核验
            </Button>
          </Popconfirm>
        ) : (
          '-'
        ),
    },
  ];

  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/competition/verify')}
          style={{ marginBottom: 8 }}
        >
          返回核验列表
        </Button>
        <h2 style={{ margin: 0 }}>
          <SafetyCertificateOutlined style={{ marginRight: 8, color: '#1677ff' }} />
          赛事核验详情
          {competition ? ` - ${competition.name}` : ''}
        </h2>
        {competition && (
          <p style={{ color: '#999', margin: '4px 0 0' }}>
            主办方:{competition.organizer || '-'} · 参赛羽数:{competition.participant_total ?? 0}
            {competition.location ? ` · 地点:${competition.location}` : ''}
          </p>
        )}
      </Card>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <ProTable<ParticipantItem>
            headerTitle="参赛鸽列表"
            actionRef={actionRef}
            loading={tableLoading}
            rowKey="id"
            columns={columns}
            options={{ density: false, reload: false }}
            scroll={{ x: 1100 }}
            search={{ labelWidth: 'auto' }}
            request={async (params) => {
              const { current, pageSize, ring_number, verify_status } = params;
              try {
                const res = await getParticipantList(competitionId, {
                  page: current,
                  pageSize,
                  ringNumber: ring_number as string | undefined,
                  verifyStatus: verify_status as string | undefined,
                });
                return { data: res.list, success: true, total: res.total };
              } catch {
                return { data: [], success: false, total: 0 };
              }
            }}
            toolBarRender={() =>
              canVerify
                ? [
                    <Popconfirm
                      key="verifyAll"
                      title="确认核验所有未核验的参赛鸽?"
                      onConfirm={handleVerifyAll}
                    >
                      <Button icon={<CheckOutlined />}>批量核验</Button>
                    </Popconfirm>,
                    <Button
                      key="import"
                      type="primary"
                      icon={<ImportOutlined />}
                      onClick={() => setImportVisible(true)}
                    >
                      批量导入
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
        </div>

        <Card
          title={
            <Space>
              <ScanOutlined style={{ color: '#1677ff' }} />
              <span>📷 扫码设备联动</span>
            </Space>
          }
          style={{ width: 360, flexShrink: 0 }}
          size="small"
        >
          <div style={{ marginBottom: 12 }}>
            <Tag color="success">🟢 设备已连接 (模拟)</Tag>
          </div>

          <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
            <Input
              placeholder="请输入/扫描足环号"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onPressEnter={handleScan}
              style={{ flex: 1 }}
              allowClear
            />
            <Button type="primary" icon={<ScanOutlined />} onClick={handleScan}>
              模拟扫码
            </Button>
          </Space.Compact>

          <div style={{ marginBottom: 8, color: '#666', fontSize: 13 }}>
            最近扫描记录
          </div>

          {scanLogs.length === 0 ? (
            <div style={{ color: '#bbb', textAlign: 'center', padding: '24px 0' }}>
              暂无扫描记录
            </div>
          ) : (
            <List
              size="small"
              dataSource={scanLogs}
              renderItem={(item) => (
                <List.Item>
                  <div style={{ width: '100%' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontWeight: 500, fontFamily: 'monospace' }}>
                        {item.ringNumber}
                      </span>
                      <Tag
                        color={
                          item.status === 'success'
                            ? 'green'
                            : item.status === 'not-found'
                              ? 'orange'
                              : 'red'
                        }
                        style={{ margin: 0 }}
                      >
                        {item.status === 'success'
                          ? '成功'
                          : item.status === 'not-found'
                            ? '未找到'
                            : '失败'}
                      </Tag>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12,
                        color: '#999',
                        marginTop: 4,
                      }}
                    >
                      <span>{item.detail}</span>
                      <span>{item.time}</span>
                    </div>
                  </div>
                </List.Item>
              )}
              style={{ maxHeight: 360, overflowY: 'auto' }}
            />
          )}
        </Card>
      </div>

      <ModalForm
        title="批量导入参赛鸽"
        open={importVisible}
        onOpenChange={setImportVisible}
        onFinish={handleImport}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        width={560}
      >
        <ProFormText
          name="owner_name"
          label="鸽主(可选)"
          placeholder="如所有参赛鸽鸽主相同可填写,否则留空"
        />
        <ProFormTextArea
          name="ring_numbers"
          label="足环号列表"
          placeholder={'每行输入一个足环号,例如:\nCHN-2026-000001\nCHN-2026-000002\nCHN-2026-000003'}
          rules={[{ required: true, message: '请输入足环号' }]}
          fieldProps={{ rows: 8 }}
        />
      </ModalForm>
    </>
  );
};

export default VerifyDetail;