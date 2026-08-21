import {
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { App, Button, Drawer, Popconfirm, Space, Tag } from 'antd';
import { PlusOutlined, QrcodeOutlined, EyeOutlined } from '@ant-design/icons';
import React, { useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import RefreshButton from '../../components/RefreshButton';
import { useTableRefresh } from '../../hooks/useTableRefresh';
import GeneForm from './GeneForm';
import {
  createGeneProfile,
  deleteGeneProfile,
  getGeneProfiles,
  regenerateGeneQrcode,
  updateGeneProfile,
  type GeneProfile,
  type GeneProfileCreateParams,
} from '../../services/gene';

const GENDER_MAP: Record<string, string> = { male: '雄', female: '雌', unknown: '未知' };

const PhotoThumb: React.FC<{ url?: string | null }> = ({ url }) => {
  const [errored, setErrored] = useState(false);
  if (!url || errored) {
    return (
      <div
        style={{
          width: 50,
          height: 50,
          borderRadius: 4,
          background: '#f5f5f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 12, color: '#bfbfbf' }}>无</span>
      </div>
    );
  }
  return (
    <img
      src={url}
      alt="鸽只照片"
      style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4, display: 'block' }}
      onError={() => setErrored(true)}
    />
  );
};

const GeneList = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canEdit = hasPermission(currentUser, 'gene:edit');
  const navigate = useNavigate();
  const actionRef = useRef<ActionType>();
  const { tableLoading, handleRefresh } = useTableRefresh(actionRef, { messageApi: message });

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editing, setEditing] = useState<GeneProfile | null>(null);
  const [formKey, setFormKey] = useState(0);

  const openCreate = () => {
    setEditing(null);
    setDrawerVisible(true);
  };

  const openEdit = (record: GeneProfile) => {
    setEditing(record);
    setDrawerVisible(true);
  };

  const handleFormSubmit = async (values: GeneProfileCreateParams, mode: 'confirm' | 'save-new') => {
    const payload = {
      ring_number: values.ring_number,
      name: values.name,
      gender: values.gender ?? 'unknown',
      breed: values.breed ?? '',
      bloodline: values.bloodline ?? '',
      owner_name: values.owner_name ?? '',
      owner_phone: values.owner_phone ?? undefined,
      color: values.color ?? undefined,
      eye_color: values.eye_color ?? undefined,
      birth_date: values.birth_date || undefined,
      gene_sequence: values.gene_sequence ?? undefined,
      photo_url: values.photo_url ?? undefined,
      status: values.status ?? 1,
      sire_id: values.sire_id ?? null,
      dam_id: values.dam_id ?? null,
    };

    if (editing) {
      await updateGeneProfile(editing.id, payload);
      message.success('更新成功');
    } else {
      await createGeneProfile(payload);
      message.success('新增成功');
    }

    handleRefresh();

    if (mode === 'confirm') {
      setDrawerVisible(false);
    } else {
      setEditing(null);
      setFormKey((prev) => prev + 1);
    }
  };

  const handleRegenQrcode = async (record: GeneProfile) => {
    try {
      await regenerateGeneQrcode(record.id);
      message.success('二维码已重新生成');
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  const handleDelete = async (record: GeneProfile) => {
    try {
      await deleteGeneProfile(record.id);
      message.success('删除成功');
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  const columns: ProColumns<GeneProfile>[] = [
    { title: '序号', dataIndex: 'index', valueType: 'index', width: 60, hideInSearch: true },
    {
      title: '照片',
      dataIndex: 'photo_url',
      width: 100,
      hideInSearch: true,
      render: (_, record) => <PhotoThumb url={record.photo_url} />,
    },
    { title: '足环号', dataIndex: 'ring_number', width: 160, ellipsis: true },
    { title: '鸽名', dataIndex: 'name', width: 120, ellipsis: true, hideInSearch: true },
    {
      title: '性别',
      dataIndex: 'gender',
      width: 80,
      valueType: 'select',
      valueEnum: { male: { text: '雄' }, female: { text: '雌' }, unknown: { text: '未知' } },
      render: (_, record) => <Tag>{GENDER_MAP[record.gender] ?? record.gender}</Tag>,
      hideInSearch: true,
    },
    { title: '品种', dataIndex: 'breed', width: 100, ellipsis: true, hideInSearch: true },
    { title: '血统', dataIndex: 'bloodline', width: 150, ellipsis: true },
    { title: '鸽主', dataIndex: 'owner_name', width: 110, ellipsis: true },
    { title: '鸽主电话', dataIndex: 'owner_phone', width: 130, ellipsis: true, hideInSearch: true },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      valueType: 'select',
      valueEnum: { 1: { text: '正常' }, 0: { text: '停用' } },
      render: (_, record) => (
        <Tag color={record.status === 1 ? 'green' : 'default'}>
          {record.status === 1 ? '正常' : '停用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 160,
      hideInSearch: true,
      render: (_, record) =>
        record.created_at ? dayjs(record.created_at).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 230,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/gene/detail/${record.id}`)}
          >
            详情
          </Button>
          {canEdit && (
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          )}
          {canEdit && (
            <Button
              type="link"
              size="small"
              icon={<QrcodeOutlined />}
              onClick={() => handleRegenQrcode(record)}
            >
              二维码
            </Button>
          )}
          {canEdit && (
            <Popconfirm
              title="确认删除该基因档案?关联的检测记录与血统关系将一并删除。"
              onConfirm={() => handleDelete(record)}
            >
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <ProTable<GeneProfile>
        headerTitle="基因档案列表"
        actionRef={actionRef}
        loading={tableLoading}
        rowKey="id"
        columns={columns}
        options={{ density: false, reload: false }}
        scroll={{ x: 1400 }}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          const { current, pageSize, ring_number, owner_name, bloodline, status } = params;
          try {
            const res = await getGeneProfiles({
              page: current,
              pageSize,
              ring_number: ring_number as string | undefined,
              owner_name: owner_name as string | undefined,
              bloodline: bloodline as string | undefined,
              status: status as number | string | undefined,
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
                  新增档案
                </Button>,
                <RefreshButton key="refresh" actionRef={actionRef as any} />,
              ]
            : [
                <RefreshButton key="refresh" actionRef={actionRef as any} />,
              ]
        }
        pagination={{
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          defaultPageSize: 10,
        }}
      />

      <Drawer
        title={editing ? '编辑基因档案' : '新增基因档案'}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={window.innerWidth >= 1920 ? 1100 : 720}
        destroyOnHidden
        maskClosable={false}
        footer={null}
        styles={{ body: { padding: 0 } }}
      >
        <GeneForm
          key={formKey}
          initialData={editing || undefined}
          onCancel={() => setDrawerVisible(false)}
          onSubmit={handleFormSubmit}
        />
      </Drawer>
    </>
  );
};

export default GeneList;