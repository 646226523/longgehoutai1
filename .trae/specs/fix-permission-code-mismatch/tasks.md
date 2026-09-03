# 角色权限 Code 映射错乱修复 — 实现计划

## \[/] Task 1: 后端权限种子补充缺失的 v2 menu code

- **Priority**: high

- **Depends On**: None

- **Description**:

  - 在 `admin-api/src/db.ts` 的 v2 细粒度权限区域（第 253 行之后），为每个前端有菜单但 v2 只有 button code 没有 menu code 的模块补充对应的 `xxx:list:view` menu 类型权限

  - 需补充的菜单级 code：

    - `gene:list:view` — 基因档案列表页

    - `nft:list:view` — NFT 资产列表页

    - `competition:list:view` — 赛事列表页

    - `loft:list:view` — 公棚列表页

    - `user:list:view` — 用户管理（已有，确认）

  - 补充后删除旧的 SQLite 数据库文件让种子重新初始化（或手动 INSERT）

- **Acceptance Criteria Addressed**: AC-2

- **Test Requirements**:

  - `programmatic` TR-1.1: db.ts 中新增的 5 条 menu code 行的格式与现有 code 行完全一致（5 元组：\[code, name, module, 'menu', description]）

  - `programmatic` TR-1.2: 重启后端后 GET /api/system/permissions 返回的权限树中每个模块都至少有 1 条 menu 类型权限

  - `human-judgement` TR-1.3: PermissionSelector 权限树中各模块节点结构清晰，menu 类型权限正确标记为"菜单"

- **Notes**: 需备份或删除 `admin-api/data/admin.db` 让权限种子重新插入；或使用 SQL `INSERT OR IGNORE INTO permissions (...) VALUES (...)`

## \[ ] Task 2: 前端菜单 permission code 统一升级为 v2 menu code

- **Priority**: high

- **Depends On**: Task 1

- **Description**:

  - 修改 `admin-web/src/layouts/AdminLayout.tsx` 中的 `menuData` 数组，将所有 `permission` 字段从 v1 旧 code 改为 Task 1 确认的 v2 menu code

  - 父级菜单移除固定 permission（依赖子菜单的 OR 逻辑自然过滤）

  - 改动清单：

    | 菜单项       | 旧 permission          | 新 permission              |
    | --------- | --------------------- | ------------------------- |
    | 基因档案      | `gene:view`           | `gene:list:view`          |
    | 基因档案审核    | `gene:audit`          | `gene:audit:view`         |
    | 资产列表      | `nft:view`            | `nft:list:view`           |
    | 上链审核      | `nft:audit`           | `nft:audit:view`          |
    | 赛事列表      | `competition:view`    | `competition:list:view`   |
    | 赛事核验      | `competition:verify`  | `competition:verify:view` |
    | 公棚列表      | `loft:view`           | `loft:list:view`          |
    | 入驻审核      | `loft:audit`          | `loft:audit:view`         |
    | 预约订单      | `detection:view`      | `detection:order:view`    |
    | 检测报告      | `detection:report`    | `detection:report:view`   |
    | 检测机构      | `detection:view`      | `detection:org:manage`    |
    | 拍卖场次      | `auction:view`        | `auction:session:view`    |
    | 成交管理      | `auction:deal`        | `auction:deal:view`       |
    | 仲裁案件      | `arbitration:view`    | `arbitration:case:view`   |
    | 用户管理      | `user:view`           | `user:list:view`          |
    | 会员等级      | `member:view`         | `user:member:view`        |
    | 认证审核      | `user:view`           | `user:audit:view`         |
    | Banner 管理 | `content:view`        | `content:banner:view`     |
    | 资讯管理      | `content:view`        | `content:news:view`       |
    | 公告管理      | `content:view`        | `content:notice:view`     |
    | 管理员管理     | `system:admin:manage` | `system:admin:view`       |
    | 角色权限      | `system:role:manage`  | `system:role:view`        |

  - 父级菜单 permission 处理：保留旧 v1 code 作为兜底（超管全放行，非超管靠子菜单 OR 逻辑）

- **Acceptance Criteria Addressed**: AC-1, AC-3

- **Test Requirements**:

  - `programmatic` TR-2.1: 修改后的 menuData 中每个子菜单的 permission 字段值都能在 Task 1 确认的 v2 menu code 列表中找到

  - `programmatic` TR-2.2: `vite build` 或 `tsc --noEmit` 无 TypeScript 错误

  - `human-judgement` TR-2.3: 以只读访客角色（仅勾 `detection:order:view` + `detection:report:view`）登录，菜单只显示检测预约管理 → 预约订单 + 检测报告，**不显示**检测机构

