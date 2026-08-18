import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as echarts from 'echarts';
import ReactECharts from 'echarts-for-react';
import { Tabs, Tag, Progress, Button, Space, Tooltip, Modal } from 'antd';
import {
  TrophyOutlined,
  RiseOutlined,
  TeamOutlined,
  FireOutlined,
  ThunderboltOutlined,
  CloudOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  ReloadOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  ApartmentOutlined,
  EnvironmentOutlined,
  SendOutlined,
  FlagOutlined,
  ClockCircleOutlined,
  FundOutlined,
  StockOutlined,
  AimOutlined,
  SafetyCertificateOutlined,
  ShareAltOutlined,
  DownloadOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import pigeonPhoto0 from './pigeon-photo-0.jpg';
import pigeonPhoto1 from './pigeon-photo-1.jpg';
import pigeonPhoto2 from './pigeon-photo-2.jpg';
import pigeonPhoto3 from './pigeon-photo-3.jpg';
import pigeonPhoto4 from './pigeon-photo-4.jpg';
import pigeonPhoto5 from './pigeon-photo-5.jpg';

const pigeonPhotos = [pigeonPhoto0, pigeonPhoto1, pigeonPhoto2, pigeonPhoto3, pigeonPhoto4, pigeonPhoto5];

interface LoftCity {
  name: string;
  value: [number, number, number];
}

interface AuctionItem {
  id: number;
  name: string;
  currentPrice: number;
  bidCount: number;
  image: string;
  seller: string;
  startTime: string;
  endTime: string;
  deposit: number;
  startingBid: number;
  topBidder: string;
  status: 'bidding' | 'upcoming' | 'ended';
  heat: number;
  remainingDays?: number;
  province?: string;
}

interface RaceItem {
  id: number;
  name: string;
  progress: number;
  returnedCount: number;
  totalCount: number;
  status: string;
  location?: string;
  club?: string;
  pigeonCount?: number;
  provinces?: string[];
  distance?: number;
  startTime?: string;
  estimatedReturnTime?: string;
  organizer?: string;
  level?: string;
  points?: number;
  participants?: number;
  routeType?: string;
}

interface FlightData {
  id: string;
  ringNumber: string;
  currentPosition: string;
  speed: number;
  altitude: number;
  status: 'flying' | 'returning' | 'returned';
  etaMinutes?: number;
  isAnomaly?: boolean;
  breed?: string;
  age?: string;
  gender?: '雄' | '雌';
  owner?: string;
  loft?: string;
  startTime?: string;
  distance?: number;
  coord?: [number, number];
  photo?: string;
}

interface CityDetail {
  name: string;
  lofts: number;
  online: number;
  pigeons: number;
  races: number;
}

interface ProvinceDetailData {
  name: string;
  lofts: number;
  online: number;
  pigeons: number;
  races: number;
  cities: CityDetail[];
}

type MapMode = 'nodes' | 'trails';

const COLORS = {
  bgPrimary: '#0a1128',
  bgCard: '#1a2332',
  border: '#2a3a5a',
  textPrimary: '#ffffff',
  textSecondary: '#8ba3c7',
  accentCyan: '#00d4ff',
  accentGold: '#ffcc00',
  flying: '#52c41a',
  returning: '#1890ff',
  returned: '#8c8c8c',
};

const genTime = (offsetHours: number) =>
  dayjs().add(offsetHours, 'hour').format('YYYY-MM-DD HH:mm');

const loftCities: LoftCity[] = [
  { name: '北京', value: [116.4, 39.9, 120] },
  { name: '上海', value: [121.47, 31.23, 95] },
  { name: '广州', value: [113.27, 23.13, 88] },
  { name: '成都', value: [104.07, 30.67, 76] },
  { name: '西安', value: [108.95, 34.27, 65] },
  { name: '杭州', value: [120.15, 30.28, 82] },
  { name: '武汉', value: [114.31, 30.52, 58] },
  { name: '南京', value: [118.78, 32.04, 52] },
  { name: '重庆', value: [106.54, 29.59, 70] },
  { name: '天津', value: [117.2, 39.13, 48] },
  { name: '深圳', value: [114.05, 22.54, 75] },
  { name: '青岛', value: [120.38, 36.07, 42] },
  { name: '大连', value: [121.62, 38.92, 38] },
  { name: '厦门', value: [118.1, 24.46, 35] },
  { name: '昆明', value: [102.73, 25.04, 45] },
  { name: '哈尔滨', value: [126.63, 45.75, 33] },
  { name: '乌鲁木齐', value: [87.62, 43.82, 40] },
  { name: '拉萨', value: [91.11, 29.97, 28] },
];

const provinceTop10 = [
  { name: '广东省', value: 186 },
  { name: '北京市', value: 152 },
  { name: '上海市', value: 138 },
  { name: '浙江省', value: 124 },
  { name: '江苏省', value: 112 },
  { name: '四川省', value: 98 },
  { name: '山东省', value: 87 },
  { name: '湖北省', value: 76 },
  { name: '福建省', value: 68 },
  { name: '陕西省', value: 54 },
];

const provinceData: Record<string, { lofts: number; online: number; pigeons: number; races: number }> = {
  广东省: { lofts: 186, online: 142, pigeons: 8500, races: 12 },
  北京市: { lofts: 152, online: 128, pigeons: 6200, races: 10 },
  上海市: { lofts: 138, online: 115, pigeons: 5800, races: 9 },
  浙江省: { lofts: 124, online: 98, pigeons: 5200, races: 8 },
  江苏省: { lofts: 112, online: 89, pigeons: 4800, races: 7 },
  四川省: { lofts: 98, online: 76, pigeons: 4100, races: 6 },
  山东省: { lofts: 87, online: 68, pigeons: 3600, races: 5 },
  湖北省: { lofts: 76, online: 58, pigeons: 3200, races: 5 },
  福建省: { lofts: 68, online: 52, pigeons: 2800, races: 4 },
  陕西省: { lofts: 54, online: 42, pigeons: 2300, races: 4 },
};

const cityLevelData: Record<string, CityDetail[]> = {
  广东省: [
    { name: '广州', lofts: 52, online: 42, pigeons: 2400, races: 4 },
    { name: '深圳', lofts: 48, online: 38, pigeons: 2100, races: 3 },
    { name: '东莞', lofts: 28, online: 22, pigeons: 1200, races: 2 },
    { name: '佛山', lofts: 26, online: 20, pigeons: 1100, races: 2 },
    { name: '珠海', lofts: 18, online: 14, pigeons: 800, races: 1 },
    { name: '汕头', lofts: 14, online: 6, pigeons: 500, races: 0 },
  ],
  北京市: [
    { name: '北京', lofts: 152, online: 128, pigeons: 6200, races: 10 },
  ],
  天津市: [
    { name: '天津', lofts: 48, online: 38, pigeons: 2000, races: 3 },
  ],
  上海市: [
    { name: '上海', lofts: 138, online: 115, pigeons: 5800, races: 9 },
  ],
  重庆市: [
    { name: '重庆', lofts: 70, online: 54, pigeons: 3200, races: 5 },
  ],
  浙江省: [
    { name: '杭州', lofts: 42, online: 34, pigeons: 1900, races: 3 },
    { name: '宁波', lofts: 28, online: 22, pigeons: 1200, races: 2 },
    { name: '温州', lofts: 22, online: 18, pigeons: 900, races: 1 },
    { name: '嘉兴', lofts: 18, online: 14, pigeons: 800, races: 1 },
    { name: '绍兴', lofts: 14, online: 10, pigeons: 400, races: 1 },
  ],
  江苏省: [
    { name: '南京', lofts: 38, online: 30, pigeons: 1700, races: 3 },
    { name: '苏州', lofts: 32, online: 26, pigeons: 1400, races: 2 },
    { name: '无锡', lofts: 22, online: 18, pigeons: 1000, races: 1 },
    { name: '常州', lofts: 12, online: 8, pigeons: 500, races: 1 },
    { name: '徐州', lofts: 8, online: 7, pigeons: 200, races: 0 },
  ],
  四川省: [
    { name: '成都', lofts: 48, online: 38, pigeons: 2000, races: 3 },
    { name: '绵阳', lofts: 18, online: 14, pigeons: 700, races: 1 },
    { name: '德阳', lofts: 14, online: 10, pigeons: 600, races: 1 },
    { name: '乐山', lofts: 10, online: 8, pigeons: 400, races: 1 },
    { name: '自贡', lofts: 8, online: 6, pigeons: 400, races: 0 },
  ],
  山东省: [
    { name: '青岛', lofts: 32, online: 24, pigeons: 1400, races: 2 },
    { name: '济南', lofts: 26, online: 20, pigeons: 1100, races: 2 },
    { name: '烟台', lofts: 14, online: 12, pigeons: 600, races: 1 },
    { name: '潍坊', lofts: 10, online: 8, pigeons: 300, races: 0 },
    { name: '淄博', lofts: 5, online: 4, pigeons: 200, races: 0 },
  ],
  湖北省: [
    { name: '武汉', lofts: 58, online: 44, pigeons: 2400, races: 4 },
    { name: '宜昌', lofts: 10, online: 8, pigeons: 400, races: 1 },
    { name: '襄阳', lofts: 8, online: 6, pigeons: 300, races: 0 },
  ],
  福建省: [
    { name: '厦门', lofts: 35, online: 28, pigeons: 1600, races: 2 },
    { name: '福州', lofts: 20, online: 16, pigeons: 800, races: 1 },
    { name: '泉州', lofts: 13, online: 8, pigeons: 400, races: 1 },
  ],
  陕西省: [
    { name: '西安', lofts: 42, online: 34, pigeons: 1800, races: 3 },
    { name: '宝鸡', lofts: 12, online: 8, pigeons: 500, races: 1 },
  ],
  辽宁省: [
    { name: '大连', lofts: 38, online: 30, pigeons: 1800, races: 2 },
    { name: '沈阳', lofts: 26, online: 20, pigeons: 1100, races: 2 },
    { name: '鞍山', lofts: 14, online: 10, pigeons: 600, races: 1 },
  ],
  云南省: [
    { name: '昆明', lofts: 45, online: 36, pigeons: 2000, races: 3 },
    { name: '大理', lofts: 8, online: 6, pigeons: 300, races: 0 },
  ],
  黑龙江省: [
    { name: '哈尔滨', lofts: 33, online: 26, pigeons: 1500, races: 2 },
    { name: '大庆', lofts: 10, online: 8, pigeons: 400, races: 0 },
  ],
  河南省: [
    { name: '郑州', lofts: 28, online: 22, pigeons: 1200, races: 2 },
    { name: '洛阳', lofts: 14, online: 10, pigeons: 600, races: 1 },
  ],
  安徽省: [
    { name: '合肥', lofts: 22, online: 18, pigeons: 1000, races: 1 },
    { name: '芜湖', lofts: 8, online: 6, pigeons: 300, races: 0 },
  ],
  湖南省: [
    { name: '长沙', lofts: 18, online: 14, pigeons: 800, races: 1 },
    { name: '株洲', lofts: 6, online: 5, pigeons: 200, races: 0 },
  ],
  江西省: [
    { name: '南昌', lofts: 14, online: 10, pigeons: 600, races: 1 },
    { name: '九江', lofts: 6, online: 4, pigeons: 200, races: 0 },
  ],
  山西省: [
    { name: '太原', lofts: 12, online: 8, pigeons: 500, races: 1 },
    { name: '大同', lofts: 5, online: 4, pigeons: 200, races: 0 },
  ],
  广西壮族自治区: [
    { name: '南宁', lofts: 10, online: 8, pigeons: 400, races: 0 },
    { name: '桂林', lofts: 6, online: 4, pigeons: 200, races: 0 },
  ],
  海南省: [
    { name: '海口', lofts: 8, online: 6, pigeons: 300, races: 0 },
    { name: '三亚', lofts: 4, online: 3, pigeons: 100, races: 0 },
  ],
  贵州省: [
    { name: '贵阳', lofts: 8, online: 6, pigeons: 300, races: 0 },
  ],
  甘肃省: [
    { name: '兰州', lofts: 10, online: 8, pigeons: 400, races: 1 },
    { name: '天水', lofts: 4, online: 3, pigeons: 100, races: 0 },
  ],
  宁夏回族自治区: [
    { name: '银川', lofts: 6, online: 4, pigeons: 200, races: 0 },
  ],
  青海省: [
    { name: '西宁', lofts: 4, online: 3, pigeons: 100, races: 0 },
  ],
  新疆维吾尔自治区: [
    { name: '乌鲁木齐', lofts: 40, online: 32, pigeons: 1800, races: 2 },
    { name: '喀什', lofts: 6, online: 4, pigeons: 200, races: 0 },
  ],
  西藏自治区: [
    { name: '拉萨', lofts: 28, online: 22, pigeons: 1200, races: 1 },
  ],
  内蒙古自治区: [
    { name: '呼和浩特', lofts: 8, online: 6, pigeons: 300, races: 0 },
    { name: '包头', lofts: 4, online: 3, pigeons: 100, races: 0 },
  ],
};

const cityToProvince: Record<string, string> = {
  北京: '北京市', 天津: '天津市', 上海: '上海市', 重庆: '重庆市',
  广州: '广东省', 深圳: '广东省', 厦门: '福建省', 杭州: '浙江省',
  南京: '江苏省', 武汉: '湖北省', 成都: '四川省', 西安: '陕西省',
  青岛: '山东省', 大连: '辽宁省', 昆明: '云南省', 哈尔滨: '黑龙江省',
  乌鲁木齐: '新疆维吾尔自治区', 拉萨: '西藏自治区',
  济南: '山东省', 郑州: '河南省', 合肥: '安徽省', 长沙: '湖南省',
  沈阳: '辽宁省', 兰州: '甘肃省', 福州: '福建省', 南昌: '江西省',
  太原: '山西省', 南宁: '广西壮族自治区', 海口: '海南省', 贵阳: '贵州省',
  银川: '宁夏回族自治区', 西宁: '青海省', 呼和浩特: '内蒙古自治区',
  东莞: '广东省', 佛山: '广东省', 珠海: '广东省', 汕头: '广东省',
  宁波: '浙江省', 温州: '浙江省', 嘉兴: '浙江省', 绍兴: '浙江省', 台州: '浙江省',
  苏州: '江苏省', 无锡: '江苏省', 常州: '江苏省', 徐州: '江苏省', 淮安: '江苏省',
  绵阳: '四川省', 德阳: '四川省', 乐山: '四川省', 自贡: '四川省',
  烟台: '山东省', 潍坊: '山东省', 淄博: '山东省', 泰安: '山东省', 菏泽: '山东省', 济宁: '山东省',
  宜昌: '湖北省', 襄阳: '湖北省', 荆州: '湖北省',
  泉州: '福建省', 南平: '福建省',
  宝鸡: '陕西省',
  鞍山: '辽宁省', 长春: '吉林省', 吉林: '吉林省', 大庆: '黑龙江省',
  大理: '云南省', 丽江: '云南省',
  洛阳: '河南省', 开封: '河南省',
  芜湖: '安徽省',
  株洲: '湖南省',
  九江: '江西省', 赣州: '江西省',
  大同: '山西省',
  桂林: '广西壮族自治区',
  三亚: '海南省',
  遵义: '贵州省',
  天水: '甘肃省', 敦煌: '甘肃省',
  格尔木: '青海省',
  喀什: '新疆维吾尔自治区', 中卫: '宁夏回族自治区', 包头: '内蒙古自治区',
  林芝: '西藏自治区',
  石家庄: '河北省', 张家口: '河北省', 保定: '河北省',
  香港: '香港特别行政区', 澳门: '澳门特别行政区', 台湾: '台湾省',
};

const auctionTrendData = [
  { date: '08-11', value: 128.5 },
  { date: '08-12', value: 156.2 },
  { date: '08-13', value: 142.8 },
  { date: '08-14', value: 198.6 },
  { date: '08-15', value: 175.3 },
  { date: '08-16', value: 234.1 },
  { date: '08-17', value: 289.7 },
];

const mockAuctions: AuctionItem[] = [
  { id: 1, name: '2026 春季高端鸽王专场', currentPrice: 68000, bidCount: 156, image: '🏆', seller: '北京鸽王俱乐部', startTime: genTime(-24), endTime: genTime(48), deposit: 5000, startingBid: 50000, topBidder: '北京-001', status: 'bidding', heat: 4, remainingDays: 2, province: '北京市' },
  { id: 2, name: '云南高原种鸽拍卖会', currentPrice: 32000, bidCount: 89, image: '🕊️', seller: '云南高原鸽舍', startTime: genTime(-12), endTime: genTime(60), deposit: 3000, startingBid: 20000, topBidder: '昆明-088', status: 'bidding', heat: 3, remainingDays: 3, province: '云南省' },
  { id: 3, name: '北京老品种鸽精品展', currentPrice: 125000, bidCount: 234, image: '👑', seller: '北京老品种鸽协', startTime: genTime(-48), endTime: genTime(24), deposit: 10000, startingBid: 80000, topBidder: '北京-127', status: 'bidding', heat: 5, remainingDays: 1, province: '北京市' },
  { id: 4, name: '上海长距离赛事专场', currentPrice: 45000, bidCount: 67, image: '🌟', seller: '上海长距离鸽会', startTime: genTime(-6), endTime: genTime(72), deposit: 4000, startingBid: 30000, topBidder: '上海-056', status: 'bidding', heat: 3, remainingDays: 3, province: '上海市' },
  { id: 5, name: '成都地方特色鸽拍卖会', currentPrice: 18000, bidCount: 42, image: '🎯', seller: '成都蜀翔鸽舍', startTime: genTime(-36), endTime: genTime(12), deposit: 2000, startingBid: 12000, topBidder: '成都-033', status: 'bidding', heat: 2, remainingDays: 1, province: '四川省' },
  { id: 6, name: '广州国际赛鸽交流专场', currentPrice: 88000, bidCount: 178, image: '💎', seller: '广州国际鸽协', startTime: genTime(-18), endTime: genTime(54), deposit: 8000, startingBid: 60000, topBidder: '广州-201', status: 'bidding', heat: 4, remainingDays: 2, province: '广东省' },
  { id: 7, name: '西安古都赛鸽精品展', currentPrice: 56000, bidCount: 93, image: '🏅', seller: '西安古都鸽会', startTime: genTime(-30), endTime: genTime(36), deposit: 5000, startingBid: 38000, topBidder: '西安-077', status: 'bidding', heat: 3, remainingDays: 2, province: '陕西省' },
  { id: 8, name: '杭州西湖鸽友联谊专场', currentPrice: 24000, bidCount: 51, image: '🎨', seller: '杭州西湖鸽友会', startTime: genTime(-6), endTime: genTime(66), deposit: 2000, startingBid: 15000, topBidder: '杭州-042', status: 'bidding', heat: 2, remainingDays: 3, province: '浙江省' },
  { id: 9, name: '深圳南山鸽王争霸赛', currentPrice: 92000, bidCount: 0, image: '🚀', seller: '深圳南山鸽协', startTime: genTime(2), endTime: genTime(98), deposit: 8000, startingBid: 70000, topBidder: '-', status: 'upcoming', heat: 4, remainingDays: 5, province: '广东省' },
  { id: 10, name: '青岛黄海精品鸽展', currentPrice: 41000, bidCount: 72, image: '🌊', seller: '青岛黄海鸽舍', startTime: genTime(-10), endTime: genTime(38), deposit: 4000, startingBid: 28000, topBidder: '青岛-065', status: 'bidding', heat: 3, remainingDays: 2, province: '山东省' },
  { id: 11, name: '哈尔滨冰雪赛鸽邀请赛', currentPrice: 36000, bidCount: 0, image: '❄️', seller: '哈尔滨冰雪鸽会', startTime: genTime(12), endTime: genTime(108), deposit: 3000, startingBid: 25000, topBidder: '-', status: 'upcoming', heat: 2, remainingDays: 6, province: '黑龙江省' },
  { id: 12, name: '厦门海峡两岸鸽展', currentPrice: 158000, bidCount: 312, image: '🏵️', seller: '厦门海峡鸽协', startTime: genTime(-72), endTime: genTime(-2), deposit: 12000, startingBid: 100000, topBidder: '厦门-099', status: 'ended', heat: 5, remainingDays: 0, province: '福建省' },
].sort((a, b) => b.currentPrice - a.currentPrice) as AuctionItem[];

const mockRaces: RaceItem[] = [
  { id: 1, name: '2026 春季千公里国家赛', progress: 78, returnedCount: 1856, totalCount: 2380, status: '进行中', location: '北京→上海', club: '中国信鸽协会', pigeonCount: 2380, provinces: ['北京市', '上海市'] },
  { id: 2, name: '华东地区 500 公里联赛', progress: 92, returnedCount: 2140, totalCount: 2326, status: '即将结束', location: '杭州→南京', club: '华东信鸽联盟', pigeonCount: 2326, provinces: ['浙江省', '江苏省'] },
  { id: 3, name: '华北 300 公里幼鸽赛', progress: 45, returnedCount: 680, totalCount: 1512, status: '进行中', location: '天津→北京', club: '华北幼鸽俱乐部', pigeonCount: 1512, provinces: ['天津市', '北京市'] },
  { id: 4, name: '西南高原挑战赛', progress: 60, returnedCount: 920, totalCount: 1534, status: '进行中', location: '昆明→成都', club: '西南高原鸽协', pigeonCount: 1534, provinces: ['云南省', '四川省'] },
  { id: 5, name: '东北长途 700 公里经典赛', progress: 30, returnedCount: 420, totalCount: 1400, status: '进行中', location: '哈尔滨→沈阳', club: '东北信鸽联合会', pigeonCount: 1400, provinces: ['黑龙江省', '辽宁省'] },
  { id: 6, name: '华南 400 公里精英赛', progress: 85, returnedCount: 1120, totalCount: 1318, status: '即将结束', location: '广州→深圳', club: '华南精英鸽会', pigeonCount: 1318, provinces: ['广东省'] },
  { id: 7, name: '西北 600 公里挑战赛', progress: 22, returnedCount: 310, totalCount: 1420, status: '进行中', location: '西安→兰州', club: '西北信鸽联盟', pigeonCount: 1420, provinces: ['陕西省', '甘肃省'] },
  { id: 8, name: '粤东地区 300 公里联赛', progress: 55, returnedCount: 480, totalCount: 872, status: '进行中', location: '汕头→广州', club: '粤东鸽友会', pigeonCount: 872, provinces: ['广东省'] },
  { id: 9, name: '粤港澳跨海挑战赛', progress: 40, returnedCount: 320, totalCount: 780, status: '进行中', location: '香港→澳门', club: '粤港澳鸽协', pigeonCount: 780, provinces: ['广东省', '香港特别行政区', '澳门特别行政区'] },
  { id: 10, name: '广深城际 200 公里赛', progress: 88, returnedCount: 620, totalCount: 705, status: '即将结束', location: '广州→深圳', club: '广深鸽友联盟', pigeonCount: 705, provinces: ['广东省'] },
  { id: 11, name: '珠江三角洲 500 公里公开赛', progress: 65, returnedCount: 890, totalCount: 1370, status: '进行中', location: '珠海→佛山', club: '珠三角鸽协', pigeonCount: 1370, provinces: ['广东省'] },
  { id: 12, name: '闽南地区 350 公里联赛', progress: 72, returnedCount: 540, totalCount: 750, status: '进行中', location: '厦门→泉州', club: '闽南鸽友联合会', pigeonCount: 750, provinces: ['福建省'] },
  { id: 13, name: '闽北山区挑战赛', progress: 28, returnedCount: 180, totalCount: 640, status: '进行中', location: '福州→南平', club: '福建山地鸽协', pigeonCount: 640, provinces: ['福建省'] },
  { id: 14, name: '海峡两岸 600 公里友谊赛', progress: 50, returnedCount: 420, totalCount: 840, status: '进行中', location: '厦门→台湾', club: '海峡鸽协', pigeonCount: 840, provinces: ['福建省', '台湾省'] },
  { id: 15, name: '胶东半岛 500 公里赛', progress: 62, returnedCount: 510, totalCount: 820, status: '进行中', location: '青岛→烟台', club: '山东半岛鸽协', pigeonCount: 820, provinces: ['山东省'] },
  { id: 16, name: '济南千佛山挑战赛', progress: 35, returnedCount: 280, totalCount: 800, status: '进行中', location: '济南→泰安', club: '济南鸽友会', pigeonCount: 800, provinces: ['山东省'] },
  { id: 17, name: '鲁西南 400 公里联赛', progress: 78, returnedCount: 560, totalCount: 720, status: '即将结束', location: '菏泽→济宁', club: '鲁南鸽协', pigeonCount: 720, provinces: ['山东省'] },
  { id: 18, name: '郑州古都赛鸽 300 公里赛', progress: 48, returnedCount: 320, totalCount: 670, status: '进行中', location: '郑州→开封', club: '郑州鸽友会', pigeonCount: 670, provinces: ['河南省'] },
  { id: 19, name: '中原地区 500 公里锦标赛', progress: 55, returnedCount: 410, totalCount: 745, status: '进行中', location: '洛阳→郑州', club: '中原鸽协', pigeonCount: 745, provinces: ['河南省'] },
  { id: 20, name: '江汉平原 400 公里公开赛', progress: 68, returnedCount: 520, totalCount: 765, status: '进行中', location: '武汉→荆州', club: '湖北鸽友联盟', pigeonCount: 765, provinces: ['湖北省'] },
  { id: 21, name: '楚天 600 公里挑战赛', progress: 42, returnedCount: 310, totalCount: 738, status: '进行中', location: '武汉→宜昌', club: '楚天鸽协', pigeonCount: 738, provinces: ['湖北省'] },
  { id: 22, name: '长株潭 300 公里联赛', progress: 58, returnedCount: 420, totalCount: 724, status: '进行中', location: '长沙→株洲', club: '湖南鸽友会', pigeonCount: 724, provinces: ['湖南省'] },
  { id: 23, name: '赣鄱大地 500 公里赛', progress: 44, returnedCount: 320, totalCount: 726, status: '进行中', location: '南昌→赣州', club: '江西鸽协', pigeonCount: 726, provinces: ['江西省'] },
  { id: 24, name: '皖江 400 公里公开赛', progress: 75, returnedCount: 530, totalCount: 706, status: '即将结束', location: '合肥→芜湖', club: '安徽鸽友联盟', pigeonCount: 706, provinces: ['安徽省'] },
  { id: 25, name: '京津冀 500 公里对抗赛', progress: 68, returnedCount: 1200, totalCount: 1765, status: '进行中', location: '北京→天津', club: '京津冀鸽协', pigeonCount: 1765, provinces: ['北京市', '天津市', '河北省'] },
  { id: 26, name: '保定古城 300 公里赛', progress: 52, returnedCount: 380, totalCount: 730, status: '进行中', location: '保定→石家庄', club: '河北鸽友会', pigeonCount: 730, provinces: ['河北省'] },
  { id: 27, name: '燕赵 600 公里挑战赛', progress: 38, returnedCount: 270, totalCount: 710, status: '进行中', location: '石家庄→张家口', club: '燕赵鸽协', pigeonCount: 710, provinces: ['河北省'] },
  { id: 28, name: '蒙古高原 700 公里穿越赛', progress: 25, returnedCount: 150, totalCount: 600, status: '进行中', location: '呼和浩特→包头', club: '内蒙古鸽协', pigeonCount: 600, provinces: ['内蒙古自治区'] },
  { id: 29, name: '松辽平原 400 公里赛', progress: 56, returnedCount: 400, totalCount: 714, status: '进行中', location: '长春→吉林', club: '吉林鸽友会', pigeonCount: 714, provinces: ['吉林省'] },
  { id: 30, name: '长白山 500 公里挑战赛', progress: 32, returnedCount: 230, totalCount: 718, status: '进行中', location: '沈阳→长春', club: '东北山地鸽协', pigeonCount: 718, provinces: ['辽宁省', '吉林省'] },
  { id: 31, name: '春城 300 公里公开赛', progress: 72, returnedCount: 540, totalCount: 750, status: '进行中', location: '昆明→大理', club: '云南鸽友会', pigeonCount: 750, provinces: ['云南省'] },
  { id: 32, name: '金沙江峡谷挑战赛', progress: 28, returnedCount: 190, totalCount: 678, status: '进行中', location: '昆明→丽江', club: '云南高原鸽协', pigeonCount: 678, provinces: ['云南省'] },
  { id: 33, name: '蓉城 400 公里联赛', progress: 65, returnedCount: 480, totalCount: 738, status: '进行中', location: '成都→绵阳', club: '四川鸽友会', pigeonCount: 738, provinces: ['四川省'] },
  { id: 34, name: '天府之国 600 公里公开赛', progress: 48, returnedCount: 350, totalCount: 729, status: '进行中', location: '成都→德阳', club: '四川天府鸽协', pigeonCount: 729, provinces: ['四川省'] },
  { id: 35, name: '山城 500 公里挑战赛', progress: 58, returnedCount: 420, totalCount: 724, status: '进行中', location: '重庆→贵阳', club: '重庆鸽友会', pigeonCount: 724, provinces: ['重庆市', '贵州省'] },
  { id: 36, name: '贵阳山城 300 公里赛', progress: 42, returnedCount: 280, totalCount: 667, status: '进行中', location: '贵阳→遵义', club: '贵州鸽协', pigeonCount: 667, provinces: ['贵州省'] },
  { id: 37, name: '南岭 400 公里挑战赛', progress: 55, returnedCount: 390, totalCount: 709, status: '进行中', location: '广州→南宁', club: '两广鸽友联盟', pigeonCount: 709, provinces: ['广东省', '广西壮族自治区'] },
  { id: 38, name: '南宁绿城 300 公里赛', progress: 38, returnedCount: 260, totalCount: 684, status: '进行中', location: '南宁→桂林', club: '广西鸽协', pigeonCount: 684, provinces: ['广西壮族自治区'] },
  { id: 39, name: '椰风岛 200 公里公开赛', progress: 70, returnedCount: 420, totalCount: 600, status: '即将结束', location: '海口→三亚', club: '海南鸽友会', pigeonCount: 600, provinces: ['海南省'] },
  { id: 40, name: '丝路古道 800 公里挑战赛', progress: 18, returnedCount: 120, totalCount: 670, status: '进行中', location: '西安→乌鲁木齐', club: '丝路鸽协', pigeonCount: 670, provinces: ['陕西省', '甘肃省', '新疆维吾尔自治区'] },
  { id: 41, name: '金城 300 公里公开赛', progress: 62, returnedCount: 430, totalCount: 694, status: '进行中', location: '兰州→天水', club: '甘肃鸽友会', pigeonCount: 694, provinces: ['甘肃省'] },
  { id: 42, name: '敦煌 500 公里挑战赛', progress: 22, returnedCount: 150, totalCount: 682, status: '进行中', location: '兰州→敦煌', club: '西北边疆鸽协', pigeonCount: 682, provinces: ['甘肃省'] },
  { id: 43, name: '青海湖 400 公里赛', progress: 45, returnedCount: 310, totalCount: 689, status: '进行中', location: '西宁→格尔木', club: '青海鸽协', pigeonCount: 689, provinces: ['青海省'] },
  { id: 44, name: '天山天池 600 公里赛', progress: 30, returnedCount: 210, totalCount: 700, status: '进行中', location: '乌鲁木齐→喀什', club: '新疆鸽友会', pigeonCount: 700, provinces: ['新疆维吾尔自治区'] },
  { id: 45, name: '雪域高原 800 公里挑战赛', progress: 15, returnedCount: 80, totalCount: 533, status: '进行中', location: '拉萨→林芝', club: '西藏鸽协', pigeonCount: 533, provinces: ['西藏自治区'] },
  { id: 46, name: '塞上江南 300 公里赛', progress: 58, returnedCount: 380, totalCount: 655, status: '进行中', location: '银川→中卫', club: '宁夏鸽友会', pigeonCount: 655, provinces: ['宁夏回族自治区'] },
  { id: 47, name: '杭嘉湖 300 公里联赛', progress: 82, returnedCount: 610, totalCount: 744, status: '即将结束', location: '杭州→嘉兴', club: '浙江鸽友会', pigeonCount: 744, provinces: ['浙江省'] },
  { id: 48, name: '雁荡山挑战赛', progress: 48, returnedCount: 340, totalCount: 708, status: '进行中', location: '温州→台州', club: '浙南鸽协', pigeonCount: 708, provinces: ['浙江省'] },
  { id: 49, name: '苏锡常 400 公里公开赛', progress: 75, returnedCount: 560, totalCount: 747, status: '即将结束', location: '苏州→无锡', club: '江苏鸽友联盟', pigeonCount: 747, provinces: ['江苏省'] },
  { id: 50, name: '淮海战役纪念赛', progress: 35, returnedCount: 240, totalCount: 686, status: '进行中', location: '徐州→淮安', club: '苏北鸽协', pigeonCount: 686, provinces: ['江苏省'] },
];

const cityPositions: Record<string, [number, number]> = {
  北京: [116.4, 39.9],
  上海: [121.47, 31.23],
  广州: [113.27, 23.13],
  成都: [104.07, 30.67],
  西安: [108.95, 34.27],
  杭州: [120.15, 30.28],
  武汉: [114.31, 30.52],
  南京: [118.78, 32.04],
  重庆: [106.54, 29.59],
  天津: [117.2, 39.13],
  深圳: [114.05, 22.54],
  青岛: [120.38, 36.07],
  大连: [121.62, 38.92],
  厦门: [118.1, 24.46],
  昆明: [102.73, 25.04],
  哈尔滨: [126.63, 45.75],
  乌鲁木齐: [87.62, 43.82],
  拉萨: [91.11, 29.97],
  济南: [117.0, 36.65],
  郑州: [113.62, 34.75],
  合肥: [117.27, 31.86],
  长沙: [112.98, 28.19],
  沈阳: [123.43, 41.81],
  兰州: [103.83, 36.06],
  福州: [119.3, 26.08],
  南昌: [115.89, 28.68],
  太原: [112.55, 37.87],
  南宁: [108.37, 22.82],
  海口: [110.33, 20.03],
  贵阳: [106.71, 26.57],
  银川: [106.23, 38.48],
  西宁: [101.78, 36.62],
  呼和浩特: [111.75, 40.84],
  东莞: [113.75, 23.05],
  佛山: [113.12, 23.02],
  珠海: [113.58, 22.27],
  汕头: [116.68, 23.35],
  宁波: [121.55, 29.87],
  温州: [120.7, 28.0],
  嘉兴: [120.76, 30.77],
  绍兴: [120.58, 30.0],
  苏州: [120.58, 31.3],
  无锡: [120.31, 31.49],
  常州: [119.95, 31.79],
  徐州: [117.18, 34.26],
  淮安: [119.02, 33.6],
  绵阳: [104.73, 31.48],
  德阳: [104.4, 31.13],
  乐山: [103.77, 29.55],
  自贡: [104.77, 29.35],
  烟台: [121.39, 37.52],
  潍坊: [119.1, 36.62],
  淄博: [118.05, 36.81],
  泰安: [117.08, 36.19],
  宜昌: [111.29, 30.69],
  襄阳: [112.14, 32.01],
  荆州: [112.24, 30.33],
  泉州: [118.58, 24.93],
  南平: [118.18, 26.64],
  宝鸡: [107.24, 34.36],
  鞍山: [122.99, 41.11],
  长春: [125.32, 43.82],
  吉林: [126.55, 43.84],
  大理: [100.23, 25.59],
  丽江: [100.23, 26.87],
  大庆: [125.03, 46.97],
  洛阳: [112.45, 34.62],
  开封: [114.35, 34.79],
  芜湖: [118.38, 31.35],
  株洲: [113.13, 27.83],
  九江: [115.99, 29.71],
  赣州: [114.94, 25.85],
  大同: [113.3, 40.08],
  桂林: [110.29, 25.27],
  三亚: [109.51, 18.25],
  遵义: [106.9, 27.7],
  天水: [105.72, 34.58],
  敦煌: [94.67, 40.14],
  格尔木: [94.9, 36.42],
  喀什: [75.99, 39.47],
  包头: [109.84, 40.66],
  中卫: [105.19, 37.52],
  林芝: [94.36, 29.65],
  台州: [121.42, 28.66],
  石家庄: [114.51, 38.04],
  张家口: [114.88, 40.82],
  保定: [115.46, 38.87],
  菏泽: [115.48, 35.23],
  济宁: [116.58, 35.42],
  香港: [114.17, 22.32],
  澳门: [113.54, 22.19],
  台湾: [121.5, 23.5],
};

const flightStatuses: FlightData['status'][] = ['flying', 'returning', 'returned'];

function generateFlightData(): FlightData[] {
  const rings = [
    'CHN-2026-001234', 'CHN-2026-002567', 'CHN-2026-003891',
    'CHN-2026-004523', 'CHN-2026-005678', 'CHN-2026-006234',
    'CHN-2026-007345', 'CHN-2026-008456', 'CHN-2026-009567',
    'CHN-2026-010678',
  ];
  const positions = [
    '北京上空', '天津上空', '济南上空', '郑州上空', '合肥上空',
    '南京上空', '杭州上空', '武汉上空', '长沙上空', '广州上空',
  ];
  const cityCoords: Record<string, [number, number]> = {
    '北京上空': [116.4, 39.9], '天津上空': [117.2, 39.13],
    '济南上空': [117.0, 36.65], '郑州上空': [113.62, 34.75],
    '合肥上空': [117.28, 31.86], '南京上空': [118.78, 32.04],
    '杭州上空': [120.15, 30.28], '武汉上空': [114.31, 30.52],
    '长沙上空': [112.98, 28.19], '广州上空': [113.27, 23.13],
  };
  const breeds = ['雨点', '灰', '花', '绛', '白', '黑'];
  const lofts = ['北京蓝天公棚', '天津海河鸽舍', '济南泉城鸽业', '郑州古都公棚', '合肥皖江鸽舍', '南京金陵鸽业', '杭州西湖公棚', '武汉楚天鸽舍', '长沙湘江鸽业', '广州南粤公棚'];
  const owners = ['张伟', '李强', '王芳', '刘洋', '陈静', '赵鹏', '孙丽', '周杰', '吴敏', '郑伟'];
  const result: FlightData[] = rings.map((ring, i) => ({
    id: `flight-${i}`,
    ringNumber: ring,
    currentPosition: positions[i],
    coord: cityCoords[positions[i]],
    speed: Math.round(40 + Math.random() * 60),
    altitude: Math.round(100 + Math.random() * 400),
    status: flightStatuses[i % 3],
    etaMinutes: Math.round(15 + Math.random() * 120),
    isAnomaly: false,
    breed: breeds[i % breeds.length],
    age: `${1 + (i % 3)} 岁`,
    gender: i % 2 === 0 ? '雄' : '雌',
    owner: owners[i],
    loft: lofts[i],
    startTime: dayjs().subtract(2 + i, 'hour').format('YYYY-MM-DD HH:mm'),
    distance: 300 + i * 40,
    photo: pigeonPhotos[i % pigeonPhotos.length],
  }));
  const anomalyIndex = result.findIndex((r) => r.ringNumber === 'CHN-2026-002567');
  if (anomalyIndex >= 0) {
    result[anomalyIndex].isAnomaly = true;
    result[anomalyIndex].speed = 18;
    result[anomalyIndex].etaMinutes = 999;
  }
  return result;
}

const statusLabelMap: Record<FlightData['status'], string> = {
  flying: '飞行中',
  returning: '归巢中',
  returned: '已归巢',
};

const MetricCard = ({
  title, value, unit, change, trend, progress, progressLabel, icon, color, extra,
}: {
  title: string; value: number; unit: string; change: number;
  trend?: number[]; progress?: number; progressLabel?: string;
  icon: React.ReactNode; color: string; extra?: React.ReactNode;
}) => {
  const isUp = change >= 0;
  const sparkOption = trend && trend.length > 0 ? {
    grid: { left: 0, right: 0, top: 2, bottom: 2 },
    xAxis: { type: 'category', show: false, data: trend.map((_, i) => i) },
    yAxis: { type: 'value', show: false },
    series: [{
      type: 'line', data: trend, showSymbol: false, smooth: true,
      lineStyle: { color: color, width: 2 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: color + '60' },
          { offset: 1, color: color + '05' },
        ]),
      },
    }],
  } : null;
  return (
    <div style={{
      background: `linear-gradient(135deg, ${COLORS.bgCard} 0%, #151d2d 100%)`,
      border: `1px solid ${COLORS.border}`, borderRadius: 6,
      padding: '10px 12px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
      }} />
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6, background: `${color}20`,
          color, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, marginRight: 8,
        }}>{icon}</div>
        <span style={{ color: COLORS.textSecondary, fontSize: 12 }}>{title}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: COLORS.textPrimary, textShadow: `0 0 12px ${color}60` }}>
          {value.toLocaleString()}
        </span>
        <span style={{ color: COLORS.textSecondary, fontSize: 11, marginLeft: 4 }}>{unit}</span>
      </div>
      <div style={{ fontSize: 11, color: isUp ? COLORS.accentCyan : '#ff4d4f', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
        {isUp ? <RiseOutlined /> : <SyncOutlined />}
        环比{isUp ? '上升' : '下降'} {Math.abs(change)}%
      </div>
      {sparkOption && (
        <div style={{ marginTop: 2 }}>
          <ReactECharts option={sparkOption} style={{ height: 24, width: '100%' }} opts={{ renderer: 'canvas' }} />
        </div>
      )}
      {progress !== undefined && (
        <div style={{ marginTop: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: COLORS.textSecondary, marginBottom: 2 }}>
            <span>{progressLabel}</span>
            <span style={{ color: color }}>{progress}%</span>
          </div>
          <Progress percent={progress} showInfo={false} strokeColor={color} size="small" />
        </div>
      )}
      {extra}
    </div>
  );
};

