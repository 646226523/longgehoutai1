# NFT 审核页 Tab 徽章不自动更新 - The Implementation Plan

## [x] Task 1: `refreshBadgeCounts` 容错改造 + 新增 `afterAuditAction` 统一钩子（A 方案：Promise.allSettled）
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 `admin-web/src/pages/nft/Audit.tsx` 修改 `refreshBadgeCounts()`：从 `Promise.all([4 请求]).then(全部 setState)` 改为 `Promise.allSettled` 模式，4 个请求单独判断 fulfilled：`pending / rejected / minting / completed` 各自成功时才 setState，任一失败 `console.warn('refreshBadgeCounts: <statusKey> failed', <reason>)`（仅控制台，不 UI toast）
  - 新增组件内部 `async function afterAuditAction(opts: { reloadAssetTable?: boolean; reloadTaskTable?: boolean; } = { reloadAssetTable: true, reloadTaskTable: true })`：并行执行 `Promise.all([refreshBadgeCounts(), refreshStats(true)])` → 然后按 opts 调用 `assetActionRef.current?.reload()` / `taskActionRef.current?.reload()`
  - **注意**：table reload 不 await（ProTable 的 reload 返回 Promise<void> 时可继续），但要保证 Badge + stats 先 setState（避免 setActiveTab 竞争）。
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-7
- **Test Requirements**:
  - `programmatic` TR-1.1: `npx tsc --noEmit` exit_code = 0，afterAuditAction/refreshBadgeCounts 参数类型正确（opts 对象的键都是可选 boolean）
  - `programmatic` TR-1.2: `refreshBadgeCounts` 中 **不出现** `Promise.all([4 请求]).then`（保证已换 allSettled）；出现 **至少 3 次** `case 'fulfilled':` 或 `.status === 'fulfilled'` 等价判断
  - `human-judgement` TR-1.3: 人工浏览 afterAuditAction 代码：必须**同时**调用 `refreshBadgeCounts()` 与 `refreshStats(true)`，顺序应为并行 Promise.all（不串行），之后才 reload 两张表
  - `programmatic` TR-1.4: 静态 grep `console.warn('refreshBadgeCounts` 出现 ≥ 1 次
- **Notes**: 不要改 `refreshStats` 现有签名（保持 `_force: boolean`），避免 TS 调用点 break。

## [x] Task 2: 6 个资产审核动作 + 任务重试 统一调用 afterAuditAction
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 修改以下 7 处动作成功回调（message.success 已提示后）：
    1. `handleApprove(record)`：`afterAuditAction()` → `setActiveTab('minting')`（原跳转保留）
    2. `handleReject(values)`：close modal → `afterAuditAction()`（保留 return true）
    3. `handleResubmit(record)`：`afterAuditAction()` → `setSelectedRowKeys([])`
    4. `onBatchApprove()`：`setSelectedRowKeys([])` → `afterAuditAction()`
    5. `handleBatchRejectFinish(values)`：close modal + setSelectedRowKeys → `afterAuditAction()`
    6. `handleBatchResubmit()`：`setSelectedRowKeys([])` → `afterAuditAction()`
    7. `handleRetry(record)`：`afterAuditAction({ reloadAssetTable: false, reloadTaskTable: true })`；原分支 `if (activeTab === 'completed' && record.status === 'failed') setActiveTab('minting')` 改为**先调用 afterAuditAction 再 setActiveTab**；其它分支（minting / minting 中失败重试）即使不跳 tab，也必须调用 afterAuditAction（覆盖旧代码只在 completed+failed 才 refreshBadgeCounts 的问题）
  - **注意**：Task 1 已把 `refreshStats()` 放到 afterAuditAction 里，所以这些动作后 stats 卡片会自动刷新（今日审核通过、今日上链成功等）。
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-4, AC-5, AC-6
- **Test Requirements**:
  - `programmatic` TR-2.1: grep 上述 7 个函数体，`afterAuditAction` 调用计数 **≥ 7**（每个函数至少 1 次）；旧的零散 `refreshBadgeCounts()` 调用在这 7 个函数内计数 = 0（被替换掉）
  - `programmatic` TR-2.2: `handleRetry` 函数体中，旧的 `if (activeTab === 'completed' && record.status === 'failed') { setActiveTab('minting'); await refreshBadgeCounts() }` 结构 **不存在**；改为 `afterAuditAction()` 在前，setActiveTab 在后
  - `human-judgement` TR-2.3: 浏览 handleApprove 流程：approveNftAudit → message.success → afterAuditAction → setActiveTab('minting') 顺序正确（table reload 不应先于 badge/stats 更新）
  - `programmatic` TR-2.4: `npx tsc --noEmit` exit_code = 0（7 个调用点参数类型正确，opts 不传默认全 true 不报错）
