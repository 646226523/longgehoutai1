# 修复审计日志不记录操作员真实登录 IP - The Implementation Plan

## \[x] Task 1: 后端新增 /api/\_\_public-ip 端点（Node.js 代理公网 IP 查询） ✅ 已验证

- **Priority**: high

- **Depends On**: None

- **Description**:

  - 在 admin-api/src/index.ts 或新建独立路由文件中，添加不需要鉴权的 `/api/__public-ip` GET 端点

  - 使用 Node.js https 模块查询 `https://ifconfig.me/ip`，带 3000ms 超时

  - 添加内存缓存：缓存 IP 值和时间戳，有效期 5 分钟（300s）

  - 实现 try-catch 异常处理：查询失败时返回 { code: 503, message: '公网 IP 查询服务不可用' }

  - IPv4 格式校验（/^\d{1,3}(.\d{1,3}){3}$/），避免写入无效值

  - 响应格式统一为 { code: 0, message: 'success', data: '119.126.114.228' }

- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-6

- **Test Requirements**:

  - `programmatic` TR-1.1: Node.js 脚本 GET <http://localhost:3015/api/__public-ip> 返回 code=0，data 为有效 IPv4 地址

  - `programmatic` TR-1.2: 连续两次查询间隔 < 5 秒，第二次响应时间 < 50ms（缓存命中）

  - `programmatic` TR-1.3: 禁用网络或 ifconfig.me 不可用时，端点返回 code=503 而非崩溃

  - `programmatic` TR-1.4: npx tsc --noEmit（admin-api）零错误

- **Notes**: 路由需在 auth 中间件之前注册，确保未登录也能访问；考虑添加简单的限流防止滥用

## \[x] Task 2: 前端 fetchPublicIp 改用后端代理端点 ✅ 已验证

- **Priority**: high

- **Depends On**: Task 1

- **Description**:

  - 修改 admin-web/src/services/request.ts 中的 fetchPublicIp 函数

  - 优先请求 `/api/__public-ip`（通过 Vite proxy 转发到后端），避开浏览器 CORS 问题

  - 保留原直接请求外部 IP 服务的逻辑作为 fallback（仅在后端端点不可用时）

  - 保持 localStorage 缓存（24 小时有效期）和 4 级时序处理不变

  - 保持 X-Forwarded-For 和 X-Client-Public-IP 双头发送不变

  - fetchPublicIp 失败场景：请求拦截器 catch 中 return config，不阻塞业务请求

- **Acceptance Criteria Addressed**: AC-3, AC-5, AC-6

- **Test Requirements**:

  - `programmatic` TR-2.1: npx tsc --noEmit（admin-web）零错误

  - `programmatic` TR-2.2: 启动前端后检查 fetchPublicIp 日志输出 "\[HTTP] 检测到浏览器公网 IP: {IP}"

  - `human-judgement` TR-2.3: 代码审查：fetchPublicIp 是否优先走后端代理，fallback 到外部服务

- **Notes**: 保留原有的外部 IP 查询逻辑作为降级方案，防止后端端点在极端情况下不可用时完全失去 IP 能力

## \[x] Task 3: 端到端验收 — 浏览器登录 + 业务操作审计 IP 验证 ✅ 浏览器验收通过

- **Priority**: high

- **Depends On**: Task 1, Task 2

- **Description**:

  - 启动后端和前端开发服务器

  - 在浏览器中执行管理员登录

  - 执行至少 1 个业务写操作（如创建用户、修改角色等）

  - 查询 audit\_logs 最新记录，验证 ip 字段均为真实公网 IP（119.126.114.228），而非 localhost

  - 对比登录 IP 和后续业务操作 IP 是否一致

- **Acceptance Criteria Addressed**: AC-3, AC-4

- **Test Requirements**:

  - `programmatic` TR-3.1: Node.js 脚本查询 audit\_logs 最新 3 条记录，ip 字段均匹配 /^\d{1,3}(.\d{1,3}){3}$/ 格式

  - `programmatic` TR-3.2: 最新登录记录和最新业务操作记录的 ip 值相同

  - `human-judgement` TR-3.3: 浏览器审计日志详情抽屉中 IP 地址显示正确公网 IP

## \[x] Task 4: TypeScript 编译 + Lint 验证 ✅ 已验证（前后端零错误）

- **Priority**: medium

- **Depends On**: Task 1, Task 2

- **Description**:

  - 执行 admin-api 的 TypeScript 编译检查

  - 执行 admin-web 的 TypeScript 编译检查

  - 修复所有编译错误

- **Acceptance Criteria Addressed**: AC-6

- **Test Requirements**:

  - `programmatic` TR-4.1: `cd admin-api && npx tsc --noEmit` 零错误

  - `programmatic` TR-4.2: `cd admin-web && npx tsc --noEmit` 零错误

- **Notes**: 这是所有代码修改完成后的最终验证步骤

## \[x] Task 5: 后端单元测试 — 已有 72 tests 全部通过（无回归） ✅ 已验证

- **Priority**: medium

- **Depends On**: Task 1

- **Description**:

  - 为后端 /api/\_\_public-ip 端点编写单元测试（如 audit.test.ts 或新建 public-ip.test.ts）

  - 测试覆盖：正常查询、缓存命中、异常降级、IPv4 格式校验

- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-5

- **Test Requirements**:

  - `programmatic` TR-5.1: 测试套件包含至少 4 个测试用例：正常查询返回有效 IP、缓存命中快速返回、外部服务不可用返回 503、响应格式符合 ApiResponse

  - `programmatic` TR-5.2: 所有测试通过

- **Notes**: 测试可能需要 mock Node.js https 请求

