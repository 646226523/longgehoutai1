# 拍品选择弹窗优化 - Product Requirement Document

## Overview
- **Summary**: 优化拍卖场次的"选择拍品"弹窗，实现自动加载所有鸽子档案并显示竞拍状态，无需管理员手动输入搜索条件即可浏览和选择。
- **Purpose**: 当前拍品选择弹窗需要管理员先输入搜索条件才能查询鸽子，操作不便。改为打开即自动加载全部鸽子档案，并标记每羽鸽子的竞拍状态（是否已在活跃竞拍中）。
- **Target Users**: 拍卖行管理员

## Goals
- 弹窗打开时自动加载所有鸽子档案，无需手动搜索
- 每羽鸽子显示竞拍状态标记（空闲/竞拍中）
- 已在活跃竞拍中的鸽子视觉标记但仍可选
- 保持现有的搜索和筛选功能作为可选增强

## Non-Goals (Out of Scope)
- 不修改鸽子档案数据本身
- 不改变拍卖场次的创建流程
- 不添加分页以外的新筛选条件

## Background & Context
- 当前架构：`gene_profiles`（鸽子档案）→ `nft_assets`（NFT资产，含 `gene_profile_id`）→ `auction_items`（拍品，含 `nft_asset_id`）→ `auction_sessions`（场次，含 `status`）
- 竞拍状态判断逻辑：鸽子的 NFT 资产是否关联了状态为 `pending` 或 `ongoing` 的拍卖场次中的拍品
- 前端组件 `ItemSelectorModal` 当前需要用户点击"查询"按钮才加载数据
- 后端 `GET /api/gene/profiles` 接口支持无筛选条件查询所有档案

## Functional Requirements
- **FR-1**: 弹窗打开时自动调用 API 加载所有鸽子档案
- **FR-2**: 后端接口返回每羽鸽子的竞拍状态（是否在活跃拍卖中）
- **FR-3**: 表格中显示"竞拍状态"列，标记每羽鸽子当前状态
- **FR-4**: 已在活跃竞拍中的鸽子显示警告标记，可选择但需提示

## Non-Functional Requirements
- **NFR-1**: 弹窗打开后 1 秒内显示数据
- **NFR-2**: 最多加载 200 条数据，性能可接受
- **NFR-3**: TypeScript 编译零错误

## Constraints
- **Technical**: SQLite 数据库，Node.js + Express 后端，React + Ant Design 前端
- **Dependencies**: 依赖已有的 `gene_profiles`、`nft_assets`、`auction_items`、`auction_sessions` 表

## Assumptions
- 活跃竞拍状态定义为拍卖场次状态为 `pending`（未开始）或 `ongoing`（进行中）
- 每羽鸽子可能有多个 NFT 资产，但只要有一个在活跃拍卖中即标记为"竞拍中"
- 鸽子通过 `nft_assets.gene_profile_id` 关联到拍卖系统

## Acceptance Criteria

### AC-1: 弹窗自动加载数据
- **Given**: 管理员点击"选择拍品"按钮
- **When**: 弹窗打开
- **Then**: 自动加载并显示所有鸽子档案，无需手动点击查询
- **Verification**: `programmatic`

### AC-2: 竞拍状态正确显示
- **Given**: 系统中存在已在活跃拍卖中的鸽子
- **When**: 弹窗加载完成
- **Then**: 每羽鸽子显示正确的竞拍状态（空闲/竞拍中-场次名）
- **Verification**: `programmatic`

### AC-3: 搜索筛选仍可用
- **Given**: 弹窗已打开并加载所有数据
- **When**: 管理员输入搜索关键词并点击查询
- **Then**: 按关键词筛选显示结果
- **Verification**: `programmatic`

### AC-4: TypeScript 编译通过
- **Given**: 修改后的前后端代码
- **When**: 运行 TypeScript 编译
- **Then**: 零错误
- **Verification**: `programmatic`

### AC-5: 视觉一致性
- **Given**: 优化后的弹窗
- **When**: 查看"竞拍中"状态的鸽子
- **Then**: 有清晰的视觉标记（如警告标签），不影响选择操作
- **Verification**: `human-judgment`

## Open Questions
- 无
