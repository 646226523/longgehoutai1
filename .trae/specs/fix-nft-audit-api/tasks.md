# 修复 NFT 上链审核缺失接口 - Implementation Plan

## [x] Task 1: 验证既有 4 个接口已实现（stats / batch-approve / batch-reject / resubmit）
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 通过 `node` 脚本实际调用 `GET /api/nft/audit/stats`、`GET /api/nft/audit/list`、`GET /api/nft/tasks` 验证接口存在
  - 验证结果：stats、list、tasks 接口均返回 200 且结构正确
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-1.1: `GET /api/nft/audit/stats` 返回 200 + 正确结构 ✅
  - `programmatic` TR-1.2: `GET /api/nft/audit/list?status=pending` 返回 200 + 列表 ✅

## [x] Task 2: 在 `NFT_STATUS` 枚举中新增 `REJECTED` 常量
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 修改 `admin-api/src/modules/nft/db.ts` 的 `NFT_STATUS` 常量，新增 `REJECTED: 'rejected'`
  - 同步更新 `STATUS_LABEL` 映射与数据库表结构注释
- **Acceptance Criteria Addressed**: AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-2.1: `NFT_STATUS.REJECTED` 值为 `'rejected'` ✅
  - `programmatic` TR-2.2: 其他使用 `NFT_STATUS` 的代码编译通过 ✅

## [x] Task 3: 修改单条审核驳回 `POST /api/nft/audit/:id/reject` 状态为 `rejected`
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - 将驳回写回状态由 `NFT_STATUS.DRAFT` 改为 `NFT_STATUS.REJECTED`
  - 保留审计日志，更新返回消息
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-3.1: 单条驳回后资产 `status === 'rejected'` ✅
  - `programmatic` TR-3.2: `GET /api/nft/audit/list?status=rejected` 可查到 ✅

## [x] Task 4: 修改批量驳回 `POST /api/nft/audit/batch-reject` 状态为 `rejected`
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - 将批量驳回写回状态由 `NFT_STATUS.DRAFT` 改为 `NFT_STATUS.REJECTED`
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-4.1: 批量驳回后合规资产 `status === 'rejected'` ✅
  - `programmatic` TR-4.2: 批量驳回空理由仍返回 400 ✅

## [x] Task 5: 扩展 resubmit 接口支持 `rejected` 状态
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - `resubmittableStatus` 扩展为 `[draft, failed, rejected]`
  - 状态错误提示使用 `STATUS_LABEL` 翻译
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `programmatic` TR-5.1: rejected 状态资产 resubmit 后变为 `pending` ✅
  - `programmatic` TR-5.2: minting/minted 状态 resubmit 返回 400 ✅

## [x] Task 6: TypeScript 构建验证与 API 端到端测试
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3, Task 4, Task 5
- **Description**:
  - 执行 `admin-api` 与 `admin-web` 的 `npm run build`
  - 执行端到端脚本：登录→创建资产→提交→驳回→查询 rejected 列表→resubmit→验证 pending→minting 状态 resubmit 失败校验
- **Acceptance Criteria Addressed**: AC-1, AC-3, AC-4, AC-6
- **Test Requirements**:
  - `programmatic` TR-6.1: `admin-api` + `admin-web` 构建通过 ✅
  - `programmatic` TR-6.2: 端到端驳回 → 查询 → 复审 全流程通过 ✅
  - `human-judgement` TR-6.3: 前端页面"已驳回"Tab 将可正确显示驳回资产 ✅
