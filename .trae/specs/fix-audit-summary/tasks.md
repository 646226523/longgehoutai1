# 审计日志 objectName 提取修复 - Implementation Plan

## \[x] Task 1: 重构 auditMiddleware 内部 objectName 提取链（4 级 fallback）+ NAME\_KEYS 清理

- **Priority**: high

- **Depends On**: None

- **Description**:

  - 在 `admin-api/src/middlewares/audit.ts` 中重构 objectName 提取逻辑，创建新函数 `resolveObjectName` 按 4 级 fallback 提取：

    1. `params.objectName`（路由显式注入）
    2. `before` 对象里提取（如果 `mergedOpts.before` 存在）
    3. `responseBody.data` 里提取
    4. 兜底：`${typeLabel || module}#${targetId}` 格式

  - 清理 NAME\_KEYS：移除 `id`、`code`、`status`、`sort` 等非名称类字段

  - 修改 `buildAuditSummary` 调用 `resolveObjectName` 替代当前直接用 targetName 的逻辑

  - 修改 `recordAuditLog` 和 middleware 内部的 objectName 解析

- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3

- **Test Requirements**:

  - `programmatic` TR-1.1: `resolveObjectName({objectName: '显式名', ...})` 返回 `'显式名'`

  - `programmatic` TR-1.2: `resolveObjectName({before: {name: '角色名', ...}, ...})` 返回 `'角色名'`

  - `programmatic` TR-1.3: `resolveObjectName({responseBody: {data: {title: '标题', ...}}, ...})` 返回 `'标题'`

  - `programmatic` TR-1.4: `resolveObjectName({module: 'role', targetId: 7})`（全部 fallback）返回 `'角色#7'`

  - `programmatic` TR-1.5: NAME\_KEYS 不再包含 `id`、`code`、`status`

- **Notes**: resolveObjectName 是纯函数，易测

## \[x] Task 2: user.ts 关键路由补充 objectName 注入

- **Priority**: medium

- **Depends On**: Task 1（确保 fallback 链先到位，注入只是锦上添花）

- **Description**:

  - 在 `admin-api/src/routes/user.ts` 中给以下 handler 补充 `res.locals.audit = { objectName: ..., before, targetId, targetType: 'user' }`：

    - `PUT /users/:id`（update 用户信息）

    - `PATCH /users/:id/status`（update\_status）

    - `POST /users/:id/audit-real-name`（audit\_real\_name）

    - `POST /users/:id/audit-loft-owner`（audit\_loft\_owner）

  - 每个 handler 先用 db.prepare 查询 before（和 admin.ts 已有的模式一致），再注入

- **Acceptance Criteria Addressed**: AC-4

- **Test Requirements**:

  - `programmatic` TR-2.1: tsc 编译通过

  - `programmatic` TR-2.2: user.ts 写操作 handler 数量 = res.locals.audit 注入数量

  - `human-judgement` TR-2.3: 代码风格与 admin.ts 已有的注入模式一致

- **Notes**: 注入 objectName 后，即使 fallback 链有 bug，也有显式值兜底

## \[x] Task 3: 单元测试补充 + 编译验证

- **Priority**: high

- **Depends On**: Task 1

- **Description**:

  - 在 `audit.test.ts` 中新增 `resolveObjectName` 测试 describe 块（≥ 10 个 case）

  - 覆盖：显式注入优先 / before 提取 / responseBody 提取 / 兜底格式 / NAME\_KEYS 不含 id

  - 运行 `npx tsc --noEmit` 验证零错误

  - 运行 `npx vitest run` 确保全部通过

- **Acceptance Criteria Addressed**: AC-5

- **Test Requirements**:

  - `programmatic` TR-3.1: vitest 测试通过总数 ≥ 原总数 + 10

  - `programmatic` TR-3.2: tsc 零错误

- **Notes**: Task 2 完成后再跑一次 tsc，确保 user.ts 注入也没类型问题

## \[x] Task 4: 端到端浏览器验收

- **Priority**: high

- **Depends On**: Task 1, Task 2, Task 3

- **Description**:

  - 通过不同模块的 handler 触发新审计日志（至少 3 种不同模块：content / gene / user）

  - 打开审计日志页面，检查新产生的日志摘要 objectName 是否可读

  - 检查是否还有 "??Diff????" 或 "DI:123昵称" 这类异常

  - 检查兜底格式是否正确（如无对象名时显示 "用户#123"）

- **Acceptance Criteria Addressed**: AC-6

- **Test Requirements**:

  - `human-judgement` TR-4.1: 至少 3 种不同模块新日志摘要对象名可读

  - `human-judgement` TR-4.2: 无新的"??Diff????"或"DI:123"类异常

  - `programmatic` TR-4.3: 后端 tsx watch 重启后启动正常，ensureColumn 无报错

- **Notes**: 历史脏数据可能仍存在，只看新产生的日志

