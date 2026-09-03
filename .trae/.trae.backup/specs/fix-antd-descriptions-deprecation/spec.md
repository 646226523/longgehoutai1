# 修复 Ant Design Descriptions 组件弃用警告 - Product Requirement Document

## Overview
- **Summary**: 修复 Ant Design Descriptions 组件中 `labelStyle` 和 `contentStyle` 属性的弃用警告，将其迁移到新的 `styles` API。
- **Purpose**: 消除浏览器控制台中的 2 条弃用警告日志，确保项目符合 Ant Design v5 最新 API 规范，避免未来版本升级时出现兼容性问题。
- **Target Users**: 前端开发人员、管理员

## Goals
- 消除所有 `Descriptions` 组件的 `labelStyle` 弃用警告
- 消除所有 `Descriptions` 组件的 `contentStyle` 弃用警告
- 保持现有视觉样式完全不变
- 确保 TypeScript 编译零错误

## Non-Goals (Out of Scope)
- 不修改其他 Ant Design 组件的弃用警告
- 不重构 Descriptions 组件的业务逻辑
- 不升级 Ant Design 版本

## Background & Context
- 当前项目使用 Ant Design v5.x
- Ant Design v5 中 `Descriptions` 组件的 `labelStyle` 和 `contentStyle` 属性已被标记为 deprecated
- 新的 API 使用 `styles` 属性，格式为 `styles={{ label: {}, content: {} }}`
- 项目中共有 3 处 Descriptions 组件使用了弃用属性：
  1. `Session.tsx` 第 967-971 行（场次预览 - 时间地点描述）
  2. `Session.tsx` 第 1008-1012 行（场次预览 - 竞拍规则描述）
  3. `nft-metadata-render.tsx` 第 574-575 行（NFT 元数据渲染）

## Functional Requirements
- **FR-1**: 将 `labelStyle` 属性迁移为 `styles={{ label: {} }}`
- **FR-2**: 将 `contentStyle` 属性迁移为 `styles={{ content: {} }}`
- **FR-3**: 支持同时设置 `label` 和 `content` 样式（当两者都存在时合并为一个 `styles` 对象）

## Non-Functional Requirements
- **NFR-1**: 视觉一致性 - 迁移后组件外观与迁移前完全一致
- **NFR-2**: 编译通过 - TypeScript 编译零错误
- **NFR-3**: 无控制台警告 - 浏览器控制台不再输出相关弃用警告

## Constraints
- **Technical**: 必须使用 Ant Design v5 的 `styles` API
- **Dependencies**: 依赖项目已安装的 Ant Design 版本

## Assumptions
- Ant Design 版本支持 `styles` 属性（v5.x 均支持）
- `labelStyle` 的值可以直接作为 `styles.label` 的值
- `contentStyle` 的值可以直接作为 `styles.content` 的值

## Acceptance Criteria

### AC-1: Session.tsx 中 Descriptions 组件迁移完成
- **Given**: 用户打开"新增拍卖场次"对话框
- **When**: 浏览器渲染包含 Descriptions 组件的预览区域
- **Then**: 控制台不再输出 `labelStyle` 和 `contentStyle` 弃用警告
- **Verification**: `programmatic`

### AC-2: nft-metadata-render.tsx 中 Descriptions 组件迁移完成
- **Given**: NFT 元数据渲染页面加载
- **When**: Descriptions 组件渲染
- **Then**: 控制台不再输出 `labelStyle` 和 `contentStyle` 弃用警告
- **Verification**: `programmatic`

### AC-3: 视觉样式保持一致
- **Given**: 迁移前的 Descriptions 组件样式
- **When**: 应用新的 `styles` API 后
- **Then**: 组件的视觉外观（字体大小、颜色、宽度等）与迁移前完全一致
- **Verification**: `human-judgment`

### AC-4: TypeScript 编译无错误
- **Given**: 修改后的代码
- **When**: 运行 TypeScript 编译检查
- **Then**: 编译输出零错误
- **Verification**: `programmatic`

## Open Questions
- 无
