# 审计日志 IP 地址溯源修复 - 实施计划

## [x] Task 1: 优化 fetchPublicIp — 使用国内可用 IP 查询源 + 解决时序问题
- **Priority**: high
- **Depends On**: None
- **Description**:
  1. 重排 fetchPublicIp 的源列表：将 ifconfig.me 提到第一位（已验证可用），添加国内源 myip.ipip.net，移除被墙的 api.ipify.org
  2. 添加 localStorage 缓存：缓存上次成功的公网 IP，作为首次请求的即时 fallback（立即可用）
  3. 修改请求拦截器：当 publicIpFetchPromise 还在进行中时，让请求等待它完成（Promise 链式复用），而不是直接跳过
  4. 增加详细 debug 日志：每个源的成功/失败/耗时
  5. 优化 myip.ipip.net 的返回解析（格式为 "当前 IP：xxx 来自于：..."）
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-5
- **Test Requirements**:
  - `programmatic` TR-1.1: fetchPublicIp 在 10 秒内返回公网 IP（国内网络环境）
  - `programmatic` TR-1.2: 请求拦截器在 cachedPublicIp 为 null 但 publicIpFetchPromise pending 时，等待 Promise 完成后携带头
  - `programmatic` TR-1.3: localStorage 缓存机制正常：首次请求用缓存 IP，后台刷新
  - `programmatic` TR-1.4: 所有源失败时控制台输出警告，不崩溃
  - `human-judgement` TR-1.5: 浏览器控制台可见详细的 fetchPublicIp 调试日志
- **Notes**: 关键路径 — 如果 fetchPublicIp 成功但请求拦截器没等到就发请求，还是会丢失头。所以必须解决时序问题。

## [x] Task 2: 清理临时调试代码
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  1. 删除 admin-api/src/index.ts 中的 `/api/_debug/ip` 调试端点（L60-78）
  2. 删除 admin-api/src/index.ts 中的 IP 头调试日志中间件代码（L41-46）
  3. 删除 admin-web/server/mock-plugin.js catch-all 中的 `/_debug` skip 条件
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `programmatic` TR-2.1: `GET /api/_debug/ip` 返回 404（路由已删除）
  - `programmatic` TR-2.2: 后端控制台不再输出 `[IP-HEAD]` 调试日志
  - `programmatic` TR-2.3: TypeScript 编译通过，无残留引用
- **Notes**: 等 Task 1 验证通过后再清理，避免调试手段丢失。

## [ ] Task 3: 端到端验收 — 登录 + 业务操作 + IP 显示全链路
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  1. 启动后端和前端开发服务器
  2. 解锁浏览器，打开 http://localhost:3014
  3. 检查浏览器控制台是否输出公网 IP 日志
  4. 执行登录 → 验证数据库审计日志 ip 字段
  5. 执行业务写操作（如编辑用户） → 验证数据库审计日志 ip 字段
  6. 在审计日志页面查看详情抽屉 → 验证 IP 地址显示
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `human-judgement` TR-3.1: 浏览器控制台输出 `[HTTP] 检测到浏览器公网 IP: xxx`
  - `programmatic` TR-3.2: 最新登录审计日志 ip ≠ "localhost"，符合 IPv4 格式
  - `programmatic` TR-3.3: 业务写操作审计日志 ip 与登录 IP 一致
  - `human-judgement` TR-3.4: 审计日志详情抽屉 IP 字段显示正确值，有复制按钮

## [ ] Task 4: TypeScript 编译 + 单元测试验证
- **Priority**: medium
- **Depends On**: Task 1, Task 2
- **Description**:
  1. 运行 admin-web TypeScript 编译检查（确保无类型错误）
  2. 运行 admin-api TypeScript 编译检查
  3. 运行后端 audit.test.ts 单元测试（确保 72 个测试全部通过）
  4. 代码 review：检查 fetchPublicIp 异常处理、Promise 链式复用逻辑、内存泄漏风险
- **Acceptance Criteria Addressed**: NFR-3, NFR-4
- **Test Requirements**:
  - `programmatic` TR-4.1: `npx tsc --noEmit` 在 admin-web 目录下零错误
  - `programmatic` TR-4.2: `npx tsc --noEmit` 在 admin-api 目录下零错误
  - `programmatic` TR-4.3: `npx jest audit.test.ts` 全部 72 个测试通过
- **Notes**: 单元测试可能需要为 fetchPublicIp 添加 mock 测试（如果项目配置了前端测试框架）。
