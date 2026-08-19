# 任务列表：修复 NFT 审核页面控制台空引用错误

## Task 1: 修复 getNftAuditList 请求回调空值保护 ✅
- **优先级**: high
- **状态**: completed
- **关联 AC**: AC-1
- **目标**: 修复 `getNftAuditList` 返回 null 时的 `res.list` / `res.total` 空引用
- **修改文件**: `src/pages/nft/Audit.tsx`（第 863 行）

### 完成证据
- 代码修改：`res.list` → `res?.list ?? []`, `res.total` → `res?.total ?? 0`
- TypeScript 编译通过
- 浏览器验证：NFT 审核页面资产表格正常渲染，控制台无错误

---

## Task 2: 修复 getNftTasks 请求回调空值保护 ✅
- **优先级**: high
- **状态**: completed
- **关联 AC**: AC-2
- **目标**: 修复 `getNftTasks` 返回 null 时的 `res.list` / `res.total` 空引用
- **修改文件**: `src/pages/nft/Audit.tsx`（第 897 行）

### 完成证据
- 代码修改：`res.list` → `res?.list ?? []`, `res.total` → `res?.total ?? 0`
- TypeScript 编译通过
- 浏览器验证：NFT 审核页面任务表格正常渲染，控制台无错误

---

## Task 3: 扩展修复其他页面空值风险 ✅
- **优先级**: medium
- **状态**: completed
- **关联 AC**: AC-1, AC-2（预防性修复）
- **目标**: 修复其他页面中相同模式的空值访问风险
- **修改文件**:
  - `src/pages/loft/List.tsx`（第 86 行）
  - `src/pages/auction/Deal.tsx`（第 87 行）
  - `src/pages/competition/Result.tsx`（第 76 行）
  - `src/pages/competition/Verify.tsx`（第 72 行）
  - `src/pages/user-member/UserList.tsx`（第 89 行）

### 完成证据
- 5 处 `res.list` / `list` 访问均已添加 `?.` 和 `?? []` 保护
- TypeScript 编译通过
- 浏览器验证：公棚列表、竞拍成交页面正常渲染

---

## Task 4: TypeScript 编译 + 浏览器验证 ✅
- **优先级**: high
- **状态**: completed
- **关联 AC**: AC-3, AC-4
- **目标**: 编译通过 + 浏览器页面正常渲染

### 完成证据
- TypeScript 编译通过：`npx tsc --noEmit` 返回 exit code 0
- 浏览器验证：NFT 审核、公棚列表、竞拍成交页面正常渲染
- 控制台无 `Cannot read properties of null (reading 'total')` 错误
- 控制台无 `Cannot read properties of null (reading 'map')` 错误
