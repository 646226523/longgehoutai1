# 中控数据中台三栏对齐与溢出修复 - Verification Checklist

- [x] Checkpoint 1: 外层 wrapper 改为 flex column，三栏 Grid 使用 `flex: 1` + `minHeight: 0`，不再随内容膨胀。
- [x] Checkpoint 2: 左侧栏 `height: 100%` + `minHeight: 0` + `overflow: hidden`，内部 flex column，溢出时内部滚动。
- [x] Checkpoint 3: 中间栏 `height: 100%` + `minHeight: 0` + `overflow: hidden`，地图区 `flex: 1` + `minHeight: 0`。
- [x] Checkpoint 4: 右侧栏 `height: 100%` + `minHeight: 0` + `overflow: hidden`，Tabs children `flex: 1` + `overflow-y: auto`。
- [x] Checkpoint 5: 1920×1080 下三栏顶部边线对齐、底部边线对齐，形成完整矩形。
- [x] Checkpoint 6: 右侧翻页到最后一页不溢出，底部边线与中/左一致。
- [x] Checkpoint 7: 左侧内容（指标卡+图表）在矩形框内，超出时内部滚动。
- [x] Checkpoint 8: `npm run build` 构建成功，无 TypeScript 错误。
