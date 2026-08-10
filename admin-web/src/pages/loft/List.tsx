import {
  ModalForm,
  PageContainer,
  ProFormDigit,
  ProFormText,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { App, Button, Popconfirm, Space, Switch, Tag } from 'antd';
import { EditOutlined, EnvironmentOutlined, PlusOutlined } from '@ant-design/icons';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import {
  getLoftList,
  updateLoft,
  updateLoftStatus,
  type LoftItem,
} from '../../services/loft';

// 公棚信息管理:列表 / 编辑 / 状态切换 / 进入存棚鸽只管理
const LoftList = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canEdit = hasPermission(currentUser, 'loft:edit');
  const actionRef = useRef<ActionType>();
  const navigate = useNavigate();

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<LoftItem | null>(null);

  // 打开编辑弹窗
  const openEdit = (record: LoftItem) => {
    setEditing(record);
    setModalVisible(true);
  };

  // 提交编辑
  const handleSubmit = async (values: Record<string, unknown>) => {
    if (!editing) return false;
    // location 字段以文本形式保存(可填 JSON 或坐标串)
    await updateLoft(editing.id, {
      name: values.name as string,
      applicant_name: values.applicant_name as string,
      phone: values.phone as string,
      address: values.address as string,
      capacity: values.capacity as number,
      location: values.location as string,
    });
    message.success('更新成功');
    setModalVisible(false);
    actionRef.current?.reload();
    return true;
  };

  // 切换状态
  const handleToggleStatus = async (record: LoftItem, checked: boolean) => {
    try {
      await updateLoftStatus(record.id, checked ? 1 : 0);
      message.success(checked ? '已设为营业中' : '已设为停业');
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示错误
    }
  };

  const columns: ProColumns<LoftItem>[] = [
    { title: '公棚名称', dataIndex: 'name', width: 160, ellipsis: true },
    { title: '编码', dataIndex: 'code', width: 180, ellipsis: true, hideInSearch: true },
    { title: '负责人', dataIndex: 'applicant_name', width: 100, ellipsis: true, hideInSearch: true },
    { title: '联系电话', dataIndex: 'phone', width: 130, ellipsis: true, hideInSearch: true },
    { title: '地址', dataIndex: 'address', width: 220, ellipsis: true, hideInSearch: true },
    { title: '容量', dataIndex: 'capacity', width: 80, hideInSearch: true },
    {
      title: '存棚鸽只',
      key: 'pigeon',
      width: 110,
      hideInSearch: true,
      render: (_, record) => (
        <span>
          <Tag color="green">{record.pigeon_in} 在棚</Tag>
          <Tag>共 {record.pigeon_total}</Tag>
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      valueType: 'select',
      valueEnum: { 1: { text: '营业中' }, 0: { text: '停业' } },
      render: (_, record) =>
        canEdit ? (
          <Popconfirm
            title={record.status === 1 ? '确认将此公棚设为停业?' : '确认将此公棚设为营业中?'}
            onConfirm={() => handleToggleStatus(record, record.status !== 1)}
          >
            <Switch
              checked={record.status === 1}
              checkedChildren="营业中"
              unCheckedChildren="停业"
            />
          </Popconfirm>
        ) : (
          <Tag color={record.status === 1 ? 'green' : 'default'}>
            {record.status === 1 ? '营业中' : '停业'}
          </Tag>
        ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 160,
      hideInSearch: true,
      render: (_, record) => (record.created_at ? dayjs(record.created_at).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EnvironmentOutlined />}
            onClick={() => navigate(`/loft/pigeons/${record.id}`)}
          >
            存棚鸽只
          </Button>
          {canEdit && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
              编辑
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: '公棚列表',
        breadcrumb: {},
      }}
    >
      <ProTable<LoftItem>
        headerTitle="公棚信息管理"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        options={{ density: false }}
        scroll={{ x: 1200 }}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          const { current, pageSize, name, status } = params;
          try {
            const res = await getLoftList({
              page: current,
              pageSize,
              name: name as string | undefined,
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
                <Button key="tip" type="primary" icon={<PlusOutlined />} disabled>
                  新公棚由入驻审核创建
                </Button>,
              ]
            : []
        }
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />

      {/* 编辑弹窗 */}
      <ModalForm
        title="编辑公棚信息"
        open={modalVisible}
        onOpenChange={setModalVisible}
        onFinish={handleSubmit}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        width={560}
        initialValues={
          editing
            ? {
                name: editing.name,
                applicant_name: editing.applicant_name,
                phone: editing.phone,
                address: editing.address,
                capacity: editing.capacity,
                location: editing.location,
              }
            : {}
        }
      >
        <ProFormText
          name="name"
          label="公棚名称"
          placeholder="请输入公棚名称"
          rules={[{ required: true, message: '请输入公棚名称' }]}
        />
        <ProFormText name="applicant_name" label="负责人" placeholder="请输入负责人姓名" />
        <ProFormText name="phone" label="联系电话" placeholder="请输入联系电话" />
        <ProFormText name="address" label="公棚地址" placeholder="请输入公棚地址" />
        <ProFormDigit
          name="capacity"
          label="容量(羽)"
          placeholder="请输入容量"
          min={0}
          fieldProps={{ precision: 0 }}
        />
        <ProFormText
          name="location"
          label="经纬度"
          placeholder="可填 JSON 或坐标串,如 {&quot;lng&quot;:116.4,&quot;lat&quot;:39.9}"
        />
      </ModalForm>
    </PageContainer>
  );
};

export default LoftList;
