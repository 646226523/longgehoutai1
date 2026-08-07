import {
  DrawerForm,
  ProFormDatePicker,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
  type ProFormInstance,
} from '@ant-design/pro-components';
import { Button, Drawer, Popconfirm, Space } from 'antd';
import { EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useAntdApp } from '../../hooks/useAntdApp';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import { getGeneProfileOptions, type GeneProfileOption } from '../../services/gene';
import {
  createDetectionReport,
  deleteDetectionReport,
  getDetectionItemTypes,
  getDetectionOrderOptions,
  getDetectionOrgOptions,
  getDetectionReport,
  getDetectionReports,
  updateDetectionReport,
  type DetectionItemType,
  type DetectionOrderOption,
  type DetectionOrgOption,
  type DetectionReport,
} from '../../services/detection';

// 检测报告管理:列表 + 新增/编辑 + 关联订单/鸽只 + 报告详情
const DetectionReport = () => {
  const { message } = useAntdApp();
  const currentUser = useCurrentUser();
  const canReport = hasPermission(currentUser, 'detection:report');
  const actionRef = useRef<ActionType>();
  const formRef = useRef<ProFormInstance>();

  // 新增/编辑抽屉
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editing, setEditing] = useState<DetectionReport | null>(null);

  // 详情抽屉
  const [detailVisible, setDetailVisible] = useState(false);
  const [detail, setDetail] = useState<DetectionReport | null>(null);

  // 下拉数据
  const [orgOptions, setOrgOptions] = useState<DetectionOrgOption[]>([]);
  const [itemTypes, setItemTypes] = useState<DetectionItemType[]>([]);
  const [profileOptions, setProfileOptions] = useState<GeneProfileOption[]>([]);
  const [orderOptions, setOrderOptions] = useState<DetectionOrderOption[]>([]);

  // 加载下拉数据
  const loadOptions = () => {
    if (!orgOptions.length) {
      getDetectionOrgOptions()
        .then(setOrgOptions)
        .catch(() => {});
    }
    if (!itemTypes.length) {
      getDetectionItemTypes()
        .then(setItemTypes)
        .catch(() => {});
    }
    if (!profileOptions.length) {
      getGeneProfileOptions()
        .then(setProfileOptions)
        .catch(() => {});
    }
    if (!orderOptions.length) {
      getDetectionOrderOptions()
        .then(setOrderOptions)
        .catch(() => {});
    }
  };

  const openCreate = () => {
    setEditing(null);
    setDrawerVisible(true);
    loadOptions();
  };

  const openEdit = (record: DetectionReport) => {
    setEditing(record);
    setDrawerVisible(true);
    loadOptions();
  };

  // 查看详情
  const openDetail = async (record: DetectionReport) => {
    try {
      const d = await getDetectionReport(record.id);
      setDetail(d);
      setDetailVisible(true);
    } catch {
      // 拦截器已提示错误
    }
  };

  // 提交新增/编辑
  const handleSubmit = async (values: Record<string, unknown>) => {
    const orderId = (values.order_id as number | undefined) ?? null;
    const geneProfileId = (values.gene_profile_id as number | undefined) ?? null;
    if (!orderId && !geneProfileId) {
      message.warning('请关联订单或鸽只基因档案');
      return false;
    }
    // 若选择订单,自动同步机构/项目(若用户未手填)
    const order = orderId ? orderOptions.find((o) => o.id === orderId) : undefined;
    const orgId = (values.org_id as number | undefined) ?? null;
    const org = orgId ? orgOptions.find((o) => o.id === orgId) : undefined;

    const payload = {
      order_id: orderId,
      gene_profile_id: geneProfileId,
      report_no: values.report_no as string,
      test_org: (values.test_org as string) ?? org?.name ?? '',
      project: (values.project as string) ?? order?.project ?? '',
      result: (values.result as string) ?? undefined,
      report_url: (values.report_url as string) ?? undefined,
      test_date: values.test_date
        ? dayjs(values.test_date as string).format('YYYY-MM-DD')
        : undefined,
    };

    if (editing) {
      await updateDetectionReport(editing.id, payload);
      message.success('更新成功');
    } else {
      await createDetectionReport(payload);
      message.success('报告录入成功,关联订单已更新为已完成');
    }
    setDrawerVisible(false);
    actionRef.current?.reload();
    return true;
  };

  // 删除报告
  const handleDelete = async (record: DetectionReport) => {
    try {
      await deleteDetectionReport(record.id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示错误
    }
  };

  const columns: ProColumns<DetectionReport>[] = [
    { title: '报告编号', dataIndex: 'report_no', width: 160, ellipsis: true, hideInSearch: true },
    {
      title: '检测机构',
      dataIndex: 'test_org',
      width: 160,
      ellipsis: true,
      hideInSearch: true,
    },
    { title: '检测项目', dataIndex: 'project', width: 110, hideInSearch: true, ellipsis: true },
    {
      title: '检测结果',
      dataIndex: 'result',
      width: 220,
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => (record.result ? record.result : '-'),
    },
    {
      title: '关联鸽只',
      dataIndex: 'gene_profile',
      width: 170,
      hideInSearch: true,
      render: (_, record) => {
        const g = record.gene_profile;
        if (!g) return '-';
        return (
          <span>
            {g.ring_number} {g.name}
          </span>
        );
      },
    },
    {
      title: '检测日期',
      dataIndex: 'test_date',
      width: 110,
      hideInSearch: true,
      render: (_, record) => (record.test_date ? record.test_date : '-'),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 110,
      hideInSearch: true,
      render: (_, record) =>
        record.created_at ? dayjs(record.created_at).format('YYYY-MM-DD') : '-',
    },
    {
      title: '报告编号',
      dataIndex: 'report_no_search',
      hideInTable: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>
            详情
          </Button>
          {canReport && (
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          )}
          {canReport && (
            <Popconfirm title="确认删除该检测报告?" onConfirm={() => handleDelete(record)}>
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
      <ProTable<DetectionReport>
        headerTitle="检测报告管理"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        options={{ density: false }}
        scroll={{ x: 1200 }}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          const { current, pageSize, report_no_search, order_id, gene_profile_id } = params;
          try {
            const res = await getDetectionReports({
              page: current,
              pageSize,
              report_no: report_no_search as string | undefined,
              order_id: order_id as number | string | undefined,
              gene_profile_id: gene_profile_id as number | string | undefined,
            });
            return { data: res.list, success: true, total: res.total };
          } catch {
            return { data: [], success: false, total: 0 };
          }
        }}
        toolBarRender={() =>
          canReport
            ? [
                <Button key="create" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                  录入报告
                </Button>,
              ]
            : []
        }
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />

      {/* 新增/编辑抽屉 */}
      <DrawerForm
        title={editing ? '编辑检测报告' : '录入检测报告'}
        open={drawerVisible}
        onOpenChange={setDrawerVisible}
        onFinish={handleSubmit}
        formRef={formRef}
        drawerProps={{ destroyOnClose: true, maskClosable: false, width: 600 }}
        initialValues={
          editing
            ? {
                order_id: editing.order_id ?? undefined,
                gene_profile_id: editing.gene_profile_id ?? undefined,
                report_no: editing.report_no,
                test_org: editing.test_org,
                project: editing.project,
                result: editing.result ?? undefined,
                report_url: editing.report_url ?? undefined,
                test_date: editing.test_date ? dayjs(editing.test_date) : undefined,
              }
            : {}
        }
      >
        <ProFormSelect
          name="order_id"
          label="关联预约订单"
          placeholder="选择订单(可选,录入后订单自动置为已完成)"
          showSearch
          allowClear
          options={orderOptions.map((o) => ({
            label: `${o.order_no} - ${o.user_name}${o.ring_number ? `(${o.ring_number})` : ''}`,
            value: o.id,
          }))}
          fieldProps={{
            optionFilterProp: 'label',
            onChange: (value: number) => {
              // 选择订单后自动带出检测项目
              const order = orderOptions.find((o) => o.id === value);
              if (order && order.project) {
                formRef.current?.setFieldsValue({ project: order.project });
              }
            },
          }}
        />
        <ProFormSelect
          name="gene_profile_id"
          label="关联鸽只基因档案"
          placeholder="选择鸽只(可选)"
          showSearch
          allowClear
          options={profileOptions.map((o) => ({
            label: `${o.ring_number} ${o.name}`,
            value: o.id,
          }))}
          fieldProps={{
            optionFilterProp: 'label',
          }}
        />
        <ProFormText
          name="report_no"
          label="报告编号"
          placeholder="请输入报告编号"
          rules={[{ required: true, message: '请输入报告编号' }]}
        />
        <ProFormSelect
          name="org_id"
          label="检测机构(快捷选择)"
          placeholder="选择机构自动带出名称,或直接在下方手动输入"
          showSearch
          allowClear
          options={orgOptions.map((o) => ({
            label: `${o.name}${o.code ? `(${o.code})` : ''}`,
            value: o.id,
          }))}
          fieldProps={{
            optionFilterProp: 'label',
            onChange: (value: number) => {
              // 选择机构后自动带出检测机构名称
              const org = orgOptions.find((o) => o.id === value);
              if (org) {
                formRef.current?.setFieldsValue({ test_org: org.name });
              }
            },
          }}
        />
        <ProFormText
          name="test_org"
          label="检测机构名称"
          placeholder="请输入检测机构名称"
          rules={[{ required: true, message: '请输入检测机构名称' }]}
        />
        <ProFormSelect
          name="project"
          label="检测项目"
          placeholder="请选择检测项目"
          rules={[{ required: true, message: '请选择检测项目' }]}
          showSearch
          options={itemTypes.map((i) => ({ label: i.name, value: i.name }))}
        />
        <ProFormDatePicker name="test_date" label="检测日期" placeholder="请选择检测日期" />
        <ProFormTextArea
          name="result"
          label="检测结果"
          placeholder="请输入检测结果描述"
          fieldProps={{ autoSize: { minRows: 3, maxRows: 8 } }}
        />
        <ProFormText
          name="report_url"
          label="报告文件 URL"
          placeholder="请输入报告文件链接(可选)"
        />
      </DrawerForm>

      {/* 详情抽屉 */}
      <Drawer
        title="检测报告详情"
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={560}
        destroyOnClose
      >
        {detail && (
          <div style={{ lineHeight: 2 }}>
            <p>
              <strong>报告编号:</strong>
              {detail.report_no}
            </p>
            <p>
              <strong>检测机构:</strong>
              {detail.test_org || '-'}
            </p>
            <p>
              <strong>检测项目:</strong>
              {detail.project}
            </p>
            <p>
              <strong>检测日期:</strong>
              {detail.test_date || '-'}
            </p>
            {detail.order_id && (
              <p>
                <strong>关联订单 ID:</strong>
                {detail.order_id}
              </p>
            )}
            {detail.gene_profile && (
              <p>
                <strong>关联鸽只:</strong>
                {detail.gene_profile.ring_number} {detail.gene_profile.name}
                {detail.gene_profile.owner_name
                  ? `(鸽主:${detail.gene_profile.owner_name})`
                  : ''}
              </p>
            )}
            <p>
              <strong>检测结果:</strong>
            </p>
            <div
              style={{
                background: '#fafafa',
                padding: 12,
                borderRadius: 4,
                whiteSpace: 'pre-wrap',
              }}
            >
              {detail.result || '-'}
            </div>
            {detail.report_url && (
              <p>
                <strong>报告文件:</strong>
                <a href={detail.report_url} target="_blank" rel="noreferrer">
                  {detail.report_url}
                </a>
              </p>
            )}
            <p>
              <strong>录入时间:</strong>
              {detail.created_at ? dayjs(detail.created_at).format('YYYY-MM-DD HH:mm') : '-'}
            </p>
          </div>
        )}
      </Drawer>
    </>
  );
};

export default DetectionReport;
