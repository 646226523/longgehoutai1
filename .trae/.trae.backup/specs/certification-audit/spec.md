# 认证审核功能 - Product Requirement Document

## Overview
- **Summary**: 在"用户与会员体系"模块下新增独立的"认证审核"页面，将分散在用户列表中的"实名认证审核"和"鸽主认证审核"功能整合到统一的审核列表中，实现审核集中管理。
- **Purpose**: 当前审核功能分散在用户管理列表中，管理员需要在用户列表中逐个查找待审核用户，效率低下。新增独立的审核页面可以集中展示所有待审核用户，提升审核效率。
- **Target Users**: 后台管理员，负责审核用户的实名认证和鸽主认证申请。

## Goals
- **集中审核**: 将实名认证和鸽主认证的待审核申请集中展示
- **提升效率**: 管理员可以快速批量处理审核申请
- **清晰状态**: 审核状态一目了然，待审核、已通过、已驳回状态清晰可见

## Non-Goals (Out of Scope)
- 不修改用户注册流程
- 不修改认证材料上传流程
- 不实现审核后的自动通知功能
- 不修改现有用户管理页面的审核功能（保持兼容）

## Background & Context
- 当前系统：
  - 用户表有 `real_name_status`（实名认证状态）和 `loft_owner_status`（鸽主认证状态）字段
  - 审核接口已存在：`/api/user/users/:id/audit-real` 和 `/api/user/users/:id/audit-loft-owner`
  - 审核逻辑已实现（通过/驳回）
- 技术栈：React + TypeScript + Ant Design 5.x + Express + SQLite

## Functional Requirements
- **FR-1**: 新增"认证审核"菜单入口，位于"用户与会员体系"下
- **FR-2**: 审核列表支持按审核类型筛选（实名认证/鸽主认证）
- **FR-3**: 审核列表支持按审核状态筛选（待审核/已通过/已驳回）
- **FR-4**: 审核列表支持关键字搜索（用户名/手机号/真实姓名）
- **FR-5**: 点击审核行展开认证材料详情（身份证正反面、手持身份证照片等）
- **FR-6**: 支持审核通过/驳回操作，可填写审核备注
- **FR-7**: 审核完成后实时更新审核状态
- **FR-8**: 后端新增待审核用户列表查询接口

## Non-Functional Requirements
- **NFR-1**: 页面加载时间 < 2秒
- **NFR-2**: 支持分页，每页默认10条
- **NFR-3**: 与现有界面风格保持一致
- **NFR-4**: 代码改动最小化，不影响现有功能

## Constraints
- **Technical**: 
  - 前端使用 Ant Design Pro 组件库
  - 后端使用 Express + SQLite
  - 审核逻辑复用现有接口
- **Dependencies**: 依赖现有用户表结构和审核接口

## Assumptions
- 审核列表数据来源于现有 users 表
- 已完成审核的用户仍然可以查看历史审核记录
- 审核权限与现有用户编辑权限一致

## Acceptance Criteria

### AC-1: 菜单入口
- **Given**: 管理员已登录后台
- **When**: 查看左侧导航菜单
- **Then**: "用户与会员体系"下可见"认证审核"菜单项
- **Verification**: `human-judgment`

### AC-2: 审核列表展示
- **Given**: 管理员进入认证审核页面
- **When**: 页面加载完成
- **Then**: 显示所有审核记录列表，包含用户信息、审核类型、审核状态、申请时间
- **Verification**: `programmatic`

### AC-3: 筛选功能
- **Given**: 审核列表已加载
- **When**: 使用筛选条件（审核类型、审核状态、关键字）
- **Then**: 列表根据筛选条件正确过滤
- **Verification**: `programmatic`

### AC-4: 审核操作
- **Given**: 待审核记录可见
- **When**: 点击"审核通过"或"驳回"按钮
- **Then**: 弹出审核表单，可填写备注，提交后状态更新
- **Verification**: `programmatic`

### AC-5: 认证材料预览
- **Given**: 审核详情已展开
- **When**: 点击认证材料图片
- **Then**: 图片可预览放大查看
- **Verification**: `human-judgment`

### AC-6: 后端接口
- **Given**: 前端请求审核列表
- **When**: 调用审核列表接口
- **Then**: 返回正确的分页数据
- **Verification**: `programmatic`

### AC-7: TypeScript编译
- **Given**: 代码修改完成
- **When**: 运行 tsc --noEmit 检查
- **Then**: 无类型错误
- **Verification**: `programmatic`

## Open Questions
- [ ] 是否需要批量审核功能？
- [ ] 审核完成后是否需要通知用户？
- [ ] 是否需要审核统计数据？
