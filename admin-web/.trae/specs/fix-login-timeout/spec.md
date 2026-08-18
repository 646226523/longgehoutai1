# 修复登录超时与控制台报错 - Product Requirement Document

## Overview
- **Summary**: 修复赛鸽基因后台管理系统在后端服务未运行时的登录超时问题和控制台 `net::ERR_ABORTED` 错误。通过启用已有的 Mock 服务器、增加网络级错误处理、优化认证流程，确保前端在独立运行时也能正常登录和操作。
- **Purpose**: 当前端开发服务器（端口 3014）运行但后端服务（端口 3015）未启动时，所有 API 请求均超时 15 秒后失败，导致用户无法登录、控制台大量报错。这严重影响开发体验和独立演示能力。
- **Target Users**: 前端开发者、测试人员、产品演示人员

## Goals
- [ ] 启用 Mock 服务器，使前端无需后端也能完成登录和基本操作
- [ ] 修复 `ERR_ABORTED` 控制台报错，改为友好的用户提示
- [ ] 区分网络错误与业务错误，提供针对性的错误提示
- [ ] 优化认证守卫逻辑，避免因网络抖动导致用户被踢出

## Non-Goals (Out of Scope)
- 修改后端 API 实现
- 修改登录页面 UI/UX 设计
- 添加新的 Mock 数据（现有 Mock 已覆盖核心需求）
- 修改生产环境配置

## Background & Context
- 项目已有完整的 Vite Mock 插件（`server/mock.ts`），包含登录、用户信息、刷新 Token 等认证接口的 Mock 实现
- `vite.config.ts` 中 Mock 插件被注释：`// mockApiPlugin(),`
- 当前 proxy 配置将 `/api` 请求转发到 `http://127.0.0.1:3015`
- axios 超时设置为 15000ms（15 秒）
- 响应拦截器仅处理 HTTP 状态码（401/403），未处理 `ERR_ABORTED`、`ECONNREFUSED` 等网络错误

## Functional Requirements

- **FR-1**: 当 Mock 模式启用时，前端应能独立完成登录流程（admin/admin123）
- **FR-2**: 当后端不可达时，登录页应在合理时间内（≤3秒）给出错误提示，而非等待 15 秒超时
- **FR-3**: 控制台不应出现未捕获的 `net::ERR_ABORTED` 错误
- **FR-4**: 网络错误时显示"后端服务未启动"等友好提示，区分于"用户名密码错误"
- **FR-5**: `RequireAuth` 守卫在网络错误时不应立即清除 token，应保留 token 并给出重试选项
- **FR-6**: 已登录用户在后端短暂不可达时，不应被强制退出登录

## Non-Functional Requirements

- **NFR-1**: 生产环境不受影响（Mock 仅在开发模式启用）
- **NFR-2**: TypeScript 类型检查通过
- **NFR-3**: 错误提示响应时间 ≤ 3 秒（快速失败）

## Constraints
- **Technical**: 必须使用现有的 Vite Mock 插件机制，不引入新依赖
- **Business**: admin/admin123 为固定测试账号
- **Dependencies**: 现有 `server/mock.ts` 中 Mock 实现、`vite.config.ts` 配置、`services/request.ts` axios 拦截器

## Assumptions
- Mock 插件的认证实现（login/profile/refresh）已完整可用
- 用户理解开发模式与生产模式的区别
- 快速失败（降低超时时间）在网络可达但响应慢的场景下可接受

## Acceptance Criteria

### AC-1: Mock 模式登录成功
- **Given**: 前端开发服务器运行且后端未启动
- **When**: 用户使用 admin/admin123 登录
- **Then**: 登录成功，跳转到首页，控制台无 `ERR_ABORTED` 错误
- **Verification**: `programmatic`

### AC-2: 网络错误友好提示
- **Given**: 后端服务完全不可达（Mock 也未启用）
- **When**: 用户尝试登录
- **Then**: 登录页在 3 秒内显示"后端服务连接失败，请检查后端服务是否启动"提示，不显示"timeout of 15000ms exceeded"
- **Verification**: `programmatic`

### AC-3: 控制台错误消除
- **Given**: 任意场景
- **When**: 查看浏览器控制台
- **Then**: 不出现未处理的 `net::ERR_ABORTED` 或 `ECONNREFUSED` 错误
- **Verification**: `human-judgment`

### AC-4: Token 保留策略
- **Given**: 用户已登录且 token 有效
- **When**: 后端临时不可达，`getCurrentUser()` 请求失败
- **Then**: 保留 token 不清除，显示加载错误状态，提供重试能力
- **Verification**: `programmatic`

### AC-5: Mock 与真实后端可切换
- **Given**: 开发环境
- **When**: 在 `vite.config.ts` 中切换 Mock 开关
- **Then**: 可分别使用 Mock 模式或真实后端模式
- **Verification**: `programmatic`

## Open Questions
- [ ] 是否需要在 UI 上添加 Mock 模式指示器（如开发环境标签）？
- [ ] 超时时间降低到多少合适（当前 15 秒）？建议开发模式降至 3-5 秒
