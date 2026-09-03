# 审计日志 IP 地址溯源修复 — Product Requirement Document

## Overview
- **Summary**: 修复 Vite 开发环境下，通过 Vite proxy 转发的请求中审计日志 IP 地址显示为 `localhost`（而非操作员真实公网 IP 如 `119.126.114.228`）的问题，确保所有新生成的审计日志记录中 `ip` 字段准确反映操作员登录来源 IP，满足溯源审计要求。
- **Purpose**: 审计日志是安全审计和操作溯源的核心基础设施。IP 地址缺失或错误直接导致溯源能力丧失，必须修复。
- **Target Users**: 后台超级管理员、运维人员、安全审计人员

## Goals
- 所有新生成的审计日志记录（含登录、登出、CRUD 业务操作）中的 `ip` 字段必须存储操作员的真实公网 IP
- 开发环境（Vite proxy localhost → 后端 localhost）链路下 IP 能正确透传
- 生产环境（Nginx/CDN → 后端）链路下 IP 能正确透传（已有 trust proxy + getClientIp 覆盖）
- 前端浏览器端审计日志详情抽屉 IP 地址显示正确（当前依赖后端返回的 ip 字段）

## Non-Goals (Out of Scope)
- 修复已有的历史审计日志（id ≤ N）中错误的 localhost 记录 —— 只保证新记录正确
- 生产环境真实代理配置 —— 假设已正确配置 X-Forwarded-For
- 匿名访问 IP 记录 —— 只记录需要登录的管理员操作

## Background & Context

### 已确认事实
1. 后端 `getClientIp` + `formatIp` 函数逻辑完全正确 —— 直连后端并带正确 IP 头时，审计日志 ip 字段记录为真实公网 IP ✅
2. Vite proxy 在转发请求时**丢失了自定义头 `X-Client-Public-IP`**，导致后端无从得知浏览器公网 IP ❌
3. Vite proxy 配置了 `xfwd: true`，http-proxy-middleware 会自动注入 X-Forwarded-For，但其值是 Vite proxy 的 `socket.remoteAddress`（localhost 的 IPv6 `::1`），formatIp 将其转为 `"localhost"`
4. 前端 `request.ts` 中 `fetchPublicIp()` 已能正确获取浏览器公网 IP（通过 api.ipify.org / ipapi.co / ifconfig.me）

### 根因链路
```
浏览器 → (fetchPublicIp 获取公网 IP) → axios 设置 X-Client-Public-IP 头
  → Vite proxy (localhost:3014)
    → http-proxy-middleware 转发时丢失 X-Client-Public-IP ❌
    → Vite proxy 注入 X-Forwarded-For: ::1 (socket.remoteAddress)
      → Express 后端 (localhost:3015)
        → getClientIp: X-Forwarded-For = "::1" → 全内网分支
        → 尝试 X-Client-Public-IP: undefined ❌
        → req.ip / socket.remoteAddress = "::1"
          → formatIp("::1") = "localhost"
            → 审计日志 ip = "localhost" ❌
```

### 已有的正确代码（不需要修改）
- `admin-api/src/middlewares/audit.ts` 的 `getClientIp` / `formatIp` / `auditMiddleware` / `recordAuditLog` 逻辑完全正确
- `admin-api/src/routes/auth.ts` 的登录/登出审计日志记录逻辑完全正确
- `admin-api/src/index.ts` 的 `app.set('trust proxy', true)` 已正确配置
- `admin-web/src/services/request.ts` 的 `fetchPublicIp` 函数完全正确

## Functional Requirements
- **FR-1**: 前端浏览器请求必须将公网 IP 通过 Vite proxy 可正确转发的标准头传递给后端
- **FR-2**: 后端 getClientIp 必须能从经 Vite proxy 转发的请求头链中正确提取浏览器公网 IP
- **FR-3**: 所有审计日志路径（登录、登出、CRUD 业务操作）的 ip 字段必须使用统一的 IP 提取逻辑
- **FR-4**: 前端审计日志详情抽屉中 IP 地址必须以正确格式展示（如 `119.126.114.228`）

## Non-Functional Requirements
- **NFR-1**: IP 提取必须有完整的 try-catch 异常处理，不能因 IP 解析错误导致请求崩溃
- **NFR-2**: 前端公网 IP 获取失败时应有优雅降级（审计日志 ip 字段可接受为 localhost，但应有日志告警）
- **NFR-3**: 单元测试覆盖所有新逻辑分支

## Constraints
- **Technical**: Vite 5 + http-proxy-middleware，无法修改 http-proxy-middleware 内部行为
- **Business**: 必须修复，影响安全合规
- **Dependencies**: 公网 IP 获取依赖第三方 API（api.ipify.org 等）

## Assumptions
- 浏览器有外网访问能力（能调用 api.ipify.org）
- Vite proxy 的 xfwd:true 会正确处理已有的 X-Forwarded-For 头（追加而非覆盖）
- mockApiPlugin 的 catch-all 中 skip 路径的 startsWith 判断基于 connect 剥离前缀后的 req.url

## Acceptance Criteria

### AC-1: 前端通过标准头传递公网 IP
- **Given**: 浏览器访问管理后台，fetchPublicIp 成功获取到公网 IP
- **When**: 前端发出的任何 API 请求经过 Vite proxy
- **Then**: 后端能从 X-Forwarded-For 头链或 X-Client-Public-IP 头中读取到浏览器的真实公网 IP
- **Verification**: `programmatic` —— 通过 Vite proxy 发请求带 X-Forwarded-For，后端审计日志 ip 字段为真实 IP

### AC-2: 登录审计记录正确 IP
- **Given**: 管理员通过浏览器登录管理后台
- **When**: 登录成功
- **Then**: audit_logs 表中新记录的 ip 字段值为管理员的公网 IP（如 `119.126.114.228`），而非 `localhost`
- **Verification**: `programmatic` —— 直接查询 audit_logs 表最新记录的 ip 字段

### AC-3: 业务操作审计记录正确 IP
- **Given**: 管理员通过浏览器执行写操作（如修改用户信息）
- **When**: 操作成功
- **Then**: audit_logs 表中新记录的 ip 字段值为管理员的公网 IP
- **Verification**: `programmatic` —— 执行修改用户操作后查询 audit_logs

### AC-4: 浏览器审计日志详情显示正确 IP
- **Given**: 管理后台审计日志页面有新生成的审计记录
- **When**: 打开该记录的详情抽屉
- **Then**: IP 地址字段显示该记录的正确公网 IP（非 localhost）
- **Verification**: `human-judgment` —— 人工验收浏览器 UI 展示

### AC-5: 单元测试通过
- **Given**: audit.test.ts 和相关测试文件
- **When**: 运行 `npm run test`
- **Then**: 所有测试用例通过，零失败
- **Verification**: `programmatic`

### AC-6: TypeScript 编译无错误
- **Given**: admin-api 和 admin-web 的源代码
- **When**: 分别运行 `npx tsc --noEmit`
- **Then**: 零编译错误
- **Verification**: `programmatic`

## Open Questions
- [ ] http-proxy-middleware 为什么会丢失自定义头？需要进一步验证，但不影响修复方案实施
- [ ] mockApiPlugin 的 catch-all 路径 bug 是否需要一并修复？（当前 skip 路径剥离前缀后的判断是正确的，但可能有遗漏的路径）
