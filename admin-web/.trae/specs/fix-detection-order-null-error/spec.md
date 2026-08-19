# 修复 DetectionOrder 控制台空引用错误

## 问题描述

在 `DetectionOrder` 组件（`src/pages/detection/Order.tsx`）中，当后端 API 返回 `null` 时，代码直接调用 `.map()`、`.forEach()` 或访问 `.list`/`.total` 属性导致空引用异常。

**错误日志**：
```
TypeError: Cannot read properties of null (reading 'map')
    at DetectionOrder (Order.tsx:580)
```

**根本原因**：以下 API 调用返回 `null` 时，未做空值保护：

| 位置 | API | 风险 |
|------|-----|------|
| 第 120-126 行 | `getDetectionCalendar()` | `rows.forEach()` on null |
| 第 136-137 行 | `getDetectionOrgOptions()` | `setOrgOptions(null)` → `orgOptions.map()` 失败 |
| 第 141-142 行 | `getDetectionItemTypes()` | `setItemTypes(null)` → `itemTypes.map()` 失败 |
| 第 273-275 行 | `getDetectionCalendarByDate()` | `setDateOrders(null)` → 后续渲染异常 |
| 第 453 行 | `getDetectionOrders()` | `res.list` / `res.total` 空引用 |

## 目标用户

- 后台管理员访问检测预约订单页面时，不再出现控制台错误

## 功能需求

1. **空值安全访问**：所有 API 返回值必须通过可选链和空值合并运算符安全访问
2. **降级默认值**：API 返回 null 时使用合理的默认值（`[]`、`0`、`{}`）
3. **不影响现有功能**：正常返回数据时，页面行为保持不变

## 验收标准

### AC-1: loadOptions 空值安全
- 类型：rule
- `getDetectionOrgOptions`、`getDetectionItemTypes`、`getGeneProfileOptions` 返回 null 时，状态变量使用默认值 `[]`
- 证据：代码审查 + 控制台无错误

### AC-2: getDetectionCalendar 空值安全
- 类型：rule
- `getDetectionCalendar` 返回 null 时，`rows.forEach` 不抛出异常
- 证据：代码审查 + 控制台无错误

### AC-3: ProTable request 回调空值安全
- 类型：rule
- `getDetectionOrders` 返回 null 时，ProTable 降级显示空列表
- 证据：代码审查 + 控制台无错误

### AC-4: TypeScript 编译通过
- 类型：rule
- `npx tsc --noEmit` 无错误输出

### AC-5: 页面正常渲染
- 类型：rule
- 浏览器访问检测预约订单页面，页面正常渲染且控制台无空引用错误
