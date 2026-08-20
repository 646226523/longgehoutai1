# 修复第三方浏览器 Session Token 错误 - 产品需求文档

## Overview
- **Summary**: 当用户在第三方浏览器（非默认开发浏览器）中打开 admin-web 后台管理界面时，系统返回 `{"error":"missing session token"}` 错误，导致页面无法正常加载和使用。本项目旨在定位并修复该问题，确保在任何浏览器中都能正常访问后台管理系统。
- **Purpose**: 解决跨浏览器兼容性问题，提升系统在不同浏览器环境下的健壮性和用户体验，避免因外部代理/网关层的 session token 验证机制导致前端应用无法正常工作。
- **Target Users**: 使用不同浏览器访问后台管理系统的管理员用户。

## Goals
- 在第三方浏览器中访问后台管理系统时不再出现 `{"error":"missing session token"}` 错误
- 即使后端返回非标准格式的错误响应（如 `{error: "xxx"}` 格式），前端也能优雅处理
- 当请求因 session token 缺失被拦截时，前端应引导用户重新登录或给出明确的错误提示
- 确保 Vite 开发服务器在不同浏览器中行为一致

## Non-Goals (Out of Scope)
- 不修改后端 API 的 session token 验证逻辑（后端不属于本项目范围）
- 不添加或修改第三方浏览器兼容性检测
- 不修改现有登录流程的核心逻辑
- 不对外部代理/网关服务做任何修改

## Background & Context
- admin-web 使用 JWT Token 进行身份验证，Token 存储在 localStorage 中
- 开发环境通过 Vite 内置的 mock plugin 模拟 API，所有 `/api` 前缀的请求由 mock 处理
- 当前错误 `{"error":"missing session token"}` 不在 admin-web 或 admin-api 代码库中，可能来源于：
  - 外部代理/网关层的 session token 校验
  - 某些浏览器扩展或安全软件的拦截
  - Vite HMR WebSocket 连接在特定浏览器下的异常行为
- 当前前端请求拦截器仅处理标准的 `{code, message, data}` 响应格式，未对非标准错误格式做兜底处理
- 响应拦截器在遇到非标准错误时可能直接抛出异常，导致页面白屏或崩溃

## Functional Requirements
- **FR-1**: 当 API 返回 `{"error":"missing session token"}` 或其他非标准错误格式时，前端应识别并优雅处理
- **FR-2**: 当检测到 session token 类错误时，前端应自动清除本地存储的认证信息并引导用户跳转到登录页
- **FR-3**: 请求拦截器需要增加对非标准响应格式（如 `{error: string}`）的识别和转换能力
- **FR-4**: Vite mock API 应支持可选的 session token 模式，以便与外部代理环境兼容
- **FR-5**: 应用根组件应增加全局错误边界，捕获未处理的异常并展示友好提示

## Non-Functional Requirements
- **NFR-1**: 错误处理逻辑应在 100ms 内完成，不影响正常请求性能
- **NFR-2**: 新增的错误处理代码应覆盖率至少 80% 的非标准错误场景
- **NFR-3**: 全局错误边界应能阻止白屏崩溃，保证用户始终看到可操作的界面
- **NFR-4**: 代码应符合现有 ESLint 规范

## Constraints
- **Technical**: React 18 + TypeScript + Vite + Ant Design，技术栈不可更改
- **Business**: 需要兼容 Chrome、Firefox、Edge、Safari 等主流浏览器
- **Dependencies**: 依赖 Vite dev server 的 mock plugin 处理 API 请求

## Assumptions
- 错误 `{"error":"missing session token"}` 来源于外部代理/网关或浏览器扩展，非 admin-web 自身代码产生
- 用户在第三方浏览器中打开的是开发环境（localhost:3014）
- 修复的重点是增强前端的错误容错能力，而非修改外部服务

## Acceptance Criteria

### AC-1: 非标准错误格式的优雅处理
- **Given**: 用户在第三方浏览器中打开后台管理系统
- **When**: 某个 API 请求返回 `{"error":"missing session token"}` 响应
- **Then**: 前端应识别该错误并显示友好的错误提示，而非白屏或显示原始 JSON
- **Verification**: `programmatic`
- **Notes**: 验证请求拦截器能正确处理 `{error: string}` 格式的响应

### AC-2: 自动引导重新登录
- **Given**: 用户的请求因 session token 缺失被拒绝
- **When**: 响应拦截器检测到 session token 类错误
- **Then**: 系统应自动清除本地 token 并跳转到登录页
- **Verification**: `programmatic`

### AC-3: 全局错误边界
- **Given**: 应用运行中发生未捕获的异常
- **When**: 错误边界捕获到异常
- **Then**: 显示友好的错误页面并提供重试或返回首页按钮
- **Verification**: `human-judgment`
- **Notes**: 检查错误页面是否美观、信息是否清晰、操作是否明确

### AC-4: 跨浏览器兼容性
- **Given**: 用户在 Chrome、Firefox、Edge 等不同浏览器中访问
- **When**: 进行登录、数据加载、页面导航等核心操作
- **Then**: 所有浏览器中行为一致，不出现 session token 相关错误
- **Verification**: `human-judgment`
- **Notes**: 测试范围至少覆盖 Chrome 和 Firefox 两种浏览器

### AC-5: Mock API 兼容模式
- **Given**: 开发环境的 mock API 接收到带/不带 session cookie 的请求
- **When**: mock 处理请求时
- **Then**: 两种情况下都能正确响应，不因缺少 session token 而报错
- **Verification**: `programmatic`

### AC-6: TypeScript 编译通过
- **Given**: 修改完成后的代码
- **When**: 运行 TypeScript 类型检查
- **Then**: 所有类型检查通过，无错误
- **Verification**: `programmatic`

## Open Questions
- [ ] 错误 `{"error":"missing session token"}` 的具体来源是什么？（外部代理？浏览器扩展？）
- [ ] 是否需要在 mock API 中模拟 session token 行为以匹配生产环境？
- [ ] 是否需要添加 CORS 相关的响应头配置来改善跨浏览器兼容性？
