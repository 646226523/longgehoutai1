# 审计日志 IP 地址溯源修复 — The Implementation Plan

## [x] Task 1: 前端 request.ts 修改 —— 使用标准 X-Forwarded-For 头传递公网 IP
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 修改 `admin-web/src/services/request.ts` 的请求拦截器
  - 当前代码在 cachedPublicIp 存在时只设置 `X-Client-Public-IP` 自定义头
  - 修改为：同时设置 `X-Forwarded-For` 头值为 cachedPublicIp
  - 保留 `X-Client-Public-IP` 头作为备用（某些场景可能直接生效）
  - Vite proxy 配置了 `xfwd: true`，http-proxy-middleware 会**追加** Vite proxy 自身的 socket.remoteAddress 到已有的 X-Forwarded-For 链末尾，而非覆盖。因此后端收到的 X-Forwarded-For 将是 `119.126.114.228, ::1`，getClientIp 从中提取首个公网 IP
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: 通过 `curl -H "X-Forwarded-For: 1.2.3.4" http://localhost:3014/api/auth/login` 发请求，审计日志 ip 字段应为 1.2.3.4（需模拟浏览器真实请求头）
  - `programmatic` TR-1.2: 前端代码 TypeScript 编译无错误
  - `human-judgement` TR-1.3: 检查 request.ts 拦截器中正确设置了 X-Forwarded-For 头
- **Notes**:
  - http-proxy-middleware 的 xfwd:true 行为：如果请求已包含 X-Forwarded-For，它会追加 `", " + socket.remoteAddress`；如果不存在，它会创建新的 X-Forwarded-For: socket.remoteAddress
  - 所以前端设置 X-Forwarded-For: {publicIp}，Vite proxy 会把它变成 X-Forwarded-For: "{publicIp}, ::1"，getClientIp 取链中首个公网 IP = publicIp ✅
  - 不需要修改 vite.config.ts 的 proxy 配置（已有 xfwd:true）

## [ ] Task 2: 清理临时调试端点 + 删除临时文件
- **Priority**: low
- **Depends On**: Task 1
- **Description**:
  - 删除 `admin-api/src/index.ts` 中的临时 `/_debug/ip` 调试端点（约 20 行代码）
  - 保留 DEBUG 日志中间件（打印 IP 相关头）一段时间便于后续排查
  - 删除临时文件 `admin-api/src/routes/_debug.ts`（如果存在）
  - 删除根目录下的 `debug_ip.json`、`debug_ip2.json` 调试产物
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `programmatic` TR-2.1: TypeScript 编译通过
  - `human-judgement` TR-2.2: 确认 index.ts 中无 `_debug` 相关代码残留
- **Notes**:
  - 临时调试端点为本次诊断而添加，修复完成后应删除
  - DEBUG 日志中间件可保留至部署验证完成后再清理

## [ ] Task 3: 端到端验收 —— 登录+业务操作审计 IP 记录正确
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 通过浏览器（localhost:3014）登录管理后台
  - 执行一次写操作（如修改管理员状态或修改用户信息）
  - 查询 audit_logs 表最新记录，确认 ip 字段为真实公网 IP 而非 localhost
  - 在浏览器审计日志页面确认详情抽屉中 IP 地址显示正确
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-3.1: 登录后 audit_logs 最新记录 ip ≠ "localhost" 且符合 IPv4 格式
  - `programmatic` TR-3.2: 业务写操作后 audit_logs 最新记录 ip 与登录记录 ip 一致
  - `human-judgement` TR-3.3: 浏览器审计日志详情抽屉 IP 地址字段正确显示
- **Notes**:
  - 需确保 fetchPublicIp 成功获取到公网 IP（浏览器控制台应看到 `[HTTP] 检测到浏览器公网 IP: xxx.xxx.xxx.xxx` 日志）

## [ ] Task 4: 单元测试 + TypeScript 编译验证
- **Priority**: medium
- **Depends On**: Task 1, Task 2
- **Description**:
  - 运行 admin-api 的单元测试（npm run test），确认所有 72 个测试通过
  - 运行 admin-api 的 TypeScript 编译检查（npx tsc --noEmit）
  - 运行 admin-web 的 TypeScript 编译检查（npx tsc --noEmit）
  - 修复可能出现的编译或测试错误
- **Acceptance Criteria Addressed**: AC-5, AC-6
- **Test Requirements**:
  - `programmatic` TR-4.1: vitest 全部 72+ 测试通过，exit code 0
  - `programmatic` TR-4.2: admin-api `npx tsc --noEmit` exit code 0
  - `programmatic` TR-4.3: admin-web `npx tsc --noEmit` exit code 0
- **Notes**:
  - 后端单元测试覆盖 getClientIp 11 种场景 + formatIp 等
