# 修复用户编辑抽屉数据空白 — The Implementation Plan

## \[x] Task 1: 修复 UserList.tsx 编辑 Drawer 时序 Bug

- **Priority**: high

- **Depends On**: None

- **Description**:

  - 根因：Drawer 设置了 `destroyOnHidden`（L1614），关闭时销毁内部 Form；`openEdit` 中 `setEditModal({ visible: true, record })` 和 `editForm.setFieldsValue({...})` 同步执行，但 React setState 异步，setFieldsValue 作用在尚未挂载的 Form 上，值被丢弃

  - 修复方案：

    1. 移除 Drawer 的 `destroyOnHidden` 属性 → Form 在 Drawer 关闭时保留在 DOM 中（仅隐藏）
    2. 移除 Form 的 `preserve={false}` → 避免 Form.Item 卸载时清除值
    3. 给 `<Form>` 添加 `key={editModal.record?.id ?? 'empty'}` → 确保切换不同用户时 Form 实例重置（替代原来的 resetFields 需求）

  - 涉及文件: `admin-web/src/pages/user-member/UserList.tsx` L1614、L1624-1628

- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4

- **Test Requirements**:

  - `programmatic` TR-1.1: 打开编辑抽屉后，检查 DOM 中 nickname/phone/growth\_value input 的 value 属性非空

  - `human-judgement` TR-1.2: 目视检查 Drawer 中昵称、手机号、成长值、会员等级、状态均有值

  - `human-judgement` TR-1.3: 连续编辑不同用户，数据切换正确

- **Notes**: 移除 destroyOnHidden 后，Drawer 内部组件不会频繁销毁重建，反而有性能收益

## \[x] Task 2: 排查并修复其他模块同类 Bug

- **Priority**: medium

- **Depends On**: None

- **Description**:

  - 在 admin-web/src/pages/ 目录下搜索所有使用 Drawer + Form 组合且带 `destroyOnHidden` 的文件

  - 识别其中存在同样时序问题的编辑抽屉，按 Task 1 的方案逐一修复

  - 重点排查: Banner.tsx、News.tsx、Notice.tsx、MemberLevel.tsx、Role.tsx、Admin.tsx

  - 修复模式统一：移除 destroyOnHidden + 移除 preserve={false} + Form 加 key

- **Acceptance Criteria Addressed**: AC-1, AC-2

- **Test Requirements**:

  - `programmatic` TR-2.1: 搜索所有 pages 下含 destroyOnHidden 的 Drawer 文件，逐一确认已修复

  - `human-judgement` TR-2.2: 抽查 2-3 个其他业务模块的编辑功能，确认回填正常

- **Notes**: 如果某些 Drawer 不需要 Form 回填（如纯展示用的详情 Drawer），不需要修改

## \[x] Task 3: TypeScript 编译 + Lint 检查

- **Priority**: medium

- **Depends On**: Task 1, Task 2

- **Description**:

  - 运行前端 TypeScript 编译验证

  - 运行 ESLint 检查（如项目配置了）

- **Acceptance Criteria Addressed**: AC-5

- **Test Requirements**:

  - `programmatic` TR-3.1: `cd admin-web; npx tsc --noEmit` 退出码 0

  - `programmatic` TR-3.2: `cd admin-web; npx eslint src/pages/user-member/UserList.tsx src/pages/content/Banner.tsx ...` 无新增 error

- **Notes**: 前端项目的 package.json 中确认 tsc 和 eslint 可用

## \[x] Task 4: 浏览器端到端验收

- **Priority**: high

- **Depends On**: Task 1, Task 2, Task 3

- **Description**:

  - 启动前端开发服务器

  - 端到端验收编辑抽屉数据回填功能

  - 验证用户管理 + 至少 2 个其他业务模块的编辑功能

- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4

- **Test Requirements**:

  - `human-judgement` TR-4.1: 用户管理页面编辑抽屉正确回填所有字段

  - `human-judgement` TR-4.2: 点击确定成功提交并刷新列表

  - `human-judgement` TR-4.3: 点击取消不保存修改

  - `human-judgement` TR-4.4: 抽查 Banner 管理编辑功能，确认回填正常

- **Notes**: 服务器端口 3014


