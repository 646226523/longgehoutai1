import {
  ModalForm,
  ProFormText,
  ProFormSelect,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  App,
  Button,
  Card,
  Empty,
  Input,
  Space,
  Spin,
  Tag,
  Select,
  Popconfirm,
  Tooltip,
  Tree,
  type TreeDataNode,
} from 'antd';
import {
  PlusOutlined,
  SafetyOutlined,
  CheckSquareOutlined,
  CloseSquareOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useCurrentUser } from '../../app-context';
import { useTableRefresh } from '../../hooks/useTableRefresh';
import RefreshButton from '../../components/RefreshButton';
import { hasPermission } from '../../access';
import {
  assignRolePermissions,
  createRole,
  deleteRole,
  getAllPermissions,
  getRoleList,
  getRolePermissions,
  updateRole,
  type PermissionGroup,
  type RoleItem,
} from '../../services/system';

// ==================== 类型定义 ====================
interface RoleTemplate {
  key: string;
  label: string;
  desc: string;
  matchCodes: (code: string) => boolean;
}

// ==================== 常量 ====================
const TYPE_COLOR_MAP: Record<string, string> = {
  menu: 'blue',
  button: 'orange',
  api: 'purple',
  data: 'cyan',
};

const TYPE_LABEL_MAP: Record<string, string> = {
  menu: '菜单',
  button: '按钮',
  api: '接口',
  data: '数据',
};

const CODE_SEGMENT_LABELS: Record<string, string> = {
  // 模块名
  gene: '基因档案',
  nft: 'NFT 资产',
  competition: '赛事管理',
  loft: '公棚管理',
  detection: '检测管理',
  auction: '拍卖管理',
  arbitration: '仲裁管理',
  user: '用户管理',
  member: '会员等级',
  content: '内容管理',
  statistics: '数据统计',
  system: '系统管理',
  // 二级/三级段
  admin: '管理员',
  role: '角色权限',
  audit: '操作审计',
  config: '系统配置',
  dict: '字典管理',
  manage: '管理',
  view: '查看',
  edit: '编辑',
  create: '新增',
  delete: '删除',
  remove: '移除',
  verify: '核验',
  judge: '裁决',
  report: '检测报告',
  deal: '成交',
  // ===== 新增 module 级 =====
  dashboard: '工作台',

  // ===== 新增 page 级（二级节点名） =====
  news: '资讯管理',
  banner: 'Banner 管理',
  notice: '公告管理',
  list: '列表',
  items: '拍品管理',
  session: '拍卖场次',
  case: '仲裁案件',
  org: '检测机构',
  order: '检测预约',
  result: '成绩管理',
  detail: '档案详情',
  audit_page: '审核页面',

  // ===== 新增 action 级（三级操作名） =====
  top: '置顶',
  offline: '下架',
  publish: '发布',
  batch: '批量操作',
  preview: '预览',
  submit_audit: '提交审核',
  add_flow: '新增流转记录',
  qrcode: '二维码',
  toggle_status: '营业状态切换',
  pigeons: '存棚鸽只',
  accept: '受理',
  archive: '归档',
  confirm: '确认',
  schedule: '排期',
  cancel: '取消',
  pass: '审核通过',
  reject: '审核驳回',
  retry: '重试',
  realname_audit: '实名审核',
  pigeon_audit: '鸽主资质审核',
  more_distributor: '变更上级分销商',
  more_tag: '设置标签',
  more_coupon: '发放优惠券',
  more_balance: '调整余额',
  more_points: '调整积分',
  more_blacklist: '加入黑名单',
  more_kick: '强制退出',
  more_reset: '重置密码',
  more_export: '导出数据',
  benefit: '权益配置',
  recalc: '成长值重算',
  reset_password: '重置密码',
  toggle: '启用/禁用',
  status_flow: '状态流转',
  start: '开始/开拍',
  fail: '流拍',
  end: '结束',
  manage_ext: '扩展管理',
  view_log: '日志列表',
  detail_log: '日志详情',
  list_create: '上架拍品',
  toggle_status_switch: '开关状态',
};

