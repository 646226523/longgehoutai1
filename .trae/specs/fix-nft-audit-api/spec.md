# 修复 NFT 上链审核缺失接口 - Product Requirement Document

## Overview
- **Summary**: 修复 NFT 上链审核页面的接口 BUG，涵盖 4 个后端 API 接口的补全（`GET /api/nft/audit/stats`、`POST /api/nft/audit/batch-approve`、`POST /api/nft/audit/batch-reject`、`POST /api/nft/assets/:id/resubmit`）以及"已驳回"Tab 数据链路的一致性修复。
- **Purpose**: 管理员打开"上链审核"页面即出现"接口不存在"弹窗，且即使接口存在，"已驳回"Tab、批量驳回、一键复审等功能也因后端状态流转错误（驳回写回 `draft` 而非 `rejected`）而无法正常工作。
- **Target Users**: NFT 审核员、超级管理员

## Goals
- 确保 4 个上链审核相关接口真实可用（路由已注册、运行时可访问）
- 修复"已驳回"Tab 数据链路：审核驳回后资产应标记为 `rejected` 状态
- 修复"批量驳回"功能：支持 `rejected` 状态的资产管理
- 修复"一键复审 / resubmit"功能：`rejected` 状态资产可复审
- 保证审核页面所有 Tab 切换、数据刷新、批量操作完整可用

## Non-Goals (Out of Scope)
- 不修改前端页面视觉样式（前端 UI 结构已正确）
- 不修改数据库表结构（`nft_assets` 表 `status` 字段是 TEXT，天然支持新增枚举值）
- 不修改其他非审核模块接口

## Background & Context
- 用户打开 `NFT 上链审核` 页面时，前端在 `useEffect` 中并行调用：
  - `getNftAuditStats` → `GET /api/nft/audit/stats`
  - `getNftAuditList(status=pending)` → `GET /api/nft/audit/list`
  - `getNftAuditList(status=rejected)` → `GET /api/nft/audit/list`
  - `getNftTasks(status=pending,executing,confirming)` → `GET /api/nft/tasks`
  - `getNftTasks(status=completed,failed)` → `GET /api/nft/tasks`
- 后端文件 `admin-api/src/routes/nft.ts` 已包含 4 个目标接口的实现代码；路由在 `index.ts` 已挂载于 `/api/nft`
- 状态流转不一致问题：
  - 前端 `Audit.tsx` 将 `rejected` 作为合法状态展示（`ASSET_STATUS_OPTIONS`、`buildRejectedColumns`）
  - 后端 `POST /api/nft/audit/:id/reject` 将资产状态写回 `NFT_STATUS.DRAFT`
  - 后端 `POST /api/nft/audit/batch-reject` 将资产状态写回 `NFT_STATUS.DRAFT`
  - 后端 `POST /api/nft/assets/:id/resubmit` 只接受 `draft / failed` 状态
  - 结果：用户驳回的资产不会出现在"已驳回"Tab 中，批量复审也无法对驳回资产生效

## Functional Requirements
- **FR-1**: `GET /api/nft/audit/stats` 返回 `{ today_approved, today_mint_success, today_mint_failed, avg_duration_sec }`
- **FR-2**: `POST /api/nft/audit/batch-approve` 接收 `{ ids: number[] }`，对 pending 资产批量审核通过
- **FR-3**: `POST /api/nft/audit/batch-reject` 接收 `{ ids: number[], reject_reason: string }`，将 pending 资产状态置为 `rejected`
- **FR-4**: `POST /api/nft/assets/:id/resubmit` 支持 `rejected / draft / failed` 状态的资产重置为 `pending`
- **FR-5**: `NFT_STATUS` 枚举中新增 `REJECTED: 'rejected'` 常量
- **FR-6**: `POST /api/nft/audit/:id/reject` 单条审核驳回将资产状态置为 `rejected`
- **FR-7**: `nft_assets` 表 `status` 字段接受 `rejected` 枚举值（TEXT 字段天然支持）
- **FR-8**: 列表查询允许按 `rejected` 状态筛选

## Non-Functional Requirements
- **NFR-1**: 所有接口权限保持 `requirePermission('nft:audit')`
- **NFR-2**: 所有写操作接入 `auditMiddleware` 审计日志
- **NFR-3**: `npm run build` 构建通过、TypeScript 无报错

## Constraints
- **Technical**: 复用现有 `simulateMint / NFT_STATUS / MINT_TASK_STATUS`；不修改表结构
- **Dependencies**: 依赖 `nft_assets`、`nft_mint_tasks` 表存在
- **Compatibility**: 保留对旧 `draft` 状态驳回资产的向前兼容（仍允许 resubmit）

## Assumptions
- `nft_assets.status` 为 TEXT 类型，可存储任意字符串（包括新增 `rejected`）
- 现有前端 UI 已正确处理 `rejected` 状态（`ASSET_STATUS_COLOR/ LABEL` 已包含 rejected 条目）
- 用户遇到的"接口不存在"弹窗源于此前未实现的路由；当前代码已实现，但存在状态流转一致性缺陷

## Acceptance Criteria

### AC-1: 统计接口返回正确数据
- **Given**: 管理员已登录
- **When**: 调用 `GET /api/nft/audit/stats`
- **Then**: 返回结构 `{ today_approved, today_mint_success, today_mint_failed, avg_duration_sec }` 且 HTTP 200
- **Verification**: `programmatic`

### AC-2: 批量审核通过可用
- **Given**: 有多条 pending 状态的 NFT 资产
- **When**: 调用 `POST /api/nft/audit/batch-approve` 传入 ids 数组
- **Then**: 返回 `{ total, success, failed }`，成功资产状态置为 `minting`
- **Verification**: `programmatic`

### AC-3: 审核驳回状态正确置为 rejected
- **Given**: 有 pending 状态的 NFT 资产
- **When**: 调用 `POST /api/nft/audit/:id/reject` 或 `batch-reject`
- **Then**: 资产状态置为 `rejected`，出现在"已驳回"Tab 列表
- **Verification**: `programmatic`

### AC-4: 已驳回资产可重新提交审核
- **Given**: 存在 `rejected` 状态的资产
- **When**: 调用 `POST /api/nft/assets/:id/resubmit`
- **Then**: 资产状态变更为 `pending`
- **Verification**: `programmatic`

### AC-5: 页面打开无错误弹窗
- **Given**: 管理员打开"上链审核"页面
- **When**: 页面加载完成
- **Then**: 不再出现"接口不存在"弹窗，所有 Tab 正常加载
- **Verification**: `human-judgment`

### AC-6: 构建通过
- **Given**: 代码变更完成
- **When**: 执行 `npm run build`
- **Then**: 无 TypeScript 错误
- **Verification**: `programmatic`