const getBarChartOption = (province: string | null = null): echarts.EChartsOption => {
  const sourceData = province ? (cityLevelData[province] ?? []) : provinceTop10;
  const names = sourceData.map((p) => p.name).reverse();
  const values = sourceData.map((p) => ('value' in p ? p.value : p.lofts)).reverse();
  const title = province ? `${province}下辖城市公棚数量` : '各省份公棚数量 TOP10';
  return {
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(26, 35, 50, 0.95)', borderColor: COLORS.border, textStyle: { color: COLORS.textPrimary, fontSize: 12 } },
    grid: { left: 80, right: 30, top: 5, bottom: 15 },
    xAxis: { type: 'value', axisLine: { lineStyle: { color: COLORS.border } }, axisLabel: { color: COLORS.textSecondary, fontSize: 10 }, splitLine: { lineStyle: { color: `${COLORS.border}40` } } },
    yAxis: { type: 'category', data: names, axisLine: { lineStyle: { color: COLORS.border } }, axisLabel: { color: COLORS.textSecondary, fontSize: 10 }, axisTick: { show: false } },
    series: [{
      type: 'bar', data: values, barWidth: 12,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#00d4ff20' }, { offset: 1, color: COLORS.accentCyan }]),
        borderRadius: [0, 4, 4, 0],
      },
      label: { show: true, position: 'right', color: COLORS.accentCyan, fontSize: 10 },
    }],
    title: { show: false, text: title },
  };
};

