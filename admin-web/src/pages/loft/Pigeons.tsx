import {
  ProTable,
  ModalForm,
  ProFormText,
  ProFormTextArea,
  ProFormDateTimePicker,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { PageContainer } from '@ant-design/pro-components';
import { Button, Popconfirm, Space, Tag } from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, ExportOutlined, PlusOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAntdApp } from '../../hooks/useAntdApp';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import {
  createPigeon,
  deletePigeon,
  getLoftDetail,
  getPigeonList,
  outPigeon,
  type LoftItem,
  type LoftPigeonItem,
} from '../../services/loft';

// 鸽棚与存棚鸽只管理:列表 + 入棚登记 + 出棚操作
const LoftPigeons = () => {
  const { message } = useAntdApp();
  const params = useParams<{ id: string }>();
  const loftId = Number(params.id);
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const canEdit = hasPermission(currentUser, 'loft:edit');
  const actionRef = useRef<ActionType>();

  const [loft, setLoft] = useState<LoftItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // 加载公棚详情(用于标题展示)
  useEffect(() => {
    if (!Number.isFinite(loftId)) return;
    getLoftDetail(loftId)
      .then(setLoft)
      .catch(() => {
        // 拦截器已提示错误
      });
  }, [loftId]);

  // 入棚登记
  const handleCreate = async (values: Record<string, unknown>) => {
    if (!Number.isFinite(loftId)) return false;
    const inTime = values.in_time ? dayjs(values.in_time as string).valueOf() : undefined;
    try {
      const res = await createPigeon(loftId, {
        ring_number: (values.ring_number as string).trim(),
        in_time: inTime,
        remark: (values.remark as string | undefined)?.trim() || undefined,
      });
      if (res.gene_profile_exists) {
        message.success('入棚登记成功,已关联基因档案');
      } else {
        message.warning('入棚登记成功,但未找到对应基因档案(足环号未匹配)');
      }
      setModalVisible(false);
      actionRef.current?.reload();
      return true;
    } catch {
      return false;
    }
  };

  // 出棚登记
  const handleOut = async (record: LoftPigeonItem) => {
    try {
      await outPigeon(loftId, record.id);
      message.success('出棚登记成功');
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 删除
  const handleDelete = async (record: LoftPigeonItem) => {
    try {
      await deletePigeon(loftId, record.id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示错误
    }
  };

  const columns: ProColumns<LoftPigeonItem>[] = [
    { title: '足环号', dataIndex: 'ring_number', width: 180, ellipsis: true },
    {
      title: '基因档案',
      key: 'gene',
      width: 140,
      hideInSearch: true,
      render: (_, record) =>
        record.gene_profile_id ? (
          <Tag color="blue">已关联</Tag>
        ) : (
          <Tag color="default">未关联</Tag>
        ),
    },
    {
      title: '入棚时间',
      dataIndex: 'in_time',
      width: 160,
      hideInSearch: true,
      render: (_, record) => (record.in_time ? dayjs(record.in_time).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: '出棚时间',
      dataIndex: 'out_time',
      width: 160,
      hideInSearch: true,
      render: (_, record) => (record.out_time ? dayjs(record.out_time).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      valueEnum: { in: { text: '在棚' }, out: { text: '已出棚' } },
      render: (_, record) => (
        <Tag color={record.status === 'in' ? 'green' : 'default'}>
          {record.status === 'in' ? '在棚' : '已出棚'}
        </Tag>
      ),
    },
    { title: '备注', dataIndex: 'remark', width: 160, ellipsis: true, hideInSearch: true },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space>
          {canEdit && record.status === 'in' && (
            <Popconfirm title="确认对该鸽只进行出棚登记?" onConfirm={() => handleOut(record)}>
              <Button type="link" size="small" icon={<ExportOutlined />}>
                出棚
              </Button>
            </Popconfirm>
          )}
          {canEdit && (
            <Popconfirm title="确认删除该存棚鸽只记录?" onConfirm={() => handleDelete(record)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  if (!Number.isFinite(loftId)) {
    return (
      <PageContainer header={{ title: '存棚鸽只管理', breadcrumb: {} }}>
        <Tag color="red">无效的公棚 ID</Tag>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      header={{
        title: `存棚鸽只管理${loft ? ` - ${loft.name}` : ''}`,
        breadcrumb: {},
      }}
    >
      <ProTable<LoftPigeonItem>
        headerTitle={loft ? `${loft.name}(${loft.code})` : '存棚鸽只列表'}
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        options={{ density: false }}
        scroll={{ x: 1100 }}
        search={{ labelWidth: 'auto' }}
        request={async (q) => {
          const { current, pageSize, status, ring_number } = q;
          try {
            const res = await getPigeonList(loftId, {
              page: current,
              pageSize,
              status: (status as string | undefined) || undefined,
              ring_number: ring_number as string | undefined,
            });
            return { data: res.list, success: true, total: res.total };
          } catch {
            return { data: [], success: false, total: 0 };
          }
        }}
        toolBarRender={() =>
          canEdit
            ? [
                <Button key="back" icon={<ArrowLeftOutlined />} onClick={() => navigate('/loft/list')}>
                  返回列表
                </Button>,
                <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
                  入棚登记
                </Button>,
              ]
            : [
                <Button key="back" icon={<ArrowLeftOutlined />} onClick={() => navigate('/loft/list')}>
                  返回列表
                </Button>,
              ]
        }
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />

      {/* 入棚登记弹窗 */}
      <ModalForm
        title="入棚登记"
        open={modalVisible}
        onOpenChange={setModalVisible}
        onFinish={handleCreate}
        modalProps={{ destroyOnClose: true, maskClosable: false }}
        width={520}
      >
        <ProFormText
          name="ring_number"
          label="足环号"
          placeholder="请输入足环号,系统将自动关联基因档案"
          rules={[{ required: true, message: '请输入足环号' }]}
          extra="输入足环号后,系统将查询基因档案进行关联;若基因档案尚未建立则仅记录足环号"
        />
        <ProFormDateTimePicker
          name="in_time"
          label="入棚时间"
          placeholder="请选择入棚时间,默认当前时间"
          transform={(val) => (val ? dayjs(val).valueOf() : val)}
        />
        <ProFormTextArea
          name="remark"
          label="备注"
          placeholder="可填写备注信息"
          fieldProps={{ autoSize: { minRows: 2, maxRows: 4 }, maxLength: 200, showCount: true }}
        />
      </ModalForm>
    </PageContainer>
  );
};

export default LoftPigeons;
