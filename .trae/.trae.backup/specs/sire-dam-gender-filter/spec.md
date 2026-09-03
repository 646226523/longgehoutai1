# 父鸽/母鸽性别筛选功能 - Product Requirement Document

## Overview
- **Summary**: 修复基因档案表单中父鸽和母鸽选择器的筛选逻辑，使其根据性别属性进行精准筛选。父鸽选择器只显示雄性鸽子，母鸽选择器只显示雌性鸽子，提升用户体验和数据准确性。
- **Purpose**: 当前父鸽和母鸽选择器搜索时不区分性别，用户需要从混合结果中手动筛选，容易选错且效率低。
- **Target Users**: 后台管理员，负责基因档案的录入和管理。

## Goals
- 父鸽选择器只展示雄性鸽子（gender = 'male'）
- 母鸽选择器只展示雌性鸽子（gender = 'female'）
- 支持关键词搜索时结合性别筛选
- 编辑模式下已保存的父鸽/母鸽数据能正确回显

## Non-Goals (Out of Scope)
- 不修改鸽子性别字段本身的编辑逻辑
- 不实现性别字段的批量修改功能
- 不改变现有选择器的 UI 交互模式

## Background & Context
- 技术栈：React + Ant Design 前端，Express + SQLite 后端
- 现有搜索接口 `GET /api/gene/profiles/search` 不支持 `gender` 参数筛选
- 现有前端服务 `searchGeneProfiles(keyword)` 只支持关键词搜索
- 父鸽选择器使用 `mode="tags"` 模式，支持手动输入新鸽名

## Functional Requirements
- **FR-1**: 后端 `/api/gene/profiles/search` 接口支持 `gender` 查询参数，当传入时按性别筛选结果
- **FR-2**: 前端 `searchGeneProfiles` 函数支持传入 `gender` 参数
- **FR-3**: 父鸽选择器搜索时传递 `gender='male'` 参数
- **FR-4**: 母鸽选择器搜索时传递 `gender='female'` 参数
- **FR-5**: 编辑模式下已有父鸽/母鸽数据时，回显选项不受性别筛选限制（因为需要显示已保存的数据）

## Non-Functional Requirements
- **NFR-1**: 搜索响应时间不超过 500ms
- **NFR-2**: 代码保持与现有风格一致
- **NFR-3**: 构建无 TypeScript 错误

## Constraints
- **Technical**: 
  - 现有后端基于 Express + better-sqlite3
  - 前端使用 React + Ant Design v5
  - 项目使用 TypeScript
- **Business**: 无特殊约束
- **Dependencies**: 无外部依赖

## Assumptions
- 性别字段 `gender` 存储的值为：`male`、`female`、`unknown`
- 现有 `gene_profiles` 表的 `gender` 字段已存在
- 编辑模式下的 defaultOptions 已经包含了已保存的父鸽/母鸽信息

## Acceptance Criteria

### AC-1: 父鸽选择器只显示雄性
- **Given**: 用户在基因档案新增/编辑页面
- **When**: 聚焦父鸽选择器或输入关键词搜索
- **Then**: 下拉选项中只包含性别为 'male' 的鸽子
- **Verification**: `programmatic`
- **Notes**: 检查后端返回数据的 gender 字段

### AC-2: 母鸽选择器只显示雌性
- **Given**: 用户在基因档案新增/编辑页面
- **When**: 聚焦母鸽选择器或输入关键词搜索
- **Then**: 下拉选项中只包含性别为 'female' 的鸽子
- **Verification**: `programmatic`

### AC-3: 编辑模式回显正常
- **Given**: 用户编辑已有基因档案，该档案已保存父鸽和母鸽信息
- **When**: 打开编辑页面
- **Then**: 已保存的父鸽和母鸽数据能正确回显显示
- **Verification**: `programmatic`

### AC-4: 手动输入不受限制
- **Given**: 用户在父鸽/母鸽选择器中
- **When**: 用户输入一个不存在的鸽名（tags 模式）
- **Then**: 可以正常添加该名称作为新值
- **Verification**: `human-judgment`

### AC-5: 构建通过
- **Given**: 代码修改完成
- **When**: 运行 `npm run build`
- **Then**: 构建成功，无 TypeScript 错误
- **Verification**: `programmatic`

## Open Questions
- [ ] 编辑模式下，如果已保存的父鸽性别为 'unknown'，是否仍应显示？（默认行为：显示，因为这是已保存的数据）