const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    key: 'super',
    label: '超级管理员',
    desc: '选中全部权限',
    matchCodes: () => true,
  },
  {
    key: 'operator',
    label: '运营编辑',
    desc: '内容管理 + 基础查看',
    matchCodes: (code) => code.startsWith('content:') || code.endsWith(':view'),
  },
  {
    key: 'auditor',
    label: '审核专员',
    desc: '审核相关权限',
    matchCodes: (code) => code.includes(':audit') || code.includes('audit:'),
  },
  {
    key: 'viewer',
    label: '只读访客',
    desc: '仅查看权限',
    matchCodes: (code) => code.endsWith(':view'),
  },
];

// ==================== 工具函数 ====================
function getLabel(segment: string): string {
  return CODE_SEGMENT_LABELS[segment] ?? segment;
}

function countLeaves(node: TreeDataNode): number {
  if (!node.children || node.children.length === 0) return 1;
  return node.children.reduce((s, c) => s + countLeaves(c), 0);
}

// ==================== 工具: 从权限分组构建多级树 ====================
interface VirtualNodeAcc {
  key: string;
  title: React.ReactNode;
  rawTitle: string;
  count: number;
  childrenMap: Map<
    string,
    {
      key: string;
      title: React.ReactNode;
      rawTitle: string;
      count: number;
      leafChildren: TreeDataNode[];
    }
  >;
  leafChildren: TreeDataNode[];
}

function buildTreeFromGroups(groups: PermissionGroup[]): TreeDataNode[] {
  const rootChildren: TreeDataNode[] = [];

  for (const group of groups) {
    const level2Map = new Map<string, VirtualNodeAcc>();

    for (const perm of group.permissions) {
      const parts = perm.code.split(':');
      const level1 = group.module;
      const level2 = parts[1] ?? 'other';
      const level3 = parts[2];

      const l2Key = `virtual:${level1}:${level2}`;
      const l2Label = getLabel(level2);

      if (!level2Map.has(level2)) {
        level2Map.set(level2, {
          key: l2Key,
          title: (
            <Space size={4}>
              <span>{l2Label}</span>
            </Space>
          ),
          rawTitle: l2Label,
          count: 0,
          childrenMap: new Map(),
          leafChildren: [],
        });
      }
      const l2 = level2Map.get(level2)!;

      const isDanger = /delete|remove/i.test(perm.code);

      const leafNode: TreeDataNode = {
        key: `perm:${perm.id}`,
        isLeaf: true,
        title: (
          <Tooltip title={`${perm.code} · ${perm.description ?? perm.name}`}>
            <Space size={4}>
              <span style={isDanger ? { color: '#ff4d4f' } : undefined}>{perm.name}</span>
              <Tag color={TYPE_COLOR_MAP[perm.type] ?? 'default'} style={{ fontSize: 11, marginRight: 0 }}>
                {TYPE_LABEL_MAP[perm.type] ?? perm.type}
              </Tag>
              <Tag style={{ fontSize: 11, fontFamily: 'monospace', marginRight: 0 }}>{perm.code}</Tag>
            </Space>
          </Tooltip>
        ),
      };

      if (level3) {
        const l3Key = `virtual:${level1}:${level2}:${level3}`;
        const l3Label = getLabel(level3);
        if (!l2.childrenMap.has(level3)) {
          l2.childrenMap.set(level3, {
            key: l3Key,
            title: <Space size={4}><span>{l3Label}</span></Space>,
            rawTitle: l3Label,
            count: 0,
            leafChildren: [],
          });
        }
        const l3 = l2.childrenMap.get(level3)!;
        l3.leafChildren.push(leafNode);
        l3.count += 1;
        l2.count += 1;
      } else {
        l2.leafChildren.push(leafNode);
        l2.count += 1;
      }
    }

    const moduleChildren: TreeDataNode[] = [];
    for (const [, l2] of level2Map) {
      const l2Children: TreeDataNode[] = [];
      for (const [, l3] of l2.childrenMap) {
        l2Children.push({
          key: l3.key,
          title: (
            <Space size={4}>
              <span>{l3.rawTitle}</span>
              <Tag color="default" style={{ marginRight: 0, fontSize: 11 }}>
                {l3.count}
              </Tag>
            </Space>
          ),
          children: l3.leafChildren,
        });
      }
      const allChildren: TreeDataNode[] = [...l2Children, ...l2.leafChildren];
      moduleChildren.push({
        key: l2.key,
        title: (
          <Space size={4}>
            <span style={{ fontWeight: 500 }}>{l2.rawTitle}</span>
            <Tag color="default" style={{ marginRight: 0, fontSize: 11 }}>
              {l2.count}
            </Tag>
          </Space>
        ),
        children: allChildren,
      });
    }

    const moduleTotal = moduleChildren.reduce((s, c) => s + countLeaves(c), 0);
    const moduleKey = `virtual:${group.module}`;
    const moduleLabel = getLabel(group.module);
    rootChildren.push({
      key: moduleKey,
      title: (
        <Space size={4}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{moduleLabel}</span>
          <Tag color="blue" style={{ marginRight: 0 }}>
            {moduleTotal}
          </Tag>
        </Space>
      ),
      children: moduleChildren,
    });
  }

  return rootChildren;
}

