# 修复省份地图 GeoJSON 加载失败导致的崩溃问题 - Product Requirement Document

## Overview
- **Summary**: 修复点击省份进入省级视图时，因 GeoJSON 地图数据加载失败导致的 ECharts 严重崩溃问题。当 CDN 不可用或加载超时，系统应优雅降级而非持续报错。
- **Purpose**: 消除控制台中 `Map XXX not exists` 和 `Cannot read properties of undefined (reading 'regions')` 等 7 条错误日志，确保省级视图在任何网络环境下都能正常渲染。
- **Target Users**: 数据中台管理员

## Goals
- [ ] 修复 GeoJSON 加载失败时的崩溃问题
- [ ] 实现优雅降级机制，确保省级视图至少能显示散点和飞线
- [ ] 消除控制台错误日志
- [ ] 增强 GeoJSON 加载的容错性（多个 CDN 备选）

## Non-Goals (Out of Scope)
- 不修改全国地图视图的渲染逻辑
- 不修改 GeoJSON 数据本身
- 不新增后端 API 来代理 GeoJSON 请求

## Background & Context
- **当前问题**: 
  1. `loadProvinceGeoJSON` 尝试从 `geo.datav.aliyun.com` 和 `fastly.jsdelivr.net` 加载省级 GeoJSON
  2. 当加载失败时，代码回退到 `getProvinceMapOption`，但其中 `geoConfig.map` 设为未注册的省份名称
  3. ECharts 因找不到地图数据抛出 `Map XXX not exists` 和 `Cannot read properties of undefined (reading 'regions')` 错误
- **技术栈**: React + ECharts 5 + TypeScript

## Functional Requirements
- **FR-1**: 当 GeoJSON 加载成功时，正常渲染省级地图和飞线
- **FR-2**: 当 GeoJSON 加载失败时，降级使用全国地图（china）但只显示该省份的数据点
- **FR-3**: 当所有 CDN 都不可用时，降级为无地图模式（仅散点+飞线）
- **FR-4**: 增加更多 GeoJSON CDN 备选源，提高加载成功率
- **FR-5**: 缓存已加载的 GeoJSON 数据，避免重复请求

## Non-Functional Requirements
- **NFR-1**: 控制台不应持续输出错误日志
- **NFR-2**: 页面不应因 GeoJSON 加载失败而崩溃
- **NFR-3**: 加载超时时间应合理（建议 10 秒）

## Constraints
- **Technical**: 必须兼容 ECharts 5 的 API
- **Dependencies**: 依赖外部 CDN 提供 GeoJSON 数据

## Assumptions
- [ ] 用户网络可能无法访问所有 CDN
- [ ] 某些省份（如特别行政区）的 GeoJSON 可能不存在于标准 CDN

## Acceptance Criteria

### AC-1: GeoJSON 加载成功
- **Given**: 用户选择一个省份，该省份 GeoJSON 可正常加载
- **When**: 系统点击省份进入省级视图
- **Then**: 正确渲染省级地图、城市节点和飞线轨迹
- **Verification**: `human-judgment`

### AC-2: GeoJSON 加载失败 - 优雅降级
- **Given**: 用户选择一个省份，GeoJSON 加载失败
- **When**: 系统无法获取 GeoJSON 数据
- **Then**: 使用降级模式渲染（散点+飞线），不显示地图底图，但数据正常显示
- **Verification**: `programmatic`

### AC-3: 控制台无错误日志
- **Given**: 省级视图正常渲染或降级渲染
- **When**: 打开浏览器开发者工具查看控制台
- **Then**: 不存在 `Map XXX not exists` 或 `regions` 相关的错误
- **Verification**: `programmatic`

### AC-4: 飞线数据完整
- **Given**: 省级视图成功渲染
- **When**: 切换到轨迹模式
- **Then**: 显示该省份所有比赛路线的飞线轨迹
- **Verification**: `human-judgment`

## Open Questions
- [ ] 是否需要添加本地 GeoJSON 缓存？
- [ ] 降级模式是否需要完全移除地图背景？
