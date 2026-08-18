import {
  ModalForm,
  PageContainer,
  ProFormDigit,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { App, Button, List, Popconfirm, Space, Spin, Tag } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useCurrentUser } from '../../app-context';
import { useTableRefresh } from '../../hooks/useTableRefresh';
import RefreshButton from '../../components/RefreshButton';
import { hasPermission } from '../../access';
import {
  createDict,
  deleteDict,
  getDictList,
  getDictTypes,
  updateDict,
  type DictItem,
  type DictTypeItem,
} from '../../services/system';

// 字典管理:左侧类型列表 + 右侧字典项 ProTable
const SystemDict = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canManage = hasPermission(currentUser, 'system:config:manage');
  const actionRef = useRef<ActionType>();
  const { tableLoading, handleRefresh } = useTableRefresh(actionRef, { messageApi: message });

  const [types, setTypes] = useState<DictTypeItem[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<DictItem | null>(null);

  // 加载字典类型列表(不处理选中逻辑,避免闭包陈旧)
  const loadTypes = useCallback(async () => {
    setTypesLoading(true);
    try {
      const res = await getDictTypes();
      setTypes(res);
      return res;
    } catch {
      // 拦截器已提示错误
      return [];
    } finally {
      setTypesLoading(false);
    }
  }, []);

  // 首次挂载:加载类型并选中第一个
  useEffect(() => {
    loadTypes().then((res) => {
      if (res.length) {
        setSelectedType(res[0].dict_type);
      }
    });
  }, [loadTypes]);

  // 选中类型变化时刷新右侧表格
  useEffect(() => {
    if (selectedType) {
      handleRefresh();
    }
  }, [selectedType]);

  // 切换类型
  const handleSelectType = (dictType: string) => {
    setSelectedType(dictType);
  };

  // 新增/编辑提交
  const handleSubmit = async (values: Record<string, unknown>) => {
    const payload = {
      dict_type: (values.dict_type as string) || selectedType,
      type_name: values.type_name as string,
      item_code: values.item_code as string,
      item_name: values.item_name as string,
      sort_order: values.sort_order as number,
      status: values.status ? 1 : 0,
      remark: values.remark as string,
    };
    if (editing) {
      await updateDict(editing.id, payload);
      message.success('更新成功');
    } else {
      await createDict(payload);
      message.success('新增成功');
    }
    setModalVisible(false);
    // 类型可能新增,刷新类型列表
    loadTypes();
    handleRefresh();
    return true;
  };

  // 删除
  const handleDelete = async (record: DictItem) => {
    try {
      await deleteDict(record.id);
      message.success('删除成功');
      loadTypes();
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  const columns: ProColumns<DictItem>[] = [
    { title: '序号', dataIndex: 'index', valueType: 'index', width: 60, hideInSearch: true },
    { title: '编码', dataIndex: 'item_code', width: 140, ellipsis: true, render: (val) => <code>{String(val)}</code> },
    { title: '名称', dataIndex: 'item_name', width: 140, ellipsis: true },
    {
      title: '字典类型',
      dataIndex: 'dict_type',
      width: 140,
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) => <Tag color="blue">{record.dict_type}</Tag>,
    },
    { title: '类型名称', dataIndex: 'type_name', width: 120, ellipsis: true, hideInSearch: true },
    {
      title: '名称关键字',
      dataIndex: 'keyword',
      hideInTable: true,
    },
    { title: '排序', dataIndex: 'sort_order', width: 70, hideInSearch: true },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      hideInSearch: true,
      render: (_, record) => (
        <Tag color={record.status === 1 ? 'green' : 'default'}>{record.status === 1 ? '启用' : '禁用'}</Tag>
      ),
    },
    { title: '备注', dataIndex: 'remark', width: 160, ellipsis: true, hideInSearch: true, render: (val) => val || '-' },
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
      width: 140,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space>
          {canManage && (
            <Button
              type="link"
              size="small"
              onClick={() => {
                setEditing(record);
                setModalVisible(true);
              }}
            >
              编辑
            </Button>
          )}
          {canManage && (
            <Popconfirm title="确认删除该字典项?" onConfirm={() => handleDelete(record)}>
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
    <PageContainer
      header={{
        title: '字典管理',
        breadcrumb: {},
      }}
    >
      <div style={{ display: 'flex', gap: 16 }}>
        {/* 左侧类型列表 */}
        <div style={{ width: 240, flexShrink: 0 }}>
          <div
            style={{
              marginBottom: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontWeight: 500 }}>字典类型</span>
            <Button type="link" size="small" icon={<ReloadOutlined />} onClick={loadTypes}>
              刷新
            </Button>
          </div>
          <Spin spinning={typesLoading}>
            <List
              size="small"
              bordered
              dataSource={types}
              locale={{ emptyText: '暂无字典类型' }}
              renderItem={(item) => (
                <List.Item
                  onClick={() => handleSelectType(item.dict_type)}
                  style={{
                    cursor: 'pointer',
                    background: selectedType === item.dict_type ? '#e6f4ff' : undefined,
                    borderLeft:
                      selectedType === item.dict_type ? '3px solid #1677ff' : '3px solid transparent',
                    paddingLeft: 12,
                  }}
                >
                  <Space direction="vertical" size={0} style={{ width: '100%' }}>
                    <Space>
                      <span style={{ fontWeight: selectedType === item.dict_type ? 600 : 400 }}>
                        {item.type_name || item.dict_type}
                      </span>
                      <Tag style={{ marginRight: 0 }}>{item.item_count}</Tag>
                    </Space>
                    <span style={{ fontSize: 12, color: '#999' }}>{item.dict_type}</span>
                  </Space>
                </List.Item>
              )}
            />
          </Spin>
        </div>

        {/* 右侧字典项表格 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <ProTable<DictItem>
            headerTitle={selectedType ? `字典项(${selectedType})` : '字典项'}
            actionRef={actionRef}
            loading={tableLoading}
            rowKey="id"
            columns={columns}
            options={{ density: false, reload: false }}
            scroll={{ x: 1100 }}
            search={{ labelWidth: 'auto' }}
            request={async (params) => {
              try {
                const res = await getDictList({
                  page: params.current,
                  pageSize: params.pageSize,
                  dict_type: selectedType || undefined,
                  keyword: params.keyword as string | undefined,
                });
                return { data: res.list, success: true, total: res.total };
              } catch {
                return { data: [], success: false, total: 0 };
              }
            }}
            toolBarRender={() =>
              canManage
                ? [
                    <Button
                      key="create"
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setEditing(null);
                        setModalVisible(true);
                      }}
                    >
                      新增字典项
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
        </div>
      </div>

      {/* 新增/编辑字典项弹窗 */}
      <ModalForm
        title={editing ? '编辑字典项' : '新增字典项'}
        open={modalVisible}
        onOpenChange={setModalVisible}
        onFinish={handleSubmit}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        width={560}
        initialValues={
          editing
            ? {
                dict_type: editing.dict_type,
                type_name: editing.type_name,
                item_code: editing.item_code,
                item_name: editing.item_name,
                sort_order: editing.sort_order,
                status: editing.status === 1,
                remark: editing.remark,
              }
            : { dict_type: selectedType, sort_order: 0, status: true }
        }
      >
        <ProFormText
          name="dict_type"
          label="字典类型编码"
          placeholder="如 competition_type"
          rules={[{ required: true, message: '请输入字典类型编码' }]}
          disabled={!!editing}
          extra={editing ? '类型编码创建后不可修改' : '同类型下编码相同归为一组'}
        />
        <ProFormText name="type_name" label="字典类型名称" placeholder="如 赛事类型" />
        <ProFormText
          name="item_code"
          label="字典项编码"
          placeholder="如 spring / autumn"
          rules={[{ required: true, message: '请输入字典项编码' }]}
          disabled={!!editing}
        />
        <ProFormText
          name="item_name"
          label="字典项名称"
          placeholder="如 春赛"
          rules={[{ required: true, message: '请输入字典项名称' }]}
        />
        <ProFormDigit
          name="sort_order"
          label="排序"
          min={0}
          fieldProps={{ precision: 0 }}
          placeholder="数字越小越靠前"
        />
        <ProFormSwitch name="status" label="状态" fieldProps={{ checkedChildren: '启用', unCheckedChildren: '禁用' }} />
        <ProFormTextArea name="remark" label="备注" fieldProps={{ rows: 2, maxLength: 200 }} />
      </ModalForm>
    </PageContainer>
  );
};

export default SystemDict;
