import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Select, Spin, Tag } from 'antd';
import { AimOutlined, PlusOutlined } from '@ant-design/icons';
import { calculateRouteDistance, type Point } from '../utils/geo';
import {
  bd09ToWgs84,
  gcj02ToWgs84,
  wgs84ToBd09,
  wgs84ToGcj02,
} from '../utils/coordinate-transform';

/**
 * 真实国内地图选点组件（高德 / 百度 / 腾讯）
 *
 * 坐标约定：
 *  - 数据库与空距计算统一使用 WGS-84，对外回调一律输出 WGS-84
 *  - 高德 / 腾讯地图交互使用 GCJ-02（火星坐标），百度地图交互使用 BD-09
 *  - 展示标记时把传入的 WGS-84 点转换为厂商坐标系
 */

export type MapProvider = 'amap' | 'baidu' | 'tencent';
export type PickMode = 'start' | 'end' | 'waypoint' | 'none';

interface RealMapSelectorProps {
  provider: MapProvider;
  apiKey: string;
  startPoint?: Point | null;
  endPoint?: Point | null;
  waypoints?: Point[];
  startAddress?: string;
  endAddress?: string;
  onStartPointChange: (point: Point | null) => void;
  onEndPointChange: (point: Point | null) => void;
  onWaypointsChange: (waypoints: Point[]) => void;
  onStartAddressChange?: (addr: string) => void;
  onEndAddressChange?: (addr: string) => void;
  // 内部失败时回调，供上层回退到 SVG 地图
  onLoadError?: (message: string) => void;
}

// ---------- SDK 全局对象名 ----------
const SDK_GLOBAL: Record<MapProvider, string> = {
  amap: 'AMap',
  baidu: 'BMapGL',
  tencent: 'TMap',
};

function getSdkGlobal(provider: MapProvider): any {
  return (window as any)[SDK_GLOBAL[provider]];
}

function getSdkScriptSrc(provider: MapProvider, apiKey: string): string {
  if (provider === 'amap') {
    return `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(apiKey)}`;
  }
  if (provider === 'baidu') {
    return `https://api.map.baidu.com/api?type=webgl&v=1.0&ak=${encodeURIComponent(apiKey)}`;
  }
  return `https://map.qq.com/api/gljs?v=1.exp&key=${encodeURIComponent(apiKey)}&libraries=service`;
}

// 已加载/加载中的 SDK 缓存，避免重复注入
const sdkCache = new Map<MapProvider, Promise<void>>();

/**
 * 动态加载地图 SDK（script 注入 + Promise 解析）
 * - 若 window 上已存在对应全局对象则直接 resolve
 * - 否则注入 script，onload resolve、onerror reject
 */
function loadMapSDK(provider: MapProvider, apiKey: string): Promise<void> {
  if (getSdkGlobal(provider)) return Promise.resolve();
  const cached = sdkCache.get(provider);
  if (cached) return cached;
  const promise = injectScript(provider, apiKey);
  sdkCache.set(provider, promise);
  return promise;
}

function injectScript(provider: MapProvider, apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = getSdkScriptSrc(provider, apiKey);
    script.async = true;
    script.setAttribute('data-map-sdk', provider);
    script.onload = () => {
      if (getSdkGlobal(provider)) {
        resolve();
      } else {
        sdkCache.delete(provider);
        reject(new Error('地图 SDK 加载失败，请检查 API Key 是否正确'));
      }
    };
    script.onerror = () => {
      sdkCache.delete(provider);
      reject(new Error('地图 SDK 加载失败，请检查网络或 API Key 是否正确'));
    };
    document.head.appendChild(script);
  });
}

// 高德地图插件加载（PlaceSearch/Geocoder/Scale/ToolBar 等）
function loadAmapPlugins(AMap: any, plugins: string[]): Promise<void> {
  return new Promise((resolve) => {
    try {
      AMap.plugin(plugins, () => resolve());
    } catch {
      resolve();
    }
  });
}

// ---------- 地图实例创建 / 控件 ----------
let mapContainerEl: HTMLElement | null = null;

function createMap(container: HTMLElement, provider: MapProvider): any {
  mapContainerEl = container;
  if (provider === 'amap') {
    const AMap = (window as any).AMap;
    return new AMap.Map(container, { zoom: 6, center: [105, 35], viewMode: '2D' });
  }
  if (provider === 'baidu') {
    const BMapGL = (window as any).BMapGL;
    const map = new BMapGL.Map(container);
    map.centerAndZoom(new BMapGL.Point(105, 35), 6);
    return map;
  }
  const TMap = (window as any).TMap;
  return new TMap.Map(container, { zoom: 6, center: new TMap.LatLng(35, 105) });
}

