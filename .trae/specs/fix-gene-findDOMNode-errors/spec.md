# 修复基因信息管理 findDOMNode 报错 - PRD

## Overview
- **Summary**: 修复基因信息管理页面（GeneList）中 2 条由 Ant Design 内部 `findDOMNode` 废弃 API 引发的控制台错误。
- **Purpose**: 消除 `ProTable` 工具栏中 `DensityIcon` → `Dropdown` → `Tooltip` → `ResizeObserver` → `DomWrapper` 调用链触发的 React 废弃 API 警告。
- **Target Users**: 后台系统开发者

## Goals
- 消除 `findDOMNode is deprecated` 错误
- 消除 `deprecated in StrictMode findDOMNode DomWrapper4` 错误
- 确保修复覆盖所有使用 ProTable 的页面（约 27 个文件）

## Non-Goals
- 不修改 Ant Design 库源码
- 不改变表格密度切换功能（通过禁用密度按钮实现，为稳定性让步）

## Background & Context
通过浏览器控制台分析，2 条报错的完整调用链为：

```
ProTable → TableRender → ToolbarRender → ToolBar → ListToolBar → DensityIcon
→ Dropdown → Tooltip → ResizeObserver → DomWrapper → findDOMNode (废弃)
```

根因是 Ant Design 5.x 内部的 `DomWrapper` 组件使用了 React 已废弃的 `findDOMNode` API。当 `ProTable` 工具栏渲染 `DensityIcon`（密度切换按钮）时，该按钮被包裹在 `Dropdown` → `Tooltip` → `ResizeObserver` 组件链中，每个组件内部都使用 `DomWrapper`，从而触发废弃警告。

## Functional Requirements
- **FR-1**: 所有 `ProTable` 组件添加 `options={{ density: false }}` 禁用密度选择器
- **FR-2**: 验证基因信息管理页面（GeneList、GeneAudit、GeneDetail）不再出现 findDOMNode 错误

## Non-Functional Requirements
- **NFR-1**: 修复后 ProTable 所有其他功能（搜索、分页、工具栏、操作列等）保持不变
- **NFR-2**: `npx tsc --noEmit` 零错误
- **NFR-3**: 修复不影响后端 API 调用

## Constraints
- **Technical**: Ant Design 5.x + ProComponents 2.7.x，无可用升级版本
- **Dependencies**: 依赖 ProComponents ProTable API

## Acceptance Criteria

### AC-1: GeneList 页面 findDOMNode 错误消除
- **Given**: 用户访问 /gene/list 页面
- **When**: 页面加载完成
- **Then**: 控制台不再出现 `findDOMNode is deprecated` 错误
- **Verification**: `programmatic`

### AC-2: GeneAudit / GeneDetail 页面同样无报错
- **Given**: 用户访问 /gene/audit 或 /gene/detail/:id
- **When**: 页面加载完成
- **Then**: 控制台不再出现 findDOMNode 相关错误
- **Verification**: `programmatic`

### AC-3: TypeScript 编译通过
- **Given**: 修改完成后
- **When**: 运行 `npx tsc --noEmit`
- **Then**: 返回 0 错误
- **Verification**: `programmatic`

## Open Questions
- 无 — 根因和修复方案已明确
