# 修复代理域第三方浏览器会话令牌错误 - 产品需求文档

## Overview
- **Summary**: 当用户通过 Trae IDE 的代理域（`traecontent.cn`）在第三方浏览器中打开 admin-web 后台管理界面时，系统返回 `{"error":"missing session token"}` 错误，导致页面无法正常加载。本项目旨在解决代理环境下的会话令牌兼容性问题，确保在任何浏览器中通过代理访问后台管理系统都能正常工作。
- **Purpose**: 解决代理域跨浏览器访问时的会话验证问题，提升系统在 Trae IDE 沙箱代理环境下的可用性和健壮性。
- **Target Users**: 使用 Trae IDE 代理域名在不同浏览器中访问后台管理系统的开发者和管理员。

## Goals
- 通过代理域（`traecontent.cn`）在第三方浏览器中访问后台管理系统时不再出现会话令牌错误
- 登录流程在代理环境下正常工作，JWT Token 能够正确存储和传递
- 当代理层返回会话令牌错误时，前端能优雅处理并引导用户完成登录
- Vite 开发服务器能正确识别和处理来自代理域的请求

## Non-Goals (Out of Scope)
- 不修改 Trae IDE 代理层的会话验证逻辑
- 不改变现有的 JWT 认证架构
- 不添加新的第三方认证方案
- 不修改 admin-api 后端服务

## Background & Context
- admin-web 使用 Vite 开发服务器（端口 3014）提供前端服务，通过 mock-plugin 模拟 API 响应
- 前端认证基于 JWT Token，存储在浏览器 localStorage 中
- Trae IDE 使用 `traecontent.cn` 作为反向代理，将外部请求转发到本地开发服务器
- 代理层有独立的会话验证机制，当检测不到有效会话令牌时返回 `{"error":"missing session token"}`
- localStorage 中的 Token 是域隔离的：在 `localhost:3014` 登录的 Token 无法在 `traecontent.cn` 域中使用
- 当前问题：外部浏览器通过代理域访问时，代理层先验证会话，如果代理层找不到有效会话，直接返回错误，请求根本无法到达 Vite 服务器

## Functional Requirements
- **FR-1**: Vite 开发服务器需要正确处理来自代理域的请求（识别代理头、转发路径等）
- **FR-2**: 登录成功后，Token 需要同时存储在 localStorage 和 Cookie 中，以兼容代理环境
- **FR-3**: 当代理层返回 `{"error":"missing session token"}` 时，前端应识别此错误并引导用户完成登录流程
- **FR-4**: 请求拦截器需要在请求中同时携带 Authorization Header 和 Cookie 以兼容代理验证
- **FR-5**: 登录页需要检测当前是否运行在代理域环境中，并显示相应的提示或完成自动适配
- **FR-6**: 提供直接访问模式（localhost）作为代理访问的备选方案

## Non-Functional Requirements
- **NFR-1**: 登录流程在代理环境下的响应时间不超过 3 秒
- **NFR-2**: 新增的 Cookie 存储需要使用 HttpOnly 之外的安全属性（SameSite、Secure 标记）
- **NFR-3**: 代码改动需向后兼容，不影响 localhost 直连模式的正常使用
- **NFR-4**: 代码应符合现有 TypeScript/ESLint 规范

## Constraints
- **Technical**: React 18 + TypeScript + Vite + Ant Design，技术栈不可更改
- **Business**: 需要兼容 Trae IDE 代理环境和直连 localhost 两种访问模式
- **Dependencies**: 依赖 Vite dev server 的 mock plugin 处理 API 请求

## Assumptions
- Trae IDE 代理层会转发所有请求到本地 Vite 服务器
- 代理层的会话令牌验证是可选的（某些情况下可能跳过）
- Cookie 在代理域中可用（浏览器接受第三方 Cookie）
- 用户有能力在代理域中完成登录并获取有效会话

## Acceptance Criteria

### AC-1: 代理域请求正确处理
- **Given**: 用户通过 Trae IDE 代理域访问 admin-web
- **When**: 请求到达 Vite 开发服务器
- **Then**: 服务器正确识别代理头并处理请求，返回正常响应
- **Verification**: `programmatic`

### AC-2: 登录流程在代理环境下正常工作
- **Given**: 用户在第三方浏览器中通过代理域访问登录页
- **When**: 用户输入凭据并提交登录
- **Then**: 登录成功，Token 正确存储在 localStorage 和 Cookie 中
- **Verification**: `programmatic`

### AC-3: 会话令牌错误优雅处理
- **Given**: 代理层返回 `{"error":"missing session token"}` 错误
- **When**: 前端接收到此错误
- **Then**: 显示登录页面或友好的错误提示，不出现白屏
- **Verification**: `programmatic`

### AC-4: Cookie 与 localStorage 双重存储
- **Given**: 用户成功登录
- **When**: 检查浏览器存储
- **Then**: accessToken 和 refreshToken 同时存在于 localStorage 和 Cookie 中
- **Verification**: `programmatic`

### AC-5: Cookie 读取与请求携带
- **Given**: 已登录用户刷新页面
- **When**: 发送 API 请求
- **Then**: 请求同时携带 Authorization Header 和 Cookie
- **Verification**: `programmatic`

### AC-6: 直连模式不受影响
- **Given**: 用户通过 `localhost:3014` 直连访问
- **When**: 执行登录、数据操作等核心功能
- **Then**: 所有功能正常工作，与修改前行为一致
- **Verification**: `programmatic`

### AC-7: TypeScript 编译和生产构建通过
- **Given**: 修改完成后的代码
- **When**: 运行 TypeScript 类型检查和生产构建
- **Then**: 编译和构建均成功，无错误
- **Verification**: `programmatic`

## Open Questions
- [ ] Trae IDE 代理层是否会转发 Set-Cookie 响应头？
- [ ] 代理层的会话令牌验证机制具体是什么？（Cookie？Header？Query 参数？）
- [ ] 是否需要在 mock API 中模拟代理层的会话验证行为？
