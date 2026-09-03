# 公棚创建与入驻审核流程 - PRD

## Overview
- **Summary**: 重构公棚创建流程为"双轨并行"模式——既支持管理员在后台手动创建公棚（直接生效），又支持前端入驻申请的完整审核工作流（提交→审核→通过/驳回）。解决当前"新公棚由入驻审核创建"按钮被禁用、管理员无法创建公棚、入驻审核流程不完整的问题。
- **Purpose**: 公棚管理是整个赛事管理、入棚登记、3D赛事追踪等模块的基础。当前功能卡死（创建按钮 disabled + 入驻审核链路不完整），导致公棚无法正常入库。
- **Target Users**: 平台管理员、公棚审核员

## Goals
- 支持管理员**后台手动创建公棚**（填写信息 → 直接生效，无需审核）
- 支持**入驻申请审核完整工作流**（列表 → 详情 → 通过/驳回 → 自动创建公棚）
- 公棚列表显示"待审核"状态区分不同来源的公棚
- 审核通过后自动创建公棚档案，形成闭环
- 创建入口对管理员可见且可操作

## Non-Goals (Out of Scope)
- 前端 C 端（小程序/H5）入驻申请表单页面
- 批量审核功能（P2，后续迭代）
- 公棚 Logo / 照片上传（P2，后续迭代）
- 系统通知推送（可后续扩展，目前审核成功后由管理员确认）

## Background & Context
- **当前前端状态**：`Loft/List.tsx` 的创建按钮 `disabled`，文案为"新公棚由入驻审核创建"；`Audit.tsx` 页面已存在路由和基本布局，但列表默认只显示 `pending` 状态。
- **当前后端状态**：`loft.ts` 已有入驻申请 CRUD + 审核通过自动创建公棚的完整逻辑；但**缺少后台手动创建公棚的独立接口**。
- **数据模型**：`loft_applications` 表（申请记录）、`lofts` 表（正式公棚档案）已就绪。
- **技术栈**：React + Vite + Ant Design v5（ProTable/ModalForm）+ Express + SQLite。

## Functional Requirements

### FR-1: 后台手动创建公棚
- 管理员在公棚列表页点击"➕ 创建公棚"，弹出**模式选择框**（手动创建 / 查看入驻申请）。
- 选择"手动创建"后，进入**创建公棚表单**（复用编辑弹窗结构），填写公棚名称、负责人、联系电话、地址、容量、简介、状态等字段。
- 提交后调用 `POST /api/loft/lofts` 创建公棚，返回新记录并刷新列表。
- 公棚状态默认为"营业中"。

### FR-2: 入驻申请审核列表
- 访问 `/loft/audit` 展示入驻申请列表，默认按**状态 Tab**（待审核 / 已通过 / 已驳回）分组。
- 支持搜索（公棚名称、申请人、联系电话）。
- 每行显示：公棚名称、申请人、联系电话、容量、地址、审核状态、提交时间、操作。

### FR-3: 入驻申请详情与审核操作
- 点击"查看详情"弹出抽屉，展示完整申请信息。
- 待审核状态下展示"✅ 通过"和"❌ 驳回"按钮。
- 驳回必须填写驳回理由；通过可填审核备注。
- 审核通过后**自动创建公棚档案**（状态：营业中），并更新申请状态为"已通过"。
- 审核驳回后更新申请状态为"已驳回"。

### FR-4: 公棚列表状态展示
- 公棚列表显示状态标签：营业中 / 待审核 / 审核驳回 / 暂停 / 已关闭。
- 支持按状态筛选。

### FR-5: 后端接口
- `POST /api/loft/lofts` - 后台手动创建公棚
- `GET /api/loft/applications` - 入驻申请列表（支持 status 筛选）
- `POST /api/loft/applications/:id/approve` - 审核通过（已存在）
- `POST /api/loft/applications/:id/reject` - 审核驳回（已存在）

### FR-6: 权限表补全
- 在 `db.ts` 的权限种子数据中新增 `loft:create` 权限（公棚创建），与 `loft:view`、`loft:edit`、`loft:audit` 并列。

