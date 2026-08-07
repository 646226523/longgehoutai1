# 工作台模块顺序调整 - PRD

## Overview
- **Summary**: 调整工作台 Dashboard 页面的模块展示顺序，将"快捷入口"模块整体移至"预警中心"与"运营趋势图"之间，以匹配用户期望的信息层级。
- **Purpose**: 优化工作台信息架构，让管理员在看到预警后立即看到快捷操作入口，形成"发现问题 → 快速处理 → 查看趋势"的自然信息流。
- **Target Users**: 后台管理员、运营人员

## Goals
- 将模块顺序从：欢迎→指标→预警→趋势图→快捷入口→待办，调整为：欢迎→指标→预警→**快捷入口**→**趋势图**→待办
- 保持所有现有功能不变（仅调整顺序）
- 保持响应式布局与样式完整性

## Non-Goals (Out of Scope)
- 不修改任何组件的内部实现
- 不修改 Mock 数据
- 不新增或删除任何模块
- 不调整各模块内的视觉样式

## Background & Context
- 当前文件：`src/pages/Dashboard.tsx`
- 当前顺序（第 35-84 行）：
  1. 欢迎卡片
  2. 4 个指标卡片
  3. 预警中心 AlertCenter（第 58-61 行）
  4. 运营趋势图 TrendChart（第 63-71 行）
  5. 快捷入口 QuickEntryPanel（第 73-79 行）
  6. 待办事项 TodoListPanel（第 81-84 行）
- 需将第 5 项（快捷入口）移至第 4 项之前

## Functional Requirements

### FR-1: 模块顺序调整
- 工作台模块从上到下依次为：
  1. 欢迎卡片（含日期）
  2. 4 个指标卡片（一行）
  3. 预警中心（独立一行）
  4. **快捷入口**（独立一行，上移至此）
  5. **运营趋势图**（独立一行，下移一位）
  6. 待办事项（独立一行）

## Non-Functional Requirements
- **NFR-1**: `npx tsc --noEmit` 零错误
- **NFR-2**: 浏览器控制台零 error 级别日志
- **NFR-3**: 所有模块间距保持一致（marginBottom: 16）

## Constraints
- **Technical**: React 18 + Ant Design 5 + TypeScript
- **Scope**: 仅修改 `Dashboard.tsx` 的 JSX 结构，不修改其他文件

## Assumptions
- 假设模块顺序调整不影响任何业务逻辑或路由跳转
- 假设各组件 props 在新顺序下仍然正确传递

## Acceptance Criteria

### AC-1: 模块顺序正确
- **Given**: 工作台加载完成
- **When**: 从上到下观察页面
- **Then**: 模块顺序为：欢迎卡片 → 指标卡片 → 预警中心 → 快捷入口 → 趋势图 → 待办事项
- **Verification**: `human-judgment`

### AC-2: 功能完整性
- **Given**: 工作台加载完成
- **When**: 分别测试快捷入口点击跳转、趋势图切换、预警中心查看全部
- **Then**: 所有交互功能保持正常
- **Verification**: `programmatic`

### AC-3: TypeScript 编译通过
- **Given**: 修改完成
- **When**: 运行 `npx tsc --noEmit`
- **Then**: 零错误
- **Verification**: `programmatic`

### AC-4: 浏览器控制台无错误
- **Given**: 修改完成并在浏览器中打开
- **When**: 检查浏览器控制台
- **Then**: 零 error 级别日志
- **Verification**: `programmatic`
