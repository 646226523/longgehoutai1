# 工作台重构 - 实施计划

## [x] Task 1: 创建 Mock 数据和类型定义
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 创建 `src/pages/dashboard/mockData.ts`
  - 定义 DashboardData 类型接口
  - 生成模拟数据：核心指标、趋势数据、预警列表、快捷入口状态
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `programmatic` TR-1.1: TypeScript 类型正确

## [x] Task 2: 创建指标卡片组件 MetricCard.tsx
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 卡片包含：图标、标题、主数值、趋势百分比、健康度标签
  - 进度条组件
  - 辅助信息（昨日新增、今日实时等）
  - 点击跳转
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgement` TR-2.1: 截图确认卡片设计符合规范

## [x] Task 3: 创建趋势分析组件 TrendChart.tsx
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 使用纯 SVG 绘制折线图
  - 3 条数据线（基因、用户、NFT）
  - 鼠标悬停显示 Tooltip
  - 时间范围切换（7天/30天）
  - 数据洞察文字
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgement` TR-3.1: 截图确认折线图正确渲染

## [x] Task 4: 创建预警中心组件 AlertCenter.tsx
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 四级预警色标
  - 预警列表（标题、时间、链接）
  - "查看全部"按钮
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgement` TR-4.1: 截图确认预警组件

## [x] Task 5: 创建快捷入口组件 QuickEntryPanel.tsx
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 4 个快捷入口卡片
  - 每个卡片显示待办数量徽章
  - 点击跳转
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgement` TR-5.1: 截图确认状态徽章正确显示

## [x] Task 6: 重写 Dashboard.tsx
- **Priority**: high
- **Depends On**: Task 2, 3, 4, 5
- **Description**:
  - 整合所有子组件
  - 欢迎卡片 + 4 指标卡片 + 趋势分析 + 预警中心 + 快捷入口
  - 响应式布局
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-6.1: `npx tsc --noEmit` 零错误
  - `human-judgement` TR-6.2: 整体截图确认

## [x] Task 7: 浏览器验证
- **Priority**: high
- **Depends On**: Task 6
- **Description**:
  - 截图验证所有模块
  - 检查控制台错误
  - 测试交互功能
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-7.1: 控制台零错误
  - `human-judgement` TR-7.2: 截图确认全部模块
