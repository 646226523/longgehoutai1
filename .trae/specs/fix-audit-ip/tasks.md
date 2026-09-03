# 修复审计日志 IP 地址显示不准确 — The Implementation Plan

## [x] Task 1: 新增 getClientIp 函数并替换所有调用点
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 `admin-api/src/middlewares/audit.ts` 中新增 `getClientIp(req: Request): string | undefined` 函数
  - IP 提取优先级:
    1. `X-Forwarded-For` 头 → 取首个非内网 IP（调用 formatIp 递归处理）
    2. `X-Real-IP` / `X-Forwarded-IP`
    3. `CF-Connecting-IP` / `True-Client-IP`
    4. `req.ip`（Express trust proxy 已解析值，作为 fallback）
    5. `req.socket.remoteAddress` 或 `req.connection.remoteAddress`（最终 fallback）
  - 所有来源都要做 try-catch，防止抛异常
  - 替换两处调用：
    - `middlewares/audit.ts` L644: `formatIp(req.ip)` → `formatIp(getClientIp(req))`
    - `routes/auth.ts` L90, L175: 同样替换
  - 需要从 express 导入 `Request` 类型（如果还没导入的话）
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-1.1: 函数存在，签名正确，TypeScript 类型正确
  - `programmatic` TR-1.2: 两处调用点都已替换为 formatIp(getClientIp(req))
  - `human-judgement` TR-1.3: getClientIp 内部每个 IP 头来源都有 try-catch
- **Notes**: formatIp 函数本身已能处理多 IP 链和内网过滤，getClientIp 的职责是把完整头（而不是被 Express 截断的 req.ip）交给它

## [x] Task 2: 为 getClientIp 补充单元测试
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 在 `admin-api/src/middlewares/audit.test.ts` 中新增 describe('getClientIp') 测试块
  - 测试场景覆盖:
    1. X-Forwarded-For 含真实公网 IP 在首位 → 返回真实 IP
    2. X-Forwarded-For 全是内网 → 取第一个
    3. 无 X-Forwarded-For 但有 X-Real-IP → 返回 X-Real-IP 值
    4. 无 X-Forwarded-For 但有 CF-Connecting-IP → 返回 Cloudflare IP
    5. 所有代理头都不存在 → fallback 到 req.ip 或 remoteAddress
    6. IPv6 localhost → 返回 undefined（让 formatIp 再处理）
  - 测试用 `{ headers: {}, ip, socket: { remoteAddress } }` mock 对象模拟 Request
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-2.1: 新增测试至少 6 个 case
  - `programmatic` TR-2.2: 全部通过，无新增失败
- **Notes**: 用简化的 mock 对象即可，不需要完整 mock Request

## [x] Task 3: TypeScript 编译 + 单元测试验证
- **Priority**: medium
- **Depends On**: Task 1, Task 2
- **Description**:
  - 运行后端 TypeScript 编译: `cd admin-api; npx tsc --noEmit`
  - 运行单元测试: `cd admin-api; npx vitest run`
- **Acceptance Criteria Addressed**: AC-5, AC-6
- **Test Requirements**:
  - `programmatic` TR-3.1: TypeScript 编译退出码 0
  - `programmatic` TR-3.2: vitest 全部通过（既有 61 + 新增 ≥ 6 = ≥67 个测试）

## [x] Task 4: 浏览器端到端验收
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3
- **Description**:
  - 触发一个业务操作（如修改用户信息），记录审计日志
  - 查看审计日志详情页 IP 地址字段
  - 同时直接调用后端 API（`curl /api/system/audit-logs`）确认数据库中 ip 字段值
  - 如果是纯 localhost 开发环境，IP 可能还是 localhost（这是正常的，AC-4 已覆盖），但确认不会再丢失
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `human-judgement` TR-4.1: 审计日志详情页 IP 地址字段显示非空值（不是 "undefined"/"null"/空白）
  - `programmatic` TR-4.2: 后端数据库中 audit_logs 最新记录的 ip 字段有值
- **Notes**: 需要重启后端服务器让代码生效


