# 角色权限 Code 映射错乱修复 — 产品需求文档

## Overview

- **摘要**: 修复前端菜单 permission code、后端路由 requirePermission code 与后端权限种子表 code 三者之间的系统性不匹配问题。当前权限种子表同时存在"旧简单 code"（如 `detection:view`）和"新细粒度 code"（如 `detection:order:view`），但前端菜单和后端路由仍依赖旧 code，而角色权限分配界面展示的是全套新 code，导致用户按细粒度勾选后菜单显示错乱、接口 403。

- **目的**: 让前端菜单 → 后端路由 → 权限种子 三者的 code 完全一致，消除当前"勾选了检测报告查看却看不到检测报告菜单""没勾选检测机构却能看到检测机构菜单"等错乱现象。

- **目标用户**: 系统管理员、运营管理人员。

## Goals

- 前端菜单的 `permission` 字段统一使用后端细粒度权限种子中的 **menu 类型 code**

- 后端路由的 `requirePermission()` 统一使用对应的细粒度 code（或保持旧 code 但建立映射兼容）

- 父级菜单权限采用"子菜单 OR 逻辑"：有任一子菜单权限即显示父菜单

- 超管（super\_admin）账号不受影响，拥有全部菜单和接口访问

- 只读访客角色按勾选的权限精确控制可见菜单

## Non-Goals (Out of Scope)

- 不重构权限种子表的数据库结构（旧 code 保留兼容，新 code 是主用）

- 不新增新的业务权限项（现有 165 项保持不变）

- 不修改 RBAC 模型本身（角色-权限多对多关系不变）

- 不涉及 C 端用户权限（只修 B 端管理员权限）

## Background & Context

权限种子表（`admin-api/src/db.ts`）经历了两次演进：

1. **v1 简单权限**（第 217–251 行）：扁平、粗粒度，如 `detection:view`、`content:view`、`gene:view`，约 35 项
2. **v2 细粒度扩展**（第 253 行之后）：每个模块扩展到子功能级别，如 `detection:order:view`、`detection:report:view`、`detection:org:manage`，总计 165 项

前端菜单（`AdminLayout.tsx`）和后端路由（各 `routes/*.ts`）**仍全部使用 v1 旧 code**，而角色权限分配界面（`Role.tsx` + `PermissionSelector.tsx`）展示的是**全套 165 项权限**（v1 + v2 混合）。用户在角色里勾选 v2 细粒度 code 后，前端菜单检查不到 v1 code → 菜单错乱。

### 已确认的问题映射表（v2 menu code vs 前端菜单 permission）

