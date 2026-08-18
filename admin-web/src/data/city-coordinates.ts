// 中国主要城市坐标数据（经度,纬度）
export interface CityCoordinate {
  name: string;
  lng: number;
  lat: number;
  province?: string;
}

export const CITY_COORDINATES: CityCoordinate[] = [
  // 直辖市
  { name: '北京', lng: 116.4074, lat: 39.9043, province: '北京' },
  { name: '上海', lng: 121.4737, lat: 31.2304, province: '上海' },
  { name: '天津', lng: 117.2010, lat: 39.0842, province: '天津' },
  { name: '重庆', lng: 106.5516, lat: 29.5630, province: '重庆' },

  // 华北地区
  { name: '石家庄', lng: 114.5149, lat: 38.0428, province: '河北' },
  { name: '唐山', lng: 118.1802, lat: 39.6309, province: '河北' },
  { name: '保定', lng: 115.4646, lat: 38.8767, province: '河北' },
  { name: '太原', lng: 112.5489, lat: 37.8706, province: '山西' },
  { name: '大同', lng: 113.2917, lat: 40.0941, province: '山西' },
  { name: '呼和浩特', lng: 111.7519, lat: 40.8414, province: '内蒙古' },
  { name: '包头', lng: 109.8403, lat: 40.6567, province: '内蒙古' },

  // 东北地区
  { name: '沈阳', lng: 123.4315, lat: 41.8057, province: '辽宁' },
  { name: '大连', lng: 121.6147, lat: 38.9140, province: '辽宁' },
  { name: '长春', lng: 125.3245, lat: 43.8868, province: '吉林' },
  { name: '哈尔滨', lng: 126.5349, lat: 45.8038, province: '黑龙江' },

  // 华东地区
  { name: '南京', lng: 118.7969, lat: 32.0603, province: '江苏' },
  { name: '苏州', lng: 120.5853, lat: 31.2990, province: '江苏' },
  { name: '杭州', lng: 120.1551, lat: 30.2741, province: '浙江' },
  { name: '宁波', lng: 121.5498, lat: 29.8683, province: '浙江' },
  { name: '合肥', lng: 117.2272, lat: 31.8206, province: '安徽' },
  { name: '福州', lng: 119.2965, lat: 26.0745, province: '福建' },
  { name: '厦门', lng: 118.0894, lat: 24.4798, province: '福建' },
  { name: '南昌', lng: 115.8921, lat: 28.6765, province: '江西' },
  { name: '济南', lng: 117.1201, lat: 36.6512, province: '山东' },
  { name: '青岛', lng: 120.3826, lat: 36.0671, province: '山东' },
  { name: '烟台', lng: 121.4580, lat: 37.4638, province: '山东' },
  { name: '淄博', lng: 118.0548, lat: 36.8131, province: '山东' },

  // 华中地区
  { name: '郑州', lng: 113.6253, lat: 34.7466, province: '河南' },
  { name: '洛阳', lng: 112.4540, lat: 34.6197, province: '河南' },
  { name: '武汉', lng: 114.3055, lat: 30.5928, province: '湖北' },
  { name: '宜昌', lng: 111.2865, lat: 30.6919, province: '湖北' },
  { name: '长沙', lng: 112.9389, lat: 28.2278, province: '湖南' },

  // 华南地区
  { name: '广州', lng: 113.2644, lat: 23.1292, province: '广东' },
  { name: '深圳', lng: 114.0579, lat: 22.5431, province: '广东' },
  { name: '珠海', lng: 113.5767, lat: 22.2707, province: '广东' },
  { name: '东莞', lng: 113.7518, lat: 23.0208, province: '广东' },
  { name: '佛山', lng: 113.1220, lat: 23.0218, province: '广东' },
  { name: '南宁', lng: 108.3669, lat: 22.8170, province: '广西' },
  { name: '海口', lng: 110.1999, lat: 20.0442, province: '海南' },
  { name: '三亚', lng: 109.5119, lat: 18.2528, province: '海南' },

  // 西南地区
  { name: '成都', lng: 104.0665, lat: 30.5728, province: '四川' },
  { name: '绵阳', lng: 104.6796, lat: 31.4676, province: '四川' },
  { name: '德阳', lng: 104.3980, lat: 31.1280, province: '四川' },
  { name: '广元', lng: 105.8297, lat: 32.4333, province: '四川' },
  { name: '内江', lng: 105.0588, lat: 29.5802, province: '四川' },
  { name: '资阳', lng: 104.6274, lat: 30.1222, province: '四川' },
  { name: '乐山', lng: 103.7660, lat: 29.5521, province: '四川' },
  { name: '宜宾', lng: 104.6274, lat: 28.7513, province: '四川' },
  { name: '遵义', lng: 106.9073, lat: 27.7254, province: '贵州' },
  { name: '贵阳', lng: 106.6302, lat: 26.6477, province: '贵州' },
  { name: '昆明', lng: 102.8329, lat: 24.8801, province: '云南' },
  { name: '拉萨', lng: 91.1409, lat: 29.6500, province: '西藏' },

  // 西北地区
  { name: '西安', lng: 108.9398, lat: 34.3416, province: '陕西' },
  { name: '宝鸡', lng: 107.2337, lat: 34.3617, province: '陕西' },
  { name: '兰州', lng: 103.8343, lat: 36.0611, province: '甘肃' },
  { name: '西宁', lng: 101.7782, lat: 36.6171, province: '青海' },
  { name: '银川', lng: 106.2309, lat: 38.4872, province: '宁夏' },
  { name: '乌鲁木齐', lng: 87.6168, lat: 43.8256, province: '新疆' },

  // 特别行政区
  { name: '香港', lng: 114.1694, lat: 22.3193, province: '香港' },
  { name: '澳门', lng: 113.5439, lat: 22.1987, province: '澳门' },
  { name: '台北', lng: 121.5654, lat: 25.0330, province: '台湾' },
];

// 搜索城市
export function searchCities(keyword: string): CityCoordinate[] {
  if (!keyword) return [];
  const lower = keyword.toLowerCase();
  return CITY_COORDINATES.filter(
    (c) =>
      c.name.toLowerCase().includes(lower) ||
      (c.province && c.province.toLowerCase().includes(lower))
  ).slice(0, 10);
}

// 按名称获取城市
export function getCityByName(name: string): CityCoordinate | undefined {
  return CITY_COORDINATES.find((c) => c.name === name);
}
