import { PageContainer } from '@ant-design/pro-components';
import { App, Button, Input, Select, Space, Spin, Table, Tabs, Tag, type TableProps } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import { getConfigs, updateConfig, type ConfigItem } from '../../services/system';

// 地图服务商可选值
const MAP_PROVIDER_OPTIONS = [
  { label: '内置 SVG 地图（未启用）', value: 'none' },
  { label: '高德地图', value: 'amap' },
  { label: '百度地图', value: 'baidu' },
  { label: '腾讯地图', value: 'tencent' },
];

// 分组中文名映射(未命中的分组保持英文原样)
const GROUP_LABEL: Record<string, string> = { map: '地图配置', upload: '上传配置', business: '业务配置' };

// 系统配置:按分组 Tab 展示,行内编辑值
const SystemConfig = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canManage = hasPermission(currentUser, 'system:config:manage');
  const [groups, setGroups] = useState<Array<{ group: string; items: ConfigItem[] }>>([]);
  const [loading, setLoading] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string>('');
  // 编辑中的值:key -> value
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // 加载配置列表
  const loadConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getConfigs();
      // 空值防御: res 为 null/undefined 或 groups 非数组时使用默认值
      const safeGroups = Array.isArray(res?.groups) ? res!.groups : [];
      setGroups(safeGroups);
      if (safeGroups.length > 0 && !activeGroup) {
        setActiveGroup(safeGroups[0].group);
      }
    } catch {
      // 拦截器已提示错误
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [activeGroup]);

  useEffect(() => {
    loadConfigs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 保存配置值
  const handleSave = async (item: ConfigItem) => {
    const newValue = editingValues[item.config_key] ?? item.config_value ?? '';
    setSavingKey(item.config_key);
    try {
      await updateConfig(item.config_key, newValue);
      message.success('配置已更新');
      // 更新本地数据
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          items: g.items.map((it) =>
            it.config_key === item.config_key ? { ...it, config_value: newValue } : it
          ),
        }))
      );
      setEditingValues((prev) => {
        const next = { ...prev };
        delete next[item.config_key];
        return next;
      });
    } catch {
      // 拦截器已提示错误
    } finally {
      setSavingKey(null);
    }
  };

  // 当前分组的配置项
  const currentItems = groups.find((g) => g.group === activeGroup)?.items ?? [];

  const columns: TableProps<ConfigItem>['columns'] = [
    { title: '配置名称', dataIndex: 'name', width: 160, ellipsis: true },
    {
      title: '配置键',
      dataIndex: 'config_key',
      width: 180,
      ellipsis: true,
      render: (val) => <code>{String(val ?? '')}</code>,
    },
    {
      title: '配置值',
      dataIndex: 'config_value',
      width: 280,
      render: (_, record) =>
        record.config_key === 'map_provider' ? (
          <Select
            value={editingValues[record.config_key] ?? record.config_value ?? 'none'}
            options={MAP_PROVIDER_OPTIONS}
            onChange={(value) =>
              setEditingValues((prev) => ({ ...prev, [record.config_key]: value }))
            }
            disabled={!canManage}
            style={{ width: 220 }}
          />
        ) : (
          <Input
            value={editingValues[record.config_key] ?? record.config_value ?? ''}
            onChange={(e) =>
              setEditingValues((prev) => ({ ...prev, [record.config_key]: e.target.value }))
            }
            disabled={!canManage}
            placeholder="请输入配置值"
          />
        ),
    },
    { title: '说明', dataIndex: 'description', ellipsis: true, render: (val) => (val ? String(val) : '-') },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      width: 160,
      render: (val) => (val ? dayjs(Number(val)).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => {
        const changed =
          editingValues[record.config_key] !== undefined &&
          editingValues[record.config_key] !== (record.config_value ?? '');
        return canManage ? (
          <Button
            type="link"
            size="small"
            disabled={!changed}
            loading={savingKey === record.config_key}
            onClick={() => handleSave(record)}
          >
            保存
          </Button>
        ) : (
          <Tag>只读</Tag>
        );
      },
    },
  ];

  return (
    <PageContainer
      header={{
        title: '系统配置',
        breadcrumb: {},
      }}
    >
      <Spin spinning={loading}>
        <Tabs
          activeKey={activeGroup}
          onChange={setActiveGroup}
          items={groups.map((g) => ({
            key: g.group,
            label: (
              <Space size={4}>
                <span>{GROUP_LABEL[g.group] ?? g.group}</span>
                <Tag style={{ marginRight: 0 }}>{g.items.length}</Tag>
              </Space>
            ),
            children: (
              <Table<ConfigItem>
                rowKey="config_key"
                columns={columns}
                dataSource={currentItems}
                pagination={false}
                size="middle"
                scroll={{ x: 1000 }}
              />
            ),
          }))}
        />
      </Spin>
    </PageContainer>
  );
};

export default SystemConfig;
