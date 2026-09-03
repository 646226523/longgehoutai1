# 腾讯地图定位修复 - The Implementation Plan

## [x] Task 1: 创建公棚页面启用地图组件
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 `admin-web/src/pages/loft/List.tsx`，移除创建模式下的占位符 `<div>`，改为始终渲染 `LoftMapPicker` 组件
  - 当前代码 `editing && !isCreateMode` 条件导致创建模式不渲染地图，改为始终渲染
  - 创建模式下初始经纬度为 null，地址为空，组件本身已支持此情况
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: 打开创建公棚弹窗时，地图区域不再显示占位符
  - `human-judgement` TR-1.2: 创建公棚弹窗右侧显示完整的地图选点组件

## [x] Task 2: 实现腾讯地图逆地理编码（点击回填地址）
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 `LoftMapPicker.tsx` 的 `reverseGeocode` 函数中，为 `tencent` 分支添加腾讯地图逆地理编码调用
  - 使用 `TMap.service.Geocoder`（需确保加载 `service` 库，已在 SDK URL 中添加 `&libraries=service`）
  - 在 `initMap` 中初始化腾讯地图的 Geocoder 实例保存到 `geocoderRef.current`
  - 点击地图/拖拽标记时通过逆地理编码回填地址
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-2.1: 腾讯地图点击选点后，`onChange` 回调中 `address` 字段为非空字符串
  - `human-judgement` TR-2.2: 点击地图后地址字段回填结果合理

## [x] Task 3: 实现腾讯地图地址搜索
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 在 `handleSearch` 函数中为 `tencent` 分支添加地理编码调用
  - 使用 `geocoderRef.current.geocoder(address, callback)` 将地址转为经纬度
  - 定位成功后调用 `placeMarker('tencent', {lng, lat})`
  - 处理未找到地址的情况（显示 message.warning）
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-3.1: 输入有效地址后搜索成功，地图定位且经纬度更新
  - `human-judgement` TR-3.2: 搜索失败时有明确提示

## [x] Task 4: 实现腾讯地图定位（重新定位按钮）
- **Priority**: medium
- **Depends On**: None
- **Description**: 
  - 在 `handleLocate` 函数中为 `tencent` 分支添加浏览器定位支持
  - 腾讯地图使用 `navigator.geolocation` 获取浏览器位置，或使用 `TMap.service.Geolocation`
  - 定位成功后调用 `placeMarker` 更新标记
  - 定位失败时给出提示
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgement` TR-4.1: 点击"重新定位"按钮后，地图尝试定位并更新标记

## [x] Task 5: 构建与端到端验证
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3, Task 4
- **Description**: 
  - 运行 `npm run build` 确保无 TypeScript 错误
  - 浏览器端到端测试：创建公棚 → 地图加载 → 点击选点 → 地址回填 → 搜索地址 → 保存
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-5.1: `npm run build` 无错误
  - `programmatic` TR-5.2: 浏览器测试完整通过
