# 任务列表：修复 LoftAudit 控制台空引用错误

## Task 1: 修复初始化状态计数的空值访问
- **优先级**: high
- **状态**: completed
- **关联 AC**: AC-1
- **目标**: 修复 `useEffect` 中 `getApplicationList` 返回 null 时的空值访问
- **修改文件**: `src/pages/loft/Audit.tsx`

### 实现细节
在第 203-220 行的 `useEffect` 中：
```typescript
// 修复前（第 213 行）：
setStatusCounts({ pending: p.total, approved: a.total, rejected: r.total });

// 修复后：
setStatusCounts({
  pending: p?.total ?? 0,
  approved: a?.total ?? 0,
  rejected: r?.total ?? 0,
});
```

### 测试需求
- **TR-1.1 (rule)**: 当 API 返回 null 时，`setStatusCounts` 使用默认值 0，不抛出异常 ✅
- **TR-1.2 (rule)**: 当 API 正常返回时，状态计数正确显示 ✅

### 完成证据
- 代码修改已应用：第 213-217 行使用可选链 `?.` 和空值合并 `??` 运算符
- 浏览器验证：页面正常渲染，控制台无空引用错误

---

## Task 2: 修复 ProTable request 回调的空值访问
- **优先级**: high
- **状态**: completed
- **关联 AC**: AC-2
- **目标**: 修复 ProTable `request` 回调中 `getApplicationList` 返回 null 时的空值访问
- **修改文件**: `src/pages/loft/Audit.tsx`

### 实现细节
在第 573-586 行的 ProTable `request` 回调中：
```typescript
// 修复前（第 582-583 行）：
setStatusCounts(prev => ({ ...prev, [activeTab]: res.total }));
return { data: res.list, success: true, total: res.total };

// 修复后：
setStatusCounts(prev => ({ ...prev, [activeTab]: res?.total ?? 0 }));
return { data: res?.list ?? [], success: true, total: res?.total ?? 0 };
```

### 测试需求
- **TR-2.1 (rule)**: 当 API 返回 null 时，ProTable 降级显示空列表 ✅
- **TR-2.2 (rule)**: 当 API 正常返回时，表格数据正确显示 ✅

### 完成证据
- 代码修改已应用：第 586-587 行使用可选链 `?.` 和空值合并 `??` 运算符
- 浏览器验证：ProTable 正常渲染，空列表降级正常

---

## Task 3: TypeScript 编译验证
- **优先级**: high
- **状态**: completed
- **关联 AC**: AC-3
- **目标**: 确保修改后 TypeScript 编译零错误
- **验证命令**: `npx tsc --noEmit`
- **测试需求**:
  - **TR-3.1 (rule)**: `npx tsc --noEmit` 输出为空 ✅

### 完成证据
- 编译命令输出为空（exit code 0），无错误

---

## Task 4: 浏览器验证
- **优先级**: high
- **状态**: completed
- **关联 AC**: AC-4
- **目标**: 浏览器访问鸽舍审核页面，确认无控制台错误
- **验证步骤**:
  1. 访问 `http://localhost:3014/loft/audit`
  2. 检查页面正常渲染
  3. 检查控制台无 `Cannot read properties of null` 错误
- **测试需求**:
  - **TR-4.1 (rule)**: 页面正常渲染，无白屏 ✅
  - **TR-4.2 (rule)**: 控制台无空引用错误 ✅

### 完成证据
- 浏览器验证通过：页面标题"入驻审核 - 赛鸽基因后台"正常显示，表格和状态卡片正常渲染
- 控制台无 `Cannot read properties of null` 错误，仅有 React DevTools info 和 Router Future Flag Warning
- 截图保存：loft-audit-full.png, loft-audit.png
