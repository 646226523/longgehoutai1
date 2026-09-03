# 鸽主信息可手动填写优化 - Product Requirement Document

## Overview
- **Summary**: 优化新增/编辑基因档案中的鸽主信息表单，支持管理员手动输入新的鸽主姓名，同时保留从已有鸽主中选择的能力。当手动输入时，鸽主电话也可以手动填写。
- **Purpose**: 当前鸽主信息只能从系统已有数据中选择，限制了录入效率。管理员需要能够直接输入新的鸽主信息（姓名+电话），无需预先在鸽主管理模块添加。
- **Target Users**: 基因档案录入员、拍卖管理员

## Goals
- 鸽主姓名支持两种模式：选择已有鸽主 或 手动输入新鸽主
- 手动输入鸽主时，电话字段自动解锁可编辑
- 选择已有鸽主时，电话字段自动填充并禁用
- 表单提交时正确区分"已有鸽主"和"新鸽主"

## Non-Goals (Out of Scope)
- 不修改鸽主管理模块的数据存储结构
- 不实现鸽主信息的自动创建逻辑（手动输入的鸽主仅关联到鸽子档案）
- 不修改鸽主搜索接口

## Background & Context
- 当前架构：`SearchSelect` 组件（基于 Ant Design Select 封装）用于鸽主选择
- 鸽主信息存储在 `gene_profiles` 表的 `owner_name` 和 `owner_phone` 字段中
- 鸽主搜索通过 `searchOwners` API 从 `gene_profiles` 表中去重查询
- 当前限制：只能从已有鸽主中选择，不支持自由输入

## Functional Requirements
- **FR-1**: 鸽主姓名字段支持自由输入（allowCreate 模式），允许输入不存在于系统中的新鸽主姓名
- **FR-2**: 当用户手动输入新鸽主时，鸽主 ID 置空，电话字段变为可编辑状态
- **FR-3**: 当用户选择已有鸽主时，电话字段自动填充并保持禁用状态
- **FR-4**: 表单提交时，若鸽主 ID 为空则按新鸽主处理，若有 ID 则关联已有鸽主

## Non-Functional Requirements
- **NFR-1**: 交互流畅，无明显延迟
- **NFR-2**: TypeScript 编译零错误
- **NFR-3**: 不影响其他使用 SearchSelect 组件的功能（如血统选择、鸽主选择器等）

## Constraints
- **Technical**: React + Ant Design，修改现有组件属性
- **Dependencies**: 依赖已有的 `searchOwners` API 和 `SearchSelect` 组件

## Assumptions
- 手动输入的鸽主信息直接存储到 `gene_profiles` 表的 `owner_name` 和 `owner_phone` 字段
- 不需要单独的鸽主表或鸽主 ID 关联

## Acceptance Criteria

### AC-1: 鸽主姓名支持自由输入
- **Given**: 管理员打开新增基因档案表单
- **When**: 在"鸽主姓名"字段输入一个不存在的鸽主名称
- **Then**: 输入被接受，不显示"无匹配结果"的限制
- **Verification**: `programmatic`

### AC-2: 手动输入时电话可编辑
- **Given**: 管理员已手动输入新鸽主姓名
- **When**: 查看"鸽主电话"字段
- **Then**: 电话字段变为可编辑状态，placeholder 显示"请输入鸽主电话"
- **Verification**: `programmatic`

### AC-3: 选择已有鸽主时电话自动填充
- **Given**: 管理员从下拉列表中选择了已有鸽主
- **When**: 查看"鸽主电话"字段
- **Then**: 电话自动填充并禁用，placeholder 显示"选择鸽主后自动填充"
- **Verification**: `programmatic`

### AC-4: TypeScript 编译通过
- **Given**: 修改后的代码
- **When**: 运行 TypeScript 编译
- **Then**: 零错误
- **Verification**: `programmatic`

### AC-5: 表单提交正确
- **Given**: 管理员填写完鸽主信息后提交表单
- **When**: 查看提交的 payload
- **Then**: 包含正确的 `owner_name` 和 `owner_phone` 字段
- **Verification**: `programmatic`

## Open Questions
- 无
