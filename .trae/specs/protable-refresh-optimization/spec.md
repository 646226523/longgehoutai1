# ProTable 刷新功能优化 - Product Requirement Document

## Overview
- **Summary**: 优化系统所有页面中 ProTable 组件的刷新功能，为刷新按钮添加可见的加载状态动画、刷新完成提示和最后更新时间戳，让用户清楚感知到数据正在刷新和刷新已完成。
- **Purpose**: 当前 ProTable 内置的刷新按钮（🔄 图标）点击后没有任何视觉反馈，用户无法判断刷新是否正在进行或是否已完成，造成困惑和不信任感。
- **Target Users**: 所有使用后台管理系统的管理员和工作人员

## Goals
- 刷新按钮点击时显示加载动画（旋转效果）
- 刷新完成后显示成功提示（Toast 消息）
- 表格区域刷新时显示加载状态（Spin 或骨架屏）
- 显示最后刷新时间戳
- 提供统一的刷新处理工具，简化各页面接入成本

## Non-Goals (Out of Scope)
- 修改 ProTable 组件源码（仅通过外部 hook/工具增强）
- 实现自动轮询刷新（保持手动刷新模式）
- 添加刷新音效

## Background & Context
- 系统中约有 20+ 个页面使用 ProTable 组件
- 当前刷新按钮使用 `actionRef.current?.reload()` 静默执行，无任何视觉反馈
- ProTable 组件本身支持 `loading` prop 和 `request` 方法，但未被充分利用
- 技术栈：React + Ant Design v5 + @ant-design/pro-components

## Functional Requirements
- **FR-1**: 提供自定义 hook `useTableRefresh`，封装刷新逻辑
- **FR-2**: 刷新过程中，刷新按钮显示 loading 状态（旋转图标）
- **FR-3**: 刷新完成后，显示 Toast 成功提示"刷新成功"
- **FR-4**: 表格区域显示加载状态（通过 ProTable `loading` prop）
- **FR-5**: 在表格工具栏显示最后刷新时间
- **FR-6**: 刷新失败时显示错误提示
- **FR-7**: 所有现有 ProTable 页面接入此功能

## Non-Functional Requirements
- **NFR-1**: 刷新状态反馈延迟 < 100ms
- **NFR-2**: hook 接入简单，每个页面改动不超过 10 行代码
- **NFR-3**: 不影响现有表格的筛选、分页、操作等功能

## Constraints
- **Technical**: 不能修改 @ant-design/pro-components 源码
- **Technical**: 需兼容现有的 `actionRef` 使用方式
- **Business**: 改动范围广，需确保不引入回归问题

## Assumptions
- 所有 ProTable 页面都使用了 `actionRef`（ActionType ref）
- 刷新操作不涉及复杂的链式调用
- 成功/失败提示使用 Ant Design 的 `message` API

## Acceptance Criteria

### AC-1: 刷新按钮加载状态
- **Given**: 用户在任意列表页面
- **When**: 用户点击刷新按钮
- **Then**: 刷新按钮图标变为旋转状态（loading），持续到刷新完成
- **Verification**: `human-judgment`

### AC-2: 刷新完成提示
- **Given**: 用户已触发刷新操作
- **When**: 数据刷新成功
- **Then**: 显示"刷新成功"Toast 提示，表格恢复正常显示
- **Verification**: `human-judgment`

### AC-3: 最后刷新时间显示
- **Given**: 页面已加载或刷新完成
- **When**: 查看表格工具栏
- **Then**: 显示"上次刷新: YYYY-MM-DD HH:mm:ss"时间戳
- **Verification**: `human-judgment`

### AC-4: 刷新失败处理
- **Given**: 用户已触发刷新操作
- **When**: 数据刷新失败（网络错误等）
- **Then**: 显示错误 Toast 提示，刷新按钮恢复可点击状态
- **Verification**: `human-judgment`

### AC-5: 表格加载状态
- **Given**: ProTable 的 request 方法正在执行
- **When**: 查看表格区域
- **Then**: 表格显示加载状态（通过 ProTable loading prop）
- **Verification**: `human-judgment`

### AC-6: hook 通用性
- **Given**: 开发者在新页面中使用 ProTable
- **When**: 引入 `useTableRefresh` hook
- **Then**: 只需传入 `actionRef` 即可获得完整的刷新功能
- **Verification**: `programmatic`

## Open Questions
- [ ] 是否需要支持手动触发刷新（按钮）和自动刷新（定时器）两种模式？MVP 先实现手动模式
- [ ] 刷新成功提示是否需要可配置（某些页面可能不希望频繁弹窗）？MVP 默认显示
