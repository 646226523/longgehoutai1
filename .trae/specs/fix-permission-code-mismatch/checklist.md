# 角色权限 Code 映射错乱修复 — 验证清单

## 后端权限种子（Task 1）

- [x] db.ts 中 v2 细粒度权限区域补充了 `gene:list:view`、`nft:list:view`、`competition:list:view`、`loft:list:view` 等缺失的 menu code

- [x] 重启后端后 GET /api/system/permissions 返回的权限树中，每个模块都至少有 1 条 menu 类型权限

- [x] 权限种子表无重复 code

## 前端菜单 permission（Task 2）

- [x] AdminLayout.tsx 中所有子菜单项的 permission 已从 v1 升级为 v2 menu code（22 处）

- [x] 10 个父级菜单移除了固定 permission，依赖子菜单 OR 逻辑过滤

- [x] TypeScript 编译零错误

- [x] 超管登录后所有菜单正常显示

## 后端路由兼容映射（Task 3）

- [x] auth.ts 添加 V2\_TO\_V1\_COMPAT\_MAP（50+ 条映射规则）

- [x] detection.ts 路由全部升级为 v2 细粒度 code（23 处）

- [x] detection:org:manage 不再自动映射到 detection:view（检测机构独立授权）

- [x] 拥有 v2 code 的角色自动获得对应 v1 兼容权限

- [x] 超管不受兼容映射影响（isSuper 直接放行）

## 端到端验证（Task 4）

- [x] 超管账号：11 大模块菜单全显示，所有接口 200 OK

- [x] 只读访客V2（仅勾 detection:order:view + detection:report:view）：菜单只显示预约订单 + 检测报告，**不显示**检测机构

- [x] 接口隔离精确：/orders→200, /reports→200, /orgs→403

- [x] 前端控制台零权限相关警告

- [x] 角色权限分配界面 PermissionSelector 权限树结构完整

- [x] TypeScript 编译零错误（前后端均通过）

