import {
  DrawerForm,
  ProFormDatePicker,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { Button, Popconfirm, Space, Tag } from 'antd';
import { PlusOutlined, QrcodeOutlined, EyeOutlined } from '@ant-design/icons';
import { useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useAntdApp } from '../../hooks/useAntdApp';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import {
  createGeneProfile,
  deleteGeneProfile,
  getGeneProfileOptions,
  getGeneProfiles,
  regenerateGeneQrcode,
  updateGeneProfile,
  type GeneProfile,
  type GeneProfileOption,
} from '../../services/gene';

// 性别选项
const GENDER_OPTIONS = [
  { label: '雄', value: 'male' },
  { label: '雌', value: 'female' },
  { label: '未知', value: 'unknown' },
];
const GENDER_MAP: Record<string, string> = { male: '雄', female: '雌', unknown: '未知' };

// 档案状态选项
const STATUS_OPTIONS = [
  { label: '正常', value: 1 },
  { label: '停用', value: 0 },
];

// 基因档案管理:列表 + 新增/编辑抽屉 + 查看详情跳转
const GeneList = () => {
  const { message } = useAntdApp();
  const currentUser = useCurrentUser();
  const canEdit = hasPermission(currentUser, 'gene:edit');
  const navigate = useNavigate();
  const actionRef = useRef<ActionType>();

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editing, setEditing] = useState<GeneProfile | null>(null);
  const [parentOptions, setParentOptions] = useState<GeneProfileOption[]>([]);

  // 双保险：无论 state 被写入什么都在 render 路径归一为数组
  const safeParentOptions = useMemo<GeneProfileOption[]>(
    () => (Array.isArray(parentOptions) ? parentOptions : []),
    [parentOptions],
  );
  // 父/母下拉共用的 options：新增态不过滤，编辑态排除自身 id（防止自循环父母）
  const sireDamRawOptions = useMemo(() => {
    return safeParentOptions
      .filter((o) => !editing || o.id !== editing.id)
      .map((o) => ({
        label: `${o.ring_number} ${o.name}`.trim(),
        value: o.id,
      }));
  }, [safeParentOptions, editing]);

  // 加载父/母下拉选项
  const loadParentOptions = () => {
    if (!Array.isArray(parentOptions) || !parentOptions.length) {
      getGeneProfileOptions()
        .then((raw) => setParentOptions(Array.isArray(raw) ? raw : []))
        .catch(() => {
          // 拦截器已提示错误
        });
    }
  };

  const openCreate = () => {
    setEditing(null);
    setDrawerVisible(true);
    loadParentOptions();
  };

  const openEdit = (record: GeneProfile) => {
    setEditing(record);
    setDrawerVisible(true);
    loadParentOptions();
  };

  // 提交新增/编辑
  const handleSubmit = async (values: Record<string, unknown>) => {
    const birthDate = values.birth_date
      ? dayjs(values.birth_date as string).format('YYYY-MM-DD')
      : undefined;
    const payload = {
      ring_number: values.ring_number as string,
      name: values.name as string,
      gender: (values.gender as string) ?? 'unknown',
      breed: (values.breed as string) ?? '',
      bloodline: (values.bloodline as string) ?? '',
      owner_name: (values.owner_name as string) ?? '',
      owner_phone: (values.owner_phone as string) ?? undefined,
      color: (values.color as string) ?? undefined,
      eye_color: (values.eye_color as string) ?? undefined,
      birth_date: birthDate,
      gene_sequence: (values.gene_sequence as string) ?? undefined,
      photo_url: (values.photo_url as string) ?? undefined,
      status: (values.status as number) ?? 1,
      sire_id: (values.sire_id as number | undefined) ?? null,
      dam_id: (values.dam_id as number | undefined) ?? null,
    };
    if (editing) {
      await updateGeneProfile(editing.id, payload);
      message.success('更新成功');
    } else {
      await createGeneProfile(payload);
      message.success('新增成功');
    }
    setDrawerVisible(false);
    actionRef.current?.reload();
    return true;
  };

  // 重新生成二维码
  const handleRegenQrcode = async (record: GeneProfile) => {
    try {
      await regenerateGeneQrcode(record.id);
      message.success('二维码已重新生成');
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示错误
    }
  };

  // 删除
  const handleDelete = async (record: GeneProfile) => {
    try {
      await deleteGeneProfile(record.id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch {
      // 拦截器已提示错误
    }
  };

  const columns: ProColumns<GeneProfile>[] = [
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
        <Tag color={record.status === 1 ? 'green' : 'default'}>{record.status === 1 ? '正常' : '停用'}</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 160,
      hideInSearch: true,
      render: (_, record) => (record.created_at ? dayjs(record.created_at).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 230,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/gene/detail/${record.id}`)}>
            详情
          </Button>
          {canEdit && (
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          )}
          {canEdit && (
            <Button type="link" size="small" icon={<QrcodeOutlined />} onClick={() => handleRegenQrcode(record)}>
              二维码
            </Button>
          )}
          {canEdit && (
            <Popconfirm title="确认删除该基因档案?关联的检测记录与血统关系将一并删除。" onConfirm={() => handleDelete(record)}>
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
        rowKey="id"
        columns={columns}
        options={{ density: false }}
        scroll={{ x: 1300 }}
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
              ]
            : []
        }
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />

      {/* 新增/编辑抽屉 */}
      <DrawerForm
        title={editing ? '编辑基因档案' : '新增基因档案'}
        open={drawerVisible}
        onOpenChange={setDrawerVisible}
        onFinish={handleSubmit}
        drawerProps={{ destroyOnClose: true, maskClosable: false, width: 560 }}
        initialValues={
          editing
            ? {
                ring_number: editing.ring_number,
                name: editing.name,
                gender: editing.gender,
                breed: editing.breed,
                bloodline: editing.bloodline,
                owner_name: editing.owner_name,
                owner_phone: editing.owner_phone ?? undefined,
                color: editing.color ?? undefined,
                eye_color: editing.eye_color ?? undefined,
                birth_date: editing.birth_date ? dayjs(editing.birth_date) : undefined,
                gene_sequence: editing.gene_sequence ?? undefined,
                photo_url: editing.photo_url ?? undefined,
                status: editing.status,
                sire_id: editing.sire_id ?? undefined,
                dam_id: editing.dam_id ?? undefined,
              }
            : { gender: 'unknown', status: 1 }
        }
      >
        <ProFormText
          name="ring_number"
          label="足环号"
          placeholder="请输入足环号(唯一)"
          rules={[{ required: true, message: '请输入足环号' }]}
          disabled={!!editing}
        />
        <ProFormText
          name="name"
          label="鸽名"
          placeholder="请输入鸽名"
          rules={[{ required: true, message: '请输入鸽名' }]}
        />
        <ProFormSelect name="gender" label="性别" options={GENDER_OPTIONS} />
        <ProFormText name="breed" label="品种" placeholder="请输入品种" />
        <ProFormText name="bloodline" label="血统" placeholder="请输入血统" />
        <ProFormText name="owner_name" label="鸽主姓名" placeholder="请输入鸽主姓名" />
        <ProFormText name="owner_phone" label="鸽主电话" placeholder="请输入鸽主电话" />
        <ProFormText name="color" label="羽色" placeholder="请输入羽色" />
        <ProFormText name="eye_color" label="眼砂" placeholder="请输入眼砂" />
        <ProFormDatePicker name="birth_date" label="出生日期" />
        <ProFormTextArea
          name="gene_sequence"
          label="基因序列"
          placeholder="请输入基因序列数据(可选)"
          fieldProps={{ autoSize: { minRows: 3, maxRows: 8 } }}
        />
        <ProFormText name="photo_url" label="照片 URL" placeholder="请输入鸽只照片地址" />
        <ProFormSelect name="status" label="档案状态" options={STATUS_OPTIONS} />
        <ProFormSelect
          name="sire_id"
          label="父鸽"
          placeholder="请选择父鸽档案(可选)"
          showSearch
          options={sireDamRawOptions}
        />
        <ProFormSelect
          name="dam_id"
          label="母鸽"
          placeholder="请选择母鸽档案(可选)"
          showSearch
          options={sireDamRawOptions}
        />
      </DrawerForm>
    </>
  );
};

export default GeneList;
