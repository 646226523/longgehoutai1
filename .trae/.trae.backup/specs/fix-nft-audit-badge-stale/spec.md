# NFT 审核页 Tab 徽章 + 统计卡片「审核后不自动更新」修复 - PRD

## Overview
- **Summary**：修复后台 `pages/nft/Audit.tsx` 中，工作人员进行「单条审核通过/单条驳回/批量通过/批量驳回/驳回后复审/失败任务重试」等操作后，四个 Tab（待审核资产 / 上链中 / 已完成 / 已驳回）右上角 Badge 计数 **完全不更新**，以及下方四卡片统计（今日审核通过 / 今日上链成功 / 今日上链失败 / 平均耗时）**不更新**的问题。让所有状态变动后，无需工作人员手动刷新页面即可显示最新数值。
- **Purpose**：消除「后台工作人员误以为操作未成功」的困惑与重复点击问题，提升审核效率；减少对 F5 手动刷新的依赖，保证视图与后端一致。
- **Target Users**：后台审核员 / 运营管理员。

## Goals
- G1: 将 `refreshBadgeCounts()` 从「一败全败」`Promise.all` 改为「独立成功即 setState」的容错策略，单请求失败不影响另外三项。
- G2: 审核相关的 6 个操作（approve/reject/resubmit/batchApprove/batchReject/batchResubmit）+ 失败任务 retry，在操作成功后**统一刷新** Badge 计数 + stats 统计卡片 + 对应表格。
- G3: 操作后的 Badge 数值必须与后端真实 total 逐值一致，避免幻数导致的不一致。
- G4: 向后兼容：现有的 approve/reject/retry 等接口调用位置不改变其成功提示与交互顺序。

## Non-Goals (Out of Scope)
- **不做** 本地乐观更新的 ±1 幻数策略（避免批量部分成功场景的幻数漂移）。
- **不做** stats 或 badge 的 WebSocket 实时推送。
- **不做** List.tsx / 其它页面的 Badge（仅 Audit.tsx 页面）。
- **不做** 审核接口、任务接口、stats 接口的后端 schema 变更。

## Background & Context
1. 当前页面结构（`pages/nft/Audit.tsx`）：
   - Tab 列表 4 项：`pending(待审核)`、`minting(上链中)`、`completed(已完成)`、`rejected(已驳回)`，每个 Tab 用 `<Badge count={pendingCount}>` 显示数量；
   - 下方四卡片：Statistic（`stats.today_approved`、`stats.today_mint_success`、`stats.today_mint_failed`、`stats.avg_duration_sec`）；
   - Tab 内容区：pending/rejected → ProTable<NftAsset>；minting/completed → ProTable<NftMintTask>。
2. 现有初始化：`useEffect(() => { refreshStats(true); refreshBadgeCounts(); }, [])` 仅在首次挂载时调用。
3. 现有操作后行为：
   - handleApprove / handleReject / onBatchApprove / handleBatchRejectFinish / handleResubmit / handleBatchResubmit 只调用 `await refreshBadgeCounts()`，**均未调用 `refreshStats()`** → 今日统计卡片完全不更新。
   - handleRetry 仅当 `activeTab === 'completed' && record.status === 'failed'` 分支时才 refreshBadgeCounts，其它重试场景（minting Tab 重试、completed 的失败项以外的情况）**不刷新 Badge**。
   - `refreshBadgeCounts()` 内部 `Promise.all([4 个 pageSize=1 的请求]).then(全部 setState).catch(静默)`：只要其中 **1 个请求失败**（网络或拦截器 reject），四计数器**全部保留旧值**，导致 Badge 完全不更新——但刷新页面后 `useEffect` 再次调用，此时四请求若恰好都成功则显示正确，形成"必须手动刷新"的错觉。
4. 前序修复保持：描述字段修复（`nft-metadata-render.tsx` 三参、AntD 合规、TS 安全）**不回归**。

