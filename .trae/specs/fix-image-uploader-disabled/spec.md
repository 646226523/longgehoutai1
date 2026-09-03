# 基因档案图片上传组件被禁用修复 - Product Requirement Document

## Overview
- **Summary**: 修复基因档案新增页面中 `ImageUploader` 组件无法点击的问题。根因是 `photo_url` 初始值为空字符串 `""` 时，组件内部状态判断失误，导致 `canAddMore` 计算为 `false`，从而禁用了整个上传区域。
- **Purpose**: 恢复基因档案表单中图片上传功能的正常交互。
- **Target Users**: 系统管理员

## Goals
- 修复 `ImageUploader` 组件对空字符串值的处理逻辑
- 确保在 `photo_url` 为空时上传按钮可正常点击
- 验证修复后功能正常

## Acceptance Criteria

### AC-1: 空值状态下按钮可点击
- **Given**: 基因档案新增表单中 `photo_url` 为空
- **When**: 组件渲染完成
- **Then**: 上传区域鼠标样式为 `cursor: pointer`，点击可弹出文件选择框
- **Verification**: `human-judgment`

### AC-2: 有值状态下显示图片
- **Given**: 基因档案编辑表单中 `photo_url` 为有效 URL
- **When**: 组件渲染完成
- **Then**: 显示已有图片预览，允许删除后重新上传
- **Verification**: `human-judgment`

### AC-3: 构建验证通过
- **Verification**: `programmatic`

## Open Questions
- 无
