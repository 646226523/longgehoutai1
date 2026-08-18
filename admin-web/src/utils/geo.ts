// Haversine 公式计算两点间距离(公里)
// 地球半径(km)
const EARTH_RADIUS = 6371;

export interface Point {
  lng: number;
  lat: number;
}

/**
 * 计算两点间大圆距离(Haversine公式)
 * @param start 起点经纬度
 * @param end 终点经纬度
 * @returns 距离(公里)
 */
export function calculateDistance(start: Point, end: Point): number {
  const dLat = ((end.lat - start.lat) * Math.PI) / 180;
  const dLng = ((end.lng - start.lng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((start.lat * Math.PI) / 180) *
      Math.cos((end.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS * c;
}

/**
 * 计算赛线总空距(起点 → 中途点们 → 终点)
 * @param start 起点
 * @param waypoints 中途点数组(可选)
 * @param end 终点
 * @returns 总空距(公里)
 */
export function calculateRouteDistance(
  start: Point,
  waypoints: Point[],
  end: Point
): number {
  let totalDistance = 0;
  let current = start;

  for (const wp of waypoints) {
    totalDistance += calculateDistance(current, wp);
    current = wp;
  }

  totalDistance += calculateDistance(current, end);
  return totalDistance;
}

/**
 * 估算鸽子飞行时间
 * @param distance 空距(公里)
 * @param avgSpeed 平均速度(米/分钟),默认1200m/min
 * @returns 飞行时间(小时)
 */
export function estimateFlightTime(distance: number, avgSpeed = 1200): number {
  // 距离转米,速度米/分钟,结果分钟转小时
  return (distance * 1000) / (avgSpeed * 60);
}

/**
 * 检查坐标是否在中国境内(大致范围)
 * 经度: 73°E ~ 135°E
 * 纬度: 18°N ~ 54°N
 */
export function isInChina(lng: number, lat: number): boolean {
  return lng >= 73 && lng <= 135 && lat >= 18 && lat <= 54;
}

/**
 * 检查起点终点是否相同
 */
export function isSamePoint(a: Point, b: Point, tolerance = 0.001): boolean {
  return Math.abs(a.lng - b.lng) < tolerance && Math.abs(a.lat - b.lat) < tolerance;
}
