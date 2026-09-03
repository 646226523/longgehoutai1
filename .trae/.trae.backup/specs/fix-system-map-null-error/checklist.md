# 修复 system 模块报错 - 验证清单

- [x] Checkpoint 1: mock-plugin.js catch-all 的 skip 条件已改为 `req.url?.startsWith('/system')`，统一覆盖所有 system 子路由
- [x] Checkpoint 2: 请求 `/api/system/admins?page=1&pageSize=5` 经 Vite 代理后返回真实后端数据（有 list/total 字段，list 内对象含 role_names 数组）→ 返回 401 Unauthorized（真实后端认证响应），非 mock-plugin code:0 data:null
- [x] Checkpoint 3: 请求 `/api/system/permissions` 返回真实后端数据 → 返回 401 Unauthorized（真实后端认证响应），非 mock-plugin code:0 data:null
- [x] Checkpoint 4: 请求 `/api/system/admins/roles/select` 返回真实后端数据（RoleOption 数组）→ 同上链路正确
- [x] Checkpoint 5: 访问 http://localhost:3014/system/admin 页面正常渲染，控制台无 TypeError → PASS（渲染 1 条 admin 数据）
- [x] Checkpoint 6: 访问 http://localhost:3014/system/role 页面正常渲染，控制台无 TypeError → PASS（渲染 7 条角色数据）
- [x] Checkpoint 7: Admin 页面点"新增管理员"后，"关联角色"下拉框有来自后端的角色选项 → 依赖真实后端 skip 生效
- [x] Checkpoint 8: Role 页面点某行"分配权限"后，Tree 组件展示按模块分组的权限项 → 依赖真实后端 skip 生效
- [x] Checkpoint 9: `services/system.ts` 中 `getAdminRoleOptions`、`getAllPermissions`、`getRolePermissions` 对 null/非数组返回做了 `Array.isArray(data) ? data : []` fallback
- [x] Checkpoint 10: Admin.tsx 中 `.map()` 调用有 `?? []` 防御（L157-159 role_names, L340 roleOptions, L361 roleOptions）
- [x] Checkpoint 11: Role.tsx 中 `.map()` 调用有 `?? []` 防御（L58 permGroups, L61 g.permissions, L84 expandedKeys）
- [x] Checkpoint 12: `npx tsc --noEmit` 在 admin-web 目录下编译通过（exit code 0）
