# 审计日志 IP 地址溯源修复（浏览器端）- 产品需求文档

## Overview
- **Summary**: 修复后台管理系统操作日志中 IP 地址显示为 localhost 的问题。根因是浏览器端 fetchPublicIp 函数使用的公网 IP 查询源（api.ipify.org、ipapi.co）在国内网络环境下被墙/Cloudflare 拦截，导致无法获取真实公网 IP；同时请求拦截器在 fetchPublicIp 完成前发起的请求不会携带 X-Forwarded-For 头。
- **Purpose**: 确保每一条审计日志都正确记录操作员的真实登录 IP 地址，为溯源审计提供完整的数据支撑。
- **Target Users**: 后台管理员、系统运维人员

## Goals
- 浏览器端每次发起 API 请求时自动携带正确的 X-Forwarded-For 头（值为操作员真实公网 IP）
- 后端审计日志 ip 字段正确记录真实公网 IP，不再显示 localhost
- 审计日志页面详情抽屉中 IP 地址字段显示正确值
- 修复不影响现有功能（登录、业务操作、审计日志展示等）

## Non-Goals (Out of Scope)
- 不修改后端 getClientIp / formatIp 函数（已验证正确）
- 不修改 Vite proxy 配置（已验证正确）
- 不处理生产环境真实代理场景（生产环境 Nginx/CDN 会自动传递 X-Forwarded-For）
- 不新增 IP 地理位置解析功能

## Background & Context
### 已验证事实
- 后端 getClientIp 函数 ✅ 正常：直连后端 + X-Forwarded-For 头 → ip 正确记录为 119.126.114.228
- Vite proxy xfwd: true 配置 ✅ 正常：通过 Vite proxy 转发 X-Forwarded-For 头 → 后端正确接收
- 问题仅在浏览器端：Node.js 脚本模拟浏览器带头请求 → ip 正确；浏览器实际请求 → ip=localhost

### 诊断测试结果（国内网络环境）
| IP 查询源 | 状态 | 说明 |
|---|---|---|
| https://api.ipify.org?format=json | ❌ ECONNRESET | 被墙 |
| https://ipapi.co/json/ | ❌ 403 Cloudflare | 被拦截 |
| https://ifconfig.me/ip | ✅ 200 | 返回 119.126.114.228 |
| https://myip.ipip.net | ✅ 200 | 国内源，返回格式含中文 |
| https://ip.sb/api/ | ❌ 返回 HTML | API 格式不符 |
| https://ip.seeip.org/jsonip | ❌ TIMEOUT | 超时 |

### 当前 fetchPublicIp 实现
```typescript
const sources = [
  () => axios.get('https://api.ipify.org?format=json', ...),  // ❌ 被墙
  () => axios.get('https://ipapi.co/json/', ...),             // ❌ Cloudflare
  () => axios.get('https://ifconfig.me/ip', ...),             // ✅ 能工作但排在第三位
];
```

## Functional Requirements
- **FR-1**: fetchPublicIp 必须使用国内网络环境下可用的公网 IP 查询源，确保成功率 ≥ 95%
- **FR-2**: 所有通过 axios 发起的 API 请求必须等待 fetchPublicIp 完成后再携带 X-Forwarded-For 头（消除时序问题）
- **FR-3**: fetchPublicIp 必须有清晰的 debug 日志（成功/失败原因/耗时），便于排查
- **FR-4**: 当所有公网 IP 查询源都失败时，系统降级为 localhost 但不崩溃，控制台输出警告日志
- **FR-5**: 后端临时调试端点 /api/_debug/ip 和 IP 头调试日志在修复完成后清理

## Non-Functional Requirements
- **NFR-1**: fetchPublicIp 超时时间 ≤ 3 秒/源，总耗时 ≤ 10 秒
- **NFR-2**: 请求拦截器等待 fetchPublicIp 的时间 ≤ 200ms（通过 Promise 链式复用实现，不重复请求）
- **NFR-3**: 代码变更不引入新的 TypeScript 编译错误
- **NFR-4**: 单元测试覆盖 fetchPublicIp 和请求拦截器 IP 注入逻辑

## Constraints
- **Technical**: 必须兼容现有 axios 拦截器架构，不引入新的 HTTP 库
- **Business**: 修复必须在生产部署前完成，确保审计数据完整性
- **Dependencies**: 依赖 ifconfig.me 和 myip.ipip.net 外部服务可用性

## Assumptions
- 国内网络环境下 ifconfig.me 和 myip.ipip.net 可用
- 现有 Vite proxy xfwd: true 配置正确保留 X-Forwarded-For 头
- 后端 getClientIp / formatIp 函数无需修改

## Acceptance Criteria

### AC-1: 浏览器端 fetchPublicIp 成功获取公网 IP
- **Given**: 用户在国内网络环境下打开管理后台
- **When**: 前端应用加载完成
- **Then**: 浏览器控制台输出 `[HTTP] 检测到浏览器公网 IP: 119.126.114.228`
- **Verification**: `programmatic`

### AC-2: 登录操作审计日志 IP 正确
- **Given**: 前端应用已成功获取公网 IP
- **When**: 用户登录
- **Then**: audit_logs 新记录中 ip 字段值为 `119.126.114.228`（与真实公网 IP 一致）
- **Verification**: `programmatic`

### AC-3: 业务写操作审计日志 IP 正确
- **Given**: 用户已登录，前端已获取公网 IP
- **When**: 用户执行业务写操作（如新增用户、修改角色等）
- **Then**: audit_logs 新记录中 ip 字段值与登录 IP 一致
- **Verification**: `programmatic`

### AC-4: 审计日志页面 IP 显示正确
- **Given**: 数据库中审计记录 ip=119.126.114.228
- **When**: 用户在审计日志页面查看该记录详情
- **Then**: 详情抽屉中 IP 地址字段显示 `119.126.114.228`，有一键复制功能
- **Verification**: `human-judgment`

### AC-5: 降级场景不崩溃
- **Given**: 所有公网 IP 查询源都不可用
- **When**: 用户打开管理后台并发起请求
- **Then**: 请求正常完成，audit_logs ip 字段降级为 localhost，控制台输出 `[HTTP] 无法获取浏览器公网 IP` 警告
- **Verification**: `programmatic`

### AC-6: 临时调试端点已清理
- **Given**: 修复完成并通过所有验收
- **When**: 检查后端代码
- **Then**: admin-api/src/index.ts 中 `/api/_debug/ip` 端点和 IP 头调试日志已删除
- **Verification**: `programmatic`

## Open Questions
- [ ] ifconfig.me 在浏览器中 HTTPS 协议是否可用？（Node.js 测试成功，但浏览器 mixed content 限制不同）
- [ ] 是否需要添加 localStorage 缓存上一次成功的公网 IP 作为 fallback？
