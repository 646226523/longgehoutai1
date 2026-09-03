# 修复身份证图片渲染问题 - 产品需求文档

## Overview
- **Summary**: 修复认证审核详情页中身份证图片无法渲染的问题，添加图片URL处理逻辑和空值占位图显示
- **Purpose**: 确保后端返回的图片地址能正确加载，字段为空时显示"暂无图片"占位图
- **Target Users**: 后台管理员

## Goals
- 添加BASE_URL配置和图片URL处理函数
- 字段为空时显示"暂无图片"占位图
- 确保后端返回的图片地址能正确加载

## Non-Goals (Out of Scope)
- 不修改后端SVG生成逻辑
- 不修改列表页其他功能

## Background & Context
- 当前后端返回的id_card_front等字段是内联SVG data URL（data:image/svg+xml,...）
- 为了支持未来真实图片上传，需要添加URL处理逻辑：
  - data:image开头的内联URL直接使用
  - 以/开头的相对路径拼接BASE_URL
  - http/https开头的完整URL直接使用
- 当前MaterialCard组件在src为空时显示emoji图标，需要改为"暂无图片"占位图

## Functional Requirements
- **FR-1**: 添加图片URL处理函数getImageUrl，支持内联URL、相对路径和完整URL
- **FR-2**: MaterialCard组件在src为空时显示"暂无图片"占位图
- **FR-3**: 列表页身份证材料列显示缩略图预览

## Non-Functional Requirements
- **NFR-1**: 代码修改最小化
- **NFR-2**: TypeScript类型检查通过

## Constraints
- **Technical**: 仅修改AuditList.tsx文件

## Assumptions
- BASE_URL默认为空字符串，当前后端返回的是内联SVG data URL

## Acceptance Criteria

### AC-1: 图片URL正确处理
- **Given**: 后端返回图片URL
- **When**: MaterialCard组件渲染图片
- **Then**: 图片正确加载显示
- **Verification**: `programmatic`

### AC-2: 空值显示占位图
- **Given**: 图片字段为空
- **When**: MaterialCard组件渲染
- **Then**: 显示"暂无图片"占位图
- **Verification**: `human-judgment`

### AC-3: 列表页缩略图显示
- **Given**: 列表页有认证材料
- **When**: 查看列表
- **Then**: 能看到身份证材料缩略图
- **Verification**: `human-judgment`
