# 真实国内地图选点集成 - 实施计划

## [x] Task 1: 后端地图配置项与读取接口
- **优先级**: 高
- **依赖**: 无
- **描述**:
  1. 在 `admin-api/src/db.ts` 的 `system_config` 初始化列表新增 `map` 分组配置项：
     - `map_provider`（默认 `none`，可选 `amap`/`baidu`/`tencent`/`none`）
     - `map_amap_key` / `map_baidu_key` / `map_tencent_key`（默认空）
  2. 确认 `routes/system/config.ts` 的配置读取/更新接口对 `map` 分组可用（`getConfigs` 支持按分组返回）
  3. 新增或复用前端可读接口，返回地图配置（服务商 + 各 Key），供登录后的前端渲染地图使用
- **验收标准**: spec「后台地图配置」「真实地图渲染与选点」
- **测试要求**:
  - `programmatic` TR-1.1: 数据库初始化后存在 4 个 `map` 分组配置项
  - `programmatic` TR-1.2: `GET /api/system/configs?group=map` 返回 4 个配置项
  - `programmatic` TR-1.3: 更新 `map_provider` 等配置后再次读取值正确
  - `programmatic` TR-1.4: 后端 `tsc --noEmit` 零错误

## [x] Task 2: 坐标转换工具
- **优先级**: 高
- **依赖**: 无
- **描述**:
  1. 新建 `admin-web/src/utils/coordinate-transform.ts`，实现：
     - `wgs84ToGcj02(lng, lat)` / `gcj02ToWgs84(lng, lat)`
     - `gcj02ToBd09(lng, lat)` / `bd09ToGcj02(lng, lat)`
     - `wgs84ToBd09` / `bd09ToWgs84`（组合实现）
  2. 提供 `Point` 类型复用（来自 `utils/geo.ts`）
- **验收标准**: spec「坐标系统一」
- **测试要求**:
  - `programmatic` TR-2.1: 北京 GCJ-02(116.397428, 39.90923) 转 WGS-84 后误差 < 50m
  - `programmatic` TR-2.2: WGS-84→GCJ-02→WGS-84 往返误差 < 1m
  - `programmatic` TR-2.3: 百度→GCJ-02→WGS-84 链路结果合理
  - `programmatic` TR-2.4: `npx tsc --noEmit` 零错误

## [x] Task 3: 真实地图选点组件（三厂商封装）
- **优先级**: 高
- **依赖**: Task 2
- **描述**:
  1. 新建 `admin-web/src/components/RealMapSelector.tsx`：
     - 动态加载对应服务商 SDK（高德 `AMap` / 百度 `BMapGL` / 腾讯 `TMap`），script 注入 + 加载完成 Promise
     - 地图初始化与销毁（组件卸载时清理）
     - 缩放/平移控件（各厂商原生控件）
     - 点击选点、标记（起点绿/终点红/中途点蓝）与拖拽
     - 赛线折线（Polyline）绘制
     - POI 地址搜索（各厂商搜索服务）
     - 逆地理编码回填地址
     - 坐标：地图交互使用厂商坐标系，对外通过 `onStartPointChange` 等回调输出 **WGS-84** 坐标与地址
  2. props 契约与现有 `MapSelector` 完全一致
- **验收标准**: spec「真实地图渲染与选点」「坐标系统一」
- **测试要求**:
  - `programmatic` TR-3.1: SDK 加载器正确处理成功/失败（无效 Key 时给出错误并回退）
  - `programmatic` TR-3.2: 组件卸载后无残留 DOM / 事件
  - `programmatic` TR-3.3: 对外回调输出 WGS-84 坐标
  - `programmatic` TR-3.4: `npx tsc --noEmit` 零错误

## [x] Task 4: MapSelector 统一入口与回退逻辑
- **优先级**: 高
- **依赖**: Task 1, Task 3
- **描述**:
  1. 改造 `admin-web/src/components/MapSelector.tsx`：
     - 组件挂载时读取地图配置（服务商 + Key）
     - 服务商已配置 → 渲染 `RealMapSelector`
     - 服务商未配置或 Key 无效/加载失败 → 渲染现有 SVG 选点（保留原逻辑），并显示引导提示
  2. 保持现有 props 契约与回调（`startPoint`/`endPoint`/`waypoints`/地址/变更回调）不变，确保 `CompetitionForm` 无需改动
- **验收标准**: spec「未配置 Key 的回退」「MapSelector 统一入口」
- **测试要求**:
  - `programmatic` TR-4.1: 未配置 Key 时仍渲染 SVG 地图且功能可用
  - `programmatic` TR-4.2: 配置 Key 后渲染真实地图容器
  - `programmatic` TR-4.3: 两模式下回调输出格式一致（WGS-84 + 地址）
  - `programmatic` TR-4.4: `npx tsc --noEmit` 零错误

## [x] Task 5: 系统配置页"地图配置"分组
- **优先级**: 中
- **依赖**: Task 1
- **描述**:
  1. 确认 `admin-web/src/pages/system/Config.tsx` 为数据驱动（按 `system_config` 分组渲染），`map` 分组新增后自动展示
  2. 如配置项展示需要中文名称/说明，补充到 `db.ts` 初始化项的 `name`/`description`
  3. 地图服务商字段支持下拉选择（`none`/`amap`/`baidu`/`tencent`），可在配置页说明中提示获取各厂商 Key 的入口
- **验收标准**: spec「后台地图配置」
- **测试要求**:
  - `programmatic` TR-5.1: 系统配置页出现"地图配置"分组及 4 个配置项
  - `programmatic` TR-5.2: 修改服务商与 Key 并保存成功，刷新后值保留
  - `programmatic` TR-5.3: `npx tsc --noEmit` 零错误

## [x] Task 6: 浏览器验证与构建
- **优先级**: 高
- **依赖**: Task 1-5
- **描述**:
  1. 启动前后端服务
  2. 无 Key 场景：验证赛事页面地图回退 SVG 正常，引导提示可见
  3. 配置 Key 场景：若用户提供有效 Key，验证真实地图渲染、缩放、选点、地址回填、空距重算（当前环境无 Key 时跳过真实渲染，仅验证加载失败回退路径）
  4. 验证赛事创建/编辑保存后坐标以 WGS-84 存储且空距正确
  5. 全流程控制台零错误
- **验收标准**: spec 全部验收场景
- **测试要求**:
  - `programmatic` TR-6.1: 无 Key 回退 SVG 可用，控制台零错误
  - `programmatic` TR-6.2: 无效 Key 时加载失败有提示且回退 SVG，不崩溃
  - `programmatic` TR-6.3: 赛事保存/编辑坐标与地址字段正确
  - `programmatic` TR-6.4: `npm run type-check`、`npm run build` 通过

# Task Dependencies
- [Task 2] 独立
- [Task 1] 独立
- [Task 3] 依赖 [Task 2]
- [Task 4] 依赖 [Task 1]、[Task 3]
- [Task 5] 依赖 [Task 1]
- [Task 6] 依赖 [Task 1]-[Task 5]
