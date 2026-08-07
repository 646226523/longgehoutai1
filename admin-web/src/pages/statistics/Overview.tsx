// 数据统计中心 - 数据看板
// 顶部指标卡片 + 近 N 天新增趋势表 + 分布表(基因品种/用户等级)+ 排行榜(鸽主/拍卖成交额)
// 注:@ant-design/charts 未安装,所有可视化用 Card + Statistic + Table 兜底展示
import { PageContainer } from '@ant-design/pro-components';
import { Card, Col, Row, Segmented, Spin, Statistic, Table } from 'antd';
import type { TableColumnsType } from 'antd';
import { useEffect, useState } from 'react';
import {
  getGeneStat,
  getOverviewStat,
  getTradeStat,
  getTrendStat,
  getUserStat,
  TREND_METRICS,
  type AuctionTopItem,
  type GeneStat,
  type LevelCount,
  type NameValue,
  type OverviewStat,
  type OwnerCount,
  type TradeStat,
  type TrendData,
  type TrendRow,
  type UserStat,
} from '../../services/statistics';

// 时间范围筛选选项
const RANGE_OPTIONS = [
  { label: '近 7 天', value: 7 },
  { label: '近 30 天', value: 30 },
  { label: '近 90 天', value: 90 },
];

// 卡片配置项
interface CardItem {
  title: string;
  value: number;
  precision?: number;
  prefix?: string;
}

const StatisticsOverview = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [range, setRange] = useState<number>(30);
  const [overview, setOverview] = useState<OverviewStat | null>(null);
  const [gene, setGene] = useState<GeneStat | null>(null);
  const [user, setUser] = useState<UserStat | null>(null);
  const [trade, setTrade] = useState<TradeStat | null>(null);
  const [trend, setTrend] = useState<TrendData | null>(null);

  // 加载总览 + 各维度数据(不随时间范围变化)
  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([getOverviewStat(), getGeneStat(), getUserStat(), getTradeStat()])
      .then(([o, g, u, t]) => {
        if (!active) return;
        setOverview(o);
        setGene(g);
        setUser(u);
        setTrade(t);
      })
      .catch(() => {
        // 响应拦截器已统一提示错误
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // 趋势数据随时间范围变化重新加载
  useEffect(() => {
    let active = true;
    getTrendStat(range)
      .then((d) => {
        if (active) setTrend(d);
      })
      .catch(() => {
        // 响应拦截器已统一提示错误
      });
    return () => {
      active = false;
    };
  }, [range]);

  // 顶部指标卡片
  const cards: CardItem[] = overview
    ? [
        { title: '基因档案总数', value: overview.gene_profiles },
        { title: 'NFT 资产数', value: overview.nft_assets },
        { title: '赛事数', value: overview.competitions },
        { title: '用户数', value: overview.users },
        { title: '检测报告数', value: overview.detection_reports },
        { title: '拍卖成交额', value: overview.auction_total_amount, precision: 2, prefix: '¥' },
        { title: '仲裁案件数', value: overview.arbitration_cases },
        { title: '公棚数', value: overview.lofts },
      ]
    : [];

  // 趋势表列(根据 TREND_METRICS 动态生成)
  const trendColumns: TableColumnsType<TrendRow> = [
    { title: '日期', dataIndex: 'date', width: 120, fixed: 'left' },
    ...TREND_METRICS.map((m) => ({
      title: m.label,
      dataIndex: m.key,
      width: 110,
      align: 'right' as const,
    })),
  ];

  // 基因品种分布列
  const breedColumns: TableColumnsType<NameValue> = [
    { title: '品种', dataIndex: 'name', ellipsis: true },
    { title: '档案数', dataIndex: 'value', align: 'right', width: 100 },
  ];

  // 会员等级分布列
  const levelColumns: TableColumnsType<LevelCount> = [
    { title: '会员等级', dataIndex: 'level_name', ellipsis: true },
    { title: '用户数', dataIndex: 'count', align: 'right', width: 100 },
  ];

  // 鸽主档案数 Top10 列
  const ownerColumns: TableColumnsType<OwnerCount> = [
    { title: '排名', key: 'rank', width: 60, align: 'center', render: (_v, _r, i) => i + 1 },
    { title: '鸽主', dataIndex: 'owner_name', ellipsis: true },
    { title: '档案数', dataIndex: 'count', align: 'right', width: 100 },
  ];

  // 拍卖成交额 Top10 列
  const auctionColumns: TableColumnsType<AuctionTopItem> = [
    { title: '排名', key: 'rank', width: 60, align: 'center', render: (_v, _r, i) => i + 1 },
    { title: '成交方', dataIndex: 'name', ellipsis: true },
    {
      title: '成交额',
      dataIndex: 'amount',
      align: 'right',
      width: 130,
      render: (v) => '¥' + Number(v).toFixed(2),
    },
    { title: '笔数', dataIndex: 'count', align: 'right', width: 80 },
  ];

  return (
    <PageContainer header={{ title: '数据看板', breadcrumb: {} }}>
      <Spin spinning={loading}>
        {/* 时间范围筛选器 */}
        <Card style={{ marginBottom: 16 }}>
          <Segmented options={RANGE_OPTIONS} value={range} onChange={(v) => setRange(v as number)} />
          <span style={{ marginLeft: 16, color: '#888' }}>
            时间范围仅影响下方「新增趋势」表格数据
          </span>
        </Card>

        {/* 顶部指标卡片 */}
        <Row gutter={[16, 16]}>
          {cards.map((c) => (
            <Col key={c.title} xs={12} sm={12} md={6}>
              <Card>
                <Statistic title={c.title} value={c.value} precision={c.precision} prefix={c.prefix} />
              </Card>
            </Col>
          ))}
        </Row>

        {/* 近 N 天新增趋势 */}
        <Card title={`近 ${range} 天新增趋势`} style={{ marginTop: 16 }}>
          <Table<TrendRow>
            columns={trendColumns}
            dataSource={trend?.rows ?? []}
            rowKey="date"
            size="small"
            scroll={{ x: 700 }}
            pagination={{ pageSize: 10, showSizeChanger: false }}
          />
        </Card>

        {/* 分布表 */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} md={12}>
            <Card title="基因档案按品种分布">
              <Table<NameValue>
                columns={breedColumns}
                dataSource={gene?.breed_distribution ?? []}
                rowKey="name"
                size="small"
                pagination={{ pageSize: 8, showSizeChanger: false }}
              />
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="用户会员等级分布">
              <Table<LevelCount>
                columns={levelColumns}
                dataSource={user?.level_distribution ?? []}
                rowKey="level_name"
                size="small"
                pagination={{ pageSize: 8, showSizeChanger: false }}
              />
            </Card>
          </Col>
        </Row>

        {/* 排行榜 */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} md={12}>
            <Card title="鸽主档案数 Top10">
              <Table<OwnerCount>
                columns={ownerColumns}
                dataSource={gene?.owner_top10 ?? []}
                rowKey="owner_name"
                size="small"
                pagination={false}
              />
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="拍卖成交额 Top10">
              <Table<AuctionTopItem>
                columns={auctionColumns}
                dataSource={trade?.auction_deal_top10 ?? []}
                rowKey="name"
                size="small"
                pagination={false}
              />
            </Card>
          </Col>
        </Row>
      </Spin>
    </PageContainer>
  );
};

export default StatisticsOverview;
