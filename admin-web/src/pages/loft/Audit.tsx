import {
  ProTable,
  ProFormTextArea,
  ModalForm,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { PageContainer } from '@ant-design/pro-components';
import {
  App,
  Button,
  Card,
  Descriptions,
  Drawer,
  Image,
  Space,
  Steps,
  Tabs,
  Tag,
  Timeline,
} from 'antd';
import {
  CheckCircleOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CloseOutlined,
  EyeOutlined,
  FileOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';

import { useTableRefresh } from '../../hooks/useTableRefresh';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import RefreshButton from '../../components/RefreshButton';
import {
  approveApplication,
  getApplicationList,
  rejectApplication,
  type ApplicationStatus,
  type LoftApplicationItem,
} from '../../services/loft';

const statusTag: Record<ApplicationStatus, { text: string; color: string }> = {
  pending: { text: '待审核', color: 'gold' },
  approved: { text: '已通过', color: 'green' },
  rejected: { text: '已驳回', color: 'red' },
};

const isImageUrl = (url: string) => /\.(jpg|jpeg|png|gif|bmp|webp|svg)(\?.*)?$/i.test(url);

const parseUrls = (raw: string | null | undefined): string[] => {
  if (!raw) return [];
  return raw
    .split(/[,，]/)
    .map((u) => u.trim())
    .filter((u) => u.length > 0);
};

const materialTypes = [
  { key: 'business', label: '营业执照', icon: '📋' },
  { key: 'site', label: '公棚场地证明', icon: '🏞️' },
  { key: 'qualification', label: '资质证书', icon: '📜' },
];

const LoftAudit = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canAudit = hasPermission(currentUser, 'loft:audit');
  const actionRef = useRef<ActionType>();
  const { tableLoading, handleRefresh } = useTableRefresh(actionRef, { messageApi: message });

  const [activeTab, setActiveTab] = useState<string>('pending');

  const [drawer, setDrawer] = useState<{ visible: boolean; record: LoftApplicationItem | null }>({
    visible: false,
    record: null,
  });

  const [opModal, setOpModal] = useState<{
    visible: boolean;
    type: 'approve' | 'reject';
    id: number | null;
  }>({
    visible: false,
    type: 'approve',
    id: null,
  });

  const openDetail = (record: LoftApplicationItem) => {
    setDrawer({ visible: true, record });
  };

  const openOp = (record: LoftApplicationItem, type: 'approve' | 'reject') => {
    setOpModal({ visible: true, type, id: record.id });
  };

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
        message.success('审核通过，公棚已创建');
      } else {
        await rejectApplication(opModal.id, remark);
        message.success('已驳回');
      }
      setOpModal({ visible: false, type: opModal.type, id: null });
      setDrawer({ visible: false, record: null });
      handleRefresh();
      return true;
    } catch {
      return false;
    }
  };

  const columns: ProColumns<LoftApplicationItem>[] = [
    { title: '序号', dataIndex: 'index', valueType: 'index', width: 60, hideInSearch: true },
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
      width: 260,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => openDetail(record)}
          >
            查看详情
          </Button>
          {canAudit && record.status === 'pending' && (
            <>
              <Button
                type="link"
                size="small"
                style={{ color: '#52c41a' }}
                icon={<CheckOutlined />}
                onClick={() => openOp(record, 'approve')}
              >
                通过
              </Button>
              <Button
                type="link"
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={() => openOp(record, 'reject')}
              >
                驳回
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const [statusCounts, setStatusCounts] = useState<{ pending: number; approved: number; rejected: number }>({
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [p, a, r] = await Promise.all([
          getApplicationList({ page: 1, pageSize: 1, status: 'pending' }),
          getApplicationList({ page: 1, pageSize: 1, status: 'approved' }),
          getApplicationList({ page: 1, pageSize: 1, status: 'rejected' }),
        ]);
        if (mounted) {
          setStatusCounts({ pending: p.total, approved: a.total, rejected: r.total });
        }
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const renderStatusCard = (record: LoftApplicationItem) => (
    <div
      style={{
        marginBottom: 16,
        padding: '12px 16px',
        borderRadius: 8,
        background:
          record.status === 'pending'
            ? 'linear-gradient(135deg, #fffbe6 0%, #fff1b8 100%)'
            : record.status === 'approved'
              ? 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)'
              : 'linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>审核状态</div>
        <Tag color={statusTag[record.status].color} style={{ fontSize: 14, padding: '2px 8px' }}>
          {statusTag[record.status].text}
        </Tag>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>申请时间</div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>
          {dayjs(record.created_at).format('YYYY-MM-DD HH:mm:ss')}
        </div>
      </div>
    </div>
  );

  const renderMaterials = (record: LoftApplicationItem) => {
    const materialMap: Record<string, { url: string | null; label: string }> = {
      business: { url: record.qualification, label: '营业执照' },
      site: { url: record.site_proof, label: '公棚场地证明' },
      qualification: { url: record.qualification, label: '资质证书' },
    };

    return (
      <Card
        size="small"
        title={
          <span>
            <FileOutlined style={{ marginRight: 8 }} />
            资质材料审核
          </span>
        }
        style={{ marginTop: 16 }}
      >
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {materialTypes.map((mt) => {
            const mat = materialMap[mt.key];
            const urls = parseUrls(mat.url);
            const imgUrls = urls.filter((u) => isImageUrl(u));
            const otherUrls = urls.filter((u) => !isImageUrl(u));

            return (
              <div
                key={mt.key}
                style={{
                  flex: '1 1 calc(33.33% - 8px)',
                  minWidth: 140,
                  border: '1px solid #f0f0f0',
                  borderRadius: 8,
                  overflow: 'hidden',
                  transition: 'box-shadow 0.2s',
                }}
              >
                <div
                  style={{
                    padding: '8px 12px',
                    background: '#fafafa',
                    borderBottom: '1px solid #f0f0f0',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#333',
                  }}
                >
                  {mt.icon} {mat.label}
                </div>
                <div
                  style={{
                    padding: 12,
                    textAlign: 'center',
                    minHeight: 120,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {urls.length > 0 ? (
                    <Image.PreviewGroup
                      preview={{
                        onChange: (current, total) => {
                          console.log(`Image ${current + 1}/${total}`);
                        },
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 8,
                          justifyContent: 'center',
                        }}
                      >
                        {imgUrls.map((url, idx) => (
                          <Image
                            key={idx}
                            src={url}
                            alt={`${mat.label} ${idx + 1}`}
                            width={80}
                            height={80}
                            style={{ objectFit: 'cover', borderRadius: 4, cursor: 'zoom-in' }}
                          />
                        ))}
                        {otherUrls.map((url, idx) => (
                          <a
                            key={`other-${idx}`}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              width: 80,
                              height: 80,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px dashed #d9d9d9',
                              borderRadius: 4,
                              color: '#faad14',
                              fontSize: 12,
                              textDecoration: 'none',
                            }}
                          >
                            <FileOutlined style={{ fontSize: 24, marginBottom: 4 }} />
                            <span>查看文件</span>
                          </a>
                        ))}
                      </div>
                    </Image.PreviewGroup>
                  ) : (
                    <div style={{ color: '#bfbfbf', fontSize: 12 }}>
                      <FileOutlined
                        style={{
                          fontSize: 32,
                          display: 'block',
                          marginBottom: 4,
                          color: '#e0e0e0',
                        }}
                      />
                      暂无材料
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  const renderSteps = (record: LoftApplicationItem) => {
    const currentStep = record.status === 'pending' ? 1 : 2;
    return (
      <Card
        size="small"
        title={
          <span>
            <CheckCircleOutlined style={{ marginRight: 8, color: '#faad14' }} />
            审核操作面板
          </span>
        }
        style={{ marginBottom: 16 }}
      >
        <Steps
          direction="vertical"
          size="small"
          current={currentStep}
          status={record.status === 'pending' ? 'process' : 'finish'}
          items={[
            {
              title: '核实信息',
              description: '核对申请人身份、公棚名称、联系方式',
              icon: <CheckCircleOutlined />,
            },
            {
              title: '验证资质',
              description: '审核营业执照、场地证明、资质证书',
              icon: <FileOutlined />,
            },
            {
              title: '确认操作',
              description: record.status === 'pending' ? '确认通过或驳回申请' : '审核已完成',
              icon: <CheckCircleOutlined />,
            },
          ]}
          style={{ marginBottom: 16 }}
        />

        {record.status === 'pending' && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #fffbe6 0%, #fff7cc 100%)',
              border: '1px solid #ffe58f',
              marginBottom: 16,
            }}
          >
            <div style={{ color: '#d48806', fontWeight: 500, marginBottom: 8 }}>
              ✅ 审核通过后将自动执行以下操作：
            </div>
            <div style={{ color: '#666', fontSize: 13, lineHeight: '22px' }}>
              <div>· 创建公棚档案（状态：营业中）</div>
              <div>· 生成公棚编码</div>
              <div>· 发送通知给申请人</div>
              <div>· 公棚出现在"公棚列表"中</div>
            </div>
          </div>
        )}
      </Card>
    );
  };

  const renderTimeline = (record: LoftApplicationItem) => (
    <Card
      size="small"
      title={
        <span>
          <ClockCircleOutlined style={{ marginRight: 8 }} />
          审核历史记录
        </span>
      }
      style={{ marginBottom: 16 }}
    >
      <Timeline
        items={[
          {
            color: 'green',
            dot: <CheckCircleOutlined />,
            children: (
              <div>
                <div style={{ fontWeight: 500 }}>提交申请</div>
                <div style={{ fontSize: 12, color: '#999' }}>
                  {dayjs(record.created_at).format('YYYY-MM-DD HH:mm:ss')}
                </div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                  {record.applicant_name} 提交了公棚入驻申请
                </div>
              </div>
            ),
          },
          ...(record.status === 'pending'
            ? [
                {
                  color: 'gold' as const,
                  dot: <ClockCircleOutlined />,
                  children: (
                    <div>
                      <div style={{ fontWeight: 500 }}>审核中</div>
                      <div style={{ fontSize: 12, color: '#999' }}>等待管理员审核</div>
                    </div>
                  ),
                },
              ]
            : []),
          ...(record.status === 'approved' && record.audited_at
            ? [
                {
                  color: 'green' as const,
                  dot: <CheckCircleOutlined />,
                  children: (
                    <div>
                      <div style={{ fontWeight: 500 }}>审核通过</div>
                      <div style={{ fontSize: 12, color: '#999' }}>
                        {dayjs(record.audited_at).format('YYYY-MM-DD HH:mm:ss')}
                      </div>
                      {record.audit_remark && (
                        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                          备注：{record.audit_remark}
                        </div>
                      )}
                    </div>
                  ),
                },
              ]
            : []),
          ...(record.status === 'rejected' && record.audited_at
            ? [
                {
                  color: 'red' as const,
                  dot: <CloseCircleOutlined />,
                  children: (
                    <div>
                      <div style={{ fontWeight: 500 }}>审核驳回</div>
                      <div style={{ fontSize: 12, color: '#999' }}>
                        {dayjs(record.audited_at).format('YYYY-MM-DD HH:mm:ss')}
                      </div>
                      {record.audit_remark && (
                        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                          驳回理由：{record.audit_remark}
                        </div>
                      )}
                    </div>
                  ),
                },
              ]
            : []),
        ]}
      />
    </Card>
  );

  const drawerRecord = drawer.record;

  return (
    <PageContainer
      header={{
        title: '公棚入驻审核',
        breadcrumb: {},
      }}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'pending', label: `待审核(${statusCounts.pending})` },
          { key: 'approved', label: `已通过(${statusCounts.approved})` },
          { key: 'rejected', label: `已驳回(${statusCounts.rejected})` },
        ]}
        style={{ marginBottom: 16 }}
      />

      <ProTable<LoftApplicationItem>
        headerTitle={
          <span>
            <ScheduleOutlined style={{ marginRight: 8 }} />
            入驻申请列表 - {activeTab === 'pending' ? '待审核' : activeTab === 'approved' ? '已通过' : '已驳回'}
          </span>
        }
        actionRef={actionRef}
        loading={tableLoading}
        rowKey="id"
        columns={columns}
        options={{ density: false, reload: false }}
        scroll={{ x: 1200 }}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          const { current, pageSize, keyword } = params;
          try {
            const res = await getApplicationList({
              page: current,
              pageSize,
              status: activeTab,
              keyword: keyword as string | undefined,
            });
            setStatusCounts(prev => ({ ...prev, [activeTab]: res.total }));
            return { data: res.list, success: true, total: res.total };
          } catch {
            return { data: [], success: false, total: 0 };
          }
        }}
        toolBarRender={() => [
          <RefreshButton key="refresh" actionRef={actionRef as any} />,
        ]}
        pagination={{
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          defaultPageSize: 10,
        }}
      />

      <Drawer
        title="入驻申请详情"
        width={900}
        open={drawer.visible}
        onClose={() => setDrawer({ visible: false, record: null })}
        extra={
          canAudit && drawer.record?.status === 'pending' ? (
            <Space>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                style={{
                  background: 'linear-gradient(135deg, #ffd700 0%, #ffb300 100%)',
                  borderColor: '#ffb300',
                  color: '#fff',
                  fontWeight: 500,
                }}
                onClick={() => openOp(drawer.record!, 'approve')}
              >
                审核通过并创建公棚
              </Button>
              <Button
                icon={<CloseOutlined />}
                style={{ background: '#f5f5f5', borderColor: '#d9d9d9', color: '#666' }}
                onClick={() => openOp(drawer.record!, 'reject')}
              >
                驳回
              </Button>
            </Space>
          ) : null
        }
      >
        {drawerRecord && (
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1.2, minWidth: 0 }}>
              {renderStatusCard(drawerRecord)}

              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="公棚名称">{drawerRecord.loft_name}</Descriptions.Item>
                <Descriptions.Item label="申请人">{drawerRecord.applicant_name}</Descriptions.Item>
                <Descriptions.Item label="联系电话">{drawerRecord.phone}</Descriptions.Item>
                <Descriptions.Item label="身份证号">{drawerRecord.id_card || '-'}</Descriptions.Item>
                <Descriptions.Item label="资质说明">{drawerRecord.qualification || '-'}</Descriptions.Item>
                <Descriptions.Item label="容量(羽)">{drawerRecord.capacity ?? '-'}</Descriptions.Item>
                <Descriptions.Item label="公棚地址">{drawerRecord.address || '-'}</Descriptions.Item>
                {drawerRecord.audited_at && (
                  <Descriptions.Item label="审核时间">
                    {dayjs(drawerRecord.audited_at).format('YYYY-MM-DD HH:mm:ss')}
                  </Descriptions.Item>
                )}
                {drawerRecord.audit_remark && (
                  <Descriptions.Item label="审核备注">{drawerRecord.audit_remark}</Descriptions.Item>
                )}
              </Descriptions>

              {renderMaterials(drawerRecord)}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {renderSteps(drawerRecord)}
              {renderTimeline(drawerRecord)}

              {canAudit && drawerRecord.status === 'pending' && (
                <Card
                  size="small"
                  style={{
                    marginTop: 16,
                    border: '1px dashed #ffd700',
                    background: '#fffbe6',
                  }}
                >
                  <div style={{ display: 'flex', gap: 12 }}>
                    <Button
                      type="primary"
                      icon={<CheckOutlined />}
                      style={{
                        flex: 1,
                        height: 44,
                        background: 'linear-gradient(135deg, #ffd700 0%, #ffb300 100%)',
                        borderColor: '#ffb300',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: 15,
                        boxShadow: '0 2px 8px rgba(255,179,0,0.3)',
                      }}
                      onClick={() => openOp(drawerRecord, 'approve')}
                    >
                      审核通过并创建公棚
                    </Button>
                    <Button
                      icon={<CloseOutlined />}
                      style={{
                        height: 44,
                        background: '#f5f5f5',
                        borderColor: '#d9d9d9',
                        color: '#666',
                        fontWeight: 500,
                      }}
                      onClick={() => openOp(drawerRecord, 'reject')}
                    >
                      驳回
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}
      </Drawer>

      <ModalForm
        title={opModal.type === 'approve' ? '审核通过并创建公棚' : '驳回申请'}
        open={opModal.visible}
        onOpenChange={(v) => setOpModal({ visible: v, type: opModal.type, id: v ? opModal.id : null })}
        onFinish={handleAudit}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        width={480}
      >
        {opModal.type === 'approve' && drawerRecord && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 8,
              background: '#f6ffed',
              border: '1px solid #b7eb8f',
              marginBottom: 16,
            }}
          >
            <div style={{ color: '#389e0d', fontWeight: 500, marginBottom: 4 }}>
              <CheckOutlined style={{ marginRight: 8 }} />
              审核通过后，系统将自动创建公棚档案
            </div>
            <div style={{ color: '#666', fontSize: 12 }}>
              公棚名称：{drawerRecord.loft_name}
            </div>
          </div>
        )}
        <ProFormTextArea
          name="audit_remark"
          label={opModal.type === 'approve' ? '审核备注(可选)' : '驳回理由'}
          placeholder={opModal.type === 'approve' ? '可填写审核备注，留空则不填' : '请填写驳回理由'}
          rules={opModal.type === 'reject' ? [{ required: true, message: '请填写驳回理由' }] : []}
          fieldProps={{ autoSize: { minRows: 3, maxRows: 6 }, maxLength: 500, showCount: true }}
        />
      </ModalForm>
    </PageContainer>
  );
};

export default LoftAudit;