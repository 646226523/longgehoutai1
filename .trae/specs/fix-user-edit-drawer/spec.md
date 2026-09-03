# 修复用户编辑抽屉数据空白 — Product Requirement Document

## Overview

- **Summary**: 用户管理页面的"编辑"按钮点击后，编辑抽屉（Drawer）成功弹出但表单中所有可编辑字段（昵称、手机号、真实姓名、身份证号、会员等级、成长值、状态）均为空白，没有回填用户已有的数据。

- **Purpose**: 修复此 Bug 后，管理员点击编辑按钮应能看到完整的用户信息，便于在原值基础上做增量修改。

- **Target Users**: 后台管理员（运营/客服）

## Goals

- 修复编辑抽屉打开时表单字段不回填的 Bug

- 确保所有业务模块的编辑表单均能正确回填数据（不限于用户管理）

- 保留现有的表单校验、提交、取消逻辑不变

## Non-Goals (Out of Scope)

- 不修改后端 API（后端已返回完整数据）

- 不重构为 ModalForm/Drawer.Form（Ant Design ProComponents）等 ProComponents 方案

- 不添加新的表单字段或业务逻辑

## Background & Context

- **根因分析**: Drawer 设置了 `destroyOnHidden` 属性，关闭时销毁内部的 `<Form>` 组件。`openEdit` 函数中，`setEditModal({ visible: true, record })` 和 `editForm.setFieldsValue({...})` 在同一个同步调用栈内执行。React 的 `setState` 是异步批量更新，Drawer 和 Form 此时尚未挂载，`setFieldsValue` 作用在一个还不存在的 Form 实例上，值被丢弃。等 Drawer 真正渲染时，Form 已重新创建，没有初始值 → 所有字段显示空白。

- **次要因素**: Form 设置了 `preserve={false}`，该属性会让 Form.Item 在卸载时清除值。虽然本次 Bug 主因不是它，但也不应保留。

- **技术栈**: Ant Design v5.17.4 + @ant-design/pro-components + React + TypeScript

## Functional Requirements

- **FR-1**: 点击"编辑"按钮打开 Drawer 后，昵称、手机号、真实姓名、身份证号、会员等级、成长值、账号状态字段应正确显示用户已有值

- **FR-2**: 连续编辑不同用户时，表单值应跟随切换为对应用户的数据（不残留上一个用户的值）

- **FR-3**: 编辑抽屉关闭后再次打开同一用户，仍应正确回填数据

- **FR-4**: 点击"确定"提交修改后，应成功调用 updateUser API 并关闭抽屉

- **FR-5**: 点击"取消"应弹出确认框，确认后关闭抽屉

## Non-Functional Requirements

- **NFR-1**: TypeScript 编译无错误

- **NFR-2**: 表单打开后不应有闪屏（先空后填再稳定）

## Constraints

- **Technical**: 必须兼容现有 Ant Design v5 + ProComponents 版本；不引入新依赖

- **Dependencies**: 依赖后端 `/api/user/users` 接口返回完整字段（已确认可用）

## Assumptions

- 后端 API 稳定返回 nickname、phone、real\_name、id\_card、growth\_value、member\_level\_id、status 字段

- 其他业务模块的编辑抽屉（如 Banner/News/Notice/基因档案/拍卖场次等）可能存在同类问题，修复模式应统一

## Acceptance Criteria

### AC-1: 编辑抽屉正确回填数据

- **Given**: 用户列表中至少存在一条用户记录，该记录的 nickname、phone、growth\_value 等字段有值

- **When**: 管理员点击该行的"编辑"按钮

- **Then**: 编辑抽屉弹出，所有可编辑字段显示该用户的实际值（昵称≠空、手机号≠空、成长值显示真实数字、账号状态正确选中 Radio）

- **Verification**: `programmatic`（可通过 DOM 断言 input value 验证）+ `human-judgment`（人工目视检查）

### AC-2: 连续编辑不同用户不串数据

- **Given**: Drawer 已打开，当前显示用户 A 的数据

- **When**: 关闭 Drawer，对另一个用户 B 点击编辑

- **Then**: Drawer 中显示用户 B 的数据，不残留用户 A 的值

- **Verification**: `human-judgment`

### AC-3: 确认提交功能正常

- **Given**: 抽屉打开，修改了某个字段

- **When**: 点击"确定"按钮

- **Then**: 成功调用 updateUser API，提示"更新成功"，抽屉关闭，列表刷新

- **Verification**: `programmatic`（Network 面板检查请求）+ `human-judgment`

### AC-4: 取消功能正常

- **Given**: 抽屉打开，修改了某个字段

- **When**: 点击"取消"按钮

- **Then**: 弹出确认框，确认后关闭抽屉且不保存修改

- **Verification**: `human-judgment`

### AC-5: TypeScript 编译通过

- **Given**: 修复完成后代码

- **When**: 运行 `npx tsc --noEmit`

- **Then**: 退出码为 0，无错误

- **Verification**: `programmatic`

## Open Questions

- [ ] 其他业务模块（Banner/News/Notice/基因档案/拍卖等）是否存在同类时序 Bug？本次是否一并修复？→ 建议本次一并排查修复

