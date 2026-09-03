# 修复 ImageUploader 渲染期 setState 警告 - Product Requirement Document

## Overview
- **Summary**: 修复 React 警告 "Cannot update a component (GeneForm) while rendering a different component (ImageUploader)"，该警告发生在 `ImageUploader.tsx` 的 `handleFile` 函数中，`onChange` 回调被错误地放在了 `setPreviewList` 的函数式更新器内部。
- **Purpose**: 消除控制台警告，确保 React 渲染周期正确性
- **Target Users**: 开发者和使用基因档案功能的管理员

## Goals
- 修复 `handleFile` 中 `setPreviewList` 函数更新器内调用 `onChange` 的问题
- 确保图片上传功能正常工作
- 消除 React StrictMode 下的渲染期 setState 警告

## Non-Goals (Out of Scope)
- 不修改图片上传的核心逻辑
- 不改变 UI 外观

## Background & Context
- React 严格模式下，在 `setState` 的函数式更新器（updater）中调用其他组件的 `setState` 会触发 "Cannot update a component while rendering a different component" 警告
- `ImageUploader.tsx` 的 `handleFile` 函数中，`onChange?.(toEmit(...))` 被错误地放在了 `setPreviewList((prev) => { ... })` 的回调函数体内
- 这导致 React 在处理 ImageUploader 的状态更新时，同时触发了 GeneForm 的状态更新

## Functional Requirements
- **FR-1**: 修复 `handleFile` 中 `setPreviewList` updater 内的 `onChange` 调用，将其移到 updater 外部
- **FR-2**: 保持图片上传功能正常
- **FR-3**: 上传完成后正确更新预览和触发父组件回调

## Non-Functional Requirements
- **NFR-1**: 消除 React 控制台警告
- **NFR-2**: 不引入新的异步/同步问题

## Constraints
- **Technical**: React 18 automatic batching, TypeScript
- **Dependencies**: Ant Design, 现有图片上传接口

## Assumptions
- 当前仅使用单图模式（maxCount=1）

## Acceptance Criteria

### AC-1: 消除控制台警告
- **Given**: 开发者打开浏览器控制台
- **When**: 进入基因档案页面并打开新增档案抽屉
- **Then**: 控制台不再输出 "Cannot update a component while rendering a different component" 警告
- **Verification**: `programmatic`

### AC-2: 图片上传功能正常
- **Given**: 用户在新增档案页面
- **When**: 选择并上传一张图片
- **Then**: 图片上传成功，预览正确显示，表单值正确更新
- **Verification**: `human-judgment`

### AC-3: 删除图片功能正常
- **Given**: 用户已上传一张图片
- **When**: 点击删除按钮
- **Then**: 图片被移除，表单值清空
- **Verification**: `human-judgment`

## Open Questions
- 无
