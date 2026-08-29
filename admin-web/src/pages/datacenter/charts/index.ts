import * as echarts from 'echarts';
import type { LoftCity, MapMode } from '../types';
import { COLORS, provinceTop10, cityLevelData, cityPositions, cityToProvince, loftCities } from '../constants';
import { mockAuctions, auctionTrendData, mockRaces } from '../mockData';

export const getBarChartOption = (province: string | null = null): echarts.EChartsOption => {
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


export const getLineChartOption = (province: string | null = null): echarts.EChartsOption => {
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


export const getMapOption = (mapMode: MapMode, _selectedProvince: string | null): echarts.EChartsOption => {
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


export const provinceAdcodeMap: Record<string, string> = {
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
export const geoJsonCache = new Map<string, any>();
export const geoJsonLoadPromises = new Map<string, Promise<any | null>>();

export const loadProvinceGeoJSON = async (provinceName: string): Promise<any | null> => {
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


export const getProvinceMapOption = (provinceName: string, mode: MapMode = 'trails', geoJsonLoaded: boolean = true): echarts.EChartsOption => {
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

