import {
  ProTable,
  ModalForm,
  ProFormTextArea,
  ProFormText,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { App, Button, Card, Select, Tag, Popconfirm } from 'antd';
import { ImportOutlined, CheckOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';

import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import {
  getParticipantList,
  getCompetitionOptions,
  importParticipants,
  verifyParticipant,
  verifyParticipantsBatch,
  type ParticipantItem,
  type CompetitionOption,
  VERIFY_STATUS,
  VERIFY_STATUS_LABELS,
  VERIFY_STATUS_COLORS,
} from '../../services/competition';

// 赛事核验:参赛鸽列表 + 批量导入 + 逐个/批量核验
const CompetitionVerify = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canVerify = hasPermission(currentUser, 'competition:verify');
  const params = useParams<{ id: string }>();
  const paramId = params.id ? Number(params.id) : null;

  const [competitionId, setCompetitionId] = useState<number | null>(paramId);
  const [options, setOptions] = useState<CompetitionOption[]>([]);
  const actionRef = useRef<ActionType>();

  // 批量导入弹窗
  const [importVisible, setImportVisible] = useState(false);

  // 加载赛事下拉选项
  useEffect(() => {
    getCompetitionOptions()
      .then(setOptions)
      .catch(() => {
        // 拦截器已提示错误
      });
  }, []);

  // URL 参数变化时同步赛事 ID
  useEffect(() => {
    if (paramId) {
      setCompetitionId(paramId);
    }
  }, [paramId]);

  // 批量导入参赛鸽
  const handleImport = async (values: Record<string, unknown>) => {
    if (!competitionId) {
      message.warning('请先选择赛事');
      return false;
    }
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
    actionRef.current?.reload();
    return true;
  };

  // 核验单个参赛鸽
  const handleVerify = async (record: ParticipantItem) => {
    if (!competitionId) return;
    try {
      const res = await verifyParticipant(competitionId, record.id);
      message.success(res.status === 'passed' ? '核验通过:已匹配基因档案' : '核验不通过');
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 批量核验(核验所有未核验的参赛鸽)
  const handleVerifyAll = async () => {
    if (!competitionId) return;
    try {
      const res = await verifyParticipantsBatch(competitionId);
      message.success(`批量核验完成:通过 ${res.passed} 只,不通过 ${res.failed} 只`);
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示错误
    }
  };

  const columns: ProColumns<ParticipantItem>[] = [
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

  // 当前选中的赛事名称
  const currentName = options.find((o) => o.id === competitionId)?.name;

  // 未选择赛事时显示赛事选择器
  if (!competitionId) {
    return (
      <Card title="赛事核验">
        <div style={{ marginBottom: 16, color: '#666' }}>
          <SafetyCertificateOutlined style={{ marginRight: 8 }} />
          请选择需要核验的赛事:
        </div>
        <Select
          style={{ width: 400 }}
          placeholder="请选择赛事"
          onChange={(val) => setCompetitionId(val as number)}
          options={options.map((o) => ({
            label: `${o.name}(${o.status})`,
            value: o.id,
          }))}
        />
      </Card>
    );
  }

  return (
    <>
      <ProTable<ParticipantItem>
        headerTitle={`参赛鸽列表${currentName ? ` - ${currentName}` : ''}`}
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        options={{ density: false }}
        scroll={{ x: 1100 }}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          if (!competitionId) return { data: [], success: true, total: 0 };
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
              ]
            : []
        }
        pagination={{ pageSize: 10, showSizeChanger: true }}
        params={{ competitionId }}
      />

      {/* 批量导入弹窗 */}
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

export default CompetitionVerify;
