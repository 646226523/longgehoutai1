import {
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  App,
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  DatePicker,
  Typography,
  theme,
} from 'antd';
import {
  ArrowRightOutlined,
  CalendarOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  GiftOutlined,
  PlusOutlined,
  ProfileOutlined,
  SearchOutlined,
  SettingOutlined,
  ShopOutlined,
  StopOutlined,
  TagOutlined,
} from '@ant-design/icons';
import { useRef, useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import { useTableRefresh } from '../../hooks/useTableRefresh';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import RefreshButton from '../../components/RefreshButton';
import {
  createAuctionSession,
  deleteAuctionSession,
  getAuctionSessionDetail,
  getAuctionSessions,
  transitionAuctionSession,
  updateAuctionSession,
  type AuctionSession,
  type AuctionSessionCreateParams,
} from '../../services/auction';
import { getGeneProfiles, type GeneProfile } from '../../services/gene';

const { Text } = Typography;

// 状态选项
const STATUS_OPTIONS = [
  { label: '草稿', value: 'draft' },
  { label: '未开始', value: 'pending' },
  { label: '进行中', value: 'ongoing' },
  { label: '已结束', value: 'ended' },
  { label: '已取消', value: 'cancelled' },
];

const STATUS_COLOR: Record<string, string> = {
  draft: 'default',
  pending: 'processing',
  ongoing: 'success',
  ended: 'blue',
  cancelled: 'error',
};

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  pending: '未开始',
  ongoing: '进行中',
  ended: '已结束',
  cancelled: '已取消',
};

const AUCTION_TYPE_LABEL: Record<string, string> = {
  online: '线上拍卖',
  offline: '线下拍卖',
  hybrid: '线上线下同步',
};

const AUCTION_TYPE_BADGE: Record<string, { color: string; bg: string }> = {
  online: { color: '#1890ff', bg: '#e6f4ff' },
  offline: { color: '#722ed1', bg: '#f9f0ff' },
  hybrid: { color: '#d48806', bg: '#fff7e6' },
};

// 关联拍品类型
interface SelectedItem {
  key: string;
  pigeon_id: number;
  ring_number: string;
  name: string;
  breed: string;
  bloodline: string;
  owner_name: string;
  start_price: number;
}

