# 三模块合并为一行横向布局 - 实施计划

## [x] Task 1: 重构 PortAnalysisChart 为左右布局
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 修改 `src/pages/dashboard/PortAnalysisChart.tsx`
  - 将纵向布局改为横向布局：左侧图例文字，右侧饼状图
  - 左侧图例：垂直排列的渠道列表（色块 + 渠道名 + 数值 + 百分比）
  - 右侧饼状图：SVG 饼图居中显示
  - 外层 Card 使用 flex 横向布局
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgement` TR-1.1: 左侧图例文字清晰可读
  - `human-judgement` TR-1.2: 右侧饼状图正确渲染
  - `programmatic` TR-1.3: `npx tsc --noEmit` 零错误

## [x] Task 2: 三模块合并为一行 + 高度统一
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 修改 `src/pages/Dashboard.tsx`
  - 将 AlertCenter + 2 × PortAnalysisChart 放入同一个 Row
  - Col 宽度：`xs={24} xl={8}`
  - 使用 Row 的 `style={{ display: 'flex', alignItems: 'stretch' }}` 确保三卡片等高
  - Card 设置 `style={{ height: '100%' }}` 确保撑满
  - 移除原来独立的 AlertCenter div 和端口分析 Row
- **Acceptance Criteria Addressed**: AC-1, AC-3
- **Test Requirements**:
  - `human-judgement` TR-2.1: 三卡片同一行
  - `human-judgement` TR-2.2: 三卡片高度一致
  - `programmatic` TR-2.3: `npx tsc --noEmit` 零错误

## [x] Task 3: 响应式与功能验证
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - 浏览器端测试：桌面端三列并排
  - 移动端测试：纵向堆叠
  - 测试所有交互功能
- **Acceptance Criteria Addressed**: AC-4, AC-5
- **Test Requirements**:
  - `human-judgement` TR-3.1: 桌面端三列并排截图
  - `human-judgement` TR-3.2: 移动端堆叠截图
  - `programmatic` TR-3.3: 控制台零 error

## [x] Task 4: 最终 TypeScript 与控制台验证
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - 运行 `npx tsc --noEmit`
  - 检查浏览器控制台
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `programmatic` TR-4.1: `npx tsc --noEmit` 零错误
  - `programmatic` TR-4.2: 控制台零 error

# Task Dependencies
- Task 1 → (无依赖)
- Task 2 → Task 1
- Task 3 → Task 2
- Task 4 → Task 3
