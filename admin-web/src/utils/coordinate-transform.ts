import type { Point } from './geo';

// 标准坐标转换工具（高德官方 GCJ-02 算法）
// 统一约定：数据库与空距计算使用 WGS-84 坐标系
// 高德/腾讯地图使用 GCJ-02（火星坐标），百度地图使用 BD-09

const a = 6378245.0;
const ee = 0.00669342162296594323;
const x_pi = (3.141592653589793 * 3000.0) / 180.0;

/**
 * 判断经纬度是否超出中国范围（经度 73~135，纬度 18~54）
 */
function outOfChina(lng: number, lat: number): boolean {
  return lng < 73 || lng > 135 || lat < 18 || lat > 54;
}

/**
 * GCJ-02 偏移算法 - 纬度分量
 */
function transformLat(lng: number, lat: number): number {
  let ret =
    -100.0 +
    2.0 * lng +
    3.0 * lat +
    0.2 * lat * lat +
    0.1 * lng * lat +
    0.2 * Math.sqrt(Math.abs(lng));
  ret +=
    ((20.0 * Math.sin(6.0 * lng * Math.PI) +
      20.0 * Math.sin(2.0 * lng * Math.PI)) *
      2.0) /
    3.0;
  ret +=
    ((20.0 * Math.sin(lat * Math.PI) +
      40.0 * Math.sin((lat / 3.0) * Math.PI)) *
      2.0) /
    3.0;
  ret +=
    ((160.0 * Math.sin((lat / 12.0) * Math.PI) +
      320 * Math.sin((lat * Math.PI) / 30.0)) *
      2.0) /
    3.0;
  return ret;
}

/**
 * GCJ-02 偏移算法 - 经度分量
 */
function transformLng(lng: number, lat: number): number {
  let ret =
    300.0 +
    lng +
    2.0 * lat +
    0.1 * lng * lng +
    0.1 * lng * lat +
    0.1 * Math.sqrt(Math.abs(lng));
  ret +=
    ((20.0 * Math.sin(6.0 * lng * Math.PI) +
      20.0 * Math.sin(2.0 * lng * Math.PI)) *
      2.0) /
    3.0;
  ret +=
    ((20.0 * Math.sin(lng * Math.PI) +
      40.0 * Math.sin((lng / 3.0) * Math.PI)) *
      2.0) /
    3.0;
  ret +=
    ((150.0 * Math.sin((lng / 12.0) * Math.PI) +
      300.0 * Math.sin((lng / 30.0) * Math.PI)) *
      2.0) /
    3.0;
  return ret;
}

/**
 * WGS-84 → GCJ-02（高德/腾讯坐标）
 */
export function wgs84ToGcj02(lng: number, lat: number): Point {
  if (outOfChina(lng, lat)) {
    return { lng, lat };
  }
  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((a * (1 - ee)) / (magic * sqrtMagic)) * Math.PI);
  dLng = (dLng * 180.0) / ((a / sqrtMagic) * Math.cos(radLat) * Math.PI);
  return {
    lng: lng + dLng,
    lat: lat + dLat,
  };
}

/**
 * GCJ-02 → WGS-84（利用 wgs84ToGcj02 反算，近似值）
 */
export function gcj02ToWgs84(lng: number, lat: number): Point {
  if (outOfChina(lng, lat)) {
    return { lng, lat };
  }
  const g = wgs84ToGcj02(lng, lat);
  return {
    lng: lng * 2 - g.lng,
    lat: lat * 2 - g.lat,
  };
}

/**
 * GCJ-02 → BD-09（百度坐标）
 */
export function gcj02ToBd09(lng: number, lat: number): Point {
  const z = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * x_pi);
  const theta = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * x_pi);
  return {
    lng: z * Math.cos(theta) + 0.0065,
    lat: z * Math.sin(theta) + 0.006,
  };
}

/**
 * BD-09 → GCJ-02（百度坐标反算）
 */
export function bd09ToGcj02(lng: number, lat: number): Point {
  const x = lng - 0.0065;
  const y = lat - 0.006;
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * x_pi);
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * x_pi);
  return {
    lng: z * Math.cos(theta),
    lat: z * Math.sin(theta),
  };
}

/**
 * WGS-84 → BD-09（组合：先转 GCJ-02 再转 BD-09）
 */
export function wgs84ToBd09(lng: number, lat: number): Point {
  const g = wgs84ToGcj02(lng, lat);
  return gcj02ToBd09(g.lng, g.lat);
}

/**
 * BD-09 → WGS-84（组合：先转 GCJ-02 再转 WGS-84）
 */
export function bd09ToWgs84(lng: number, lat: number): Point {
  const g = bd09ToGcj02(lng, lat);
  return gcj02ToWgs84(g.lng, g.lat);
}
