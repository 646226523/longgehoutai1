# 修复审核提交按钮无法点击问题 - Product Requirement Document

## Overview
- **Summary**: 修复认证审核页面中"确认通过"和"确认驳回"按钮无法点击、无法正常走完审核流程的问题。
- **Purpose**: 管理员在审核认证申请时，点击弹窗底部的"确认通过"或"确认驳回"按钮无反应，导致无法完成审核操作。需要修复 ModalForm 的 submitter 配置，确保按钮能正确触发表单提交。
- **Target Users**: 后台管理员（审核员）

## Goals
- 修复审核通过按钮无法点击的问题
- 修复确认驳回按钮无法点击的问题
- 确保审核流程（打开弹窗 → 填写备注 → 点击按钮 → 提交审核 → 刷新列表）完整可用

## Non-Goals (Out of Scope)
- 不修改后端审核接口
- 不修改审核列表展示逻辑
- 不修改统计卡片逻辑

## Background & Context
- 当前审核弹窗使用 `ModalForm` 组件
- `submitter.render` 配置方式可能导致按钮与表单提交断开
- 需要使用 `formRef` 或正确的 `onClick` 处理来确保按钮能触发表单提交

## Functional Requirements
- **FR-1**: 点击"✓ 确认通过"按钮能触发表单提交并调用审核通过接口
- **FR-2**: 点击"✗ 确认驳回"按钮能触发表单提交并调用审核驳回接口
- **FR-3**: 驳回时无备注应提示校验错误
- **FR-4**: 审核成功后列表自动刷新

## Acceptance Criteria

### AC-1: 审核通过按钮可点击
- **Given**: 管理员打开审核通过弹窗
- **When**: 点击"✓ 确认通过"按钮
- **Then**: 表单提交，调用审核接口，弹窗关闭，列表刷新
- **Verification**: `programmatic`

### AC-2: 审核驳回按钮可点击
- **Given**: 管理员打开驳回弹窗
- **When**: 填写备注后点击"✗ 确认驳回"按钮
- **Then**: 表单提交，调用驳回接口，弹窗关闭，列表刷新
- **Verification**: `programmatic`

### AC-3: 驳回校验正常
- **Given**: 管理员打开驳回弹窗
- **When**: 不填写备注直接点击"✗ 确认驳回"
- **Then**: 表单校验失败，提示"驳回时必须填写备注原因"
- **Verification**: `programmatic`
