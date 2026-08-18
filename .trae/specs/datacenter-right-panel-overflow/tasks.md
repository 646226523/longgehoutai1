# 中控数据中台右侧面板溢出修复与分页优化 - The Implementation Plan

## [x] Task 1: 修复右侧容器溢出并约束 Tab 内容区域高度
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在右侧外层 `<div>`（包裹 Tabs 的卡片容器）上使用 Flex 纵向布局，并设置 `height: 100%` + `overflow: hidden`，确保其不超过 Grid 单元格边界。
  - 调整 Tabs 的 `style` 为 `{ height: '100%', display: 'flex', flexDirection: 'column' }`，并让 Tab 内容 `children` 容器使用 `flex: 1` + `minHeight: 0`。
  - 移除内部 `maxHeight: 580` 的硬编码，改为基于百分比/剩余空间的自适应高度。
  - 为 `renderAuctionList` / `renderRaceList` 外层容器设置 `flex: 1` + `overflow-y: auto`。
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgement` TR-1.1: 在 1920×1080 下，右侧卡片底部与中间/左侧卡片底部对齐，无内容溢出。
  - `human-judgement` TR-1.2: 切换 Tab 时容器不跳动，边界稳定。
- **Notes**: 注意父级 Grid 行高，必要时在主体三栏布局外层增加 `minHeight: calc(100vh - 72px - 240px)` 或使用 `align-items: stretch`。

## [x] Task 2: 扩充 mockAuctions 数据并扩展 AuctionItem 类型
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 扩展 `AuctionItem` 接口字段：`seller(公棚)`、`startTime`、`endTime`、`deposit`、`startingBid`、`topBidder`、`status`（`'bidding' | 'upcoming' | 'ended'`）。
  - 扩充 `mockAuctions` 至 10 条以上，每条填充完整字段。
  - 可选：同步扩展 `RaceItem` 增加 `location`、`club`、`pigeonCount`、`returnedRate` 字段。
- **Acceptance Criteria Addressed**: AC-2, AC-6
- **Test Requirements**:
  - `programmatic` TR-2.1: `mockAuctions.length >= 10`。
  - `programmatic` TR-2.2: TypeScript 编译通过（新增字段均已填充，无 `any` 逃逸）。

## [x] Task 3: 重构 renderAuctionList 为信息完整的紧凑卡片
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - 重新设计卡片结构，分三行：
    1. 顶部：图标 + 拍品名 + 状态标签（竞拍中/即将结拍/已结束）。
    2. 中部：当前价（大号金色）+ 出价次数 + 领先出价人。
    3. 底部：所属公棚 · 起止时间 · 保证金 · 起拍价（使用次级灰色小字，中间用 `·` 分隔或网格排版）。
  - 单卡 padding 调整为 `10px 12px`，字体 11-12px，保持紧凑。
  - 保留 hover 青色发光效果。
- **Acceptance Criteria Addressed**: AC-2, AC-3
- **Test Requirements**:
  - `human-judgement` TR-3.1: 单卡信息完整，无字段缺失。
  - `human-judgement` TR-3.2: 单卡高度 ≤ 140px，信息密度明显优于原版。
- **Notes**: 时间格式使用 `dayjs(item.startTime).format('MM-DD HH:mm')`。

## [x] Task 4: 为热门拍卖 Tab 增加分页
- **Priority**: high
- **Depends On**: Task 1, Task 3
- **Description**:
  - 在组件内新增状态 `auctionPage` / `racePage` 与常量 `PAGE_SIZE = 4`。
  - 使用 `useMemo` 计算 `pagedAuctions = mockAuctions.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)`。
  - 在列表容器底部增加 `Pagination` 组件，配置 `size="small"`、`pageSize={PAGE_SIZE}`、`showSizeChanger={false}`、样式适配暗色主题。
  - 同步为赛事 Tab 添加分页。
- **Acceptance Criteria Addressed**: AC-4, AC-6
- **Test Requirements**:
  - `programmatic` TR-4.1: `totalPages === Math.ceil(mockAuctions.length / PAGE_SIZE)`，点击页码后 `auctionPage` 更新。
  - `human-judgement` TR-4.2: 分页切换流畅，容器无滚动跳动。

## [x] Task 5: 构建验证与整体视觉复核
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3, Task 4
- **Description**:
  - 运行 `npm run build` 验证 TypeScript 与 ESLint 通过。
  - 启动 dev server 在 1920×1080 下复核：无溢出、分页可用、卡片信息完整、下方空白得到利用。
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
- **Test Requirements**:
  - `programmatic` TR-5.1: `npm run build` 退出码为 0。
  - `human-judgement` TR-5.2: 人工复核右侧两 Tab 视觉符合预期。
