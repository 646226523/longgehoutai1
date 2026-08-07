# 工作台模块顺序调整 - 实施计划

## [x] Task 1: 调整 Dashboard.tsx 模块顺序
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 修改 `src/pages/Dashboard.tsx`
  - 将 QuickEntryPanel 的 `<div>` 块（第 73-79 行）移至 AlertCenter 块（第 59-61 行）之后、TrendChart 块（第 64-71 行）之前
  - 调整注释编号：3.预警中心 → 4.快捷入口 → 5.运营趋势图 → 6.待办事项
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `human-judgement` TR-1.1: 截图确认模块顺序为欢迎→指标→预警→快捷入口→趋势图→待办
  - `programmatic` TR-1.2: 点击快捷入口跳转正常
  - `programmatic` TR-1.3: 点击趋势图切换时间范围正常

## [x] Task 2: TypeScript 编译验证
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 在 `p:/龙鸽项目/longgehoutai/admin-web/` 目录运行 `npx tsc --noEmit`
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-2.1: 零错误

## [x] Task 3: 浏览器验证
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 启动 dev server，浏览器打开工作台
  - 截图确认模块顺序
  - 检查控制台零 error
- **Acceptance Criteria Addressed**: AC-1, AC-4
- **Test Requirements**:
  - `human-judgement` TR-3.1: 截图确认模块顺序正确
  - `programmatic` TR-3.2: 控制台零 error

# Task Dependencies
- Task 1 → (无依赖)
- Task 2 → Task 1
- Task 3 → Task 1
