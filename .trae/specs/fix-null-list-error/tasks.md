# 修复 .list null 崩溃 - 实施计划

## \[x] Task 1: 加固 HTTP 拦截器 null 防御

- **Priority**: high

- **Depends On**: None

- **Description**:

  - 修改 `admin-web/src/services/request.ts` 中的响应拦截器

  - 当后端返回 `{ code: 0, data: null }` 时，根据实际场景返回安全默认值

  - 核心逻辑：`if (res.code === 0) return res.data ?? null` → 但实际让调用方处理 null 更合理

  - 更好方案：在拦截器返回前增加 `res.data ?? null`，让前端代码统一用可选链

  - 同时增加 debug console.warn 用于开发环境排查异常响应

- **Acceptance Criteria Addressed**: AC-1

- **Test Requirements**:

  - `programmatic` TR-1.1: 模拟后端返回 `{code:0, data:null}` 时，拦截器不崩溃且返回 null

  - `programmatic` TR-1.2: 模拟后端返回空 body 时，拦截器不崩溃

- **Notes**: 拦截器无法知道具体 API 期望的数据结构，所以保持返回 null 但增加防御提示，真正的防御在调用方

## \[x] Task 2: 为审计日志页面的 getAuditLogs 调用添加防御

- **Priority**: high

- **Depends On**: None

- **Description**:

  - AuditLog.tsx 的 request 回调已使用 `res?.list ?? []`（L461），但 getAuditStats() 调用仍需加固

  - AuditLog.tsx:250 `getAuditStats().then((d) => setStats(d))` 需改为 `getAuditStats().then((d) => setStats(d ?? null))`

  - 增加 stats 的默认值 fallback 确保渲染稳定

- **Acceptance Criteria Addressed**: AC-2, AC-3

- **Test Requirements**:

  - `programmatic` TR-2.1: TypeScript 编译通过

  - `human-judgement` TR-2.2: 页面实际加载时四个统计卡片全部渲染

## \[x] Task 3: 为所有 ProTable request 回调添加 .list 可选链保护

- **Priority**: high

- **Depends On**: None

- **Description**:

  - 从 grep 结果定位所有 `return { data: res.list, success: true, total: res.total }` 模式（不带可选链）

  - 涉及文件：Case.tsx, Deal.tsx, VerifyDetail.tsx, Verify.tsx, Session.tsx, Items.tsx, Result.tsx, List.tsx(赛事), Notice.tsx, News.tsx, Audit.tsx(基因), List.tsx(基因), Admin.tsx, Org.tsx, Report.tsx, Pigeons.tsx, MemberLevel.tsx, Role.tsx

  - 统一改为 `return { data: res?.list ?? [], success: true, total: res?.total ?? 0 }`

- **Acceptance Criteria Addressed**: AC-2

- **Test Requirements**:

  - `programmatic` TR-3.1: 所有修改的文件 TypeScript 编译通过

  - `programmatic` TR-3.2: 没有遗漏的无保护 `.list` 访问（grep 验证）

- **Notes**: 使用 `?.` 和 `??` 双保险，`??` 在 list 为 null/undefined 时回退到 `[]`

## \[x] Task 4: 修复独立函数调用中无保护的 .list 访问

- **Priority**: medium

- **Depends On**: None

- **Description**:

  - 修复 grep 结果中非 request 回调但直接访问 `.list` 的代码

  - 例如 Case.tsx:194 `const options = res.list.map(...)` → `const options = res?.list?.map(...) ?? []`

  - 例如 Banner.tsx:114 `data.list.map(...)` → `data?.list?.map(...) ?? []`

  - VerifyDetail.tsx:128/137 中 `searchRes.list.length` 和 `searchRes.list[0]` → 可选链

  - Arbitration.ts service 中的 `res.list.map(...)` → 可选链

- **Acceptance Criteria Addressed**: AC-2

- **Test Requirements**:

  - `programmatic` TR-4.1: TypeScript 编译通过

  - `human-judgement` TR-4.2: 关键业务页面功能正常

## \[x] Task 5: TypeScript 编译验证 & 浏览器验收

- **Priority**: high

- **Depends On**: Task 1, 2, 3, 4

- **Description**:

  - 执行 `cd admin-web && npx tsc --noEmit` 验证编译

  - 启动前端 dev server

  - 浏览器打开审计日志页面确认无控制台错误

  - 快速切换多个页面确认无崩溃

- **Acceptance Criteria Addressed**: AC-4, AC-5

- **Test Requirements**:

  - `programmatic` TR-5.1: `npx tsc --noEmit` 零错误

  - `human-judgement` TR-5.2: 浏览器控制台无 TypeError 崩溃

  - `human-judgement` TR-5.3: 审计日志四个统计卡片全部正确渲染

