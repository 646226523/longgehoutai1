# 修复 NFT 审核页面控制台空引用错误

## 问题描述

在 `NFTAudit` 组件（`src/pages/nft/Audit.tsx`）中，当后端 API 返回 `null` 时，代码直接访问 `.list` 和 `.total` 属性导致空引用异常。

**错误日志（2 条）**：
```
TypeError: Cannot read properties of null (reading 'total')
    at NFTAudit (Audit.tsx:863)
```

```
TypeError: Cannot read properties of null (reading 'total')
    at NFTAudit (Audit.tsx:897)
```

**根本原因**：两处 ProTable `request` 回调中，API 返回值为 `null` 时，未使用可选链直接访问 `.list` 和 `.total` 属性：

| 位置 | API | 风险 |
|------|-----|------|
| 第 863 行 | `getNftAuditList()` | `res.list` / `res.total` 空引用 → `reading 'total'` |
| 第 897 行 | `getNftTasks()` | `res.list` / `res.total` 空引用 → `reading 'total'` |

## 目标用户

- 后台管理员访问 NFT 审核页面时，不再出现控制台错误

## 功能需求

1. **空值安全访问**：所有 API 返回值必须通过可选链（`?.`）和空值合并运算符（`??`）安全访问
2. **降级默认值**：API 返回 null 时使用合理的默认值（`[]`、`0`）
3. **不影响现有功能**：正常返回数据时，页面行为保持不变

## 非功能需求

- TypeScript 编译必须通过 `npx tsc --noEmit`
- 浏览器页面正常渲染，控制台无空引用错误

## 验收标准

### AC-1: getNftAuditList 请求空值安全
- 类型：rule
- `getNftAuditList` 返回 null 时，资产表格降级显示空列表
- 证据：代码审查 + 控制台无 `reading 'total'` 错误

### AC-2: getNftTasks 请求空值安全
- 类型：rule
- `getNftTasks` 返回 null 时，任务表格降级显示空列表
- 证据：代码审查 + 控制台无 `reading 'total'` 错误

### AC-3: TypeScript 编译通过
- 类型：rule
- `npx tsc --noEmit` 无错误输出

### AC-4: 页面正常渲染
- 类型：rule
- 浏览器访问 NFT 审核页面，页面正常渲染且控制台无空引用错误
