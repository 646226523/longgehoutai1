import {
  ProTable,
  ModalForm,
  ProFormSelect,
  ProFormDateTimePicker,
  ProFormDigit,
  ProFormList,
  ProFormGroup,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { App, Button, Card, Select, Tag, Popconfirm } from 'antd';
import { PlusOutlined, TrophyOutlined, OrderedListOutlined } from '@ant-design/icons';
import { useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';

import { useCurrentUser } from '../../app-context';
import { useTableRefresh } from '../../hooks/useTableRefresh';
import RefreshButton from '../../components/RefreshButton';
import { hasPermission } from '../../access';
import {
  getResultList,
  getCompetitionOptions,
  getParticipantList,
  createResult,
  createResultsBatch,
  autoRankResults,
  deleteResult,
  type ResultItem,
  type ParticipantItem,
  type CompetitionOption,
} from '../../services/competition';

// 成绩录入与排名:成绩录入表 + 排名榜展示 + 批量录入
const CompetitionResult = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canEdit = hasPermission(currentUser, 'competition:edit');
  const params = useParams<{ id: string }>();
  const paramId = params.id ? Number(params.id) : null;

  const [competitionId, setCompetitionId] = useState<number | null>(paramId);
  const [options, setOptions] = useState<CompetitionOption[]>([]);
  const [participantOptions, setParticipantOptions] = useState<ParticipantItem[]>([]);
  const actionRef = useRef<ActionType>();
  const { tableLoading, handleRefresh } = useTableRefresh(actionRef, { messageApi: message });

  // 单条录入弹窗
  const [createVisible, setCreateVisible] = useState(false);
  // 批量录入弹窗
  const [batchVisible, setBatchVisible] = useState(false);


  // 加载赛事下拉选项
  useEffect(() => {
    getCompetitionOptions()
      .then((data) => {
        setOptions(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setOptions([]);
      });
  }, []);

  // URL 参数变化时同步赛事 ID
  useEffect(() => {
    if (paramId) {
      setCompetitionId(paramId);
    }
  }, [paramId]);

  // 加载已核验通过的参赛鸽(供成绩录入选择)
  const loadParticipantOptions = (compId: number) => {
    getParticipantList(compId, { verifyStatus: 'passed', pageSize: 9999 })
      .then((res) => setParticipantOptions(res?.list ?? []))
      .catch(() => {
        // 拦截器已提示错误
      });
  };

  // 选中赛事后加载参赛鸽
  useEffect(() => {
    if (competitionId) {
      loadParticipantOptions(competitionId);
    }
  }, [competitionId]);

  // 参赛鸽下拉选项(已核验通过)
  const participantSelectOptions = participantOptions.map((p) => ({
    label: `${p.ring_number}${p.owner_name ? ` (${p.owner_name})` : ''}`,
    value: p.id,
  }));

  // 单条成绩录入
  const handleCreate = async (values: Record<string, unknown>) => {
    if (!competitionId) {
      message.warning('请先选择赛事');
      return false;
    }
    const arrivalTime = values.arrival_time;
    await createResult(competitionId, {
      participant_id: values.participant_id as number,
      arrival_time: arrivalTime ? dayjs(arrivalTime as dayjs.Dayjs).valueOf() : undefined,
      speed: values.speed as number | undefined,
      distance: values.distance as number | undefined,
    });
    message.success('成绩录入成功');
    handleRefresh();
    return true;
  };

  // 批量录入
  const handleBatch = async (values: Record<string, unknown>) => {
    if (!competitionId) {
      message.warning('请先选择赛事');
      return false;
    }
    const list = (values.results as Array<Record<string, unknown>>) || [];
    if (list.length === 0) {
      message.warning('请至少添加一条成绩');
      return false;
    }
    const payload = list.map((item) => ({
      participant_id: item.participant_id as number,
      arrival_time: item.arrival_time
        ? dayjs(item.arrival_time as dayjs.Dayjs).valueOf()
        : undefined,
      speed: item.speed as number | undefined,
      distance: item.distance as number | undefined,
    }));
    const res = await createResultsBatch(competitionId, payload);
    message.success(`批量录入完成:新增 ${res.inserted} 条,跳过 ${res.skipped} 条`);
    handleRefresh();
    return true;
  };

  // 自动排名
  const handleAutoRank = async () => {
    if (!competitionId) return;
    try {
      const res = await autoRankResults(competitionId);
      message.success(`排名完成,共 ${res.ranked} 条成绩`);
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 删除成绩
  const handleDelete = async (record: ResultItem) => {
    if (!competitionId) return;
    try {
      await deleteResult(competitionId, record.id);
      message.success('删除成功');
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  const columns: ProColumns<ResultItem>[] = [
    { title: '序号', dataIndex: 'index', valueType: 'index', width: 60, hideInSearch: true },
    {
      title: '排名',
      dataIndex: 'rank',
      width: 80,
      hideInSearch: true,
      render: (_, record) =>
        record.rank ? (
          <Tag color={record.rank <= 3 ? 'gold' : 'default'}>{record.rank}</Tag>
        ) : (
          '-'
        ),
    },
    { title: '足环号', dataIndex: 'ring_number', width: 180, hideInSearch: true },
    { title: '鸽主', dataIndex: 'owner_name', width: 120, ellipsis: true, hideInSearch: true },
    {
      title: '归巢时间',
      dataIndex: 'arrival_time',
      width: 160,
      hideInSearch: true,
      render: (_, record) =>
        record.arrival_time ? dayjs(record.arrival_time).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '分速(米/分)',
      dataIndex: 'speed',
      width: 120,
      hideInSearch: true,
      render: (_, record) => (record.speed != null ? record.speed.toFixed(2) : '-'),
    },
    {
      title: '空距(km)',
      dataIndex: 'distance',
      width: 100,
      hideInSearch: true,
      render: (_, record) => (record.distance != null ? `${record.distance}` : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      hideInSearch: true,
      render: (_, record) => (
        <Tag color={record.status === 'recorded' ? 'green' : 'default'}>
          {record.status === 'recorded' ? '已录入' : '待录入'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) =>
        canEdit ? (
          <Popconfirm title="确认删除该成绩记录?" onConfirm={() => handleDelete(record)}>
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        ) : (
          '-'
        ),
    },
  ];

  // 当前选中的赛事名称
  const currentName = Array.isArray(options)
    ? options.find((o) => o.id === competitionId)?.name
    : undefined;

  // 未选择赛事时显示赛事选择器
  if (!competitionId) {
    return (
      <Card title="成绩录入">
        <div style={{ marginBottom: 16, color: '#666' }}>
          <TrophyOutlined style={{ marginRight: 8 }} />
          请选择需要录入成绩的赛事:
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
      <ProTable<ResultItem>
        headerTitle={`成绩排名榜${currentName ? ` - ${currentName}` : ''}`}
        actionRef={actionRef}
        loading={tableLoading}
        rowKey="id"
        columns={columns}
        options={{ density: false, reload: false }}
        scroll={{ x: 1000 }}
        search={false}
        request={async (params) => {
          if (!competitionId) return { data: [], success: true, total: 0 };
          const { current, pageSize } = params;
          try {
            const res = await getResultList(competitionId, {
              page: current,
              pageSize,
            });
            return { data: res.list, success: true, total: res.total };
          } catch {
            return { data: [], success: false, total: 0 };
          }
        }}
        toolBarRender={() =>
          canEdit
            ? [
                <Popconfirm
                  key="rank"
                  title="确认按分速降序重新生成排名?"
                  onConfirm={handleAutoRank}
                >
                  <Button icon={<OrderedListOutlined />}>自动排名</Button>
                </Popconfirm>,
                <Button
                  key="batch"
                  icon={<PlusOutlined />}
                  onClick={() => setBatchVisible(true)}
                >
                  批量录入
                </Button>,
                <Button
                  key="create"
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateVisible(true)}
                >
                  录入成绩
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
        params={{ competitionId }}
      />

      {/* 单条录入弹窗 */}
      <ModalForm
        title="录入成绩"
        open={createVisible}
        onOpenChange={setCreateVisible}
        onFinish={handleCreate}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        width={520}
      >
        <ProFormSelect
          name="participant_id"
          label="参赛鸽"
          placeholder="请选择参赛鸽(已核验通过)"
          options={participantSelectOptions}
          rules={[{ required: true, message: '请选择参赛鸽' }]}
        />
        <ProFormDateTimePicker name="arrival_time" label="归巢时间" />
        <ProFormDigit
          name="speed"
          label="分速(米/分)"
          placeholder="请输入分速"
          min={0}
          fieldProps={{ step: 0.01 }}
        />
        <ProFormDigit
          name="distance"
          label="空距(公里)"
          placeholder="请输入空距"
          min={0}
          fieldProps={{ step: 0.1 }}
        />
      </ModalForm>

      {/* 批量录入弹窗 */}
      <ModalForm
        title="批量录入成绩"
        open={batchVisible}
        onOpenChange={setBatchVisible}
        onFinish={handleBatch}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        width={760}
      >
        <ProFormList
          name="results"
          label="成绩列表"
          creatorButtonProps={{ creatorButtonText: '添加一条成绩' }}
          min={1}
          copyIconProps={false}
          initialValue={[{}]}
        >
          <ProFormGroup>
            <ProFormSelect
              name="participant_id"
              label="参赛鸽"
              placeholder="选择参赛鸽"
              options={participantSelectOptions}
              rules={[{ required: true, message: '请选择参赛鸽' }]}
              fieldProps={{ style: { width: 240 } }}
            />
            <ProFormDigit
              name="speed"
              label="分速"
              placeholder="米/分"
              min={0}
              fieldProps={{ step: 0.01, style: { width: 140 } }}
            />
            <ProFormDigit
              name="distance"
              label="空距"
              placeholder="公里"
              min={0}
              fieldProps={{ step: 0.1, style: { width: 140 } }}
            />
          </ProFormGroup>
        </ProFormList>
      </ModalForm>
    </>
  );
};

export default CompetitionResult;