### FR-7: 审核列表 Tab 数量角标
- 入驻审核页面的 Tab 标签显示各状态的数量角标，如"待审核(3)"/"已通过(12)"/"已驳回(5)"。

## Non-Functional Requirements

### NFR-1: 数据一致性
- 审核通过在事务中同时更新 `loft_applications` 状态和创建 `lofts` 记录，确保原子性。

### NFR-2: 权限控制
- 创建公棚需 `loft:create` 或 `loft:edit` 权限。
- 入驻审核需 `loft:audit` 权限。

### NFR-3: 用户体验
- 创建公棚操作完成后需有明确的成功/失败反馈（message.success / message.error）。
- 列表数据应自动刷新，让管理员看到最新结果。

### NFR-4: 构建通过
- 所有 TypeScript 类型检查通过。
- `npm run build` 成功。

## Constraints
- **技术**：React + TypeScript + Ant Design v5 ProComponents；Express + SQLite。
- **业务**：手动创建的公棚默认营业中；审核通过的公棚也默认营业中；两条路径互不干扰。
- **依赖**：`loft:view`、`loft:edit`、`loft:audit` 权限需在角色管理中已配置。

## Assumptions
- 管理员角色默认拥有 `loft:create`、`loft:edit`、`loft:audit` 全部权限。
- 手动创建公棚时，公棚编码由后端自动生成（`LOFT-YYYYMMDD-XXXX` 格式）。
- 前端入驻申请页面不在本次开发范围内。
- 批量审核为 P2，暂不实现。

## Acceptance Criteria

### AC-1: 创建公棚按钮可用
- **Given**: 管理员在公棚列表页（具备 `loft:edit` 权限）
- **When**: 点击"➕ 创建公棚"按钮
- **Then**: 弹出模式选择框，可选择"📝 手动创建（直接生效）"或"📋 入驻申请审核"
- **Verification**: `human-judgment`

### AC-2: 手动创建公棚成功
- **Given**: 管理员选择"手动创建"
- **When**: 填写公棚名称、负责人、联系电话、地址并提交
- **Then**: 公棚创建成功，Toast 提示成功，列表自动刷新，新公棚出现在列表顶部
- **Verification**: `programmatic`

### AC-3: 后端创建接口可用
- **Given**: `POST /api/loft/lofts` 请求体包含 name、applicant_name、phone、address 字段
- **When**: 发送请求
- **Then**: 返回 200 状态码和新记录 ID，数据库 lofts 表新增记录
- **Verification**: `programmatic`

### AC-4: 入驻审核列表可访问
- **Given**: 管理员具备 `loft:audit` 权限
- **When**: 导航到"入驻审核"菜单或从创建弹窗跳转
- **Then**: 展示入驻申请列表，默认显示待审核状态申请
- **Verification**: `human-judgment`

### AC-5: 入驻申请审核通过
- **Given**: 存在一条待审核的入驻申请
- **When**: 管理员在详情抽屉点击"✅ 通过"
- **Then**: 后端在事务中同时更新申请状态为"已通过"并创建 lofts 记录，返回成功
- **Verification**: `programmatic`

### AC-6: 入驻申请审核驳回
- **Given**: 存在一条待审核的入驻申请
- **When**: 管理员填写驳回理由并点击"❌ 驳回"
- **Then**: 申请状态更新为"已驳回"，驳回理由保存
- **Verification**: `programmatic`

### AC-7: 公棚列表状态标识
- **Given**: 公棚列表展示公棚
- **When**: 公棚是审核通过创建的或手动创建的
- **Then**: 状态标签正确显示（营业中/待审核/审核驳回等）
- **Verification**: `human-judgment`

### AC-8: 构建通过
- **Verification**: `programmatic`

## Open Questions
- [ ] 前端入驻申请页面（C 端）是否在后续需求中？——本次明确不做。
- [ ] 审核通过后的系统通知机制——本次不做，后续迭代。
