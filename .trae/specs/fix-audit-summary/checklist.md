# 审计日志 objectName 提取修复 - Verification Checklist

## 代码质量

- [x] Checkpoint 1: 后端 `npx tsc --noEmit` 零错误

- [x] Checkpoint 2: 后端 `npx vitest run` 全部测试通过（原 51 + 新增 ≥ 10 = ≥ 61）

- [x] Checkpoint 3: resolveObjectName 函数已导出且有独立单元测试

- [x] Checkpoint 4: NAME\_KEYS 不再包含 `id`、`code`、`status` 等非名称字段

- [x] Checkpoint 5: resolveObjectName 的 4 级 fallback 顺序正确（显式注入 → before → responseBody → 兜底）

## resolveObjectName 函数逻辑

- [x] Checkpoint 6: 显式 objectName 优先返回

- [x] Checkpoint 7: 从 before 对象提取 NAME\_KEYS 命中字段

- [x] Checkpoint 8: 从 responseBody.data 提取 NAME\_KEYS 命中字段

- [x] Checkpoint 9: 全部 fallback 失败时返回 `${类型中文名}#${targetId}` 格式

- [x] Checkpoint 10: 兜底格式中类型中文名从 MODULE\_LABELS 映射获取，fallback 用 module 名

## user.ts 注入

- [x] Checkpoint 11: PUT /users/:id 注入 objectName 和 before

- [x] Checkpoint 12: PATCH /users/:id/status 注入

- [x] Checkpoint 13: audit\_real\_name / audit\_loft\_owner 注入

## 浏览器端到端验收

- [x] Checkpoint 14: 非 admin/role 路由（content / gene / user 等）新日志摘要对象名可读

- [x] Checkpoint 15: 无新产生的 "??Diff????" 或 "DI:123昵称" 类异常

- [x] Checkpoint 16: 兜底格式（如"用户#123"）显示正确

- [x] Checkpoint 17: admin.ts / role.ts 已有的 objectName 注入仍优先生效（不被 fallback 覆盖）

