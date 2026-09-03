# 中控数据中台右侧面板溢出修复与分页优化 - Verification Checklist

- [x] Checkpoint 1: 右侧外层卡片容器使用 flex 纵向布局 + height 约束，不超出 Grid 单元格边界。
- [x] Checkpoint 2: 右侧 Tabs 使用 flex:1 + minHeight:0 填充父容器，Tab 内容 children 区域通过 flex 自适应剩余高度。
- [x] Checkpoint 3: 移除了 `maxHeight: 580` 的硬编码，改用自适应方案；列表滚动区域使用 `overflow-y: auto`。
- [x] Checkpoint 4: `AuctionItem` 接口已扩展 `seller / startTime / endTime / deposit / startingBid / topBidder / status` 字段。
- [x] Checkpoint 5: `mockAuctions` 数据条数 ≥ 10 (当前 12 条)，字段全部填充完整，TypeScript 类型安全。
- [x] Checkpoint 6: `renderAuctionList` 卡片展示完整信息：图标+名称+状态标签、当前价+出价次数+领先人、所属公棚+起止时间+保证金+起拍价。
- [x] Checkpoint 7: 单卡紧凑排版（padding 10px 12px，字体 11-13px，高度约 120px），信息密度显著提升。
- [x] Checkpoint 8: 热门拍卖 Tab 新增分页，PAGE_SIZE = 4，使用 Ant Design `Pagination` 组件。
- [x] Checkpoint 9: 赛事实时 Tab 同步增加分页，交互与拍卖 Tab 一致。
- [x] Checkpoint 10: 分页切换时容器边界稳定、无跳动、无溢出（已通过浏览器截图验证）。
- [x] Checkpoint 11: 保留 hover 青色发光动效，与整体暗色科技主题协调。
- [x] Checkpoint 12: `npm run build` 构建成功，无 TypeScript 错误。
