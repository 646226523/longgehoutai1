# 富文本编辑器 Toolbar 重建冲突修复 - Product Requirement Document

## Overview
- **Summary**: 修复点击"编辑"按钮打开资讯编辑抽屉时，富文本编辑器报 "Repeated create toolbar by selector '[object HTMLDivElement]'" 错误的问题。
- **Purpose**: 之前为解决 "Cannot find a descendant at path" 错误，将 `key={editorKey}` 放在了 `<Editor>` 组件上，但导致 `<Toolbar>` 和 `<Editor>` 重建不同步，引发 Toolbar DOM 选择器冲突。
- **Target Users**: 后台管理员（编辑资讯内容时受影响）

## Goals
- 修复 "Repeated create toolbar" 报错，确保点击编辑按钮后富文本编辑器正常加载
- 保持之前的历史记录修复效果（编辑含图片内容不报错）
- 确保 Toolbar 和 Editor 组件同步重建，避免 DOM 引用冲突

## Non-Goals (Out of Scope)
- 不修改富文本编辑器的功能（工具栏配置、图片上传等）
- 不修改资讯管理页面的其他功能

## Background & Context
- 系统：赛鸽基因后台（admin-web）
- 技术栈：React + TypeScript + Ant Design + wangEditor v5
- 之前的修复：将 `editorKey` 作为 `<Editor>` 的 key 属性，在外部 value 变化时强制重建编辑器
- 当前问题：Toolbar 组件未被重建，但引用的 editor 实例已被销毁重建，导致 wangEditor 内部 DOM 选择器冲突

## Functional Requirements
- **FR-1**: 点击资讯列表的"编辑"按钮后，富文本编辑器正常渲染，无报错
- **FR-2**: 编辑含图片的资讯内容时不出现 "Cannot find a descendant at path" 错误
- **FR-3**: 编辑含图片的资讯内容时不出现 "Repeated create toolbar" 错误
- **FR-4**: 用户编辑内容（输入文字、上传图片）时编辑器正常响应

## Non-Functional Requirements
- **NFR-1**: TypeScript 编译无错误
- **NFR-2**: 编辑器重建过程不应产生多余的控制台警告

## Constraints
- **Technical**: 必须使用 wangEditor v5 的 React 组件（`@wangeditor/editor-for-react`）
- **Dependencies**: 依赖 `@wangeditor/editor` 核心库

## Assumptions
- 外层 `News.tsx` 已使用 `key={editing?.id ?? 'new'}` 控制 RichTextEditor 的重建
- `editorReady` 状态确保数据加载完成后才渲染编辑器

## Acceptance Criteria

### AC-1: 点击编辑按钮无报错
- **Given**: 资讯列表页面，已存在含图片的资讯
- **When**: 点击某条资讯的"编辑"按钮
- **Then**: 编辑抽屉正常打开，富文本编辑器显示内容，无 "Something went wrong" 弹窗
- **Verification**: `human-judgment`

### AC-2: 控制台无错误日志
- **Given**: 编辑抽屉已打开
- **When**: 检查浏览器控制台
- **Then**: 无 "Repeated create toolbar" 和 "Cannot find a descendant" 错误
- **Verification**: `human-judgment`

### AC-3: 保存后再次编辑正常
- **Given**: 已编辑并保存的资讯
- **When**: 再次点击该资讯的"编辑"按钮
- **Then**: 富文本编辑器正常加载内容，可继续编辑
- **Verification**: `human-judgment`

### AC-4: 代码质量
- **Given**: 修改完成
- **When**: 运行 TypeScript 编译
- **Then**: 编译通过，无类型错误
- **Verification**: `programmatic`
