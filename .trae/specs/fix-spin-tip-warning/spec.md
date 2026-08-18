# 修复 Ant Design Spin tip 属性警告 - Product Requirement Document

## Overview
- **Summary**: 修复控制台中的 Ant Design Spin 组件警告 `Warning: [antd: Spin] 'tip' only work in nest or fullscreen pattern`，通过修改不符合规范的两处 Spin 组件用法。
- **Purpose**: 在 Ant Design v5 中，Spin 组件的 `tip` 属性只能在嵌套模式（有子元素）或全屏模式（有 `fullscreen` 属性）下使用。当前代码中有两处违反此规范，导致控制台产生警告。
- **Target Users**: 后台管理员、开发人员

## Goals
- 消除控制台中的 Spin tip 警告
- 保持原有的加载状态显示功能和用户体验

## Non-Goals (Out of Scope)
- 不修改其他 Ant Design 组件的警告
- 不改变加载指示器的整体样式和交互

## Background & Context
- **技术栈**: React + Ant Design v5
- **问题文件**: `admin-web/src/components/LoftMapPicker.tsx`
- **问题位置**: 
  - 第 450 行: `<Spin tip="加载地图配置..." />` - 无嵌套内容
  - 第 531 行: `<Spin tip="地图加载中..." />` - 无嵌套内容

## Functional Requirements
- **FR-1**: 修改 `LoftMapPicker.tsx` 中第 450 行的 Spin 组件，移除 `tip` 属性或将其改为符合规范的用法
- **FR-2**: 修改 `LoftMapPicker.tsx` 中第 531 行的 Spin 组件，移除 `tip` 属性或将其改为符合规范的用法
- **FR-3**: 保持加载提示文字的显示，确保用户能看到加载状态信息

## Non-Functional Requirements
- **NFR-1**: 修改后不应影响现有功能
- **NFR-2**: 构建无 TypeScript 错误
- **NFR-3**: 控制台不再出现 Spin tip 警告

## Constraints
- **Technical**: 使用 Ant Design v5 的 Spin 组件规范
- **Dependencies**: 无外部依赖变更

## Assumptions
- 用户需要看到加载提示文字，因此需要保留文字提示功能
- 可以通过 Spin 组件外的单独元素显示提示文字

## Acceptance Criteria

### AC-1: 控制台无警告
- **Given**: 用户在基因档案页面或公棚创建/编辑页面
- **When**: 触发地图加载流程
- **Then**: 浏览器控制台不再出现 Spin tip 相关警告
- **Verification**: `programmatic`

### AC-2: 加载提示文字保留
- **Given**: 用户在地图加载过程中
- **When**: 查看加载状态
- **Then**: 仍能看到"加载地图配置..."或"地图加载中..."的提示文字
- **Verification**: `human-judgment`

### AC-3: 构建通过
- **Given**: 代码修改完成
- **When**: 运行 `npm run build`
- **Then**: 构建成功，无 TypeScript 错误
- **Verification**: `programmatic`

## Open Questions
- [ ] 无
