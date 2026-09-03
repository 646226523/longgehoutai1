# 基因档案鸽主输入修复 - 产品需求文档

## Overview
- **摘要**: 修复基因档案表单中鸽主姓名字段的两个核心BUG：1) 去掉单选模式下的删除按钮（allowClear ×按钮）；2) 修复手动输入鸽主姓名后无法正确显示的问题。
- **目的**: 确保后台管理员可以顺畅地选择现有鸽主或手动输入新鸽主姓名，提升数据录入体验。
- **目标用户**: 后台管理员、基因档案录入人员

## Goals
- 去掉 SearchSelect 单选模式下的删除/清除按钮
- 修复手动输入鸽主姓名后 Select 组件无法正确显示输入值的问题
- 确保选择现有鸽主时自动填充电话，手动输入时电话可编辑
- 保持表单提交逻辑正确处理两种输入模式

## Non-Goals (Out of Scope)
- 不修改父鸽/母鸽的 tags 模式行为
- 不修改后端 API 接口
- 不添加鸽主数据的 CRUD 功能

## Background & Context
- 当前 SearchSelect 组件支持单选 allowCreate 模式，但存在显示问题
- GeneForm 中鸽主字段使用 SearchSelect 组件，传入 value 逻辑为 `formValues.owner_id ?? formValues.owner_name`
- 当手动输入时，owner_id 为 null，value 传入 owner_name 字符串，但 options 中 value 都是数字 ID，导致 Select 无法匹配显示
- allowClear 默认为 true，导致显示清除按钮

## Functional Requirements
- **FR-1**: SearchSelect 组件在单选模式下应支持 `allowClear` 属性控制，默认关闭清除按钮
- **FR-2**: GeneForm 鸽主字段选择现有鸽主后，不应显示清除按钮
- **FR-3**: GeneForm 鸽主字段手动输入姓名后，应在 Select 中正确显示输入的姓名
- **FR-4**: 手动输入模式下，鸽主电话字段应可编辑
- **FR-5**: 选择现有鸽主模式下，鸽主电话字段应自动填充并禁用编辑

## Non-Functional Requirements
- **NFR-1**: 代码修改应最小化，不影响父鸽/母鸽的 tags 模式
- **NFR-2**: TypeScript 编译零错误
- **NFR-3**: 浏览器控制台无 Ant Design 弃用警告

## Constraints
- **技术**: React + TypeScript + Ant Design
- **依赖**: Ant Design Select 组件

## Assumptions
- 用户期望单选模式下没有清除按钮（×）
- 手动输入的鸽主姓名将以字符串形式保存到 owner_name 字段
- 选择现有鸽主时 owner_id 和 owner_name 都需要保存

## Acceptance Criteria

### AC-1: 去掉删除按钮
- **Given**: 用户在基因档案表单中
- **When**: 用户展开鸽主姓名字段并选择一个现有鸽主
- **Then**: 选中的鸽主旁不应显示清除按钮（×）
- **Verification**: `human-judgment`

### AC-2: 手动输入显示正确
- **Given**: 用户在基因档案表单中
- **When**: 用户在鸽主姓名字段中输入一个不存在的鸽主姓名并失去焦点
- **Then**: 输入的姓名应正确显示在 Select 组件中，而不是消失或显示空白
- **Verification**: `human-judgment`

### AC-3: 电话联动正确
- **Given**: 用户在基因档案表单中
- **When**: 用户选择现有鸽主
- **Then**: 鸽主电话应自动填充且禁用编辑
- **Verification**: `human-judgment`

### AC-4: 手动输入电话可编辑
- **Given**: 用户在基因档案表单中
- **When**: 用户手动输入鸽主姓名（未选择现有鸽主）
- **Then**: 鸽主电话字段应保持可编辑状态
- **Verification**: `human-judgment`

### AC-5: 表单提交数据正确
- **Given**: 用户在基因档案表单中，已填写所有必填项
- **When**: 用户点击确定提交
- **Then**: 提交的数据中 owner_name 应为输入的姓名，owner_id 为 null（手动输入时）或数字ID（选择时）
- **Verification**: `programmatic`

## Open Questions
- 无