// 拍品选择弹窗
const ItemSelectorModal = ({
  open,
  onClose,
  onConfirm,
  existingIds,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (items: SelectedItem[]) => void;
  existingIds: number[];
}) => {
  const { token } = theme.useToken();
  const [keyword, setKeyword] = useState('');
  const [breedFilter, setBreedFilter] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [allPigeons, setAllPigeons] = useState<GeneProfile[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [draftPrices, setDraftPrices] = useState<Record<string, number>>({});
  const [priceInput, setPriceInput] = useState<{ key: string; value: string } | null>(null);
  const [batchPrice, setBatchPrice] = useState('');

  const fetchPigeons = async (kw = '') => {
    setLoading(true);
    try {
      const res = await getGeneProfiles({ page: 1, pageSize: 200, ring_number: kw });
      setAllPigeons(res.list || []);
    } catch {
      setAllPigeons([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchPigeons('');
    }
  }, [open]);

  const breedOptions = useMemo(() => {
    const breeds = new Set(allPigeons.map((p) => p.breed).filter(Boolean));
    return Array.from(breeds).map((b) => ({ label: b, value: b }));
  }, [allPigeons]);

  const filteredPigeons = useMemo(() => {
    return allPigeons.filter((p) => {
      if (breedFilter && p.breed !== breedFilter) return false;
      return true;
    });
  }, [allPigeons, breedFilter]);

  const resetFilter = () => {
    setKeyword('');
    setBreedFilter(undefined);
    fetchPigeons('');
  };

  const doSearch = () => {
    fetchPigeons(keyword);
  };

  const toggleSelectAll = () => {
    const selectable = filteredPigeons.filter((p) => !existingIds.includes(p.id));
    const allSelected = selectable.every((p) => selectedIds.has(p.id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        selectable.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        selectable.forEach((p) => next.add(p.id));
        return next;
      });
    }
  };

  const handlePriceChange = (key: string, val: string) => {
    setPriceInput({ key, value: val });
  };

  const confirmPrice = (key: string) => {
    if (priceInput && priceInput.value) {
      const num = Number(priceInput.value);
      if (!isNaN(num) && num >= 0) {
        setDraftPrices((prev) => ({ ...prev, [key]: num }));
      }
    }
    setPriceInput(null);
  };

  const applyBatchPrice = () => {
    const num = Number(batchPrice);
    if (!isNaN(num) && num >= 0) {
      const updates: Record<string, number> = {};
      selectedIds.forEach((id) => {
        updates[`pigeon-${id}`] = num;
      });
      setDraftPrices((prev) => ({ ...prev, ...updates }));
    }
    setBatchPrice('');
  };

  const removeSelected = () => {
    setSelectedIds(new Set());
    setDraftPrices({});
  };

  const handleConfirm = () => {
    const items: SelectedItem[] = [];
    selectedIds.forEach((id) => {
      const pigeon = allPigeons.find((p) => p.id === id);
      if (pigeon) {
        const key = `pigeon-${id}`;
        items.push({
          key,
          pigeon_id: id,
          ring_number: pigeon.ring_number,
          name: pigeon.name,
          breed: pigeon.breed || '',
          bloodline: pigeon.bloodline || '',
          owner_name: pigeon.owner_name || '',
          start_price: draftPrices[key] ?? 5000,
        });
      }
    });
    onConfirm(items);
    setSelectedIds(new Set());
    setDraftPrices({});
    setKeyword('');
    setBreedFilter(undefined);
  };

  const allSelectable = filteredPigeons.filter((p) => !existingIds.includes(p.id));
  const allCurrentSelected = allSelectable.length > 0 && allSelectable.every((p) => selectedIds.has(p.id));

  return (
    <Modal
      title="选择拍品"
      open={open}
      onCancel={onClose}
      onOk={handleConfirm}
      okText={`确认添加 (${selectedIds.size}羽)`}
      cancelText="取消"
      width={960}
      destroyOnHidden={false}
      forceRender
      footer={[
        <Button key="reset" onClick={resetFilter}>重置</Button>,
        <div key="batch" style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 'auto' }}>
          <span style={{ color: token.colorTextSecondary, fontSize: 12 }}>批量起拍价:</span>
          <Input
            placeholder="如:5000"
            value={batchPrice}
            onChange={(e) => setBatchPrice(e.target.value)}
            style={{ width: 120 }}
          />
          <Button type="primary" size="small" onClick={applyBatchPrice} disabled={selectedIds.size === 0}>
            应用
          </Button>
        </div>,
        <Button key="clear" onClick={removeSelected} disabled={selectedIds.size === 0}>
          清空选择
        </Button>,
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="confirm" type="primary" onClick={handleConfirm} disabled={selectedIds.size === 0}>
          确认添加 ({selectedIds.size}羽)
        </Button>,
      ]}
    >
      <div style={{ marginBottom: 16 }}>
        <Space size="middle" wrap>
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索鸽名/足环号"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={doSearch}
            style={{ width: 240 }}
            allowClear
          />
          <Select
            placeholder="品系筛选"
            value={breedFilter}
            onChange={(v) => setBreedFilter(v as string | undefined)}
            options={breedOptions}
            style={{ width: 160 }}
            allowClear
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={doSearch}>查询</Button>
          <Button onClick={resetFilter}>重置</Button>
        </Space>
      </div>

      {filteredPigeons.length === 0 && !loading ? (
        <Empty description="暂无鸽子档案数据" style={{ padding: 40 }} />
      ) : (
        <>
          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Checkbox
              checked={allCurrentSelected}
              indeterminate={!allCurrentSelected && allSelectable.some((p) => selectedIds.has(p.id))}
              onChange={toggleSelectAll}
            >
              全选 ({allSelectable.length}羽可选)
            </Checkbox>
            <Text type="secondary">已选 {selectedIds.size} 羽</Text>
          </div>
          <Table
            loading={loading}
            size="small"
            rowKey="id"
            dataSource={filteredPigeons}
            pagination={{ pageSize: 10, size: 'small' }}
            scroll={{ y: 400 }}
            rowSelection={{
              selectedRowKeys: Array.from(selectedIds),
              onChange: (keys) => setSelectedIds(new Set(keys as number[])),
              getCheckboxProps: (record) => ({
                disabled: existingIds.includes(record.id),
              }),
            }}
            columns={[
              {
                title: '鸽名',
                dataIndex: 'name',
                width: 100,
                render: (v) => <Text strong>{v}</Text>,
              },
              { title: '足环号', dataIndex: 'ring_number', width: 140 },
              {
                title: '品系',
                dataIndex: 'breed',
                width: 100,
                render: (v) => v || '-',
              },
              {
                title: '血统',
                dataIndex: 'bloodline',
                width: 100,
                render: (v) => v || '-',
              },
              {
                title: '鸽主',
                dataIndex: 'owner_name',
                width: 100,
                render: (v) => v || '-',
              },
              {
                title: '状态',
                dataIndex: 'status',
                width: 80,
                render: (v) => {
                  if (existingIds.includes(v as number)) return <Tag color="warning">已在本场</Tag>;
                  return <Tag color="success">可拍卖</Tag>;
                },
              },
              {
                title: '竞拍状态',
                key: 'auction_status',
                width: 120,
                render: (_: unknown, record) => {
                  if (record.auction_status === 'active') {
                    return <Tag color="warning" title={record.active_session_name ?? undefined}>竞拍中</Tag>;
                  }
                  return <Tag color="default">空闲</Tag>;
                },
              },
              {
                title: '起拍价',
                key: 'price',
                width: 140,
                render: (_: unknown, record) => {
                  const key = `pigeon-${record.id}`;
                  if (priceInput?.key === key) {
                    return (
                      <Input
                        size="small"
                        prefix="¥"
                        defaultValue={String(draftPrices[key] ?? 5000)}
                        autoFocus
                        onBlur={(e) => handlePriceChange(key, e.target.value)}
                        onPressEnter={(e) => {
                          handlePriceChange(key, (e.target as HTMLInputElement).value);
                          confirmPrice(key);
                        }}
                      />
                    );
                  }
                  const price = draftPrices[key] ?? 5000;
                  return (
                    <span
                      style={{ color: token.colorPrimary, cursor: 'pointer', fontWeight: 500 }}
                      onClick={() => setPriceInput({ key, value: String(price) })}
                      title="点击编辑"
                    >
                      ¥{price.toLocaleString()}
                    </span>
                  );
                },
              },
            ]}
          />
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>提示: 点击起拍价可单独修改,或使用上方"批量起拍价"统一设置</Text>
          </div>
        </>
      )}
    </Modal>
  );
};

