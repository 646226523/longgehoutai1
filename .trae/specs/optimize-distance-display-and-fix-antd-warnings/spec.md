# 空距显示优化与 Ant Design 弃用警告修复 Spec

## Overview
- **Summary**: 优化赛事列表中“空距”字段的显示格式，将长小数（如 `16.55642742818527 km`）格式化为保留两位小数（如 `16.56 km`），提升可读性。同时修复控制台中出现的 Ant Design `InputNumber` 的 `addonAfter` 属性弃用警告和 `message` 静态函数警告，确保代码规范性。
- **Purpose**: 提升后台管理系统的用户体验和代码质量，消除开发环境中的噪音警告。
- **Target Users**: 赛事管理人员、系统开发者。

## Goals
- [Primary goal 1] 格式化赛事列表中的空距显示，使其数值保留两位小数。
- [Primary goal 2] 修复 `CompetitionForm` 中 `InputNumber` 组件的 `addonAfter` 弃用警告。
- [Primary goal 3] 修复 `CompetitionForm` 中 `message` 静态函数调用的弃用警告。

## Non-Goals (Out of Scope)
- 修改后端数据库存储精度。
- 修改空距的计算逻辑。

## Background & Context
- 当前 `admin-web/src/pages/competition/List.tsx` 中“空距”列的渲染函数直接输出了后端返回的 `distance` 值，未做任何格式化。
- `admin-web/src/pages/competition/CompetitionForm.tsx` 中使用了 Ant Design v5 中已弃用的 `InputNumber.addonAfter` 属性和 `message` 静态方法。

## Functional Requirements
- **FR-1**: 在赛事列表页，空距（distance）应显示为保留两位小数的格式，例如 `1080.00 km`。
- **FR-2**: 修改 `CompetitionForm.tsx` 中的 `InputNumber` 组件，使用 `Space.Compact` 和 `Input` 的 `addonAfter` 结合的方式或其它推荐方案来替代直接在 `InputNumber` 上使用 `addonAfter`。
- **FR-3**: 修改 `CompetitionForm.tsx`，引入 `App.useApp()` Hook，使用上下文中的 `message` 替代现有的 `message` 静态调用。

## Non-Functional Requirements
- **NFR-1**: 页面加载和交互不应有任何可见的性能退化。
- **NFR-2**: 控制台不应再输出上述两条弃用警告。

## Constraints
- **Technical**: 继续使用 React, Ant Design v5 组件库。

## Assumptions
- 后端返回的 `distance` 数据为 `number` 类型。

## Acceptance Criteria

### AC-1: 空距显示格式化
- **Given**: 赛事列表中有一条空距为 `16.55642742818527` 的记录
- **When**: 用户查看该列表
- **Then**: 空距列显示为 `16.56 km`
- **Verification**: `programmatic`

### AC-2: 消除 InputNumber addonAfter 警告
- **Given**: 用户在浏览器中打开“新增赛事”页面
- **When**: 打开浏览器控制台
- **Then**: 控制台不再输出 `Warning: [antd: InputNumber] addonAfter is deprecated` 警告
- **Verification**: `programmatic`

### AC-3: 消除 message 静态函数警告
- **Given**: 用户在浏览器中提交表单或删除记录
- **When**: 操作成功
- **Then**: 控制台不再输出 `Warning: [antd: message] Static function can not consume context...` 警告
- **Verification**: `programmatic`

## Open Questions
- 无