## Functional Requirements
- **FR-1** `refreshBadgeCounts` 容错改造：将 `Promise.all(4 请求)` 改为 `Promise.allSettled` 或独立 try/catch 模式，每个请求单独 setState，失败的一项保留之前的 state，同时在 dev 控制台 `console.warn` 打印失败原因（不在 UI toast 显示，避免 4 条同时抖动提示）。
- **FR-2** 统一 `afterAuditAction` 动作后钩子：
  - 在 Audit.tsx 组件内部新增 `async function afterAuditAction(opts: { reloadAssetTable?: boolean; reloadTaskTable?: boolean; })`，默认两项都 true；
  - 函数内部执行顺序：并行 `Promise.all([refreshBadgeCounts(), refreshStats(_force=true)])` → 再按参数调用 `assetActionRef.current?.reload()` / `taskActionRef.current?.reload()`。
  - 保证 Badge 与 stats 刷新并行（更快），table reload 在其后（确保 total 与行一致）。
- **FR-3** 6 个资产审核动作统一走 afterAuditAction：
  - FR-3.1 `handleApprove` → message.success 后 → `afterAuditAction()` → setActiveTab('minting')（保持原跳转逻辑）。
  - FR-3.2 `handleReject` → close modal + message 后 → `afterAuditAction()`（默认 true，刷新两张表虽然 pending 表在，但只刷 assetTask 足够；reloadTaskTable 也 true 但不报错）。
  - FR-3.3 `handleResubmit` → afterAuditAction。
  - FR-3.4 `onBatchApprove` → afterAuditAction + 保留 setSelectedRowKeys([])。
  - FR-3.5 `handleBatchRejectFinish` → afterAuditAction + 保留 batchRejectModal 关闭 / 清空选择。
  - FR-3.6 `handleBatchResubmit` → afterAuditAction。
- **FR-4** `handleRetry` 重试后刷新：**无论** activeTab 是 minting / completed、无论 record.status 是什么，retry 成功后都调用 `afterAuditAction({ reloadAssetTable: false, reloadTaskTable: true })`（只刷任务表，节省资产表请求）；若原逻辑是 `activeTab === 'completed' && record.status === 'failed'` 需要跳到 minting，则保留 setActiveTab，但调用顺序改为 `afterAuditAction` → `setActiveTab('minting')`（避免 tab 切换导致的请求竞争，afterAuditAction 先执行）。
- **FR-5** Promise.allSettled 返回结果处理：
  - 用 `.status === 'fulfilled'` 判断成功，成功结果从 `res.value.total` 取值（PageResult.total）；
  - 失败的不 setState（保留原值），`console.warn('refreshBadgeCounts: ${statusKey} failed', reason)`。
  - 四个 statusKey：`pending / rejected / minting / completed`。
- **FR-6** stats 刷新行为：
  - `afterAuditAction` 每次都调用 `refreshStats(true)`，_force 参数（当前 refreshStats 的参数未使用）保持向后兼容，不改变 refreshStats 签名。

## Non-Functional Requirements
- **NFR-1** 类型安全：`npx tsc --noEmit` exit_code = 0（不增加 any/unknown 泛滥）。
- **NFR-2** AntD 合规：页面打开 + 6 个操作后，console 中 `[antd:` 前缀警告计数 = 0。
- **NFR-3** 不引入新的废弃 props：Card 始终用 variant + styles.body/head（bordered/bodyStyle/headStyle 新增为 0）。
- **NFR-4** UI 响应：Badge 数值更新应在操作成功提示后 ≤ 500ms 内（实际为后端请求耗时 + setState，通常 < 300ms），避免 UI 长时间停在旧值。
- **NFR-5** 稳定性：任一 badge 请求失败时，其余三个与 stats 仍然正常更新，不因部分失败导致全量停滞。

## Constraints
- **Technical**：React + TypeScript，Ant Design 5.x，ProTable actionRef.reload() 模式；
- **Business**：Badge 必须为后端权威 total，严禁幻数；
- **Dependencies**：复用现有 `getNftAuditList / getNftTasks / getNftAuditStats` 三个 services 接口，不新增 API。

## Assumptions
- 后端 `/nft/audit/list?status=pending&pageSize=1` 的 PageResult.total 已正确过滤状态；
- 后端 `/nft/audit/stats` 返回的 today_approved / today_mint_success / today_mint_failed / avg_duration_sec 在审核操作后 ≤ 2s 内可查询到（接口若存在异步统计延迟，按后端实现，前端不做缓存但不做额外轮询）。

## Acceptance Criteria

