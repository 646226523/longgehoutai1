# 列表页面序号列添加 - Product Requirement Document

## Overview
- **Summary**: 在后台管理系统的所有列表页面（ProTable）的表格最前面添加一列"序号"（权重ID），显示从 1 到 N 的行号，便于管理员快速定位和引用记录。
- **Purpose**: 当前所有列表页面缺少行号标识，管理员在查看大量数据时难以快速定位特定行，也不方便在沟通中引用某条记录。添加序号列可提升可读性和协作效率。
- **Target Users**: 所有后台管理员

## Goals
- 在所有 25 个列表页面的 ProTable columns 数组最前端添加序号列
- 序号列使用 ProTable 内置的 `valueType: 'index'` 实现
- 序号列宽度 60px，不参与搜索，固定在左侧

## Non-Goals (Out of Scope)
- 不修改非 ProTable 的表格（如 Form 内嵌的小表格）
- 不修改列的顺序以外的任何其他列定义
- 不修改后端接口或数据库

## Background & Context
- 项目使用 React + Ant Design Pro Components（ProTable）
- 共发现 25 个使用 `ProColumns` 的列表页面
- 序号列将使用 `{ title: '序号', dataIndex: 'index', valueType: 'index', width: 60, hideInSearch: true }` 格式添加到每个 columns 数组的首位

## Functional Requirements
- **FR-1**: 每个 ProTable 列表的第一列必须是序号列
- **FR-2**: 序号列显示从 1 开始的递增整数
- **FR-3**: 序号列不参与搜索（hideInSearch: true）
- **FR-4**: 序号列不参与排序、筛选等操作

## Non-Functional Requirements
- **NFR-1**: 所有页面修改后 `npm run build` 必须通过
- **NFR-2**: 序号列应与现有表格样式协调

## Constraints
- **Technical**: 只能在现有 columns 数组首位插入，不得破坏其他列定义
- **Dependencies**: 依赖 ProTable 的 `valueType: 'index'` 特性

## Assumptions
- 使用 `valueType: 'index'` 即可满足需求（每页从1开始）
- 序号列不需要固定定位（fixed: 'left'），因为仅60px宽度在最左

## Acceptance Criteria

### AC-1: 所有列表页显示序号列
- **Given**: 任意列表页面已加载
- **When**: 查看表格
- **Then**: 第一列为"序号"，显示从1开始的递增数字
- **Verification**: `human-judgment`

### AC-2: 序号列不参与搜索
- **Given**: 任意列表页面
- **When**: 展开搜索栏
- **Then**: 搜索条件中不包含"序号"字段
- **Verification**: `programmatic`

### AC-3: 构建通过
- **Given**: 所有页面已修改
- **When**: 运行 `npm run build`
- **Then**: 构建成功无错误
- **Verification**: `programmatic`
