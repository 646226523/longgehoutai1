# 修复基因档案缺失接口 - Product Requirement Document

## Overview
- **Summary**: 修复基因档案模块中 3 个后端接口缺失问题，包括鸽主搜索、足环号校验和档案搜索接口。
- **Purpose**: 消除前端调用接口不存在的错误，确保基因档案新增/编辑功能正常使用。
- **Target Users**: 管理员、基因档案录入员

## Goals
- 新增 `GET /api/gene/owners` 接口，支持按鸽主姓名关键词搜索
- 新增 `GET /api/gene/profiles/check-ring` 接口，校验足环号是否已存在
- 新增 `GET /api/gene/profiles/search` 接口，按关键词搜索基因档案

## Non-Goals (Out of Scope)
- 不修改已有接口逻辑
- 不修改前端调用逻辑

## Background & Context
- 前端 `gene.ts` 服务层定义了 3 个后端未实现的接口调用
- `searchOwners(keyword)` 调用 `GET /api/gene/owners`
- `checkRingNumber(ring_number)` 调用 `GET /api/gene/profiles/check-ring`
- `searchGeneProfiles(keyword)` 调用 `GET /api/gene/profiles/search`

## Functional Requirements
- **FR-1**: 实现鸽主搜索接口，从 `gene_profiles` 表中去重获取鸽主信息
- **FR-2**: 实现足环号校验接口，检查足环号是否存在
- **FR-3**: 实现档案搜索接口，按关键词搜索档案

## Non-Functional Requirements
- **NFR-1**: 接口需通过 JWT 鉴权
- **NFR-2**: 响应格式与现有接口一致

## Constraints
- **Technical**: Express + SQLite
- **Dependencies**: 现有数据库表 `gene_profiles`

## Assumptions
- 鸽主信息存储在 `gene_profiles` 表的 `owner_name` 和 `owner_phone` 字段
- 无需独立的鸽主表

## Acceptance Criteria

### AC-1: 鸽主搜索接口正常
- **Given**: 用户在基因档案表单中输入鸽主姓名
- **When**: 前端调用 `GET /api/gene/owners?keyword=xxx`
- **Then**: 返回匹配的鸽主列表（含 id、name、phone），无匹配时返回空数组
- **Verification**: `programmatic`

### AC-2: 足环号校验接口正常
- **Given**: 用户输入足环号
- **When**: 前端调用 `GET /api/gene/profiles/check-ring?ring_number=xxx`
- **Then**: 返回 `{ exists: true/false }`
- **Verification**: `programmatic`

### AC-3: 档案搜索接口正常
- **Given**: 用户选择父/母鸽时
- **When**: 前端调用 `GET /api/gene/profiles/search?keyword=xxx`
- **Then**: 返回匹配的档案选项列表
- **Verification**: `programmatic`

### AC-4: 前端无接口不存在错误
- **Given**: 打开新增基因档案抽屉
- **When**: 在鸽主输入框输入文字或触发足环号校验
- **Then**: 控制台不再出现"接口不存在"错误
- **Verification**: `human-judgment`
