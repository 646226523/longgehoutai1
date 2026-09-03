# 真实国内地图选点集成（高德 / 百度 / 腾讯）Spec

## Why
当前赛事赛线规划的"赛线地图"使用内置 SVG 中国地图 + 预置城市坐标，无法展示真实城市街道底图，也无法在地图上放大缩小精确定位。后台操作人员需要真实的国内地图（高德/百度/腾讯）来查看街道信息并精确选点，同时允许后台管理员自行填写各家的地图 API Key。

## What Changes
- **新增** 后台地图配置项（`system_config` 增加 `map` 分组）：地图服务商选择 + 高德/百度/腾讯三家 API Key
- **新增** 前端读取地图配置的能力（管理员登录后从后端获取，用于前端渲染地图）
- **新增** 真实地图选点组件（内部封装高德 JS API 2.0 / 百度 JS API GL / 腾讯地图 JS API 三家加载器与选点交互）
- **新增** 坐标转换工具（WGS-84 ↔ GCJ-02 ↔ BD-09），保证与现有数据库坐标体系兼容、空距计算不受影响
- **改造** `MapSelector` 为统一入口：配置了对应服务商 Key 时渲染真实地图，未配置时回退现有 SVG 地图并给出引导提示
- **改造** 系统配置页新增"地图配置"分组，供管理员填写服务商与 Key
- **范围** 仅替换赛事赛线规划（新增/编辑赛事页面的"赛线地图"卡片）内的选点组件，不影响其他页面

## Impact
- 受影响规格：`competition-map-route-planning`（其"不引入外部地图 SDK"约束被本 spec 覆盖升级）
- 受影响代码：
  - `admin-api/src/db.ts`（初始化 `map` 分组配置项）
  - `admin-api/src/routes/system/config.ts`（配置读取/更新已支持，确认 map 分组即可）
  - `admin-web/src/services/system.ts`（新增/复用读取地图配置）
  - `admin-web/src/components/MapSelector.tsx`（统一入口 + 回退逻辑）
  - `admin-web/src/components/RealMapSelector.tsx`（新增，真实地图选点）
  - `admin-web/src/utils/coordinate-transform.ts`（新增，坐标转换）
  - `admin-web/src/utils/geo.ts`（空距计算保持 WGS-84，不变）
  - `admin-web/src/pages/system/Config.tsx`（展示 map 分组，数据驱动无需大改）

## ADDED Requirements

### Requirement: 后台地图配置
系统 SHALL 在 `system_config` 中提供 `map` 分组配置，包含：启用地图服务商（`amap`/`baidu`/`tencent`/`none`）、高德 Key、百度 Key、腾讯 Key。

#### Scenario: 管理员填写地图 Key
- **WHEN** 管理员在系统配置"地图配置"分组选择服务商并填写对应 Key 后点击保存
- **THEN** 配置持久化到 `system_config`，刷新赛事页面后真实地图按所选服务商渲染

### Requirement: 真实地图渲染与选点
系统 SHALL 在配置了对应服务商 Key 时，于赛事赛线地图区域渲染真实街道地图，提供：缩放/平移控件、地图点击选点、标记拖拽、地址搜索（POI）、逆地理编码回填地址、起点/终点/中途点标记与赛线折线绘制。

#### Scenario: 后台操作人员精确选点
- **WHEN** 操作人员在地图上点击或拖动标记
- **THEN** 地图定位到真实街道位置，自动回填该点经纬度与地址，空距按新坐标自动重算

### Requirement: 坐标系统一
系统 SHALL 统一以 WGS-84 作为数据库存储与空距计算坐标系；高德/腾讯（GCJ-02）与百度（BD-09）坐标在保存前转换到 WGS-84，展示时再转换回对应服务商坐标系。

#### Scenario: 三家服务商坐标一致
- **WHEN** 分别用高德、百度、腾讯地图选择同一真实位置并保存
- **THEN** 数据库中的经纬度一致（转换误差 ≤ 50m），空距结果一致

### Requirement: 未配置 Key 的回退
系统 SHALL 在未配置任何地图 Key 时回退到现有 SVG 地图选点能力，并提示管理员到系统配置填写地图 Key 以启用真实地图。

#### Scenario: 未配置 Key
- **WHEN** 未在系统配置填写地图 Key
- **THEN** 赛线地图区域仍显示现有 SVG 选点地图，并显示"未配置地图服务，可在系统配置中填写高德/百度/腾讯 API Key 启用真实地图"的引导提示

## MODIFIED Requirements

### Requirement: MapSelector 统一入口（原：内置 SVG 地图选点）
MapSelector SHALL 保留原有 props 契约（startPoint/endPoint/waypoints/地址/变更回调），内部根据地图配置决定渲染真实地图或 SVG 地图，对上层 `CompetitionForm` 无感知，不破坏现有表单数据流。

## REMOVED Requirements

### Requirement: 仅使用内置 SVG 地图（旧约束）
**Reason**: 旧约束"不引入外部地图 SDK（无 API Key、无网络依赖）"无法满足用户查看真实街道地图与精确选点的需求。
**Migration**: 保留 SVG 作为未配置 Key 时的回退方案；真实地图作为配置后的默认方案。城市坐标与空距计算逻辑继续保留。