// ==================== 子组件: 权限选择器 ====================
interface PermissionSelectorProps {
  groups: PermissionGroup[];
  checkedIds: Set<number>;
  onCheckedChange: (ids: Set<number>) => void;
  loading?: boolean;
}

const PermissionSelector = ({ groups, checkedIds, onCheckedChange, loading }: PermissionSelectorProps) => {
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(() =>
    groups.map((g) => `virtual:${g.module}`),
  );
  const [autoExpandParent, setAutoExpandParent] = useState(true);

  // 搜索/筛选
  const [keyword, setKeyword] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);

  // groups 变化时重置展开
  useEffect(() => {
    setExpandedKeys(groups.map((g) => `virtual:${g.module}`));
  }, [groups]);

  // 构建树数据
  const treeData = useMemo<TreeDataNode[]>(
    () => buildTreeFromGroups(groups),
    [groups],
  );

  // 叶子总数（未显示但保留以备后用）
  // const totalLeaves = useMemo(
  //   () => treeData.reduce((s, n) => s + countLeaves(n), 0),
  //   [treeData],
  // );

  // 计算所有叶子 key 集合（用于全选）
  const allLeafKeys = useMemo<React.Key[]>(() => {
    const keys: React.Key[] = [];
    const walk = (nodes: TreeDataNode[]) => {
      for (const n of nodes) {
        if (n.isLeaf || !n.children || n.children.length === 0) {
          keys.push(n.key!);
        } else {
          walk(n.children);
        }
      }
    };
    walk(treeData);
    return keys;
  }, [treeData]);

  // checkedKeys 纯数组形式（AntD Tree 自动计算父子联动和半选）
  const checkedKeysArr = useMemo<React.Key[]>(() => {
    const keys: React.Key[] = [];
    checkedIds.forEach((id) => keys.push(`perm:${id}`));
    return keys;
  }, [checkedIds]);

  // Tree onCheck 回调
  const handleTreeCheck = (keys: unknown) => {
    let checked: React.Key[];
    if (Array.isArray(keys)) {
      checked = keys;
    } else if (keys && typeof keys === 'object' && 'checked' in (keys as object)) {
      checked = (keys as { checked: React.Key[] }).checked;
    } else {
      checked = [];
    }
    const permIds = checked
      .filter((k) => String(k).startsWith('perm:'))
      .map((k) => Number(String(k).replace('perm:', '')));
    onCheckedChange(new Set(permIds));
  };

  // 全选
  const handleSelectAll = () => {
    const permKeys = allLeafKeys.filter((k) => String(k).startsWith('perm:'));
    const permIds = permKeys.map((k) => Number(String(k).replace('perm:', '')));
    onCheckedChange(new Set(permIds));
  };

  // 清空
  const handleClearAll = () => {
    onCheckedChange(new Set());
  };

  // 展开全部
  const expandAll = () => {
    const keys: React.Key[] = [];
    const walk = (nodes: TreeDataNode[]) => {
      for (const n of nodes) {
        if (n.children && n.children.length > 0) {
          keys.push(n.key!);
          walk(n.children);
        }
      }
    };
    walk(treeData);
    setExpandedKeys(keys);
    setAutoExpandParent(true);
  };

  // 收起全部
  const collapseAll = () => {
    setExpandedKeys([]);
    setAutoExpandParent(false);
  };

  // 搜索 / 筛选改变时自动展开所有匹配节点
  useEffect(() => {
    if (keyword.trim() || moduleFilter || typeFilter) {
      expandAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, moduleFilter, typeFilter]);

  // 模块筛选选项
  const moduleOptions = useMemo(
    () => groups.map((g) => ({ label: getLabel(g.module), value: g.module })),
    [groups],
  );

  // ===== 递归过滤器：自身匹配 OR 任意子节点匹配 =====
  const matchesKeyword = (node: TreeDataNode): boolean => {
    if (!keyword.trim()) return true;
    const title = String(node.title ?? '').toLowerCase();
    if (title.includes(keyword.toLowerCase())) return true;
    if (node.children?.length) return node.children.some(matchesKeyword);
    return false;
  };

  const matchesModule = (node: TreeDataNode): boolean => {
    if (!moduleFilter) return true;
    const key = String(node.key ?? '');
    // 虚拟节点: virtual:module 或 virtual:module:xxx
    if (key.startsWith('virtual:')) {
      const segments = key.split(':');
      if (segments[1] === moduleFilter) return true;
      if (key.startsWith(`virtual:${moduleFilter}:`)) return true;
      return node.children?.some(matchesModule) ?? false;
    }
    // 叶子节点 perm:xxx
    if (key.startsWith('perm:')) {
      const permId = Number(key.replace('perm:', ''));
      for (const g of groups) {
        if (g.permissions.some((p) => p.id === permId)) {
          return g.module === moduleFilter;
        }
      }
      return false;
    }
    return node.children?.some(matchesModule) ?? false;
  };

  const matchesType = (node: TreeDataNode): boolean => {
    if (!typeFilter) return true;
    const key = String(node.key ?? '');
    if (key.startsWith('perm:')) {
      const permId = Number(key.replace('perm:', ''));
      for (const g of groups) {
        const perm = g.permissions.find((p) => p.id === permId);
        if (perm) return perm.type === typeFilter;
      }
      return false;
    }
    return node.children?.some(matchesType) ?? false;
  };

  // 综合过滤器：三个条件 AND + 递归兜底
  const hasFilter = keyword.trim() || moduleFilter || typeFilter;
  const filterTreeNode = (node: TreeDataNode): boolean => {
    if (!hasFilter) return true;
    return matchesKeyword(node) && matchesModule(node) && matchesType(node);
  };

  // 空加载态
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin />
        <div style={{ marginTop: 8, color: '#999', fontSize: 13 }}>加载权限数据中...</div>
      </div>
    );
  }

  if (groups.length === 0) {
    return <Empty description="暂无权限数据" style={{ padding: 40 }} />;
  }

  return (
    <div>
      {/* 工具栏：搜索 + 筛选 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: '#fafafa',
          borderRadius: 8,
          marginBottom: 12,
          border: '1px solid #f0f0f0',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <Space size={8} wrap>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <SearchOutlined style={{ color: '#999' }} />
            <Input
              size="small"
              allowClear
              placeholder="搜索权限名称 / 编码"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{ width: 200 }}
            />
          </div>
          <Select
            size="small"
            allowClear
            placeholder="全部模块"
            value={moduleFilter}
            onChange={(v) => setModuleFilter(v)}
            options={moduleOptions}
            style={{ width: 140 }}
          />
          <Select
            size="small"
            allowClear
            placeholder="全部类型"
            value={typeFilter}
            onChange={(v) => setTypeFilter(v)}
            options={[
              { label: '菜单', value: 'menu' },
              { label: '按钮', value: 'button' },
              { label: '接口', value: 'api' },
              { label: '数据', value: 'data' },
            ]}
            style={{ width: 120 }}
          />
        </Space>
        <Space size={8}>
          <Button size="small" icon={<CheckSquareOutlined />} onClick={handleSelectAll}>
            全选
          </Button>
          <Button size="small" icon={<CloseSquareOutlined />} onClick={handleClearAll}>
            清空
          </Button>
          <Button size="small" onClick={expandAll}>
            全部展开
          </Button>
          <Button size="small" onClick={collapseAll}>
            全部收起
          </Button>
        </Space>
      </div>

      {/* Tree */}
      <div
        style={{
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          padding: 12,
          background: '#fff',
          maxHeight: 560,
          overflowY: 'auto',
        }}
      >
        <Tree
          showIcon
          checkable
          blockNode
          expandedKeys={expandedKeys}
          onExpand={(keys) => {
            setExpandedKeys(keys);
            setAutoExpandParent(true);
          }}
          autoExpandParent={autoExpandParent}
          treeData={treeData}
          checkedKeys={checkedKeysArr}
          onCheck={handleTreeCheck}
          filterTreeNode={filterTreeNode}
        />
      </div>
    </div>
  );
};

