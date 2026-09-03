# 认证审核功能 - Implementation Plan

## [x] Task 1: 后端新增审核列表查询接口
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 `admin-api/src/routes/user.ts` 中新增 GET `/api/user/audits` 接口
  - 查询待审核和已审核的用户列表（real_name_status 或 loft_owner_status 非 none）
  - 支持按审核类型（real_name/loft_owner）、审核状态、关键字筛选
  - 返回分页数据
- **Acceptance Criteria Addressed**: [AC-6]
- **Test Requirements**:
  - `programmatic` TR-1.1: 接口返回正确的分页数据结构 { list, total }
  - `programmatic` TR-1.2: 支持按审核类型筛选
  - `programmatic` TR-1.3: 支持按审核状态筛选
- **Notes**: 复用现有用户表结构，无需新增表

## [x] Task 2: 前端服务层新增审核列表接口
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 在 `admin-web/src/services/user.ts` 中新增 `AuditItem` 接口类型
  - 新增 `getAuditList` 函数调用后端接口
- **Acceptance Criteria Addressed**: [AC-6]
- **Test Requirements**:
  - `programmatic` TR-2.1: TypeScript类型定义正确
  - `programmatic` TR-2.2: 函数签名和返回类型正确

## [x] Task 3: 创建认证审核页面 AuditList.tsx
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 创建 `admin-web/src/pages/user-member/AuditList.tsx`
  - 使用 ProTable 组件展示审核列表
  - 列表字段：用户信息（头像、昵称、手机号）、审核类型、审核状态、申请时间
  - 支持展开行显示认证材料详情
  - 集成审核操作（通过/驳回），使用现有的 `auditUserRealName` 和 `auditUserLoftOwner` 接口
- **Acceptance Criteria Addressed**: [AC-2, AC-3, AC-4, AC-5]
- **Test Requirements**:
  - `programmatic` TR-3.1: 页面正常渲染，列表正确展示
  - `programmatic` TR-3.2: 筛选功能正常工作
  - `programmatic` TR-3.3: 审核操作功能正常
  - `human-judgement` TR-3.4: 界面风格与现有页面一致

## [x] Task 4: 注册路由和菜单配置
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 在 `admin-web/src/App.tsx` 中添加路由 `user-member/audit`
  - 在 `admin-web/src/layouts/AdminLayout.tsx` 中添加菜单项
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `programmatic` TR-4.1: 路由可访问
  - `human-judgement` TR-4.2: 菜单正确显示

## [x] Task 5: 类型检查和整体验证
- **Priority**: medium
- **Depends On**: Task 1, Task 2, Task 3, Task 4
- **Description**: 
  - 运行 TypeScript 类型检查
  - 启动前后端服务进行整体验证
  - 测试审核列表展示、筛选、审核操作
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-3, AC-4, AC-6, AC-7]
- **Test Requirements**:
  - `programmatic` TR-5.1: tsc --noEmit 无错误
  - `programmatic` TR-5.2: 页面正常加载和交互
  - `human-judgement` TR-5.3: 整体用户体验流畅
