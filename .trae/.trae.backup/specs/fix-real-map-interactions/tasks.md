# Tasks

- [x] Task 1: 修复 RealMapSelector 交互缺陷（P0/P1/P2）
  - [x] SubTask 1.1: P0 修复 —— 移除独立 `<Spin tip="地图加载中..." />` 的 `tip` 属性（或改为嵌套/非独立用法），保留加载提示文字，消除 `[antd: Spin] tip` 控制台警告
  - [x] SubTask 1.2: P1 修复 —— 三厂商 POI 搜索与定位：
    - 腾讯：`getSdkScriptSrc` 的 tencent 分支 URL 追加 `&libraries=service`；`searchPoi` 使用 `TMap.service.Suggestion`（全国范围输入提示，替代受限视野的 `searchRectangle`）
    - 高德：新增 promisified `AMap.plugin(['AMap.PlaceSearch','AMap.Geocoder','AMap.Scale','AMap.ToolBar'], cb)` 加载，在创建地图/搜索/逆地理编码前 await
    - 百度：确认 `BMapGL.LocalSearch`/`Geocoder` 用法正确，保持防御式 try/catch
  - [x] SubTask 1.3: P2 修复 —— 折线与小旗子标记：
    - 腾讯 `createPolyline` 改为 `new TMap.MultiPolyline({ map, styles: {...}, geometries: [{ id: 'route', styleId: 'route', paths: vendorPoints }] })`（官方结构）
    - 腾讯小旗子标记改为继承 `TMap.DOMOverlay` 抽象基类的自定义 DOM 覆盖物（`TMap.DOMMarker` 在官方 API 中不存在，原实现导致标记不渲染）；三厂商统一使用小旗子样式（旗杆+三角小旗+底座，起点绿/终点红/中途点蓝，带名称或序号标签），支持拖拽
- [x] Task 2: 前端类型检查与构建
  - 在 `admin-web` 执行 `npx tsc --noEmit` 零错误；`npm run build` 成功
- [x] Task 3: 浏览器验证
  - 启动前后端，登录后进入赛事赛线规划页，验证：控制台无 `[antd: Spin] tip` 警告；搜索框交互与 POI 下拉可用（返回 8 条）；三厂商折线结构正确；小旗子标记渲染（选中起点 1 个、起点+终点 2 个）；空距自动计算；SVG 回退与真实地图切换逻辑不受影响

# Task Dependencies
- [Task 1] 无依赖（单一文件内完成 P0/P1/P2）
- [Task 2] 依赖 [Task 1]
- [Task 3] 依赖 [Task 2]
