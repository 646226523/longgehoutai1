# 实施任务：修复 AuditLog 控制台空值错误

## Task 1: 修复 AuditLog.tsx 空值防御（高优先级）

**Status: completed**

### 描述
在 `src/pages/system/AuditLog.tsx` 中添加空值防御，覆盖模块加载和日志列表两个场景。

### 实施步骤

1. **修复 `getAuditModules` 回调空值处理** ✅
   - 将 `.then(setModules)` 改为 `.then((data) => setModules(Array.isArray(data) ? data : []))`
   - 确保即使 API 返回 null，`modules` 始终为数组

2. **修复 `moduleValueEnum` useMemo** ✅
   - 在 `useMemo` 内添加 `Array.isArray(modules) ? modules : []` 防御

3. **修复 `getAuditLogs` request 回调** ✅
   - 使用 `res?.list ?? []` 和 `res?.total ?? 0` 替代直接访问

### 验收标准

| ID | 类型 | 描述 | 证据 |
|----|------|------|------|
| TR-1.1 | rule | 模块 API 返回 null 时，modules 状态为空数组 | ✅ 代码已修改，浏览器验证通过 |
| TR-1.2 | rule | 日志 API 返回 null 时，ProTable 返回空数据 | ✅ 代码已修改，浏览器验证通过 |
| TR-1.3 | rule | TypeScript 编译无错误 | ✅ `npx tsc --noEmit` 退出码 0 |

### Completion Evidence
- 修改文件：`admin-web/src/pages/system/AuditLog.tsx`
- 3 处空值防御修改已完成
- 浏览器验证：页面正常加载，控制台无 TypeError

---

## Task 2: Mock 服务器添加审计接口（中优先级）

**Status: completed**

### 描述
在 `server/mock-plugin.js` 中添加审计日志相关 Mock 接口，返回合理的模拟数据，而非让请求落到后端返回 null。

### 实施步骤

1. **添加 `GET /api/system/audit-logs/modules` 接口** ✅
   - 返回 `["user", "gene", "auction", "nft", "competition", "loft", "system", "detection"]`

2. **添加 `GET /api/system/audit-logs` 接口** ✅
   - 返回分页结构 `{ list: [...], total: 35 }`，包含 35 条模拟审计日志记录
   - 支持 operator 和 module 参数过滤

### 验收标准

| ID | 类型 | 描述 | 证据 |
|----|------|------|------|
| TR-2.1 | rule | Mock 接口返回有效数据而非 null | ✅ 页面显示 35 条模拟日志 |
| TR-2.2 | rule | 页面模块下拉和日志列表正常显示 | ✅ 浏览器截图确认 |

### Completion Evidence
- 修改文件：`admin-web/server/mock-plugin.js`
- 新增 `generateMockAuditLogs()` 辅助函数，生成 35 条模拟数据
- 新增 2 个 Mock 接口：modules 列表和日志分页
- 浏览器验证：模块下拉正常，日志分页显示 1-10/共 35 条

---

## Task 3: 验证与回归（高优先级）

**Status: completed**

### 描述
验证修复效果，确保无回归问题。

### 实施步骤

1. ✅ `npx tsc --noEmit` 编译通过
2. ✅ 启动开发服务器，访问系统管理 → 操作日志页面
3. ✅ 控制台无 error 日志
4. ✅ 模块下拉可正常使用
5. ✅ 日志列表可正常加载（35 条，分页正常）
6. ✅ 其他页面抽查无回归

### 验收标准

| ID | 类型 | 描述 | 证据 |
|----|------|------|------|
| TR-3.1 | rule | 控制台无 TypeError | ✅ 浏览器控制台检查：无 reduce/TypeError/null 错误 |
| TR-3.2 | rule | 页面功能完整可用 | ✅ 表格渲染、分页、模块下拉均正常 |
| TR-3.3 | rubric | 其他页面无回归 | ✅ 抽查 NFT 审核、公棚审核页面均正常 |

### Completion Evidence
- TypeScript 编译：通过
- 浏览器验证：http://localhost:3014/system/audit-log 正常加载
- 控制台：无 error 级日志
- 页面显示：模块下拉 + 35 条日志 + 分页正常

## 任务依赖关系

```
Task 1 (空值防御) → Task 3 (验证)
Task 2 (Mock接口) → Task 3 (验证)
```

Task 1 和 Task 2 可并行执行。
