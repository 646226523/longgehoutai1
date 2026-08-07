import { ProTable, type ProColumns } from '@ant-design/pro-components';
import { Button, Descriptions, Drawer, Space, Tag, Typography } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import { getAuditLogs, getAuditModules, type AuditLogItem } from '../../services/system';

const { Text, Paragraph } = Typography;

// 安全地格式化 JSON 字符串(请求体/响应体/参数)
function formatJson(raw: string | null): string {
  if (!raw) return '-';
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

// HTTP 方法对应的 Tag 颜色
function methodColor(method: string | null): string {
  switch (method) {
    case 'GET':
      return 'blue';
    case 'POST':
      return 'green';
    case 'PUT':
      return 'orange';
    case 'PATCH':
      return 'gold';
    case 'DELETE':
      return 'red';
    default:
      return 'default';
  }
}

// 操作日志审计
const SystemAuditLog = () => {
  const currentUser = useCurrentUser();
  const canView = hasPermission(currentUser, 'system:audit:view');
  const [modules, setModules] = useState<string[]>([]);
  const [detail, setDetail] = useState<AuditLogItem | null>(null);

  // 加载模块下拉
  useEffect(() => {
    if (!canView) return;
    getAuditModules()
      .then(setModules)
      .catch(() => {
        // 拦截器已提示错误
      });
  }, [canView]);

  // 模块下拉枚举
  const moduleValueEnum = useMemo(
    () =>
      modules.reduce<Record<string, { text: string }>>((acc, m) => {
        acc[m] = { text: m };
        return acc;
      }, {}),
    [modules]
  );

  const columns: ProColumns<AuditLogItem>[] = [
    {
      title: '操作人',
      dataIndex: 'operator',
      width: 110,
      ellipsis: true,
      render: (_, record) => record.admin_username || String(record.admin_user_id ?? '-'),
    },
    { title: 'IP', dataIndex: 'ip', width: 130, ellipsis: true, hideInSearch: true },
    {
      title: '模块',
      dataIndex: 'module',
      width: 100,
      ellipsis: true,
      valueType: 'select',
      valueEnum: moduleValueEnum,
    },
    { title: '操作', dataIndex: 'action', width: 120, ellipsis: true, hideInSearch: true },
    {
      title: '方法',
      dataIndex: 'method',
      width: 80,
      hideInSearch: true,
      render: (_, record) => <Tag color={methodColor(record.method)}>{record.method}</Tag>,
    },
    { title: 'URL', dataIndex: 'path', width: 220, ellipsis: true, hideInSearch: true },
    {
      title: '状态',
      dataIndex: 'status_code',
      width: 80,
      hideInSearch: true,
      render: (_, record) => {
        const code = record.status_code ?? 0;
        const color = code >= 200 && code < 300 ? 'green' : code >= 400 ? 'red' : 'orange';
        return <Tag color={color}>{code || '-'}</Tag>;
      },
    },
    {
      title: '耗时',
      dataIndex: 'duration_ms',
      width: 90,
      hideInSearch: true,
      render: (_, record) => (record.duration_ms != null ? `${record.duration_ms}ms` : '-'),
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 160,
      valueType: 'dateRange',
      render: (_, record) =>
        record.created_at ? dayjs(record.created_at).format('YYYY-MM-DD HH:mm:ss') : '-',
      search: {
        transform: (value) => {
          // ProTable dateRange 返回 [startStr, endStr],转成时间戳
          if (Array.isArray(value) && value.length === 2 && value[0] && value[1]) {
            return {
              startTime: dayjs(value[0]).startOf('day').valueOf(),
              endTime: dayjs(value[1]).endOf('day').valueOf(),
            };
          }
          return {};
        },
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setDetail(record)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <>
      <ProTable<AuditLogItem>
        headerTitle="操作日志"
        rowKey="id"
        columns={columns}
        options={{ density: false }}
        scroll={{ x: 1200 }}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          try {
            const res = await getAuditLogs({
              page: params.current,
              pageSize: params.pageSize,
              operator: params.operator as string | undefined,
              module: params.module as string | undefined,
              startTime: params.startTime as number | undefined,
              endTime: params.endTime as number | undefined,
            });
            return { data: res.list, success: true, total: res.total };
          } catch {
            return { data: [], success: false, total: 0 };
          }
        }}
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />

      {/* 详情抽屉 */}
      <Drawer title="日志详情" open={!!detail} onClose={() => setDetail(null)} width={640}>
        {detail && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="操作人">{detail.admin_username || '-'}</Descriptions.Item>
              <Descriptions.Item label="IP">{detail.ip || '-'}</Descriptions.Item>
              <Descriptions.Item label="模块">{detail.module || '-'}</Descriptions.Item>
              <Descriptions.Item label="操作">{detail.action || '-'}</Descriptions.Item>
              <Descriptions.Item label="方法">
                <Tag color={methodColor(detail.method)}>{detail.method}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态码">
                <Tag color={(detail.status_code ?? 0) >= 400 ? 'red' : 'green'}>
                  {detail.status_code ?? '-'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="耗时">
                {detail.duration_ms != null ? `${detail.duration_ms}ms` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="时间">
                {detail.created_at ? dayjs(detail.created_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="URL" span={2}>
                <Text copyable style={{ wordBreak: 'break-all' }}>
                  {detail.path || '-'}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="User-Agent" span={2}>
                <Text type="secondary" style={{ wordBreak: 'break-all' }}>
                  {detail.user_agent || '-'}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <div>
              <Text strong>查询参数</Text>
              <Paragraph style={{ marginBottom: 0 }}>
                <pre
                  style={{
                    background: '#f5f5f5',
                    padding: 12,
                    borderRadius: 4,
                    maxHeight: 200,
                    overflow: 'auto',
                    fontSize: 12,
                  }}
                >
                  {formatJson(detail.params)}
                </pre>
              </Paragraph>
            </div>

            <div>
              <Text strong>请求体</Text>
              <Paragraph style={{ marginBottom: 0 }}>
                <pre
                  style={{
                    background: '#f5f5f5',
                    padding: 12,
                    borderRadius: 4,
                    maxHeight: 240,
                    overflow: 'auto',
                    fontSize: 12,
                  }}
                >
                  {formatJson(detail.request_body)}
                </pre>
              </Paragraph>
            </div>

            <div>
              <Text strong>响应体</Text>
              <Paragraph style={{ marginBottom: 0 }}>
                <pre
                  style={{
                    background: '#f5f5f5',
                    padding: 12,
                    borderRadius: 4,
                    maxHeight: 240,
                    overflow: 'auto',
                    fontSize: 12,
                  }}
                >
                  {formatJson(detail.response_body)}
                </pre>
              </Paragraph>
            </div>
          </Space>
        )}
      </Drawer>
    </>
  );
};

export default SystemAuditLog;
