import type { AuctionItem, RaceItem, FlightData } from '../types';
import { genTime } from '../constants';
import dayjs from 'dayjs';

import pigeonPhoto0 from '../pigeon-photo-0.jpg';
import pigeonPhoto1 from '../pigeon-photo-1.jpg';
import pigeonPhoto2 from '../pigeon-photo-2.jpg';
import pigeonPhoto3 from '../pigeon-photo-3.jpg';
import pigeonPhoto4 from '../pigeon-photo-4.jpg';
import pigeonPhoto5 from '../pigeon-photo-5.jpg';

export const pigeonPhotos = [pigeonPhoto0, pigeonPhoto1, pigeonPhoto2, pigeonPhoto3, pigeonPhoto4, pigeonPhoto5];

export const auctionTrendData = [
  { date: '08-11', value: 128.5 },
  { date: '08-12', value: 156.2 },
  { date: '08-13', value: 142.8 },
  { date: '08-14', value: 198.6 },
  { date: '08-15', value: 175.3 },
  { date: '08-16', value: 234.1 },
  { date: '08-17', value: 289.7 },
];


export const mockAuctions: AuctionItem[] = [
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


export const mockRaces: RaceItem[] = [
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


export const flightStatuses: FlightData['status'][] = ['flying', 'returning', 'returned'];


export function generateFlightData(): FlightData[] {
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
