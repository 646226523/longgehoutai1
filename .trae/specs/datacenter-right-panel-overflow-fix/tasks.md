# 数据中台右侧面板溢出与对齐修复 - The Implementation Plan

## [x] Task 1: 修复右侧 Tabs 容器高度继承与溢出问题
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 为右侧 Tabs 外层容器添加 `overflow: hidden` 确保边界约束
  - 使用 Ant Design Tabs 的 `destroyInactiveTabPane` 属性清理非激活 Tab
  - 修改 Tabs 的样式配置，确保 `ant-tabs-content-holder` 和 `ant-tabs-content` 正确继承高度
  - 为 Tab children 容器添加 `display: flex` + `flexDirection: column`，使列表区可滚动、分页固定底部
  - 修改 `renderAuctionList` 和 `renderRaceList` 的布局：列表区使用 `flex: 1; overflowY: auto`，分页使用 `flexShrink: 0`
  - 确保右侧面板与顶部标题栏、底部飞行数据列表的 padding/margin 对齐
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3
- **Test Requirements**:
  - `human-judgement` TR-1.1: 右侧热门拍卖 Tab 内容不溢出容器
  - `human-judgement` TR-1.2: 右侧赛事实时 Tab 内容不溢出容器
  - `human-judgement` TR-1.3: 三个面板的上下边缘对齐
  - `human-judgement` TR-1.4: Tab 切换后布局不跳动

## [x] Task 2: 构建验证
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 运行 `npm run build` 确保无 TypeScript 错误
  - 浏览器截图验证所有 AC
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `programmatic` TR-2.1: `npm run build` 成功
  - `human-judgement` TR-2.2: 视觉验证通过
