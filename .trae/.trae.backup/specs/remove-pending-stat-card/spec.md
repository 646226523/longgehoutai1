# 删除待审核统计卡片 - 产品需求文档

## Overview
- **Summary**: 删除认证审核页面(AuditList.tsx)顶部统计卡片区域中的"待审核"卡片，该卡片显示"待审核 0 需尽快处理"信息
- **Purpose**: 根据用户要求移除指定的统计卡片，简化页面顶部信息展示
- **Target Users**: 后台管理员

## Goals
- 删除"待审核"统计卡片
- 保持其他统计卡片（已通过、已驳回、全部）正常显示
- 调整剩余卡片的布局以保持视觉平衡

## Non-Goals (Out of Scope)
- 不修改其他统计卡片的样式和功能
- 不修改审核列表功能
- 不修改筛选功能

## Background & Context
- 认证审核页面顶部有4个统计卡片：待审核、已通过、已驳回、全部
- 每个卡片占用1/4宽度（span=6）
- 用户要求删除"待审核"卡片

## Functional Requirements
- **FR-1**: 删除"待审核"统计卡片的渲染代码
- **FR-2**: 调整剩余3个卡片的span值，从6改为8，保持均匀分布
- **FR-3**: 保持已通过、已驳回、全部三个卡片的功能不变

## Non-Functional Requirements
- **NFR-1**: 代码修改最小化
- **NFR-2**: TypeScript类型检查通过
- **NFR-3**: 页面布局视觉平衡

## Constraints
- **Technical**: 仅修改AuditList.tsx文件

## Assumptions
- 删除"待审核"卡片后，用户仍可通过筛选功能查看待审核记录
- 剩余3个卡片采用3等分布局（span=8）

## Acceptance Criteria

### AC-1: 待审核卡片已删除
- **Given**: 用户访问认证审核页面
- **When**: 页面加载完成
- **Then**: 顶部统计卡片区域不再显示"待审核"卡片
- **Verification**: `programmatic`

### AC-2: 剩余卡片布局正常
- **Given**: "待审核"卡片已删除
- **When**: 页面渲染
- **Then**: 已通过、已驳回、全部三个卡片均匀分布
- **Verification**: `human-judgment`

### AC-3: TypeScript编译通过
- **Given**: 代码修改完成
- **When**: 运行TypeScript类型检查
- **Then**: 无新增类型错误
- **Verification**: `programmatic`
