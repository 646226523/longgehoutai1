# 修复 system 模块 "Cannot read properties of null (reading 'map')" 报错 - 实现计划

## [ ] Task 1: mock-plugin.js 补全 system 路由 skip 逻辑（根因修复）
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 把 mock-plugin catch-all 的 skip 判断从硬编码的 `/system/audit-logs`、`/system/dictionaries`、`/system/configs` 改为统一前缀 `/system`，让所有 `/api/system/*` 路由（admins、roles、permissions、map-config 等）都正确转发到真实后端
  - 修改位置：`mock-plugin.js` 第 843 行的 `skip` 字符串，将三个独立的 `/system/*` 前缀合并为一个 `req.url?.startsWith('/system')`
- **Acceptance Criteria Addressed**: AC-3, AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-1.1: 直接请求 `/api/system/admins?page=1&pageSize=5`（经 Vite proxy）应返回真实后端数据而非 `{ code: 0, data: null }`
  - `programmatic` TR-1.2: 直接请求 `/api/system/permissions` 应返回真实后端数据
  - `programmatic` TR-1.3: 直接请求 `/api/system/admins/roles/select` 应返回真实后端数据
- **Notes**: 当前 skip 字符串：`req.url?.startsWith('/system/audit-logs') || req.url?.startsWith('/system/dictionaries') || req.url?.startsWith('/system/configs')` → 改为 `req.url?.startsWith('/system')`

## [ ] Task 2: services/system.ts 增加空值兜底（service 层防御）
- **Priority**: high
- **Depends On**: None
- **Description**:
  - `getAdminRoleOptions`: 解包后若返回值为 `null` 或非数组，返回 `[]`
  - `getAllPermissions`: 解包后若返回值为 `null` 或非数组，返回 `[]`
  - `getRolePermissions`: 解包后若返回值为 `null` 或非数组，返回 `[]`
  - 保持 `PageResult` 相关函数不变（ProTable 已有 try/catch 保护）
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `programmatic` TR-2.1: 手动调用 `getAdminRoleOptions` 当底层 http.get 返回 null 时，最终返回空数组
  - `programmatic` TR-2.2: 手动调用 `getAllPermissions` 当底层 http.get 返回 null 时，最终返回空数组
- **Notes**: 类型签名保持不变（Promise<RoleOption[]> / Promise<PermissionGroup[]> / Promise<number[]>），仅在运行时加空值 fallback

## [ ] Task 3: Admin.tsx 组件层 .map() 空值防御
- **Priority**: medium
- **Depends On**: Task 2
- **Description**:
  - L159 `record.role_names.map(...)` — 改为 `(record.role_names ?? []).map(...)`，同时前面的 `.length` 检查改为 `(record.role_names ?? []).length`
  - L340 `roleOptions.map(...)` — 改为 `(roleOptions ?? []).map(...)`（roleOptions 理论上不会被置 null，但防御）
  - L361 `roleOptions.map(...)` — 同上
- **Acceptance Criteria Addressed**: AC-1, AC-6
- **Test Requirements**:
  - `programmatic` TR-3.1: TypeScript 编译通过（`npm run type-check`）
  - `programmatic` TR-3.2: 页面 render 阶段即使 roleOptions / role_names 为 null 也不会抛 TypeError
- **Notes**: 防御式编程，不改变业务行为

## [ ] Task 4: Role.tsx 组件层 .map() 空值防御
- **Priority**: medium
- **Depends On**: Task 2
- **Description**:
  - L58 `permGroups.map(...)` — 改为 `(permGroups ?? []).map(...)`
  - L61 `g.permissions.map(...)` — 改为 `(g.permissions ?? []).map(...)`
  - L84 `permGroups.map(...)` — 改为 `(permGroups ?? []).map(...)`
  - L342 `permDrawer.checked.map(...)` — 保持不变（init = []，setState 时也设置了 []）
- **Acceptance Criteria Addressed**: AC-2, AC-6
- **Test Requirements**:
  - `programmatic` TR-4.1: TypeScript 编译通过（`npm run type-check`）
  - `programmatic` TR-4.2: 页面 render 阶段即使 permGroups / g.permissions 为 null 也不会抛 TypeError
- **Notes**: 防御式编程，不改变业务行为
