# 任务计划：地图搜索功能修复 & 控制台警告消除

## Task 1: 修复高德/腾讯/百度搜索坐标双重转换 (high)

### 描述
`handleSearch` 中各地图分支的搜索 API 返回的坐标是 GCJ-02（高德/腾讯）或 BD-09（百度），但代码直接将其当作 WGS-84 传给 `placeMarker`，导致 `placeMarker` 内部再次执行 `wgs84ToGcj02()` 转换，坐标被双重偏移。

### 修复方案
- **腾讯分支**：`searchRegion()` 返回 `location`（GCJ-02），需先 `gcj02ToWgs84()` 转换后再传给 `placeMarker('tencent', pos)`
- **高德分支**：`Geocoder.getLocation()` 返回 `location`（GCJ-02），同样需 `gcj02ToWgs84()` 转换
- **百度分支**：`Geocoder.getPoint()` 返回 BD-09 的 Point，通过 `fromVendorCoords('baidu', point)` 已正确处理

### 文件修改
- `src/components/LoftMapPicker.tsx`: `handleSearch` 函数中腾讯/高德分支

### 验收 (rule)
- 搜索「天安门」后标记位置与地图实际位置偏差 ≤ 50m

---

## Task 2: 修复 Geocoder 竞态 & 统一使用已加载实例 (high)

### 描述
高德地图的 `AMap.Geocoder` 通过 `AMap.plugin()` 异步加载，`handleSearch` 中直接 `new AMap.Geocoder()` 存在竞态。百度分支同理。

### 修复方案
- 高德：删除 `handleSearch` 中 `new AMap.Geocoder()`，改用 `geocoderRef.current`，增加就绪检查
- 百度：删除 `handleSearch` 中 `new BMapGL.Geocoder()`，改用 `geocoderRef.current`，增加就绪检查
- 增加 try-catch 包裹，防止异常冒泡

### 文件修改
- `src/components/LoftMapPicker.tsx`: `handleSearch` 函数中高德/百度分支

### 验收 (rule)
- 插件加载完成前点击搜索显示「地理编码服务未就绪」提示
- 插件加载完成后搜索正常工作

---

## Task 3: useCallback 包裹 handleSearch & 空值反馈 (medium)

### 描述
`handleSearch` 未使用 `useCallback`，每次渲染重新创建。搜索框为空时静默返回，用户无反馈。

### 修复方案
- 用 `useCallback` 包裹 `handleSearch`，依赖 `[searchInput, provider, message]`
- 空值时显示 `message.warning('请输入搜索地址')`

### 文件修改
- `src/components/LoftMapPicker.tsx`: `handleSearch` 函数

### 验收 (rule)
- 搜索框为空时点击搜索显示提示信息
- React DevTools Profiler 中无不必要的函数重建

---

## Task 4: 修复 Ant Design 弃用警告 (medium)

### 描述
控制台有 2 条弃用警告：
1. `Drawer` 的 `bodyStyle` 属性 → 应使用 `styles={{ body: ... }}`
2. `Input` 的 `addonAfter` 属性 → 应使用 `Space.Compact` 或其他方案

### 修复方案
- `bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column' }}` → `styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}`
- `addonAfter={<a onClick={...}>重新生成</a>}` → 使用 `Input.Group` 或 `Space` 包裹 + `Button` 组合

### 文件修改
- `src/pages/detection/Org.tsx`: Drawer 组件和机构编码 Input

### 验收 (rule)
- 打开抽屉后控制台无 `bodyStyle` 弃用警告
- 机构编码字段旁「重新生成」按钮功能正常且无 `addonAfter` 弃用警告

---

## Task 5: 验证与测试 (high)

### 描述
在浏览器中验证所有修复。

### 验证步骤
1. 启动前端开发服务器
2. 登录后台
3. 进入「检测机构管理」页面
4. 点击「新增机构」打开抽屉
5. 滚动到地图区域
6. 在搜索框输入「天安门」
7. 点击「搜索」
8. 验证标记点出现在正确位置
9. 检查控制台是否干净
10. 验证「重新生成」按钮功能正常
11. 验证空搜索反馈

### 验收 (rule)
- 搜索成功标记正确显示
- 控制台零弃用警告
- 空搜索有反馈提示
