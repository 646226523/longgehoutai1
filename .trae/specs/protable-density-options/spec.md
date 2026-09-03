# ProTable 添加 density:false 选项 - 产品需求文档

## Overview
- **概述**: 在 admin-web 项目中所有使用 `ProTable` 组件的文件中添加 `options={{ density: false }}` 属性,禁用表格密度切换功能,统一表格视觉体验。
- **目的**: ProTable 默认显示密度切换按钮,对于后台管理系统而言,固定的密度布局更专业,避免用户误操作导致表格布局混乱。
- **目标用户**: 后台管理员

## Goals
- 为所有 ProTable 组件添加 `options={{ density: false }}`,确保所有表格禁用密度切换
- 对于已有 `options` 属性的 ProTable,将 `density: false` 合并进现有 options 对象
- 保持 TypeScript 类型检查通过,零错误
- 保持所有现有功能不变

## Non-Goals (Out of Scope)
- 不修改 ProTable 的其他 options 配置项
- 不修改 ProTable 组件本身
- 不添加除 density 以外的其他 options 属性
- 不重构代码结构

## Background & Context
- 项目使用 React + TypeScript + Ant Design Pro Components
- ProTable 组件来自 `@ant-design/pro-components`
- `options` 属性控制 ProTable 右上角工具栏的显示项,包括 `density`(密度切换)、`reload`(刷新)、`setting`(列设置) 等
- 当 `options.density` 为 `false` 时,密度切换按钮被隐藏

## Functional Requirements
- **FR-1**: 所有 `src/pages/` 下使用 ProTable 的文件,其 ProTable 组件均须包含 `density: false` 配置
- **FR-2**: 若 ProTable 已有 `options={{...}}` 字面量对象,须将 `density: false` 合并进去
- **FR-3**: 若 ProTable 的 `options` 是变量引用(如 `options={someVar}`),则不修改(保持原值)
- **FR-4**: 若 ProTable 使用 `options={false}` 完全禁用 options,则不修改(该用法已隐去 density)
- **FR-5**: 修改后 `npx tsc --noEmit` 零错误

## Non-Functional Requirements
- **NFR-1**: 所有修改必须保持现有代码风格和缩进一致性
- **NFR-2**: 修改须最小化,仅添加必要的属性,不做其他无关变更

## Constraints
- **技术**: 必须使用 TypeScript,保持类型安全
- **技术**: 不引入新依赖
- **业务**: 不得改变 ProTable 的现有行为(除禁用密度切换外)

## Assumptions
- 所有 ProTable 均来自 `@ant-design/pro-components`
- `options` 属性接受 `{ density?: boolean; reload?: boolean; setting?: boolean }` 类型
- 用户确认不需要 density 功能,其他 options 功能(如 reload、setting)保持默认

## Acceptance Criteria

### AC-1: ProTable 添加 density:false
- **Given**: 一个使用 ProTable 的文件,且该 ProTable 无 options 属性
- **When**: 执行修改
- **Then**: ProTable 标签中包含 `options={{ density: false }}`
- **Verification**: `programmatic`

### AC-2: 已有 options 的 ProTable 合并
- **Given**: 一个使用 ProTable 的文件,且该 ProTable 已有 `options={{ reload: false }}`
- **When**: 执行修改
- **Then**: options 变为 `options={{ density: false, reload: false }}`
- **Verification**: `programmatic`

### AC-3: 变量引用 options 不修改
- **Given**: 一个使用 ProTable 的文件,且该 ProTable 有 `options={someVar}` 变量引用
- **When**: 执行修改
- **Then**: 该 ProTable 不被修改
- **Verification**: `programmatic`

### AC-4: options={false} 不修改
- **Given**: 一个使用 ProTable 的文件,且该 ProTable 有 `options={false}`
- **When**: 执行修改
- **Then**: 该 ProTable 不被修改(options=false 已完全禁用工具栏)
- **Verification**: `programmatic`

### AC-5: TypeScript 编译通过
- **Given**: 所有文件修改完成
- **When**: 运行 `npx tsc --noEmit`
- **Then**: 零类型错误
- **Verification**: `programmatic`

### AC-6: 关键文件验证
- **Given**: 基因模块的三个关键文件
- **When**: 检查 `List.tsx`、`Audit.tsx`、`Detail.tsx`
- **Then**: 每个 ProTable 均包含 `options={{ density: false }}`
- **Verification**: `programmatic`

## Open Questions
- 无开放问题