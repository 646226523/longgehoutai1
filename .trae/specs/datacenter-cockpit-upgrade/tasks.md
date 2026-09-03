# 数据中台重构 - 决策指挥舱升级 - The Implementation Plan

## [x] Task 1: 指标卡新增 Sparkline 趋势图与进度条
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 为 `MetricCard` 组件增加 `trend?: number[]`（近 7 日数值）、`progress?: number`（进度百分比）、`progressLabel?: string` 三个可选 prop。
  - 在卡片底部渲染 Sparkline（使用小型 ECharts 实例，height=36）。
  - 在 Sparkline 下方显示 Progress 组件（小型）。
  - 为每张现有指标卡传入 mock 趋势数据和进度值。
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgement` TR-1.1: 每张指标卡底部可见 Sparkline 曲线。
  - `human-judgement` TR-1.2: Sparkline 下方有进度条，带百分比。

## [x] Task 2: 飞线地图动态化（公棚光晕+飞线流动）
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 `getMapOption` 的 `series` 中，为公棚点位 `scatter` 增加 `effect: { show: true, scale: 4, period: 4 }` 呼吸光晕。
  - 新增一组 `series: { type: 'lines', coordinateSystem: 'geo', polyline: false, effect: { show: true, period: 5, trailLength: 0.3, symbol: 'arrow', symbolSize: 6 }, lineStyle: { color: COLORS.accentGold, width: 1, opacity: 0.6, curveness: 0.3 }, data: [...] }` 用于飞线流动动画。
  - 添加 3-5 条从司放地到归巢地的 mock 飞线路径（使用 `coords: [[起点经度, 起点纬度], [终点经度, 终点纬度]]`）。
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgement` TR-2.1: 公棚点位有呼吸光晕。
  - `human-judgement` TR-2.2: 飞线上有发光箭头沿路径流动。

## [x] Task 3: 热门拍卖紧凑列表与价值排序
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 为 `AuctionItem` 新增 `heat: number`（1-5）字段表示热度指数。
  - 在 `mockAuctions` 中填充 heat 值，按 currentPrice 降序排序。
  - 重新设计卡片：顶部 ★热度 + 拍品名 + 状态；中部 ￥当前价 + 🔥出价次数 + ⏳剩余时间；底部 公棚·起止·保证金·起拍。
  - 使用 1-5 ★ 渲染热度。
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgement` TR-3.1: 列表按 currentPrice 降序。
  - `human-judgement` TR-3.2: 每卡显示 ★ 热度、剩余时间。

## [x] Task 4: 赛事实时监控改为可操作表格
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 将原「赛事实时」Tab 的 `renderRaceList` 改为使用 Ant Design `Table` 组件。
  - 列定义：{title:'赛事名称', dataIndex:'name'}、{title:'状态', render: statusTag}、{title:'参赛羽数', dataIndex:'pigeonCount'}、{title:'已归巢', dataIndex:'returnedCount'}、{title:'归巢率', render: returnRate}、{title:'冠军分速', render: speed}、{title:'操作', render: buttons}。
  - 每行操作按钮：查看详情、飞线追踪（或设置提醒）。
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgement` TR-4.1: Tab 内容为表格形式。
  - `human-judgement` TR-4.2: 每行含操作按钮。

## [x] Task 5: 赛鸽追踪列表状态筛选与异常置顶
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在底部飞行数据列表上方添加筛选区：状态下拉（全部/飞行中/归巢中/异常）。
  - 定义排序优先级：异常 > 归巢中 > 飞行中。
  - 异常行背景红色、文字白色、CSS 闪烁动画（`@keyframes blink { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`）。
  - 归巢中行使用橙色背景标记。
  - 新增「预计归巢」列和「操作」列（追踪/查看）。
  - 扩展 `FlightData` 接口增加 `etaMinutes?: number`、`isAnomaly?: boolean` 字段。
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgement` TR-5.1: 异常鸽置顶且闪烁。
  - `human-judgement` TR-5.2: 筛选下拉切换能正确过滤。

## [x] Task 6: 构建验证与浏览器复核
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3, Task 4, Task 5
- **Description**:
  - 运行 `npm run build`。
  - 浏览器截图复核所有 AC。
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `programmatic` TR-6.1: 构建成功。
  - `human-judgement` TR-6.2: 所有视觉点通过。
