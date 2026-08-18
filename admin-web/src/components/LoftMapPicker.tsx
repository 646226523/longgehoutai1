import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Input, Spin, Tag, message } from 'antd';
import { EnvironmentOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { getMapConfig, type MapConfig } from '../services/system';
import { gcj02ToWgs84, wgs84ToGcj02 } from '../utils/coordinate-transform';
import { type Point } from '../utils/geo';

type MapProvider = 'amap' | 'baidu' | 'tencent';

interface LoftMapPickerProps {
  lng?: number | null;
  lat?: number | null;
  address?: string;
  onChange: (data: { lng: number; lat: number; address: string }) => void;
  height?: number;
}

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

const sdkCache = new Map<MapProvider, Promise<void>>();

function loadMapSDK(provider: MapProvider, apiKey: string): Promise<void> {
  if (getSdkGlobal(provider)) return Promise.resolve();
  const cached = sdkCache.get(provider);
  if (cached) return cached;
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = getSdkScriptSrc(provider, apiKey);
    script.async = true;
    script.setAttribute('data-map-sdk', provider);
    script.onload = () => {
      if (getSdkGlobal(provider)) {
        resolve();
      } else {
        sdkCache.delete(provider);
        reject(new Error('地图 SDK 加载失败'));
      }
    };
    script.onerror = () => {
      sdkCache.delete(provider);
      reject(new Error('地图 SDK 加载失败'));
    };
    document.head.appendChild(script);
  });
  sdkCache.set(provider, promise);
  return promise;
}

function toVendorCoords(provider: MapProvider, p: Point): any {
  if (provider === 'baidu') {
    const bd = wgs84ToGcj02(p.lng, p.lat);
    const BMapGL = (window as any).BMapGL;
    return new BMapGL.Point(bd.lng, bd.lat);
  }
  const g = wgs84ToGcj02(p.lng, p.lat);
  if (provider === 'amap') {
    const AMap = (window as any).AMap;
    return new AMap.LngLat(g.lng, g.lat);
  }
  const TMap = (window as any).TMap;
  return new TMap.LatLng(g.lat, g.lng);
}

function fromVendorCoords(provider: MapProvider, vendorPos: any): Point {
  let lng: number;
  let lat: number;
  try {
    if (provider === 'amap') {
      lng = typeof vendorPos.getLng === 'function' ? vendorPos.getLng() : vendorPos.lng;
      lat = typeof vendorPos.getLat === 'function' ? vendorPos.getLat() : vendorPos.lat;
    } else if (provider === 'baidu') {
      lng = vendorPos.lng;
      lat = vendorPos.lat;
    } else {
      lng = vendorPos.getLng ? vendorPos.getLng() : vendorPos.lng;
      lat = vendorPos.getLat ? vendorPos.getLat() : vendorPos.lat;
    }
  } catch {
    lng = vendorPos.lng ?? 0;
    lat = vendorPos.lat ?? 0;
  }
  if (provider === 'baidu') {
    const res = gcj02ToWgs84(lng, lat);
    return { lng: res.lng, lat: res.lat };
  }
  if (provider === 'amap') {
    const res = gcj02ToWgs84(lng, lat);
    return { lng: res.lng, lat: res.lat };
  }
  return { lng, lat };
}

