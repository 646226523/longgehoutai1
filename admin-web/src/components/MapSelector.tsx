import React, { useState, useRef, useEffect } from 'react';
import { Tag, Button, Select, Alert } from 'antd';
import { AimOutlined, PlusOutlined } from '@ant-design/icons';
import { CITY_COORDINATES, searchCities, CityCoordinate } from '../data/city-coordinates';
import { Point, calculateDistance, calculateRouteDistance } from '../utils/geo';
import RealMapSelector, { MapProvider } from './RealMapSelector';
import { getMapConfig, MapConfig } from '../services/system';

const MAP_BOUND = {
  minLng: 73,
  maxLng: 135,
  minLat: 18,
  maxLat: 54,
};

const SVG_WIDTH = 800;
const SVG_HEIGHT = 500;

function lngLatToXY(lng: number, lat: number): { x: number; y: number } {
  const x = ((lng - MAP_BOUND.minLng) / (MAP_BOUND.maxLng - MAP_BOUND.minLng)) * SVG_WIDTH;
  const y = ((MAP_BOUND.maxLat - lat) / (MAP_BOUND.maxLat - MAP_BOUND.minLat)) * SVG_HEIGHT;
  return { x, y };
}

function xyToLngLat(x: number, y: number): Point {
  const lng = MAP_BOUND.minLng + (x / SVG_WIDTH) * (MAP_BOUND.maxLng - MAP_BOUND.minLng);
  const lat = MAP_BOUND.maxLat - (y / SVG_HEIGHT) * (MAP_BOUND.maxLat - MAP_BOUND.minLat);
  return { lng, lat };
}

function isInChina(lng: number, lat: number): boolean {
  return lng >= 73 && lng <= 135 && lat >= 18 && lat <= 54;
}

interface CityOption {
  value: string;
  label: string;
  city: CityCoordinate;
}

const StartMarker: React.FC<{ x: number; y: number; label: string; onDrag: (x: number, y: number) => void; }> = ({ x, y, label, onDrag }) => {
  const svgRef = useRef<SVGGElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !svgRef.current) return;
    const svg = svgRef.current.ownerSVGElement;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const svgP = pt.matrixTransform(ctm.inverse());
    onDrag(svgP.x, svgP.y);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDragging(false);
  };

  return (
    <g ref={svgRef} transform={`translate(${x}, ${y})`} style={{ cursor: 'grab' }}>
      <circle r={18} fill="#52c41a" fillOpacity={0.3} stroke="#52c41a" strokeWidth={2} pointerEvents="none" />
      <circle r={10} fill="#52c41a" stroke="#fff" strokeWidth={2}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      <text y={-26} textAnchor="middle" fontSize={12} fontWeight="bold" fill="#52c41a" pointerEvents="none">
        {label}
      </text>
    </g>
  );
};

const EndMarker: React.FC<{ x: number; y: number; label: string; onDrag: (x: number, y: number) => void; }> = ({ x, y, label, onDrag }) => {
  const svgRef = useRef<SVGGElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !svgRef.current) return;
    const svg = svgRef.current.ownerSVGElement;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const svgP = pt.matrixTransform(ctm.inverse());
    onDrag(svgP.x, svgP.y);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDragging(false);
  };

  return (
    <g ref={svgRef} transform={`translate(${x}, ${y})`} style={{ cursor: 'grab' }}>
      <rect x={-12} y={-12} width={24} height={24} rx={4} fill="#ff4d4f" fillOpacity={0.3} stroke="#ff4d4f" strokeWidth={2} pointerEvents="none" />
      <rect x={-7} y={-7} width={14} height={14} rx={2} fill="#ff4d4f" stroke="#fff" strokeWidth={2}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      <text y={-26} textAnchor="middle" fontSize={12} fontWeight="bold" fill="#ff4d4f" pointerEvents="none">
        {label}
      </text>
    </g>
  );
};