- **Notes**: system 模块的 admin/role 菜单需要同时有 menu code（查看页面）和 button code（执行操作），菜单用 menu code 即可

## \[ ] Task 3: 后端路由 requirePermission 渐进升级 + v1→v2 兼容映射

- **Priority**: high

- **Depends On**: Task 1, Task 2

- **Description**:

  - 修改 `admin-api/src/middlewares/auth.ts` 中的 `requirePermission` 或 `getAdminPermissions`，建立 v1→v2 code 兼容映射表

  - 兼容方案：在 `getAdminPermissions` 返回用户权限列表时，如果用户有某个 v2 code，自动追加所有关联的 v1 code 到 permissions 数组中，让旧路由检查也能通过

  - 映射表（需要覆盖所有仍在后端路由中使用的 v1 code）：

    ```
    content:view → content:news:view, content:banner:view, content:notice:view
    content:edit → content:news:edit, content:banner:edit, content:notice:edit
    gene:view → gene:list:view, gene:list:detail
    gene:edit → gene:list:create, gene:list:edit
    gene:audit → gene:audit:view, gene:audit:pass, gene:audit:reject
    detection:view → detection:order:view
    detection:report → detection:report:view, detection:report:create
    loft:view → loft:list:view
    loft:create → （无对应 v2，保留）
    loft:edit → （无对应 v2，保留）
    loft:audit → loft:audit:view
    nft:view → nft:list:view
    nft:edit → nft:list:create, nft:list:edit
    nft:audit → nft:audit:view
    competition:view → competition:list:view
    competition:edit → competition:list:create, competition:list:edit
    competition:verify → competition:verify:view
    auction:view → auction:session:view, auction:items:view
    auction:edit → auction:session:create, auction:session:edit
    auction:deal → auction:deal:view
    arbitration:view → arbitration:case:view
    arbitration:judge → （无对应 v2，保留）
    user:view → user:list:view, user:audit:view
    user:edit → user:list:edit, user:audit:pass, user:audit:reject
    member:view → user:member:view
    member:edit → user:member:create, user:member:edit
    statistics:view → （无对应 v2，保留）
    system:admin → system:admin:view, system:admin:manage
    system:role → system:role:view, system:role:manage
    system:audit → system:audit:view
    system:config → system:config:manage
    ```

  - 实现位置：在 `getAdminPermissions` 返回 `merged` Set 之前，遍历所有 v1→v2 映射，检查用户是否有任意一个 v2 code，有则追加对应的 v1 code 到 Set

  - 最终实现：双向映射（v2 用户权限 → 自动追加 v1 兼容权限），让前端菜单（v2）和后端旧路由（v1）都能通过

- **Acceptance Criteria Addressed**: AC-4, AC-5

- **Test Requirements**:

  - `programmatic` TR-3.1: 拥有 `detection:order:view` + `detection:report:view` 的用户，请求 GET /api/detection/orders 返回 200，请求 GET /api/detection/orgs 返回 403

  - `programmatic` TR-3.2: 超管请求任意 API 均返回 200（不受兼容映射逻辑影响）

  - `human-judgement` TR-3.3: 前端菜单显示与接口可访问性完全一致（能看到就能访问，看不到就 403）

- **Notes**: 这是最安全的渐进方案，不要求一次性修改所有后端路由；未来可逐步将后端路由 requirePermission 升级为 v2 code，届时可以删除兼容映射

## \[ ] Task 4: 验证与回归测试

- **Priority**: high

- **Depends On**: Task 1, Task 2, Task 3

- **Description**:

  - 重启前后端服务器

  - 清理旧 SQLite 数据库让权限种子重新初始化（或手动 INSERT 补充的 menu code）

  - 端到端验证所有角色的菜单显示和接口访问

- **Acceptance Criteria Addressed**: AC-1 \~ AC-7

- **Test Requirements**:

  - `programmatic` TR-4.1: 前后端 TypeScript 编译零错误

  - `programmatic` TR-4.2: 超管登录 → 全部 11 个模块菜单正常显示

  - `programmatic` TR-4.3: 只读访客角色（仅 detection:order:view + detection:report:view）→ 仅显示检测预约管理子菜单，且只能访问 orders/report 接口

  - `human-judgement` TR-4.4: 控制台零权限相关警告或错误

- **Notes**: 实际测试时可新建一个测试角色精确勾选 v2 code 来验证