const getLineChartOption = (province: string | null = null): echarts.EChartsOption => {
  const auctionList = province ? mockAuctions.filter((a) => a.province === province) : mockAuctions;
  const totalAuction = auctionList.reduce((sum, a) => sum + a.currentPrice, 0);
  const nationAuction = mockAuctions.reduce((sum, a) => sum + a.currentPrice, 0) || 1;
  const ratio = province ? totalAuction / nationAuction : 1;
  const trend = auctionTrendData.map((d) => ({ date: d.date, value: Math.round(d.value * ratio * 10) / 10 }));
  return {
    tooltip: {
      trigger: 'axis', backgroundColor: 'rgba(26, 35, 50, 0.95)', borderColor: COLORS.border,
      textStyle: { color: COLORS.textPrimary, fontSize: 12 },
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params;
        return `<div style="font-weight:600">${p.axisValue}</div><div style="color:${COLORS.accentGold}">成交额: ¥${p.data}万</div>`;
      },
    },
    grid: { left: 45, right: 15, top: 20, bottom: 25 },
    xAxis: { type: 'category', data: auctionTrendData.map((d) => d.date), axisLine: { lineStyle: { color: COLORS.border } }, axisLabel: { color: COLORS.textSecondary, fontSize: 10 }, boundaryGap: false },
    yAxis: { type: 'value', axisLine: { lineStyle: { color: COLORS.border } }, axisLabel: { color: COLORS.textSecondary, fontSize: 10, formatter: '{value}万' }, splitLine: { lineStyle: { color: `${COLORS.border}40` } } },
    series: [{
      type: 'line', data: trend.map((t) => t.value), smooth: true, symbol: 'circle', symbolSize: 6,
      lineStyle: { color: COLORS.accentGold, width: 2, shadowColor: COLORS.accentGold, shadowBlur: 8 },
      itemStyle: { color: COLORS.accentGold, borderColor: '#fff', borderWidth: 2 },
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: `${COLORS.accentGold}50` }, { offset: 1, color: `${COLORS.accentGold}05` }]) },
      label: { show: true, position: 'top', color: COLORS.accentGold, fontSize: 10, formatter: '¥{c}万' },
    }],
  };
};

const getMapOption = (mapMode: MapMode, _selectedProvince: string | null): echarts.EChartsOption => {
  const effectData = loftCities.map((c) => ({ name: c.name, value: c.value }));
  const linesData = [
    { fromName: '北京', toName: '上海', coords: [cityPositions['北京'], cityPositions['上海']] },
    { fromName: '北京', toName: '广州', coords: [cityPositions['北京'], cityPositions['广州']] },
    { fromName: '北京', toName: '成都', coords: [cityPositions['北京'], cityPositions['成都']] },
    { fromName: '北京', toName: '西安', coords: [cityPositions['北京'], cityPositions['西安']] },
    { fromName: '北京', toName: '杭州', coords: [cityPositions['北京'], cityPositions['杭州']] },
    { fromName: '北京', toName: '昆明', coords: [cityPositions['北京'], cityPositions['昆明']] },
    { fromName: '北京', toName: '乌鲁木齐', coords: [cityPositions['北京'], cityPositions['乌鲁木齐']] },
    { fromName: '北京', toName: '哈尔滨', coords: [cityPositions['北京'], cityPositions['哈尔滨']] },
  ];

  const series: any[] = [];

  if (mapMode === 'nodes') {
    series.push({
      name: '公棚分布', type: 'effectScatter', coordinateSystem: 'geo',
      data: effectData,
      symbolSize: (val: number[]) => Math.max(6, Math.min(18, (val[2] || 50) / 8)),
      showEffectOn: 'render',
      rippleEffect: { brushType: 'stroke', scale: 4, period: 3 },
      itemStyle: { color: COLORS.accentCyan, shadowBlur: 10, shadowColor: COLORS.accentCyan },
      label: { show: true, position: 'right', formatter: '{b}', color: COLORS.textSecondary, fontSize: 10 },
      zlevel: 2,
    });
  } else {
    series.push(
      {
        name: '飞行航线', type: 'lines', coordinateSystem: 'geo', zlevel: 2, polyline: false,
        effect: { show: true, period: 5, trailLength: 0.3, symbol: 'arrow', symbolSize: 6, color: COLORS.accentGold },
        lineStyle: { color: COLORS.accentGold, width: 1, opacity: 0.6, curveness: 0.3 },
        data: [
          { coords: [[116.4, 39.9], [121.47, 31.23]] },
          { coords: [[113.27, 23.13], [114.31, 30.52]] },
          { coords: [[121.47, 31.23], [120.15, 30.28]] },
          { coords: [[104.07, 30.67], [108.95, 34.27]] },
          { coords: [[117.2, 39.13], [116.4, 39.9]] },
        ],
      },
      {
        name: '飞线轨迹', type: 'lines', coordinateSystem: 'geo', zlevel: 3,
        effect: { show: true, period: 5, trailLength: 0.5, symbol: 'arrow', symbolSize: 6 },
        lineStyle: { color: COLORS.accentGold, width: 1, opacity: 0.6, curveness: 0.3 },
        data: linesData,
      }
    );
  }

  // Always add clickable city dots in both modes
  series.push({
    name: '城市节点', type: 'effectScatter', coordinateSystem: 'geo',
    data: effectData,
    symbolSize: (val: number[]) => Math.max(6, Math.min(18, (val[2] || 50) / 8)),
    showEffectOn: 'render',
    rippleEffect: { brushType: 'stroke', scale: 3, period: 3 },
    itemStyle: { color: COLORS.accentCyan, shadowBlur: 10, shadowColor: COLORS.accentCyan },
    label: { show: false },
    zlevel: 5,
  });

  series.push({
    name: '起点', type: 'effectScatter', coordinateSystem: 'geo', zlevel: 6,
    rippleEffect: { brushType: 'stroke', scale: 6, period: 2 },
    symbolSize: 12,
    itemStyle: { color: COLORS.accentGold, shadowBlur: 15, shadowColor: COLORS.accentGold },
    data: [{ name: '北京', value: [...cityPositions['北京'], 100] }],
  });

  const geoConfig: any = {
    map: 'china',
    roam: true,
    zoom: 1.15,
    scaleLimit: { min: 0.8, max: 5 },
    selectedMode: 'single',
    silent: false,
    label: { show: false },
    itemStyle: { areaColor: '#0d1b3e', borderColor: '#1e3a5f', borderWidth: 1, shadowColor: '#00d4ff', shadowBlur: 8 },
    emphasis: { itemStyle: { areaColor: '#162850', borderColor: COLORS.accentCyan, borderWidth: 2 }, label: { show: true, color: COLORS.accentCyan, fontSize: 11 } },
    select: { itemStyle: { areaColor: '#1a3a6e', borderColor: COLORS.accentCyan, borderWidth: 2 }, label: { show: true, color: COLORS.accentCyan } },
  };

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item', backgroundColor: 'rgba(26, 35, 50, 0.95)', borderColor: COLORS.border,
      textStyle: { color: COLORS.textPrimary, fontSize: 12 },
      formatter: (params: any) => {
        if (params.seriesType === 'effectScatter') {
          return `<div style="font-weight:600;font-size:13px">${params.name}公棚</div><div>数量: <span style="color:${COLORS.accentCyan}">${params.value[2] || 0}</span> 个</div>`;
        }
        if (params.seriesType === 'lines') {
          return `<div style="font-weight:600">${params.data.fromName} → ${params.data.toName}</div>`;
        }
        return params.name;
      },
    },
    geo: geoConfig,
    series,
  };
};

