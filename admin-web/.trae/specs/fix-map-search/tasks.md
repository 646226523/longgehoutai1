# 任务列表 - 修复地区搜索框及控制台错误

## Task 1: 修复 LoftMapPicker 腾讯地图标记点创建
- 状态：completed
- 优先级：high
- 关联 AC：AC-1, AC-2
- 描述：修复腾讯地图 GL JS v1.exp 环境下标记点创建失败的问题
- 实现细节：
  - 将 `new TMap.Marker()` 替换为 `new TMap.MultiMarker()`
  - 修复坐标创建：使用 `new TMap.LatLng(lat, lng)` 创建正确的坐标对象
  - 搜索结果坐标从 GCJ-02 转换为 WGS-84（`gcj02ToWgs84`）
  - `MultiMarker` 的 `geometries` 中 `position` 使用 `TMap.LatLng` 实例
  - 搜索场景直接使用搜索返回的地址，跳过有问题的 `Geocoder.getAddress`
  - 地图点击事件坐标获取兼容多种格式（`getLat()`/`lat`/`y`）
- 测试要求：
  - TR-1.1 (rule): 搜索"陆家嘴"后地图显示标记点
  - TR-1.2 (rule): 控制台无 `TMAP.LATLNG` 类型错误
  - TR-1.3 (rule): 地址字段被正确填充
- 完成证据：
  - 浏览器测试通过：搜索"北京"后标记点出现，地址显示"北京市"
  - 控制台日志仅一条 `[TMap Search] result: {status: 0, ...}` info 消息
  - 类型错误消失

## Task 2: 修复 Ant Design Drawer bodyStyle 弃用警告
- 状态：completed
- 优先级：high
- 关联 AC：AC-3
- 描述：将已弃用的 `bodyStyle` 属性替换为 `styles.body`
- 实现细节：
  - `Org.tsx`: Drawer 组件 `bodyStyle={{ padding: 0 }}` → `styles={{ body: { padding: 0 } }}`
  - `Order.tsx`: Drawer 组件 `bodyStyle={{ padding: 0 }}` → `styles={{ body: { padding: 0 } }}`
  - `Order.tsx`: Card 组件 `bodyStyle={{ padding: 0 }}` → `styles={{ body: { padding: 0 } }}`
- 测试要求：
  - TR-2.1 (rule): 控制台无 `bodyStyle` 弃用警告
- 完成证据：
  - 浏览器测试：控制台日志中无 bodyStyle 相关警告

## Task 3: 修复 Ant Design Input addonAfter 弃用警告
- 状态：completed
- 优先级：high
- 关联 AC：AC-3
- 描述：将 Input 的 `addonAfter` 属性替换为 `Space.Compact` 布局
- 实现细节：
  - `Org.tsx`: 将机构编码字段的 `<Input addonAfter={Button}>` 改为 `<Space.Compact><Input/><Button/></Space.Compact>`
- 测试要求：
  - TR-3.1 (rule): 控制台无 `addonAfter` 弃用警告
  - TR-3.2 (rule): "重新生成"按钮功能保持正常
- 完成证据：
  - 浏览器测试：点击"重新生成"后编码从 `LAB-2026-0819-436` 变为 `LAB-2026-0819-858`
  - 控制台无 addonAfter 警告

## Task 4: 验证空搜索校验
- 状态：completed
- 优先级：medium
- 关联 AC：AC-4
- 描述：确认搜索框为空时点击搜索显示"请输入搜索地址"
- 实现细节：已存在的空值检查逻辑无需修改
- 测试要求：
  - TR-4.1 (rule): 空搜索触发 message.warning
- 完成证据：
  - 浏览器测试：清空搜索框后点击搜索，显示"请输入搜索地址"提示

## Task 5: TypeScript 编译验证
- 状态：completed
- 优先级：high
- 关联 AC：AC-5
- 描述：确保所有修改后 TypeScript 编译零错误
- 测试要求：
  - TR-5.1 (rule): `npx tsc --noEmit` 退出码为 0
- 完成证据：
  - 命令行输出：退出码 0，无错误信息
