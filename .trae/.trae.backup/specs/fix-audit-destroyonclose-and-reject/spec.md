# 修复审核页面 destroyOnClose 弃用警告并完善驳回功能 - Product Requirement Document

## Overview
- **Summary**: 修复认证审核页面中 Ant Design Modal 组件的 `destroyOnClose` 弃用警告（改为 `destroyOnHidden`），并完善驳回审核功能，使管理员可以直接从列表操作列发起驳回操作。
- **Purpose**: 消除控制台弃用警告，确保代码符合 Ant Design 最新 API 规范；同时完善审核操作，使管理员能方便地通过"通过"或"驳回"两种方式处理待审核申请。
- **Target Users**: 后台管理员（审核员）

## Goals
- 修复 `destroyOnClose` 弃用警告，改用 `destroyOnHidden`
- 完善审核操作列，提供清晰的"通过"和"驳回"入口
- 驳回操作必须填写备注原因
- 确保驳回后状态正确更新

## Non-Goals (Out of Scope)
- 不改变后端审核接口逻辑（已支持 approved/rejected）
- 不修改审核列表展示逻辑
- 不修改统计卡片逻辑

## Background & Context
- 当前审核页面使用 `destroyOnClose: true` 配置在 ModalForm 中，触发 Ant Design 5.x 弃用警告
- 操作列中只有"审核"按钮，直接打开通过弹窗，管理员无法方便地发起驳回操作
- 后端接口已支持 `rejected` 操作，无需修改

## Functional Requirements
- **FR-1**: 将 `destroyOnClose: true` 改为 `destroyOnHidden: true`
- **FR-2**: 在审核操作列，将单一的"审核"按钮改为下拉菜单或双按钮形式，支持选择"通过"或"驳回"
- **FR-3**: 驳回操作必须强制填写备注原因（已在弹窗中实现）
- **FR-4**: 驳回后列表应显示驳回状态和驳回备注

## Non-Functional Requirements
- **NFR-1**: 控制台无 destroyOnClose 相关弃用警告
- **NFR-2**: TypeScript 类型检查通过
- **NFR-3**: 驳回操作流响应迅速，无页面卡顿

## Constraints
- **Technical**: Ant Design 5.x，React + TypeScript
- **Business**: 驳回操作必须提供备注理由，不能无理由驳回

## Acceptance Criteria

### AC-1: destroyOnClose 警告消除
- **Given**: 管理员打开认证审核页面
- **When**: 打开浏览器控制台
- **Then**: 无 "Warning: [antd: Modal] destroyOnClose is deprecated" 警告
- **Verification**: `programmatic`

### AC-2: 驳回入口可用
- **Given**: 存在待审核记录
- **When**: 管理员点击操作列的下拉菜单
- **Then**: 可以看到"通过"和"驳回"两个选项
- **Verification**: `human-judgment`

### AC-3: 驳回流程完整
- **Given**: 管理员选择驳回某条审核记录
- **When**: 在弹窗中填写驳回原因并提交
- **Then**: 列表中该记录状态变更为"已驳回"，显示驳回备注
- **Verification**: `programmatic`

### AC-4: 驳回备注必填
- **Given**: 管理员打开驳回弹窗
- **When**: 不填写备注直接提交
- **Then**: 表单校验失败，提示"驳回时必须填写备注原因"
- **Verification**: `programmatic`
