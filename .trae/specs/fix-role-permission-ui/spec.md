# 角色权限选择器层级化重构 - Product Requirement Document

## Overview

* **Summary**: 修复新增角色弹窗中产生的两条 Ant Design 弃用警告，同时将权限选择器从扁平化模块分组重构为**多级树形层级结构**（一级：菜单/模块 → 二级：主功能 → 三级：子功能/按钮/操作），参照用户提供的后台权限管理截图模板，使用户可以逐级勾选每一项功能权限。

* **Purpose**: 当前权限选择器已集成到弹窗内（对比之前的独立抽屉是重大改进），但存在两个问题：(1) AntD 5.x 弃用 API 产生 console warning；(2) 权限仍是扁平的 module 分组，未体现层级关系，与实际系统菜单的一级→二级→三级导航结构不一致，操作人员在权限较多时难以快速定位。

* **Target Users**: 后台管理员（admin / operator），需要创建或编辑角色并精确分配权限。

## Goals

* 修复 2 条 console warning（`Card.bodyStyle` + `Spin.tip` 非嵌套模式）

* 用 Ant Design Tree 组件重构权限选择器，支持 checkable、父子级联（checkStrict=false 或 true 可切换）、动态展开

* 根据权限 code 冒号结构（如 `system:admin:manage`）自动解析并构建多级树节点

* 树节点 title 同时展示：权限名称 + 类型标签 + 编码 Tag + 描述 Tooltip

* 支持全局全选 / 全局清空 / 模块级全选

* 保留实时统计：已选择 X / Y 项权限

* 底部操作按钮展示权限数量，并在按钮区域提供清空、取消、创建按钮

## Non-Goals (Out of Scope)

* **不修改数据库 schema**（permissions 表不加 parent\_id 字段），层级由前端根据 code 冒号动态推断

* **不修改后端接口**（GET /api/system/permissions 保持返回 module 分组的扁平列表）

* **不新增/删减权限种子数据**（当前约 20 条权限已足够展示层级效果）

* **不做权限 CRUD 管理界面**（仅选择分配，不新增/编辑权限定义）

* **不重构角色列表页的其他部分**（如表格、搜索、删除确认）

## Background & Context

* 当前权限种子数据共有 20 条权限，分布在 11 个 module 中（gene / nft / competition / loft / detection / auction / arbitration / user / content / statistics / system）

* code 命名规范为 `module:sub:action` 三段式或 `module:action` 两段式，例如 `system:admin:manage`、`user:view`

* Ant Design 版本为 ^5.17.4，`Card.bodyStyle` 已弃用 → 改为 `styles={{ body: {...} }}`；`Spin.tip` 仅在包裹子元素时生效

* 项目已有 RBAC 接口：`createRole` → `assignRolePermissions(roleId, ids)`

* 后端 `/api/system/permissions` 返回格式：`PermissionGroup[]`（按 module 分组，每组含 permissions: PermissionNode\[]）

## Functional Requirements

* **FR-1**: 修复 `Card` 的 `bodyStyle` 弃用警告，改为 `styles={{ body: { padding: 16 } }}`

* **FR-2**: 修复 `Spin` 的 `tip` 警告，将 `Spin tip="..." />` 改为包裹子元素的嵌套模式

* **FR-3**: 前端收到扁平权限列表后，根据 code 冒号 `:` 拆分段构建树形结构

  * 无冒号 → 一级节点

  * 一段冒号（两段）→ 一级 + 二级叶节点

  * 两段冒号（三段）→ 一级 + 二级 + 三级叶节点

  * module 本身作为一级节点（可独立存在即使该模块下权限 code 全部是两段式）

* **FR-4**: 树形结构使用 Ant Design `Tree` 组件，启用 `checkable`、支持 `checkStrict` 切换（父子不关联 vs 父子关联）、默认展开全部节点

* **FR-5**: 每个树节点 title 展示样式：

  * 模块/菜单节点：📁 图标 + 分组名 + 权限数量 Tag

  * 主功能节点：📂 图标 + 功能名

  * 子功能/按钮节点：✅ Checkbox + 名称 + 类型彩色 Tag（menu 蓝/button 橙/api 紫） + 等宽字体编码 Tag

  * description 以 Tooltip 方式呈现

* **FR-6**: 全局工具栏包含：\[已选 X/Y] 统计 / \[父子关联 开关] / \[全部展开] / \[全部收起] / \[全选] / \[清空]