const provinceAdcodeMap: Record<string, string> = {
  北京市: '110000', 天津市: '120000', 上海市: '310000', 重庆市: '500000',
  广东省: '440000', 浙江省: '330000', 江苏省: '320000', 四川省: '510000',
  山东省: '370000', 湖北省: '420000', 福建省: '350000', 陕西省: '610000',
  河南省: '410000', 安徽省: '340000', 湖南省: '430000', 河北省: '130000',
  江西省: '360000', 辽宁省: '210000', 吉林省: '220000', 黑龙江省: '230000',
  云南省: '530000', 贵州省: '520000', 甘肃省: '620000', 青海省: '630000',
  海南省: '460000', 台湾省: '710000', 内蒙古自治区: '150000',
  广西壮族自治区: '450000', 西藏自治区: '540000',
  宁夏回族自治区: '640000', 新疆维吾尔自治区: '650000',
  香港特别行政区: '810000', 澳门特别行政区: '820000',
};

// GeoJSON cache to avoid repeated requests
const geoJsonCache = new Map<string, any>();
const geoJsonLoadPromises = new Map<string, Promise<any | null>>();

const loadProvinceGeoJSON = async (provinceName: string): Promise<any | null> => {
  // Return cached result if available
  if (geoJsonCache.has(provinceName)) {
    return geoJsonCache.get(provinceName);
  }
  
  // Return existing loading promise to avoid duplicate requests
  if (geoJsonLoadPromises.has(provinceName)) {
    return geoJsonLoadPromises.get(provinceName)!;
  }
  
  const loadPromise = (async () => {
    const adcode = provinceAdcodeMap[provinceName];
    if (!adcode) {
      geoJsonLoadPromises.delete(provinceName);
      return null;
    }
    
    const urls = [
      // 阿里云 DataV (primary)
      `https://geo.datav.aliyun.com/areas_v3/bound/${adcode}_full.json`,
      // 阿里云 DataV simplified
      `https://geo.datav.aliyun.com/areas_v3/bound/${adcode}.json`,
      // jsDelivr CDN
      `https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/json/province/${adcode}.json`,
      // unpkg CDN
      `https://unpkg.com/echarts@4.9.0/map/json/province/${adcode}.json`,
    ];
    
    for (const url of urls) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!response.ok) continue;
        const data = await response.json();
        if (data && data.features && data.features.length > 0) {
          geoJsonCache.set(provinceName, data);
          geoJsonLoadPromises.delete(provinceName);
          return data;
        }
      } catch (_) { /* try next source */ }
    }
    
    geoJsonLoadPromises.delete(provinceName);
    return null;
  })();
  
  geoJsonLoadPromises.set(provinceName, loadPromise);
  return loadPromise;
};

const getProvinceMapOption = (provinceName: string, mode: MapMode = 'trails', geoJsonLoaded: boolean = true): echarts.EChartsOption => {
  const cities = cityLevelData[provinceName] ?? [];

  const cityEffectData = cities.map((c) => {
    const pos = cityPositions[c.name];
    if (!pos) return null;
    return { name: c.name, value: [...pos, c.lofts] };
  }).filter(Boolean) as LoftCity[];

  const effectData = cityEffectData.length > 0 ? cityEffectData : loftCities.filter((c) => {
    const prov = cityToProvince[c.name];
    return prov === provinceName;
  });

  // Generate flyline data from races within the selected province
  const provinceFlights = mockRaces
    .filter((race) => race.provinces?.includes(provinceName))
    .flatMap((race) => {
      const location = race.location ?? '';
      const fromCity = location.split('→')[0]?.trim();
      const toCity = location.split('→')[1]?.trim();
      if (!fromCity || !toCity) return [];
      const fromPos = cityPositions[fromCity];
      const toPos = cityPositions[toCity];
      if (!fromPos || !toPos) return [];
      return [{
        fromName: fromCity,
        toName: toCity,
        coords: [fromPos, toPos],
        raceName: race.name,
        progress: race.progress,
        returnedCount: race.returnedCount,
        totalCount: race.totalCount,
      }];
    });

  const series: any[] = [];

  if (mode === 'trails') {
    series.push({
      name: '省内比赛路线',
      type: 'lines',
      coordinateSystem: 'geo',
      zlevel: 3,
      effect: {
        show: true,
        period: 5,
        trailLength: 0.4,
        symbol: 'arrow',
        symbolSize: 6,
        color: COLORS.accentGold,
      },
      lineStyle: {
        color: COLORS.accentGold,
        width: 1.4,
        opacity: 0.8,
        curveness: 0.25,
        shadowColor: COLORS.accentGold,
        shadowBlur: 8,
      },
      data: provinceFlights,
    });

    // Secondary thinner flyline for visual depth
    if (provinceFlights.length > 0) {
      series.push({
        name: '飞线轨迹',
        type: 'lines',
        coordinateSystem: 'geo',
        zlevel: 2,
        effect: {
          show: true,
          period: 6,
          trailLength: 0.5,
          symbol: 'arrow',
          symbolSize: 5,
        },
        lineStyle: {
          color: COLORS.accentCyan,
          width: 1,
          opacity: 0.5,
          curveness: 0.25,
        },
        data: provinceFlights.map((f) => ({ coords: f.coords })),
      });
    }
  }

  // City nodes
  series.push({
    name: '城市公棚',
    type: 'effectScatter',
    coordinateSystem: 'geo',
    data: effectData,
    symbolSize: (val: number[]) => Math.max(8, Math.min(24, (val[2] || 50) / 6)),
    showEffectOn: 'render',
    rippleEffect: { brushType: 'stroke', scale: 4, period: 3 },
    itemStyle: { color: COLORS.accentCyan, shadowBlur: 15, shadowColor: COLORS.accentCyan },
    label: { show: true, position: 'right', formatter: '{b} {c}', color: COLORS.textPrimary, fontSize: 11, fontWeight: 600 },
    zlevel: 5,
  });

  // Highlight primary hub
  series.push({
    name: '公棚总数',
    type: 'effectScatter',
    coordinateSystem: 'geo',
    zlevel: 6,
    rippleEffect: { brushType: 'stroke', scale: 6, period: 2 },
    symbolSize: 14,
    itemStyle: { color: COLORS.accentGold, shadowBlur: 20, shadowColor: COLORS.accentGold },
    data: effectData.slice(0, 1),
  });

  // Start/end points for race routes
  if (mode === 'trails' && provinceFlights.length > 0) {
    const endpointSet = new Map<string, { name: string; value: number[] }>();
    provinceFlights.forEach((f) => {
      endpointSet.set(f.fromName, { name: f.fromName, value: [...f.coords[0], 100] });
      endpointSet.set(f.toName, { name: f.toName, value: [...f.coords[1], 100] });
    });
    series.push({
      name: '起终点',
      type: 'effectScatter',
      coordinateSystem: 'geo',
      zlevel: 7,
      symbolSize: 10,
      rippleEffect: { brushType: 'stroke', scale: 5, period: 2 },
      itemStyle: { color: COLORS.accentGold, shadowBlur: 15, shadowColor: COLORS.accentGold },
      label: { show: true, position: 'top', formatter: '{b}', color: COLORS.accentGold, fontSize: 11, fontWeight: 600 },
      data: Array.from(endpointSet.values()),
    });
  }

  // When GeoJSON is not loaded, fall back to china map with filtered data
  // This prevents "Map not exists" errors while keeping flylines visible
  const geoConfig: any = geoJsonLoaded ? {
    map: provinceName,
    roam: true,
    zoom: 1.2,
    scaleLimit: { min: 0.5, max: 8 },
    selectedMode: 'single',
    silent: false,
    label: { show: true, color: COLORS.textPrimary, fontSize: 12, fontWeight: 600 },
    itemStyle: { areaColor: '#0d1b3e', borderColor: '#1e3a5f', borderWidth: 1, shadowColor: '#00d4ff', shadowBlur: 8 },
    emphasis: { itemStyle: { areaColor: '#162850', borderColor: COLORS.accentCyan, borderWidth: 2 }, label: { show: true, color: COLORS.accentCyan, fontSize: 12 } },
  } : (() => {
    // Compute center and zoom from province cities for fallback rendering
    const allProvCities = [...cities.map(c => c.name), ...loftCities.filter(c => cityToProvince[c.name] === provinceName).map(c => c.name)];
    const allPositions = allProvCities.map(n => cityPositions[n]).filter(Boolean) as [number, number][];
    const validPositions = allPositions.length > 0 ? allPositions : effectData.map(d => [d.value[0], d.value[1]] as [number, number]);
    
    let center: [number, number] = [104.5, 36.0]; // Default China center
    let zoom = 1.2;
    
    if (validPositions.length >= 2) {
      const lons = validPositions.map(p => p[0]);
      const lats = validPositions.map(p => p[1]);
      const minLon = Math.min(...lons), maxLon = Math.max(...lons);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      center = [(minLon + maxLon) / 2, (minLat + maxLat) / 2];
      // Calculate appropriate zoom based on geographic span
      const lonSpan = maxLon - minLon;
      const latSpan = maxLat - minLat;
      const maxSpan = Math.max(lonSpan, latSpan);
      if (maxSpan < 2) zoom = 8;      // Very small area
      else if (maxSpan < 5) zoom = 6;  // Small area
      else if (maxSpan < 10) zoom = 4; // Medium area
      else if (maxSpan < 20) zoom = 2.5; // Large area
      else zoom = 1.5;                  // Very large area
    } else if (validPositions.length === 1) {
      center = validPositions[0];
      zoom = 8;
    }
    
    return {
      map: 'china',
      roam: true,
      zoom,
      center,
      scaleLimit: { min: 0.5, max: 12 },
      silent: true,
      label: { show: false },
      itemStyle: { areaColor: 'rgba(13, 27, 62, 0.3)', borderColor: 'rgba(30, 58, 95, 0.3)', borderWidth: 0.5 },
      emphasis: { disabled: true },
    };
  })();

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(26, 35, 50, 0.95)',
      borderColor: COLORS.border,
      textStyle: { color: COLORS.textPrimary, fontSize: 12 },
      formatter: (params: any) => {
        if (params.seriesType === 'effectScatter') {
          return `<div style="font-weight:600;font-size:13px">${params.name}公棚</div><div>数量: <span style="color:${COLORS.accentCyan}">${params.value[2] || 0}</span> 个</div>`;
        }
        if (params.seriesType === 'lines') {
          const d = params.data as any;
          if (d?.raceName) {
            return `<div style="font-weight:600;color:${COLORS.accentGold}">${d.raceName}</div>
              <div style="margin-top:4px">${d.fromName} → ${d.toName}</div>
              <div style="color:${COLORS.accentCyan};margin-top:2px">进度: ${d.progress}% | 归巢: ${d.returnedCount}/${d.totalCount}</div>`;
          }
          if (d?.fromName && d?.toName) {
            return `<div style="font-weight:600">${d.fromName} → ${d.toName}</div>`;
          }
          return '';
        }
        return params.name;
      },
    },
    geo: geoConfig,
    series,
  };
};

