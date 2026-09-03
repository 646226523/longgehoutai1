# 用户头像前后端数据对接 - Product Requirement Document

## Overview
- **Summary**: 修复用户详情页面头像不显示的问题，确保前端能够正确读取并显示后端返回的用户头像数据，实现前后端用户数据接口的完整对接。
- **Purpose**: 当前用户详情页的头像无法正常显示，根因是数据库中avatar字段可能为空或内联SVG格式不正确。需要修复数据层、确保API正确返回、前端正确渲染。
- **Target Users**: 后台管理员，通过后台管理系统查看和管理C端用户信息。

## Goals
- [P0] 确保数据库中用户avatar字段存储有效的头像数据URL
- [P0] 确保后端API接口正确返回avatar字段
- [P0] 确保前端详情抽屉正确显示用户头像图片
- [P1] 头像加载失败时有优雅的降级处理（显示首字母）
- [P1] 支持点击头像查看大图

## Non-Goals (Out of Scope)
- 不修改数据库表结构
- 不实现头像上传功能（C端用户上传头像功能不在此项目范围内）
- 不修改用户详情页的Tab内容区

## Background & Context
- **当前状态**:
  - 后端API (`/api/user/users` 和 `/api/user/users/:id`) 已正确查询和返回avatar字段
  - 前端代码已实现头像显示逻辑：有avatar显示图片，无avatar显示首字母
  - `db.ts` 中已实现 `generateAvatarDataUrl` 函数生成内联SVG头像
  - 数据库文件 `admin.db` 已存在，可能包含旧数据
- **问题根因**:
  1. 数据库可能未重新初始化，旧数据中avatar字段为空
  2. 内联SVG data URL格式可能存在问题
  3. 前端Image组件可能无法正确渲染内联SVG
- **技术栈**:
  - 后端: Express + SQLite (better-sqlite3)
  - 前端: React + Ant Design 5.x + TypeScript

## Functional Requirements
- **FR-1**: 数据库中用户记录的avatar字段应包含有效的头像data URL
- **FR-2**: 用户列表接口 GET /api/user/users 返回的用户数据应包含有效的avatar字段
- **FR-3**: 用户详情接口 GET /api/user/users/:id 返回的用户数据应包含有效的avatar字段
- **FR-4**: 前端用户详情抽屉应显示用户头像图片（通过Image组件）
- **FR-5**: 头像加载失败时应降级显示用户昵称首字母（通过Avatar组件）
- **FR-6**: 头像支持点击查看大图功能

## Non-Functional Requirements
- **NFR-1**: 头像加载时间应小于2秒
- **NFR-2**: 无avatar或avatar加载失败时应有优雅的降级处理
- **NFR-3**: 浏览器控制台无图片加载错误
- **NFR-4**: 页面刷新后头像仍然正常显示

## Constraints
- **Technical**:
  - 头像数据使用内联SVG data URL格式（避免外部网络依赖）
  - 前端使用Ant Design的Image组件显示头像
  - 数据库初始化逻辑是幂等的，需要删除现有数据库以触发重新初始化
- **Business**: 使用内联SVG生成示例头像作为演示数据
- **Dependencies**: 无外部依赖

## Assumptions
- 内联SVG data URL能被主流浏览器正确渲染
- Ant Design的Image组件支持data URL格式
- 用户接受使用生成的彩色SVG头像作为演示数据

## Acceptance Criteria

### AC-1: 数据库avatar字段有效
- **Given**: 数据库中存在用户记录
- **When**: 查询用户数据
- **Then**: avatar字段包含有效的data URL字符串（以data:image/svg+xml开头）
- **Verification**: `programmatic`
- **Notes**: 验证数据库中至少5个用户的avatar字段非空

### AC-2: API返回avatar数据
- **Given**: 已登录管理员用户
- **When**: 调用GET /api/user/users接口
- **Then**: 返回的用户列表中每条记录包含有效的avatar字段
- **Verification**: `programmatic`

### AC-3: 前端显示真实头像
- **Given**: 用户记录包含有效的avatar URL
- **When**: 管理员打开用户详情抽屉
- **Then**: 头部身份卡片显示用户头像图片（通过Image组件渲染，有ant-image-img元素）
- **Verification**: `human-judgment`

### AC-4: 降级处理正常
- **Given**: 用户avatar字段为空或URL无效
- **When**: 管理员打开用户详情抽屉
- **Then**: 显示用户昵称的首字母作为降级显示
- **Verification**: `human-judgment`

### AC-5: 点击查看大图
- **Given**: 用户头像正常显示
- **When**: 管理员点击头像
- **Then**: 弹出大图预览（Image.PreviewGroup功能）
- **Verification**: `human-judgment`

### AC-6: 控制台无错误
- **Given**: 用户详情抽屉打开
- **When**: 检查浏览器控制台
- **Then**: 无TypeError和图片加载错误
- **Verification**: `programmatic`

## Open Questions
- [ ] 是否需要实现头像的本地存储或CDN上传功能？（当前阶段使用内联SVG即可）
- [ ] 内联SVG的编码方式是否需要调整以兼容所有浏览器？
