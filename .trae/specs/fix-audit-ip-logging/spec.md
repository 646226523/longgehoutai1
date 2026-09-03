# 修复审计日志不记录操作员真实登录 IP - Product Requirement Document

## Overview

- **Summary**: 当前审计日志中操作人 IP 地址字段记录为 "localhost" 而非真实公网 IP（如 119.126.114.228），导致溯源记录丢失。根因是前端 `fetchPublicIp` 在浏览器端通过 CORS 跨域请求公网 IP 查询服务不可靠（CORS 预检失败、网络超时、时序问题等），导致登录等早期请求无法携带 `X-Forwarded-For` 头，后端只能 fallback 到 Vite proxy 的 `socket.remoteAddress`（即 localhost）。

- **Purpose**: 确保所有审计日志记录（登录、登出、业务操作）中 `ip` 字段准确记录操作员客户端的真实公网 IP，满足安全溯源需求。

- **Target Users**: 后台管理员、安全审计人员。

## Goals

- 所有审计日志（auth/login, auth/logout, 所有业务写操作）的 `ip` 字段必须记录真实公网 IP

- 优先从 `X-Forwarded-For` 头提取首个公网 IP，fallback 到 `X-Client-Public-IP`，最终 fallback 到 Express 的 `req.ip`/`socket.remoteAddress`

- 后端新增 `/api/__public-ip` 端点，Node.js 端查询 ifconfig.me 获取公网 IP 并缓存，前端通过自身后端代理获取，彻底绕过浏览器 CORS 问题

- 保持现有 `getClientIp`、`formatIp`、`recordAuditLog` 逻辑不变（已验证正确）

## Non-Goals (Out of Scope)

- 不改动审计日志表结构（已含 ip 字段）

- 不改动现有 Vite proxy 配置（xfwd:true 保留）

- 不改动现有 getClientIp/formatIp 函数（已通过单元测试和 API 验证）

- 不处理生产环境 Nginx/CDN 代理场景（生产环境应直接由 Nginx 注入 X-Forwarded-For）

## Background & Context

- **已验证正确的链路**：通过 Node.js 模拟带 `X-Forwarded-For: 119.126.114.228, ::1` 的请求直连后端 → `getClientIp` 正确返回 `119.126.114.228` → 审计日志记录正确 IP

- **已验证正确的 Vite proxy 行为**：http-proxy 的 `xfwd:true` 会在前端已设置的 `X-Forwarded-For` 后追加 `, socket.remoteAddress`，最终后端收到完整链

- **Node.js 环境 IP 查询源验证**：ifconfig.me/ip、myip.ipip.net、api.ip.sb/geoip 均可用，ifconfig.me 返回 CORS 头 `ACAO: *`

- **失败场景**：浏览器端 fetchPublicIp → 可能因 CORS 预检、网络超时、请求时序等原因失败 → 登录请求不带 IP 头 → 审计日志记录 localhost

- **现有前端 fetchPublicIp 代码**：admin-web/src/services/request.ts 第 36-120 行，模块加载时立即启动异步获取，实现 4 级时序处理（内存缓存 → localStorage 缓存 → 等待 Promise → 启动获取）

## Functional Requirements

- **FR-1**: 后端提供 `GET /api/__public-ip` 端点，通过 Node.js HTTPS 查询 ifconfig.me/ip 返回客户端机器的公网 IP

- **FR-2**: `/api/__public-ip` 端点需实现内存缓存（5 分钟有效期），避免频繁查询外部服务

- **FR-3**: `/api/__public-ip` 端点不应需要 auth 中间件，允许未登录状态访问

- **FR-4**: 前端 `fetchPublicIp()` 函数优先请求 `/api/__public-ip` 端点获取公网 IP，不再直接请求外部 IP 查询服务

- **FR-5**: 前端请求拦截器在所有请求（包括登录请求）中注入 `X-Forwarded-For` 和 `X-Client-Public-IP` 头

- **FR-6**: 后端 `getClientIp(req)` 函数在 `X-Forwarded-For` 链中无公网 IP 时，应 fallback 到 `X-Client-Public-IP` 头

## Non-Functional Requirements

- **NFR-1**: 后端 `/api/__public-ip` 端点响应时间 < 3s（不含缓存命中场景）

- **NFR-2**: 缓存命中时响应时间 < 50ms

- **NFR-3**: fetchPublicIp 失败不应阻塞任何业务请求（请求拦截器 catch 中 return config）

- **NFR-4**: 所有异常路径需 try-catch 保护，防止 IP 获取失败导致请求崩溃

## Constraints

- **Technical**: 后端使用 Express + TypeScript + better-sqlite3；前端使用 React + Vite + Axios

- **Dependencies**: 后端依赖外部 IP 查询服务 ifconfig.me；开发环境依赖 Vite proxy (localhost:3014 → localhost:3015)

- **Business**: 不能改动现有 API 接口和路由结构，不能影响生产环境现有功能

## Assumptions

- 开发环境下，后端 Node.js 进程所在机器与浏览器客户端共享同一公网出口 IP，因此后端查询到的公网 IP 即为浏览器的公网 IP

- ifconfig.me/ip 服务稳定可用；若不可用则前端会 fallback 到 localStorage 缓存或跳过 IP 头注入（降级行为）

- 真实生产环境部署时有 Nginx/CDN 层正确注入 X-Forwarded-For 头，此方案主要解决开发环境溯源问题

## Acceptance Criteria

### AC-1: 后端 /api/\_\_public-ip 端点返回正确公网 IP

- **Given**: 后端服务运行中，网络可访问 ifconfig.me

- **When**: 发送 GET /api/\_\_public-ip 请求

- **Then**: 返回 { code: 0, data: "119.126.114.228" } 格式的响应，IP 符合 IPv4 格式

- **Verification**: `programmatic`

### AC-2: 缓存命中时 /api/\_\_public-ip 快速响应

- **Given**: 5 分钟内已查询过一次 /api/\_\_public-ip

- **When**: 再次发送 GET /api/\_\_public-ip

- **Then**: 响应时间 < 50ms，返回的 IP 与上次一致

- **Verification**: `programmatic`

### AC-3: 浏览器端登录审计日志 IP 字段为真实公网 IP

- **Given**: 前端通过 Vite proxy 运行，fetchPublicIp 成功

- **When**: 浏览器中执行管理员登录操作

- **Then**: audit\_logs 表最新登录记录的 ip 字段值 = 浏览器公网 IP（如 119.126.114.228），而非 localhost

- **Verification**: `programmatic`

### AC-4: 业务操作审计日志 IP 与登录 IP 一致

- **Given**: 用户已登录且 fetchPublicIp 已完成

- **When**: 执行任意业务写操作（创建/修改/删除）

- **Then**: 该操作的审计日志记录 ip 字段值 = 登录时记录的 ip 值

- **Verification**: `programmatic`

### AC-5: fetchPublicIp 失败不影响业务请求

- **Given**: 模拟 ifconfig.me 不可用场景

- **When**: 前端发请求

- **Then**: 请求正常发送（不带 IP 头），业务功能不受影响；后端审计日志降级记录 localhost；控制台输出 warn 日志

- **Verification**: `programmatic`

### AC-6: TypeScript 编译零错误

- **Given**: 所有修改完成

- **When**: 执行 npx tsc --noEmit（后端）和 npx tsc --noEmit（前端）

- **Then**: 零类型错误

- **Verification**: `programmatic`

## Open Questions

- 无（根因已定位，修复方案明确）

