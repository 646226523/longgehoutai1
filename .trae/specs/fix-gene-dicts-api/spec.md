# 基因档案新增页面 - 修复字典接口缺失 Bug

## Overview
- **Summary**: 修复基因档案模块中"新增档案"功能无法正常使用的严重 Bug。核心问题是前端 `GET /api/gene/dicts` 接口调用失败（后端未实现该接口），导致新增档案弹窗打开时出现错误，且"品种"和"血统"等 AutoComplete 字段无选项可选，整个表单无法填写信息。
- **Purpose**: 恢复基因档案新增/编辑功能的可用性，确保管理员可以正常添加基因档案信息。
- **Target Users**: 系统管理员、基因档案管理人员

## Goals
- 新增后端 `GET /api/gene/dicts` 接口，返回基因档案表单所需的全部字典数据
- 修复前端因接口缺失导致的错误提示和功能异常
- 确保品种、血统等字段在无字典数据时仍可自由输入（不阻塞输入）
- 构建验证通过，无 TypeScript 错误

## Non-Goals (Out of Scope)
- 不修改基因档案的业务逻辑和数据模型
- 不重构表单组件架构
- 不添加字典数据管理功能（如后台维护字典选项）

## Background & Context
- 技术栈：React + Ant Design v5 前端，Express + SQLite 后端
- 前端 `GeneForm.tsx` 组件在 `useEffect` 中调用 `getGeneDicts()` 获取字典数据
- `services/gene.ts` 中定义了 `getGeneDicts()` 函数，调用 `GET /gene/dicts`
- 后端 `routes/gene.ts` 中未实现 `GET /api/gene/dicts` 路由
- 前端已对 genders、statuses、colors、eye_colors 有 fallback 数据
- 但 breeds 和 bloodlines 的 AutoComplete 直接依赖 `dicts.breeds` 和 `dicts.bloodlines`，当 dicts 为 null 时选项为空

## Functional Requirements
- **FR-1**: 后端必须新增 `GET /api/gene/dicts` 接口，返回基因档案字典数据
- **FR-2**: 返回的字典数据必须包含：`colors`（羽色数组）、`eye_colors`（眼砂数组）、`genders`（性别选项对象数组）、`statuses`（状态选项对象数组）、`breeds`（品种数组）、`bloodlines`（血统数组）
- **FR-3**: 接口需支持鉴权（gene:view 权限或公开）
- **FR-4**: 后端接口需从数据库查询已有数据生成字典（品种和血统从 gene_profiles 表中去重获取）
- **FR-5**: 当 dicts 接口返回失败时，前端 breeds 和 bloodlines 字段仍允许用户自由输入（fallback 数组 + AutoComplete 本身支持自由输入）

## Non-Functional Requirements
- **NFR-1**: 接口响应时间 < 500ms（字典数据量小）
- **NFR-2**: 构建通过 `npm run build` 无 TypeScript 错误
- **NFR-3**: 不引入新的依赖

## Constraints
- **Technical**: 必须使用现有的 Express + SQLite 技术栈，遵循项目路由组织规范
- **Business**: 向后兼容，不影响已有的基因档案 CRUD 功能
- **Dependencies**: 依赖 `gene_profiles` 表存在且可查询

## Assumptions
- 字典数据中 colors、eye_colors、genders、statuses 使用内置枚举值即可
- breeds 和 bloodlines 从 gene_profiles 表中查询已有值并去重
- 管理员对品种和血统的输入需求是自由输入 + 历史选项推荐

## Acceptance Criteria

### AC-1: 新增档案按钮点击后弹窗正常打开
- **Given**: 用户已登录，基因档案列表页正常加载
- **When**: 点击"新增档案"按钮
- **Then**: 弹窗正常打开，无错误提示，所有字段可交互
- **Verification**: `programmatic`

### AC-2: 品种和血统字段可正常输入和选择
- **Given**: 新增档案弹窗已打开
- **When**: 在"品种"或"血统"字段中输入文字
- **Then**: 用户可自由输入文字，且下拉中有历史选项可供选择
- **Verification**: `human-judgment`

### AC-3: 后端 /api/gene/dicts 接口正常响应
- **Given**: 后端服务正常运行
- **When**: 发送 GET /api/gene/dicts 请求（带有效 token）
- **Then**: 返回 200 状态码，响应体包含 colors, eye_colors, genders, statuses, breeds, bloodlines 字段
- **Verification**: `programmatic`

### AC-4: 构建验证通过
- **Given**: 代码修改完成
- **When**: 执行 `npm run build`
- **Then**: 构建成功，无 TypeScript 编译错误
- **Verification**: `programmatic`

## Open Questions
- [ ] breeds 和 bloodlines 字典是否需要支持从独立字典表维护？（当前假设从已有档案数据中动态生成）