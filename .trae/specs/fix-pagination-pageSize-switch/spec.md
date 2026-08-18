# 后台管理表格分页 pageSize 切换 Bug 修复 - Product Requirement Document

## Overview
- **Summary**: 修复后台管理系统所有页面中 ProTable 组件的分页每页条数（pageSize）切换失效的 Bug。用户点击选择「20条/页」「50条/页」「100条/页」时无法生效，始终显示 10 条/页。同时消除因分页配置不当导致的 AntD 控制台警告。
- **Purpose**: 后台管理员需要根据数据量灵活调整每页显示条数，以提高数据浏览效率。当前所有页面的分页选择器完全失效，严重影响使用体验。
- **Target Users**: 后台系统管理员、内容运营人员、审核人员

## Goals
- 修复所有 29 处 ProTable 分页配置，使 pageSize 切换功能正常工作
- 消除 AntD `dataSource length is less than pagination.total` 警告
- 提供合理的 pageSize 选项（10, 20, 50, 100）
- 保持现有页面其他功能不受影响

## Non-Goals (Out of Scope)
- 不修改表格的搜索、筛选、排序功能
- 不修改后端 API 的分页逻辑
- 不改变表格的列定义、样式、主题
- 不添加新的分页功能（如：跳转到指定页等）

## Background & Context
### 问题根因
当前所有页面的 ProTable 分页配置为静态对象：
```tsx
pagination={{ pageSize: 10, showSizeChanger: true }}
```

**核心问题**：
1. `pageSize` 是硬编码常量，不是 React state
2. 缺少 `onShowSizeChange` 回调处理
3. 缺少 `pageSizeOptions` 配置
4. 当用户切换 pageSize 时，ProTable 内部触发数据重新加载，React 重新渲染时将静态对象 `{ pageSize: 10 }` 重新应用，导致 pageSize 被重置回 10

### 受影响范围
29 处 ProTable 分页配置，分布在 23 个页面文件中：
- NFT 模块：List.tsx, Audit.tsx (×2)
- 拍卖模块：Items.tsx, Deal.tsx, Session.tsx
- 竞赛模块：List.tsx, Verify.tsx, Result.tsx
- 检测模块：Order.tsx, Report.tsx, Org.tsx
- 系统模块：Admin.tsx, Role.tsx, Dict.tsx, Config.tsx, AuditLog.tsx
- 内容模块：News.tsx, Notice.tsx, Banner.tsx
- 鸽舍模块：List.tsx, Pigeons.tsx, Audit.tsx
- 基因模块：List.tsx, Audit.tsx, Detail.tsx
- 用户模块：UserList.tsx, MemberLevel.tsx
- 仲裁模块：Case.tsx
- 统计模块：Overview.tsx (×3)

## Functional Requirements
- **FR-1**: 每个 ProTable 组件的分页配置必须使用 React state 管理 pageSize
- **FR-2**: 必须提供 `pageSizeOptions: [10, 20, 50, 100]` 选项
- **FR-3**: 必须实现 `onShowSizeChange` 回调，将新的 pageSize 同步到 state 并重新加载数据
- **FR-4**: 切换 pageSize 后，表格应立即显示对应条数的数据
- **FR-5**: 切换 pageSize 后，总数（total）和页码应正确更新
- **FR-6**: 消除 AntD 关于分页配置的控制台警告

## Non-Functional Requirements
- **NFR-1**: 所有页面修复后，TypeScript 编译零错误
- **NFR-2**: 切换 pageSize 的响应时间 < 500ms（后端 API 响应时间）
- **NFR-3**: 保持现有 URL 参数、路由逻辑不变

## Constraints
- **Technical**: 
  - 必须使用 React 18 + TypeScript
  - 使用现有 AntD ProTable 组件
  - 保持现有 Vite 开发服务器配置
- **Business**: 必须在不影响现有功能的前提下修复
- **Dependencies**: 依赖后端 API 的分页接口（已支持 page/pageSize 参数）

## Assumptions
- 后端 API 的分页接口已正确实现，支持传入 page 和 pageSize 参数
- ProTable 的 request 回调函数已正确实现，返回正确的 total 和 data
- 切换 pageSize 不需要修改搜索条件和筛选器

## Acceptance Criteria

### AC-1: 分页 pageSize 切换正常
- **Given**: 用户已登录后台，任意页面的表格已加载完成
- **When**: 用户点击分页器的「10 条/页」下拉框，选择「20 条/页」
- **Then**: 表格立即刷新并显示 20 条数据，分页器显示「20 条/页」选中状态
- **Verification**: `programmatic`

### AC-2: 多个 pageSize 选项可用
- **Given**: 表格已加载
- **When**: 用户点击「10 条/页」下拉框
- **Then**: 下拉框显示 [10, 20, 50, 100] 四个选项
- **Verification**: `human-judgment`

### AC-3: 分页数据正确加载
- **Given**: 用户已选择「50 条/页」
- **When**: 表格数据重新加载完成
- **Then**: 表格显示最多 50 条数据，页码总数 = ceil(total/50)
- **Verification**: `programmatic`

### AC-4: 切换 pageSize 后控制台无警告
- **Given**: 开发者打开浏览器 DevTools Console
- **When**: 用户切换 pageSize 并等待数据加载完成
- **Then**: Console 中不出现 `Warning: [antd: Table] dataSource length is less than pagination.total` 警告
- **Verification**: `programmatic`

### AC-5: 所有页面修复完成
- **Given**: 代码已提交
- **When**: 启动前端开发服务器，访问所有页面
- **Then**: 所有 29 处 ProTable 的 pageSize 切换功能正常
- **Verification**: `human-judgment`

### AC-6: TypeScript 编译通过
- **Given**: 代码修改完成
- **When**: 运行 `npx tsc --noEmit` 类型检查
- **Then**: 零错误通过
- **Verification**: `programmatic`

## Open Questions
- [ ] 数据量不足 10 条的页面是否仍显示 pageSize 选择器？（建议保留，为将来数据增长做准备）
