# 资讯管理"无效的ID"错误修复 - Product Requirement Document

## Overview
- **Summary**: 修复资讯管理页面加载时出现的"无效的ID"错误。根因是 Express 路由注册顺序问题——`/news/stats` 被 `/news/:id` 抢先匹配，导致 "stats" 字符串被当作 ID 参数解析，`parseInt("stats")` 返回 NaN 后返回 400 错误。
- **Purpose**: 恢复资讯管理页面统计看板的正常数据加载，消除顶部红色错误提示。
- **Target Users**: 内容运营人员、系统管理员

## Goals
- 修复路由注册顺序，确保 `/news/stats` 正确匹配
- 消除"无效的ID"错误提示
- 恢复统计看板数据正常加载
- 验证资讯管理页面所有功能正常

## Non-Goals (Out of Scope)
- 不修改资讯管理页面的 UI 设计
- 不修改资讯 CRUD 接口
- 不添加新功能

## Background & Context
- 资讯管理页面重构已完成，包含统计看板、封面缩略图、操作按钮分组等功能
- 页面加载时调用 `getNewsStats()` 请求 `/api/content/news/stats`
- 后端路由注册顺序：`/news`(L342) → `/news/:id`(L392) → `/news/stats`(L576)
- Express 按注册顺序匹配路由，`/news/:id` 先匹配 "stats"，触发 `parseInt("stats")` 返回 NaN
- 错误信息：`fail(res, 400, '无效的 ID')`

## Functional Requirements
- **FR-1**: `/api/content/news/stats` 接口必须正确返回统计数据（total/published/draft/offline/top）
- **FR-2**: 资讯管理页面加载时不再显示"无效的ID"错误
- **FR-3**: 统计看板正常显示5个指标卡片的数值

## Non-Functional Requirements
- **NFR-1**: 修复后页面加载无错误，控制台无错误信息
- **NFR-2**: 不影响现有资讯 CRUD 接口的正常工作

## Constraints
- **Technical**: Express 路由系统，需保持路由注册顺序的正确性
- **Dependencies**: 资讯列表、详情、编辑、发布、下架、删除等接口不可受影响

## Assumptions
- 修复路由顺序是唯一需要的代码改动
- 不需要数据库变更
- 不需要前端代码变更

## Acceptance Criteria

### AC-1: 统计接口正确响应
- **Given**: 资讯管理页面已加载
- **When**: 前端请求 `/api/content/news/stats`
- **Then**: 后端返回 200 状态码和统计数据 `{ total, published, draft, offline, top }`
- **Verification**: `programmatic`

### AC-2: 页面无错误提示
- **Given**: 用户登录后台并导航到资讯管理页面
- **When**: 页面完成加载
- **Then**: 页面顶部无红色"无效的ID"错误提示
- **Verification**: `programmatic`

### AC-3: 统计看板正常显示
- **Given**: 资讯管理页面已加载
- **When**: 统计数据加载完成
- **Then**: 5个统计卡片显示正确的数值
- **Verification**: `programmatic`

### AC-4: 资讯 CRUD 接口不受影响
- **Given**: 路由顺序已修复
- **When**: 测试资讯详情、编辑、发布、下架、删除等接口
- **Then**: 所有接口正常工作，返回正确结果
- **Verification**: `programmatic`

## Open Questions
- 无