| 模块           | 菜单项 | 前端当前 permission        | 对应 v2 menu code                                           | 状态    |
| ------------ | --- | ---------------------- | --------------------------------------------------------- | ----- |
| **检测预约管理**   | 父菜单 | `detection:view`       | *（无独立父 code）*                                             | ❌     |
| └ 预约订单       | 子菜单 | `detection:view`       | `detection:order:view`                                    | ❌     |
| └ 检测报告       | 子菜单 | `detection:report`     | `detection:report:view`                                   | ❌     |
| └ 检测机构       | 子菜单 | `detection:view`       | `detection:org:manage`                                    | ❌     |
| **基因信息管理**   | 父菜单 | `gene:view`            | *（无独立父 code）*                                             | ❌     |
| └ 基因档案       | 子菜单 | `gene:view`            | （仅 button code，无 menu code）                               | ❌     |
| └ 基因档案审核     | 子菜单 | `gene:audit`           | `gene:audit:view`                                         | ❌     |
| **NFT 资产管理** | 父菜单 | `nft:view`             | *（无独立父 code）*                                             | ❌     |
| └ 资产列表       | 子菜单 | `nft:view`             | （仅 button code）                                           | ❌     |
| └ 上链审核       | 子菜单 | `nft:audit`            | `nft:audit:view`                                          | ❌     |
| **赛事管理**     | 父菜单 | `competition:view`     | *（无独立父 code）*                                             | ❌     |
| └ 赛事列表       | 子菜单 | `competition:view`     | （仅 button code）                                           | ❌     |
| └ 赛事核验       | 子菜单 | `competition:verify`   | `competition:verify:view`                                 | ❌     |
| **公棚管理**     | 父菜单 | `loft:view`            | *（无独立父 code）*                                             | ❌     |
| └ 公棚列表       | 子菜单 | `loft:view`            | （仅 button code）                                           | ❌     |
| └ 入驻审核       | 子菜单 | `loft:audit`           | `loft:audit:view`                                         | ❌     |
| **拍卖管理**     | 父菜单 | `auction:view`         | *（无独立父 code）*                                             | ❌     |
| └ 拍卖场次       | 子菜单 | `auction:view`         | `auction:session:view`                                    | ❌     |
| └ 成交管理       | 子菜单 | `auction:deal`         | `auction:deal:view`                                       | ❌     |
| **仲裁管理**     | 父菜单 | `arbitration:view`     | *（无独立父 code）*                                             | ❌     |
| └ 仲裁案件       | 子菜单 | `arbitration:view`     | `arbitration:case:view`                                   | ❌     |
| **用户与会员体系**  | 父菜单 | `user:view`            | *（无独立父 code）*                                             | ❌     |
| └ 用户管理       | 子菜单 | `user:view`            | `user:list:view`                                          | ❌     |
| └ 会员等级       | 子菜单 | `member:view`          | `user:member:view`                                        | ❌     |
| └ 认证审核       | 子菜单 | `user:view`            | `user:audit:view`                                         | ❌     |
| **内容运营管理**   | 父菜单 | `content:view`         | *（无独立父 code）*                                             | ❌     |
| └ Banner 管理  | 子菜单 | `content:view`         | `content:banner:view`                                     | ❌     |
| └ 资讯管理       | 子菜单 | `content:view`         | `content:news:view`                                       | ❌     |
| └ 公告管理       | 子菜单 | `content:view`         | `content:notice:view`                                     | ❌     |
| **系统管理**     | 父菜单 | `system:view`          | *（无独立父 code）*                                             | ❌     |
| └ 管理员管理      | 子菜单 | `system:admin:manage`  | `system:admin:view`（menu） + `system:admin:manage`（button） | ⚠️ 混用 |
| └ 角色权限       | 子菜单 | `system:role:manage`   | `system:role:view`（menu） + `system:role:manage`（button）   | ⚠️ 混用 |
| └ 操作日志       | 子菜单 | `system:audit:view`    | `system:audit:view`                                       | ✅     |
| └ 系统配置       | 子菜单 | `system:config:manage` | `system:config:manage`                                    | ✅     |

**关键发现**：后端 v2 细粒度权限中，部分列表页面只有 button code 没有 menu code（如基因档案列表只有 `gene:list:create/detail/qrcode` 等 button code，没有 `gene:list:view` menu code）。这意味着权限种子表本身需要补充。

## Functional Requirements

- **FR-1**: 前端菜单 `AdminLayout.tsx` 中所有 `permission` 字段统一改为后端 v2 细粒度 **menu 类型** code

- **FR-2**: 后端权限种子表 `db.ts` 中缺失的 menu code（如 `gene:list:view`、`nft:list:view`、`competition:list:view`、`loft:list:view` 等）需要补充

- **FR-3**: 父级菜单不指定固定 permission，改用"有任一子菜单权限即显示"的 OR 逻辑（已由 `filterMenuByPermission` 的递归实现 `filter((item) => !item.children || item.children.length > 0)` 满足）

- **FR-4**: 后端路由 `requirePermission()` 检查的 code 需与前端菜单一致，避免"菜单能看到但点进去 403"

- **FR-5**: 角色权限分配界面 `PermissionSelector` 展示的权限树需与实际生效权限一致（无重复、无缺失）

- **FR-6**: 只读访客角色（预设）勾选 v2 权限后，菜单和接口访问精确匹配

