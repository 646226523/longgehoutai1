# 修复 system 模块页面 "Cannot read properties of null (reading 'map')" 报错 - PRD

## Overview
- **Summary**: 在 Vite 开发模式下，访问系统管理模块（`/system/admin`、`/system/role`）页面时，浏览器控制台报 `TypeError: Cannot read properties of null (reading 'map')`，导致页面白屏无法渲染。
- **Purpose**: 消除这两个页面的运行时崩溃错误，恢复正常渲染；根因是 `mock-plugin.js` 的 skip 列表遗漏了若干 `/api/system/*` 子路由，导致这些路由被 mock-plugin 拦截并返回 `{ code: 0, data: null }`，前端解包后得到 `null`，再调用 `.then(setState)` 将 state 设为 `null`，最终在 render 阶段执行 `.map()` 时崩溃。
- **Target Users**: 后台管理员在本地开发模式下访问系统管理相关页面。

## Goals
- 消除 Admin.tsx（管理员管理）和 Role.tsx（角色权限）页面的渲染崩溃
- 从根因上修复 `mock-plugin.js` 的 skip 列表，确保 `/api/system/admins`、`/api/system/roles`、`/api/system/permissions`、`/api/system/map-config` 正确转发到真实后端
- 在前端 service hook 层和组件层补充空值防御，增强容错性（即使后端返回 null 也不崩）

## Non-Goals (Out of Scope)
- 不修改真实后端（admin-api）的业务逻辑
- 不修改其他模块（content、gene、auction 等）的 mock 行为
- 不做 TypeScript 全量 strict 检查或大规模类型重构
- 不修复 `ENOTEMPTY rmdir` 的 Vite 缓存警告

## Background & Context
- **Vite mock 插件工作机制**: `mock-plugin.js` 在 Vite dev server 中间件层拦截 `/api/*` 请求，skip 列表中的路径会 `next()` 转发到 proxy（即真实后端），skip 外的路径返回 mock 数据。
- **当前 skip 列表覆盖的 system 子路由**: `/system/audit-logs`、`/system/dictionaries`、`/system/configs` — 仅 3 条。
- **实际缺失的 system 子路由**: `/system/admins`、`/system/roles`、`/system/permissions`、`/system/map-config` — 被 catch-all 拦截并返回 `{ code: 0, data: null }`。
- **崩溃链路**: mock-plugin 返回 `{ code: 0, data: null }` → axios interceptor 解包返回 `null` → `service` 函数返回 `null` → `Component.useEffect().then(setXxx)` 将 state 置为 `null` → render 阶段 `null.map(...)` 崩溃。
- **受影响组件与错误点**:
  - `Admin.tsx`: `roleOptions` state 被置 null → `roleOptions.map(...)` (L340 / L361) 崩溃
  - `Admin.tsx`: 若 ProTable 返回 null 行, `record.role_names.map(...)` (L159) 也有风险
  - `Role.tsx`: `permGroups` state 被置 null → `permGroups.map(...)` (L58) 崩溃
  - `Role.tsx`: `g.permissions.map(...)` (L61) 在 group 内部 permissions 为 null 时崩溃

## Functional Requirements
- **FR-1**: mock-plugin.js 的 skip 列表必须包含所有 `/api/system/*` 路由子路径（admins、roles、permissions、map-config、audit-logs、dictionaries、configs）
- **FR-2**: Admin.tsx 中 `roleOptions.map()` 调用必须对 `roleOptions === null` 做防御
- **FR-3**: Admin.tsx 中 `record.role_names.map()` 调用必须对 `record.role_names` 做防御
- **FR-4**: Role.tsx 中 `permGroups.map()` 调用必须对 `permGroups === null` 做防御
- **FR-5**: Role.tsx 中 `g.permissions.map()` 调用必须对 `g.permissions` 做防御
- **FR-6**: services/system.ts 中 `getAdminRoleOptions`、`getAllPermissions` 等函数对返回 null 做兜底处理（返回空数组）
- **FR-7**: mock-plugin 中 catch-all 的 skip 匹配方式从硬编码字符串列表改为统一前缀 `/system/`，避免后续 system 子路由再次遗漏

## Non-Functional Requirements
- **NFR-1**: 修复后两个页面在 mock-plugin 存在时（真实后端也在运行）能正常渲染数据
- **NFR-2**: 修复后即使真实后端未启动、mock-plugin 拦截返回 null，前端也不会崩溃（显示空列表或加载态）
- **NFR-3**: 修改范围限制在 mock-plugin.js、services/system.ts、Admin.tsx、Role.tsx 四个文件内，不影响其他模块

## Constraints
- **Technical**: 项目使用 Node.js + Express（后端）+ React + Vite + Ant Design Pro（前端），mock 插件是 Vite Connect 中间件
- **Dependencies**: 真实后端 API 必须实现对应的 `/api/system/*` 路由（已实现）
- **Platform**: Windows 中文路径环境，`ENOTEMPTY rmdir` 为已知 Vite 缓存问题

## Assumptions
- mock-plugin 的 catch-all 逻辑只在 skip 为 false 时才返回 `{ code: 0, data: null }`
- 真实后端在开发时已启动在 3015 端口，Vite proxy 配置正确（target: localhost:3015）
- 修复 skip 列表后，请求会正确到达真实后端，返回 `role_ids: [], role_names: []` 等空数组（而非 null）

## Acceptance Criteria

### AC-1: Admin 管理页面不再崩溃
- **Given**: 真实后端运行且返回正常数据 / 或 mock-plugin 单独运行（后端未起）
- **When**: 访问 `http://localhost:3014/system/admin`
- **Then**: 页面正常渲染（显示空列表或数据），控制台无 `Cannot read properties of null` 错误
- **Verification**: `programmatic`

### AC-2: Role 权限管理页面不再崩溃
- **Given**: 真实后端运行且返回正常数据 / 或 mock-plugin 单独运行（后端未起）
- **When**: 访问 `http://localhost:3014/system/role`
- **Then**: 页面正常渲染（显示空列表或数据），控制台无 `Cannot read properties of null` 错误
- **Verification**: `programmatic`

### AC-3: Admin 页面角色下拉选项正确加载
- **Given**: 真实后端运行
- **When**: 在 Admin 页面点击"新增管理员"打开弹窗
- **Then**: "关联角色"下拉框有选项（来自真实后端 `/api/system/admins/roles/select`）
- **Verification**: `programmatic`

### AC-4: Role 页面权限分配抽屉正确加载
- **Given**: 真实后端运行
- **When**: 在 Role 页面点击"分配权限"打开抽屉
- **Then**: Tree 组件展示按模块分组的权限列表（来自真实后端 `/api/system/permissions`）
- **Verification**: `programmatic`

### AC-5: mock-plugin skip 列表维护性提升
- **Given**: mock-plugin catch-all 逻辑
- **When**: 新增任意 `/api/system/*` 子路由
- **Then**: 无需修改 skip 列表，新路由自动跳过 mock 直达后端
- **Verification**: `programmatic`

### AC-6: 代码防御性完善
- **Given**: 后端或 mock 意外返回 null 数组字段
- **When**: 组件 render 访问 `.map()`
- **Then**: 不崩溃，渲染空态
- **Verification**: `programmatic`

## Open Questions
- [ ] mock-plugin catch-all 的行为是否应该从"返回 data: null"改为"返回空数组/空对象"？当前选择让 skip 列表正确匹配（FR-7 改为统一 `/system/` 前缀），这是更根本的修复。
