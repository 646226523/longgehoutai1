# 修复鸽主姓名手动填写功能 - 产品需求文档

## Overview
- **Summary**: 修复新增基因档案表单中"鸽主姓名"字段无法手动输入的BUG。当前使用 SearchSelect 组件配合 `allowCreate` 属性，通过 Ant Design Select 的 `mode="tags"` 模式原生支持手动输入新鸽主，同时保留从现有鸽主列表选择的功能。
- **Purpose**: 后台工作人员需要能够在新增基因档案时手动输入新鸽主信息（姓名+电话），而不仅限于从现有鸽主列表中选择。
- **Target Users**: 后台管理人员、基因档案录入人员

## Goals
- 鸽主姓名字段支持手动输入新鸽主（通过 tags 模式）
- 鸽主姓名字段支持从现有鸽主列表选择
- 选择现有鸽主时，自动联动填充鸽主电话并禁用电话字段
- 手动输入新鸽主时，鸽主电话字段可手动编辑
- 表单验证确保鸽主姓名为必填项
- 表单提交时正确传递 owner_id/owner_name/owner_phone 数据

## Non-Goals (Out of Scope)
- 不修改后端 API 接口
- 不修改鸽主搜索逻辑
- 不涉及鸽主数据的持久化存储（新鸽主仅关联当前基因档案）

## Background & Context
- 项目使用 React + Ant Design 组件库
- SearchSelect 是自定义的搜索选择组件，基于 Ant Design Select 封装
- GeneForm 是基因档案表单组件，包含鸽主信息录入
- 之前的问题：使用单选模式 + allowCreate 时，Select 组件无法正确处理不在 options 列表中的新值
- 解决方案：改用 tags 模式（多选标签模式），Ant Design Select 的 tags 模式原生支持创建新值

## Functional Requirements
- **FR-1**: 鸽主姓名字段支持通过下拉选择现有鸽主
- **FR-2**: 鸽主姓名字段支持手动输入新鸽主（输入后按 Enter 确认）
- **FR-3**: 选择现有鸽主时，鸽主电话自动填充且字段禁用
- **FR-4**: 手动输入新鸽主时，鸽主电话字段可编辑且初始为空
- **FR-5**: 表单验证确保鸽主姓名不能为空
- **FR-6**: 表单提交时传递正确的 owner_id/owner_name/owner_phone 值

## Non-Functional Requirements
- **NFR-1**: TypeScript 类型检查无错误
- **NFR-2**: 不影响其他使用 SearchSelect 组件的页面功能
- **NFR-3**: 现有鸽主搜索逻辑保持不变

## Constraints
- **Technical**: 必须使用 Ant Design Select 组件
- **Dependencies**: 依赖现有 searchOwners API 返回鸽主列表

## Assumptions
- tags 模式显示的标签样式在当前 UI 中可接受
- 新鸽主信息仅保存在当前基因档案中，不需要独立的鸽主管理功能

## Acceptance Criteria

### AC-1: 手动输入鸽主姓名
- **Given**: 用户在新增基因档案表单
- **When**: 用户在鸽主姓名字段输入"新鸽主测试"并按 Enter
- **Then**: 字段显示"新鸽主测试"标签值，无错误提示
- **Verification**: `programmatic`
- **Notes**: 通过浏览器自动化测试验证

### AC-2: 选择现有鸽主
- **Given**: 用户在新增基因档案表单
- **When**: 用户从鸽主姓名下拉列表选择一个已有鸽主
- **Then**: 字段显示所选鸽主姓名，鸽主电话自动填充且禁用
- **Verification**: `programmatic`

### AC-3: 联动电话字段
- **Given**: 用户已选择现有鸽主
- **When**: 查看鸽主电话字段
- **Then**: 电话字段显示鸽主的电话号码且处于禁用状态
- **Verification**: `programmatic`

### AC-4: 手动输入时电话可编辑
- **Given**: 用户已手动输入新鸽主姓名
- **When**: 查看鸽主电话字段
- **Then**: 电话字段为空且可编辑
- **Verification**: `programmatic`

### AC-5: 表单提交成功
- **Given**: 用户已填写所有必填字段（包括鸽主姓名和电话）
- **When**: 点击"确定"按钮
- **Then**: 表单成功提交，对话框关闭，显示"新增成功"提示
- **Verification**: `programmatic`

### AC-6: 表单验证
- **Given**: 用户未填写鸽主姓名
- **When**: 点击"确定"按钮
- **Then**: 表单提示"请选择鸽主"错误
- **Verification**: `programmatic`

### AC-7: 清除鸽主选择
- **Given**: 用户已选择或输入鸽主
- **When**: 用户清除鸽主字段
- **Then**: 鸽主姓名和电话字段均被清空
- **Verification**: `programmatic`

## Open Questions
- [ ] tags 模式的标签样式是否符合用户预期？（当前单选模式下展示为单个标签）