const DataCenter = () => {
  const [currentTime, setCurrentTime] = useState(dayjs());
  const [mapReady, setMapReady] = useState(false);
  const [flightData, setFlightData] = useState<FlightData[]>(generateFlightData());
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const chartDomRef = useRef<HTMLDivElement | null>(null);
  const mapDomRef = useRef<HTMLDivElement | null>(null);
  const flightRef = useRef<FlightData[]>(flightData);

  const [mapMode, setMapMode] = useState<MapMode>('nodes');
  const [flightExpanded, setFlightExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [activeTab, setActiveTab] = useState('auction');
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [provinceMapReady, setProvinceMapReady] = useState(false);
  const [flightFilter, setFlightFilter] = useState<'all' | 'flying' | 'returning' | 'anomaly'>('all');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRace, setSelectedRace] = useState<RaceItem | null>(null);
  const [highlightedRaceId, setHighlightedRaceId] = useState<number | null>(null);
  const [trackedPigeonId, setTrackedPigeonId] = useState<string | null>(null);
  const [pigeonDetailOpen, setPigeonDetailOpen] = useState(false);
  const [selectedPigeon, setSelectedPigeon] = useState<FlightData | null>(null);

  const provinceFromPosition = useMemo(() => {
    const map: Record<string, string> = {};
    Object.entries(cityToProvince).forEach(([city, prov]) => {
      map[`${city}上空`] = prov;
    });
    return map;
  }, []);

  const filteredFlightData = useMemo(() => {
    if (!selectedProvince) return flightData;
    return flightData.filter((f) => provinceFromPosition[f.currentPosition] === selectedProvince);
  }, [flightData, selectedProvince, provinceFromPosition]);

  const filteredFlightStats = useMemo(() => {
    const source = selectedProvince ? filteredFlightData : flightData;
    const flying = source.filter((f) => f.status === 'flying').length;
    const returning = source.filter((f) => f.status === 'returning').length;
    const anomaly = source.filter((f) => f.isAnomaly).length;
    return { flying, returning, anomaly };
  }, [filteredFlightData, flightData, selectedProvince]);

  useEffect(() => { flightRef.current = flightData; }, [flightData]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(dayjs()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const updateTimer = setInterval(() => {
      setFlightData((prev) =>
        prev.map((item) => {
          const speedDelta = Math.round((Math.random() - 0.5) * 20);
          const altDelta = Math.round((Math.random() - 0.5) * 30);
          const newSpeed = Math.max(20, Math.min(120, item.speed + speedDelta));
          const newAlt = Math.max(50, Math.min(600, item.altitude + altDelta));
          const rand = Math.random();
          let newStatus = item.status;
          if (rand > 0.9) {
            newStatus = flightStatuses[Math.floor(Math.random() * flightStatuses.length)];
          }
          return { ...item, speed: newSpeed, altitude: newAlt, status: newStatus };
        })
      );
    }, 3000);
    return () => clearInterval(updateTimer);
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadMap = async () => {
      const urls = [
        'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json',
        'https://fastly.jsdelivr.net/npm/echarts@4.9.0/map/json/china.json',
        'https://unpkg.com/echarts@4.9.0/map/json/china.json',
      ];
      for (const url of urls) {
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
          if (!response.ok) continue;
          const chinaGeoJson = await response.json();
          if (mounted) {
            echarts.registerMap('china', chinaGeoJson);
            setMapReady(true);
          }
          return;
        } catch (_) { /* try next source */ }
      }
      if (mounted) {
        console.warn('所有地图数据源加载失败，将使用简化地图模式');
        setMapReady(true);
      }
    };
    loadMap();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Initialize echarts when map data is ready
  useEffect(() => {
    if (!mapReady || !chartDomRef.current) return;

    const domEl = chartDomRef.current;
    let disposed = false;

    const allProvinceNames = Array.from(new Set(Object.values(cityToProvince)));

    const matchProvince = (rawName: string): string | null => {
      if (!rawName) return null;
      const direct = allProvinceNames.find((pn) => pn === rawName);
      if (direct) return direct;
      const normalized = rawName.replace(/市|省|自治区|回族|维吾尔|壮族|特别行政区/g, '');
      const fuzzy = allProvinceNames.find((pn) => {
        const pnNorm = pn.replace(/市|省|自治区|回族|维吾尔|壮族|特别行政区/g, '');
        return pnNorm === normalized;
      });
      return fuzzy || null;
    };

    const onChartClick = (params: any) => {
      if (!params) return;

      if (params.componentType === 'geo' && params.name) {
        const matched = matchProvince(params.name);
        if (matched) {
          setSelectedProvince(matched);
        }
        return;
      }

      if ((params.seriesType === 'effectScatter' || params.seriesType === 'scatter') && params.name) {
        if (selectedProvince && provinceMapReady) {
          return;
        }
        const province = cityToProvince[params.name];
        if (province) {
          setSelectedProvince(province);
        }
        return;
      }

      if (params.name && !params.seriesType) {
        const matched = matchProvince(params.name);
        if (matched) {
          setSelectedProvince(matched);
          return;
        }
        const province = cityToProvince[params.name];
        if (province) {
          setSelectedProvince(province);
        }
      }
    };

    const initChart = () => {
      if (disposed || !chartDomRef.current) return;
      if (chartInstanceRef.current) return;

      const rect = domEl.getBoundingClientRect();
      if (rect.width < 20 || rect.height < 20) {
        return;
      }

      const instance = echarts.init(domEl);
      chartInstanceRef.current = instance;
      instance.setOption(getMapOption(mapMode, selectedProvince));
      instance.resize();

      instance.on('click', onChartClick);
      instance.on('mouseover', (params: any) => {
        if (params.componentType === 'geo' || params.seriesType === 'effectScatter') {
          domEl.style.cursor = 'pointer';
        }
      });
      instance.on('mouseout', () => {
        domEl.style.cursor = 'grab';
      });
    };

    initChart();

    const resizeObserver = new ResizeObserver(() => {
      if (disposed) return;
      if (chartInstanceRef.current) {
        chartInstanceRef.current.resize();
      } else {
        initChart();
      }
    });
    resizeObserver.observe(domEl);

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      const instance = chartInstanceRef.current;
      if (instance) {
        instance.off('click', onChartClick);
        instance.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, [mapReady]);

  // Switch map view when province is selected/cleared
  useEffect(() => {
    const instance = chartInstanceRef.current;
    if (!instance) return;

    if (selectedProvince) {
      let cancelled = false;
      instance.showLoading({ text: '加载地图...', color: COLORS.accentCyan, textColor: COLORS.textPrimary, maskColor: 'rgba(10, 17, 40, 0.8)' });

      loadProvinceGeoJSON(selectedProvince).then((geoJson) => {
        if (cancelled) return;
        instance.hideLoading();

        try {
          if (geoJson) {
            // Check if map is already registered to avoid warnings
            const existingMap = echarts.getMap(selectedProvince);
            if (!existingMap) {
              echarts.registerMap(selectedProvince, geoJson);
            }
            const option = getProvinceMapOption(selectedProvince, mapMode, true);
            instance.setOption(option, { notMerge: true });
            instance.resize();
            setProvinceMapReady(true);
          } else {
            // GeoJSON loading failed, fallback to china map
            const fallbackOption = getProvinceMapOption(selectedProvince, mapMode, false);
            instance.setOption(fallbackOption, { notMerge: true });
            instance.resize();
            setProvinceMapReady(true);
          }
        } catch (err) {
          console.error('Error setting province map option:', err);
          // Final fallback - use china map
          try {
            const finalFallback = getProvinceMapOption(selectedProvince, mapMode, false);
            instance.setOption(finalFallback, { notMerge: true });
            instance.resize();
            setProvinceMapReady(true);
          } catch (finalErr) {
            console.error('Critical error rendering map:', finalErr);
            setProvinceMapReady(false);
          }
        }
      }).catch((err) => {
        if (cancelled) return;
        console.error('Error loading GeoJSON:', err);
        instance.hideLoading();
        try {
          const fallbackOption = getProvinceMapOption(selectedProvince, mapMode, false);
          instance.setOption(fallbackOption, { notMerge: true });
          instance.resize();
          setProvinceMapReady(true);
        } catch (finalErr) {
          console.error('Critical error rendering map:', finalErr);
          setProvinceMapReady(false);
        }
      });

      return () => { cancelled = true; };
    } else {
      const option = getMapOption(mapMode, null);
      instance.setOption(option, { notMerge: true });
      instance.resize();
      setProvinceMapReady(false);
    }
  }, [selectedProvince, mapMode]);

  // Update chart series when mapMode changes (also works in province view)
  useEffect(() => {
    const instance = chartInstanceRef.current;
    if (!instance) return;

    if (selectedProvince) {
      // Check if the province map is registered
      const mapExists = !!echarts.getMap(selectedProvince);
      const newOption = getProvinceMapOption(selectedProvince, mapMode, mapExists);
      try {
        instance.setOption(newOption, { notMerge: true });
        instance.resize();
      } catch (err) {
        console.error('Error updating map mode:', err);
        // Fallback to china map
        const fallbackOption = getProvinceMapOption(selectedProvince, mapMode, false);
        instance.setOption(fallbackOption, { notMerge: true });
        instance.resize();
      }
    } else {
      const newOption = getMapOption(mapMode, null);
      instance.setOption(newOption, { notMerge: true });
      instance.resize();
    }
  }, [mapMode, selectedProvince]);

  const provinceMetrics = useMemo(() => {
    if (!selectedProvince) {
      const totalLofts = Object.values(provinceData).reduce((s, p) => s + p.lofts, 0);
      const totalOnline = Object.values(provinceData).reduce((s, p) => s + p.online, 0);
      const totalPigeons = Object.values(provinceData).reduce((s, p) => s + p.pigeons, 0);
      const totalRaces = mockRaces.length;
      const activeUsers = 1247;
      return { lofts: totalLofts, online: totalOnline, pigeons: totalPigeons, races: totalRaces, activeUsers };
    }
    const data = provinceData[selectedProvince];
    const top10Info = provinceTop10.find((p) => p.name === selectedProvince);
    const cityData = cityLevelData[selectedProvince] ?? [];
    const cityLofts = cityData.reduce((s, c) => s + c.lofts, 0);
    const cityOnline = cityData.reduce((s, c) => s + c.online, 0);
    const cityPigeons = cityData.reduce((s, c) => s + c.pigeons, 0);
    const lofts = top10Info?.value ?? data?.lofts ?? (cityLofts > 0 ? cityLofts : 42);
    const online = data?.online ?? (cityOnline > 0 ? cityOnline : Math.round(lofts * 0.75));
    const pigeons = data?.pigeons ?? (cityPigeons > 0 ? cityPigeons : Math.round(lofts * 45));
    const races = mockRaces.filter((r) => r.provinces?.includes(selectedProvince)).length;
    const activeUsers = Math.max(50, Math.round(1247 * (lofts / 942)));
    return { lofts, online, pigeons, races, activeUsers };
  }, [selectedProvince]);

  const handleBackToNational = useCallback(() => {
    setSelectedProvince(null);
    setHighlightedRaceId(null);
  }, []);

  const handleRefresh = useCallback(() => {
    setFlightData(generateFlightData());
    setCurrentTime(dayjs());
  }, []);

  const handleRaceDetail = useCallback((race: RaceItem) => {
    setSelectedRace(race);
    setDetailModalOpen(true);
  }, []);

  const handleFlylineHighlight = useCallback((race: RaceItem) => {
    const instance = chartInstanceRef.current;
    if (!instance) return;

    if (highlightedRaceId === race.id) {
      setHighlightedRaceId(null);
      const option = selectedProvince
        ? getProvinceMapOption(selectedProvince, mapMode, !!echarts.getMap(selectedProvince))
        : getMapOption(mapMode, null);
      instance.setOption(option, { notMerge: true });
      return;
    }

    setHighlightedRaceId(race.id);

    const location = race.location ?? '';
    const fromCity = location.split('→')[0]?.trim();
    const toCity = location.split('→')[1]?.trim();
    const fromPos = cityPositions[fromCity];
    const toPos = cityPositions[toCity];

    if (!fromPos || !toPos) return;

    // Highlight: rebuild map option with emphasized flyline for this race
    const baseOption = selectedProvince
      ? getProvinceMapOption(selectedProvince, mapMode, !!echarts.getMap(selectedProvince))
      : getMapOption(mapMode, null);

    // Add highlighted flyline series on top
    const highlightSeries: any = {
      name: '高亮路线',
      type: 'lines',
      coordinateSystem: 'geo',
      zlevel: 10,
      effect: {
        show: true,
        period: 3,
        trailLength: 0.6,
        symbol: 'arrow',
        symbolSize: 10,
        color: '#ff4d4f',
      },
      lineStyle: {
        color: '#ff4d4f',
        width: 3,
        opacity: 1,
        curveness: 0.25,
        shadowColor: '#ff4d4f',
        shadowBlur: 20,
      },
      data: [{
        fromName: fromCity,
        toName: toCity,
        coords: [fromPos, toPos],
        raceName: race.name,
        progress: race.progress,
        returnedCount: race.returnedCount,
        totalCount: race.totalCount,
      }],
    };

    // Add highlighted endpoint markers
    const highlightMarkers: any = {
      name: '高亮端点',
      type: 'effectScatter',
      coordinateSystem: 'geo',
      zlevel: 11,
      symbolSize: 16,
      rippleEffect: { brushType: 'stroke', scale: 6, period: 2 },
      itemStyle: { color: '#ff4d4f', shadowBlur: 20, shadowColor: '#ff4d4f' },
      label: { show: true, position: 'top', formatter: '{b}', color: '#ff4d4f', fontSize: 12, fontWeight: 700 },
      data: [
        { name: fromCity, value: [...fromPos, 200] },
        { name: toCity, value: [...toPos, 200] },
      ],
    };

    const baseSeries = Array.isArray(baseOption.series) ? baseOption.series : baseOption.series ? [baseOption.series] : [];
    const newSeries = [...baseSeries, highlightSeries, highlightMarkers];
    instance.setOption({ ...baseOption, series: newSeries }, { notMerge: true });
  }, [highlightedRaceId, selectedProvince, mapMode]);

  const handlePigeonTrack = useCallback((pigeon: FlightData) => {
    const instance = chartInstanceRef.current;
    if (!instance || !pigeon.coord) return;

    if (trackedPigeonId === pigeon.id) {
      setTrackedPigeonId(null);
      const option = selectedProvince
        ? getProvinceMapOption(selectedProvince, mapMode, !!echarts.getMap(selectedProvince))
        : getMapOption(mapMode, null);
      instance.setOption(option, { notMerge: true });
      return;
    }

    setTrackedPigeonId(pigeon.id);

    // Find the race this pigeon belongs to for route info
    const race = mockRaces.find((r) => {
      const location = r.location ?? '';
      const city = location.split('→')[0]?.trim();
      return pigeon.currentPosition.includes(city);
    });

    const baseOption = selectedProvince
      ? getProvinceMapOption(selectedProvince, mapMode, !!echarts.getMap(selectedProvince))
      : getMapOption(mapMode, null);

    const trackColor = pigeon.isAnomaly ? '#ff4d4f' : pigeon.status === 'returning' ? '#fa8c16' : '#00d4ff';

    // Pigeon current position marker
    const pigeonMarker: any = {
      name: '追踪鸽子',
      type: 'effectScatter',
      coordinateSystem: 'geo',
      zlevel: 12,
      symbolSize: 20,
      rippleEffect: { brushType: 'stroke', scale: 8, period: 2 },
      itemStyle: {
        color: trackColor,
        shadowBlur: 25,
        shadowColor: trackColor,
        borderColor: '#fff',
        borderWidth: 2,
      },
      label: {
        show: true,
        position: 'top',
        formatter: (p: any) => `🐦 ${p.data.ring}`,
        color: '#fff',
        fontSize: 11,
        fontWeight: 700,
        backgroundColor: trackColor + 'CC',
        padding: [3, 8],
        borderRadius: 4,
        distance: 8,
      },
      data: [{
        name: pigeon.currentPosition.replace('上空', ''),
        value: [...pigeon.coord, pigeon.altitude],
        ring: pigeon.ringNumber,
      }],
    };

    // Route trail if we have race info
    const trackSeries: any[] = [pigeonMarker];
    if (race) {
      const loc = race.location ?? '';
      const fromCity = loc.split('→')[0]?.trim() ?? '';
      const fromPos = cityPositions[fromCity];
      if (fromPos) {
        trackSeries.push({
          name: '飞行轨迹',
          type: 'lines',
          coordinateSystem: 'geo',
          zlevel: 11,
          effect: { show: true, period: 2, trailLength: 0.5, symbol: 'arrow', symbolSize: 6, color: trackColor },
          lineStyle: { color: trackColor, width: 2, opacity: 0.7, curveness: 0.25, type: 'dashed' },
          data: [{ coords: [fromPos, pigeon.coord] }],
        });
        // Starting point
        trackSeries.push({
          name: '起点',
          type: 'scatter',
          coordinateSystem: 'geo',
          zlevel: 10,
          symbolSize: 8,
          itemStyle: { color: COLORS.accentGold },
          label: { show: true, position: 'bottom', formatter: fromCity, color: COLORS.textSecondary, fontSize: 10 },
          data: [{ name: fromCity, value: [...fromPos, 0] }],
        });
      }
    }

    const baseSeries = Array.isArray(baseOption.series) ? baseOption.series : baseOption.series ? [baseOption.series] : [];
    const newSeries = [...baseSeries, ...trackSeries];
    instance.setOption({ ...baseOption, series: newSeries }, { notMerge: true });
  }, [trackedPigeonId, selectedProvince, mapMode]);

  const handlePigeonView = useCallback((pigeon: FlightData) => {
    setSelectedPigeon(pigeon);
    setPigeonDetailOpen(true);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const renderAuctionList = useCallback(() => {
    const filtered = selectedProvince
      ? mockAuctions.filter((a) => a.province === selectedProvince)
      : mockAuctions;
    return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4 }}>
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: COLORS.textSecondary, fontSize: 12 }}>
            <FireOutlined style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }} />
            <div>{selectedProvince ? `${selectedProvince} 暂无拍卖` : '暂无拍卖数据'}</div>
          </div>
        ) : filtered.map((item) => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', borderRadius: 6, background: `linear-gradient(135deg, ${COLORS.bgCard} 0%, #151d2d 100%)`, border: `1px solid ${COLORS.border}`, gap: 8 }}>
            <span style={{ fontSize: 20 }}>{item.image}</span>
            <span style={{ flex: 1, color: COLORS.textPrimary, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
            <span style={{ color: COLORS.accentGold, fontWeight: 600, fontSize: 12 }}>¥{item.currentPrice.toLocaleString()}</span>
            <span style={{ color: COLORS.accentCyan, fontSize: 12, marginLeft: 6 }}>{item.bidCount}出价</span>
          </div>
        ))}
      </div>
    </div>
  );
  }, [selectedProvince]);

  const renderRaceList = useCallback(() => {
    const filtered = selectedProvince
      ? mockRaces.filter((r) => r.provinces?.includes(selectedProvince))
      : mockRaces;
    return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', paddingRight: 4 }}>
      {selectedProvince && (
        <div style={{ background: `${COLORS.accentCyan}15`, border: `1px solid ${COLORS.accentCyan}40`, borderRadius: 4, padding: '6px 10px', marginBottom: 8, fontSize: 11, color: COLORS.accentCyan, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>📍 筛选: {selectedProvince} ({filtered.length} 项赛事)</span>
          <Button type="link" size="small" onClick={handleBackToNational} style={{ padding: '0 4px', fontSize: 11, height: 'auto' }}>清除</Button>
        </div>
      )}
      {filtered.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: COLORS.textSecondary, fontSize: 12 }}>
          <TrophyOutlined style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }} />
          <div>{selectedProvince ? `${selectedProvince} 暂无进行中赛事` : '暂无赛事数据'}</div>
        </div>
      ) : (
        filtered.map((race) => (
          <div key={race.id} style={{ display: 'flex', flexDirection: 'column', padding: '10px 12px', borderRadius: 6, background: 'linear-gradient(135deg, #1a2332 0%, #151d2d 100%)', border: '1px solid #2a3a5a', marginBottom: 8, gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 8 }}>{race.name}</div>
              <Tag color={race.status === '即将结束' ? 'orange' : 'green'} style={{ margin: 0, padding: '0 4px', fontSize: 11, lineHeight: '18px' }}>{race.status}</Tag>
            </div>
            <div>
              <Progress percent={race.progress} strokeColor={COLORS.accentCyan} showInfo={true} size="small" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: COLORS.textSecondary }}>
              <span>总 {race.totalCount} 羽</span>
              <span>已归巢 {race.returnedCount}</span>
              <span>线路: {race.location}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="link" size="small" onClick={() => handleRaceDetail(race)} style={{ padding: '0 4px', fontSize: 11 }}>详情</Button>
              <Button
                type="link"
                size="small"
                onClick={() => handleFlylineHighlight(race)}
                style={{
                  padding: '0 4px',
                  fontSize: 11,
                  color: highlightedRaceId === race.id ? '#ff4d4f' : undefined,
                  fontWeight: highlightedRaceId === race.id ? 700 : 400,
                }}
              >
                飞线
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
  }, [selectedProvince, handleBackToNational]);

  const renderFlightData = useCallback(() => {
    const source = selectedProvince ? filteredFlightData : flightData;
    const filtered = source.filter((item) => {
      if (flightFilter === 'all') return true;
      if (flightFilter === 'anomaly') return item.isAnomaly;
      return item.status === flightFilter;
    });
    const sorted = [...filtered].sort((a, b) => {
      const orderA = a.isAnomaly ? 0 : a.status === 'returning' ? 1 : a.status === 'flying' ? 2 : 3;
      const orderB = b.isAnomaly ? 0 : b.status === 'returning' ? 1 : b.status === 'flying' ? 2 : 3;
      return orderA - orderB;
    });
    const filterOptions: { key: typeof flightFilter; label: string }[] = [
      { key: 'all', label: '全部' }, { key: 'flying', label: '飞行中' }, { key: 'returning', label: '归巢中' }, { key: 'anomaly', label: '异常' },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {flightExpanded && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {filterOptions.map((opt) => (
              <Button key={opt.key} size="small" type={flightFilter === opt.key ? 'primary' : 'default'} onClick={() => setFlightFilter(opt.key)} style={flightFilter === opt.key ? { background: COLORS.accentCyan, borderColor: COLORS.accentCyan, color: COLORS.bgPrimary } : {}}>
                {opt.label}
              </Button>
            ))}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr 1fr 0.8fr 1fr 1.2fr', gap: 8, padding: '6px 10px', background: `${COLORS.accentCyan}15`, borderRadius: '6px 6px 0 0', borderBottom: `1px solid ${COLORS.border}`, fontSize: 11, color: COLORS.accentCyan, fontWeight: 600 }}>
          <span>足环号</span><span>当前位置</span>
          <span style={{ textAlign: 'right' }}>速度(km/h)</span>
          <span style={{ textAlign: 'right' }}>高度(m)</span>
          <span style={{ textAlign: 'center' }}>状态</span>
          <span style={{ textAlign: 'center' }}>预计归巢</span>
          <span style={{ textAlign: 'center' }}>操作</span>
        </div>
        {sorted.map((item) => (
          <div key={item.id} className={item.isAnomaly ? 'anomaly-row' : ''} style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr 1fr 0.8fr 1fr 1.2fr', gap: 8, padding: '6px 10px', borderBottom: `1px solid ${COLORS.border}40`, fontSize: 12, transition: 'background 0.3s', background: item.isAnomaly ? 'rgba(239, 68, 68, 0.1)' : item.status === 'returning' ? 'rgba(245, 158, 11, 0.08)' : 'transparent' }}>
            <span style={{ color: COLORS.textPrimary, fontFamily: 'monospace' }}>{item.ringNumber}</span>
            <span style={{ color: item.isAnomaly ? '#ff4d4f' : COLORS.textSecondary }}>{item.currentPosition}</span>
            <span style={{ color: item.isAnomaly ? '#ff4d4f' : COLORS.accentCyan, textAlign: 'right', fontWeight: 500 }}>{item.speed}</span>
            <span style={{ color: COLORS.accentGold, textAlign: 'right', fontWeight: 500 }}>{item.altitude}</span>
            <span style={{ textAlign: 'center' }}>
              <Tag icon={item.isAnomaly ? <FireOutlined /> : item.status === 'flying' ? <ThunderboltOutlined /> : item.status === 'returning' ? <CloudOutlined /> : <CheckCircleOutlined />} color={item.isAnomaly ? 'red' : item.status === 'flying' ? 'green' : item.status === 'returning' ? 'blue' : 'default'} style={{ marginRight: 0, padding: '0 4px', fontSize: 11, lineHeight: '18px' }}>
                {item.isAnomaly ? '异常' : statusLabelMap[item.status]}
              </Tag>
            </span>
            <span style={{ textAlign: 'center', color: item.etaMinutes !== undefined && item.etaMinutes > 120 ? '#ff4d4f' : COLORS.textSecondary }}>{item.etaMinutes !== undefined ? `${item.etaMinutes} 分钟` : '-'}</span>
            <span style={{ textAlign: 'center' }}>
              <Space size={4}>
                <Button
                  size="small"
                  type="link"
                  onClick={() => handlePigeonTrack(item)}
                  style={{
                    padding: '0 4px',
                    color: trackedPigeonId === item.id ? '#ff4d4f' : undefined,
                    fontWeight: trackedPigeonId === item.id ? 700 : 400,
                  }}
                >
                  {trackedPigeonId === item.id ? '取消追踪' : '追踪'}
                </Button>
                <Button
                  size="small"
                  type="link"
                  onClick={() => handlePigeonView(item)}
                  style={{ padding: '0 4px' }}
                >
                  查看
                </Button>
              </Space>
            </span>
          </div>
        ))}
      </div>
    );
  }, [flightData, filteredFlightData, flightFilter, flightExpanded, selectedProvince, trackedPigeonId, handlePigeonTrack, handlePigeonView]);

  const provinceDetail = useMemo<ProvinceDetailData | null>(() => {
    if (!selectedProvince) return null;
    const data = provinceData[selectedProvince];
    const top10Info = provinceTop10.find((p) => p.name === selectedProvince);
    const cities = cityLevelData[selectedProvince] ?? [];
    const cityLofts = cities.reduce((s, c) => s + c.lofts, 0);
    const cityOnline = cities.reduce((s, c) => s + c.online, 0);
    const cityPigeons = cities.reduce((s, c) => s + c.pigeons, 0);
    const cityRaces = cities.reduce((s, c) => s + c.races, 0);
    const racesFromMock = mockRaces.filter((r) => r.provinces?.includes(selectedProvince)).length;
    return {
      name: selectedProvince,
      lofts: top10Info?.value ?? data?.lofts ?? (cityLofts > 0 ? cityLofts : 42),
      online: data?.online ?? (cityOnline > 0 ? cityOnline : Math.round(((top10Info?.value ?? cityLofts) || 42) * 0.75)),
      pigeons: data?.pigeons ?? (cityPigeons > 0 ? cityPigeons : Math.round(((top10Info?.value ?? cityLofts) || 42) * 45)),
      races: data?.races ?? (racesFromMock > 0 ? racesFromMock : (cityRaces > 0 ? cityRaces : 0)),
      cities: cities.map((c) => ({
        name: c.name,
        lofts: c.lofts,
        online: c.online,
        pigeons: c.pigeons,
        races: c.races,
      })),
    };
  }, [selectedProvince]);

  const mapContent = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div ref={mapDomRef} style={{ flex: 1, minHeight: 0, cursor: 'grab', position: 'relative' }} onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.cursor = 'grabbing'; }} onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.cursor = 'grab'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.cursor = 'grab'; }}>
        {mapReady ? (
          <div ref={chartDomRef} style={{ width: '100%', height: '100%' }} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: COLORS.textSecondary, fontSize: 14 }}>地图加载中...</div>
        )}
      </div>
      {selectedProvince && provinceDetail && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: `${COLORS.bgCard}f5`, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: '10px 14px', backdropFilter: 'blur(10px)', zIndex: 10, maxHeight: '75%', overflow: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ width: 3, height: 14, background: COLORS.accentCyan, borderRadius: 2, marginRight: 8 }} />
            <span style={{ color: COLORS.accentCyan, fontSize: 15, fontWeight: 700 }}>{provinceDetail.name}</span>
            <Tag color="cyan" style={{ marginLeft: 8, fontSize: 10, lineHeight: '16px', padding: '0 6px' }}>
              辖 {provinceDetail.cities.length} 市
            </Tag>
            <div style={{ flex: 1 }} />
            <Button size="small" onClick={handleBackToNational} style={{ padding: '0 10px', fontSize: 11, height: 22, borderColor: COLORS.border, color: COLORS.textSecondary }}>
              ← 返回全国
            </Button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
            <div style={{ background: `${COLORS.accentCyan}15`, borderRadius: 4, padding: '6px 4px', textAlign: 'center', border: `1px solid ${COLORS.accentCyan}30` }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.accentCyan }}>{provinceDetail.lofts}</div>
              <div style={{ fontSize: 10, color: COLORS.textSecondary, marginTop: 1 }}>公棚总数</div>
            </div>
            <div style={{ background: `${COLORS.flying}15`, borderRadius: 4, padding: '6px 4px', textAlign: 'center', border: `1px solid ${COLORS.flying}30` }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.flying }}>{provinceDetail.online}</div>
              <div style={{ fontSize: 10, color: COLORS.textSecondary, marginTop: 1 }}>在线公棚</div>
            </div>
            <div style={{ background: `${COLORS.accentGold}15`, borderRadius: 4, padding: '6px 4px', textAlign: 'center', border: `1px solid ${COLORS.accentGold}30` }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.accentGold }}>{provinceDetail.pigeons.toLocaleString()}</div>
              <div style={{ fontSize: 10, color: COLORS.textSecondary, marginTop: 1 }}>鸽子总数</div>
            </div>
            <div style={{ background: '#ff7a4515', borderRadius: 4, padding: '6px 4px', textAlign: 'center', border: `1px solid #ff7a4530` }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#ff7a45' }}>{provinceDetail.races}</div>
              <div style={{ fontSize: 10, color: COLORS.textSecondary, marginTop: 1 }}>赛事总数</div>
            </div>
          </div>
        </div>
      )}
      {/* 实时赛事区块已隐藏 */}
    </div>
  );

  const toggleFlightExpand = () => setFlightExpanded((prev) => !prev);

  return (
    <div style={{ background: COLORS.bgPrimary, height: '100vh', padding: '12px 16px', color: COLORS.textPrimary, fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: `linear-gradient(90deg, ${COLORS.accentCyan}15 0%, transparent 50%, ${COLORS.accentGold}15 100%)`, borderRadius: 6, border: `1px solid ${COLORS.border}`, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 4, height: 28, background: `linear-gradient(180deg, ${COLORS.accentCyan}, ${COLORS.accentGold})`, borderRadius: 2, marginRight: 12 }} />
          <h1 style={{ fontSize: 20, fontWeight: 700, background: `linear-gradient(90deg, ${COLORS.accentCyan}, ${COLORS.accentGold})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>赛鸽基因溯源平台 - 数据中控</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.flying, boxShadow: `0 0 6px ${COLORS.flying}`, animation: 'pulse 2s infinite' }} />
            <span style={{ color: COLORS.textSecondary, fontSize: 12 }}>系统运行正常</span>
          </div>
          <div style={{ color: COLORS.textPrimary, fontSize: 13, fontFamily: 'monospace' }}>{currentTime.format('YYYY-MM-DD HH:mm:ss')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Tooltip title="刷新数据">
              <Button size="small" icon={<ReloadOutlined />} onClick={handleRefresh} style={{ background: 'transparent', borderColor: COLORS.border, color: COLORS.textSecondary }} />
            </Tooltip>
            <Tooltip title={isFullscreen ? '退出全屏' : '全屏显示'}>
              <Button size="small" icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} onClick={handleToggleFullscreen} style={{ background: 'transparent', borderColor: COLORS.border, color: COLORS.textSecondary }} />
            </Tooltip>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 320px', gap: 12, alignItems: 'stretch', flex: 1, minHeight: 0 }}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            <MetricCard title={`${selectedProvince ? selectedProvince + ' · ' : ''}在线公棚数`} value={provinceMetrics.online} unit="个" change={selectedProvince ? 3.8 : 5.2} trend={[Math.round(provinceMetrics.online * 0.9), Math.round(provinceMetrics.online * 0.92), Math.round(provinceMetrics.online * 0.94), Math.round(provinceMetrics.online * 0.96), Math.round(provinceMetrics.online * 0.97), Math.round(provinceMetrics.online * 0.99), provinceMetrics.online]} progress={selectedProvince ? Math.round(provinceMetrics.online / provinceMetrics.lofts * 100) : 73} progressLabel="在线率" icon={<CheckCircleOutlined />} color={COLORS.flying} extra={<div style={{ fontSize: 10, color: COLORS.textSecondary, marginTop: 2 }}>总 {provinceMetrics.lofts} · 在棚 {provinceMetrics.online}</div>} />
            <MetricCard title="鸽子总数" value={provinceMetrics.pigeons} unit="羽" change={selectedProvince ? 8.2 : 12.3} trend={[Math.round(provinceMetrics.pigeons * 0.88), Math.round(provinceMetrics.pigeons * 0.9), Math.round(provinceMetrics.pigeons * 0.92), Math.round(provinceMetrics.pigeons * 0.94), Math.round(provinceMetrics.pigeons * 0.96), Math.round(provinceMetrics.pigeons * 0.98), provinceMetrics.pigeons]} progress={85} progressLabel="同比去年" icon={<TrophyOutlined />} color={COLORS.accentGold} />
            <MetricCard title="进行中赛事" value={provinceMetrics.races} unit="项" change={0} trend={[Math.max(0, provinceMetrics.races - 2), Math.max(0, provinceMetrics.races - 1), provinceMetrics.races, Math.max(0, provinceMetrics.races - 1), provinceMetrics.races, provinceMetrics.races, provinceMetrics.races]} icon={<FireOutlined />} color={COLORS.accentGold} />
            <MetricCard title="今日活跃用户" value={provinceMetrics.activeUsers} unit="人" change={selectedProvince ? 4.2 : 6.8} trend={[Math.round(provinceMetrics.activeUsers * 0.72), Math.round(provinceMetrics.activeUsers * 0.8), Math.round(provinceMetrics.activeUsers * 0.88), Math.round(provinceMetrics.activeUsers * 0.84), Math.round(provinceMetrics.activeUsers * 0.96), Math.round(provinceMetrics.activeUsers * 0.99), provinceMetrics.activeUsers]} progress={65} progressLabel="日活目标" icon={<TeamOutlined />} color={COLORS.accentCyan} />
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ width: 3, height: 12, background: COLORS.accentCyan, borderRadius: 2, marginRight: 6 }} />
                <span style={{ color: COLORS.textPrimary, fontSize: 13, fontWeight: 600 }}>{selectedProvince ? `${selectedProvince}下辖城市公棚数量` : '各省份公棚数量 TOP10'}</span>
                {selectedProvince && <Tag color="cyan" style={{ marginLeft: 8, fontSize: 10 }}>省级视图</Tag>}
              </div>
              <ReactECharts option={getBarChartOption(selectedProvince)} style={{ height: 220, width: '100%' }} opts={{ renderer: 'canvas' }} notMerge />
            </div>
            <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ width: 3, height: 12, background: COLORS.accentGold, borderRadius: 2, marginRight: 6 }} />
                <span style={{ color: COLORS.textPrimary, fontSize: 13, fontWeight: 600 }}>{selectedProvince ? `${selectedProvince} 拍卖成交额估算` : '最近 7 天拍卖成交额趋势'}</span>
              </div>
              <ReactECharts option={getLineChartOption(selectedProvince)} style={{ height: 160, width: '100%' }} opts={{ renderer: 'canvas' }} notMerge />
            </div>
            {selectedProvince && provinceDetail && (provinceDetail.cities?.length ?? 0) > 0 && (
              <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ width: 3, height: 12, background: COLORS.accentCyan, borderRadius: 2, marginRight: 6 }} />
                  <ApartmentOutlined style={{ color: COLORS.accentCyan, marginRight: 6, fontSize: 13 }} />
                  <span style={{ color: COLORS.textPrimary, fontSize: 13, fontWeight: 600 }}>下辖城市公棚分布</span>
                </div>
                <div style={{ background: `${COLORS.bgPrimary}60`, borderRadius: 4, border: `1px solid ${COLORS.border}` }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr 1fr 1fr', gap: 4, padding: '6px 8px', borderBottom: `1px solid ${COLORS.border}40`, fontSize: 10, color: COLORS.textSecondary, fontWeight: 600 }}>
                    <span>城市</span>
                    <span style={{ textAlign: 'right' }}>公棚</span>
                    <span style={{ textAlign: 'right' }}>在线</span>
                    <span style={{ textAlign: 'right' }}>鸽子</span>
                    <span style={{ textAlign: 'right' }}>赛事</span>
                  </div>
                  {provinceDetail.cities!.map((city: CityDetail) => (
                    <div key={city.name} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr 1fr 1fr', gap: 4, padding: '6px 8px', borderBottom: `1px solid ${COLORS.border}20`, fontSize: 11, alignItems: 'center' }}>
                      <span style={{ color: COLORS.textPrimary, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <EnvironmentOutlined style={{ color: COLORS.accentCyan, fontSize: 10 }} />
                        {city.name}
                      </span>
                      <span style={{ textAlign: 'right', color: COLORS.accentCyan, fontWeight: 600 }}>{city.lofts}</span>
                      <span style={{ textAlign: 'right', color: COLORS.flying }}>{city.online}</span>
                      <span style={{ textAlign: 'right', color: COLORS.accentGold }}>{city.pigeons.toLocaleString()}</span>
                      <span style={{ textAlign: 'right', color: city.races > 0 ? '#ff7a45' : COLORS.textSecondary, fontWeight: city.races > 0 ? 600 : 400 }}>
                        {city.races > 0 ? `${city.races}` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: 12, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ width: 3, height: 12, background: selectedProvince ? COLORS.accentGold : COLORS.accentCyan, borderRadius: 2, marginRight: 6 }} />
            <span style={{ color: COLORS.textPrimary, fontSize: 14, fontWeight: 600 }}>
              {selectedProvince ? `${selectedProvince} · 公棚分布 & 实时飞线` : '全国公棚分布 & 实时飞线'}
            </span>
            {selectedProvince && (
              <>
                <Tag color="gold" style={{ marginLeft: 8, fontSize: 10, lineHeight: '16px', padding: '0 6px' }}>
                  省级视图
                </Tag>
                <Button size="small" icon={<ReloadOutlined />} onClick={handleBackToNational} style={{ marginLeft: 8, padding: '0 10px', fontSize: 11, height: 22, borderColor: COLORS.accentGold, color: COLORS.accentGold }}>
                  ← 返回全国
                </Button>
              </>
            )}
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Tag color={mapMode === 'nodes' ? 'cyan' : 'default'} style={{ cursor: 'pointer', borderColor: mapMode === 'nodes' ? COLORS.accentCyan : COLORS.border, color: mapMode === 'nodes' ? COLORS.accentCyan : COLORS.textSecondary, background: mapMode === 'nodes' ? `${COLORS.accentCyan}20` : 'transparent' }} onClick={() => setMapMode('nodes')}>
                <CloudOutlined /> 公棚节点
              </Tag>
              <Tag color={mapMode === 'trails' ? 'gold' : 'default'} style={{ cursor: 'pointer', borderColor: mapMode === 'trails' ? COLORS.accentGold : COLORS.border, color: mapMode === 'trails' ? COLORS.accentGold : COLORS.textSecondary, background: mapMode === 'trails' ? `${COLORS.accentGold}20` : 'transparent' }} onClick={() => setMapMode('trails')}>
                <FireOutlined /> 飞线轨迹
              </Tag>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{mapContent}</div>
        </div>

        <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: 12, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', minHeight: 0, width: '320px' }}>
          <Tabs activeKey={activeTab} onChange={setActiveTab} destroyOnHidden tabBarStyle={{ color: COLORS.textSecondary, flexShrink: 0 }} style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} items={[
            {
              key: 'auction',
              label: <span style={{ color: activeTab === 'auction' ? COLORS.accentCyan : COLORS.textSecondary, fontSize: 12 }}><FireOutlined /> 热门拍卖</span>,
              children: <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>{renderAuctionList()}</div>,
            },
            {
              key: 'race',
              label: <span style={{ color: activeTab === 'race' ? COLORS.accentCyan : COLORS.textSecondary, fontSize: 12 }}><TrophyOutlined /> 赛事实时</span>,
              children: <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>{renderRaceList()}</div>,
            },
          ]} />
        </div>
      </div>

      <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 6, marginTop: 10, flexShrink: 0, overflow: 'hidden' }}>
        <div onClick={toggleFlightExpand} style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', cursor: 'pointer', userSelect: 'none', background: `linear-gradient(90deg, ${COLORS.accentCyan}10, transparent)` }}>
          <div style={{ width: 3, height: 12, background: COLORS.accentCyan, borderRadius: 2, marginRight: 6 }} />
          <span style={{ color: COLORS.textPrimary, fontSize: 13, fontWeight: 600 }}>鸽子实时飞行数据</span>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 10 }}>
            <span style={{ fontSize: 11, color: COLORS.flying }}><ThunderboltOutlined /> 飞行中 {filteredFlightStats.flying}</span>
            <span style={{ fontSize: 11, color: COLORS.returning }}><CloudOutlined /> 归巢中 {filteredFlightStats.returning}</span>
            {filteredFlightStats.anomaly > 0 && <span style={{ fontSize: 11, color: '#ff4d4f' }}><FireOutlined /> 异常 {filteredFlightStats.anomaly}</span>}
          </div>
          {selectedProvince && <Tag color="cyan" style={{ marginRight: 8 }}>{selectedProvince}</Tag>}
          <Tag icon={<SyncOutlined spin />} color="cyan" style={{ marginRight: 6 }}>实时</Tag>
          <span style={{ color: COLORS.textSecondary, fontSize: 11, transform: flightExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▼</span>
        </div>
        {flightExpanded && <div style={{ borderTop: `1px solid ${COLORS.border}` }}>{renderFlightData()}</div>}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes pulse-ring { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.8); opacity: 0; } }
        .anomaly-row { animation: blink 1s infinite; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: ${COLORS.bgPrimary}; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${COLORS.accentCyan}; }
        .ant-tabs-tab-active .ant-tabs-tab-btn { color: ${COLORS.accentCyan} !important; }
        .ant-progress-inner { background: ${COLORS.border}80 !important; }
        .ant-tabs { display: flex !important; flex-direction: column !important; height: 100% !important; }
        .ant-tabs-content-holder { flex: 1 !important; min-height: 0 !important; overflow: hidden !important; display: flex !important; }
        .ant-tabs-content { flex: 1 !important; min-height: 0 !important; display: flex !important; width: 100% !important; }
        .ant-tabs-tabpane { flex: 1 !important; min-height: 0 !important; width: 100% !important; }
        .ant-tabs-tabpane-active { display: flex !important; flex-direction: column !important; }
        .auction-table .ant-table-thead > tr > th { background: ${COLORS.bgCard} !important; color: ${COLORS.accentCyan} !important; border-bottom: 1px solid ${COLORS.border} !important; font-size: 11px !important; font-weight: 600 !important; }
        .auction-table .ant-table-tbody > tr { background: transparent !important; border-bottom: 1px solid ${COLORS.border}40 !important; transition: all 0.2s; }
        .auction-table .ant-table-tbody > tr:hover > td { border-top: 1px solid ${COLORS.accentCyan} !important; border-bottom: 1px solid ${COLORS.accentCyan} !important; background: ${COLORS.accentCyan}10 !important; }
        .auction-table .ant-table-tbody > tr > td { border-bottom: 1px solid ${COLORS.border}40 !important; color: ${COLORS.textPrimary} !important; font-size: 11px !important; padding: 4px 8px !important; }
        .auction-table .ant-table { background: transparent !important; }
        .auction-table .ant-table-container { border: none !important; }
        .ant-table-thead > tr > th { background: ${COLORS.bgCard} !important; color: ${COLORS.accentCyan} !important; border-bottom: 1px solid ${COLORS.border} !important; }
        .ant-table-tbody > tr { background: transparent !important; }
        .ant-table-tbody > tr:hover > td { background: ${COLORS.accentCyan}10 !important; }
        .ant-table-tbody > tr > td { border-bottom: 1px solid ${COLORS.border}40 !important; color: ${COLORS.textPrimary} !important; }
      `}</style>

      {/* Race Detail Modal - Redesigned */}
      <Modal
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={null}
        width={780}
        centered
        destroyOnClose
        styles={{
          mask: { background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)' },
          content: { background: 'transparent', boxShadow: 'none', padding: 0 },
          body: { padding: 0 },
        }}
        closable={false}
      >
        {selectedRace && (() => {
          const race = selectedRace;
          const statusColor = race.status === '即将结束' ? '#fa8c16' : '#52c41a';
          const homingRate = Math.round((race.returnedCount / race.totalCount) * 100);
          const location = race.location ?? '';
          const fromCity = location.split('→')[0]?.trim() ?? '';
          const toCity = location.split('→')[1]?.trim() ?? '';
          const fromPos = cityPositions[fromCity];
          const toPos = cityPositions[toCity];

          // Calculate distance (approximate using haversine)
          let distanceKm = race.distance ?? 0;
          if (!distanceKm && fromPos && toPos) {
            const R = 6371;
            const dLat = (toPos[1] - fromPos[1]) * Math.PI / 180;
            const dLon = (toPos[0] - fromPos[0]) * Math.PI / 180;
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(fromPos[1] * Math.PI / 180) * Math.cos(toPos[1] * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
            distanceKm = Math.round(2 * R * Math.asin(Math.sqrt(a)));
          }

          const startTime = race.startTime ?? dayjs().subtract(race.progress * 45, 'minute').format('YYYY-MM-DD HH:mm');
          const estimatedReturn = race.estimatedReturnTime ?? dayjs().add(Math.max(30, Math.round((100 - race.progress) * 3)), 'minute').format('HH:mm');
          const raceLevel = race.level ?? (distanceKm >= 700 ? '国家赛' : distanceKm >= 500 ? '省级赛' : distanceKm >= 300 ? '市级赛' : '县级赛');
          const routeType = race.routeType ?? (distanceKm >= 500 ? '长途' : distanceKm >= 300 ? '中距离' : '短途');
          const points = race.points ?? Math.round(distanceKm * 10);
          const participants = race.participants ?? (race.pigeonCount ?? race.totalCount);

          // Mini map option for preview
          const miniMapOption: echarts.EChartsOption = {
            backgroundColor: 'transparent',
            geo: {
              map: 'china',
              roam: false,
              zoom: 3.2,
              center: fromPos && toPos ? [(fromPos[0] + toPos[0]) / 2, (fromPos[1] + toPos[1]) / 2] : [108, 34],
              itemStyle: { areaColor: '#1a2332', borderColor: '#2a3a5a', borderWidth: 0.5 },
              emphasis: { itemStyle: { areaColor: '#0a1128' }, label: { show: false } },
              silent: true,
            },
            series: fromPos && toPos ? [
              {
                type: 'lines',
                coordinateSystem: 'geo',
                zlevel: 10,
                effect: { show: true, period: 2, trailLength: 0.4, symbol: 'arrow', symbolSize: 6, color: '#ff4d4f' },
                lineStyle: { color: '#ff4d4f', width: 2, opacity: 0.9, curveness: 0.25 },
                data: [{ coords: [fromPos, toPos] }],
              },
              {
                type: 'effectScatter',
                coordinateSystem: 'geo',
                zlevel: 11,
                symbolSize: 8,
                rippleEffect: { brushType: 'stroke', scale: 3, period: 2 },
                itemStyle: { color: '#ff4d4f', shadowBlur: 10, shadowColor: '#ff4d4f' },
                data: [
                  { name: fromCity, value: [...fromPos, 100] },
                  { name: toCity, value: [...toPos, 100] },
                ],
              },
            ] : [],
          };

          return (
            <div style={{
              background: `linear-gradient(165deg, ${COLORS.bgCard} 0%, #0d1525 50%, ${COLORS.bgCard} 100%)`,
              borderRadius: 16,
              border: `1px solid ${COLORS.border}`,
              overflow: 'hidden',
              position: 'relative',
            }}>
              {/* Close button */}
              <button
                onClick={() => setDetailModalOpen(false)}
                style={{
                  position: 'absolute', top: 16, right: 16, zIndex: 10,
                  width: 32, height: 32, borderRadius: 8, border: `1px solid ${COLORS.border}`,
                  background: 'rgba(26, 35, 50, 0.8)', color: COLORS.textSecondary,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ff4d4f'; e.currentTarget.style.color = '#ff4d4f'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textSecondary; }}
              >
                ✕
              </button>

              {/* Hero Section */}
              <div style={{
                padding: '28px 28px 20px',
                background: `linear-gradient(135deg, rgba(0,212,255,0.08) 0%, rgba(255,204,0,0.06) 50%, rgba(255,77,79,0.06) 100%)`,
                borderBottom: `1px solid ${COLORS.border}`,
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Decorative glow */}
                <div style={{
                  position: 'absolute', top: -50, right: -50, width: 200, height: 200,
                  background: `radial-gradient(circle, ${COLORS.accentCyan}20 0%, transparent 70%)`,
                  pointerEvents: 'none',
                }} />
                <div style={{
                  position: 'absolute', bottom: -80, left: -40, width: 180, height: 180,
                  background: `radial-gradient(circle, ${COLORS.accentGold}15 0%, transparent 70%)`,
                  pointerEvents: 'none',
                }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: `linear-gradient(135deg, ${COLORS.accentCyan}, ${COLORS.accentGold})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 4px 20px ${COLORS.accentCyan}40`,
                    }}>
                      <TrophyOutlined style={{ fontSize: 22, color: COLORS.bgPrimary }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <h2 style={{
                          margin: 0, fontSize: 22, fontWeight: 700,
                          background: `linear-gradient(90deg, #fff, ${COLORS.accentCyan})`,
                          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>
                          {race.name}
                        </h2>
                        <Tag
                          color={race.status === '即将结束' ? 'orange' : 'green'}
                          style={{ margin: 0, padding: '2px 10px', fontSize: 12, fontWeight: 600, borderRadius: 10 }}
                        >
                          {race.status === '即将结束' ? <RocketOutlined /> : <SyncOutlined spin />}
                          {' '}{race.status}
                        </Tag>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: COLORS.textSecondary }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <ApartmentOutlined /> {race.club}
                        </span>
                        <span style={{ color: COLORS.border }}>|</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <SafetyCertificateOutlined /> {raceLevel}
                        </span>
                        <span style={{ color: COLORS.border }}>|</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <FlagOutlined /> {routeType}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Route Visualization */}
                  <div style={{
                    marginTop: 16, padding: '14px 16px', borderRadius: 12,
                    background: 'rgba(10, 17, 40, 0.6)', border: `1px solid ${COLORS.border}`,
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    {/* From City */}
                    <div style={{ textAlign: 'center', minWidth: 100 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%', margin: '0 auto 6px',
                        background: `linear-gradient(135deg, ${COLORS.accentCyan}30, ${COLORS.accentCyan}10)`,
                        border: `2px solid ${COLORS.accentCyan}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        position: 'relative',
                      }}>
                        <EnvironmentOutlined style={{ color: COLORS.accentCyan, fontSize: 16 }} />
                        <div style={{
                          position: 'absolute', inset: -6, borderRadius: '50%',
                          border: `1px solid ${COLORS.accentCyan}40`,
                          animation: 'pulse-ring 2s infinite',
                        }} />
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.textPrimary }}>{fromCity}</div>
                      <div style={{ fontSize: 10, color: COLORS.textSecondary }}>起点</div>
                    </div>

                    {/* Connection Line */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ position: 'relative', width: '100%', height: 2, background: `linear-gradient(90deg, ${COLORS.accentCyan}, ${COLORS.accentGold}, #ff4d4f)`, borderRadius: 2 }}>
                        <div style={{
                          position: 'absolute', top: -3, left: `${race.progress}%`,
                          width: 8, height: 8, borderRadius: '50%',
                          background: '#ff4d4f', boxShadow: '0 0 10px #ff4d4f',
                          transition: 'left 0.5s ease',
                        }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <Tag style={{ margin: 0, background: `${COLORS.accentCyan}15`, border: 'none', color: COLORS.accentCyan, fontSize: 11 }}>
                          <SendOutlined /> {distanceKm} 公里
                        </Tag>
                        <span style={{ fontSize: 11, color: COLORS.textSecondary }}>耗时 ~{Math.round(distanceKm * 0.08)}h</span>
                      </div>
                    </div>

                    {/* To City */}
                    <div style={{ textAlign: 'center', minWidth: 100 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%', margin: '0 auto 6px',
                        background: `linear-gradient(135deg, #ff4d4f30, #ff4d4f10)`,
                        border: `2px solid #ff4d4f`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        position: 'relative',
                      }}>
                        <FlagOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />
                        <div style={{
                          position: 'absolute', inset: -6, borderRadius: '50%',
                          border: `1px solid #ff4d4f40`,
                          animation: 'pulse-ring 2s infinite 0.5s',
                        }} />
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.textPrimary }}>{toCity}</div>
                      <div style={{ fontSize: 10, color: COLORS.textSecondary }}>终点</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Metrics Row */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
                padding: '16px 24px',
              }}>
                {[
                  { label: '总参赛羽数', value: race.totalCount.toLocaleString(), unit: '羽', icon: <TeamOutlined />, color: COLORS.accentGold, trend: '+12%' },
                  { label: '已归巢', value: race.returnedCount.toLocaleString(), unit: '羽', icon: <CheckCircleOutlined />, color: COLORS.flying, trend: `${homingRate}%` },
                  { label: '归巢率', value: `${homingRate}%`, unit: '', icon: <FundOutlined />, color: COLORS.accentCyan, trend: `${race.totalCount - race.returnedCount} 飞行中` },
                  { label: '赛事进度', value: `${race.progress}%`, unit: '', icon: <StockOutlined />, color: '#ff4d4f', trend: `剩余 ${100 - race.progress}%` },
                ].map((m, idx) => (
                  <div key={idx} style={{
                    padding: '12px 14px', borderRadius: 10,
                    background: `linear-gradient(135deg, rgba(26,35,50,0.9) 0%, rgba(13,21,37,0.9) 100%)`,
                    border: `1px solid ${COLORS.border}`,
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{
                      position: 'absolute', top: 0, left: 0, width: 3, height: '100%',
                      background: m.color, borderRadius: '0 2px 2px 0',
                    }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: `${m.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: m.color, fontSize: 14 }}>{m.icon}</span>
                      </div>
                      <span style={{ fontSize: 11, color: COLORS.textSecondary }}>{m.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: 22, fontWeight: 700, color: COLORS.textPrimary, lineHeight: 1 }}>{m.value}</span>
                      {m.unit && <span style={{ fontSize: 11, color: COLORS.textSecondary }}>{m.unit}</span>}
                    </div>
                    <div style={{ fontSize: 10, color: m.color, marginTop: 4 }}>{m.trend}</div>
                  </div>
                ))}
              </div>

              {/* Middle section: Map Preview + Progress */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
                padding: '0 24px 16px',
              }}>
                {/* Mini Map Preview */}
                <div style={{
                  borderRadius: 12, border: `1px solid ${COLORS.border}`,
                  background: 'rgba(10, 17, 40, 0.5)', padding: 12,
                  display: 'flex', flexDirection: 'column',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ width: 3, height: 12, background: COLORS.accentCyan, borderRadius: 2, marginRight: 6 }} />
                    <span style={{ color: COLORS.textPrimary, fontSize: 12, fontWeight: 600 }}>路线预览</span>
                  </div>
                  <div style={{ flex: 1, minHeight: 160 }}>
                    <ReactECharts
                      option={miniMapOption}
                      style={{ height: 170, width: '100%' }}
                      opts={{ renderer: 'canvas' }}
                      notMerge
                    />
                  </div>
                </div>

                {/* Progress + Timeline */}
                <div style={{
                  borderRadius: 12, border: `1px solid ${COLORS.border}`,
                  background: 'rgba(10, 17, 40, 0.5)', padding: 14,
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: COLORS.textPrimary, fontSize: 12, fontWeight: 600 }}>赛事进度</span>
                      <span style={{ color: statusColor, fontSize: 13, fontWeight: 700 }}>{race.progress}%</span>
                    </div>
                    <Progress
                      percent={race.progress}
                      showInfo={false}
                      strokeColor={{ from: COLORS.accentCyan, to: '#ff4d4f' }}
                      style={{ height: 6, borderRadius: 3 }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { label: '集鸽上笼', time: startTime.slice(5), icon: <SendOutlined />, done: true, color: COLORS.accentCyan },
                      { label: '比赛开飞', time: startTime.slice(5), icon: <RocketOutlined />, done: race.progress > 20, color: COLORS.accentGold },
                      { label: '飞行进行', time: '进行中', icon: <ThunderboltOutlined />, done: race.progress > 50, color: '#fa8c16', active: true },
                      { label: '预计归巢', time: estimatedReturn, icon: <FlagOutlined />, done: false, color: '#ff4d4f' },
                    ].map((step, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                          background: step.active ? step.color : step.done ? step.color + '40' : `${COLORS.border}`,
                          border: `2px solid ${step.done || step.active ? step.color : COLORS.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, color: step.active ? '#fff' : step.done ? step.color : COLORS.textSecondary,
                          boxShadow: step.active ? `0 0 8px ${step.color}80` : 'none',
                        }}>
                          {step.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, color: step.done || step.active ? COLORS.textPrimary : COLORS.textSecondary, fontWeight: step.active ? 600 : 400 }}>
                            {step.label}
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: COLORS.textSecondary }}>{step.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Detailed Info Section */}
              <div style={{
                padding: '8px 24px 16px',
              }}>
                <div style={{
                  borderRadius: 12, border: `1px solid ${COLORS.border}`,
                  background: 'rgba(10, 17, 40, 0.4)', padding: 16,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ width: 3, height: 12, background: COLORS.accentGold, borderRadius: 2, marginRight: 6 }} />
                    <span style={{ color: COLORS.textPrimary, fontSize: 13, fontWeight: 600 }}>详细信息</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px 16px' }}>
                    {[
                      { icon: <ApartmentOutlined />, label: '组织单位', value: race.club ?? '—' },
                      { icon: <ClockCircleOutlined />, label: '开赛时间', value: startTime },
                      { icon: <FlagOutlined />, label: '预计归巢', value: estimatedReturn },
                      { icon: <AimOutlined />, label: '比赛距离', value: `${distanceKm} 公里` },
                      { icon: <SafetyCertificateOutlined />, label: '赛事级别', value: raceLevel },
                      { icon: <FundOutlined />, label: '积分奖励', value: `${points} 分` },
                      { icon: <TeamOutlined />, label: '参赛羽数', value: `${participants.toLocaleString()} 羽` },
                      { icon: <StockOutlined />, label: '剩余羽数', value: `${(race.totalCount - race.returnedCount).toLocaleString()} 羽` },
                      { icon: <ShareAltOutlined />, label: '涉及省份', value: race.provinces?.join('、') ?? '—' },
                    ].map((item, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 0',
                      }}>
                        <span style={{ color: COLORS.accentCyan, fontSize: 14 }}>{item.icon}</span>
                        <span style={{ fontSize: 11, color: COLORS.textSecondary, minWidth: 64 }}>{item.label}</span>
                        <span style={{ fontSize: 12, color: COLORS.textPrimary, fontWeight: 500, flex: 1, textAlign: 'right' }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div style={{
                padding: '14px 24px',
                background: 'rgba(10, 17, 40, 0.6)',
                borderTop: `1px solid ${COLORS.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => {
                      const data = JSON.stringify(race, null, 2);
                      const blob = new Blob([data], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = `${race.name}-详情.json`; a.click();
                      URL.revokeObjectURL(url);
                    }}
                    style={{ background: 'transparent', borderColor: COLORS.border, color: COLORS.textSecondary }}
                  >
                    导出数据
                  </Button>
                  <Button
                    size="small"
                    icon={<ShareAltOutlined />}
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(`${race.name}: ${race.location} (${race.progress}%)`);
                      }
                    }}
                    style={{ background: 'transparent', borderColor: COLORS.border, color: COLORS.textSecondary }}
                  >
                    分享赛事
                  </Button>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Button onClick={() => setDetailModalOpen(false)} style={{ background: 'transparent', borderColor: COLORS.border, color: COLORS.textSecondary }}>
                    关闭
                  </Button>
                  <Button
                    type="primary"
                    onClick={() => {
                      handleFlylineHighlight(race);
                      setDetailModalOpen(false);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #ff4d4f, #ff7a45)',
                      borderColor: '#ff4d4f',
                      color: '#fff',
                      fontWeight: 600,
                      boxShadow: '0 2px 8px rgba(255, 77, 79, 0.3)',
                    }}
                    icon={<FireOutlined />}
                  >
                    在地图上高亮飞线
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Pigeon Detail Modal */}
      <Modal
        open={pigeonDetailOpen}
        onCancel={() => setPigeonDetailOpen(false)}
        footer={null}
        width={680}
        centered
        destroyOnClose
        styles={{
          mask: { background: 'rgba(0, 0, 0, 0.75)' },
          content: { background: 'transparent', boxShadow: 'none', padding: 0 },
          body: { padding: 0 },
        }}
        closable
      >
        {selectedPigeon && (() => {
          const p = selectedPigeon;
          const isAnomaly = p.isAnomaly;
          const statusColor = isAnomaly ? '#ff4d4f' : p.status === 'returning' ? '#fa8c16' : '#52c41a';
          const progressVal = p.status === 'returned' ? 100 : p.status === 'returning' ? 75 : 45;

          // Build trajectory points (simulated path)
          const trackPoints: [number, number][] = [];
          if (p.coord) {
            // Simulated track: simple curved path showing movement
            trackPoints.push([p.coord[0] - 2, p.coord[1] - 1]);
            trackPoints.push([p.coord[0] - 1.2, p.coord[1] - 0.5]);
            trackPoints.push([p.coord[0] - 0.5, p.coord[1] + 0.2]);
            trackPoints.push(p.coord);
          }

          const miniMapOption: echarts.EChartsOption = {
            backgroundColor: 'transparent',
            geo: {
              map: 'china',
              roam: false,
              zoom: 4,
              center: p.coord ?? [108, 34],
              itemStyle: { areaColor: '#1a2332', borderColor: '#2a3a5a', borderWidth: 0.5 },
              emphasis: { itemStyle: { areaColor: '#0a1128' }, label: { show: false } },
              silent: true,
            },
            series: [
              {
                type: 'lines',
                coordinateSystem: 'geo',
                zlevel: 10,
                effect: { show: true, period: 1.5, trailLength: 0.6, symbol: 'arrow', symbolSize: 5, color: statusColor },
                lineStyle: { color: statusColor, width: 2, opacity: 0.8, curveness: 0.3 },
                data: [{ coords: trackPoints }],
              },
              {
                type: 'effectScatter',
                coordinateSystem: 'geo',
                zlevel: 11,
                symbolSize: 16,
                rippleEffect: { brushType: 'stroke', scale: 6, period: 1.5 },
                itemStyle: { color: statusColor, shadowBlur: 15, shadowColor: statusColor },
                label: { show: true, position: 'top', formatter: '当前位置', color: '#fff', fontSize: 10, fontWeight: 600 },
                data: p.coord ? [{ name: p.currentPosition, value: [...p.coord, p.altitude] }] : [],
              },
            ],
          };

          return (
            <div style={{
              background: `linear-gradient(165deg, ${COLORS.bgCard} 0%, #0d1525 50%, ${COLORS.bgCard} 100%)`,
              borderRadius: 16, border: `1px solid ${COLORS.border}`, overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{
                padding: '20px 24px 16px',
                background: `linear-gradient(135deg, ${isAnomaly ? 'rgba(255,77,79,0.1)' : COLORS.accentCyan + '15'} 0%, ${COLORS.accentGold}10 100%)`,
                borderBottom: `1px solid ${COLORS.border}`,
                position: 'relative',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {p.photo ? (
                    <img
                      src={p.photo}
                      alt={p.ringNumber}
                      style={{
                        width: 56, height: 56, borderRadius: 14,
                        objectFit: 'cover',
                        border: `2px solid ${isAnomaly ? '#ff4d4f' : COLORS.accentCyan}`,
                        boxShadow: `0 4px 20px ${(isAnomaly ? '#ff4d4f' : COLORS.accentCyan)}40`,
                        backgroundColor: COLORS.bgCard,
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 56, height: 56, borderRadius: 14,
                      background: `linear-gradient(135deg, ${isAnomaly ? '#ff4d4f' : COLORS.accentCyan}, ${COLORS.accentGold})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 4px 20px ${(isAnomaly ? '#ff4d4f' : COLORS.accentCyan)}40`,
                    }}>
                      🐦
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: COLORS.textPrimary, fontFamily: 'monospace' }}>
                        {p.ringNumber}
                      </h3>
                      <Tag color={isAnomaly ? 'red' : p.status === 'returning' ? 'orange' : 'green'}
                        icon={isAnomaly ? <FireOutlined /> : p.status === 'flying' ? <ThunderboltOutlined /> : <CheckCircleOutlined />}
                        style={{ margin: 0, fontSize: 11, fontWeight: 600 }}
                      >
                        {isAnomaly ? '异常' : statusLabelMap[p.status]}
                      </Tag>
                      <Tag style={{ margin: 0, fontSize: 11 }}>{p.gender} · {p.breed}</Tag>
                    </div>
                    <div style={{ fontSize: 12, color: COLORS.textSecondary }}>
                      <ApartmentOutlined /> {p.owner} · {p.loft}
                    </div>
                  </div>
                </div>

                {/* Status Progress Bar */}
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: COLORS.textSecondary }}>飞行状态</span>
                    <span style={{ fontSize: 12, color: statusColor, fontWeight: 600 }}>{progressVal}%</span>
                  </div>
                  <Progress
                    percent={progressVal}
                    showInfo={false}
                    strokeColor={{ from: COLORS.accentCyan, to: statusColor }}
                    style={{ height: 5, borderRadius: 3 }}
                  />
                </div>
              </div>

              {/* Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '14px 24px' }}>
                {[
                  { label: '飞行速度', value: `${p.speed}`, unit: 'km/h', icon: <ThunderboltOutlined />, color: statusColor },
                  { label: '当前高度', value: `${p.altitude}`, unit: '米', icon: <RiseOutlined />, color: COLORS.accentGold },
                  { label: '预计归巢', value: p.etaMinutes !== undefined ? `${p.etaMinutes}` : '—', unit: '分钟', icon: <ClockCircleOutlined />, color: p.etaMinutes !== undefined && p.etaMinutes > 120 ? '#ff4d4f' : COLORS.accentCyan },
                ].map((m, i) => (
                  <div key={i} style={{
                    padding: '10px 12px', borderRadius: 10,
                    background: `linear-gradient(135deg, rgba(26,35,50,0.9), rgba(13,21,37,0.9))`,
                    border: `1px solid ${COLORS.border}`, position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: m.color, borderRadius: '0 2px 2px 0' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ color: m.color, fontSize: 13 }}>{m.icon}</span>
                      <span style={{ fontSize: 10, color: COLORS.textSecondary }}>{m.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                      <span style={{ fontSize: 20, fontWeight: 700, color: COLORS.textPrimary }}>{m.value}</span>
                      <span style={{ fontSize: 10, color: COLORS.textSecondary }}>{m.unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Map + Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 24px 14px' }}>
                <div style={{ borderRadius: 12, border: `1px solid ${COLORS.border}`, padding: 10, background: 'rgba(10,17,40,0.5)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ width: 3, height: 10, background: statusColor, borderRadius: 2, marginRight: 6 }} />
                    <span style={{ color: COLORS.textPrimary, fontSize: 11, fontWeight: 600 }}>实时轨迹</span>
                  </div>
                  <ReactECharts option={miniMapOption} style={{ height: 160, width: '100%' }} opts={{ renderer: 'canvas' }} notMerge />
                </div>
                <div style={{ borderRadius: 12, border: `1px solid ${COLORS.border}`, padding: 12, background: 'rgba(10,17,40,0.5)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ width: 3, height: 10, background: COLORS.accentGold, borderRadius: 2, marginRight: 6 }} />
                    <span style={{ color: COLORS.textPrimary, fontSize: 11, fontWeight: 600 }}>鸽子档案</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                      { icon: <ApartmentOutlined />, label: '所属公棚', value: p.loft ?? '—' },
                      { icon: <TeamOutlined />, label: '鸽主', value: p.owner ?? '—' },
                      { icon: <FlagOutlined />, label: '当前位置', value: p.currentPosition },
                      { icon: <SendOutlined />, label: '开赛时间', value: p.startTime ?? '—' },
                      { icon: <AimOutlined />, label: '飞行距离', value: p.distance ? `${p.distance} 公里` : '—' },
                    ].map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', fontSize: 11 }}>
                        <span style={{ color: COLORS.accentCyan, width: 18 }}>{item.icon}</span>
                        <span style={{ color: COLORS.textSecondary, width: 60 }}>{item.label}</span>
                        <span style={{ color: COLORS.textPrimary, fontWeight: 500, flex: 1, textAlign: 'right' }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div style={{ padding: '0 24px 14px' }}>
                <div style={{ borderRadius: 12, border: `1px solid ${COLORS.border}`, padding: 12, background: 'rgba(10,17,40,0.5)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ width: 3, height: 10, background: COLORS.accentCyan, borderRadius: 2, marginRight: 6 }} />
                    <span style={{ color: COLORS.textPrimary, fontSize: 11, fontWeight: 600 }}>飞行时间线</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
                    {[
                      { label: '集鸽', time: p.startTime ?? '—', done: true, color: COLORS.accentCyan },
                      { label: '开飞', time: p.startTime ?? '—', done: progressVal > 10, color: COLORS.accentGold },
                      { label: '飞行中', time: `${p.speed} km/h`, done: progressVal > 30, active: p.status === 'flying', color: '#fa8c16' },
                      { label: '归巢中', time: p.status === 'returning' ? '进行中' : '待归巢', done: progressVal > 60, active: p.status === 'returning', color: '#1890ff' },
                      { label: '已归巢', time: p.status === 'returned' ? '已完成' : '预计 ' + (p.etaMinutes ?? '—') + ' 分', done: p.status === 'returned', color: '#52c41a' },
                    ].map((step, idx) => (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' }}>
                        {idx > 0 && (
                          <div style={{
                            position: 'absolute', top: 10, left: '-50%', width: '100%', height: 2,
                            background: step.done ? step.color : `${COLORS.border}`,
                          }} />
                        )}
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%',
                          background: step.active ? step.color : step.done ? step.color + '60' : COLORS.border,
                          border: `2px solid ${step.done || step.active ? step.color : COLORS.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, color: step.active ? '#fff' : step.done ? step.color : COLORS.textSecondary,
                          zIndex: 1,
                        }}>
                          {idx + 1}
                        </div>
                        <div style={{ fontSize: 10, color: step.done || step.active ? COLORS.textPrimary : COLORS.textSecondary, marginTop: 4, fontWeight: step.active ? 600 : 400 }}>
                          {step.label}
                        </div>
                        <div style={{ fontSize: 9, color: COLORS.textSecondary }}>{step.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{
                padding: '12px 24px', background: 'rgba(10,17,40,0.6)',
                borderTop: `1px solid ${COLORS.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
              }}>
                <Button onClick={() => setPigeonDetailOpen(false)} style={{ background: 'transparent', borderColor: COLORS.border, color: COLORS.textSecondary }}>
                  关闭
                </Button>
                <Button
                  type="primary"
                  onClick={() => { handlePigeonTrack(p); setPigeonDetailOpen(false); }}
                  style={{
                    background: 'linear-gradient(135deg, ' + (isAnomaly ? '#ff4d4f' : COLORS.accentCyan) + ', ' + (isAnomaly ? '#ff7a45' : COLORS.accentGold) + ')',
                    borderColor: isAnomaly ? '#ff4d4f' : COLORS.accentCyan, color: COLORS.bgPrimary, fontWeight: 600,
                  }}
                  icon={<AimOutlined />}
                >
                  在地图上追踪
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

export default DataCenter;