# 认证材料预览功能 - Product Requirement Document

## Overview
- **Summary**: 在用户详情页的【认证审核】Tab中，为认证材料（身份证正面、身份证反面、手持身份证）添加点击预览功能，支持大图查看、放大缩小、旋转等操作。
- **Purpose**: 当前认证材料卡片显示"点击预览"但无实际点击事件，管理员无法查看用户上传的认证材料图片，影响审核效率。
- **Target Users**: 后台管理员，需要在审核认证时查看用户提交的认证材料图片。

## Goals
- **实现点击预览**: 点击认证材料卡片后弹出图片预览窗口
- **支持大图查看**: 预览窗口支持放大、缩小、旋转等操作
- **优雅降级**: 当没有真实图片时显示占位图或提示

## Non-Goals (Out of Scope)
- 不涉及后端认证材料上传接口的开发
- 不涉及认证材料的裁剪、编辑功能
- 不涉及批量下载功能

## Background & Context
- 当前页面：用户详情抽屉 → 认证审核Tab → 认证材料区域
- 当前实现：三个卡片（身份证正面、身份证反面、手持身份证）有hover效果但无onClick事件
- 技术栈：React + TypeScript + Ant Design 5.x
- Ant Design 5.x 提供 `Image.PreviewGroup` 组件支持图片预览

## Functional Requirements
- **FR-1**: 点击认证材料卡片触发图片预览
- **FR-2**: 预览窗口支持放大、缩小、旋转、全屏查看
- **FR-3**: 三个材料支持左右切换
- **FR-4**: 无图片时显示占位提示
- **FR-5**: 预览窗口支持键盘操作（ESC关闭、方向键切换）

## Non-Functional Requirements
- **NFR-1**: 预览动画流畅，无明显卡顿
- **NFR-2**: 支持1440px及以上分辨率
- **NFR-3**: 代码改动最小化，不影响现有功能

## Constraints
- **Technical**: 必须使用 Ant Design 5.x 的 Image 组件
- **Dependencies**: 依赖 Ant Design 的 Image.PreviewGroup

## Assumptions
- 认证材料图片URL可从后端获取
- 暂时使用占位图或模拟数据

## Acceptance Criteria

### AC-1: 点击触发预览
- **Given**: 管理员打开用户详情抽屉的认证审核Tab
- **When**: 点击任意一个认证材料卡片
- **Then**: 弹出图片预览窗口，显示对应的认证材料图片
- **Verification**: `programmatic`

### AC-2: 预览窗口功能
- **Given**: 图片预览窗口已打开
- **When**: 使用预览窗口的工具栏
- **Then**: 支持放大、缩小、旋转操作
- **Verification**: `human-judgment`

### AC-3: 多图切换
- **Given**: 图片预览窗口已打开
- **When**: 点击左右箭头或使用方向键
- **Then**: 可以在三张认证材料图片间切换
- **Verification**: `programmatic`

### AC-4: 无图降级
- **Given**: 用户未上传认证材料
- **When**: 点击卡片
- **Then**: 显示占位图或"暂无图片"提示
- **Verification**: `human-judgment`

### AC-5: TypeScript编译
- **Given**: 代码修改完成
- **When**: 运行 tsc --noEmit 检查
- **Then**: 无类型错误
- **Verification**: `programmatic`

## Open Questions
- [ ] 后端认证材料的URL字段名是什么？
- [ ] 是否需要添加图片加载失败的错误处理？
