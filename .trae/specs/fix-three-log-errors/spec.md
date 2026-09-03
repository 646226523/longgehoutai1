# 修复 3 项报错日志 BUG — Product Requirement Document

## Overview

- **Summary**: 修复前端开发环境下浏览器控制台出现的 3 项报错/警告日志，确保开发体验干净无噪声

- **Purpose**: Vite 开发服务器运行时，浏览器控制台持续出现 React Router Future Flag 警告、Vite HMR 连接丢失错误、以及 mock-plugin ESM 兼容错误，干扰开发调试

- **Target Users**: 全栈开发人员

## Goals

- 消除 React Router v7 迁移 Future Flag 警告（2 条黄色 warn）

- 修复 mock-plugin.js 中 `Dynamic require of "http" is not supported` 的 HMR 崩溃错误

- 减少 Vite 重启时产生的 `ERR_ABORTED` / `ERR_CONNECTION_REFUSED` 噪声日志

## Non-Goals (Out of Scope)

- 不修改生产环境构建配置

- 不重构 request.ts 的 IP 获取逻辑（仅优化日志级别）

- 不升级 react-router-dom 主版本

## Background & Context

当前项目使用：

- **Vite v5.4.21** + React Router DOM v6.30.4 + Ant Design v5.17.4

- **自定义 mock-plugin**（`admin-web/server/mock-plugin.js`）拦截开发环境 API 请求

- Vite dev server 通过 proxy 转发 `/api` 到 `localhost:3015`（后端 API）

已发现的 3 类问题及其技术根因：

| # | 问题                                 | 根因                                                                 | 涉及文件                      |
| - | ---------------------------------- | ------------------------------------------------------------------ | ------------------------- |
| 1 | React Router Future Flag 警告 × 2    | `BrowserRouter` 未配置 `future` 属性                                    | `src/main.tsx:48`         |
| 2 | `Dynamic require of "http"` HMR 崩溃 | mock-plugin 使用默认导入 `import http from 'node:http'`，ESM/CommonJS 不兼容 | `server/mock-plugin.js:5` |
| 3 | Vite 重启时 `ERR_ABORTED` 噪声          | `main.tsx` 中的 console 过滤逻辑覆盖不全                                     | `src/main.tsx:15-39`      |

## Functional Requirements

- **FR-1**: React Router v6 Future Flag 必须在 BrowserRouter 上显式配置，消除 `v7_startTransition` 和 `v7_relativeSplatPath` 两条警告

- **FR-2**: mock-plugin.js 必须使用标准 ESM 命名空间导入 `import * as http from 'node:http'`，避免 HMR 触发 `Dynamic require` 错误

- **FR-3**: main.tsx 中的 console 错误过滤器需要扩展，覆盖 Vite 重启/断开时的 `ERR_ABORTED` / `ERR_CONNECTION_REFUSED` 噪声

## Non-Functional Requirements

- **NFR-1**: 修复后执行 `npx tsc --noEmit` 必须零错误

- **NFR-2**: Vite dev server 热更新 mock-plugin.js 时浏览器端不得出现 `Dynamic require` 崩溃

- **NFR-3**: 页面功能不受影响，所有路由正常加载

## Constraints

- **Technical**: Vite v5.4.21 对 Node.js 内置模块的 ESM 导入要求严格；React Router v6.30+ 支持 `future` 属性但需显式配置

- **Business**: 开发效率优先，修复必须快速验证

- **Dependencies**: 依赖 react-router-dom 的 future flags 特性（v6.4+ 引入）

## Assumptions

- 当前 react-router-dom 版本 (v6.30.4) 支持 `v7_startTransition` 和 `v7_relativeSplatPath` future flags

- mock-plugin.js 的 http 模块仅使用 `http.createServer()` 和 `http.request()`，命名空间导入功能等价

- Vite 缓存（node\_modules/.vite）在完全重启后会重新构建

## Acceptance Criteria

### AC-1: React Router Future Flag 警告消除

- **Given**: 全新打开的浏览器标签页访问 `http://localhost:3014/`

- **When**: 页面完全加载完成后检查浏览器控制台

- **Then**: 控制台 `[warn]` 日志中不得出现 `Future Flag Warning` 关键词（两条均消除）

- **Verification**: `programmatic`

### AC-2: mock-plugin ESM 兼容修复

- **Given**: Vite dev server 运行中

- **When**: 修改 `mock-plugin.js` 任意一行代码保存，触发 HMR

- **Then**: Vite 控制台无 `Dynamic require of "http" is not supported` 错误，浏览器端功能正常

- **Verification**: `programmatic`

### AC-3: Vite 重启噪声日志抑制

- **Given**: Vite dev server 运行中

- **When**: 终止并重新启动 Vite dev server，浏览器自动重连

- **Then**: 浏览器控制台 `[error]` 中 `ERR_ABORTED` 和 `ERR_CONNECTION_REFUSED` 条数 ≤ 3 条（正常网络抖动产生的错误）

- **Verification**: `programmatic`

### AC-4: TypeScript 编译零错误

- **Given**: 修改后的代码

- **When**: 在 `admin-web` 目录执行 `npx tsc --noEmit`

- **Then**: 退出码 0，无错误输出

- **Verification**: `programmatic`

### AC-5: 所有页面路由正常

- **Given**: 修复后的前端应用

- **When**: 依次访问 `/`（工作台）、`/system/audit-log`（审计日志）、`/user-member/list`（用户列表）

- **Then**: 所有页面正常渲染，路由切换无异常

- **Verification**: `human-judgment`

## Open Questions

- [ ] 是否还有其他位置使用了 BrowserRouter 或类似组件需要同步配置 future flags？ → 需要搜索确认

