# 修复 UserList.tsx 11 项控制台报错 - PRD

## Overview
- **Summary**: 修复用户管理页面 (UserList.tsx) 详情抽屉重构后产生的 11 项浏览器控制台错误，包括 JSX 语法错误和 Ant Design API 弃用警告。
- **Purpose**: 消除 Vite HMR 热更新失败、页面无法正常加载、控制台错误泛滥的问题，确保用户管理详情页功能正常可用。
- **Target Users**: 后台管理员

## Goals
- [x] 修复 JSX 标签嵌套错误（根因错误）
- [x] 修复 Ant Design Drawer `bodyStyle` 弃用警告
- [x] 消除所有 HMR 热更新级联错误
- [x] 确保 TypeScript 编译和 Vite 构建均无错误

## Non-Goals
- 不改动页面设计和功能
- 不新增功能

## 错误清单分析

| # | 错误类型 | 内容 | 根因 |
|---|---------|------|------|
| 1 | JSX 语法 | `Expected corresponding JSX closing tag for <div>. (1021:6)` | renderDetailDrawer 函数中 div 闭合标签不匹配 |
| 2-10 | HMR 级联 | `net::ERR_ABORTED` × 多次 | 根因错误导致模块加载失败 |
| 11 | API 弃用 | `[antd: Drawer] bodyStyle is deprecated` | antd 5.x 应使用 `styles.body` 替代 `bodyStyle` |

## Acceptance Criteria

### AC-1: JSX 语法正确性
- **Given**: UserList.tsx 文件
- **When**: Vite dev server 热编译或 TypeScript 编译
- **Then**: 无 JSX 语法错误
- **Verification**: `programmatic`

### AC-2: API 弃用警告消除
- **Given**: 详情抽屉 Drawer 组件
- **When**: 打开详情抽屉
- **Then**: 控制台无 `bodyStyle` 弃用警告
- **Verification**: `programmatic`

### AC-3: 页面功能正常
- **Given**: 用户管理页面
- **When**: 点击任意用户的"详情"按钮
- **Then**: 详情抽屉正常打开，内容完整展示
- **Verification**: `human-judgment`

### AC-4: 零控制台错误
- **Given**: 页面完全加载
- **When**: 查看浏览器控制台
- **Then**: 无阻断性错误和弃用警告
- **Verification**: `human-judgment`
