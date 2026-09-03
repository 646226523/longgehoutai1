# 富文本编辑器图片上传流程优化 - Product Requirement Document

## Overview
- **Summary**: 将富文本编辑器的图片插入方式从"弹窗输入URL"改为"直接选择本地文件上传"，点击图片按钮后直接打开系统文件选择器，用户选择本地图片后自动转为 Base64 嵌入编辑器。
- **Purpose**: 提升图片插入的用户体验，省去复制粘贴图片链接的繁琐步骤，实现所见即所得的图片上传体验。
- **Target Users**: 内容运营人员、赛事编辑

## Goals
- 点击工具栏图片按钮后直接弹出系统文件选择器
- 选中本地图片后自动转为 Base64 嵌入编辑器
- 支持拖拽图片到编辑区
- 支持多图上传

## Non-Goals (Out of Scope)
- 不修改后端图片存储方案
- 不实现远程图片 URL 粘贴功能
- 不修改已有的 `insertLink` 链接插入功能

## Background & Context
- 当前 `RichTextEditor.tsx` 工具栏使用 `insertImage` key，会弹出一个包含"图片地址/描述/链接"的对话框
- wangEditor v5 中 `uploadImage` key 可直接触发系统文件选择器
- `MENU_CONF.uploadImage.customUpload` 已正确配置（FileReader 转 Base64）
- 只需将工具栏 key 从 `insertImage` 改为 `uploadImage`

## Functional Requirements
- **FR-1**: 点击工具栏图片按钮直接打开文件选择器，而非弹窗对话框
- **FR-2**: 支持从系统选择图片文件上传
- **FR-3**: 图片自动转为 Base64 嵌入编辑器
- **FR-4**: 支持拖拽图片到编辑器区域上传
- **FR-5**: 支持多张图片同时选择上传

## Non-Functional Requirements
- **NFR-1**: 图片上传响应时间 < 1 秒（本地文件）
- **NFR-2**: TypeScript 编译零错误

## Constraints
- **Technical**: 使用 wangEditor v5 原生功能，不需要额外依赖
- **Dependencies**: 现有 `customUpload` 配置已就绪

## Assumptions
- 用户浏览器支持 HTML5 File API
- 图片大小限制在合理范围内（单张 < 5MB）

## Acceptance Criteria

### AC-1: 点击图片按钮直接打开文件选择器
- **Given**: 用户在编辑抽屉中
- **When**: 点击工具栏的图片按钮
- **Then**: 直接弹出系统文件选择器，而非 URL 输入对话框
- **Verification**: `human-judgment`

### AC-2: 选择本地图片后自动插入
- **Given**: 文件选择器已打开
- **When**: 用户选择一张本地图片
- **Then**: 图片自动上传并显示在编辑器光标位置
- **Verification**: `human-judgment`

### AC-3: 支持多图选择
- **Given**: 文件选择器已打开
- **When**: 用户选择多张图片
- **Then**: 所有选中的图片依次插入编辑器
- **Verification**: `human-judgment`

### AC-4: TypeScript 编译通过
- **Given**: 代码修改完成
- **When**: 运行 `npx tsc --noEmit`
- **Then**: 编译零错误
- **Verification**: `programmatic`

## Open Questions
- 无
