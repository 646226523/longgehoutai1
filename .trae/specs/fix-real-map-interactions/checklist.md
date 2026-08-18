# 验证清单

## P0 控制台警告
- [x] 真实地图加载中，控制台无 `[antd: Spin] tip only work in nest or fullscreen pattern` 警告（实测 count=0）
- [x] 地图加载中仍显示加载指示器与提示文字（`<Spin />` + 嵌套文字提示）

## P1 搜索与定位
- [x] 腾讯地图 SDK 加载 URL 包含 `libraries=service`（`getSdkScriptSrc` tencent 分支）
- [x] 腾讯 POI 搜索使用 `TMap.service.Suggestion`（全国范围输入提示，不受当前视野限制），逆地理编码使用 `TMap.service.Geocoder`，不再调用不存在的 `.search()` 方法
- [x] 高德使用 `AMap.plugin` 异步加载 `PlaceSearch`/`Geocoder`/`Scale`/`ToolBar` 插件后再创建地图/搜索
- [x] 三家搜索返回 POI 结果，选中后地图定位并设置对应节点标记（浏览器实测：搜索返回 8 条，选中起点后小旗子 1 个、再选终点后 2 个）
- [x] 三家搜索/逆地理编码失败时静默处理，不抛未捕获异常（try/catch 与 Promise.catch 防御）

## P2 折线与标记
- [x] 腾讯 `MultiPolyline` 使用 `geometries: [{ id, styleId, paths }]` 官方结构
- [x] 地图存在 ≥2 个节点时显示起点→中途点→终点的折线（腾讯 canvas 路线层存在，实测空距自动计算显示）
- [x] 新增/拖拽/删除节点后折线实时更新（`syncMap` 响应 props 变化重建覆盖物）
- [x] 起点/终点/中途点节点使用小旗子标记（绿/红/蓝），带名称或序号标签（浏览器实测 2 个）
- [x] 小旗子标记支持拖拽（腾讯使用 `TMap.DOMOverlay` 基类继承实现，pointer 事件拖拽，坐标转换正确）

## 质量与构建
- [x] 前端 `npx tsc --noEmit` 零错误
- [x] 前端 `npm run build` 成功（vite build 通过）
- [x] 浏览器赛事赛线规划页控制台零错误（error_count=0，仅 React Router 未来特性提示）
- [x] 未配置 Key 时仍回退 SVG 地图，回退逻辑不受影响（`MapSelector` 的 `useRealMap`/`realLoadFailed` 回退完好）
