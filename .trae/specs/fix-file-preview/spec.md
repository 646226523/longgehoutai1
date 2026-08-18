# 修复证明材料预览功能 - Product Requirement Document

## Overview
- **Summary**: 修复入驻审核详情页中证明材料的预览功能，将纯文本链接改为可点击的图片预览弹窗，支持多图切换查看和页码显示。
- **Purpose**: 当前"查看文件"功能只是一个跳转链接，无法在页面内预览文件内容，用户需要下载或跳转查看，体验不佳。
- **Target Users**: 公棚审核管理员

## Goals
- 点击证明材料后弹窗预览文件
- 支持多张图片切换查看
- 显示当前图片序号（1/N）

## Non-Goals (Out of Scope)
- 不修改后端数据库结构
- 不实现文件上传功能

## Background & Context
- **技术栈**: React + Ant Design v5
- **问题文件**: `admin-web/src/pages/loft/Audit.tsx`
- **当前实现**: 
  - 图片类型使用 Image 组件，但只有单图
  - 非图片文件使用 `<a>` 标签跳转
  - `site_proof` 字段存储单个 URL（可扩展为多个 URL，用逗号分隔）

## Functional Requirements
- **FR-1**: 支持多图 URL 解析（逗号分隔的多个 URL）
- **FR-2**: 使用 `Image.PreviewGroup` 组件实现多图预览弹窗
- **FR-3**: 点击材料卡片的缩略图可打开预览弹窗
- **FR-4**: 弹窗底部显示当前图片序号（1/N）
- **FR-5**: 支持左右切换按钮切换图片

## Non-Functional Requirements
- **NFR-1**: 构建无 TypeScript 错误
- **NFR-2**: UI 风格与现有系统保持一致

## Constraints
- **Technical**: 使用 Ant Design v5 的 Image 组件

## Acceptance Criteria

### AC-1: 多图支持
- **Given**: 管理员打开入驻申请详情
- **When**: 查看证明材料
- **Then**: 如果 `site_proof` 包含多个 URL（逗号分隔），显示多张缩略图
- **Verification**: `human-judgment`

### AC-2: 点击弹窗预览
- **Given**: 管理员点击材料缩略图
- **When**: 点击图片
- **Then**: 打开全屏预览弹窗显示该图片
- **Verification**: `human-judgment`

### AC-3: 多图切换和序号
- **Given**: 预览弹窗打开
- **When**: 查看弹窗底部
- **Then**: 显示当前图片序号（如 1/3），支持左右切换
- **Verification**: `human-judgment`

### AC-4: 构建通过
- **Given**: 代码修改完成
- **When**: 运行 `npm run build`
- **Then**: 构建成功
- **Verification**: `programmatic`

## Open Questions
- [ ] 无