const WaypointMarker: React.FC<{ x: number; y: number; index: number; label: string; onDrag: (x: number, y: number) => void; onDelete: () => void; }> = ({ x, y, index, label, onDrag, onDelete }) => {
  const svgRef = useRef<SVGGElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !svgRef.current) return;
    const svg = svgRef.current.ownerSVGElement;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const svgP = pt.matrixTransform(ctm.inverse());
    onDrag(svgP.x, svgP.y);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDragging(false);
  };

  return (
    <g ref={svgRef} transform={`translate(${x}, ${y})`} style={{ cursor: 'grab' }}>
      <circle r={14} fill="#1890ff" fillOpacity={0.3} stroke="#1890ff" strokeWidth={2} pointerEvents="none" />
      <circle r={7} fill="#1890ff" stroke="#fff" strokeWidth={2}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      <text y={-20} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#1890ff" pointerEvents="none">
        {index}. {label}
      </text>
      <circle cx={16} cy={-14} r={8} fill="#ff4d4f" stroke="#fff" strokeWidth={1}
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        style={{ cursor: 'pointer' }}
      />
      <text x={16} y={-11} textAnchor="middle" fontSize={10} fill="#fff" pointerEvents="none">
        ✕
      </text>
    </g>
  );
};

export type PickMode = 'start' | 'end' | 'waypoint' | 'none';

export interface MapSelectorProps {
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
}

