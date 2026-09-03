# 修复省份地图 GeoJSON 加载失败导致的崩溃问题 - The Implementation Plan

## [x] Task 1: 增强 GeoJSON 加载函数的容错性
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 `loadProvinceGeoJSON` 中添加更多 GeoJSON CDN 备选源
  - 增加请求超时时间到 10 秒
  - 添加加载结果缓存机制（Map 对象缓存已加载的 GeoJSON）
  - 处理特别行政区（香港、澳门、台湾）可能不存在的情况
- **Acceptance Criteria Addressed**: AC-1, AC-3
- **Test Requirements**:
  - `programmatic` TR-1.1: 验证至少有 3 个 CDN 备选源
  - `programmatic` TR-1.2: 验证加载超时为 10 秒
  - `programmatic` TR-1.3: 验证 GeoJSON 缓存逻辑存在
- **Notes**: 参考阿里云 DataV 和 ECharts 官方地图 CDN

## [x] Task 2: 修复 fallback 逻辑 - 无 GeoJSON 时的优雅降级
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 修改 `getProvinceMapOption` 支持 `geoJsonLoaded` 参数
  - 当 GeoJSON 未加载时，使用 `coordinateSystem: 'none'` 模式渲染散点和飞线（不依赖地图坐标系统）
  - 或者降级为使用全国地图背景，但只显示该省份的数据
  - 添加 `geoJsonAvailable` 状态跟踪
- **Acceptance Criteria Addressed**: AC-2, AC-3
- **Test Requirements**:
  - `programmatic` TR-2.1: 验证 fallback 模式不设置 `geo.map` 为未注册名称
  - `human-judgement` TR-2.2: 验证降级模式下散点和飞线仍可显示
- **Notes**: 这是核心修复任务

## [x] Task 3: 优化 useEffect 中的地图切换逻辑
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 修改 `selectedProvince` 变化的 useEffect
  - 区分 GeoJSON 加载成功和失败的渲染路径
  - 加载失败时使用降级 option，不尝试设置未注册的地图
  - 确保错误不会重复触发（添加加载状态锁）
- **Acceptance Criteria Addressed**: AC-2, AC-3
- **Test Requirements**:
  - `programmatic` TR-3.1: 验证 useEffect 中有 `geoJsonLoaded` 分支判断
  - `programmatic` TR-3.2: 验证不存在对未注册地图的 `setOption` 调用

## [x] Task 4: 添加地图注册表检查和安全包装
- **Priority**: medium
- **Depends On**: Task 2, Task 3
- **Description**: 
  - 在 `setOption` 前检查地图是否已注册
  - 添加 try-catch 包装，防止 ECharts 崩溃
  - 清理失败的 GeoJSON 加载尝试
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-4.1: 验证 `echarts.getMap()` 检查存在
  - `programmatic` TR-4.2: 验证 try-catch 包装了 setOption 调用

## [x] Task 5: 浏览器端验证修复效果
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3, Task 4
- **Description**: 
  - 启动开发服务器
  - 验证点击省份后控制台无错误
  - 验证省级视图正常渲染
  - 验证飞线轨迹显示
  - 验证返回全国视图功能正常
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `human-judgement` TR-5.1: 截图验证省级视图渲染
  - `programmatic` TR-5.2: 控制台无 `Map not exists` 错误