// 新增/编辑的主抽屉(左表单右预览)
const SessionFormDrawer = ({
  open,
  onClose,
  onSubmit,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AuctionSessionCreateParams & { items: SelectedItem[] }, saveDraft: boolean) => Promise<void>;
  editing: AuctionSession | null;
}) => {
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [items, setItems] = useState<SelectedItem[]>([]);
  const [itemSelectorOpen, setItemSelectorOpen] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'draft' | 'scheduled' | 'immediate'>('draft');
  const [publishTime, setPublishTime] = useState<Dayjs | null>(null);
  const [startTime, setStartTime] = useState<Dayjs | null>(null);
  const [endTime, setEndTime] = useState<Dayjs | null>(null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [name, setName] = useState('');
  const [auctionType, setAuctionType] = useState('online');
  const [deposit, setDeposit] = useState(5000);
  const [defaultStartPrice, setDefaultStartPrice] = useState(5000);
  const [defaultBidStep, setDefaultBidStep] = useState(500);
  const [allowEntrustedBid, setAllowEntrustedBid] = useState(true);
  const [allowAutoBid, setAllowAutoBid] = useState(true);

  // 初始化编辑数据
  useState(() => {
    if (editing) {
      setName(editing.name || '');
      setDescription(editing.description || '');
      setLocation(editing.location || '');
      setStartTime(editing.start_time ? dayjs(editing.start_time) : null);
      setEndTime(editing.end_time ? dayjs(editing.end_time) : null);
      setAuctionType(editing.auction_type || 'online');
      setDeposit(editing.deposit ?? 5000);
      setDefaultStartPrice(editing.default_start_price ?? 5000);
      setDefaultBidStep(editing.default_bid_step ?? 500);
      setAllowEntrustedBid(editing.allow_entrusted_bid !== 0);
      setAllowAutoBid(editing.allow_auto_bid !== 0);
      if (editing.status === 'pending') setPublishStatus('immediate');
      else if (editing.status === 'draft') setPublishStatus('draft');
    }
  });

  // 生成预览编号
  const previewCode = editing?.session_code || (name ? `AUC-${dayjs().year()}-${String(Math.floor(1000 + name.length * 123) % 9000)}` : 'AUC-2026-----');

  const durationText = useMemo(() => {
    if (!startTime || !endTime) return '-';
    const diffDays = endTime.diff(startTime, 'day');
    const diffHours = endTime.diff(startTime, 'hour');
    if (diffHours < 24) return `${diffHours} 小时`;
    return `${diffDays} 天 ${diffHours % 24} 小时`;
  }, [startTime, endTime]);

  const handleConfirmItems = (newItems: SelectedItem[]) => {
    const filtered = newItems.filter((item) => !items.some((i) => i.pigeon_id === item.pigeon_id));
    setItems([...items, ...filtered]);
    setItemSelectorOpen(false);
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  const updateItemPrice = (key: string, price: number) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, start_price: price } : i)));
  };

  const handleSave = async (saveDraft: boolean) => {
    if (!name.trim()) {
      Modal.warning({ title: '请填写场次名称' });
      return;
    }
    if (endTime && startTime && endTime <= startTime) {
      Modal.warning({ title: '结束时间必须晚于开始时间' });
      return;
    }
    if (!saveDraft && items.length === 0) {
      Modal.warning({ title: '请至少添加一羽拍品' });
      return;
    }
    if (publishStatus === 'scheduled' && !publishTime) {
      Modal.warning({ title: '请选择定时发布时间' });
      return;
    }
    if (publishStatus === 'scheduled' && publishTime && startTime && publishTime >= startTime) {
      Modal.warning({ title: '发布时间须早于拍卖开始时间' });
      return;
    }

    const submitData: AuctionSessionCreateParams & { items: SelectedItem[] } = {
      name: name.trim(),
      start_time: startTime ? startTime.valueOf() : null,
      end_time: endTime ? endTime.valueOf() : null,
      location: location || undefined,
      description: description || undefined,
      auction_type: auctionType,
      deposit,
      default_start_price: defaultStartPrice,
      default_bid_step: defaultBidStep,
      allow_entrusted_bid: allowEntrustedBid,
      allow_auto_bid: allowAutoBid,
      publish_time: publishStatus === 'scheduled' && publishTime ? publishTime.valueOf() : null,
      items,
      status: saveDraft ? 'draft' : (publishStatus === 'immediate' ? 'pending' : 'draft'),
    };
    await onSubmit(submitData, saveDraft);
  };

  const priceRange = useMemo(() => {
    if (items.length === 0) return '-';
    const prices = items.map((i) => i.start_price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return `¥${min.toLocaleString()}`;
    return `¥${min.toLocaleString()} ~ ¥${max.toLocaleString()}`;
  }, [items]);

  return (
    <Drawer
      title={editing ? '编辑拍卖场次' : '新增拍卖场次'}
      open={open}
      onClose={onClose}
      width={1120}
      destroyOnHidden
      maskClosable={false}
      extra={
        <Space>
          <Button onClick={() => handleSave(true)}>保存草稿</Button>
          <Button type="primary" onClick={() => handleSave(false)}>
            {publishStatus === 'immediate' ? '确认发布' : '确认保存'}
          </Button>
        </Space>
      }
    >
      <Row gutter={24}>
        {/* 左侧表单 */}
        <Col span={16}>
          <Form form={form} layout="vertical" onFinish={() => handleSave(publishStatus !== 'draft')}>
            {/* ① 场次基本信息 */}
            <Card
              size="small"
              style={{ marginBottom: 16, borderLeft: `3px solid ${token.colorPrimary}` }}
              styles={{ body: { padding: 16 } }}
              title={
                <Space>
                  <TagOutlined style={{ color: token.colorPrimary }} />
                  <span>① 场次基本信息</span>
                </Space>
              }
            >
              <Row gutter={12}>
                <Col span={14}>
                  <Form.Item
                    label="场次名称"
                    name="name"
                    rules={[{ required: true, message: '请输入场次名称' }]}
                  >
                    <Input
                      placeholder="请输入场次名称(如:2026秋季铭鸽拍卖会)"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={100}
                      showCount
                    />
                  </Form.Item>
                </Col>
                <Col span={10}>
                  <Form.Item label="场次编号">
                    <Input
                      value={previewCode}
                      disabled
                      placeholder="系统自动生成"
                      prefix={<Tag color="processing">AUTO</Tag>}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="场次描述" name="description">
                <Input.TextArea
                  placeholder="请输入场次描述(如:本场汇聚全国顶级铭鸽)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  showCount
                  autoSize={{ minRows: 2, maxRows: 4 }}
                />
              </Form.Item>
            </Card>

            {/* ② 拍卖时间与地点 */}
            <Card
              size="small"
              style={{ marginBottom: 16, borderLeft: `3px solid #52c41a` }}
              styles={{ body: { padding: 16 } }}
              title={
                <Space>
                  <CalendarOutlined style={{ color: '#52c41a' }} />
                  <span>② 拍卖时间与地点</span>
                </Space>
              }
            >
              <Form.Item
                label="拍卖时间段"
                rules={[
                  {
                    validator: () => {
                      if (startTime && endTime && endTime <= startTime) {
                        return Promise.reject('结束时间须晚于开始时间');
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Row gutter={12} align="middle">
                  <Col span={11}>
                    <DatePicker
                      showTime={{ format: 'HH:mm' }}
                      format="YYYY-MM-DD HH:mm"
                      placeholder="开始时间"
                      value={startTime}
                      onChange={(v) => setStartTime(v)}
                      style={{ width: '100%' }}
                      allowClear
                    />
                  </Col>
                  <Col span={2} style={{ textAlign: 'center', color: token.colorTextSecondary }}>—</Col>
                  <Col span={11}>
                    <DatePicker
                      showTime={{ format: 'HH:mm' }}
                      format="YYYY-MM-DD HH:mm"
                      placeholder="结束时间"
                      value={endTime}
                      onChange={(v) => setEndTime(v)}
                      style={{ width: '100%' }}
                      allowClear
                    />
                  </Col>
                </Row>
                {startTime && endTime && endTime <= startTime && (
                  <Text type="danger" style={{ fontSize: 12 }}>⚠️ 结束时间须晚于开始时间</Text>
                )}
                {startTime && endTime && endTime > startTime && (
                  <Text type="secondary" style={{ fontSize: 12 }}>持续时间: {durationText}</Text>
                )}
              </Form.Item>
              <Form.Item label="拍卖地点">
                <Input
                  placeholder="请输入拍卖地点"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </Form.Item>
            </Card>

            {/* ③ 竞拍规则 */}
            <Card
              size="small"
              style={{ marginBottom: 16, borderLeft: `3px solid #faad14` }}
              styles={{ body: { padding: 16 } }}
              title={
                <Space>
                  <SettingOutlined style={{ color: '#faad14' }} />
                  <span>③ 竞拍规则</span>
                </Space>
              }
            >
              <Form.Item label="拍卖方式">
                <Segmented
                  value={auctionType}
                  onChange={(v) => setAuctionType(v as string)}
                  options={[
                    { label: '线上拍卖', value: 'online' },
                    { label: '线下拍卖', value: 'offline' },
                    { label: '线上线下同步', value: 'hybrid' },
                  ]}
                  block
                />
              </Form.Item>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label="保证金 (元)">
                    <InputNumber
                      min={0}
                      step={500}
                      value={deposit}
                      onChange={(v) => setDeposit(Number(v) || 0)}
                      style={{ width: '100%' }}
                      formatter={(v) => `¥ ${v}`}
                      parser={(v) => (v ? Number(v.replace(/[^\d.]/g, '')) : 0) as number}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="起拍价默认 (元)">
                    <InputNumber
                      min={0}
                      step={500}
                      value={defaultStartPrice}
                      onChange={(v) => setDefaultStartPrice(Number(v) || 0)}
                      style={{ width: '100%' }}
                      formatter={(v) => `¥ ${v}`}
                      parser={(v) => (v ? Number(v.replace(/[^\d.]/g, '')) : 0) as number}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="加价步长默认 (元)">
                    <InputNumber
                      min={0}
                      step={100}
                      value={defaultBidStep}
                      onChange={(v) => setDefaultBidStep(Number(v) || 0)}
                      style={{ width: '100%' }}
                      formatter={(v) => `¥ ${v}`}
                      parser={(v) => (v ? Number(v.replace(/[^\d.]/g, '')) : 0) as number}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label=" " labelCol={{ span: 24 }}>
                    <Space>
                      <Checkbox checked={allowEntrustedBid} onChange={(e) => setAllowEntrustedBid(e.target.checked)}>
                        允许委托出价
                      </Checkbox>
                      <Checkbox checked={allowAutoBid} onChange={(e) => setAllowAutoBid(e.target.checked)}>
                        允许自动加价
                      </Checkbox>
                    </Space>
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* ④ 关联拍品 */}
            <Card
              size="small"
              style={{ marginBottom: 16, borderLeft: `3px solid #eb2f96` }}
              styles={{ body: { padding: 16 } }}
              title={
                <Space>
                  <GiftOutlined style={{ color: '#eb2f96' }} />
                  <span>④ 关联拍品 ({items.length}羽)</span>
                </Space>
              }
              extra={
                <Space>
                  <Button icon={<PlusOutlined />} onClick={() => setItemSelectorOpen(true)} type="primary" size="small">
                    选择拍品
                  </Button>
                  {items.length > 0 && (
                    <Button
                      size="small"
                      onClick={() => setItems([])}
                      danger
                    >
                      全部移除
                    </Button>
                  )}
                </Space>
              }
            >
              {items.length === 0 ? (
                <Empty
                  description={'尚未添加拍品,点击右上角"选择拍品"添加鸽子'}
                  style={{ padding: 24 }}
                >
                  <Button icon={<PlusOutlined />} type="primary" onClick={() => setItemSelectorOpen(true)}>
                    立即选择
                  </Button>
                </Empty>
              ) : (
                <>
                  <Table
                    size="small"
                    rowKey="key"
                    pagination={false}
                    dataSource={items}
                    scroll={{ y: 240 }}
                    columns={[
                      { title: '鸽名', dataIndex: 'name', width: 90, render: (v) => <Text strong>{v}</Text> },
                      { title: '足环号', dataIndex: 'ring_number', width: 130 },
                      { title: '品系', dataIndex: 'breed', width: 90, render: (v) => v || '-' },
                      { title: '鸽主', dataIndex: 'owner_name', width: 100, render: (v) => v || '-' },
                      {
                        title: '起拍价',
                        dataIndex: 'start_price',
                        width: 130,
                        render: (v, record) => (
                          <InputNumber
                            size="small"
                            min={0}
                            value={v}
                            onChange={(nv) => updateItemPrice(record.key, Number(nv) || 0)}
                            style={{ width: 110 }}
                            formatter={(val) => `¥ ${val}`}
                            parser={(val) => (val ? Number(val.replace(/[^\d.]/g, '')) : 0) as number}
                          />
                        ),
                      },
                      {
                        title: '操作',
                        key: 'action',
                        width: 70,
                        render: (_, record) => (
                          <Button
                            type="link"
                            size="small"
                            danger
                            onClick={() => removeItem(record.key)}
                            icon={<DeleteOutlined />}
                          >
                            移除
                          </Button>
                        ),
                      },
                    ]}
                  />
                  {items.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        已选 {items.length} 羽 · 价格区间: {priceRange}
                      </Text>
                    </div>
                  )}
                </>
              )}
            </Card>

            {/* ⑤ 发布设置 */}
            <Card
              size="small"
              style={{ marginBottom: 16, borderLeft: `3px solid #722ed1` }}
              styles={{ body: { padding: 16 } }}
              title={
                <Space>
                  <ShopOutlined style={{ color: '#722ed1' }} />
                  <span>⑤ 发布设置</span>
                </Space>
              }
            >
              <Form.Item label="发布状态">
                <Segmented
                  value={publishStatus}
                  onChange={(v) => setPublishStatus(v as 'draft' | 'scheduled' | 'immediate')}
                  block
                  options={[
                    { label: '草稿', value: 'draft' },
                    { label: '定时发布', value: 'scheduled' },
                    { label: '立即发布', value: 'immediate' },
                  ]}
                />
              </Form.Item>
              {publishStatus === 'scheduled' && (
                <Form.Item label="发布时间 (须早于拍卖开始时间)">
                  <DatePicker
                    showTime={{ format: 'HH:mm' }}
                    format="YYYY-MM-DD HH:mm"
                    placeholder="选择发布时间"
                    value={publishTime}
                    onChange={(v) => setPublishTime(v)}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              )}
              {publishStatus === 'immediate' && (
                <Alert
                  type="info"
                  showIcon
                  message="保存后将立即发布到拍卖列表,参与用户可见。"
                  style={{ marginBottom: 8 }}
                />
              )}
              {publishStatus === 'draft' && (
                <Alert
                  type="warning"
                  showIcon
                  message="草稿状态仅管理员可见,您可以随时编辑后发布。"
                  style={{ marginBottom: 8 }}
                />
              )}
            </Card>

            <Form.Item style={{ textAlign: 'center', marginTop: 16, marginBottom: 0 }}>
              <Space size="large">
                <Button size="large" onClick={() => onClose()}>取消</Button>
                <Button size="large" onClick={() => handleSave(true)}>
                  保存草稿
                </Button>
                <Button size="large" type="primary" onClick={() => handleSave(false)}>
                  {publishStatus === 'immediate' ? '确认发布' : '保存并发布'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Col>

        {/* 右侧预览 */}
        <Col span={8}>
          <div style={{ position: 'sticky', top: 16 }}>
            <Card
              style={{
                background: `linear-gradient(135deg, ${token.colorBgContainer} 0%, ${token.colorInfoBg} 100%)`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
              styles={{ body: { padding: 0 } }}
              title={
                <Space>
                  <EyeOutlined style={{ color: token.colorPrimary }} />
                  <span>场次预览</span>
                </Space>
              }
            >
              <div style={{ padding: 16 }}>
                {/* 场次标题区 */}
                <div
                  style={{
                    background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorLink} 100%)`,
                    borderRadius: 8,
                    padding: 16,
                    color: '#fff',
                    marginBottom: 12,
                  }}
                >
                  <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                    {name || '场次名称'}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.9 }}>
                    <Tag style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }}>
                      {previewCode}
                    </Tag>
                    <Tag
                      style={{
                        background: AUCTION_TYPE_BADGE[auctionType]?.color || '#1890ff',
                        color: '#fff',
                        border: 'none',
                      }}
                    >
                      {AUCTION_TYPE_LABEL[auctionType]}
                    </Tag>
                  </div>
                </div>

                {/* 时间地点 */}
                <Descriptions
                  column={1}
                  size="small"
                  styles={{
                    label: { color: token.colorTextSecondary, width: 80, fontSize: 12 },
                    content: { fontSize: 13 },
                  }}
                >
                  <Descriptions.Item label="时间">
                    {startTime?.format('YYYY-MM-DD HH:mm') || '-'}
                    {' ~ '}
                    {endTime?.format('YYYY-MM-DD HH:mm') || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="地点">
                    {location || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="持续">
                    {durationText}
                  </Descriptions.Item>
                </Descriptions>

                <Divider style={{ margin: '12px 0' }} />

                {/* 拍品与价格概览 */}
                <Row gutter={8}>
                  <Col span={12}>
                    <div style={{ textAlign: 'center', padding: 8, background: token.colorFill, borderRadius: 6 }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: token.colorPrimary }}>{items.length}</div>
                      <div style={{ fontSize: 12, color: token.colorTextSecondary }}>拍品数量</div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ textAlign: 'center', padding: 8, background: token.colorFill, borderRadius: 6 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: token.colorText }}>{priceRange}</div>
                      <div style={{ fontSize: 12, color: token.colorTextSecondary }}>价格区间</div>
                    </div>
                  </Col>
                </Row>

                <Divider style={{ margin: '12px 0' }} />

                {/* 规则摘要 */}
                <div style={{ fontSize: 12, color: token.colorTextSecondary, marginBottom: 4 }}>竞拍规则</div>
                <Descriptions
                  column={2}
                  size="small"
                  styles={{
                    label: { color: token.colorTextTertiary, fontSize: 11, width: 'auto' },
                    content: { fontSize: 12 },
                  }}
                >
                  <Descriptions.Item label="保证金">¥{deposit.toLocaleString()}</Descriptions.Item>
                  <Descriptions.Item label="起拍价">¥{defaultStartPrice.toLocaleString()}</Descriptions.Item>
                  <Descriptions.Item label="加价步长">¥{defaultBidStep.toLocaleString()}</Descriptions.Item>
                  <Descriptions.Item label="自动出价">
                    {allowAutoBid ? '已开启' : '已关闭'}
                  </Descriptions.Item>
                </Descriptions>

                {description && (
                  <>
                    <Divider style={{ margin: '12px 0' }} />
                    <div style={{ fontSize: 12, color: token.colorTextSecondary, marginBottom: 4 }}>场次描述</div>
                    <div
                      style={{
                        fontSize: 12,
                        color: token.colorText,
                        lineHeight: 1.6,
                        maxHeight: 80,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {description}
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        </Col>
      </Row>

      <ItemSelectorModal
        open={itemSelectorOpen}
        onClose={() => setItemSelectorOpen(false)}
        onConfirm={handleConfirmItems}
        existingIds={items.map((i) => i.pigeon_id)}
      />
    </Drawer>
  );
};

// 主页面:列表 + 新增/编辑抽屉 + 详情抽屉
const AuctionSession = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canEdit = hasPermission(currentUser, 'auction:edit');
  const canDeal = hasPermission(currentUser, 'auction:deal');
  const actionRef = useRef<ActionType>();
  const { tableLoading, handleRefresh } = useTableRefresh(actionRef, { messageApi: message });
  const navigate = useNavigate();

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editing, setEditing] = useState<AuctionSession | null>(null);

  const [detailVisible, setDetailVisible] = useState(false);
  const [detail, setDetail] = useState<AuctionSession | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setDrawerVisible(true);
  };

  const openEdit = (record: AuctionSession) => {
    setEditing(record);
    setDrawerVisible(true);
  };

  const openDetail = async (record: AuctionSession) => {
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const res = await getAuctionSessionDetail(record.id);
      setDetail(res);
    } catch {
      // 拦截器已提示错误
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSubmit = async (
    values: AuctionSessionCreateParams & { items: SelectedItem[] },
    saveDraft: boolean
  ) => {
    const { items, ...sessionData } = values;
    if (editing) {
      await updateAuctionSession(editing.id, sessionData);
      message.success('更新成功');
    } else {
      const createData: AuctionSessionCreateParams = {
        ...sessionData,
        status: saveDraft ? 'draft' : undefined,
      };
      await createAuctionSession(createData);
      message.success(saveDraft ? '草稿已保存' : '场次创建成功');
    }
    setDrawerVisible(false);
    handleRefresh();
  };

  const handleTransition = async (record: AuctionSession, next: string) => {
    try {
      await transitionAuctionSession(record.id, next);
      message.success(`场次已${STATUS_LABEL[next] ?? next}`);
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  const handleDelete = async (record: AuctionSession) => {
    try {
      await deleteAuctionSession(record.id);
      message.success('删除成功');
      handleRefresh();
    } catch {
      // 拦截器已提示错误
    }
  };

  const columns: ProColumns<AuctionSession>[] = [
    { title: '序号', dataIndex: 'index', valueType: 'index', width: 60, hideInSearch: true },
    {
      title: '场次名称',
      dataIndex: 'name',
      width: 200,
      ellipsis: true,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.name}</Text>
          {record.session_code && (
            <Text type="secondary" style={{ fontSize: 11 }}>{record.session_code}</Text>
          )}
        </Space>
      ),
    },
    {
      title: '拍卖方式',
      dataIndex: 'auction_type',
      width: 120,
      render: (_, record) => {
        const type = record.auction_type || 'online';
        const badge = AUCTION_TYPE_BADGE[type];
        return (
          <Tag color={badge?.color} style={{ background: badge?.bg }}>
            {AUCTION_TYPE_LABEL[type] || type}
          </Tag>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      valueEnum: STATUS_OPTIONS.reduce(
        (acc, cur) => ({ ...acc, [cur.value]: { text: cur.label } }),
        {} as Record<string, { text: string }>
      ),
      render: (_, record) => (
        <Tag color={STATUS_COLOR[record.status] ?? 'default'}>
          {STATUS_LABEL[record.status] ?? record.status}
        </Tag>
      ),
    },
    {
      title: '拍品数',
      dataIndex: 'item_count',
      width: 80,
      hideInSearch: true,
      render: (_, record) => record.item_count ?? 0,
    },
    {
      title: '成交数',
      dataIndex: 'deal_count',
      width: 80,
      hideInSearch: true,
      render: (_, record) => record.deal_count ?? 0,
    },
    {
      title: '开始时间',
      dataIndex: 'start_time',
      width: 160,
      hideInSearch: true,
      render: (_, record) =>
        record.start_time ? dayjs(record.start_time).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '结束时间',
      dataIndex: 'end_time',
      width: 160,
      hideInSearch: true,
      render: (_, record) =>
        record.end_time ? dayjs(record.end_time).format('YYYY-MM-DD HH:mm') : '-',
    },
    { title: '地点', dataIndex: 'location', width: 140, ellipsis: true, hideInSearch: true },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 160,
      hideInSearch: true,
      render: (_, record) => dayjs(record.created_at).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 320,
      fixed: 'right',
      hideInSearch: true,
      render: (_, record) => (
        <Space size={0} wrap>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>
            详情
          </Button>
          {canEdit && record.status !== 'ended' && record.status !== 'cancelled' && (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
              编辑
            </Button>
          )}
          {canEdit && (
            <Button
              type="link"
              size="small"
              icon={<ProfileOutlined />}
              onClick={() => navigate(`/auction/items/${record.id}`)}
            >
              拍品
            </Button>
          )}
          {canEdit && record.status === 'draft' && (
            <Popconfirm title="确认发布场次为未开始?" onConfirm={() => handleTransition(record, 'pending')}>
              <Button type="link" size="small" icon={<ArrowRightOutlined />}>
                发布
              </Button>
            </Popconfirm>
          )}
          {canEdit && record.status === 'pending' && (
            <Popconfirm title="确认开始拍卖?" onConfirm={() => handleTransition(record, 'ongoing')}>
              <Button type="link" size="small" icon={<ArrowRightOutlined />}>
                开始
              </Button>
            </Popconfirm>
          )}
          {canEdit && record.status === 'ongoing' && (
            <Popconfirm
              title="确认结束拍卖?将自动按最高出价生成成交单。"
              onConfirm={() => handleTransition(record, 'ended')}
            >
              <Button type="link" size="small" icon={<ArrowRightOutlined />}>
                结束
              </Button>
            </Popconfirm>
          )}
          {canDeal && (record.status === 'ongoing' || record.status === 'ended') && (
            <Button
              type="link"
              size="small"
              onClick={() => navigate(`/auction/deal?session_id=${record.id}`)}
            >
              成交
            </Button>
          )}
          {canEdit &&
            record.status !== 'ended' &&
            record.status !== 'cancelled' &&
            record.status !== 'draft' && (
              <Popconfirm title="确认取消场次?" onConfirm={() => handleTransition(record, 'cancelled')}>
                <Button type="link" size="small" danger icon={<StopOutlined />}>
                  取消
                </Button>
              </Popconfirm>
            )}
          {canEdit && (record.status === 'draft' || record.status === 'cancelled') && (
            <Popconfirm title="确认删除该场次?" onConfirm={() => handleDelete(record)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
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
      <ProTable<AuctionSession>
        headerTitle="拍卖场次列表"
        actionRef={actionRef}
        loading={tableLoading}
        rowKey="id"
        columns={columns}
        options={{ density: false, reload: false }}
        scroll={{ x: 1500 }}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          const { current, pageSize, name, status } = params;
          try {
            const res = await getAuctionSessions({
              page: current,
              pageSize,
              name: name as string | undefined,
              status: status as string | undefined,
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
                  新增场次
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

      {/* 新增/编辑抽屉 */}
      <SessionFormDrawer
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onSubmit={handleSubmit}
        editing={editing}
      />

      {/* 详情抽屉 */}
      <Drawer
        title="拍卖场次详情"
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={720}
        destroyOnHidden
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>加载中...</div>
        ) : !detail ? (
          <div style={{ textAlign: 'center', padding: 48 }}>暂无数据</div>
        ) : (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="场次名称" span={2}>
              {detail.name}
            </Descriptions.Item>
            <Descriptions.Item label="场次编号">
              {detail.session_code || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={STATUS_COLOR[detail.status] ?? 'default'}>
                {STATUS_LABEL[detail.status] ?? detail.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="拍卖方式">
              <Tag>
                {AUCTION_TYPE_LABEL[detail.auction_type || 'online'] || detail.auction_type}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="拍品数">{detail.item_count ?? 0}</Descriptions.Item>
            <Descriptions.Item label="开始时间">
              {detail.start_time ? dayjs(detail.start_time).format('YYYY-MM-DD HH:mm:ss') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="结束时间">
              {detail.end_time ? dayjs(detail.end_time).format('YYYY-MM-DD HH:mm:ss') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="成交数">{detail.deal_count ?? 0}</Descriptions.Item>
            <Descriptions.Item label="保证金">¥{detail.deposit ?? 5000}</Descriptions.Item>
            <Descriptions.Item label="默认起拍价" span={1}>¥{detail.default_start_price ?? 5000}</Descriptions.Item>
            <Descriptions.Item label="默认加价步长">¥{detail.default_bid_step ?? 500}</Descriptions.Item>
            <Descriptions.Item label="委托出价">
              {detail.allow_entrusted_bid !== 0 ? '已开启' : '已关闭'}
            </Descriptions.Item>
            <Descriptions.Item label="自动加价">
              {detail.allow_auto_bid !== 0 ? '已开启' : '已关闭'}
            </Descriptions.Item>
            <Descriptions.Item label="拍卖地点" span={2}>
              {detail.location || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="场次描述" span={2}>
              {detail.description || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(detail.created_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {dayjs(detail.updated_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </>
  );
};

export default AuctionSession;