const SvgMapSelector: React.FC<MapSelectorProps> = ({
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
}) => {
  const [pickMode, setPickMode] = useState<PickMode>('none');
  const svgRef = useRef<SVGSVGElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // 搜索相关状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchOptions, setSearchOptions] = useState<CityOption[]>([]);

  useEffect(() => {
    if (searchKeyword) {
      const results = searchCities(searchKeyword);
      setSearchOptions(
        results.map((c) => ({
          value: `${c.lng},${c.lat}`,
          label: `${c.name}${c.province ? ' - ' + c.province : ''}`,
          city: c,
        }))
      );
    } else {
      setSearchOptions([]);
    }
  }, [searchKeyword]);

  const findNearestCity = (point: Point): CityCoordinate | null => {
    let nearest: CityCoordinate | null = null;
    let minDist = Infinity;
    for (const city of CITY_COORDINATES) {
      const dist = calculateDistance(point, city);
      if (dist < minDist) {
        minDist = dist;
        nearest = city;
      }
    }
    return minDist < 50 ? nearest : null;
  };

  const formatPointAddress = (point: Point, nearest: CityCoordinate | null) =>
    nearest?.name || `${point.lng.toFixed(4)}, ${point.lat.toFixed(4)}`;

  const addPoint = (point: Point) => {
    const nearest = findNearestCity(point);
    const address = formatPointAddress(point, nearest);

    if (pickMode === 'start') {
      onStartPointChange(point);
      onStartAddressChange?.(address);
      setPickMode('none');
    } else if (pickMode === 'end') {
      onEndPointChange(point);
      onEndAddressChange?.(address);
      setPickMode('none');
    } else if (pickMode === 'waypoint') {
      onWaypointsChange([...waypoints, point]);
    }
  };

  const handleCitySelect = (value: string) => {
    const option = searchOptions.find((o) => o.value === value);
    if (!option) return;

    const city = option.city;
    const point = { lng: city.lng, lat: city.lat };

    if (pickMode === 'start') {
      onStartPointChange(point);
      onStartAddressChange?.(city.name);
      setPickMode('none');
    } else if (pickMode === 'end') {
      onEndPointChange(point);
      onEndAddressChange?.(city.name);
      setPickMode('none');
    } else if (pickMode === 'waypoint') {
      onWaypointsChange([...waypoints, point]);
    } else if (!startPoint) {
      onStartPointChange(point);
      onStartAddressChange?.(city.name);
    } else {
      onEndPointChange(point);
      onEndAddressChange?.(city.name);
    }

    setSearchKeyword('');
    setSearchOptions([]);
  };

  const handleMapClick = (e: React.MouseEvent) => {
    if (pickMode === 'none' || !svgRef.current) return;

    const svg = svgRef.current;
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;

    const svgPoint = point.matrixTransform(ctm.inverse());
    if (svgPoint.x < 0 || svgPoint.x > SVG_WIDTH || svgPoint.y < 0 || svgPoint.y > SVG_HEIGHT) return;

    const { lng, lat } = xyToLngLat(svgPoint.x, svgPoint.y);
    if (!isInChina(lng, lat)) return;

    addPoint({ lng: Number(lng.toFixed(4)), lat: Number(lat.toFixed(4)) });
  };

  const handleMarkerDrag = (markerType: 'start' | 'end' | 'waypoint', index?: number) => (x: number, y: number) => {
    const { lng, lat } = xyToLngLat(x, y);
    if (!isInChina(lng, lat)) return;
    const point = { lng: Number(lng.toFixed(4)), lat: Number(lat.toFixed(4)) };

    if (markerType === 'start') {
      onStartPointChange(point);
      onStartAddressChange?.(formatPointAddress(point, findNearestCity(point)));
    } else if (markerType === 'end') {
      onEndPointChange(point);
      onEndAddressChange?.(formatPointAddress(point, findNearestCity(point)));
    } else if (markerType === 'waypoint' && index !== undefined) {
      const newWps = [...waypoints];
      newWps[index] = point;
      onWaypointsChange(newWps);
    }
  };

  const handleDeleteWaypoint = (index: number) => {
    const newWps = waypoints.filter((_, i) => i !== index);
    onWaypointsChange(newWps);
  };

  const totalDistance = startPoint && endPoint
    ? calculateRouteDistance(startPoint, waypoints, endPoint)
    : 0;

  const flightHours = totalDistance > 0 ? (totalDistance * 1000) / (1200 * 60) : 0;

  const startXY = startPoint ? lngLatToXY(startPoint.lng, startPoint.lat) : null;
  const endXY = endPoint ? lngLatToXY(endPoint.lng, endPoint.lat) : null;
  const waypointXYs = waypoints.map((wp) => lngLatToXY(wp.lng, wp.lat));

  const buildRoutePath = (): string => {
    const points: Array<{ x: number; y: number }> = [];
    if (startXY) points.push(startXY);
    waypointXYs.forEach((wp) => points.push(wp));
    if (endXY) points.push(endXY);
    if (points.length < 2) return '';
    return points.map((p) => `${p.x},${p.y}`).join(' ');
  };

  const getSelectPlaceholder = () => {
    if (pickMode === 'start') return '搜索并选择起点城市';
    if (pickMode === 'end') return '搜索并选择终点城市';
    if (pickMode === 'waypoint') return '搜索并选择中途点城市';
    return '搜索城市（将设置为起点）';
  };

  return (
    <div>
      {/* 工具栏 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <Select
          style={{ width: 260 }}
          showSearch
          placeholder={getSelectPlaceholder()}
          filterOption={false}
          searchValue={searchKeyword}
          onSearch={setSearchKeyword}
          onChange={handleCitySelect}
          onClear={() => {
            setSearchKeyword('');
            setSearchOptions([]);
          }}
          options={searchOptions}
          allowClear
          notFoundContent="请输入城市名搜索"
        />
        <Button
          type={pickMode === 'start' ? 'primary' : 'default'}
          icon={<AimOutlined style={{ color: pickMode === 'start' ? '#fff' : '#52c41a' }} />}
          onClick={() => setPickMode(pickMode === 'start' ? 'none' : 'start')}
        >
          {pickMode === 'start' ? '取消选点' : '选择起点'}
        </Button>
        <Button
          type={pickMode === 'end' ? 'primary' : 'default'}
          danger={pickMode !== 'end'}
          icon={<AimOutlined />}
          onClick={() => setPickMode(pickMode === 'end' ? 'none' : 'end')}
        >
          {pickMode === 'end' ? '取消选点' : '选择终点'}
        </Button>
        <Button
          type={pickMode === 'waypoint' ? 'primary' : 'default'}
          icon={<PlusOutlined style={{ color: pickMode === 'waypoint' ? '#fff' : '#1890ff' }} />}
          onClick={() => setPickMode(pickMode === 'waypoint' ? 'none' : 'waypoint')}
        >
          {pickMode === 'waypoint' ? '取消添加' : '添加中途点'}
        </Button>
      </div>

      {/* SVG 地图 */}
      <div ref={mapContainerRef} style={{ position: 'relative' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          style={{
            width: '100%',
            height: 'auto',
            border: '1px solid #e8e8e8',
            borderRadius: 8,
            background: 'linear-gradient(to bottom, #e6f4ff, #f0f5ff)',
            minHeight: 400,
            display: 'block',
            cursor: pickMode !== 'none' ? 'crosshair' : 'default',
          }}
          onClick={handleMapClick}
        >
          <defs>
            <linearGradient id="seaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e6f4ff" />
              <stop offset="100%" stopColor="#f5faff" />
            </linearGradient>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#d9e8f5" strokeWidth="0.5" />
            </pattern>
            <pattern id="terrainDots" width="120" height="120" patternUnits="userSpaceOnUse">
              <circle cx="24" cy="24" r="2" fill="#c8e6c9" fillOpacity="0.55" />
              <circle cx="78" cy="36" r="1.8" fill="#bbdefb" fillOpacity="0.55" />
              <circle cx="52" cy="82" r="1.6" fill="#ffe0b2" fillOpacity="0.55" />
            </pattern>
            <filter id="mapShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#b3cde3" floodOpacity="0.35" />
            </filter>
          </defs>
          <rect width="100%" height="100%" fill="url(#seaGradient)" style={{ pointerEvents: 'none' }} />
          <rect width="100%" height="100%" fill="url(#grid)" style={{ pointerEvents: 'none' }} />
          <rect width="100%" height="100%" fill="url(#terrainDots)" opacity={0.25} style={{ pointerEvents: 'none' }} />

          {/* 周边地理信息底图 */}
          <g opacity={0.95} filter="url(#mapShadow)">
            <path
              d="M 70,110 C 120,78 188,82 240,118 C 275,142 317,144 360,126 C 412,104 452,106 496,132 C 546,160 592,158 640,132 C 675,113 708,116 740,145 L 740,420 L 70,420 Z"
              fill="#dff7e8"
              fillOpacity={0.78}
              stroke="#9ccc65"
              strokeWidth={2}
            />
            <path
              d="M 78,164 C 112,148 142,150 176,166 C 214,184 244,182 276,170 C 312,156 346,160 380,180 C 420,204 462,202 505,186 C 548,170 590,170 632,190 C 675,210 709,208 736,198"
              fill="none"
              stroke="#8bc34a"
              strokeWidth={5}
              strokeLinecap="round"
              strokeOpacity={0.32}
            />
            <path
              d="M 92,252 C 140,236 186,238 226,254 C 270,272 310,270 354,252 C 404,232 448,234 492,252 C 538,272 584,274 626,258 C 666,244 700,244 730,252"
              fill="none"
              stroke="#90caf9"
              strokeWidth={4}
              strokeLinecap="round"
              strokeOpacity={0.28}
            />
            <path
              d="M 110,322 C 160,298 214,300 264,322 C 312,342 360,344 412,324 C 462,306 516,306 566,324 C 616,342 666,344 714,328"
              fill="none"
              stroke="#ffd54f"
              strokeWidth={4}
              strokeLinecap="round"
              strokeOpacity={0.26}
            />
          </g>

          {/* 主要城市点 */}
          {CITY_COORDINATES.map((city) => {
            const { x, y } = lngLatToXY(city.lng, city.lat);
            return (
              <g key={`${city.lng}-${city.lat}`} style={{ pointerEvents: 'none' }}>
                <circle cx={x} cy={y} r={7} fill="#1890ff" fillOpacity={0.12} />
                <circle cx={x} cy={y} r={4} fill="#1890ff" fillOpacity={0.65} />
                <text x={x + 8} y={y - 8} fontSize={11} fill="#5a5a5a">
                  {city.name}
                </text>
              </g>
            );
          })}

          {/* 路线 */}
          {buildRoutePath() && (
            <polyline
              points={buildRoutePath()}
              fill="none"
              stroke="#1890ff"
              strokeWidth={3}
              strokeDasharray="8,4"
              opacity={0.7}
              style={{ pointerEvents: 'none' }}
            />
          )}

          {/* 起点标记 */}
          {startXY && (
            <StartMarker
              x={startXY.x}
              y={startXY.y}
              label={startAddress || '起点'}
              onDrag={(x, y) => handleMarkerDrag('start')(x, y)}
            />
          )}

          {/* 中途点标记 */}
          {waypointXYs.map((xy, i) => (
            <WaypointMarker
              key={i}
              x={xy.x}
              y={xy.y}
              index={i + 1}
              label={waypoints[i] ? `${waypoints[i].lng.toFixed(2)},${waypoints[i].lat.toFixed(2)}` : ''}
              onDrag={(x, y) => handleMarkerDrag('waypoint', i)(x, y)}
              onDelete={() => handleDeleteWaypoint(i)}
            />
          ))}

          {/* 终点标记 */}
          {endXY && (
            <EndMarker
              x={endXY.x}
              y={endXY.y}
              label={endAddress || '终点'}
              onDrag={(x, y) => handleMarkerDrag('end')(x, y)}
            />
          )}

          {/* 提示文字 */}
          {pickMode !== 'none' && (
            <text x={SVG_WIDTH / 2} y={30} textAnchor="middle" fontSize={16} fill="#ff4d4f" fontWeight="bold" style={{ pointerEvents: 'none' }}>
              {pickMode === 'start' && '🖱️ 点击地图选择起点位置'}
              {pickMode === 'end' && '🖱️ 点击地图选择终点位置'}
              {pickMode === 'waypoint' && '🖱️ 点击地图添加中途点'}
            </text>
          )}
        </svg>
      </div>

      {/* 信息面板 */}
      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {startPoint && (
            <div>
              <Tag color="green">起点</Tag>
              <span style={{ fontSize: 12 }}>
                {startAddress || `${startPoint.lng.toFixed(4)}, ${startPoint.lat.toFixed(4)}`}
              </span>
            </div>
          )}
          {endPoint && (
            <div>
              <Tag color="red">终点</Tag>
              <span style={{ fontSize: 12 }}>
                {endAddress || `${endPoint.lng.toFixed(4)}, ${endPoint.lat.toFixed(4)}`}
              </span>
            </div>
          )}
          {waypoints.length > 0 && (
            <div>
              <Tag color="blue">中途点 x{waypoints.length}</Tag>
            </div>
          )}
        </div>
        {totalDistance > 0 && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4 }}>
            <span style={{ fontWeight: 'bold', color: '#389e0d' }}>
              📏 空距: {totalDistance.toFixed(2)} km
            </span>
            <span style={{ marginLeft: 16, color: '#666' }}>
              预计飞行时间: {flightHours.toFixed(1)} 小时
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 地图选点统一入口组件
 *
 * - 有真实地图配置（provider + 对应 API Key）且 SDK 加载成功 → 使用真实地图选点（RealMapSelector）
 * - 否则回退到内置 SVG 选点地图（SvgMapSelector），并在未配置时给出引导提示
 */
const MapSelector: React.FC<MapSelectorProps> = ({
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
}) => {
  const [mapConfig, setMapConfig] = useState<MapConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [realLoadFailed, setRealLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMapConfig()
      .then((data) => {
        if (!cancelled) setMapConfig(data);
      })
      .catch(() => {
        // 请求失败时静默，拦截器已统一提示
      })
      .finally(() => {
        if (!cancelled) setConfigLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const provider = mapConfig?.provider;
  const apiKey =
    provider === 'amap'
      ? mapConfig?.amap_key
      : provider === 'baidu'
        ? mapConfig?.baidu_key
        : provider === 'tencent'
          ? mapConfig?.tencent_key
          : '';

  const useRealMap = !configLoading && !!provider && provider !== 'none' && !!apiKey && !realLoadFailed;

  const commonProps = {
    startPoint,
    endPoint,
    waypoints,
    startAddress,
    endAddress,
    onStartPointChange,
    onEndPointChange,
    onWaypointsChange,
    onStartAddressChange,
    onEndAddressChange,
  };

  if (useRealMap) {
    return (
      <RealMapSelector
        {...commonProps}
        provider={provider as MapProvider}
        apiKey={apiKey as string}
        onLoadError={() => setRealLoadFailed(true)}
      />
    );
  }

  return (
    <div>
      {!configLoading && mapConfig && !useRealMap && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="未配置地图服务，当前使用内置 SVG 选点地图。可在「系统管理 → 系统配置 → 地图配置」中填写高德/百度/腾讯 API Key 以启用真实街道地图（可缩放、精确选点）。"
        />
      )}
      <SvgMapSelector {...commonProps} />
    </div>
  );
};

export default MapSelector;