function addControls(map: any, provider: MapProvider): void {
  try {
    if (provider === 'amap') {
      const AMap = (window as any).AMap;
      map.addControl(new AMap.Scale());
      map.addControl(new AMap.ToolBar({ position: 'RB' }));
    } else if (provider === 'baidu') {
      const BMapGL = (window as any).BMapGL;
      map.addControl(new BMapGL.ScaleControl());
      map.addControl(new BMapGL.NavigationControl3D({ anchor: BMapGL.ANCHOR_BOTTOM_RIGHT }));
    }
    // tencent：使用默认控件（缩放/平移），滚轮缩放默认开启
  } catch {
    /* 控件添加失败不影响地图使用 */
  }
}

// ---------- 坐标转换（WGS-84 ⇄ 厂商坐标系） ----------
function toVendorCoords(provider: MapProvider, p: Point): any {
  if (provider === 'baidu') {
    const bd = wgs84ToBd09(p.lng, p.lat);
    const BMapGL = (window as any).BMapGL;
    return new BMapGL.Point(bd.lng, bd.lat);
  }
  const g = wgs84ToGcj02(p.lng, p.lat);
  if (provider === 'amap') {
    const AMap = (window as any).AMap;
    return new AMap.LngLat(g.lng, g.lat);
  }
  const TMap = (window as any).TMap;
  return new TMap.LatLng(g.lat, g.lng); // 腾讯 LatLng 参数顺序为 (lat, lng)
}

function fromVendorCoords(provider: MapProvider, vendorPos: any): Point {
  let lng: number;
  let lat: number;
  try {
    if (provider === 'amap') {
      lng = typeof vendorPos.getLng === 'function' ? vendorPos.getLng() : Array.isArray(vendorPos) ? vendorPos[0] : vendorPos.lng;
      lat = typeof vendorPos.getLat === 'function' ? vendorPos.getLat() : Array.isArray(vendorPos) ? vendorPos[1] : vendorPos.lat;
      const g = gcj02ToWgs84(lng, lat);
      return { lng: g.lng, lat: g.lat };
    }
    if (provider === 'baidu') {
      lng = vendorPos.lng;
      lat = vendorPos.lat;
      const w = bd09ToWgs84(lng, lat);
      return { lng: w.lng, lat: w.lat };
    }
    lng = vendorPos.lng;
    lat = vendorPos.lat;
    const g2 = gcj02ToWgs84(lng, lat);
    return { lng: g2.lng, lat: g2.lat };
  } catch {
    return { lng: 0, lat: 0 };
  }
}

function getVendorLngLat(provider: MapProvider, vendorPos: any): [number, number] {
  try {
    if (provider === 'amap') {
      const lng = typeof vendorPos.getLng === 'function' ? vendorPos.getLng() : Array.isArray(vendorPos) ? vendorPos[0] : vendorPos.lng;
      const lat = typeof vendorPos.getLat === 'function' ? vendorPos.getLat() : Array.isArray(vendorPos) ? vendorPos[1] : vendorPos.lat;
      return [lng, lat];
    }
    return [vendorPos.lng, vendorPos.lat];
  } catch {
    return [0, 0];
  }
}

function roundPoint(p: Point): Point {
  return { lng: Number(p.lng.toFixed(4)), lat: Number(p.lat.toFixed(4)) };
}

// ---------- 标记 / 折线 ----------
function markerHtml(label: string, color: string): string {
  const labelHtml = label
    ? `<div style="background:${color};color:#fff;font-size:12px;line-height:18px;padding:0 6px;border-radius:9px;white-space:nowrap;margin-bottom:2px;">${label}</div>`
    : '';
  // 小旗子标记：旗杆 + 三角小旗 + 底座
  return `<div style="display:flex;flex-direction:column;align-items:center;">${labelHtml}<svg width="30" height="44" viewBox="0 0 30 44" xmlns="http://www.w3.org/2000/svg"><line x1="11" y1="6" x2="11" y2="42" stroke="#4a4a4a" stroke-width="2" stroke-linecap="round"/><path d="M11 6 L26 11 L11 16 Z" fill="${color}" stroke="#ffffff" stroke-width="1"/><circle cx="11" cy="42" r="3.5" fill="#ffffff" stroke="${color}" stroke-width="1.6"/></svg></div>`;
}

