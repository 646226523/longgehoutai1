# 修复 Vite Proxy 丢失客户端 IP - 产品需求文档

## Overview

- **Summary**: 浏览器通过 Vite dev server (localhost:3014) 代理请求后端 API (localhost:3015) 时，Vite proxy 默认不注入 `X-Forwarded-For` 头，导致 Express 后端无法获取浏览器真实公网 IP，审计日志中所有记录的 `ip` 字段都被写成 `localhost`。本修复在 Vite proxy 配置中添加 `xfwd: true`，让 http-proxy 自动注入客户端 IP。

- **Purpose**: 恢复审计日志 IP 地址的准确溯源能力，保障操作安全审计。

- **Target Users**: 后台管理员（操作审计追踪）、安全团队（异常行为排查）。

## Goals

- 所有新生成的审计日志记录中 `ip` 字段必须是浏览器客户端的真实公网 IP，而非 `localhost`

- 修复仅限开发环境（dev server），不影响生产部署路径（生产有 Nginx/Caddy 等反代）

- 修复后重启 Vite dev server 即可生效，无需改后端代码

## Non-Goals (Out of Scope)

- 不修改 Express trust proxy 配置（已正确设置）

- 不修改后端 getClientIp / formatIp 函数（逻辑正确）

- 不清理历史已写入的 localhost 记录

- 不增加 Vite proxy 之外的额外中间件

## Background & Context

### 当前 IP 提取链路（断裂）

```
浏览器 119.126.114.228
  → Vite dev server (0.0.0.0:3014)
    → Vite proxy 默认 xfwd=false ❌ 不注入 X-Forwarded-For
      → Express trust proxy=true
        → 无 X-Forwarded-For 头
          → socket.remoteAddress = ::1 (IPv6 localhost)
            → getClientIp → "localhost"
              → 写入 audit_logs.ip = "localhost"
```

### 期望的 IP 提取链路（修复后）

```
浏览器 119.126.114.228
  → Vite dev server (0.0.0.0:3014)
    → Vite proxy xfwd=true ✅ http-proxy 注入 X-Forwarded-For: 119.126.114.228
      → Express trust proxy=true
        → X-Forwarded-For 链: "119.126.114.228"
          → getClientIp 取链首 → "119.126.114.228"
            → 写入 audit_logs.ip = "119.126.114.228"
```

### 技术事实

- Vite proxy 底层使用 `http-proxy` 库

- http-proxy 的 `xfwd` 选项（默认为 false）控制是否设置/追加 `X-Forwarded-*` 头

- 开启 `xfwd: true` 后，http-proxy 会把浏览器的 `req.socket.remoteAddress` 追加到 `X-Forwarded-For`

- Vite dev server 监听 `0.0.0.0`，所以无论本机还是远程访问，Vite 的 socket.remoteAddress 都是浏览器的真实 IP

## Functional Requirements

- **FR-1**: Vite proxy `/api` 路径必须开启 `xfwd: true`，让 http-proxy 自动注入 `X-Forwarded-For`、`X-Forwarded-Proto`、`X-Forwarded-Host`

- **FR-2**: 修复后浏览器发起的 API 请求，后端 `getClientIp(req)` 必须能正确提取浏览器真实 IP

- **FR-3**: 审计日志新记录的 `ip` 字段必须与浏览器网络层 IP 一致

## Non-Functional Requirements

- **NFR-1**: 修改范围仅限 `vite.config.ts`，一行代码改动，零后端/前端业务代码变更

- **NFR-2**: 修复不影响 mockApiPlugin（两者独立运行）

- **NFR-3**: 重启 Vite dev server 即可生效，无需数据库迁移

## Constraints

- **Technical**: Vite v5 proxy 基于 http-proxy，`xfwd` 选项必须在 `proxy` 配置对象内设置

- **Business**: 不能影响已有功能，改动必须可逆向（可随时还原）

- **Dependencies**: 依赖后端已有的 `trust proxy=true` 和 `getClientIp` 逻辑

## Assumptions

- 假设 1: Vite dev server 监听 0.0.0.0，能从 socket.remoteAddress 获取浏览器真实 IP

- 假设 2: 生产环境有 Nginx/Caddy 反代层，不受此修复影响

- 假设 3: Express trust proxy=true 已正确识别 http-proxy 注入的 IP 链

## Acceptance Criteria

### AC-1: Vite proxy 配置 xfwd: true

- **Given**: vite.config.ts 存在 proxy 配置

- **When**: 检查 `/api` proxy 项

- **Then**: 必须包含 `xfwd: true` 选项

- **Verification**: `programmatic`

### AC-2: 后端收到 X-Forwarded-For 头

- **Given**: Vite dev server 运行中（修复后重启）

- **When**: 浏览器发起 `/api/system/audit-logs` 请求

- **Then**: Express 后端 `req.headers['x-forwarded-for']` 必须包含浏览器真实 IP

- **Verification**: `programmatic`

### AC-3: 审计日志 IP 字段正确记录

- **Given**: 管理员在浏览器端执行任何需要写审计日志的操作（如修改用户、登录）

- **When**: 检查新生成的 audit\_logs 记录

- **Then**: `ip` 字段必须是浏览器客户端的真实公网 IP（如 `119.126.114.228`），不得为 `localhost`

- **Verification**: `programmatic`

### AC-4: 浏览器端详情抽屉 IP 显示正确

- **Given**: 审计日志中存在真实 IP 的新记录

- **When**: 前端打开审计日志详情抽屉

- **Then**: IP 地址行显示真实公网 IP，不再是 localhost

- **Verification**: `human-judgment`

- **Notes**: 通过浏览器截图验证

## Open Questions

- [ ] 历史已写入 localhost 的审计记录是否需要回填？（本次不做，用户未要求）

