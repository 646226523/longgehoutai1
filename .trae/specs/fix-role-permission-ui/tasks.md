# 角色权限选择器层级化重构 - The Implementation Plan

## \[x] Task 0: 修复两条 Ant Design 弃用警告

* **Priority**: high

* **Depends On**: None

* **Description**:

  * Card 的 `bodyStyle={{ padding: 16 }}` → `styles={{ body: { padding: 16 } }}`

  * Spin 的 `<Spin tip="..." />` → 包裹子元素形式 `<Spin tip="..."><div /></Spin>` 或改用独立 Loading 提示方式

  * 涉及文件: `admin-web/src/pages/system/Role.tsx` 两处定位 (line \~230 和 line \~775)

* **Acceptance Criteria Addressed**: AC-1, AC-2, AC-8

* **Test Requirements**:

  * `programmatic` TR-0.1: `npx tsc --noEmit` 退出码 0

  * `programmatic` TR-0.2: 打开弹窗后浏览器 console 无 Card bodyStyle 弃用警告

  * `programmatic` TR-0.3: 打开弹窗后浏览器 console 无 Spin tip 弃用警告

## [x] Task 1: 重构 PermissionSelector 为 Tree 组件 + 从 code 解析层级

* **Priority**: high

* **Depends On**: Task 0

* **Description**:

  * 移除现有折叠视图 + 分类视图的双模式逻辑

  * 新增 `buildTreeFromGroups(groups: PermissionGroup[]): TreeNode[]` 函数，根据 permission code 冒号分段自动构建多级树

    * 算法: 遍历所有 PermissionNode，按 module 归入一级节点，再解析 code 的 `:` 拆段作为中间层级，最终叶子节点是原始 PermissionNode（保留 id 用于提交）

    * 树节点 key 规则：父节点用 `virtual:${module}` 或 `virtual:${path}`，叶子节点用 `perm:${id}`（保持与后端 ID 的映射）

  * 替换现有 Checkbox + 自定义样式为 Ant Design Tree (`checkable`, `defaultExpandAll`)

  * Tree 的 `checkedKeys` 使用 `{ checked, halfChecked }` 对象处理父子关联

  * Tree 的 `onCheck` 回调从 checked + halfChecked 中提取所有 `perm:` 开头的 key，截取数字 ID 传给后端

  * Tree node title 模板：`<Space><Checkbox checked={...}/> <Icon/> <span>名称</span> <Tag>类型</Tag> <Tag>code</Tag></Space>`

* **Acceptance Criteria Addressed**: AC-3, AC-4

* **Test Requirements**:

  * `programmatic` TR-1.1: `buildTreeFromGroups` 对 3 段式 code (如 `system:admin:manage`) 生成 3 级路径的 Tree node

  * `programmatic` TR-1.2: 所有叶子节点的 key 格式为 `perm:{id}`，非叶子节点 key 不含数字 ID

  * `human-judgement` TR-1.3: Tree 渲染后可以看到清晰的模块→子功能→叶子节点三级层级（至少 system 模块应展示三级）

  * `human-judgement` TR-1.4: 选中父节点 → 子节点全选；所有子节点选中 → 父节点自动选中；部分子节点选中 → 父节点显示半选

## [x] Task 2: 实现工具栏（全局操作 + 父子关联开关 + 实时统计）

* **Priority**: high

* **Depends On**: Task 1

* **Description**:

  * 在 Tree 上方渲染工具栏，包含：

    * 左侧：`已选择 X / Y 项权限` 统计（X=checkedPermIds.size，Y=所有叶子节点总数）

    * 右侧：\[父子关联 Segmented 开关] / \[全部展开/收起] / \[全选] / \[清空]

  * 全部展开 / 收起 通过维护 `expandedKeys` state 并传 Tree 的 `expandedKeys` + `onExpand` 实现

  * 全选 / 清空 直接操作 `checkedKeys` state

* **Acceptance Criteria Addressed**: AC-5

* **Test Requirements**:

  * `human-judgement` TR-2.1: 点击全选后所有叶子节点选中，统计更新

  * `human-judgement` TR-2.2: 点击清空后所有取消选中，统计归零

  * `human-judgement` TR-2.3: 展开/收起按钮可折叠/展开所有模块

## [x] Task 3: 提交逻辑适配 + 编辑权限回显

* **Priority**: high

* **Depends On**: Task 2

* **Description**:

  * 提交时从 Tree `checkedKeys` 中过滤 `perm:` 开头的叶子节点，截取 ID 后传给 `assignRolePermissions`

  * 打开编辑弹窗时，调用 `getRolePermissions(roleId)` 获取已分配的 ID 数组，构建 Tree checkedKeys（`perm:${id}` 形式）

  * 确保 modal 打开时先加载权限数据，再加载角色已有权限，避免回显顺序问题

* **Acceptance Criteria Addressed**: AC-6, AC-7

* **Test Requirements**:

  * `programmatic` TR-3.1: 提交时 PUT /api/system/roles/:id/permissions 请求体的 permission\_ids 为 number\[]

  * `human-judgement` TR-3.2: 编辑已分配权限的角色时，权限树正确回显

  * `human-judgement` TR-3.3: 按钮显示 `创建角色并分配权限(N 项)`，N 与实际选中数一致

## [x] Task 4: 浏览器验证 + 控制台零警告

* **Priority**: medium

* **Depends On**: Task 0, Task 1, Task 2, Task 3

* **Description**:

  * 启动前端服务器（如未运行）

  * 访问 system/role → 新增角色 → 查看权限树渲染

  * 验证折叠/展开、勾选、父子关联、全选/清空、提交

  * 查看 console 是否有 Card bodyStyle / Spin tip 警告残留

* **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3\~AC-7

* **Test Requirements**:

  * `programmatic` TR-4.1: Console 无 Ant Design 弃用警告

  * `human-judgement` TR-4.2: 所有功能手动测试通过

## [x] Task 5: TypeScript 编译检查

* **Priority**: medium

* **Depends On**: Task 4

* **Description**: 运行 `npx tsc --noEmit --pretty` 确认零错误

* **Acceptance Criteria Addressed**: AC-8

* **Test Requirements**:

  * `programmatic` TR-5.1: tsc 退出码为 0