* **FR-7**: 勾选状态正确传递给提交逻辑（仅叶子节点的 id 数组传给 `assignRolePermissions`）

* **FR-8**: 编辑角色打开弹窗时，已分配权限从 `getRolePermissions` 加载并正确回显到 Tree 选中状态

* **FR-9**: 底部 submitter 按钮：取消 / 清空权限 / 创建角色并分配权限(N 项)

## Non-Functional Requirements

* **NFR-1**: TypeScript 编译零错误零警告

* **NFR-2**: 浏览器 console 无 Ant Design 弃用 warning

* **NFR-3**: 新增角色弹窗宽度 ≥ 900px，树形区域最小高度 400px 可滚动

* **NFR-4**: 父子级联关系正确：选中父节点 = 选中全部子节点；所有子节点选中 = 父节点自动选中；取消任一子节点 = 父节点变为半选 (indeterminate)

* **NFR-5**: 空权限数据时显示 Empty 组件友好提示

## Constraints

* **Technical**: 仅前端修改 Role.tsx 一个文件，后端和数据库零改动

* **Dependencies**: Ant Design 5.x 的 Tree 组件 checkable + halfChecked 行为

* **Dependencies**: 权限 code 命名规范必须保持 `:` 分段，才能正确推断层级

## Assumptions

* 权限 code 的冒号分段语义稳定（第一段=module，第二段=主功能，第三段=具体操作）

* 同一 module 下的权限不会跨多个顶级子系统（如 system 下不会出现 gene:xxx）

* Tree 的 checkStrict=false（默认父子关联）满足用户需求，checkStrict=true 可作为额外开关

## Acceptance Criteria

### AC-1: Card bodyStyle 弃用警告已修复

* **Given**: 打开新增角色弹窗，查看浏览器控制台

* **When**: 弹窗完全渲染后

* **Then**: 控制台无 `[antd: Card] bodyStyle is deprecated` 警告

* **Verification**: `programmatic`

### AC-2: Spin tip 警告已修复

* **Given**: 打开新增角色弹窗（首次加载权限数据过程中）

* **When**: 权限数据异步加载期间

* **Then**: 控制台无 `[antd: Spin] tip only work in nest or fullscreen pattern` 警告

* **Verification**: `programmatic`

### AC-3: 权限以多级树结构呈现

* **Given**: 用户打开新增角色弹窗，权限数据加载完成

* **When**: 查看权限选择区域

* **Then**: 权限以"一级模块 → 二级主功能 → 三级子功能/按钮"的层级形式展示，而不是扁平分组

* **Verification**: `human-judgment`

* **Notes**: 可通过查看 system 模块（system:admin:manage、system:role:manage、system:audit:view、system:config:manage）验证三级结构

### AC-4: 父子级联勾选行为正确

* **Given**: Tree checkable 模式开启

* **When**: 用户勾选某父节点

* **Then**: 所有后代节点自动被勾选；所有后代都勾选时父节点显示全选；部分后代勾选时父节点显示半选 (indeterminate)

* **Verification**: `human-judgment`

### AC-5: 全局操作按钮功能正常

* **Given**: 权限树已渲染

* **When**: 用户分别点击 "全选"、"清空"、"全部展开"、"全部收起"

* **Then**: 对应功能正确执行，统计数字实时更新

* **Verification**: `human-judgment`

### AC-6: 勾选状态正确提交

* **Given**: 用户勾选了若干权限节点

* **When**: 用户点击 "创建角色并分配权限(N 项)" 按钮

* **Then**: `assignRolePermissions` 收到的 permission\_ids 是所有被勾选的叶子节点 ID 数组（不含父节点虚拟 ID）

* **Verification**: `programmatic`

* **Notes**: 可在 Network 面板查看 PUT /api/system/roles/:id/permissions 请求体

### AC-7: 编辑角色时权限正确回显

* **Given**: 某角色已分配若干权限

* **When**: 用户点击该角色的 "编辑权限" 按钮

* **Then**: 权限树自动将已分配权限标记为选中状态，其父节点正确显示全选/半选状态

* **Verification**: `human-judgment`

### AC-8: TypeScript 编译零错误

* **Given**: 修改完成

* **When**: 运行 `npx tsc --noEmit`

* **Then**: 退出码为 0，无错误输出

* **Verification**: `programmatic`

## Open Questions

* 无（用户需求已明确：先修 warning，再做树形层级）

