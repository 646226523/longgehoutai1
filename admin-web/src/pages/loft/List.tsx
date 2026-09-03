import {
  ModalForm,
  PageContainer,
  ProFormDigit,
  ProFormRadio,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  App,
  Button,
  Col,
  Divider,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Space,
  Switch,
  Tag,
} from 'antd';
import {
  EditOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import { useTableRefresh } from '../../hooks/useTableRefresh';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import RefreshButton from '../../components/RefreshButton';
import LoftMapPicker from '../../components/LoftMapPicker';
import {
  createLoft,
  getLoftCompetitions,
  getLoftList,
  updateLoft,
  updateLoftStatus,
  type LoftCompetitionItem,
  type LoftItem,
} from '../../services/loft';

const STATUS_ENUM: Record<number, { text: string; color: string }> = {
  1: { text: '营业中', color: 'green' },
  0: { text: '已关闭', color: 'default' },
  2: { text: '暂停营业', color: 'orange' },
  3: { text: '待审核', color: 'gold' },
  4: { text: '审核驳回', color: 'red' },
};

const LoftList = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canEdit = hasPermission(currentUser, 'loft:edit');
  const canCreate = hasPermission(currentUser, 'loft:create');
  const actionRef = useRef<ActionType>();
  const { tableLoading, handleRefresh } = useTableRefresh(actionRef, { messageApi: message });
  const navigate = useNavigate();

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('edit');
  const [modeSelectVisible, setModeSelectVisible] = useState(false);
  const [editing, setEditing] = useState<LoftItem | null>(null);
  const [competitions, setCompetitions] = useState<LoftCompetitionItem[]>([]);
  const [competitionLoading, setCompetitionLoading] = useState(false);
  const [mapLocation, setMapLocation] = useState<{ lng: number; lat: number; address: string } | null>(
    null,
  );

  const openEdit = async (record: LoftItem) => {
    setEditing(record);
    setModalMode('edit');
    setModalVisible(true);
    setMapLocation(null);

    setCompetitionLoading(true);
    try {
      const list = await getLoftCompetitions(record.id);
      setCompetitions(list ?? []);
    } catch {
      setCompetitions([]);
    } finally {
      setCompetitionLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setModalMode('create');
    setMapLocation(null);
    setCompetitions([]);
    setModalVisible(true);
  };

  const handleCreateClick = () => {
    setModeSelectVisible(true);
  };

  const handleModeSelect = (mode: 'manual' | 'audit') => {
    setModeSelectVisible(false);
    if (mode === 'manual') {
      openCreate();
    } else {
      navigate('/loft/audit');
    }
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    let locationStr: string | undefined;
    if (mapLocation) {
      locationStr = JSON.stringify({
        lng: Number(mapLocation.lng.toFixed(6)),
        lat: Number(mapLocation.lat.toFixed(6)),
        address: mapLocation.address,
      });
    } else if (values.location) {
      locationStr = values.location as string;
    }

    if (modalMode === 'create') {
      await createLoft({
        name: values.name as string,
        applicant_name: (values.applicant_name as string) || undefined,
        phone: (values.phone as string) || undefined,
        address: (mapLocation?.address || values.address) as string || undefined,
        capacity: values.capacity as number | undefined,
        location: locationStr,
        description: (values.description as string) || undefined,
        status: (values.status as number) ?? 1,
      });
      message.success('公棚创建成功');
    } else if (editing) {
      await updateLoft(editing.id, {
        name: values.name as string,
        applicant_name: values.applicant_name as string,
        phone: values.phone as string,
        address: (mapLocation?.address || values.address) as string,
        capacity: values.capacity as number,
        location: locationStr,
        description: values.description as string,
        status: values.status as number,
      });
      message.success('更新成功');
    }

    setModalVisible(false);
    handleRefresh();
    return true;
  };

  const handleToggleStatus = async (record: LoftItem, checked: boolean) => {
    try {
      await updateLoftStatus(record.id, checked ? 1 : 0);
      message.success(checked ? '已设为营业中' : '已设为停业');
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  const columns: ProColumns<LoftItem>[] = [
    { title: '序号', dataIndex: 'index', valueType: 'index', width: 60, hideInSearch: true },
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
      width: 130,
      valueType: 'select',
      valueEnum: {
        1: { text: '营业中' },
        0: { text: '已关闭' },
        2: { text: '暂停营业' },
        3: { text: '待审核' },
        4: { text: '审核驳回' },
      },
      render: (_, record) => {
        const s = STATUS_ENUM[record.status] || { text: '未知', color: 'default' };
        const editable = record.status === 1 || record.status === 2 || record.status === 0;
        if (canEdit && editable) {
          return (
            <Popconfirm
              title={
                record.status === 1 ? '确认将此公棚设为停业?' : '确认将此公棚设为营业中?'
              }
              onConfirm={() => handleToggleStatus(record, record.status !== 1)}
            >
              <Switch
                checked={record.status === 1}
                checkedChildren="营业中"
                unCheckedChildren="停业"
              />
            </Popconfirm>
          );
        }
        return <Tag color={s.color}>{s.text}</Tag>;
      },
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

  const renderCapacityBar = (record: LoftItem) => {
    if (!record.capacity || record.capacity <= 0) return <Tag>无容量限制</Tag>;
    const percent = Math.round((record.pigeon_total / record.capacity) * 100);
    const color = percent >= 100 ? 'red' : percent >= 80 ? 'orange' : 'green';
    return (
      <Progress
        percent={percent}
        size="small"
        strokeColor={color}
        format={(p) => `${record.pigeon_total}/${record.capacity}羽 (${p}%)`}
      />
    );
  };

  const parseLocation = (loc: string | null): { lng: number; lat: number } | null => {
    if (!loc) return null;
    try {
      const obj = JSON.parse(loc);
      if (typeof obj.lng === 'number' && typeof obj.lat === 'number') {
        return { lng: obj.lng, lat: obj.lat };
      }
    } catch {}
    return null;
  };

  const isCreateMode = modalMode === 'create';

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
        loading={tableLoading}
        rowKey="id"
        columns={columns}
        options={{ density: false, reload: false }}
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
            return { data: res?.list ?? [], success: true, total: res?.total ?? 0 };
          } catch {
            return { data: [], success: false, total: 0 };
          }
        }}
        toolBarRender={() =>
          canEdit || canCreate
            ? [
                <Button
                  key="create"
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreateClick}
                >
                  创建公棚
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
        title="创建公棚"
        open={modeSelectVisible}
        onCancel={() => setModeSelectVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setModeSelectVisible(false)}>
            取消
          </Button>,
        ]}
        width={480}
      >
        <div style={{ padding: '8px 0' }}>
          <div
            style={{
              border: '1px solid #f0f0f0',
              borderRadius: 8,
              padding: 16,
              marginBottom: 12,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#1677ff')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#f0f0f0')}
            onClick={() => handleModeSelect('manual')}
          >
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
              <PlusOutlined style={{ color: '#1677ff', marginRight: 8 }} />
              手动创建（直接生效）
            </div>
            <div style={{ color: '#666', fontSize: 13 }}>
              管理员直接填写公棚信息，立即创建完成
            </div>
          </div>
          <div
            style={{
              border: '1px solid #f0f0f0',
              borderRadius: 8,
              padding: 16,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#1677ff')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#f0f0f0')}
            onClick={() => handleModeSelect('audit')}
          >
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
              <ScheduleOutlined style={{ color: '#faad14', marginRight: 8 }} />
              入驻申请审核
            </div>
            <div style={{ color: '#666', fontSize: 13 }}>
              查看公棚方提交的入驻申请，审核通过后自动创建
            </div>
          </div>
        </div>
      </Modal>

      <ModalForm
        title={isCreateMode ? '创建公棚' : '编辑公棚信息'}
        open={modalVisible}
        onOpenChange={setModalVisible}
        onFinish={handleSubmit}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        width={1080}
        initialValues={
          isCreateMode
            ? { status: 1 }
            : editing
              ? {
                  name: editing.name,
                  applicant_name: editing.applicant_name,
                  phone: editing.phone,
                  address: editing.address,
                  capacity: editing.capacity,
                  location: editing.location,
                  description: editing.description,
                  status: editing.status,
                }
              : {}
        }
      >
        <Row gutter={16}>
          <Col span={12}>
            <Divider orientation="left" orientationMargin={0} style={{ marginTop: 0 }}>
              基础信息
            </Divider>

            <ProFormText
              name="name"
              label="公棚名称"
              placeholder="请输入公棚名称"
              rules={[{ required: true, message: '请输入公棚名称' }]}
            />

            {!isCreateMode && (
              <ProFormText
                name="code"
                label="公棚编码"
                fieldProps={{ disabled: true }}
              />
            )}

            <ProFormText name="applicant_name" label="负责人" placeholder="请输入负责人姓名" />

            <ProFormText name="phone" label="联系电话" placeholder="请输入联系电话" />

            <ProFormTextArea
              name="description"
              label="公棚简介"
              placeholder="请输入公棚简介"
              fieldProps={{ rows: 3, maxLength: 500, showCount: true }}
            />

            <Divider orientation="left" orientationMargin={0}>
              位置信息
            </Divider>

            <ProFormText
              name="address"
              label="公棚地址"
              placeholder="请输入公棚地址"
              extra="可在右侧地图选点,自动填充地址和经纬度"
            />

            <Divider orientation="left" orientationMargin={0}>
              运营配置
            </Divider>

            <ProFormDigit
              name="capacity"
              label="公棚容量(羽)"
              placeholder="请输入容量"
              min={0}
              fieldProps={{ precision: 0 }}
            />

            {editing && !isCreateMode && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ marginBottom: 4, color: '#666' }}>存棚鸽只</div>
                {renderCapacityBar(editing)}
              </div>
            )}

            <ProFormRadio.Group
              name="status"
              label="公棚状态"
              options={[
                { label: '营业中', value: 1 },
                { label: '暂停营业', value: 2 },
                { label: '已关闭', value: 0 },
              ]}
            />
          </Col>

          <Col span={12}>
            <Divider orientation="left" orientationMargin={0} style={{ marginTop: 0 }}>
              地图定位
            </Divider>

            <LoftMapPicker
              lng={editing ? parseLocation(editing.location)?.lng ?? null : null}
              lat={editing ? parseLocation(editing.location)?.lat ?? null : null}
              address={editing?.address ?? undefined}
              height={340}
              onChange={(data) => {
                setMapLocation(data);
              }}
            />

            <Divider orientation="left" orientationMargin={0}>
              已关联赛事 ({competitions.length})
            </Divider>

            {isCreateMode ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
                创建公棚后将自动关联赛事
              </div>
            ) : competitionLoading ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>加载中...</div>
            ) : competitions.length > 0 ? (
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {competitions.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #f0f0f0',
                      borderRadius: 4,
                      marginBottom: 8,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: '#999' }}>
                        {c.date_from || c.date_to
                          ? `${c.date_from || '-'} ~ ${c.date_to || '-'}`
                          : '未设置时间'}
                      </div>
                    </div>
                    <Tag color={String(c.status) === '1' || c.status === 'ongoing' ? 'green' : 'default'}>
                      {String(c.status)}
                    </Tag>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
                暂无关联的赛事
              </div>
            )}
          </Col>
        </Row>
      </ModalForm>
    </PageContainer>
  );
};

export default LoftList;
