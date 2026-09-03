# 修复 AuditLog 控制台空值错误

## 问题

访问"系统管理 → 操作日志"页面时，浏览器控制台输出 2 条错误日志：

1. `TypeError: Cannot read properties of null (reading 'reduce')` — 发生在 `AuditLog.tsx:68`
2. `The above error occurred in the <SystemAuditLog> component` — React 错误边界报告

## 根因分析

- **直接原因**：`getAuditModules()` 接口返回 `null`（后端返回 `{ code: 0, data: null }`），`setModules(null)` 将 `modules` 状态设为 `null`，随后 `modules.reduce()` 调用抛出 TypeError。
- **深层原因**：HTTP 响应拦截器解包 `res.data` 后直接返回，当 `data` 为 `null` 时未做防御；前端组件假设 API 始终返回数组，缺少空值保护。
- **关联风险**：`getAuditLogs()` 同样可能返回 `null`，`res.list` 和 `res.total` 访问也会崩溃。

## 目标

1. 消除 AuditLog 页面所有空值导致的控制台 TypeError
2. 当 API 返回 null 时页面优雅降级（显示空状态），不崩溃
3. 其他页面同类空值模式一并排查修复

## 非目标

- 不修改后端 Mock 接口数据
- 不改变组件 UI 布局和交互
- 不重构 HTTP 响应拦截器逻辑

## 功能需求

### FR-1: 模块列表空值防御
- `getAuditModules()` 返回 null 时，`modules` 状态应降级为 `[]`
- `moduleValueEnum` 的 `useMemo` 在 `modules` 为 null/非数组时不崩溃

### FR-2: 日志列表空值防御
- `getAuditLogs()` 返回 null 时，ProTable `request` 应返回 `{ data: [], success: false, total: 0 }`
- `res?.list` 和 `res?.total` 使用可选链 + 空值合并

### FR-3: 详情抽屉空值防御
- `AuditLogItem` 详情字段均为 null 时，抽屉显示 "-" 占位符，不崩溃

## 非功能需求

- TypeScript 编译通过 (`npx tsc --noEmit`)
- 页面加载后控制台无 error 日志

## 验收标准

| ID | 类型 | 描述 | 证据来源 |
|----|------|------|----------|
| AC-1 | rule | 访问 `/system/audit-log` 页面，控制台无 `reduce` 相关 TypeError | 浏览器控制台 |
| AC-2 | rule | 模块下拉为空时页面正常渲染，不崩溃 | 浏览器页面 |
| AC-3 | rule | 日志列表数据为空时显示空状态 | 浏览器页面 |
| AC-4 | rule | `npx tsc --noEmit` 编译通过 | 命令行输出 |
| AC-5 | rule | 其他已修复页面（NFT审核、公棚审核等）空值逻辑不受影响 | 回归测试 |
