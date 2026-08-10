import {
  ModalForm,
  ProFormText,
  ProFormSelect,
  ProFormDateTimePicker,
  ProFormTextArea,
  ProFormDigit,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { App, Button, Popconfirm, Space, Tag } from 'antd';
import { PlusOutlined, TrophyOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import {
  createCompetition,
  deleteCompetition,
  getCompetitionList,
  publishCompetition,
  transitionCompetitionStatus,
  updateCompetition,
  type CompetitionItem,
  COMPETITION_STATUS,
  STATUS_FLOW,
  STATUS_LABELS,
  STATUS_COLORS,
} from '../../services/competition';

// 赛事类型下拉选项(与字典 competition_type 一致)
const TYPE_OPTIONS = [
  { label: '春赛', value: 'spring' },
  { label: '秋赛', value: 'autumn' },
  { label: '特比环', value: 'boiler' },
  { label: '公棚赛', value: 'pigeon_loft' },
];

// 赛事类型中文映射
const TYPE_LABELS: Record<string, string> = {
  spring: '春赛',
  autumn: '秋赛',
  boiler: '特比环',
  pigeon_loft: '公棚赛',
};

// 赛事列表:ProTable + 新增/编辑表单 + 状态操作 + 进入核验/成绩入口
const CompetitionList = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canEdit = hasPermission(currentUser, 'competition:edit');
  const canVerify = hasPermission(currentUser, 'competition:verify');
  const navigate = useNavigate();
  const actionRef = useRef<ActionType>();

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<CompetitionItem | null>(null);

  // 打开新增弹窗
  const openCreate = () => {
    setEditing(null);
    setModalVisible(true);
  };

  // 打开编辑弹窗
  const openEdit = (record: CompetitionItem) => {
    setEditing(record);
    setModalVisible(true);
  };

  // 提交新增/编辑
  const handleSubmit = async (values: Record<string, unknown>) => {
    const startTime = values.start_time;
    const endTime = values.end_time;
    const payload = {
      name: values.name as string,
      type: (values.type as string) || undefined,
      start_time: startTime ? dayjs(startTime as dayjs.Dayjs).valueOf() : undefined,
      end_time: endTime ? dayjs(endTime as dayjs.Dayjs).valueOf() : undefined,
      location: (values.location as string) || undefined,
      distance: values.distance as number | undefined,
      description: (values.description as string) || undefined,
      organizer: (values.organizer as string) || undefined,
    };
    if (editing) {
      await updateCompetition(editing.id, payload);
      message.success('更新成功');
    } else {
      await createCompetition(payload);
      message.success('新增成功');
    }
    setModalVisible(false);
    actionRef.current?.reload();
    return true;
  };

  // 发布(草稿 → 报名中)
  const handlePublish = async (record: CompetitionItem) => {
    try {
      await publishCompetition(record.id);
      message.success('发布成功,已进入报名中');
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 状态流转到下一个状态
  const handleTransition = async (record: CompetitionItem) => {
    const next = STATUS_FLOW[record.status];
    if (!next) return;
    try {
      await transitionCompetitionStatus(record.id, next);
      message.success(`已切换为「${STATUS_LABELS[next]}」`);
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 删除
  const handleDelete = async (record: CompetitionItem) => {
    try {
      await deleteCompetition(record.id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 获取下一个状态的中文标签
  const getNextStatusLabel = (status: string): string | null => {
    const next = STATUS_FLOW[status];
    return next ? STATUS_LABELS[next] : null;
  };

  const columns: ProColumns<CompetitionItem>[] = [
    { title: '赛事名称', dataIndex: 'name', width: 200, ellipsis: true },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      valueType: 'select',
      valueEnum: {
        spring: { text: '春赛' },
        autumn: { text: '秋赛' },
        boiler: { text: '特比环' },
        pigeon_loft: { text: '公棚赛' },
      },
      render: (_, record) => (record.type ? TYPE_LABELS[record.type] || record.type : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      valueEnum: {
        draft: { text: '草稿' },
        enrolling: { text: '报名中' },
        gathering: { text: '集鸽中' },
        racing: { text: '比赛中' },
        finished: { text: '已结束' },
        archived: { text: '已归档' },
      },
      render: (_, record) => (
        <Tag color={STATUS_COLORS[record.status] || 'default'}>
          {STATUS_LABELS[record.status] || record.status}
        </Tag>
      ),
    },
    {
      title: '开始时间',
      dataIndex: 'start_time',
      width: 160,
      hideInSearch: true,
      render: (_, record) =>
        record.start_time ? dayjs(record.start_time).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '结束时间',
      dataIndex: 'end_time',
      width: 160,
      hideInSearch: true,
      render: (_, record) =>
        record.end_time ? dayjs(record.end_time).format('YYYY-MM-DD HH:mm') : '-',
    },
    { title: '地点', dataIndex: 'location', width: 140, ellipsis: true, hideInSearch: true },
    {
      title: '空距',
      dataIndex: 'distance',
      width: 90,
      hideInSearch: true,
      render: (_, record) => (record.distance != null ? `${record.distance} km` : '-'),
    },
    { title: '主办方', dataIndex: 'organizer', width: 140, ellipsis: true, hideInSearch: true },
    {
      title: '操作',
      key: 'action',
      width: 300,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => {
        const nextLabel = getNextStatusLabel(record.status);
        return (
          <Space size={0} wrap>
            {canVerify && (
              <Button
                type="link"
                size="small"
                icon={<SafetyCertificateOutlined />}
                onClick={() => navigate(`/competition/verify/${record.id}`)}
              >
                核验
              </Button>
            )}
            <Button
              type="link"
              size="small"
              icon={<TrophyOutlined />}
              onClick={() => navigate(`/competition/result/${record.id}`)}
            >
              成绩
            </Button>
            {canEdit && record.status === COMPETITION_STATUS.DRAFT && (
              <Popconfirm
                title="确认发布该赛事?发布后进入报名中。"
                onConfirm={() => handlePublish(record)}
              >
                <Button type="link" size="small">
                  发布
                </Button>
              </Popconfirm>
            )}
            {canEdit &&
              nextLabel &&
              record.status !== COMPETITION_STATUS.DRAFT &&
              record.status !== COMPETITION_STATUS.ARCHIVED && (
                <Popconfirm
                  title={`确认切换为「${nextLabel}」?`}
                  onConfirm={() => handleTransition(record)}
                >
                  <Button type="link" size="small">
                    {nextLabel}
                  </Button>
                </Popconfirm>
              )}
            {canEdit && record.status !== COMPETITION_STATUS.ARCHIVED && (
              <Button type="link" size="small" onClick={() => openEdit(record)}>
                编辑
              </Button>
            )}
            {canEdit &&
              (record.status === COMPETITION_STATUS.DRAFT ||
                record.status === COMPETITION_STATUS.ARCHIVED) && (
                <Popconfirm title="确认删除该赛事?" onConfirm={() => handleDelete(record)}>
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
      <ProTable<CompetitionItem>
        headerTitle="赛事列表"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        options={{ density: false }}
        scroll={{ x: 1500 }}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          const { current, pageSize, name, status, type } = params;
          try {
            const res = await getCompetitionList({
              page: current,
              pageSize,
              name: name as string | undefined,
              status: status as string | undefined,
              type: type as string | undefined,
            });
            return { data: res.list, success: true, total: res.total };
          } catch {
            return { data: [], success: false, total: 0 };
          }
        }}
        toolBarRender={() =>
          canEdit
            ? [
                <Button key="create" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                  新增赛事
                </Button>,
              ]
            : []
        }
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />

      {/* 新增/编辑弹窗 */}
      <ModalForm
        title={editing ? '编辑赛事' : '新增赛事'}
        open={modalVisible}
        onOpenChange={setModalVisible}
        onFinish={handleSubmit}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        width={640}
        initialValues={
          editing
            ? {
                name: editing.name,
                type: editing.type,
                location: editing.location,
                distance: editing.distance,
                organizer: editing.organizer,
                description: editing.description,
                start_time: editing.start_time ? dayjs(editing.start_time) : undefined,
                end_time: editing.end_time ? dayjs(editing.end_time) : undefined,
              }
            : {}
        }
      >
        <ProFormText
          name="name"
          label="赛事名称"
          placeholder="请输入赛事名称"
          rules={[{ required: true, message: '请输入赛事名称' }]}
        />
        <ProFormSelect
          name="type"
          label="赛事类型"
          placeholder="请选择赛事类型"
          options={TYPE_OPTIONS}
        />
        <ProFormText name="organizer" label="主办方" placeholder="请输入主办方" />
        <ProFormText name="location" label="比赛地点" placeholder="请输入比赛地点" />
        <ProFormDigit
          name="distance"
          label="空距(公里)"
          placeholder="请输入空距"
          min={0}
          fieldProps={{ step: 0.1 }}
        />
        <ProFormDateTimePicker name="start_time" label="开始时间" />
        <ProFormDateTimePicker name="end_time" label="结束时间" />
        <ProFormTextArea
          name="description"
          label="赛事规程"
          placeholder="请输入赛事规程"
          fieldProps={{ rows: 4, maxLength: 2000 }}
        />
      </ModalForm>
    </>
  );
};

export default CompetitionList;
