# 修复 Dict.tsx 控制台空值错误

## 问题

访问"系统管理 → 字典管理"页面时，浏览器控制台输出 3 条错误日志：

1. `TypeError: Cannot read properties of null (reading 'length')` — `Dict.tsx:68`
2. `The above error occurred in the <List> component` — Ant Design List 组件崩溃
3. `TypeError: Cannot read properties of null (reading 'length')` — `Dict.tsx:68`（重复）

## 根因分析

- **直接原因**：`getDictTypes()` 接口返回 `null`（Mock 无对应接口，fallback 返回 `null`），`setTypes(null)` 将 `types` 状态设为 `null`
- **连锁影响**：
  - `<List dataSource={types}>` 收到 null → Ant Design `InternalList` 读取 `length` 崩溃
  - `res.length`（line 63）在 `loadTypes().then()` 中直接访问 null
  - `getDictList()` 返回 null → `res.list` / `res.total` 也会崩溃

## 修复范围

| 文件 | 修改内容 |
|------|----------|
| `Dict.tsx` | 3 处空值防御：loadTypes、useEffect、ProTable request |
| `mock-plugin.js` | 添加字典类型和字典项 Mock 接口 |

## 验收标准

| ID | 类型 | 描述 | 证据 |
|----|------|------|------|
| AC-1 | rule | 字典管理页面控制台无 TypeError | 浏览器控制台 |
| AC-2 | rule | 字典类型列表正常显示 | 浏览器页面 |
| AC-3 | rule | 字典项表格正常加载 | 浏览器页面 |
| AC-4 | rule | `npx tsc --noEmit` 编译通过 | 命令行 |
