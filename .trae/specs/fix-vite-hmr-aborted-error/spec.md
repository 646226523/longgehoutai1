# 修复 Vite HMR ERR_ABORTED 错误 - 产品需求文档

## Overview
- **Summary**: 修复 Vite 开发服务器 HMR（热模块替换）模块在浏览器控制台输出 `net::ERR_ABORTED` 错误的问题。该错误源于 HMR 客户端尝试通过 WebSocket 连接开发服务器 ping 时连接被中断。
- **Purpose**: 提升开发体验，消除浏览器控制台中反复出现的 `net::ERR_ABORTED` 错误日志，避免误导开发者将其误认为业务错误。
- **Target Users**: 使用 admin-web 后台管理系统的开发者

## Goals
- [G1]: 彻底消除浏览器控制台中的 `net::ERR_ABORTED` HMR 错误日志
- [G2]: 保留其他类型错误的正常输出（不误过滤）
- [G3]: 修复在 Trae 预览代理环境下 HMR WebSocket 连接不稳定的问题

## Non-Goals (Out of Scope)
- 不修改 Vite 源码或 HMR 底层实现
- 不影响生产构建（production build）
- 不改变现有的 mock API 插件行为
- 不修复其他类型的控制台错误（仅处理 Vite HMR 相关的连接错误）

## Background & Context
- **技术栈**: Vite 5.4 + React 18 + TypeScript + Ant Design
- **现有抑制代码**: [main.tsx](file:///workspace/admin-web/src/main.tsx#L14-L37) 中已存在 console.error 和 window.onerror 的抑制逻辑，但存在以下缺陷：
  1. `args.join(' ')` 无法正确处理 Error 对象（会转为 `[object Object]` 字符串）
  2. 未覆盖 `window.onunhandledrejection` 事件
  3. HMR 配置中的 `host`/`clientPort` 硬编码在代理环境下可能导致连接问题
- **错误来源**: Vite 客户端脚本 `@vite/client` 的 `waitForSuccessfulPing()` 函数尝试建立 WebSocket 连接，在页面加载/路由切换过程中连接被中断时产生此错误
- **运行环境**: 开发模式（`npm run dev`），通过 Trae 预览代理访问

## Functional Requirements
- **FR-1**: `console.error` 过滤器必须正确处理 Error 对象参数（通过 `String(arg)` 和 `arg?.message` 获取可读文本）
- **FR-2**: 过滤逻辑必须覆盖以下错误模式：`net::ERR_ABORTED`、`net::ERR_CONNECTION_REFUSED`、`@vite/client` 相关 ping 错误
- **FR-3**: 添加 `unhandledrejection` 事件监听以捕获 Promise rejection 形式的 HMR 错误
- **FR-4**: 非 HMR 相关的错误必须正常输出到控制台（不误过滤）
- **FR-5**: Vite HMR 配置需适配代理环境，使用合适的 host 配置避免 WebSocket 直连失败

## Non-Functional Requirements
- **NFR-1**: 过滤逻辑必须在应用启动时（React 渲染之前）立即生效
- **NFR-2**: 代码变更必须不超过 50 行（遵循简洁原则）
- **NFR-3**: 仅在开发模式（`import.meta.env.DEV`）下启用，生产环境不受影响
- **NFR-4**: 必须保留原始 console.error 的引用，防止无限递归

## Constraints
- **Technical**: 必须使用 Vite 提供的 HMR 配置选项，不能修改 Vite 源代码
- **Technical**: 不能安装新依赖
- **Business**: 修复必须是纯前端改动，不涉及后端 API

## Assumptions
- [A1]: 用户在开发模式下运行（`npm run dev`），而非生产构建
- [A2]: 错误仅影响浏览器控制台的开发体验，不影响应用功能
- [A3]: 抑制这些错误不会影响 HMR 热更新的实际功能

## Acceptance Criteria

### AC-1: console.error 正确过滤 Error 对象
- **Given**: 开发者在开发模式下打开浏览器控制台
- **When**: Vite HMR 客户端因连接中断产生 `net::ERR_ABORTED` 错误
- **Then**: 该错误不会出现在浏览器控制台中
- **Verification**: `programmatic`
- **Notes**: 需要通过模拟 console.error 调用（传入 Error 对象）来验证

### AC-2: 其他错误正常输出
- **Given**: 开发者在开发模式下打开浏览器控制台
- **When**: 业务代码产生非 HMR 相关的错误（如 `TypeError`、`API 错误`）
- **Then**: 该错误正常输出到控制台
- **Verification**: `programmatic`

### AC-3: HMR 配置适配代理环境
- **Given**: 应用通过 Trae 预览代理访问
- **When**: 页面加载完成后
- **Then**: 不再出现 HMR WebSocket 连接错误
- **Verification**: `human-judgment`
- **Notes**: 需要在 Trae 预览环境中验证

### AC-4: 生产环境不受影响
- **Given**: 应用以生产模式构建并运行
- **When**: 任何错误发生
- **Then**: 过滤逻辑不生效，所有错误正常输出
- **Verification**: `programmatic`

### AC-5: unhandledrejection 也被过滤
- **Given**: HMR 产生 Promise rejection 形式的错误
- **When**: rejection 发生
- **Then**: 该 rejection 不会出现在控制台
- **Verification**: `programmatic`

## Open Questions
- [ ] 是否需要配置 `hmr.port` 为 0 让 Vite 自动分配端口？（可能影响 Trae 预览代理兼容性）
- [ ] 是否需要添加 Vite 的 `server.hmr.overlay` 关闭错误覆盖层？（已设为 false，需确认）