function createBaiduIcon(BMapGL: any, color: string): any {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="44" viewBox="0 0 30 44"><line x1="11" y1="6" x2="11" y2="42" stroke="#4a4a4a" stroke-width="2" stroke-linecap="round"/><path d="M11 6 L26 11 L11 16 Z" fill="${color}" stroke="#ffffff" stroke-width="1"/><circle cx="11" cy="42" r="3.5" fill="#ffffff" stroke="${color}" stroke-width="1.6"/></svg>`;
  return new BMapGL.Icon(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, new BMapGL.Size(30, 44), {
    anchor: new BMapGL.Size(15, 44),
    imageSize: new BMapGL.Size(30, 44),
  });
}

// 腾讯 GL JS 无独立 TMap.Marker 构造，MultiMarker 不支持自定义拖拽。
// 正确做法：继承 TMap.DOMOverlay 抽象基类，实现自定义 DOM 标记（小旗子）并支持拖拽。
function createTencentDomMarker(
  map: any,
  vendorPos: any,
  color: string,
  label: string,
  onDragEnd: (vendorPos: any) => void
): any {
  const TMap = (window as any).TMap;

  let marker: any;
  let dom: HTMLElement | null = null;
  let dragging = false;
  let currentLatLng = vendorPos;

  // 自定义 DOM 标记类，继承官方抽象基类 TMap.DOMOverlay
  const FlagMarker: any = function (this: any, options: any) {
    TMap.DOMOverlay.call(this, options);
  };
  FlagMarker.prototype = Object.create(TMap.DOMOverlay.prototype);
  FlagMarker.prototype.constructor = FlagMarker;

  FlagMarker.prototype.onInit = function (options: any) {
    this._position = options.position;
    this._color = options.color;
    this._label = options.label;
    this._onDragEnd = options.onDragEnd;
  };

  // 构造时调用：创建小旗子 DOM 元素
  FlagMarker.prototype.createDOM = function (): HTMLElement {
    dom = document.createElement('div');
    dom.innerHTML = markerHtml(this._label, this._color);
    dom.style.position = 'absolute';
    dom.style.transform = 'translate(-50%, -100%)'; // 以旗杆底部为锚点
    dom.style.cursor = 'grab';
    dom.style.userSelect = 'none';
    dom.style.webkitUserSelect = 'none';
    dom.style.zIndex = '100';

    const onDown = (e: MouseEvent) => {
      e.preventDefault();
      dragging = true;
      if (dom) dom.style.cursor = 'grabbing';
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };

    const onMove = (e: MouseEvent) => {
      if (!dragging || !mapContainerEl) return;
      const rect = mapContainerEl.getBoundingClientRect();
      const ll = map.unprojectFromContainer(new TMap.Point(e.clientX - rect.left, e.clientY - rect.top));
      if (ll && typeof ll.lat === 'number' && typeof ll.lng === 'number') {
        currentLatLng = ll;
        this._position = ll;
        this.updateDOM();
      }
    };

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      if (dom) dom.style.cursor = 'grab';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (this._onDragEnd) this._onDragEnd(currentLatLng);
    };

    dom.addEventListener('mousedown', onDown);
    this._cleanupListeners = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    return dom;
  };

  // 地图平移缩放时调用：同步小旗子位置
  FlagMarker.prototype.updateDOM = function () {
    if (!dom || !this._position || typeof map.projectToContainer !== 'function') return;
    const proj = map.projectToContainer(this._position);
    dom.style.left = proj.x + 'px';
    dom.style.top = proj.y + 'px';
  };

  // 对外接口：更新位置
  FlagMarker.prototype.setPosition = function (pos: any) {
    this._position = pos;
    currentLatLng = pos;
    this.updateDOM();
  };

  // 对外接口：获取位置
  FlagMarker.prototype.getPosition = function () {
    return this._position;
  };

  FlagMarker.prototype.onDestroy = function () {
    if (this._cleanupListeners) this._cleanupListeners();
    dom = null;
  };

  marker = new FlagMarker({
    map,
    position: vendorPos,
    color,
    label,
    onDragEnd,
  });

  // 构造时已通过 options.map 挂载到地图，首次定位小旗子
  marker.updateDOM();

  // 供 clearOverlays 清理
  (marker as any)._cleanup = () => {
    try {
      marker.destroy();
    } catch {
      // ignore
    }
  };

  return marker;
}

function createMarker(
  provider: MapProvider,
  map: any,
  vendorPos: any,
  color: string,
  label: string,
  onDragEnd: (vendorPos: any) => void
): any {
  try {
    if (provider === 'amap') {
      const AMap = (window as any).AMap;
      const marker = new AMap.Marker({
        position: vendorPos,
        anchor: 'bottom-center',
        content: markerHtml(label, color),
        draggable: true,
      });
      marker.on('dragend', () => onDragEnd(marker.getPosition()));
      map.add(marker);
      return marker;
    }
    if (provider === 'baidu') {
      const BMapGL = (window as any).BMapGL;
      const marker = new BMapGL.Marker(vendorPos, { enableDragging: true });
      marker.setIcon(createBaiduIcon(BMapGL, color));
      try {
        const label2 = new BMapGL.Label(label || '', {
          position: vendorPos,
          offset: new BMapGL.Size(-16, -30),
        });
        label2.setStyle({
          color: '#fff',
          fontSize: '12px',
          backgroundColor: color,
          border: 'none',
          padding: '0 6px',
          borderRadius: '9px',
          lineHeight: '18px',
          whiteSpace: 'nowrap',
        });
        marker.setLabel(label2);
      } catch {
        /* 标签添加失败不影响标记 */
      }
      marker.addEventListener('dragend', () => onDragEnd(marker.getPosition()));
      map.addOverlay(marker);
      return marker;
    }
    return createTencentDomMarker(map, vendorPos, color, label, onDragEnd);
  } catch {
    return null;
  }
}

function createPolyline(provider: MapProvider, map: any, vendorPoints: any[]): any {
  try {
    if (provider === 'amap') {
      const AMap = (window as any).AMap;
      const polyline = new AMap.Polyline({
        path: vendorPoints,
        strokeColor: '#1890ff',
        strokeWeight: 3,
        strokeOpacity: 0.85,
        strokeStyle: 'dashed',
      });
      map.add(polyline);
      return polyline;
    }
    if (provider === 'baidu') {
      const BMapGL = (window as any).BMapGL;
      const polyline = new BMapGL.Polyline(vendorPoints, {
        strokeColor: '#1890ff',
        strokeWeight: 4,
        strokeOpacity: 0.85,
        strokeStyle: 'dashed',
      });
      map.addOverlay(polyline);
      return polyline;
    }
    const TMap = (window as any).TMap;
    const polyline = new TMap.MultiPolyline({
      map,
      styles: {
        route: new TMap.PolylineStyle({
          color: '#1890ff',
          width: 4,
          lineDash: [8, 4],
        }),
      },
      geometries: [
        {
          id: 'route',
          styleId: 'route',
          paths: vendorPoints,
        },
      ],
    });
    return polyline;
  } catch {
    return null;
  }
}

function fitToPoints(provider: MapProvider, map: any, vendorPoints: any[]): void {
  if (!vendorPoints.length) return;
  try {
    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;
    vendorPoints.forEach((p) => {
      const [lng, lat] = getVendorLngLat(provider, p);
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });
    if (minLng > maxLng || minLat > maxLat) return;
    if (provider === 'amap') {
      const AMap = (window as any).AMap;
      const bounds = new AMap.Bounds(new AMap.LngLat(minLng, minLat), new AMap.LngLat(maxLng, maxLat));
      map.setBounds(bounds);
    } else if (provider === 'baidu') {
      map.setViewport(vendorPoints, { margin: [40, 40, 40, 40] });
    } else {
      const TMap = (window as any).TMap;
      const bounds = new TMap.LatLngBounds(new TMap.LatLng(minLat, minLng), new TMap.LatLng(maxLat, maxLng));
      map.fitBounds(bounds, { padding: 40 });
    }
  } catch {
    /* 自适应视野失败不影响功能 */
  }
}

function panTo(provider: MapProvider, map: any, vendorPos: any): void {
  try {
    if (provider === 'amap') {
      map.setZoomAndCenter(14, vendorPos);
    } else if (provider === 'baidu') {
      map.centerAndZoom(vendorPos, 14);
    } else {
      map.setCenter(vendorPos);
      map.setZoom(14);
    }
  } catch {
    /* 定位失败忽略 */
  }
}

// ---------- 逆地理编码 ----------
function reverseGeocode(provider: MapProvider, vendorPos: any): Promise<string | undefined> {
  if (provider === 'amap') {
    const AMap = (window as any).AMap;
    return new Promise((resolve) => {
      try {
        const geocoder = new AMap.Geocoder();
        const lnglat = Array.isArray(vendorPos) ? vendorPos : [vendorPos.getLng(), vendorPos.getLat()];
        geocoder.getAddress(lnglat, (status: any, result: any) => {
          try {
            resolve(status === 'complete' && result?.regeocode?.formattedAddress ? result.regeocode.formattedAddress : undefined);
          } catch {
            resolve(undefined);
          }
        });
      } catch {
        resolve(undefined);
      }
    });
  }
  if (provider === 'baidu') {
    const BMapGL = (window as any).BMapGL;
    return new Promise((resolve) => {
      try {
        const geocoder = new BMapGL.Geocoder();
        geocoder.getLocation(vendorPos, (result: any) => {
          try {
            resolve(result?.address || undefined);
          } catch {
            resolve(undefined);
          }
        });
      } catch {
        resolve(undefined);
      }
    });
  }
  const TMap = (window as any).TMap;
  return Promise.resolve()
    .then(() => {
      const geocoder = new TMap.service.Geocoder();
      return geocoder.getAddress({ location: vendorPos });
    })
    .then((res: any) => res?.result?.address || undefined)
    .catch(() => undefined);
}

// ---------- POI 搜索 ----------
interface PoiResult {
  name: string;
  address: string;
  lnglat: any;
}

function searchPoi(provider: MapProvider, keyword: string, map: any): Promise<PoiResult[]> {
  if (provider === 'amap') {
    const AMap = (window as any).AMap;
    return new Promise((resolve) => {
      try {
        const placeSearch = new AMap.PlaceSearch({ pageSize: 8, pageIndex: 1 });
        placeSearch.search(keyword, (status: any, result: any) => {
          try {
            if (status === 'complete' && result?.poiList?.pois) {
              resolve(
                result.poiList.pois.map((poi: any) => ({
                  name: poi.name || '',
                  address: poi.address || `${poi.pname || ''}${poi.cityname || ''}${poi.adname || ''}`,
                  lnglat: poi.location,
                }))
              );
            } else {
              resolve([]);
            }
          } catch {
            resolve([]);
          }
        });
      } catch {
        resolve([]);
      }
    });
  }
  if (provider === 'baidu') {
    const BMapGL = (window as any).BMapGL;
    return new Promise((resolve) => {
      try {
        const localSearch = new BMapGL.LocalSearch(map, {
          pageCapacity: 8,
          onSearchComplete: (results: any) => {
            try {
              const pois: PoiResult[] = [];
              if (results && typeof results.getCurrentNumPois === 'function') {
                const n = results.getCurrentNumPois();
                for (let i = 0; i < n; i++) {
                  const poi = results.getPoi(i);
                  if (poi?.point) {
                    pois.push({ name: poi.title || '', address: poi.address || '', lnglat: poi.point });
                  }
                }
              }
              resolve(pois);
            } catch {
              resolve([]);
            }
          },
        });
        localSearch.search(keyword);
      } catch {
        resolve([]);
      }
    });
  }
  const TMap = (window as any).TMap;
  return Promise.resolve()
    .then(() => {
      // 输入提示（全国范围）：不受当前视野限制，任意地址/POI 均可搜索定位
      const suggestion = new TMap.service.Suggestion({ pageSize: 8 });
      return suggestion.getSuggestions({ keyword });
    })
    .then((res: any) => {
      const data = res?.data || [];
      return data
        .map((item: any) => ({
          name: item.title || '',
          address: item.address || '',
          lnglat: item.location,
        }))
        .filter((item: PoiResult) => item.lnglat && typeof item.lnglat.lat === 'number' && typeof item.lnglat.lng === 'number');
    })
    .catch(() => []);
}

// ---------- 组件 ----------
const RealMapSelector: React.FC<RealMapSelectorProps> = ({
  provider,
  apiKey,
  startPoint,
  endPoint,
  waypoints = [],
  startAddress = '',
  endAddress = '',
  onStartPointChange,
  onEndPointChange,
  onWaypointsChange,
  onStartAddressChange,
  onEndAddressChange,
  onLoadError,
}) => {
  const [pickMode, setPickModeState] = useState<PickMode>('none');
  const pickModeRef = useRef<PickMode>('none');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchOptions, setSearchOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [searching, setSearching] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const mapReadyRef = useRef(false);
  const markersRef = useRef<{ start: any; end: any; waypoints: any[] }>({ start: null, end: null, waypoints: [] });
  const polylineRef = useRef<any>(null);
  const searchSeqRef = useRef(0);
  const searchPoiMapRef = useRef<Map<string, PoiResult>>(new Map());

  // 始终持有最新回调，供地图事件处理器使用
  const callbacksRef = useRef({ onStartPointChange, onEndPointChange, onWaypointsChange, onStartAddressChange, onEndAddressChange });
  callbacksRef.current = { onStartPointChange, onEndPointChange, onWaypointsChange, onStartAddressChange, onEndAddressChange };

  const pointsRef = useRef({ startPoint, endPoint, waypoints });
  pointsRef.current = { startPoint, endPoint, waypoints };

  const onLoadErrorRef = useRef(onLoadError);
  onLoadErrorRef.current = onLoadError;

  const setPickMode = useCallback((m: PickMode) => {
    pickModeRef.current = m;
    setPickModeState(m);
  }, []);

  const applyPoint = useCallback((point: Point, address: string) => {
    const cb = callbacksRef.current;
    const mode = pickModeRef.current;
    if (mode === 'start') {
      cb.onStartPointChange(point);
      cb.onStartAddressChange?.(address);
      setPickMode('none');
    } else if (mode === 'end') {
      cb.onEndPointChange(point);
      cb.onEndAddressChange?.(address);
      setPickMode('none');
    } else if (mode === 'waypoint') {
      cb.onWaypointsChange([...pointsRef.current.waypoints, point]);
    } else {
      const sp = pointsRef.current.startPoint;
      if (sp) {
        cb.onEndPointChange(point);
        cb.onEndAddressChange?.(address);
      } else {
        cb.onStartPointChange(point);
        cb.onStartAddressChange?.(address);
      }
    }
  }, [setPickMode]);

  const handleMapClick = useCallback(
    (e: any) => {
      if (pickModeRef.current === 'none' || !mapRef.current) return;
      let vendorPos: any = null;
      try {
        if (provider === 'amap') vendorPos = e?.lnglat;
        else if (provider === 'baidu') vendorPos = e?.point;
        else vendorPos = e?.latLng;
      } catch {
        return;
      }
      if (!vendorPos) return;
      const point = roundPoint(fromVendorCoords(provider, vendorPos));
      reverseGeocode(provider, vendorPos)
        .then((addr) => {
          applyPoint(point, addr || `${point.lng.toFixed(4)}, ${point.lat.toFixed(4)}`);
        })
        .catch(() => {
          applyPoint(point, `${point.lng.toFixed(4)}, ${point.lat.toFixed(4)}`);
        });
    },
    [provider, applyPoint]
  );

  // 地图初始化 / 卸载销毁
  useEffect(() => {
    let cancelled = false;
    let createdMap: any = null;

    const init = async () => {
      if (!apiKey || !apiKey.trim()) {
        const msg = '请先配置地图 API Key';
        setStatus('error');
        setErrorMsg(msg);
        onLoadErrorRef.current?.(msg);
        return;
      }
      setStatus('loading');
      setErrorMsg('');
      try {
        await loadMapSDK(provider, apiKey.trim());
        if (provider === 'amap') {
          await loadAmapPlugins((window as any).AMap, ['AMap.PlaceSearch', 'AMap.Geocoder', 'AMap.Scale', 'AMap.ToolBar']);
        }
        if (cancelled || !containerRef.current) return;
        createdMap = createMap(containerRef.current, provider);
        mapRef.current = createdMap;
        addControls(createdMap, provider);
        mapReadyRef.current = true;
        setStatus('ready');
        attachClick(createdMap, provider);
        const vendorPoints: any[] = [];
        if (startPoint) vendorPoints.push(toVendorCoords(provider, startPoint));
        waypoints.forEach((w) => vendorPoints.push(toVendorCoords(provider, w)));
        if (endPoint) vendorPoints.push(toVendorCoords(provider, endPoint));
        fitToPoints(provider, createdMap, vendorPoints);
      } catch (err) {
        if (cancelled) return;
        mapReadyRef.current = false;
        const msg = err instanceof Error && err.message ? err.message : '地图 SDK 加载失败，请检查 API Key 是否正确';
        setStatus('error');
        setErrorMsg(msg);
        onLoadErrorRef.current?.(msg);
      }
    };

    function attachClick(map: any, prov: MapProvider) {
      try {
        if (prov === 'baidu') {
          map.addEventListener('click', handleMapClick);
        } else {
          map.on('click', handleMapClick);
        }
      } catch {
        /* 点击监听失败忽略 */
      }
    }

    init();

    return () => {
      cancelled = true;
      mapReadyRef.current = false;
      try {
        createdMap?.destroy?.();
      } catch {
        /* ignore */
      }
      try {
        mapRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      mapRef.current = null;
      markersRef.current = { start: null, end: null, waypoints: [] };
      polylineRef.current = null;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, apiKey]);

  // 根据 props 同步标记与赛线折线
  const syncMap = useCallback(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    try {
      clearOverlays(provider);
      const vendorPoints: any[] = [];
      const markers: { start: any; end: any; waypoints: any[] } = { start: null, end: null, waypoints: [] };

      if (startPoint) {
        const vp = toVendorCoords(provider, startPoint);
        vendorPoints.push(vp);
        markers.start = createMarker(provider, map, vp, '#52c41a', startAddress || '起点', (dragPos: any) => {
          const point = roundPoint(fromVendorCoords(provider, dragPos));
          callbacksRef.current.onStartPointChange(point);
          reverseGeocode(provider, dragPos)
            .then((addr) => {
              if (addr) callbacksRef.current.onStartAddressChange?.(addr);
            })
            .catch(() => undefined);
        });
      }

      waypoints.forEach((wp, i) => {
        const vp = toVendorCoords(provider, wp);
        vendorPoints.push(vp);
        markers.waypoints.push(
          createMarker(provider, map, vp, '#1890ff', `${i + 1}`, (dragPos: any) => {
            const point = roundPoint(fromVendorCoords(provider, dragPos));
            const next = waypoints.map((w) => ({ ...w }));
            next[i] = point;
            callbacksRef.current.onWaypointsChange(next);
          })
        );
      });

      if (endPoint) {
        const vp = toVendorCoords(provider, endPoint);
        vendorPoints.push(vp);
        markers.end = createMarker(provider, map, vp, '#ff4d4f', endAddress || '终点', (dragPos: any) => {
          const point = roundPoint(fromVendorCoords(provider, dragPos));
          callbacksRef.current.onEndPointChange(point);
          reverseGeocode(provider, dragPos)
            .then((addr) => {
              if (addr) callbacksRef.current.onEndAddressChange?.(addr);
            })
            .catch(() => undefined);
        });
      }

      markersRef.current = markers;
      if (vendorPoints.length >= 2) {
        polylineRef.current = createPolyline(provider, map, vendorPoints);
      }
    } catch {
      // 坐标异常（如超出厂商 SDK 合法范围）时跳过标记/折线同步，不阻塞表单使用；
      // 具体原因由上层 routeWarning / 提交校验弹窗提示
    }
  }, [provider, startPoint, endPoint, waypoints, startAddress, endAddress]);

  const clearOverlays = useCallback((prov: MapProvider) => {
    const map = mapRef.current;
    if (!map) return;
    const markers = markersRef.current;
    const remove = (m: any) => {
      if (!m) return;
      try {
        if (prov === 'tencent') {
          m._cleanup?.();
          m.setMap(null);
        } else if (prov === 'amap') map.remove(m);
        else map.removeOverlay(m);
      } catch {
        /* ignore */
      }
    };
    remove(markers.start);
    remove(markers.end);
    markers.waypoints.forEach((m) => remove(m));
    markers.waypoints = [];
    if (polylineRef.current) {
      const pl = polylineRef.current;
      polylineRef.current = null;
      try {
        if (prov === 'tencent') pl.setMap(null);
        else if (prov === 'amap') map.remove(pl);
        else map.removeOverlay(pl);
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    if (status === 'ready') {
      syncMap();
    }
  }, [syncMap, status]);

  // POI 搜索
  const handleSearch = useCallback(
    (keyword: string) => {
      setSearchKeyword(keyword);
      const seq = ++searchSeqRef.current;
      if (!keyword.trim() || status !== 'ready' || !mapRef.current) {
        setSearchOptions([]);
        searchPoiMapRef.current.clear();
        setSearching(false);
        return;
      }
      setSearching(true);
      searchPoi(provider, keyword.trim(), mapRef.current)
        .then((pois) => {
          if (seq !== searchSeqRef.current) return;
          setSearching(false);
          const map = new Map<string, PoiResult>();
          const options = pois.map((p, i) => {
            const value = `${seq}-${i}`;
            map.set(value, p);
            return { value, label: `${p.name}${p.address ? ` - ${p.address}` : ''}` };
          });
          searchPoiMapRef.current = map;
          setSearchOptions(options);
        })
        .catch(() => {
          if (seq === searchSeqRef.current) {
            setSearching(false);
            setSearchOptions([]);
            searchPoiMapRef.current.clear();
          }
        });
    },
    [provider, status]
  );

  const handlePoiSelect = useCallback(
    (value: string) => {
      const poi = searchPoiMapRef.current.get(value);
      if (!poi) return;
      const point = roundPoint(fromVendorCoords(provider, poi.lnglat));
      const address = poi.address || poi.name || `${point.lng.toFixed(4)}, ${point.lat.toFixed(4)}`;
      try {
        const vendorPos = toVendorCoords(provider, point);
        if (mapRef.current) panTo(provider, mapRef.current, vendorPos);
      } catch {
        /* ignore */
      }
      applyPoint(point, address);
      setSearchKeyword('');
      setSearchOptions([]);
      searchPoiMapRef.current.clear();
    },
    [provider, applyPoint]
  );

  const handleClearSearch = useCallback(() => {
    setSearchKeyword('');
    setSearchOptions([]);
    searchPoiMapRef.current.clear();
  }, []);

  const handleDeleteWaypoint = useCallback(
    (index: number) => {
      callbacksRef.current.onWaypointsChange(pointsRef.current.waypoints.filter((_, i) => i !== index));
    },
    []
  );

  const totalDistance = useMemo(
    () => (startPoint && endPoint ? calculateRouteDistance(startPoint, waypoints, endPoint) : 0),
    [startPoint, endPoint, waypoints]
  );
  const flightHours = useMemo(() => (totalDistance > 0 ? (totalDistance * 1000) / (1200 * 60) : 0), [totalDistance]);

  const getSelectPlaceholder = () => {
    if (pickMode === 'start') return '搜索并选择起点位置';
    if (pickMode === 'end') return '搜索并选择终点位置';
    if (pickMode === 'waypoint') return '搜索并选择中途点位置';
    return '搜索地址/POI（将设置为起点）';
  };

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.85)',
    zIndex: 10,
    borderRadius: 8,
    pointerEvents: 'none',
  };

  return (
    <div>
      {/* 顶部工具栏 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <Select
          style={{ width: 280 }}
          showSearch
          allowClear
          placeholder={getSelectPlaceholder()}
          filterOption={false}
          searchValue={searchKeyword}
          onSearch={handleSearch}
          onChange={handlePoiSelect}
          onClear={handleClearSearch}
          options={searchOptions}
          loading={searching}
          disabled={status !== 'ready'}
          notFoundContent={searchKeyword ? '未找到相关地点' : '请输入关键字搜索 POI'}
        />
        <Button
          type={pickMode === 'start' ? 'primary' : 'default'}
          icon={<AimOutlined style={{ color: pickMode === 'start' ? '#fff' : '#52c41a' }} />}
          onClick={() => setPickMode(pickMode === 'start' ? 'none' : 'start')}
          disabled={status !== 'ready'}
        >
          {pickMode === 'start' ? '取消选点' : '选择起点'}
        </Button>
        <Button
          type={pickMode === 'end' ? 'primary' : 'default'}
          danger={pickMode !== 'end'}
          icon={<AimOutlined />}
          onClick={() => setPickMode(pickMode === 'end' ? 'none' : 'end')}
          disabled={status !== 'ready'}
        >
          {pickMode === 'end' ? '取消选点' : '选择终点'}
        </Button>
        <Button
          type={pickMode === 'waypoint' ? 'primary' : 'default'}
          icon={<PlusOutlined style={{ color: pickMode === 'waypoint' ? '#fff' : '#1890ff' }} />}
          onClick={() => setPickMode(pickMode === 'waypoint' ? 'none' : 'waypoint')}
          disabled={status !== 'ready'}
        >
          {pickMode === 'waypoint' ? '取消添加' : '添加中途点'}
        </Button>
      </div>

      {/* 地图区域 */}
      <div style={{ position: 'relative', height: 480, border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden' }}>
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: '100%',
            cursor: pickMode !== 'none' && status === 'ready' ? 'crosshair' : 'default',
          }}
        />
        {status === 'loading' && (
          <div style={overlayStyle}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <Spin />
              <div style={{ fontSize: 14, color: '#666' }}>地图加载中...</div>
            </div>
          </div>
        )}
        {status === 'error' && (
          <div style={overlayStyle}>
            <Alert type="error" showIcon message="地图加载失败" description={errorMsg || '地图 SDK 加载失败，请检查 API Key 是否正确'} style={{ pointerEvents: 'auto', maxWidth: 420 }} />
          </div>
        )}
        {status === 'ready' && pickMode !== 'none' && (
          <div style={{ ...overlayStyle, background: 'transparent', pointerEvents: 'none' }}>
            <div style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '4px 12px', borderRadius: 4, fontSize: 13, fontWeight: 'bold' }}>
              {pickMode === 'start' && '🖱️ 点击地图选择起点位置'}
              {pickMode === 'end' && '🖱️ 点击地图选择终点位置'}
              {pickMode === 'waypoint' && '🖱️ 点击地图添加中途点'}
            </div>
          </div>
        )}
      </div>

      {/* 信息面板 */}
      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {startPoint && (
            <div>
              <Tag color="green">起点</Tag>
              <span style={{ fontSize: 12 }}>{startAddress || `${startPoint.lng.toFixed(4)}, ${startPoint.lat.toFixed(4)}`}</span>
            </div>
          )}
          {endPoint && (
            <div>
              <Tag color="red">终点</Tag>
              <span style={{ fontSize: 12 }}>{endAddress || `${endPoint.lng.toFixed(4)}, ${endPoint.lat.toFixed(4)}`}</span>
            </div>
          )}
          {waypoints.length > 0 && (
            <div>
              <Tag color="blue">中途点 x{waypoints.length}</Tag>
              <span style={{ fontSize: 12 }}>
                {waypoints
                  .map((wp, i) => (
                    <span key={i} style={{ marginRight: 8 }}>
                      {i + 1}. {wp.lng.toFixed(4)}, {wp.lat.toFixed(4)}{' '}
                      <a
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteWaypoint(i);
                        }}
                        style={{ color: '#ff4d4f', fontSize: 12 }}
                      >
                        删除
                      </a>
                    </span>
                  ))}
              </span>
            </div>
          )}
        </div>
        {totalDistance > 0 && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4 }}>
            <span style={{ fontWeight: 'bold', color: '#389e0d' }}>📏 空距: {totalDistance.toFixed(2)} km</span>
            <span style={{ marginLeft: 16, color: '#666' }}>预计飞行时间: {flightHours.toFixed(1)} 小时</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealMapSelector;
