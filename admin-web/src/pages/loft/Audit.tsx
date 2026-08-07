import {
  ProTable,
  ProFormTextArea,
  ModalForm,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { PageContainer } from '@ant-design/pro-components';
import { Button, Descriptions, Drawer, Space, Tag } from 'antd';
import { CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import { useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useAntdApp } from '../../hooks/useAntdApp';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import {
  approveApplication,
  getApplicationList,
  rejectApplication,
  type ApplicationStatus,
  type LoftApplicationItem,
} from '../../services/loft';

// 状态标签映射
const statusTag: Record<ApplicationStatus, { text: string; color: string }> = {
  pending: { text: '待审核', color: 'orange' },
  approved: { text: '已通过', color: 'green' },
  rejected: { text: '已驳回', color: 'red' },
};

// 公棚入驻申请审核:待审列表 + 审核详情抽屉 + 通过/驳回
const LoftAudit = () => {
  const { message } = useAntdApp();
  const currentUser = useCurrentUser();
  const canAudit = hasPermission(currentUser, 'loft:audit');
  const actionRef = useRef<ActionType>();

  // 详情抽屉
  const [drawer, setDrawer] = useState<{ visible: boolean; record: LoftApplicationItem | null }>({
    visible: false,
    record: null,
  });

  // 审核操作弹窗:approve / reject
  const [opModal, setOpModal] = useState<{ visible: boolean; type: 'approve' | 'reject'; id: number | null }>({
    visible: false,
    type: 'approve',
    id: null,
  });

  // 打开审核详情抽屉
  const openDetail = (record: LoftApplicationItem) => {
    setDrawer({ visible: true, record });
  };

  // 打开通过/驳回弹窗
  const openOp = (record: LoftApplicationItem, type: 'approve' | 'reject') => {
    setOpModal({ visible: true, type, id: record.id });
  };

  // 提交审核
  const handleAudit = async (values: Record<string, unknown>) => {
    if (!opModal.id) return false;
    const remark = (values.audit_remark as string | undefined)?.trim() ?? '';
    if (opModal.type === 'reject' && !remark) {
      message.error('请填写驳回理由');
      return false;
    }
    try {
      if (opModal.type === 'approve') {
        await approveApplication(opModal.id, remark || undefined);
        message.success('审核通过,公棚已创建');
      } else {
        await rejectApplication(opModal.id, remark);
        message.success('已驳回');
      }
      setOpModal({ visible: false, type: opModal.type, id: null });
      setDrawer({ visible: false, record: null });
      actionRef.current?.reload();
      return true;
    } catch {
      return false;
    }
  };

  const columns: ProColumns<LoftApplicationItem>[] = [
    { title: '公棚名称', dataIndex: 'loft_name', width: 160, ellipsis: true },
    { title: '申请人', dataIndex: 'applicant_name', width: 100, ellipsis: true },
    { title: '联系电话', dataIndex: 'phone', width: 130, ellipsis: true },
    { title: '容量(羽)', dataIndex: 'capacity', width: 100, hideInSearch: true },
    { title: '地址', dataIndex: 'address', width: 220, ellipsis: true, hideInSearch: true },
    {
      title: '审核状态',
      dataIndex: 'status',
      width: 110,
      valueType: 'select',
      valueEnum: {
        pending: { text: '待审核' },
        approved: { text: '已通过' },
        rejected: { text: '已驳回' },
      },
      render: (_, record) => {
        const t = statusTag[record.status];
        return <Tag color={t.color}>{t.text}</Tag>;
      },
    },
    {
      title: '提交时间',
      dataIndex: 'created_at',
      width: 160,
      hideInSearch: true,
      render: (_, record) => (record.created_at ? dayjs(record.created_at).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>
            审核
          </Button>
          {canAudit && record.status === 'pending' && (
            <>
              <Button type="link" size="small" style={{ color: '#52c41a' }} icon={<CheckOutlined />} onClick={() => openOp(record, 'approve')}>
                通过
              </Button>
              <Button type="link" size="small" danger icon={<CloseOutlined />} onClick={() => openOp(record, 'reject')}>
                驳回
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: '公棚入驻审核',
        breadcrumb: {},
      }}
    >
      <ProTable<LoftApplicationItem>
        headerTitle="入驻申请列表"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        options={{ density: false }}
        scroll={{ x: 1200 }}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          const { current, pageSize, status, keyword } = params;
          try {
            const res = await getApplicationList({
              page: current,
              pageSize,
              status: (status as string | undefined) || 'pending',
              keyword: keyword as string | undefined,
            });
            return { data: res.list, success: true, total: res.total };
          } catch {
            return { data: [], success: false, total: 0 };
          }
        }}
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />

      {/* 审核详情抽屉 */}
      <Drawer
        title="入驻申请详情"
        width={560}
        open={drawer.visible}
        onClose={() => setDrawer({ visible: false, record: null })}
        extra={
          canAudit && drawer.record?.status === 'pending' ? (
            <Space>
              <Button type="primary" icon={<CheckOutlined />} onClick={() => openOp(drawer.record!, 'approve')}>
                通过
              </Button>
              <Button danger icon={<CloseOutlined />} onClick={() => openOp(drawer.record!, 'reject')}>
                驳回
              </Button>
            </Space>
          ) : null
        }
      >
        {drawer.record && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="公棚名称">{drawer.record.loft_name}</Descriptions.Item>
            <Descriptions.Item label="申请人">{drawer.record.applicant_name}</Descriptions.Item>
            <Descriptions.Item label="联系电话">{drawer.record.phone}</Descriptions.Item>
            <Descriptions.Item label="身份证号">{drawer.record.id_card || '-'}</Descriptions.Item>
            <Descriptions.Item label="资质说明">{drawer.record.qualification || '-'}</Descriptions.Item>
            <Descriptions.Item label="场地证明">
              {drawer.record.site_proof ? (
                <a href={drawer.record.site_proof} target="_blank" rel="noreferrer">
                  查看证明材料
                </a>
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="容量(羽)">{drawer.record.capacity ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="公棚地址">{drawer.record.address || '-'}</Descriptions.Item>
            <Descriptions.Item label="审核状态">
              {(() => {
                const t = statusTag[drawer.record.status];
                return <Tag color={t.color}>{t.text}</Tag>;
              })()}
            </Descriptions.Item>
            <Descriptions.Item label="审核备注">{drawer.record.audit_remark || '-'}</Descriptions.Item>
            <Descriptions.Item label="审核时间">
              {drawer.record.audited_at ? dayjs(drawer.record.audited_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="提交时间">
              {dayjs(drawer.record.created_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      {/* 通过/驳回弹窗 */}
      <ModalForm
        title={opModal.type === 'approve' ? '审核通过' : '驳回申请'}
        open={opModal.visible}
        onOpenChange={(v) => setOpModal({ visible: v, type: opModal.type, id: v ? opModal.id : null })}
        onFinish={handleAudit}
        modalProps={{ destroyOnClose: true, maskClosable: false }}
        width={480}
      >
        <ProFormTextArea
          name="audit_remark"
          label={opModal.type === 'approve' ? '审核备注(可选)' : '驳回理由'}
          placeholder={opModal.type === 'approve' ? '可填写审核备注,留空则不填' : '请填写驳回理由'}
          rules={opModal.type === 'reject' ? [{ required: true, message: '请填写驳回理由' }] : []}
          fieldProps={{ autoSize: { minRows: 3, maxRows: 6 }, maxLength: 500, showCount: true }}
        />
      </ModalForm>
    </PageContainer>
  );
};

export default LoftAudit;
