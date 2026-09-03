# 修复审计日志 IP 地址显示不准确 — Product Requirement Document

## Overview

- **Summary**: 审计日志详情中 IP 地址字段显示为 `localhost` 而非客户端真实公网 IP（如 `119.126.114.228`）。当前代码通过 `formatIp(req.ip)` 获取 IP，但 Express `trust proxy=true` 的默认行为导致 `req.ip` 取的是代理链最末端 IP 而非客户端真实 IP。

- **Purpose**: 修复后审计日志（含登录/登出/所有业务操作）应记录发起请求的客户端真实 IP。

- **Target Users**: 后台管理员、运维人员（审计日志的主要使用者）

## Goals

- 审计日志中 IP 地址正确显示客户端真实公网 IP

- 兼容多种代理层场景：Nginx 反向代理、Cloudflare CDN、Vite dev server 代理

- 开发环境下至少显示 Vite 的 IP 而非 `localhost`

## Non-Goals (Out of Scope)

- 不修改数据库表结构（已有 ip 字段）

- 不修改前端 IP 字段的展示逻辑（只是展示 audit\_logs.ip 的值）

- 不实现 IP 地理位置解析

## Background & Context

- **根因**: Express `app.set('trust proxy', true)` 的默认行为——`req.ip` 返回 X-Forwarded-For 链中**最后一个**（最近的代理）IP，而非**第一个**（最早的客户端）IP。

  - 实际链路：浏览器（119.126.114.228）→ Nginx/CDN → Vite dev server → Express

  - X-Forwarded-For: `119.126.114.228, 10.0.0.1, ::1`

  - Express `trust proxy=true` → `req.ips = ['119.126.114.228', '10.0.0.1', '::1']` → `req.ip = '::1'`

  - `formatIp('::1')` → `'localhost'`

- **formatIp 本身没问题**: 它能正确处理多 IP 链的提取，但输入源只传了 `req.ip`（已被 Express 解析为末端 IP），丢失了完整链。

- **当前 IP 记录位置**:

  - `middlewares/audit.ts` L644: `ip: formatIp(req.ip)`（所有业务操作审计）

  - `routes/auth.ts` L90, L175: `ip: formatIp(req.ip)`（登录/登出审计）

## Functional Requirements

- **FR-1**: 新增 `getClientIp(req)` 函数，从完整的 `X-Forwarded-For` 头中提取**首个非内网** IP 作为客户端真实 IP

- **FR-2**: 同时兼容其他常见代理头（`X-Real-IP`、`CF-Connecting-IP`、`True-Client-IP`）作为降级方案

- **FR-3**: 替换 `middlewares/audit.ts` 和 `routes/auth.ts` 中所有 `formatIp(req.ip)` 调用为 `formatIp(getClientIp(req))`

- **FR-4**: 保留 `trust proxy=true`（不破坏 req.protocol 等其他依赖）

## Non-Functional Requirements

- **NFR-1**: TypeScript 编译通过

- **NFR-2**: 所有既有单元测试通过，新增 getClientIp 的单元测试

- **NFR-3**: 新函数需有 try-catch 异常处理

## Constraints

- **Technical**: 兼容 Node.js + Express；不引入新依赖

- **Dependencies**: formatIp 函数（已存在且稳定），unit test 框架 vitest

## Assumptions

- 生产环境会有一层或多层反向代理（Nginx/CDN）正确传递 X-Forwarded-For

- 开发环境（纯 localhost 访问）显示 localhost/::1 是正常的

## Acceptance Criteria

### AC-1: 有代理链时显示真实公网 IP

- **Given**: X-Forwarded-For 头为 `"119.126.114.228, 10.0.0.1, ::1"`

- **When**: 后端收到请求，记录审计日志

- **Then**: audit\_logs.ip 字段值为 `"119.126.114.228"`

- **Verification**: `programmatic`（单元测试 + API 集成测试）

### AC-2: 单代理时正确提取

- **Given**: X-Forwarded-For 头为 `"203.0.113.42"`

- **When**: 后端收到请求

- **Then**: audit\_logs.ip 字段值为 `"203.0.113.42"`

- **Verification**: `programmatic`

### AC-3: 其他代理头降级

- **Given**: 没有 X-Forwarded-For，但有 `X-Real-IP: 119.126.114.228`

- **When**: 后端收到请求

- **Then**: audit\_logs.ip 字段值为 `"119.126.114.228"`

- **Verification**: `programmatic`

### AC-4: 开发环境 fallback

- **Given**: 所有代理头都不存在（纯 localhost）

- **When**: 后端收到请求

- **Then**: audit\_logs.ip 显示合理 fallback（`req.ip` 或 `req.socket.remoteAddress` 格式化后）

- **Verification**: `programmatic`

### AC-5: 所有既有单元测试通过

- **Given**: 修改完成后

- **When**: 运行 `npx vitest run`

- **Then**: 61 个既有测试 + 新增测试全部通过

- **Verification**: `programmatic`

### AC-6: TypeScript 编译通过

- **Given**: 修改完成后

- **When**: 运行 `npx tsc --noEmit`

- **Then**: 退出码为 0

- **Verification**: `programmatic`

### AC-7: 端到端验证

- **Given**: 通过浏览器触发一个写操作（如修改用户信息）

- **When**: 查看审计日志详情

- **Then**: IP 地址字段显示非 localhost 的值（生产/代理环境）或合理 fallback（纯开发环境）

- **Verification**: `human-judgment`

## Open Questions

- [ ] 开发环境 Vite→Express 只有 localhost 一跳，浏览器真实 IP 无法自动传递。是否需要在 Vite proxy 中手动设置 X-Forwarded-For？→ 不需要——浏览器不会告诉服务器自己的真实 IP，这是正常的 HTTP 行为。真实 IP 只能通过代理层（Nginx/CDN/隧道工具）传递。开发环境显示 localhost 是可以接受的。

