# 会员等级编辑页面布局优化 - 产品需求文档

## Overview
- **Summary**: 修改会员等级编辑页面布局，实现左侧表单可滚动，右侧会员预览固定不动
- **Purpose**: 当表单内容较长时，用户需要滚动查看，此时右侧的预览卡片应该保持固定位置，方便实时预览
- **Target Users**: 后台管理员

## Goals
- 调整布局顺序：左侧表单（可滚动），右侧预览（固定）
- 左侧表单在上下滚动时，右侧预览保持不动
- 保持原有功能不变

## Non-Goals (Out of Scope)
- 不修改表单字段
- 不修改预览卡片内容

## Background & Context
- 当前布局：`gridTemplateColumns: '320px 1fr'`（左侧预览320px，右侧表单1fr）
- 用户希望：左侧表单可滚动，右侧预览固定不动
- 需要修改grid顺序和滚动行为

## Functional Requirements
- **FR-1**: 调整布局为左侧表单（1fr），右侧预览（320px）
- **FR-2**: 左侧表单区域可滚动，右侧预览固定不动
- **FR-3**: 表单内容滚动时，预览卡片保持可见

## Non-Functional Requirements
- **NFR-1**: 代码修改最小化
- **NFR-2**: TypeScript类型检查通过
- **NFR-3**: 响应式布局正常

## Constraints
- **Technical**: 仅修改MemberLevel.tsx文件中Modal内的布局代码

## Assumptions
- Modal的maxHeight: '70vh'保持不变
- 使用CSS的sticky或独立滚动容器实现固定效果

## Acceptance Criteria

### AC-1: 布局顺序调整
- **Given**: 打开会员等级编辑Modal
- **When**: 查看布局
- **Then**: 左侧显示表单，右侧显示预览卡片
- **Verification**: `human-judgment`

### AC-2: 右侧预览固定
- **Given**: 左侧表单内容可滚动
- **When**: 滚动左侧表单
- **Then**: 右侧预览卡片保持固定不动
- **Verification**: `human-judgment`

### AC-3: 左侧表单可滚动
- **Given**: 表单内容超过容器高度
- **When**: 查看左侧表单
- **Then**: 左侧表单区域可独立滚动
- **Verification**: `human-judgment`
