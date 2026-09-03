# 修复身份证图片显示问题 - 产品需求文档

## Overview
- **Summary**: 修复认证审核详情抽屉中身份证图片显示高度不足导致文字信息无法正常查看的问题
- **Purpose**: 详情抽屉中身份证图片使用compact模式，高度仅90px，身份证SVG中包含的文字信息（姓名、性别、民族、出生日期、住址、身份证号等）无法正常显示
- **Target Users**: 后台管理员

## Goals
- 增加详情抽屉中身份证图片的显示高度，确保文字信息清晰可读
- 保持图片预览功能正常
- 保持列表中的缩略图不变

## Non-Goals (Out of Scope)
- 不修改列表页中的图片显示
- 不修改图片预览弹窗
- 不修改SVG生成逻辑

## Background & Context
- MaterialCard组件有两种高度模式：
  - `compact=true`: 高度90px（用于详情抽屉中）
  - `compact=false`或不设置: 高度150px
- 当前详情抽屉中3个身份证卡片（身份证正面、身份证反面、手持身份证）都使用了`compact`属性
- 身份证SVG包含大量文字信息，90px高度太小导致文字无法辨认

## Functional Requirements
- **FR-1**: 详情抽屉中身份证图片高度从90px增加到180px
- **FR-2**: 确保身份证SVG中的文字信息清晰可读
- **FR-3**: 保持图片点击预览功能正常

## Non-Functional Requirements
- **NFR-1**: 代码修改最小化
- **NFR-2**: TypeScript类型检查通过
- **NFR-3**: 保持响应式布局

## Constraints
- **Technical**: 仅修改AuditList.tsx文件中的MaterialCard组件和调用处

## Assumptions
- 移除compact属性后详情抽屉布局仍然协调
- 150px或180px高度足够显示身份证文字信息

## Acceptance Criteria

### AC-1: 详情抽屉中身份证图片高度增加
- **Given**: 用户打开认证审核详情抽屉
- **When**: 查看身份证正面/反面/手持身份证图片
- **Then**: 图片高度足够显示文字信息（至少150px）
- **Verification**: `programmatic`

### AC-2: 身份证文字信息可读
- **Given**: 详情抽屉中身份证图片已显示
- **When**: 管理员查看图片
- **Then**: 身份证上的姓名、性别、民族、出生日期、住址、身份证号等文字清晰可读
- **Verification**: `human-judgment`

### AC-3: 图片预览功能正常
- **Given**: 详情抽屉中身份证图片已显示
- **When**: 点击图片
- **Then**: 打开大图预览弹窗
- **Verification**: `programmatic`
