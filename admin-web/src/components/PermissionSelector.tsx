import { Empty, Input, Select, Space, Spin, Tag, Tooltip, Tree, type TreeDataNode, Button } from 'antd';
import { SearchOutlined, CheckSquareOutlined, CloseSquareOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';
import type { PermissionGroup } from '../services/system';

// ==================== 类型定义 ====================
export interface PermissionSelectorProps {
  /** 按模块分组的权限数据 */
  groups: PermissionGroup[];
  /** 当前选中的权限 ID 集合 */
  checkedIds: Set<number>;
  /** 选中变化回调 */
  onCheckedChange: (ids: Set<number>) => void;
  /** 加载态 */
  loading?: boolean;
  /** 最大高度(px), 默认 560 */
  maxHeight?: number;
  /** 是否显示工具栏（搜索/筛选/全选） */
  showToolbar?: boolean;
  /** 是否显示顶部统计栏 */
  showStats?: boolean;
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
  dashboard: '工作台',
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

// ==================== 工具函数 ====================
function getLabel(segment: string): string {
  return CODE_SEGMENT_LABELS[segment] ?? segment;
}

function countLeaves(node: TreeDataNode): number {
  if (!node.children || node.children.length === 0) return 1;
  return node.children.reduce((s, c) => s + countLeaves(c), 0);
}

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

// 从权限分组构建多级树
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
          title: <Space size={4}><span>{l2Label}</span></Space>,
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
              <Tag color="default" style={{ marginRight: 0, fontSize: 11 }}>{l3.count}</Tag>
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
            <Tag color="default" style={{ marginRight: 0, fontSize: 11 }}>{l2.count}</Tag>
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
          <Tag color="blue" style={{ marginRight: 0 }}>{moduleTotal}</Tag>
        </Space>
      ),
      children: moduleChildren,
    });
  }

  return rootChildren;
}

// ==================== 组件主体 ====================
const PermissionSelector = ({
  groups,
  checkedIds,
  onCheckedChange,
  loading,
  maxHeight = 560,
  showToolbar = true,
  showStats = true,
}: PermissionSelectorProps) => {
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(() =>
    groups.map((g) => `virtual:${g.module}`),
  );
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    setExpandedKeys(groups.map((g) => `virtual:${g.module}`));
  }, [groups]);

  const treeData = useMemo<TreeDataNode[]>(() => buildTreeFromGroups(groups), [groups]);

  // 计算所有叶子 key（用于全选）
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

  // 总权限数
  const totalPermCount = useMemo(() => {
    let count = 0;
    for (const g of groups) count += g.permissions.length;
    return count;
  }, [groups]);

  // 选中 key 数组
  const checkedKeysArr = useMemo<React.Key[]>(() => {
    const keys: React.Key[] = [];
    checkedIds.forEach((id) => keys.push(`perm:${id}`));
    return keys;
  }, [checkedIds]);

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

  const handleSelectAll = () => {
    const permKeys = allLeafKeys.filter((k) => String(k).startsWith('perm:'));
    const permIds = permKeys.map((k) => Number(String(k).replace('perm:', '')));
    onCheckedChange(new Set(permIds));
  };

  const handleClearAll = () => {
    onCheckedChange(new Set());
  };

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

  const collapseAll = () => {
    setExpandedKeys([]);
    setAutoExpandParent(false);
  };

  useEffect(() => {
    if (keyword.trim() || moduleFilter || typeFilter) {
      expandAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, moduleFilter, typeFilter]);

  const moduleOptions = useMemo(
    () => groups.map((g) => ({ label: getLabel(g.module), value: g.module })),
    [groups],
  );

  // 递归过滤器
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
    if (key.startsWith('virtual:')) {
      const segments = key.split(':');
      if (segments[1] === moduleFilter) return true;
      if (key.startsWith(`virtual:${moduleFilter}:`)) return true;
      return node.children?.some(matchesModule) ?? false;
    }
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

  const hasFilter = keyword.trim() || moduleFilter || typeFilter;
  const filterTreeNode = (node: TreeDataNode): boolean => {
    if (!hasFilter) return true;
    return matchesKeyword(node) && matchesModule(node) && matchesType(node);
  };

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
      {showToolbar && (
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
            <Button size="small" onClick={expandAll}>全部展开</Button>
            <Button size="small" onClick={collapseAll}>全部收起</Button>
          </Space>
        </div>
      )}

      {showStats && (
        <div style={{ marginBottom: 8, color: '#888', fontSize: 13 }}>
          已选 <span style={{ color: '#1677ff', fontWeight: 600 }}>{checkedIds.size}</span> / 共{' '}
          <span style={{ fontWeight: 500 }}>{totalPermCount}</span> 项权限
        </div>
      )}

      <div
        style={{
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          padding: 12,
          background: '#fff',
          maxHeight,
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

export default PermissionSelector;
