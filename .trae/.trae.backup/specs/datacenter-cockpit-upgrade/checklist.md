# 数据中台重构 - 决策指挥舱升级 - Verification Checklist

- [x] Checkpoint 1: `MetricCard` 组件新增 `trend` 和 `progress` props，底部渲染 Sparkline（ECharts mini）和 Progress。
- [x] Checkpoint 2: 所有指标卡显示 Sparkline 曲线（近 7 日数据）和进度条。
- [x] Checkpoint 3: 飞线地图公棚点位有呼吸光晕（`effect: { show: true, scale: 4 }`）。
- [x] Checkpoint 4: 地图新增飞线流动动画（`type: 'lines'` + `effect`），至少 3 条路径。
- [x] Checkpoint 5: `AuctionItem` 扩展 `heat` 字段，mock 数据按 currentPrice 降序。
- [x] Checkpoint 6: 热门拍卖卡片显示 ★ 热度、剩余时间，紧凑排版。
- [x] Checkpoint 7: 赛事实时 Tab 使用 `Table` 组件展示，列含状态/羽数/归巢率/分速/操作。
- [x] Checkpoint 8: 底部飞行数据列表新增状态筛选下拉。
- [x] Checkpoint 9: 异常鸽置顶、红色标记、闪烁动画；归巢中鸽橙色标记次置顶。
- [x] Checkpoint 10: 飞行数据列表新增「预计归巢」列和「操作」列。
- [x] Checkpoint 11: `FlightData` 接口扩展 `etaMinutes`、`isAnomaly` 字段。
- [x] Checkpoint 12: `npm run build` 构建成功，无 TypeScript 错误。
