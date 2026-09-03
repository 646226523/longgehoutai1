# 修复 Ant Design 组件废弃警告 - Product Requirement Document

## Overview
- **Summary**: 修复后台管理系统前端（admin-web）中 6 条 Ant Design v5 组件废弃 API 警告/错误日志，消除浏览器控制台噪音，确保组件 API 与 Ant Design 5.x 最佳实践对齐。
- **Purpose**: 提升代码质量，消除控制台错误日志，为后续升级 Ant Design v6 提前做好兼容准备。
- **Target Users**: 后台管理员（当前页面开发者）

## Goals
- 消除 `message` 静态函数调用导致的上下文警告
- 消除 `Card bodyStyle` 属性废弃警告
- 修复 `Spin tip` 非嵌套模式警告
- 统一全站 Ant Design 消息提示调用方式

## Non-Goals (Out of Scope)
- 不修改 ProComponents 内部的 `findDOMNode` 警告（这是 ProComponents 库自身的问题，需升级库版本解决）
- 不修改 React Router Future Flag 警告（属于 v7 迁移范畴，暂不处理）
- 不做 UI/UX 视觉改动

## Background & Context
当前项目使用 Ant Design 5.x，有 6 条来自控制台的错误/警告日志：

| # | 错误类型 | 严重程度 | 来源文件 | 问题描述 |
|---|---------|---------|---------|---------|
| 1 | `[error] antd: message` | 错误 | Login.tsx, request.ts | 静态 `message.success()/error()` 无法消费动态主题上下文 |
| 2 | `[error] antd: Card bodyStyle` | 错误 | Dashboard.tsx:83 | `bodyStyle` 属性已废弃，应改用 `styles.body` |
| 3 | `[error] findDOMNode` | 错误 | ProComponents 内部 | ProComponents 内部使用了 findDOMNode |
| 4 | `[warn] antd: Spin tip` | 警告 | ProComponents 内部 | Spin tip 属性仅在嵌套或全屏模式下生效 |
| 5 | `[warn] React Router` | 警告 | Router | v7_startTransition / v7_relativeSplatPath future flag |
| 6 | 其他 Ant Design 废弃 API | 警告 | 多个页面 | 可能包含 Modal visible→open 等 |

## Functional Requirements
- **FR-1**: 所有页面中使用的 `message.success()/error()/warning()/info()` 静态调用，统一改为通过 `App.useApp()` Hook 获取的 `message` 实例调用
- **FR-2**: `Card` 组件废弃的 `bodyStyle` 属性改为 `styles` 属性
- **FR-3**: `Spin` 组件的 `tip` 属性确保在正确的上下文（嵌套或全屏）中使用

## Non-Functional Requirements
- **NFR-1**: 修复后控制台错误日志应为 0 条（ProComponents 内部 findDOMNode 和 React Router 警告除外）
- **NFR-2**: 修复后所有页面功能不变，视觉无差异
- **NFR-3**: TypeScript 类型检查 `npx tsc --noEmit` 零错误

## Constraints
- **Technical**: 必须与 Ant Design 5.x API 兼容，不能引入 v6 特有 API
- **Dependencies**: 依赖 `@ant-design/pro-components` 当前版本，findDOMNode 警告需等待库升级

## Assumptions
- 用户提到的"6 条报错日志"指上述 6 类控制台错误/警告
- ProComponents 内部的 findDOMNode 和 Spin 警告无法在本项目代码层面修复，需升级库版本

## Acceptance Criteria

### AC-1: message 静态函数警告消除
- **Given**: 用户已登录后台系统
- **When**: 浏览任意页面并触发 message 提示
- **Then**: 控制台不再出现 `[antd: message] Static function can not consume context like dynamic theme` 错误
- **Verification**: `programmatic`

### AC-2: Card bodyStyle 废弃警告消除
- **Given**: 用户访问 Dashboard 页面
- **When**: 页面加载完成
- **Then**: 控制台不再出现 `[antd: Card] bodyStyle is deprecated` 警告
- **Verification**: `programmatic`

### AC-3: TypeScript 类型检查通过
- **Given**: 修改完成后
- **When**: 运行 `npx tsc --noEmit`
- **Then**: 返回 0 错误
- **Verification**: `programmatic`

### AC-4: 所有页面功能正常
- **Given**: 修复完成后
- **When**: 手动测试所有页面核心功能
- **Then**: 所有功能与修复前一致，无回归
- **Verification**: `human-judgment`

## Open Questions
- [ ] findDOMNode 和 Spin 警告来自 ProComponents 内部，是否需要升级 ProComponents 版本？（当前版本 `@ant-design/pro-components@^2.7.19`）