### AC-1: 单条审核通过（approve）后 Badge 自动更新
- **Given**：在 pending Tab 有 ≥ 1 条资产，当前 pendingCount = 8，mintingCount = 1；
- **When**：点击「通过」按钮 → 成功提示 `审核通过，已创建上链任务 Txxx`；
- **Then**：
  1. pendingCount 立即减少（后端真实 total，期望值 = 原 pendingCount - 1 + 后端其他异步写入影响）；
  2. mintingCount 增加（后端真实 total，期望值 ≈ 原 mintingCount + 成功的任务数）；
  3. rejectedCount / completedCount 无变化；
  4. 下方统计卡片 `stats.today_approved` 数值**更新**（不再停在原 0）；
  5. 页面**不需要手动 F5** 即可看到更新。
- **Verification**：`human-judgment`
- **Notes**：允许 ±0 的情况（如果后端恰好有其他用户同时新增/审核），但方向必须与该动作一致。

### AC-2: 单条驳回（reject）后 Badge + stats 自动更新
- **Given**：在 pending Tab 有 ≥ 1 条资产；
- **When**：点击「驳回」→ 填写驳回原因 → 确认 → message.success('已驳回')；
- **Then**：pendingCount 减少，rejectedCount 增加；stats.today_approved 不变（合理，因为没通过）；页面不刷新即可看到两计数变化。
- **Verification**：`human-judgment`

### AC-3: 模拟一请求失败仍更新其他三项（FR-1 容错）
- **Given**：通过 browser_evaluate 临时替换 `getNftTasks` 函数使其 status='completed,failed' 时 reject（模拟后端瞬时失败）；
- **When**：点击 pending Tab 「通过」某条资产 → 触发 afterAuditAction；
- **Then**：pendingCount ↓ / mintingCount ↑ / rejectedCount 不变三项**正确更新**，仅 completedCount**保持旧值**不抖动；console.warn 打印一条 completed failed；stats 仍正常更新；页面无 toast 抖动。
- **Verification**：`human-judgment`
- **Notes**：操作后请**还原** getNftTasks 替换，避免后续 AC 失败。

### AC-4: 失败任务重试（handleRetry）两 Tab 场景都刷新
- **Given**：minting Tab 有任务 → 场景 A；completed Tab 有 failed 状态任务 → 场景 B；
- **When**：两个场景分别点击「重试」→ 成功提示「已重新触发上链任务」；
- **Then**：
  - 两场景下 Badge（minting/completed 至少一项变化）均在**不 F5** 情况下更新；
  - stats（today_mint_success/today_mint_failed 至少一项）也更新；
  - 场景 B 若原逻辑 setActiveTab('minting')，跳转后 minting Tab 的 ProTable 已刷新。
- **Verification**：`human-judgment`

### AC-5: 批量通过（batchApprove）10 条后计数方向正确
- **Given**：pending Tab 勾选 10 条，批量通过接口返回 `{ success:10, total:10, failed:0 }`；
- **When**：点击「批量通过」→ 成功提示；
- **Then**：pendingCount 大幅减少、mintingCount 大幅增加（后端真实 total）；stats.today_approved ≥ 10 且 ≤ 10（取决于 mock）；不 F5 即可看到数值更新。
- **Verification**：`human-judgment`

### AC-6: 驳回后复审（resubmit） + 批量复审均更新
- **Given**：rejected Tab 有 ≥ 1 条被驳回资产；
- **When**：
  1. 单条点「重新提交至待审核队列」→ success；
  2. 批量勾选 N 条 → 批量复审 → success；
- **Then**：rejectedCount 减少，pendingCount 增加（后端真实 total）；Badge 两 Tab 计数均更新。
- **Verification**：`human-judgment`

### AC-7: TS + AntD 合规不回归
- **Given**：修复完成；
- **When**：运行 `npx tsc --noEmit` + 浏览器 console 过滤 `[antd:`；
- **Then**：tsc exit=0；Audit 页面打开 + 做 approve/reject/retry 三次操作后 antd 警告计数 = 0。
- **Verification**：`programmatic`

## Open Questions
- [ ] `refreshStats(_force)` 参数目前未使用，是否本次直接删除 _force 改为无参？→ **按现状保留向后兼容**（FR-6 规定不改签名），如后续可单独 cleanup。
- [ ] handleReject 成功后是否应该跳到 rejected Tab？当前是停在原 pending Tab → **本次不改变交互，只修数值更新**（G4）。
