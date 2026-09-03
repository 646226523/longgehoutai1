# 修复Modal静态方法警告 - 产品需求文档

## Overview
- **Summary**: 修复认证审核页面(AuditList.tsx)中点击"重试"按钮和批量审核按钮时出现的控制台警告 `Warning: [antd: Modal] Static function can not consume context like dynamic theme. Please use 'App' component instead.`
- **Purpose**: 消除控制台警告，确保Ant Design动态主题上下文正确消费，提升代码质量
- **Target Users**: 后台管理员

## Goals
- 将两处静态`Modal.confirm`方法替换为动态Modal组件
- 保持原有功能不变（确认弹窗的标题、内容、按钮文案和回调逻辑）
- 消除控制台警告
- 确保TypeScript类型检查通过

## Non-Goals (Out of Scope)
- 不修改审核业务逻辑
- 不修改UI样式
- 不重构其他已使用动态Modal的代码

## Background & Context
- 项目使用Ant Design 5.x版本
- Ant Design 5.x推荐使用动态Modal组件（通过状态控制显示/隐藏）而非静态方法（如`Modal.confirm`）
- 当前AuditList.tsx文件中有两处使用`Modal.confirm`：
  1. 第118行：`handleBatchAudit`函数中批量审核的确认弹窗
  2. 第350行："重试"按钮点击事件中的确认弹窗
- 文件中已导入Modal组件，且已使用动态Modal模式（如预览弹窗和审核操作弹窗）

## Functional Requirements
- **FR-1**: 批量审核功能必须使用动态Modal组件替代静态Modal.confirm
- **FR-2**: "重试"按钮必须使用动态Modal组件替代静态Modal.confirm
- **FR-3**: 动态Modal组件必须正确显示确认对话框的标题、内容和按钮
- **FR-4**: 点击"确定"按钮必须正确执行原有的业务逻辑
- **FR-5**: 点击"取消"按钮必须正确关闭弹窗

## Non-Functional Requirements
- **NFR-1**: 代码修改必须最小化，仅替换必要的部分
- **NFR-2**: TypeScript类型检查必须通过
- **NFR-3**: 控制台不得再出现Modal静态方法相关警告
- **NFR-4**: 原有功能的用户体验不得改变

## Constraints
- **Technical**: 必须使用React Hooks的useState管理Modal状态
- **Technical**: 必须保持与现有代码风格一致
- **Dependencies**: 依赖Ant Design 5.x的Modal组件

## Assumptions
- 用户已登录并具有访问认证审核页面的权限
- 后端服务正常运行
- 批量审核和重试功能的业务逻辑不需要修改

## Acceptance Criteria

### AC-1: 批量审核确认弹窗使用动态Modal
- **Given**: 用户在认证审核页面选中至少一条记录
- **When**: 点击"批量通过"或"批量驳回"按钮
- **Then**: 显示动态Modal确认弹窗，而非静态警告
- **Verification**: `programmatic`
- **Notes**: 检查控制台无Warning输出

### AC-2: 重试按钮确认弹窗使用动态Modal
- **Given**: 用户在认证审核页面查看已驳回状态的记录
- **When**: 点击"重试"按钮
- **Then**: 显示动态Modal确认弹窗，而非静态警告
- **Verification**: `programmatic`
- **Notes**: 检查控制台无Warning输出

### AC-3: 确认弹窗功能正常
- **Given**: 动态Modal确认弹窗已显示
- **When**: 点击"确定"按钮
- **Then**: 执行原有的业务逻辑（批量审核或重置认证）
- **Verification**: `programmatic`

### AC-4: 取消弹窗功能正常
- **Given**: 动态Modal确认弹窗已显示
- **When**: 点击"取消"按钮
- **Then**: 关闭弹窗，不执行任何操作
- **Verification**: `programmatic`

### AC-5: TypeScript编译通过
- **Given**: 代码修改完成
- **When**: 运行TypeScript类型检查
- **Then**: 无类型错误
- **Verification**: `programmatic`
