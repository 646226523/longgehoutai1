import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components';
import { App, Button, Popconfirm, Space, Tag } from 'antd';
import { PlusOutlined, TrophyOutlined, SafetyCertificateOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import { useCurrentUser } from '../../app-context';
import { useTableRefresh } from '../../hooks/useTableRefresh';
import RefreshButton from '../../components/RefreshButton';
import { hasPermission } from '../../access';
import CompetitionForm from './CompetitionForm';
import {
  deleteCompetition,
  getCompetitionList,
  publishCompetition,
  transitionCompetitionStatus,
  type CompetitionItem,
  COMPETITION_STATUS,
  STATUS_FLOW,
  STATUS_LABELS,
  STATUS_COLORS,
} from '../../services/competition';

// 赛事类型中文映射
const TYPE_LABELS: Record<string, string> = {
  spring: '春赛',
  autumn: '秋赛',
  boiler: '特比环',
  pigeon_loft: '公棚赛',
};

// 赛事列表:ProTable + 全屏表单 + 状态操作 + 进入核验/成绩入口
const CompetitionList = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canEdit = hasPermission(currentUser, 'competition:edit');
  const canVerify = hasPermission(currentUser, 'competition:verify');
  const navigate = useNavigate();
  const actionRef = useRef<ActionType>();
  const { tableLoading, handleRefresh } = useTableRefresh(actionRef, { messageApi: message });

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CompetitionItem | null>(null);

  // 打开新增表单
  const openCreate = () => {
    setEditing(null);
    setShowForm(true);
  };

  // 打开编辑表单
  const openEdit = (record: CompetitionItem) => {
    setEditing(record);
    setShowForm(true);
  };

  // 关闭表单
  const handleCancel = () => {
    setShowForm(false);
    setEditing(null);
  };

  // 表单提交成功
  const handleFormSuccess = () => {
    setShowForm(false);
    setEditing(null);
    handleRefresh();
  };

  // 发布(草稿 → 报名中)
  const handlePublish = async (record: CompetitionItem) => {
    try {
      await publishCompetition(record.id);
      message.success('发布成功,已进入报名中');
      handleRefresh();
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
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 删除
  const handleDelete = async (record: CompetitionItem) => {
    try {
      await deleteCompetition(record.id);
      message.success('删除成功');
      handleRefresh();
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
    { title: '序号', dataIndex: 'index', valueType: 'index', width: 60, hideInSearch: true },
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
      render: (_, record) => (record.distance != null ? `${Number(record.distance).toFixed(2)} km` : '-'),
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

  // 表单模式
  if (showForm) {
    return (
      <div style={{ padding: '0' }}>
        <div style={{ marginBottom: 16 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleCancel}
            style={{ marginBottom: 8 }}
          >
            返回赛事列表
          </Button>
          <h2 style={{ margin: 0 }}>{editing ? '编辑赛事' : '新增赛事'}</h2>
          <p style={{ color: '#999', margin: 0 }}>
            {editing
              ? '修改赛事信息和赛线设置'
              : '创建新赛事，通过地图选点规划赛线'}
          </p>
        </div>
        <CompetitionForm
          record={editing}
          onCancel={handleCancel}
          onSuccess={handleFormSuccess}
        />
      </div>
    );
  }

  return (
    <ProTable<CompetitionItem>
      headerTitle="赛事列表"
      actionRef={actionRef}
      loading={tableLoading}
      rowKey="id"
      columns={columns}
      options={{ density: false, reload: false }}
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
  );
};

export default CompetitionList;
