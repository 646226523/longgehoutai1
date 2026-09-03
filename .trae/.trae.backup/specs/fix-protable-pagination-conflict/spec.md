# ProTable 分页状态冲突修复 - Product Requirement Document

## Overview
- **Summary**: 修复后台管理系统中所有 ProTable 页面的分页状态冲突问题——点击页码无法正确切换选中状态、切换每页条数选项无法正常生效。根因是 ProTable 使用 `request` 属性时已内部管理分页状态，外部通过 `pagination` prop 传入受控的 `current`/`pageSize` 状态与 ProTable 内部状态产生冲突。
- **Purpose**: 让后台工作人员能够正常点击分页页码切换、选择每页显示条数（10/20/50/100），且页码选中状态正确反映当前页码。
- **Target Users**: 后台管理员

## Goals
- 修复所有 ProTable 页面的页码点击选中状态问题
- 修复所有 ProTable 页面的每页条数切换功能
- 消除因分页状态冲突导致的 AntD Table 警告
- 保持 TypeScript 编译零错误

## Non-Goals (Out of Scope)
- 不修改 statistics/Overview.tsx 中的普通 Table（无 `showSizeChanger`）
- 不修改 `pagination={false}` 的嵌套表格
- 不修改 gene/Detail.tsx、user-member/MemberLevel.tsx 等使用 `pagination={false}` 的页面

## Background & Context
- 项目使用 React + Vite + Ant Design Pro 技术栈
- 所有列表页面使用 `ProTable` 组件并通过 `request` 属性异步加载数据
- ProTable 在提供 `request` 时会自动管理 `current`、`pageSize` 等分页内部状态
- 上一轮修复中为每个 ProTable 添加了受控的 `tablePagination` state（包含 `current` 和 `pageSize`），并通过 `pagination` prop 展开传入
- 这导致 ProTable 内部状态与外部受控状态发生冲突：用户点击页码时 ProTable 内部更新状态并调用 `request`，但外部 state 同时通过 `onChange` 更新，造成竞态
- 当前项目共有 **24 个 ProTable 实例**（分布在 22 个文件中）需要修复

## Functional Requirements
- **FR-1**: 每个 ProTable 页面的分页配置不再外部受控 `current` 和 `pageSize`
- **FR-2**: 保留 `showSizeChanger: true`、`pageSizeOptions: [10, 20, 50, 100]` 配置
- **FR-3**: 使用 `defaultPageSize: 10` 替代外部 state 中的 `pageSize`
- **FR-4**: 保留 `onChange` 和 `onShowSizeChange` 回调作为可选监听（ProTable 内部已正确处理翻页和数据刷新）
- **FR-5**: 删除不再需要的 `tablePagination` state 声明（可选，保留不影响功能）

## Non-Functional Requirements
- **NFR-1**: 修改后 TypeScript 编译零错误
- **NFR-2**: 修改后 Console 无 AntD Table 分页相关警告
- **NFR-3**: 修改风格与项目现有代码一致

## Constraints
- **Technical**: 必须使用 ProTable 原生的 `request` + 内部状态管理模式
- **Business**: 所有页面的分页交互需保持一致体验
- **Dependencies**: 依赖 ProTable `@ant-design/pro-components` 的原生分页行为

## Assumptions
- ProTable 在使用 `request` 时，`onChange` 和 `onShowSizeChange` 回调仍会正常触发
- ProTable 在 pageSize 变更时会自动将 `current` 重置为 1
- 移除外部 `current`/`pageSize` 控制后，ProTable 能正确处理所有分页交互

## Acceptance Criteria

### AC-1: 页码点击切换选中状态
- **Given**: 用户在任意 ProTable 列表页面（如 NFT 列表）
- **When**: 用户点击第 2 页页码
- **Then**: 第 2 页高亮为选中状态，表格数据刷新显示第 2 页内容，Console 无警告
- **Verification**: `programmatic`

### AC-2: 每页条数切换功能
- **Given**: 用户在任意 ProTable 列表页面
- **When**: 用户通过下拉选择器切换到 "20 条/页"
- **Then**: 下拉显示 "20 条/页" 为选中状态，表格刷新显示 20 条数据，自动回到第 1 页，Console 无警告
- **Verification**: `programmatic`

### AC-3: 多分页 ProTable 实例
- **Given**: 用户在 NFT 审核页面（有两个 ProTable：资产列表和任务列表）
- **When**: 用户在资产列表切换到 "50 条/页"，在任务列表点击第 2 页
- **Then**: 两个表格的分页状态独立正确，各自数据正确刷新，Console 无警告
- **Verification**: `programmatic`

### AC-4: AntD Table 警告消除
- **Given**: 用户在任意 ProTable 列表页面执行分页操作
- **When**: 打开浏览器开发者工具 Console
- **Then**: 无 `Warning: [antd: Table] dataSource length is less than pagination.total` 警告
- **Verification**: `programmatic`

### AC-5: TypeScript 编译通过
- **Given**: 修改完成后
- **When**: 运行 `npx tsc --noEmit`
- **Then**: 编译零错误
- **Verification**: `programmatic`

## Open Questions
- [ ] 是否需要完全删除 `tablePagination` state 变量（当前保留不影响功能，但会造成代码冗余）
- [ ] 是否需要将 `onChange` 和 `onShowSizeChange` 改为空实现或删除（保留为空函数体即可，ProTable 内部已处理一切）