// ==================== 主组件 ====================
const SystemRole = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canManage = hasPermission(currentUser, 'system:role:manage');
  const actionRef = useRef<ActionType>();
  const { tableLoading, handleRefresh } = useTableRefresh(actionRef, { messageApi: message });

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<RoleItem | null>(null);

  // 权限数据（所有权限分组）
  const [permGroups, setPermGroups] = useState<PermissionGroup[]>([]);
  const [permLoading, setPermLoading] = useState(false);
  // 当前已选中的权限 ID 集合
  const [checkedPermIds, setCheckedPermIds] = useState<Set<number>>(new Set());

  // 所有叶子权限 ID 集合
  const allPermIds = useMemo<number[]>(() => {
    const ids: number[] = [];
    for (const g of permGroups) {
      for (const p of g.permissions) {
        ids.push(p.id);
      }
    }
    return ids;
  }, [permGroups]);

  // 打开弹窗时加载权限数据
  useEffect(() => {
    if (!modalVisible) return;
    if (permGroups.length > 0) {
      if (editing) {
        loadRolePermissions(editing.id);
      } else {
        setCheckedPermIds(new Set());
      }
      return;
    }
    loadAllPermissions();
  }, [modalVisible]);

  // 加载所有权限
  const loadAllPermissions = async () => {
    setPermLoading(true);
    try {
      const groups = await getAllPermissions();
      setPermGroups(groups);
      if (editing) {
        loadRolePermissions(editing.id);
      } else {
        setCheckedPermIds(new Set());
      }
    } catch {
      message.error('加载权限数据失败');
    } finally {
      setPermLoading(false);
    }
  };

  // 加载角色已有权限
  const loadRolePermissions = async (roleId: number) => {
    try {
      const ids = await getRolePermissions(roleId);
      setCheckedPermIds(new Set(ids ?? []));
    } catch {
      setCheckedPermIds(new Set());
    }
  };

  // 重置弹窗状态
  const resetModalState = () => {
    setEditing(null);
    setCheckedPermIds(new Set());
    setModalVisible(false);
  };

  // 应用模板
  const applyTemplate = (template: RoleTemplate) => {
    if (permGroups.length === 0) {
      message.warning('权限数据尚未加载');
      return;
    }
    if (template.key === 'super') {
      setCheckedPermIds(new Set(allPermIds));
      return;
    }
    const matchedIds: number[] = [];
    for (const g of permGroups) {
      for (const p of g.permissions) {
        if (template.matchCodes(p.code)) {
          matchedIds.push(p.id);
        }
      }
    }
    setCheckedPermIds(new Set(matchedIds));
    message.success(`已应用「${template.label}」模板，匹配 ${matchedIds.length} 项权限`);
  };

  // 从现有角色复制权限
  const [copyRoleOptions, setCopyRoleOptions] = useState<Array<{ id: number; name: string; code: string }>>([]);
  const [copyRoleLoading, setCopyRoleLoading] = useState(false);

  const loadRoleOptions = async () => {
    setCopyRoleLoading(true);
    try {
      const res = await getRoleList({ page: 1, pageSize: 200 });
      setCopyRoleOptions(
        res?.list?.map((r) => ({ id: r.id, name: r.name, code: r.code })) ?? [],
      );
    } catch {
      // ignore
    } finally {
      setCopyRoleLoading(false);
    }
  };

  const handleCopyRole = async (roleId: number) => {
    try {
      const ids = await getRolePermissions(roleId);
      setCheckedPermIds(new Set(ids ?? []));
      message.success(`已复制角色权限，共 ${ids?.length ?? 0} 项`);
    } catch {
      message.error('复制失败');
    }
  };

  // 新增/编辑提交
  const handleSubmit = async (values: Record<string, unknown>) => {
    const permissionIds = Array.from(checkedPermIds);
    let roleId = editing?.id;

    try {
      if (editing) {
        await updateRole(editing.id, {
          name: values.name as string,
          description: values.description as string,
          status: values.status as number,
        });
        message.success('角色信息已更新');
      } else {
        const res = await createRole({
          code: `role_${Date.now()}`,
          name: values.name as string,
          description: values.description as string,
          status: values.status as number,
        });
        roleId = res.id;
        message.success('角色创建成功');
      }

      if (roleId) {
        await assignRolePermissions(roleId, permissionIds);
        message.success(`权限分配成功（${permissionIds.length} 项）`);
      }

      resetModalState();
      handleRefresh();
      return true;
    } catch {
      return false;
    }
  };

  // 删除角色
  const handleDelete = async (record: RoleItem) => {
    try {
      await deleteRole(record.id);
      message.success('删除成功');
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  const columns: ProColumns<RoleItem>[] = [
    { title: '序号', dataIndex: 'index', valueType: 'index', width: 60, hideInSearch: true },
    { title: 'ID', dataIndex: 'id', width: 60, hideInSearch: true },

    { title: '角色名称', dataIndex: 'name', width: 140, ellipsis: true },
    { title: '关键字', dataIndex: 'keyword', hideInTable: true },
    { title: '描述', dataIndex: 'description', width: 200, ellipsis: true, hideInSearch: true },
    {
      title: '类型',
      dataIndex: 'is_super',
      width: 100,
      hideInSearch: true,
      render: (_, record) =>
        record.is_super === 1 ? <Tag color="red">超级角色</Tag> : <Tag color="blue">普通角色</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      valueType: 'select',
      valueEnum: { 1: { text: '启用' }, 0: { text: '禁用' } },
      render: (_, record) => (
        <Tag color={record.status === 1 ? 'green' : 'default'}>{record.status === 1 ? '启用' : '禁用'}</Tag>
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
      width: 240,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space>
          {canManage && (
            <Button
              type="link"
              size="small"
              icon={<SafetyOutlined />}
              onClick={() => {
                setEditing(record);
                setModalVisible(true);
              }}
            >
              编辑权限
            </Button>
          )}
          {canManage && record.is_super !== 1 && (
            <Popconfirm title="确认删除该角色?" onConfirm={() => handleDelete(record)}>
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
      <ProTable<RoleItem>
        headerTitle="角色列表"
        actionRef={actionRef}
        loading={tableLoading}
        rowKey="id"
        columns={columns}
        options={{ density: false, reload: false }}
        scroll={{ x: 1100 }}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          try {
            const res = await getRoleList({
              page: params.current,
              pageSize: params.pageSize,
              keyword: params.keyword as string | undefined,
            });
            return { data: res?.list ?? [], success: true, total: res?.total ?? 0 };
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
                    setCheckedPermIds(new Set());
                    setModalVisible(true);
                  }}
                >
                  新增角色
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

      {/* 新增/编辑角色弹窗 —— 左右分栏布局 */}
      <ModalForm
        title={editing ? '编辑角色与权限' : '新增角色'}
        open={modalVisible}
        onOpenChange={(open) => {
          if (!open) resetModalState();
        }}
        onFinish={handleSubmit}
        modalProps={{
          destroyOnHidden: false,
          maskClosable: false,
          width: 1200,
          okText: editing ? '保存修改' : '确认创建',
          cancelText: '取消',
        }}
        width={1200}
        initialValues={
          editing
            ? { name: editing.name, description: editing.description, status: editing.status }
            : { status: 1 }
        }
        submitter={{
          render: (props) => {
            const { submit, reset } = props;
            return (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 8,
                  padding: '12px 0',
                  borderTop: '1px solid #f0f0f0',
                  marginTop: 8,
                }}
              >
                <Button onClick={() => resetModalState()}>取消</Button>
                <Button onClick={() => reset?.()}>重置</Button>
                <Button
                  icon={<CloseSquareOutlined />}
                  onClick={() => setCheckedPermIds(new Set())}
                  disabled={checkedPermIds.size === 0}
                >
                  清空权限
                </Button>
                <Button
                  type="primary"
                  onClick={() => submit?.()}
                  icon={<CheckSquareOutlined />}
                >
                  {editing ? '保存角色与权限' : '确认创建'}
                  {checkedPermIds.size > 0 && (
                    <span style={{ marginLeft: 6, opacity: 0.85 }}>({checkedPermIds.size} 项)</span>
                  )}
                </Button>
              </div>
            );
          },
        }}
      >
        {/* 左右分栏主体 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '320px 1fr',
            gap: 20,
            alignItems: 'start',
          }}
        >
          {/* 左栏: 基本信息 + 模板 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* 基本信息 Card */}
            <Card
              variant="borderless"
              styles={{ body: { padding: 0 } }}
              style={{
                border: '1px solid #f0f0f0',
                borderRadius: 10,
                background: '#fff',
              }}
            >
              {/* 顶部渐变标题条 */}
              <div
                style={{
                  height: 4,
                  background: 'linear-gradient(90deg, #1677ff, #722ed1)',
                  borderTopLeftRadius: 10,
                  borderTopRightRadius: 10,
                }}
              />
              <div style={{ padding: '16px 16px 8px' }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>
                  📝 基本信息
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <ProFormText
                    name="name"
                    label="角色名称"
                    placeholder="请输入角色名称"
                    rules={[{ required: true, message: '请输入角色名称' }]}
                    fieldProps={{ style: { width: '100%' } }}
                  />
                  <ProFormSelect
                    name="status"
                    label="状态"
                    options={[
                      { label: '启用', value: 1 },
                      { label: '禁用', value: 0 },
                    ]}
                    width="sm"
                  />
                  <ProFormTextArea
                    name="description"
                    label="描述"
                    placeholder="请输入角色描述（选填）"
                    fieldProps={{ rows: 2, maxLength: 200 }}
                  />
                </div>
              </div>
            </Card>

            {/* 快速创建 Card */}
            <Card
              variant="borderless"
              styles={{ body: { padding: 16 } }}
              style={{
                border: '1px solid #f0f0f0',
                borderRadius: 10,
                background: '#fff',
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{ fontSize: 16 }}>💡</span>
                快速创建
              </div>

              {/* 模板按钮 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {ROLE_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.key}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '10px 12px',
                      border: '1px solid #f0f0f0',
                      borderRadius: 8,
                      background: '#fafafa',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all .2s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = '#e6f4ff';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#1677ff';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = '#fafafa';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#f0f0f0';
                    }}
                  >
                    <div style={{ lineHeight: 1.3 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#333' }}>{tpl.label}</div>
                      <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{tpl.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* 分割线 */}
              <div
                style={{
                  borderTop: '1px dashed #e8e8e8',
                  margin: '4px 0 12px',
                }}
              />

              {/* 从现有角色复制 */}
              <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
                从现有角色复制权限：
              </div>
              <Select
                size="small"
                allowClear
                placeholder="选择角色"
                options={copyRoleOptions.map((r) => ({
                  label: (
                    <span>
                      {r.name} <span style={{ color: '#999', fontSize: 11 }}>({r.code})</span>
                    </span>
                  ),
                  value: r.id,
                }))}
                loading={copyRoleLoading}
                onOpenChange={(open) => {
                  if (open && copyRoleOptions.length === 0) loadRoleOptions();
                }}
                onChange={(v) => v && handleCopyRole(v)}
                style={{ width: '100%' }}
              />
            </Card>
          </div>

          {/* 右栏: 权限树选择 */}
          <div
            style={{
              paddingLeft: 20,
              borderLeft: '1px solid #f0f0f0',
            }}
          >
            {/* 顶部标题 + 统计 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SafetyOutlined style={{ color: '#1677ff', fontSize: 18 }} />
                <span style={{ fontWeight: 600, fontSize: 15 }}>🛡️ 功能权限分配</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: checkedPermIds.size > 0 ? '#1677ff' : '#bbb',
                    lineHeight: 1,
                  }}
                >
                  {checkedPermIds.size}
                </span>
                <span style={{ fontSize: 13, color: '#999' }}>
                  / {allPermIds.length} 项
                </span>
              </div>
            </div>

            <Spin spinning={permLoading} style={{ width: '100%' }}>
              <PermissionSelector
                groups={permGroups}
                checkedIds={checkedPermIds}
                onCheckedChange={setCheckedPermIds}
                loading={permLoading}
              />
            </Spin>
          </div>
        </div>
      </ModalForm>
    </>
  );
};

export default SystemRole;
