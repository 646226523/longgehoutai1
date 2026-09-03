import {
  App,
  Avatar,
  Button,
  Card,
  Carousel,
  Col,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  AppstoreOutlined,
  BellOutlined,
  FireOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import ImageUploader from '../../components/ImageUploader';
import {
  createBanner,
  deleteBanner,
  getBannerList,
  getBannerStats,
  updateBanner,
  updateBannerSort,
  updateBannerStatus,
  type BannerItem,
  type BannerStats,
} from '../../services/content';
import { getCompetitionOptions } from '../../services/competition';
import { getAuctionSessions } from '../../services/auction';
import { getNftAssets } from '../../services/nft';
import { getGeneProfileOptions } from '../../services/gene';

const { Text } = Typography;

const POSITION_OPTIONS = [
  { label: '首页顶部', value: 'home_top' },
  { label: '首页中部', value: 'home_mid' },
  { label: '首页底部', value: 'home_bottom' },
];

const POSITION_LABEL: Record<string, string> = {
  home_top: '首页顶部',
  home_mid: '首页中部',
  home_bottom: '首页底部',
};

const STATUS_OPTIONS = [
  { label: '已投放', value: 'active' },
  { label: '待投放', value: 'pending' },
  { label: '已过期', value: 'expired' },
  { label: '已下架', value: 'offline' },
  { label: '草稿', value: 'draft' },
];

// 支持动态选择的跳转类型
const DYNAMIC_JUMP_TYPES = ['race', 'auction', 'nft', 'gene'];

// 跳转类型API配置
type JumpApiConfig = {
  [key: string]: {
    loader: () => Promise<any[]>;
    labelKey: string;
    valueKey: string;
    extraKeys?: string[];
    formatOption?: (item: any) => { label: string; value: string; disabled?: boolean };
  };
};

const jumpApiConfig: JumpApiConfig = {
  race: {
    loader: async () => {
      const data = await getCompetitionOptions();
      return data.map(item => ({
        id: item.id,
        name: item.name,
        status: item.status,
        type: item.type,
        start_time: item.start_time,
        end_time: item.end_time,
      }));
    },
    labelKey: 'name',
    valueKey: 'id',
    extraKeys: ['status', 'type'],
  },
  auction: {
    loader: async () => {
      const data = await getAuctionSessions({ page: 1, pageSize: 100 });
      return data.list.map(item => ({
        id: item.id,
        name: item.name,
        status: item.status,
        start_time: item.start_time,
        location: item.location,
      }));
    },
    labelKey: 'name',
    valueKey: 'id',
    extraKeys: ['status', 'location'],
  },
  nft: {
    loader: async () => {
      const data = await getNftAssets({ page: 1, pageSize: 100 });
      return data.list.map(item => ({
        id: item.id,
        name: item.name,
        owner_name: item.owner_name,
        status: item.status,
      }));
    },
    labelKey: 'name',
    valueKey: 'id',
    extraKeys: ['owner_name', 'status'],
  },
  gene: {
    loader: async () => {
      const data = await getGeneProfileOptions();
      return data.map(item => ({
        id: item.id,
        name: item.name,
        ring_number: item.ring_number,
        owner_name: item.owner_name,
      }));
    },
    labelKey: 'name',
    valueKey: 'id',
    extraKeys: ['ring_number', 'owner_name'],
  },
};

type FilterState = {
  title?: string;
  position?: string;
  status?: string;
};

type TableState = {
  list: BannerItem[];
  total: number;
  loading: boolean;
};

const calcBannerStatus = (record: BannerItem): { text: string; color: string; type: string } => {
  if (record.is_draft === 1) return { text: '草稿', color: 'blue', type: 'draft' };
  const now = Date.now();
  if (record.status === 0) return { text: '已下架', color: 'default', type: 'offline' };
  if (record.end_time && record.end_time < now) return { text: '已过期', color: 'default', type: 'expired' };
  if (record.start_time && record.start_time > now) return { text: '待投放', color: 'orange', type: 'pending' };
  return { text: '已投放', color: 'green', type: 'active' };
};

const BannerDashboard = ({ stats }: { stats: BannerStats | null }) => {
  const loading = !stats;

  const positionColors: Record<string, { bg: string; text: string; progress: string }> = {
    home_top: { bg: 'rgba(22, 119, 255, 0.1)', text: '#1677ff', progress: '#1677ff' },
    home_mid: { bg: 'rgba(82, 196, 26, 0.1)', text: '#52c41a', progress: '#52c41a' },
    home_bottom: { bg: 'rgba(250, 140, 22, 0.1)', text: '#fa8c16', progress: '#fa8c16' },
  };

  const positionIcons: Record<string, React.ReactNode> = {
    home_top: <RocketOutlined />,
    home_mid: <AppstoreOutlined />,
    home_bottom: <BellOutlined />,
  };

  const mainStats = [
    {
      title: '总 Banner',
      value: stats?.total ?? 0,
      icon: <AppstoreOutlined style={{ fontSize: 28 }} />,
      color: '#1677ff',
      bgColor: 'rgba(22, 119, 255, 0.08)',
    },
    {
      title: '已投放',
      value: stats?.active ?? 0,
      icon: <FireOutlined style={{ fontSize: 28 }} />,
      color: '#52c41a',
      bgColor: 'rgba(82, 196, 26, 0.08)',
    },
    {
      title: '总曝光',
      value: stats?.total_impressions ?? 0,
      icon: <EyeOutlined style={{ fontSize: 28 }} />,
      color: '#722ed1',
      bgColor: 'rgba(114, 46, 209, 0.08)',
      formatter: (v: number) => v.toLocaleString(),
    },
    {
      title: '点击率',
      value: stats?.ctr ?? 0,
      icon: <ThunderboltOutlined style={{ fontSize: 28 }} />,
      color: '#fa8c16',
      bgColor: 'rgba(250, 140, 22, 0.08)',
      suffix: '%',
      precision: 2,
    },
  ];

  const totalPositions = stats
    ? stats.positions.home_top.total + stats.positions.home_mid.total + stats.positions.home_bottom.total
    : 0;

  return (
    <div style={{ marginBottom: 16 }}>
      {/* 核心指标卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {mainStats.map((stat, idx) => (
          <Col xs={12} sm={12} md={6} key={idx}>
            <Card
              variant="borderless"
              loading={loading}
              style={{
                borderRadius: 12,
                background: stat.bgColor,
                transition: 'all 0.3s ease',
              }}
              styles={{ body: { padding: 20 } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: stat.color,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                >
                  {stat.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#666', fontSize: 13, marginBottom: 4 }}>
                    {stat.title}
                  </div>
                  <Statistic
                    value={stat.value}
                    valueStyle={{ color: stat.color, fontSize: 26, fontWeight: 700 }}
                    formatter={stat.formatter as any}
                    suffix={stat.suffix}
                    precision={stat.precision}
                  />
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 位置分布统计 */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AppstoreOutlined style={{ color: '#1677ff' }} />
            <span>广告位分布</span>
            <Tag color="blue" style={{ marginLeft: 8 }}>
              共 {totalPositions} 个
            </Tag>
          </div>
        }
        variant="borderless"
        style={{ borderRadius: 12 }}
        loading={loading}
      >
        {stats && totalPositions > 0 ? (
          <Row gutter={[24, 16]}>
            {(['home_top', 'home_mid', 'home_bottom'] as const).map((pos) => {
              const posStats = stats.positions[pos];
              const colors = positionColors[pos];
              const percentage = totalPositions > 0 ? (posStats.total / totalPositions) * 100 : 0;
              const activeRate = posStats.total > 0 ? (posStats.active / posStats.total) * 100 : 0;

              return (
                <Col xs={24} sm={24} md={8} key={pos}>
                  <div
                    style={{
                      background: colors.bg,
                      borderRadius: 12,
                      padding: 20,
                      border: `1px solid ${colors.progress}20`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                      <Avatar
                        style={{
                          backgroundColor: colors.bg,
                          color: colors.text,
                          marginRight: 12,
                        }}
                        icon={positionIcons[pos]}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>
                          {POSITION_LABEL[pos]}
                        </div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          占比 {percentage.toFixed(1)}%
                        </Text>
                      </div>
                    </div>

                    <div style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Banner 总数
                        </Text>
                        <Text strong style={{ color: colors.text }}>
                          {posStats.total}
                        </Text>
                      </div>
                      <Progress
                        percent={percentage}
                        showInfo={false}
                        strokeColor={colors.progress}
                        trailColor="#f0f0f0"
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          已投放 {posStats.active} 个
                        </Text>
                        <Tag
                          color={activeRate > 50 ? 'green' : activeRate > 0 ? 'orange' : 'default'}
                          style={{ fontSize: 11 }}
                        >
                          {activeRate.toFixed(0)}% 活跃率
                        </Tag>
                      </div>
                      <Progress
                        percent={activeRate}
                        showInfo={false}
                        strokeColor={activeRate > 50 ? '#52c41a' : activeRate > 0 ? '#fa8c16' : '#d9d9d9'}
                        trailColor="#f0f0f0"
                        size="small"
                      />
                    </div>
                  </div>
                </Col>
              );
            })}
          </Row>
        ) : (
          <Empty
            description="暂无 Banner 数据"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ padding: '24px 0' }}
          />
        )}
      </Card>
    </div>
  );
};

const BannerDrawer = ({
  open,
  editing,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editing: BannerItem | null;
  onClose: () => void;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
}) => {
  const [form] = Form.useForm();
  const jumpType = Form.useWatch('jump_type', form);

  useEffect(() => {
    if (!open) return;

    // 使用setTimeout确保Drawer和Form完全挂载
    const timer = setTimeout(() => {
      if (editing) {
        const values: Record<string, unknown> = {
          title: editing.title ?? '',
          image_url: editing.image_url ?? '',
          position: editing.position ?? 'home_top',
          sort_order: editing.sort_order ?? 0,
          jump_type: editing.jump_type || undefined,
          jump_target: editing.jump_target || undefined,
          start_time: editing.start_time ? dayjs(editing.start_time) : null,
          end_time: editing.end_time ? dayjs(editing.end_time) : null,
        };
        form.resetFields();
        form.setFieldsValue(values);
      } else {
        form.resetFields();
        form.setFieldsValue({
          position: 'home_top',
          sort_order: 0,
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [open, editing, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values);
    } catch {
      return;
    }
  };

  return (
    <Drawer
      title={editing ? '编辑 Banner' : '新建 Banner'}
      open={open}
      onClose={onClose}
      width={680}
      extra={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit}>
          {editing ? '保存' : '保存并发布'}
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" key={editing?.id ?? 'empty'}>
        <Card title="基础信息" variant="borderless" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="title"
                label="Banner 名称"
                rules={[{ required: true, max: 20, message: '请输入 Banner 名称(≤20字)' }]}
              >
                <Input placeholder="请输入 Banner 名称(≤20字)" maxLength={20} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="position"
                label="投放位置"
                rules={[{ required: true, message: '请选择投放位置' }]}
              >
                <Select options={POSITION_OPTIONS} placeholder="选择投放位置" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sort_order" label="排序权重">
                <InputNumber min={0} max={999} style={{ width: '100%' }} placeholder="数值越小越靠前" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card
          title="封面图片"
          variant="borderless"
          extra={<Text type="secondary">建议尺寸 750×350px,≤500KB</Text>}
          style={{ marginBottom: 16 }}
        >
          <Form.Item
            name="image_url"
            rules={[{ required: true, message: '请上传封面图片' }]}
            valuePropName="value"
          >
            <ImageUploader />
          </Form.Item>
        </Card>

        <Card title="跳转配置" variant="borderless" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="jump_type" label="跳转类型">
                <Select
                  placeholder="选择跳转类型"
                  allowClear
                  onChange={() => {
                    form.setFieldsValue({ jump_target: undefined });
                  }}
                  options={[
                    { label: '赛事详情', value: 'race' },
                    { label: '拍卖场次', value: 'auction' },
                    { label: 'NFT资产', value: 'nft' },
                    { label: '基因档案', value: 'gene' },
                    { label: '外部链接', value: 'external' },
                    { label: 'APP页面', value: 'page' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item 
                name="jump_target" 
                label="跳转目标"
              >
                <JumpTargetSelect jumpType={jumpType} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="投放规则" variant="borderless" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="start_time" label="开始时间">
                <DatePicker showTime placeholder="选择开始时间" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="end_time" label="结束时间">
                <DatePicker showTime placeholder="选择结束时间" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      </Form>
    </Drawer>
  );
};

interface JumpTargetSelectProps {
  jumpType: string | undefined;
  value?: string;
  onChange?: (value: string | undefined) => void;
}

const JumpTargetSelect: React.FC<JumpTargetSelectProps> = ({ jumpType, value, onChange }) => {
  const [options, setOptions] = useState<{ label: string; value: string; extra?: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!jumpType || !DYNAMIC_JUMP_TYPES.includes(jumpType)) {
      setOptions([]);
      return;
    }

    const config = jumpApiConfig[jumpType];
    if (!config) return;

    setLoading(true);
    config.loader()
      .then((data) => {
        const mapped = data.map((item) => {
          const label = item[config.labelKey] || `#${item[config.valueKey]}`;
          const extra = config.extraKeys
            ? config.extraKeys
                .map((key) => {
                  const val = item[key];
                  if (val === null || val === undefined) return null;
                  if (key === 'start_time' || key === 'end_time') {
                    return dayjs(val).format('YYYY-MM-DD');
                  }
                  if (key === 'status') {
                    const statusMap: Record<string, string> = {
                      draft: '草稿', enrolling: '报名中', gathering: '集鸽中',
                      racing: '比赛中', finished: '已结束', archived: '已归档',
                      pending: '待开始', ongoing: '进行中', ended: '已结束',
                      approved: '已审核', minted: '已铸造',
                    };
                    return statusMap[val] || val;
                  }
                  return val;
                })
                .filter(Boolean)
                .join(' · ')
            : '';
          return {
            label: `${label}${extra ? ` (${extra})` : ''}`,
            value: String(item[config.valueKey]),
            extra,
          };
        });
        setOptions(mapped);
      })
      .catch(() => {
        setOptions([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [jumpType]);

  if (jumpType && DYNAMIC_JUMP_TYPES.includes(jumpType)) {
    return (
      <Select
        showSearch
        loading={loading}
        value={value}
        placeholder={loading ? '加载中...' : '选择跳转目标'}
        optionFilterProp="label"
        onChange={(v) => onChange?.(v)}
        options={options}
        notFoundContent={loading ? '加载中...' : '暂无数据'}
        style={{ width: '100%' }}
      />
    );
  }

  return (
    <Input
      value={value}
      placeholder={jumpType === 'external' ? '请输入外部链接URL' : '请输入APP页面路径'}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
};

const BannerPreview = ({
  record,
  onClose,
  allBanners,
}: {
  record: BannerItem | null;
  onClose: () => void;
  allBanners?: BannerItem[];
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<any>(null);

  const position = record?.position || 'home_top';

  const previewBanners = useMemo(() => {
    if (!record) return [];
    if (allBanners && allBanners.length > 0) {
      const positionBanners = allBanners.filter(
        (b) => b.status === 1 && b.image_url && b.position === position
      );
      if (positionBanners.length > 0) return positionBanners;
    }
    return [record];
  }, [record, allBanners, position]);

  const topBanners = useMemo(() => {
    if (allBanners && allBanners.length > 0) {
      return allBanners.filter(
        (b) => b.status === 1 && b.image_url && b.position === 'home_top'
      );
    }
    return [];
  }, [allBanners]);

  useEffect(() => {
    if (record && allBanners) {
      const idx = previewBanners.findIndex((b) => b.id === record.id);
      if (idx >= 0) setCurrentIndex(idx);
    }
  }, [record, allBanners, previewBanners]);

  const handleCarouselChange = (index: number) => {
    setCurrentIndex(index);
  };

  const renderBannerImage = (banner: BannerItem, height: number) => (
    <div
      style={{
        width: '100%',
        height,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        background: '#f0f0f0',
      }}
    >
      {banner.image_url ? (
        <img
          src={banner.image_url}
          alt={banner.title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 16,
          }}
        >
          {banner.title}
        </div>
      )}
      {banner.title && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '24px 16px 12px',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {banner.title}
        </div>
      )}
    </div>
  );

  const renderCarousel = (banners: BannerItem[], height: number) => (
    <Carousel
      ref={carouselRef}
      autoplay={banners.length > 1}
      autoplaySpeed={3000}
      effect="scrollx"
      dotPosition="bottom"
      className="banner-carousel"
      beforeChange={handleCarouselChange}
      style={{ borderRadius: 12, overflow: 'hidden' }}
    >
      {banners.map((banner, index) => (
        <div key={banner.id || index}>{renderBannerImage(banner, height)}</div>
      ))}
    </Carousel>
  );

  const renderIndicators = (banners: BannerItem[]) =>
    banners.length > 1 ? (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 6,
          marginTop: 12,
        }}
      >
        {banners.map((_, index) => (
          <div
            key={index}
            style={{
              width: currentIndex === index ? 20 : 6,
              height: 6,
              borderRadius: 3,
              background: currentIndex === index ? '#1677ff' : '#ddd',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            }}
            onClick={() => {
              setCurrentIndex(index);
              carouselRef.current?.goTo(index);
            }}
          />
        ))}
      </div>
    ) : null;

  return (
    <Modal
      title={`Banner 预览 - ${POSITION_LABEL[position] || '未知位置'}`}
      open={!!record}
      onCancel={onClose}
      footer={[<Button key="close" onClick={onClose}>关闭</Button>]}
      width={420}
      styles={{ body: { padding: '16px 8px' } }}
    >
      <div
        style={{
          width: 320,
          height: 640,
          border: '10px solid #1a1a1a',
          borderRadius: 40,
          overflow: 'hidden',
          margin: '0 auto',
          background: '#f8f9fa',
          position: 'relative',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* iPhone刘海屏 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 120,
            height: 24,
            background: '#1a1a1a',
            borderRadius: '0 0 16px 16px',
            zIndex: 100,
          }}
        />

        {/* 状态栏 */}
        <div
          style={{
            background: position === 'home_top' ? '#1677ff' : '#fff',
            color: position === 'home_top' ? '#fff' : '#333',
            padding: '12px 16px 8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 13,
            fontWeight: 600,
            paddingTop: 36,
          }}
        >
          <span>9:41</span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 14 }}>📶</span>
            <span style={{ fontSize: 12 }}>5G</span>
            <span style={{ fontSize: 14 }}>🔋</span>
          </div>
        </div>

        {/* APP内容区域 */}
        <div style={{ flex: 1, overflow: 'auto', paddingBottom: 60 }}>
          {position === 'home_top' && (
            <>
              {/* 顶部导航和搜索 */}
              <div style={{ background: '#1677ff', padding: '8px 16px 12px' }}>
                <div
                  style={{
                    background: 'rgba(255,255,255,0.95)',
                    borderRadius: 20,
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: '#999',
                  }}
                >
                  <span>🔍</span>
                  <span>搜索鸽舍、赛事、品种...</span>
                </div>
              </div>

              {/* Banner轮播 - 顶部位置 */}
              <div style={{ padding: '12px 12px 0' }}>
                {renderCarousel(previewBanners, 150)}
                {renderIndicators(previewBanners)}
              </div>

              {/* 快捷入口 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 8,
                  padding: '16px 12px',
                }}
              >
                {[
                  { icon: '🏆', label: '赛事', color: '#ff6b6b' },
                  { icon: '🐦', label: '鸽舍', color: '#4ecdc4' },
                  { icon: '💰', label: '拍卖', color: '#ffe66d' },
                  { icon: '📊', label: '基因', color: '#a8e6cf' },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: `${item.color}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                      }}
                    >
                      {item.icon}
                    </div>
                    <span style={{ fontSize: 11, color: '#666' }}>{item.label}</span>
                  </div>
                ))}
              </div>

              {/* 推荐内容 */}
              <div style={{ padding: '0 12px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 14, color: '#333' }}>
                    热门推荐
                  </span>
                  <span style={{ fontSize: 12, color: '#999' }}>查看更多 ›</span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8,
                  }}
                >
                  {[
                    { title: '2026秋季大赛', img: '🏆', desc: '报名进行中' },
                    { title: '鸽王拍卖专场', img: '💰', desc: '明日开拍' },
                  ].map((item) => (
                    <div
                      key={item.title}
                      style={{
                        background: '#fff',
                        borderRadius: 8,
                        padding: 12,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: 60,
                          borderRadius: 6,
                          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 28,
                          marginBottom: 8,
                        }}
                      >
                        {item.img}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#333' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
                        {item.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {position === 'home_mid' && (
            <>
              {/* 顶部导航 */}
              <div style={{ background: '#fff', padding: '0 16px 12px' }}>
                <div
                  style={{
                    background: '#f5f5f5',
                    borderRadius: 20,
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: '#999',
                  }}
                >
                  <span>🔍</span>
                  <span>搜索鸽舍、赛事、品种...</span>
                </div>
              </div>

              {/* 顶部Banner轮播区 */}
              <div style={{ padding: '0 12px' }}>
                {topBanners.length > 0 ? (
                  renderCarousel(topBanners.slice(0, 1), 120)
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: 120,
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 14,
                    }}
                  >
                    顶部 Banner 位
                  </div>
                )}
              </div>

              {/* 快捷入口 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 8,
                  padding: '16px 12px',
                }}
              >
                {[
                  { icon: '🏆', label: '赛事' },
                  { icon: '🐦', label: '鸽舍' },
                  { icon: '💰', label: '拍卖' },
                  { icon: '📊', label: '基因' },
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: '#f0f5ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                      }}
                    >
                      {item.icon}
                    </div>
                    <span style={{ fontSize: 11, color: '#666' }}>{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Banner轮播 - 中部位置 */}
              <div style={{ padding: '8px 12px 0' }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#333',
                    marginBottom: 12,
                    paddingLeft: 4,
                  }}
                >
                  🔥 精选推荐
                </div>
                {renderCarousel(previewBanners, 140)}
                {renderIndicators(previewBanners)}
              </div>

              {/* 底部内容 */}
              <div style={{ padding: '16px 12px 0' }}>
                <div
                  style={{
                    background: '#fff',
                    borderRadius: 12,
                    padding: 16,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 8 }}>
                    🐦 今日热门
                  </div>
                  <div style={{ fontSize: 12, color: '#666', lineHeight: 1.8 }}>
                    • 2026秋季大奖赛报名开启<br />
                    • 基因检测服务全新上线<br />
                    • 鸽王拍卖专场即将开拍
                  </div>
                </div>
              </div>
            </>
          )}

          {position === 'home_bottom' && (
            <>
              {/* 顶部导航和搜索 */}
              <div style={{ background: '#fff', padding: '0 16px 12px' }}>
                <div
                  style={{
                    background: '#f5f5f5',
                    borderRadius: 20,
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: '#999',
                  }}
                >
                  <span>🔍</span>
                  <span>搜索鸽舍、赛事、品种...</span>
                </div>
              </div>

              {/* 顶部Banner */}
              <div style={{ padding: '0 12px' }}>
                {topBanners.length > 0 ? (
                  <div
                    style={{
                      width: '100%',
                      height: 100,
                      borderRadius: 12,
                      overflow: 'hidden',
                      background: '#f0f0f0',
                    }}
                  >
                    {topBanners[0].image_url ? (
                      <img
                        src={topBanners[0].image_url}
                        alt={topBanners[0].title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: 14,
                        }}
                      >
                        {topBanners[0].title}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: 100,
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 14,
                    }}
                  >
                    顶部 Banner 位
                  </div>
                )}
              </div>

              {/* 快捷入口 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 8,
                  padding: '16px 12px',
                }}
              >
                {[
                  { icon: '🏆', label: '赛事' },
                  { icon: '🐦', label: '鸽舍' },
                  { icon: '💰', label: '拍卖' },
                  { icon: '📊', label: '基因' },
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: '#f0f5ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                      }}
                    >
                      {item.icon}
                    </div>
                    <span style={{ fontSize: 11, color: '#666' }}>{item.label}</span>
                  </div>
                ))}
              </div>

              {/* 推荐内容 */}
              <div style={{ padding: '0 12px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 14, color: '#333' }}>
                    推荐内容
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { title: '春季大赛', img: '🏆', desc: '报名中' },
                    { title: '鸽王拍卖', img: '💰', desc: '即将开拍' },
                  ].map((item) => (
                    <div
                      key={item.title}
                      style={{
                        background: '#fff',
                        borderRadius: 8,
                        padding: 10,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: 50,
                          borderRadius: 6,
                          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 24,
                          marginBottom: 6,
                        }}
                      >
                        {item.img}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#333' }}>
                        {item.title}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Banner - 底部位置 */}
              <div style={{ padding: '12px 12px 0' }}>
                {previewBanners.length > 1 && (
                  <div
                    style={{
                      fontSize: 12,
                      color: '#999',
                      marginBottom: 8,
                      paddingLeft: 4,
                    }}
                  >
                    📢 最新公告
                  </div>
                )}
                {previewBanners.length > 1 && renderCarousel(previewBanners, 80)}
                {previewBanners.length > 1 && renderIndicators(previewBanners)}
              </div>
            </>
          )}
        </div>

        {/* 底部Tab导航 */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: '#fff',
            borderTop: '1px solid #eee',
            paddingBottom: 20,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
              padding: '6px 0',
            }}
          >
            {[
              { icon: '🏠', label: '首页', active: true },
              { icon: '📋', label: '赛事', active: false },
              { icon: '➕', label: '', isCenter: true },
              { icon: '🔔', label: '消息', active: false },
              { icon: '👤', label: '我的', active: false },
            ].map((item, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  ...(item.isCenter ? { position: 'relative' } : {}),
                }}
              >
                {item.isCenter ? (
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #1677ff 0%, #4096ff 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      color: '#fff',
                      marginTop: -16,
                      boxShadow: '0 4px 12px rgba(22,119,255,0.4)',
                    }}
                  >
                    {item.icon}
                  </div>
                ) : (
                  <>
                    <span style={{ fontSize: 16, opacity: item.active ? 1 : 0.5 }}>
                      {item.icon}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: item.active ? '#1677ff' : '#999',
                      }}
                    >
                      {item.label}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Home Indicator */}
        <div
          style={{
            position: 'absolute',
            bottom: 4,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 120,
            height: 4,
            background: '#1a1a1a',
            borderRadius: 2,
            zIndex: 101,
          }}
        />
      </div>

      {/* 预览信息 */}
      <div
        style={{
          textAlign: 'center',
          marginTop: 12,
          fontSize: 12,
          color: '#666',
        }}
      >
        <div style={{ marginBottom: 4 }}>
          当前位置：<span style={{ color: '#1677ff', fontWeight: 500 }}>{POSITION_LABEL[position] || position}</span>
        </div>
        <div>
          {previewBanners.length > 1
            ? `自动轮播中 · 共 ${previewBanners.length} 条同位置Banner`
            : '单Banner预览模式'}
        </div>
      </div>

      <style>{`
        .banner-carousel .slick-dots {
          bottom: -24px;
        }
        .banner-carousel .slick-dots li button {
          width: 6px;
          height: 6px;
          border-radius: 3px;
          background: #ddd;
          opacity: 1;
        }
        .banner-carousel .slick-dots li.slick-active button {
          background: #1677ff;
          width: 20px;
        }
        .banner-carousel .slick-track {
          display: flex !important;
        }
      `}</style>
    </Modal>
  );
};

const ContentBanner = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canEdit = hasPermission(currentUser, 'content:edit');

  const [stats, setStats] = useState<BannerStats | null>(null);
  const [tableState, setTableState] = useState<TableState>({ list: [], total: 0, loading: false });

  const [filterTitle, setFilterTitle] = useState<string | undefined>(undefined);
  const [filterPosition, setFilterPosition] = useState<string | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);

  const [appliedFilter, setAppliedFilter] = useState<FilterState>({});
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editing, setEditing] = useState<BannerItem | null>(null);
  const [previewRecord, setPreviewRecord] = useState<BannerItem | null>(null);

  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [dragInsertPosition, setDragInsertPosition] = useState<'top' | 'bottom' | null>(null);
  const tableWrapperRef = useRef<HTMLDivElement>(null);

  const loadStats = useCallback(async () => {
    try {
      const data = await getBannerStats();
      setStats(data);
    } catch {
      // handled by interceptor
    }
  }, []);

  const loadList = useCallback(
    async (page: number, pageSize: number, currentFilter: FilterState) => {
      setTableState((prev) => ({ ...prev, loading: true }));
      try {
        const res = await getBannerList({
          page,
          pageSize,
          title: currentFilter.title || undefined,
          position: currentFilter.position || undefined,
          status: currentFilter.status || undefined,
        });
        setTableState({ list: res?.list ?? [], total: res?.total ?? 0, loading: false });
      } catch {
        setTableState({ list: [], total: 0, loading: false });
        message.error('加载列表失败');
      }
    },
    [message],
  );

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadList(pagination.current, pagination.pageSize, appliedFilter);
  }, [pagination.current, pagination.pageSize, appliedFilter, loadList]);

  const handleSearch = () => {
    const newFilter: FilterState = {
      title: filterTitle || undefined,
      position: filterPosition || undefined,
      status: filterStatus || undefined,
    };
    setAppliedFilter(newFilter);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleReset = () => {
    setFilterTitle(undefined);
    setFilterPosition(undefined);
    setFilterStatus(undefined);
    setAppliedFilter({});
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleRefresh = () => {
    loadStats();
    loadList(pagination.current, pagination.pageSize, appliedFilter);
  };

  const openCreate = () => {
    setEditing(null);
    setDrawerVisible(true);
  };

  const openEdit = (record: BannerItem) => {
    setEditing(record);
    setDrawerVisible(true);
  };

  const openPreview = (record: BannerItem) => {
    setPreviewRecord(record);
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    const startTime = values.start_time ? (values.start_time as Dayjs).valueOf() : null;
    const endTime = values.end_time ? (values.end_time as Dayjs).valueOf() : null;

    const payload = {
      title: values.title as string,
      image_url: values.image_url as string,
      position: (values.position as string) ?? 'home_top',
      sort_order: (values.sort_order as number) ?? 0,
      jump_type: (values.jump_type as string) || undefined,
      jump_target: (values.jump_target as string) || undefined,
      link_url: (values.jump_target as string) ?? '',
      start_time: startTime,
      end_time: endTime,
      status: editing ? editing.status : 1,
    };

    try {
      if (editing) {
        await updateBanner(editing.id, payload);
        message.success('更新成功');
      } else {
        await createBanner(payload);
        message.success('新增成功');
      }
      setDrawerVisible(false);
      loadStats();
      loadList(pagination.current, pagination.pageSize, appliedFilter);
    } catch {
      // handled by interceptor
    }
  };

  const handleToggleStatus = async (record: BannerItem, online: boolean) => {
    try {
      await updateBannerStatus(record.id, online ? 1 : 0);
      message.success(online ? '已上架' : '已下架');
      loadStats();
      loadList(pagination.current, pagination.pageSize, appliedFilter);
    } catch {
      // handled by interceptor
    }
  };

  const handleSortChange = async (record: BannerItem, value: number | null) => {
    if (value === null || value === record.sort_order) return;
    try {
      await updateBannerSort(record.id, value);
      message.success('排序已更新');
      loadList(pagination.current, pagination.pageSize, appliedFilter);
    } catch {
      // handled by interceptor
    }
  };

  const handleDelete = async (record: BannerItem) => {
    try {
      await deleteBanner(record.id);
      message.success('删除成功');
      loadStats();
      loadList(pagination.current, pagination.pageSize, appliedFilter);
    } catch {
      // handled by interceptor
    }
  };

  const handleDragStart = (e: React.DragEvent, record: BannerItem) => {
    setDraggedId(record.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(record.id));
  };

  const handleDragOver = (e: React.DragEvent, record: BannerItem) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const isTopHalf = e.clientY < rect.top + rect.height / 2;
    setDragOverId(record.id);
    setDragInsertPosition(isTopHalf ? 'top' : 'bottom');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const related = e.relatedTarget as HTMLElement | null;
    if (related && tableWrapperRef.current?.contains(related)) {
      return;
    }
    setDragOverId(null);
    setDragInsertPosition(null);
  };

  const handleDrop = async (e: React.DragEvent, targetRecord: BannerItem) => {
    e.preventDefault();
    if (draggedId === null || draggedId === targetRecord.id) {
      setDraggedId(null);
      setDragOverId(null);
      setDragInsertPosition(null);
      return;
    }

    const newList = [...tableState.list];
    const draggedIndex = newList.findIndex((r) => r.id === draggedId);
    if (draggedIndex === -1) return;

    const [draggedItem] = newList.splice(draggedIndex, 1);
    let targetIndex = newList.findIndex((r) => r.id === targetRecord.id);
    if (targetIndex === -1) return;

    if (dragInsertPosition === 'bottom') {
      targetIndex += 1;
    }
    newList.splice(targetIndex, 0, draggedItem);

    const updatedList = newList.map((item, idx) => ({ ...item, sort_order: idx }));
    setTableState((prev) => ({ ...prev, list: updatedList }));

    setDraggedId(null);
    setDragOverId(null);
    setDragInsertPosition(null);

    try {
      const sortedPairs = updatedList.map((item, idx) => ({ id: item.id, sort_order: idx }));
      await Promise.all(sortedPairs.map((p) => updateBannerSort(p.id, p.sort_order)));
      message.success('排序已更新');
    } catch {
      message.error('排序保存失败');
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
    setDragInsertPosition(null);
  };

  const columns: ColumnsType<BannerItem> = [
    ...(canEdit
      ? [
          {
            title: '',
            key: 'drag',
            width: 40,
            render: (_: unknown, record: BannerItem) => (
              <Tooltip title="拖拽排序">
                <span
                  draggable
                  onDragStart={(e) => handleDragStart(e, record)}
                  onDragEnd={handleDragEnd}
                  style={{
                    cursor: 'grab',
                    fontSize: 18,
                    color: draggedId === record.id ? '#1677ff' : '#bfbfbf',
                    userSelect: 'none',
                    display: 'inline-block',
                    padding: '4px 0',
                  }}
                >
                  ⋮⋮
                </span>
              </Tooltip>
            ),
          },
        ]
      : []),
    {
      title: '缩略图',
      dataIndex: 'image_url',
      width: 140,
      render: (_, record) =>
        record.image_url ? (
          <Image
            width={120}
            height={50}
            src={record.image_url}
            fallback=""
            style={{ objectFit: 'cover', borderRadius: 4 }}
          />
        ) : (
          <Tag>无图片</Tag>
        ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      width: 180,
      ellipsis: true,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: '位置',
      dataIndex: 'position',
      width: 110,
      render: (_, record) => (
        <Tag color="blue">{POSITION_LABEL[record.position] ?? record.position}</Tag>
      ),
    },
    {
      title: '投放时间',
      width: 220,
      render: (_, record) => {
        if (!record.start_time && !record.end_time) return <Tag>永久</Tag>;
        return (
          <span style={{ fontSize: 12, color: '#888' }}>
            {record.start_time ? dayjs(record.start_time).format('YYYY-MM-DD HH:mm') : '-'}
            {' ~ '}
            {record.end_time ? dayjs(record.end_time).format('YYYY-MM-DD HH:mm') : '-'}
          </span>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (_, record) => {
        const s = calcBannerStatus(record);
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: '曝光/点击',
      width: 120,
      render: (_, record) =>
        record.impressions && record.impressions > 0 ? (
          <div>
            <div style={{ fontSize: 12, color: '#888' }}>
              曝光 {(record.impressions / 1000).toFixed(1)}K
            </div>
            <div style={{ fontSize: 12, color: '#888' }}>点击 {record.clicks ?? 0}</div>
          </div>
        ) : (
          <Tag>暂无数据</Tag>
        ),
    },
    canEdit
      ? {
          title: '排序',
          dataIndex: 'sort_order',
          width: 100,
          render: (_, record) => (
            <InputNumber
              size="small"
              min={0}
              defaultValue={record.sort_order}
              onBlur={(e) => {
                const v = Number((e.target as HTMLInputElement).value);
                if (Number.isFinite(v)) handleSortChange(record, v);
              }}
              style={{ width: 72 }}
            />
          ),
        }
      : {
          title: '排序',
          dataIndex: 'sort_order',
          width: 80,
        },
    {
      title: '操作',
      key: 'action',
      width: canEdit ? 280 : 120,
      fixed: 'right',
      render: (_, record) => {
        const s = calcBannerStatus(record);
        return (
          <Space size={4}>
            {canEdit && (
              <Button type="link" size="small" onClick={() => openEdit(record)}>
                编辑
              </Button>
            )}
            <Button type="link" size="small" onClick={() => openPreview(record)}>
              预览
            </Button>
            {canEdit && s.type === 'active' ? (
              <Popconfirm title="确认下架?" onConfirm={() => handleToggleStatus(record, false)}>
                <Button type="link" size="small">
                  下架
                </Button>
              </Popconfirm>
            ) : null}
            {canEdit && (s.type === 'pending' || s.type === 'expired') ? (
              <Popconfirm title="确认发布?" onConfirm={() => handleToggleStatus(record, true)}>
                <Button type="link" size="small">
                  发布
                </Button>
              </Popconfirm>
            ) : null}
            {canEdit && (
              <Popconfirm title="确认删除该 Banner?" onConfirm={() => handleDelete(record)}>
                <Button type="link" size="small" danger>
                  删除
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <style>{`
        .banner-row-dragging {
          opacity: 0.5;
          background: #e6f4ff !important;
        }
        .banner-row-drag-over {
          position: relative;
        }
        .banner-row-drag-over-top::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: #1677ff;
          border-radius: 2px;
        }
        .banner-row-drag-over-bottom::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: #1677ff;
          border-radius: 2px;
        }
      `}</style>

      <Typography.Title level={4} style={{ marginBottom: 16 }}>
        Banner 管理
      </Typography.Title>

      <BannerDashboard stats={stats} />

      <Card style={{ marginBottom: 16 }}>
        <Space wrap size={[8, 8]}>
          <Input
            placeholder="搜索 Banner 名称"
            allowClear
            style={{ width: 220 }}
            value={filterTitle}
            onChange={(e) => setFilterTitle(e.target.value || undefined)}
          />
          <Select
            placeholder="位置"
            allowClear
            style={{ width: 140 }}
            options={POSITION_OPTIONS}
            value={filterPosition}
            onChange={(v) => setFilterPosition(v as string | undefined)}
          />
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 140 }}
            options={STATUS_OPTIONS}
            value={filterStatus}
            onChange={(v) => setFilterStatus(v as string | undefined)}
          />
          <Button onClick={handleReset}>重置</Button>
          <Button type="primary" onClick={handleSearch}>
            查询
          </Button>
          {canEdit && (
            <Button type="primary" ghost onClick={openCreate}>
              + 新建
            </Button>
          )}
          <Button onClick={handleRefresh}>刷新</Button>
        </Space>
      </Card>

      <Card>
        <div ref={tableWrapperRef}>
          <Table<BannerItem>
            rowKey="id"
            columns={columns}
            dataSource={tableState.list}
            loading={tableState.loading}
            scroll={{ x: 1280 }}
            rowClassName={(record) => {
              const classes: string[] = [];
              if (draggedId === record.id) {
                classes.push('banner-row-dragging');
              }
              if (dragOverId === record.id && draggedId !== record.id) {
                classes.push('banner-row-drag-over');
                classes.push(
                  dragInsertPosition === 'top'
                    ? 'banner-row-drag-over-top'
                    : 'banner-row-drag-over-bottom',
                );
              }
              return classes.join(' ');
            }}
            onRow={(record) => ({
              onDragOver: (e) => handleDragOver(e, record),
              onDragLeave: handleDragLeave,
              onDrop: canEdit ? (e) => handleDrop(e, record) : undefined,
            })}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: tableState.total,
              showSizeChanger: true,
              showQuickJumper: true,
              pageSizeOptions: [10, 20, 50, 100],
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, pageSize) => {
                setPagination({ current: page, pageSize });
              },
            }}
          />
        </div>
      </Card>

      <BannerDrawer
        open={drawerVisible}
        editing={editing}
        onClose={() => setDrawerVisible(false)}
        onSubmit={handleSubmit}
      />

      <BannerPreview record={previewRecord} onClose={() => setPreviewRecord(null)} allBanners={tableState.list} />
    </div>
  );
};

export default ContentBanner;