const LoftMapPicker: React.FC<LoftMapPickerProps> = ({
  lng: initLng,
  lat: initLat,
  address: initAddress,
  onChange,
  height = 360,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const locatorRef = useRef<any>(null);

  const [mapConfig, setMapConfig] = useState<MapConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [sdkLoading, setSdkLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [markerPos, setMarkerPos] = useState<{ lng: number; lat: number } | null>(
    initLng && initLat ? { lng: initLng, lat: initLat } : null,
  );
  const [address, setAddress] = useState<string>(initAddress || '');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    let cancelled = false;
    getMapConfig()
      .then((data) => {
        if (!cancelled) setMapConfig(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setConfigLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rawProvider = mapConfig?.provider;
  const provider: MapProvider | undefined =
    rawProvider && rawProvider !== 'none' ? (rawProvider as MapProvider) : undefined;
  const apiKey =
    provider === 'amap'
      ? mapConfig?.amap_key
      : provider === 'baidu'
        ? mapConfig?.baidu_key
        : provider === 'tencent'
          ? mapConfig?.tencent_key
          : '';

  const initMap = useCallback(() => {
    if (!mapRef.current || !provider || !apiKey) return;

    if (provider === 'amap') {
      const AMap = (window as any).AMap;
      const map = new AMap.Map(mapRef.current, { zoom: 11, viewMode: '2D' });
      mapInstance.current = map;

      if (initLng && initLat) {
        const center = toVendorCoords('amap', { lng: initLng, lat: initLat });
        map.setCenter(center);
        const marker = new AMap.Marker({ position: center, draggable: true });
        map.add(marker);
        markerRef.current = marker;
      }

      map.on('click', (e: any) => {
        const pos = fromVendorCoords('amap', e.lnglat);
        placeMarker('amap', pos);
      });

      map.on('moveend', () => {
        const c = map.getCenter();
        const pos = fromVendorCoords('amap', c);
        setMarkerPos({ lng: pos.lng, lat: pos.lat });
      });

      AMap.plugin(
        ['AMap.Geocoder', 'AMap.Geolocation'],
        () => {
          geocoderRef.current = new AMap.Geocoder({ city: '全国' });
          locatorRef.current = new AMap.Geolocation({
            enableHighAccuracy: true,
            timeout: 10000,
          });
        },
      );
    } else if (provider === 'baidu') {
      const BMapGL = (window as any).BMapGL;
      const map = new BMapGL.Map(mapRef.current);
      mapInstance.current = map;

      const center = new BMapGL.Point(initLng || 116.4, initLat || 39.9);
      map.centerAndZoom(center, 11);
      map.enableScrollWheelZoom(true);

      if (initLng && initLat) {
        const marker = new BMapGL.Marker(center);
        map.addOverlay(marker);
        markerRef.current = marker;
      }

      map.addEventListener('click', (e: any) => {
        const pos = fromVendorCoords('baidu', e.latlng);
        placeMarker('baidu', pos);
      });

      map.addEventListener('moveend', () => {
        const c = map.getCenter();
        const pos = fromVendorCoords('baidu', c);
        setMarkerPos({ lng: pos.lng, lat: pos.lat });
      });

      try {
        geocoderRef.current = new BMapGL.Geocoder();
      } catch {}
    } else if (provider === 'tencent') {
      const TMap = (window as any).TMap;
      const center = new TMap.LatLng(initLat || 39.9, initLng || 116.4);
      const map = new TMap.Map(mapRef.current, { zoom: 11, center });
      mapInstance.current = map;

      try {
        geocoderRef.current = new TMap.service.Geocoder();
      } catch {}

      if (initLng && initLat) {
        const marker = new TMap.Marker({ id: 'center', position: center });
        map.addMarker(marker);
        markerRef.current = marker;
      }

      map.on('click', (e: any) => {
        const lat = e.latLng.getLat();
        const lng = e.latLng.getLng();
        placeMarker('tencent', { lng, lat });
      });
    }
  }, [provider, apiKey, initLng, initLat]);

  const placeMarker = useCallback(
    (prov: MapProvider, pos: Point) => {
      setMarkerPos({ lng: pos.lng, lat: pos.lat });
      if (prov === 'amap') {
        const AMap = (window as any).AMap;
        const vendorPos = toVendorCoords('amap', pos);
        if (markerRef.current) {
          markerRef.current.setPosition(vendorPos);
        } else {
          const marker = new AMap.Marker({ position: vendorPos, draggable: true });
          mapInstance.current.add(marker);
          markerRef.current = marker;
        }
        mapInstance.current.setCenter(vendorPos);
        reverseGeocode('amap', pos);
      } else if (prov === 'baidu') {
        const BMapGL = (window as any).BMapGL;
        const vendorPos = toVendorCoords('baidu', pos);
        if (markerRef.current) {
          mapInstance.current.removeOverlay(markerRef.current);
        }
        const marker = new BMapGL.Marker(vendorPos);
        mapInstance.current.addOverlay(marker);
        markerRef.current = marker;
        mapInstance.current.centerAndZoom(vendorPos, mapInstance.current.getZoom());
        reverseGeocode('baidu', pos);
      } else if (prov === 'tencent') {
        const TMap = (window as any).TMap;
        const vendorPos = toVendorCoords('tencent', pos);
        if (markerRef.current) {
          mapInstance.current.removeMarker(markerRef.current);
        }
        const marker = new TMap.Marker({ id: 'center', position: vendorPos });
        mapInstance.current.addMarker(marker);
        markerRef.current = marker;
        mapInstance.current.setCenter(vendorPos);
        reverseGeocode('tencent', pos);
      }
    },
    [],
  );

  const reverseGeocode = useCallback(
    (prov: MapProvider, pos: Point) => {
      if (prov === 'amap' && geocoderRef.current) {
        const vendorPos = toVendorCoords('amap', pos);
        geocoderRef.current.getAddress(
          [vendorPos.lng, vendorPos.lat],
          (status: string, result: any) => {
            if (status === 'complete' && result.regeocode) {
              const addr = result.regeocode.formattedAddress;
              setAddress(addr);
              onChange({ lng: pos.lng, lat: pos.lat, address: addr });
            } else {
              setAddress(`${pos.lng.toFixed(6)}, ${pos.lat.toFixed(6)}`);
              onChange({ lng: pos.lng, lat: pos.lat, address: '' });
            }
          },
        );
      } else if (prov === 'baidu' && geocoderRef.current) {
        const vendorPos = toVendorCoords('baidu', pos);
        geocoderRef.current.getLocation(
          vendorPos,
          (result: any) => {
            if (result && result.status === 0) {
              const addr = result.formattedAddress || '';
              setAddress(addr);
              onChange({ lng: pos.lng, lat: pos.lat, address: addr });
            } else {
              setAddress(`${pos.lng.toFixed(6)}, ${pos.lat.toFixed(6)}`);
              onChange({ lng: pos.lng, lat: pos.lat, address: '' });
            }
          },
          new (window as any).BMapGL.ControlPoint(),
        );
      } else if (prov === 'tencent' && geocoderRef.current) {
        const vendorPos = toVendorCoords('tencent', pos);
        geocoderRef.current.getAddress(
          new (window as any).TMap.LatLng(vendorPos.lat, vendorPos.lng),
          (status: string, result: any) => {
            if (status === 'complete' && result && result.address) {
              const addr = result.address;
              setAddress(addr);
              onChange({ lng: pos.lng, lat: pos.lat, address: addr });
            } else {
              setAddress(`${pos.lng.toFixed(6)}, ${pos.lat.toFixed(6)}`);
              onChange({ lng: pos.lng, lat: pos.lat, address: '' });
            }
          },
        );
      } else if (prov === 'tencent') {
        setAddress(`${pos.lng.toFixed(6)}, ${pos.lat.toFixed(6)}`);
        onChange({ lng: pos.lng, lat: pos.lat, address: '' });
      } else {
        onChange({ lng: pos.lng, lat: pos.lat, address: '' });
      }
    },
    [onChange],
  );

  useEffect(() => {
    if (configLoading || !provider || !apiKey) return;

    setSdkLoading(true);
    setLoadError(null);
    loadMapSDK(provider, apiKey)
      .then(() => {
        initMap();
      })
      .catch((err: Error) => {
        setLoadError(err.message);
      })
      .finally(() => {
        setSdkLoading(false);
      });
  }, [configLoading, provider, apiKey, initMap]);

  const handleSearch = () => {
    if (!searchInput.trim()) return;
    if (provider === 'amap') {
      const AMap = (window as any).AMap;
      const geocoder = new AMap.Geocoder({ city: '全国' });
      geocoder.getLocation(searchInput, (status: string, result: any) => {
        if (status === 'complete' && result.geocodes && result.geocodes.length > 0) {
          const g = result.geocodes[0];
          const lng = g.location.lng;
          const lat = g.location.lat;
          placeMarker('amap', { lng, lat });
        } else {
          message.warning('未找到该地址');
        }
      });
    } else if (provider === 'baidu') {
      const BMapGL = (window as any).BMapGL;
      const geo = new BMapGL.Geocoder();
      geo.getPoint(
        searchInput,
        (point: any) => {
          if (point) {
            const pos = fromVendorCoords('baidu', point);
            placeMarker('baidu', pos);
          } else {
            message.warning('未找到该地址');
          }
        },
        '全国',
      );
    } else if (provider === 'tencent') {
      if (!geocoderRef.current) {
        message.warning('地理编码器未就绪，请稍后重试');
        return;
      }
      geocoderRef.current.geocoder(searchInput, (status: string, result: any) => {
        if (status === 'complete' && result && result.location) {
          const lng = result.location.lng;
          const lat = result.location.lat;
          placeMarker('tencent', { lng, lat });
        } else {
          message.warning('未找到该地址');
        }
      });
    }
  };

  const handleLocate = () => {
    if (!mapInstance.current || !provider) return;
    if (provider === 'amap' && locatorRef.current) {
      locatorRef.current.getCurrentPosition((status: string, result: any) => {
        if (status === 'complete') {
          const pos = fromVendorCoords('amap', result.position);
          placeMarker('amap', pos);
        } else {
          message.warning('定位失败');
        }
      });
    } else if (provider === 'tencent') {
      if (!navigator.geolocation) {
        message.warning('浏览器不支持定位');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = pos.coords;
          placeMarker('tencent', { lng: loc.longitude, lat: loc.latitude });
        },
        () => {
          message.warning('无法获取当前位置');
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    } else {
      message.info('当前地图不支持定位');
    }
  };

  if (configLoading) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin><div style={{ marginTop: 8 }}>加载地图配置...</div></Spin>
      </div>
    );
  }

  if (!provider || !apiKey) {
    return (
      <div>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="未配置地图服务。请在「系统管理 → 系统配置 → 地图配置」中填写地图服务商及 API Key。"
        />
        <div
          style={{
            height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f5f5f5',
            borderRadius: 8,
            color: '#999',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <EnvironmentOutlined style={{ fontSize: 48, marginBottom: 8 }} />
            <div>地图未配置</div>
            {markerPos && (
              <div style={{ marginTop: 8 }}>
                <Tag>经度: {markerPos.lng.toFixed(6)}</Tag>
                <Tag>纬度: {markerPos.lat.toFixed(6)}</Tag>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <Input
          placeholder="搜索地址,如:北京市朝阳区天安门"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onPressEnter={handleSearch}
          prefix={<SearchOutlined />}
          style={{ flex: 1 }}
        />
        <Button type="primary" onClick={handleSearch} icon={<SearchOutlined />}>
          搜索
        </Button>
        <Button onClick={handleLocate} icon={<ReloadOutlined />}>
          重新定位
        </Button>
      </div>

      <div
        ref={mapRef}
        style={{
          height,
          width: '100%',
          borderRadius: 8,
          border: '1px solid #e8e8e8',
          position: 'relative',
        }}
      >
        {sdkLoading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.8)',
              zIndex: 10,
            }}
          >
            <Spin><div style={{ marginTop: 8 }}>地图加载中...</div></Spin>
          </div>
        )}
        {loadError && (
          <Alert
            type="error"
            showIcon
            style={{ margin: 12 }}
            message={`地图加载失败: ${loadError}`}
          />
        )}
      </div>

      <div
        style={{
          marginTop: 8,
          padding: '8px 12px',
          background: '#f6f8fa',
          borderRadius: 4,
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {markerPos ? (
          <>
            <Tag color="blue">经度: {markerPos.lng.toFixed(6)}</Tag>
            <Tag color="blue">纬度: {markerPos.lat.toFixed(6)}</Tag>
            {address && <span style={{ color: '#666', fontSize: 12 }}>📍 {address}</span>}
          </>
        ) : (
          <span style={{ color: '#999', fontSize: 12 }}>
            点击地图或搜索地址来选点
          </span>
        )}
      </div>
    </div>
  );
};

export default LoftMapPicker;