- **Notes**: 任何函数中原本 `assetActionRef.current?.reload()` / `taskActionRef.current?.reload()` 可以删除（因为 afterAuditAction 内部已按 opt 调用）；如果 handleRetry 的 opts.reloadTaskTable=true，就不要再单独写 taskActionRef reload，避免重复请求。

## [x] Task 3: 浏览器 6 个动作验证 + AC-1~AC-7 全量 checklist
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - 启动 admin-web 3014 与 admin-api 3015（已运行则跳过），登录 admin/admin123，进入 `/nft/audit`；
  - 分别执行：
    1. AC-1 单条通过：pending Tab → 任意一条 → 通过 → 截图 + 断言 pendingCount↓、mintingCount↑、stats.today_approved 增大；
    2. AC-2 单条驳回：pending Tab → 某条 → 驳回 → 截图 + pendingCount↓、rejectedCount↑；
    3. AC-3 容错：临时通过 browser_evaluate 替换 `getNftTasks` 使 status='completed,failed' 时 reject → approve 一条 → 断言 pending/minting 正确，completedCount 不变，控制台有 warn；然后还原；
    4. AC-4 两 Tab 重试：minting Tab 找一任务重试（场景 A）→ completed Tab 找 failed 任务重试（场景 B）→ 截图均 Badge + stats 更新 + 场景 B 跳 minting；
    5. AC-5 批量通过 10 条：pending Tab 勾选 10 条 → 批量通过 → Badge / stats 更新；
    6. AC-6 驳回复审单条 + 批量：rejected Tab 单条重新提交 → Badge rejected↓ pending↑；批量 N 条复审 → rejected↓ pending↑；
    7. AC-7：`npx tsc --noEmit` exit_code = 0 + console `[antd:` 计数 = 0。
- **Acceptance Criteria Addressed**: AC-1 ~ AC-7
- **Test Requirements**:
  - `human-judgement` TR-3.1: 6 张截图（AC-1,2,3,4a,4b,5,6 共 7 张）命名：`screenshots/badge-ac-1.png` ~ `badge-ac-6-batch.png`
  - `programmatic` TR-3.2: tsc --noEmit 退出码 0（D.1）
  - `programmatic` TR-3.3: browser_console_messages 中 `[antd:` 前缀计数 3 次操作（approve/reject/retry）后 = 0（D.2）
  - `human-judgement` TR-3.4: AC-3 容错后 console.warn 是否输出一条 `refreshBadgeCounts: completed failed`（从 console_messages 过滤确认），且 completedCount 数值保持原值
  - `human-judgement` TR-3.5: 6 处动作中至少 3 处的 stats 今日审核通过 / 今日上链成功 数值对比动作前后有变化（非 0），证明 stats 确实刷新

## 任务依赖 DAG 概览
```
Task 1 (allSettled + afterAuditAction)
  └──→ Task 2 (7 调用点替换)
         └──→ Task 3 (浏览器 7 条 AC 验证)
```
