# 用户列表操作栏"更多"下拉菜单 - Product Requirement Document

## Overview
- **Summary**: 在用户列表的操作列（详情、编辑按钮后）添加一个"更多"下拉菜单按钮，提供批量操作入口如重置密码、调整余额、黑名单等功能。
- **Purpose**: 当前操作列只有基础的详情、编辑和审核按钮，缺少高级运营功能入口（如重置密码、发放优惠券、调整积分等），管理员需要跳转到其他页面才能执行这些操作。
- **Target Users**: 后台管理员，需要对用户执行高级运营操作。

## Goals
- **功能入口整合**: 将分散的高级操作整合到"更多"下拉菜单中
- **UI简洁**: 保持操作列整洁，不常用功能收起到下拉菜单
- **规范统一**: 与参考截图的设计风格保持一致

## Non-Goals (Out of Scope)
- 不实现下拉菜单中每个选项的具体业务逻辑（仅实现UI和触发框架）
- 不涉及后端API的开发
- 不修改现有按钮（详情、编辑、审核）的功能

## Background & Context
- 当前页面：用户管理列表页
- 当前实现：操作列包含详情、编辑、实名审核、鸽主审核按钮
- 技术栈：React + TypeScript + Ant Design 5.x
- 参考设计：第一截图中的"更多"下拉菜单样式

## Functional Requirements
- **FR-1**: 在操作列的"详情""编辑"按钮后添加"更多"下拉按钮
- **FR-2**: 下拉菜单包含以下选项（按参考截图）：
  - 变更上级分销商
  - 设置标签
  - 重置密码
  - 发放优惠券
  - 调整余额
  - 调整积分
  - 黑名单
- **FR-3**: 每个选项点击后触发对应的操作（目前显示"功能开发中"提示）
- **FR-4**: 下拉菜单样式与参考截图一致（底部对齐的下拉面板）

## Non-Functional Requirements
- **NFR-1**: 操作列宽度需从200px调整到约280px以容纳新按钮
- **NFR-2**: 响应式布局，按钮过多时可考虑自适应
- **NFR-3**: 代码改动最小化，不影响现有功能

## Constraints
- **Technical**: 必须使用 Ant Design 5.x 的 Dropdown 组件
- **Dependencies**: 依赖 Ant Design 的 Dropdown, Button 组件

## Assumptions
- 下拉菜单选项的具体业务逻辑将在后续迭代中实现
- 当前用 message.info 提示"功能开发中"作为占位
- 所有管理员均可看到"更多"菜单（不做权限控制）

## Acceptance Criteria

### AC-1: 更多按钮显示
- **Given**: 用户列表页加载完成
- **When**: 查看操作列
- **Then**: 在"详情""编辑"按钮后可见"更多"按钮
- **Verification**: `human-judgment`

### AC-2: 下拉菜单展开
- **Given**: "更多"按钮可见
- **When**: 点击"更多"按钮
- **Then**: 弹出下拉菜单，显示7个选项
- **Verification**: `programmatic`

### AC-3: 下拉菜单样式
- **Given**: 下拉菜单已展开
- **When**: 查看菜单样式
- **Then**: 菜单为白色背景，选项左对齐，有分割线或分组，与参考截图风格一致
- **Verification**: `human-judgment`

### AC-4: 选项点击反馈
- **Given**: 下拉菜单已展开
- **When**: 点击任意选项
- **Then**: 显示对应的操作提示（如 message.info）
- **Verification**: `programmatic`

### AC-5: TypeScript编译
- **Given**: 代码修改完成
- **When**: 运行 tsc --noEmit 检查
- **Then**: 无类型错误
- **Verification**: `programmatic`

## Open Questions
- [ ] 下拉菜单中哪些选项需要权限控制？
- [ ] 是否需要将部分常用操作（如重置密码）提升到按钮行？
