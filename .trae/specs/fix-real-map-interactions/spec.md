# 修复真实地图选点交互缺陷 Spec

## Why
赛事赛线规划的真实地图选点组件存在三类缺陷：控制台 Spin 警告（P0）、地址搜索与定位失效（P1）、赛线折线不显示且节点标记需改为小旗子（P2），影响后台操作人员精确选点与赛线可视化。

## What Changes
- **P0** 移除独立 `<Spin tip>` 导致的 `[antd: Spin] tip only work in nest or fullscreen pattern` 警告
- **P1** 修复三家 POI 地址搜索与地图定位：
  - 腾讯：SDK 加载 URL 增加 `&libraries=service`；`TMap.service.Search` 使用正确的 `searchRectangle`/`searchRegion` 方法（原 `.search()` 不存在）
  - 高德：用 `AMap.plugin` 异步加载 `PlaceSearch`/`Geocoder`/`Scale`/`ToolBar` 插件
  - 百度：确认 LocalSearch/Geocoder 可用并保持防御式处理
- **P2** 修复腾讯 `MultiPolyline` 折线（改用 `geometries: [{ styleId, paths }]` 官方结构）；节点标记改为"小旗子"样式（起点绿/终点红/中途点蓝，带名称/序号标签）；起点→中途点→终点动态关联折线随节点变化实时更新

## Impact
- Affected specs: real-map-provider-integration
- Affected code: `admin-web/src/components/RealMapSelector.tsx`

## ADDED Requirements
### Requirement: 节点小旗子标记
系统 SHALL 在真实地图上以"小旗子"样式标记起点/终点/中途点节点，并支持拖拽与随节点更新。

#### Scenario: 节点标记显示
- **WHEN** 用户在真实地图上设置了起点/终点/中途点
- **THEN** 每个节点以彩色小旗子标记显示（起点绿色、终点红色、中途点蓝色），并带有名称/序号标签

### Requirement: 赛线动态关联折线
系统 SHALL 在起点→中途点→终点之间绘制动态关联折线，节点发生变化时折线实时更新。

#### Scenario: 存在两个及以上节点
- **WHEN** 地图上存在 ≥2 个节点
- **THEN** 显示连接这些节点的折线，且新增/拖拽/删除节点后折线随之更新

## MODIFIED Requirements
### Requirement: POI 地址搜索与定位
系统 SHALL 支持在搜索框输入地址/POI 后返回该服务商的匹配结果，选中结果后地图定位并放置标记。

#### Scenario: 三厂商地址搜索
- **WHEN** 用户在搜索框输入关键字
- **THEN** 返回对应服务商（腾讯/高德/百度）的 POI 匹配结果；选中某条结果后地图定位到该位置并设置对应节点
- **AND** 搜索失败时静默处理，不抛未捕获异常

### Requirement: 地图加载状态提示
系统 SHALL 在加载真实地图时展示加载指示与提示文字，且不产生 antd Spin 警告。

#### Scenario: 地图加载中
- **WHEN** 地图 SDK 加载中
- **THEN** 显示加载指示器与"地图加载中..."文字，控制台无 `[antd: Spin] tip` 警告