## Non-Functional Requirements

- **NFR-1**: 修复后 TypeScript 编译零错误、零警告

- **NFR-2**: 现有超管（super\_admin）登录后菜单不受影响（仍显示全部）

- **NFR-3**: 权限检查响应延迟增加不超过 5ms

- **NFR-4**: 向后兼容——已存在的角色权限数据（可能只勾了旧 code 或只勾了新 code）在升级后仍能正常使用

## Constraints

- **Technical**: 不能删改现有权限种子（db.ts 中 v1 code 需保留兼容）；不能破坏已有 admin\_roles\_permissions 表中的数据

- **Business**: 修复必须让管理员能直观看到"勾了什么权限 → 显示什么菜单"的一一对应关系

- **Dependencies**: 依赖 `PermissionSelector.tsx` 的树形构建逻辑能正确展示 v2 menu code

## Assumptions

- 假设当前所有生产角色（除超管外）的权限都在 `admin_roles_permissions` 表中有记录，修复后需要让这些角色的权限 code 迁移或兼容

- 假设超管（`roles` 包含 `super_admin`）仍然通过 `isSuperAdmin()` 放行所有权限检查

- 假设前端菜单过滤逻辑 `filterMenuByPermission` 中 `hasPermission(user, item.permission)` 使用的 `user.permissions` 数组来自后端 `/api/auth/profile` 返回值（已合并角色继承 + 直接权限）

## Acceptance Criteria

### AC-1: 前端菜单 permission code 与后端权限种子一致

- **Given**: 前端菜单配置中所有子菜单项

- **When**: 检查其 `permission` 字段

- **Then**: 每个 permission 值都能在 `admin-api/src/db.ts` 权限种子表中找到对应的 v2 menu 类型 code

- **Verification**: `programmatic`

### AC-2: 后端权限种子补充缺失的 menu code

- **Given**: v2 权限种子（db.ts 第 253 行之后）

- **When**: 检查所有有前端菜单但只有 button code 没有 menu code 的模块

- **Then**: 为每个模块补充对应的 `xxx:list:view` 或 `xxx:view` menu code

- **Verification**: `programmatic`

### AC-3: 只读访客角色菜单精确控制

- **Given**: 一个角色仅勾选 `detection:order:view` + `detection:report:view`

- **When**: 以该角色登录前端

- **Then**: 左侧菜单应显示：检测预约管理 → 预约订单、检测报告；**不应显示**检测机构

- **Verification**: `human-judgment`

### AC-4: 接口访问权限与菜单一致

- **Given**: 同 AC-3 角色

- **When**: 点击"检测机构"菜单路径（或直接请求 `/api/detection/orgs`）

- **Then**: 返回 403 Forbidden（或菜单已隐藏根本无法点击）

- **Verification**: `programmatic`

### AC-5: 超管不受影响

- **Given**: super\_admin 角色账号

- **When**: 登录前端

- **Then**: 所有模块菜单正常显示、所有接口 200 OK

- **Verification**: `programmatic`

### AC-6: TypeScript 编译零错误

- **Given**: 修改后的代码

- **When**: 执行 `tsc --noEmit`（后端）和 `vite build`（前端）

- **Then**: 零错误零警告

- **Verification**: `programmatic`

### AC-7: 权限选择器展示完整无重复

- **Given**: 角色权限分配界面

- **When**: 加载权限树

- **Then**: 后端 GET /api/system/permissions 返回的数据不重复包含旧 code 和新 code 的同义项（或明确标记"兼容旧标识"）

- **Verification**: `human-judgment`

## Open Questions

- [ ] 后端路由的 requirePermission 要不要也全面升级为 v2 code？如果升级量太大（散布在 20+ 路由文件中），可否暂时保持旧 code 但确保旧 code 仍能在权限种子中找到？

- [ ] 权限种子表中旧 code（v1）是否应该标记 type='deprecated' 让 UI 不展示？还是暂时保留在 PermissionSelector 中让管理员可以继续勾选？

