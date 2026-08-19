# 修复 LoftAudit 控制台空引用错误

## 问题描述

在 `LoftAudit` 组件（`src/pages/loft/Audit.tsx`）中，当后端 API 返回 `null` 时，代码直接访问 `.total` 和 `.list` 属性导致空引用异常。

**错误日志**：
```
TypeError: Cannot read properties of null (reading 'total')
    at LoftAudit.tsx:925
```

**根本原因**：
- `getApplicationList()` 返回类型为 `Promise<PageResult<LoftApplicationItem>>`，但 HTTP 拦截器在后端返回 `null` 时会透传 `null`
- 代码中两处直接访问返回值的 `.total` 和 `.list` 属性，未做空值检查

## 影响范围

- `src/pages/loft/Audit.tsx`：2 处空值访问点
  - 第 213 行：初始化状态计数时 `p.total` / `a.total` / `r.total`
  - 第 582-583 行：ProTable request 回调中 `res.total` / `res.list`

## 目标用户

- 后台管理员访问鸽舍审核页面时，不再出现控制台错误

## 功能需求

1. **空值安全访问**：所有从 `getApplicationList()` 获取的返回值必须通过可选链和空值合并运算符安全访问
2. **降级默认值**：API 返回 null 时使用合理的默认值（total=0, list=[]）
3. **不影响现有功能**：正常返回数据时，页面行为保持不变

## 非功能需求

1. **类型安全**：TypeScript 编译零错误
2. **无新警告**：修复后控制台无 `Cannot read properties of null` 错误

## 约束

- 不修改 API 服务层（`services/loft.ts`）
- 不修改 HTTP 拦截器逻辑
- 仅修改 `loft/Audit.tsx` 中的消费侧代码

## 验收标准

### AC-1: 初始化状态计数空值安全
- 类型：rule
- 当 `getApplicationList` 返回 `null` 时，`setStatusCounts` 仍能正常执行（使用默认值 0），不抛出异常
- 证据：代码审查 + 控制台无错误

### AC-2: ProTable request 回调空值安全
- 类型：rule  
- 当 `getApplicationList` 返回 `null` 时，ProTable 能正常降级显示空列表，不抛出异常
- 证据：代码审查 + 控制台无错误

### AC-3: TypeScript 编译通过
- 类型：rule
- `npx tsc --noEmit` 无错误输出
- 证据：编译命令输出

### AC-4: 页面正常渲染
- 类型：rule
- 浏览器访问鸽舍审核页面，页面正常渲染且控制台无 `Cannot read properties of null` 错误
- 证据：浏览器截图 + 控制台日志
