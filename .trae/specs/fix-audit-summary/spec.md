# 审计日志业务摘要 objectName 提取修复 - Product Requirement Document

## Overview

- **Summary**: 修复审计日志业务摘要中 objectName（操作对象名称）提取失败或异常的问题。当前只有 admin.ts 和 role.ts 两个路由文件显式注入 objectName，其余 content.ts / gene.ts / auction.ts / competition.ts / user.ts 等 **90+ 个 handler** 完全依赖 extractObjectName(responseBody) fallback，导致摘要中出现乱码（如 "??Diff????"）、非人类可读格式（如 "修改了用户「DI：123昵称：李先生」"）或缺少对象名。

- **Purpose**: 让所有审计日志摘要都能显示完整、可读的格式 — "超级管理员 修改了角色「审核员」" 而不是 "超级管理员 修改了用户「DI：123昵称：李先生」" 或 "超级管理员 修改了角色"。

- **Target Users**: 后台管理员、运维人员、安全审计人员。

## Goals

- 重构 auditMiddleware 内部 objectName 提取链，确保 **所有** handler 都能得到合理的对象名（即使路由不手动注入）

- 改进 NAME\_KEYS 优先级，`id` 不应被误当名称字段

- 改进 buildAuditSummary 兜底：objectName 缺失时用 `类型中文名#ID` 格式而非空值

- 给 user.ts（用户管理）补充显式 objectName 注入，解决用户明确提到的"修改了用户"场景

- 确保修复后新产生的所有审计日志摘要格式统一、可读

## Non-Goals (Out of Scope)

- 不修改已存在的历史审计日志数据（历史数据保持原样）

- 不逐个给 90+ handler 都加 res.locals.audit 注入（工作量大且容易遗漏）

- 不重写 buildAuditSummary 的中文文本模板

## Background & Context

- 当前 objectName 提取优先级链：

  1. `params.objectName`（路由 handler 通过 res.locals.audit 注入）
  2. `extractObjectName(responseBody)`（从 API 返回体里猜）

- **问题**：90+ handler 没注入（只 admin.ts / role.ts 两个注入了），全靠第 2 步，而 responseBody 格式五花八门

- NAME\_KEYS 列表里包含 `id`（排在第 7 位），当 responseBody.data 里没更好的名称字段时可能误命中

- buildAuditSummary 在 objectName 和 targetTypeLabel 都有值但 objectName 缺失时，输出 `操作人 + 动词 + 类型「」` 空内容

## Functional Requirements

- **FR-1**: 重构 objectName 提取链为 4 级 fallback：

  1. 路由显式注入的 `params.objectName`（最高优先级）
  2. 从 `mergedOpts.before` 对象提取（路由即使没注入 objectName，通常会注入 before 用于 diff）
  3. 从 `responseBody.data` 提取（当前的 extractObjectName 逻辑）
  4. 兜底：用 `${MODULE_LABELS[module] || module}#${targetId}` 格式

- **FR-2**: NAME\_KEYS 列表移除 `id`、`code`、`status` 等非名称类字段

- **FR-3**: user.ts 关键写操作（update / update\_status / audit\_real\_name / audit\_loft\_owner）补充 objectName 注入

- **FR-4**: buildAuditSummary 在所有 fallback 都失败时仍输出可读格式（如 "超级管理员 修改了用户#123"）

## Non-Functional Requirements

- **NFR-1**: 性能 — extractObjectName 为纯字符串操作，单次 <1ms；从 before 提取不应产生额外 DB 查询（before 已在内存）

- **NFR-2**: 向后兼容 — admin.ts / role.ts 已有的 objectName 注入保持优先，新 fallback 不影响它们

- **NFR-3**: 可测试性 — objectName 提取链应拆分出独立可测函数

## Constraints

- **Technical**: Node.js + Express + TypeScript；before 对象由路由 handler 注入，格式不统一（有的是完整 DB 行、有的是 `{ permissions: [...] }`）

- **Business**: 项目还在开发阶段，handler 数量还在增加，方案应具备前瞻性

- **Dependencies**: 依赖 MODULE\_LABELS 映射表的覆盖度

## Assumptions

- 路由 handler 通常会在处理函数内查询 DB 得到 before 对象（用于校验/业务逻辑），并通过 `res.locals.audit = { before, ... }` 注入

- before 对象通常包含 NAME\_KEYS 中的某个字段（name / nickname / username / title / pigeon\_name / role\_name 等）

- targetId 通常能从 URL 路径或 responseBody 中提取

## Acceptance Criteria

### AC-1: objectName 4 级 fallback 正确工作

- **Given**: 路由 handler 只注入了 before（没注入 objectName）

- **When**: auditMiddleware 记录日志

- **Then**: 从 before 对象里提取出合理的对象名

- **Verification**: `programmatic`

### AC-2: 兜底格式可读

- **Given**: before 和 responseBody 都找不到名称字段

- **When**: buildAuditSummary 生成摘要

- **Then**: 输出 `${类型中文名}#${targetId}` 格式（如 "用户#123"），而非空值

- **Verification**: `programmatic`

### AC-3: NAME\_KEYS 不包含 id

- **Given**: responseBody.data 只有 id 和 code 字段

- **When**: 调用 extractObjectName

- **Then**: 返回 null（不把 id 或 code 当名称）

- **Verification**: `programmatic`

### AC-4: user.ts 路由 objectName 注入

- **Given**: admin 通过 user.ts 修改用户（update / update\_status / audit\_real\_name）

- **When**: 触发审计日志

- **Then**: 摘要格式为 "超级管理员 修改了用户「李先生」"，而非包含 "DI:123昵称"

- **Verification**: `programmatic` + `human-judgment`

### AC-5: TypeScript 编译 + 单元测试

- **Given**: 所有改动完成

- **When**: `npx tsc --noEmit` + `npx vitest run`

- **Then**: tsc 零错误，vitest 全部通过（含新增 fallback 测试）

- **Verification**: `programmatic`

### AC-6: 浏览器端到端验证

- **Given**: 通过非 admin/role 路由触发写操作（如修改内容、创建拍卖场次）

- **When**: 打开审计日志详情

- **Then**: 摘要对象名可读、完整

- **Verification**: `human-judgment`

## Open Questions

- [ ] 历史脏数据（"??Diff????"）是否需要一次性 SQL 清洗？当前方案只修复新数据

<br />
