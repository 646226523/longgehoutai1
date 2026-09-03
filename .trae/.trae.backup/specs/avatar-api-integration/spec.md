# 头像数据接口对接 - Product Requirement Document

## Overview
- **Summary**: 修复用户详情页面中头像显示问题，将前后端用户数据接口正确对接，使用户上传的头像能够在后台管理系统中正常显示。
- **Purpose**: 当前用户详情页的头像位置显示的是用户昵称首字母，而非用户实际上传的头像图片。需要更新数据库中的avatar字段数据，确保前端能够读取并显示真实的用户头像。
- **Target Users**: 后台管理员，通过后台管理系统查看和管理C端用户信息。

## Goals
- [P0] 确保数据库中用户avatar字段存储有效的头像URL
- [P0] 确保前端正确读取和显示用户头像
- [P0] 头像加载失败时有优雅的降级处理（显示首字母）
- [P1] 支持点击头像查看大图

## Non-Goals (Out of Scope)
- 不修改后端API接口结构（已正确实现）
- 不修改前端组件结构（已正确实现）
- 不实现头像上传功能（C端用户上传头像功能不在此项目范围内）
- 不修改数据库表结构

## Background & Context
- **当前状态**: 
  - 后端API (`/api/user/users` 和 `/api/user/users/:id`) 已正确查询和返回avatar字段
  - 前端代码已正确实现：有avatar显示图片，无avatar显示首字母
  - 数据库示例数据中avatar字段为空字符串`''`
- **问题根因**: 数据库中的示例用户数据的avatar字段为空，导致前端无法显示头像图片
- **技术栈**: 
  - 后端: Express + SQLite
  - 前端: React + Ant Design + TypeScript

## Functional Requirements
- **FR-1**: 数据库中用户记录的avatar字段应包含有效的头像URL
- **FR-2**: 用户列表接口返回的用户数据应包含avatar字段
- **FR-3**: 用户详情接口返回的用户数据应包含avatar字段
- **FR-4**: 前端用户详情抽屉应显示用户头像图片
- **FR-5**: 头像加载失败时应降级显示用户昵称首字母

## Non-Functional Requirements
- **NFR-1**: 头像加载时间应小于2秒（取决于网络状况）
- **NFR-2**: 头像显示应支持点击查看大图
- **NFR-3**: 无avatar或avatar加载失败时应有优雅的降级处理

## Constraints
- **Technical**: 
  - 头像URL需支持公开访问（使用CDN或公开存储）
  - 前端使用Ant Design的Image组件显示头像
- **Business**: 使用公开可用的示例头像URL作为演示数据
- **Dependencies**: 无外部依赖

## Assumptions
- 用户上传的头像会存储在可公开访问的URL上
- 头像URL格式为http/https链接
- 前端能够直接访问头像URL（无需认证）

## Acceptance Criteria

### AC-1: 数据库avatar字段有效
- **Given**: 数据库中存在用户记录
- **When**: 查询用户数据
- **Then**: avatar字段包含有效的URL（非空字符串）
- **Verification**: `programmatic`

### AC-2: API返回avatar数据
- **Given**: 已登录管理员用户
- **When**: 调用GET /api/user/users接口
- **Then**: 返回的用户列表中每条记录包含有效的avatar字段
- **Verification**: `programmatic`

### AC-3: 前端显示真实头像
- **Given**: 用户记录包含有效的avatar URL
- **When**: 管理员打开用户详情抽屉
- **Then**: 头部身份卡片显示用户头像图片而非首字母
- **Verification**: `human-judgment`

### AC-4: 降级处理正常
- **Given**: 用户avatar字段为空或URL无效
- **When**: 管理员打开用户详情抽屉
- **Then**: 显示用户昵称的首字母作为降级显示
- **Verification**: `human-judgment`

### AC-5: 点击查看大图
- **Given**: 用户头像正常显示
- **When**: 管理员点击头像
- **Then**: 弹出大图预览
- **Verification**: `human-judgment`

## Open Questions
- [ ] 是否需要实现头像的本地存储或CDN上传功能？（当前阶段使用示例URL即可）
- [ ] 是否需要头像压缩和格式转换功能？
