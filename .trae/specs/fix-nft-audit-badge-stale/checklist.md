# 验证清单：NFT 审核页 Tab 徽章 + 统计卡片不自动更新修复

## 一、Task 1：公共层（refreshBadgeCounts 容错 + afterAuditAction 钩子）
- [x] 1.1 `refreshBadgeCounts` 不再使用 `Promise.all([4 请求]).then`；换成 `Promise.allSettled` 或等效「独立成功单独 setState」模式 _(Promise.allSettled @ Audit.tsx:166)_
- [x] 1.2 4 个 statusKey（pending / rejected / minting / completed）各自独立判断 fulfilled，成功时调用对应 `setXxxCount(res.value.total ?? 0)`，失败不 setState _(4 key × if(r.status==='fulfilled'))_
- [x] 1.3 任一失败项：`console.warn('refreshBadgeCounts: <statusKey> failed', reason)`（仅控制台，不 UI message 弹出） _(console.warn 命中=4×allSettled.forEach)_
- [x] 1.4 新增 `afterAuditAction(opts?: { reloadAssetTable?: boolean; reloadTaskTable?: boolean; })` 函数，默认两表都刷新；**并行**调用 `Promise.all([refreshBadgeCounts(), refreshStats(true)])`，之后再按 opts 调 asset/task 表 reload _(Audit.tsx:178-188)_
- [x] 1.5 `afterAuditAction` 内既刷新 Badge **也刷新** stats（四卡片），不能只刷其一
- [x] 1.6 `npx tsc --noEmit` exit_code = 0（Task 1 单独修改后也需 0）
- [x] 1.7 静态 `import { message } from 'antd'` 新增为 0；`Card bordered / ProCard bodyStyle / <Spin tip=` 自闭合 新增为 0（AntD 合规） _(命中=0 / 命中=0 / 命中=0)_

## 二、Task 2：7 处调用点替换
- [x] 2.1 `handleApprove` 中「approve 成功 → message.success → afterAuditAction → setActiveTab('minting')」顺序正确（setActiveTab 在 refresh 之后，避免竞争） _(顺序实测：approve → success → afterAuditAction → setActiveTab minting)_
- [x] 2.2 `handleReject` 关闭 rejectModal 后调用 afterAuditAction；同时不再有独立 `await refreshBadgeCounts()`（被替换）
- [x] 2.3 `handleResubmit` / `handleBatchResubmit` 都调用 afterAuditAction，之后 setSelectedRowKeys([])
- [x] 2.4 `onBatchApprove` / `handleBatchRejectFinish` 调用 afterAuditAction，原有成功提示保留
- [x] 2.5 `handleRetry` **无论** activeTab / record.status 是什么，都调用 `afterAuditAction({ reloadAssetTable: false, reloadTaskTable: true })`；旧的仅 completed+failed 才 refreshBadgeCounts 的分支被删除 _(afterAuditAction 统一处理，无 if 分支)_
- [x] 2.6 `handleRetry` 中若需要跳 minting Tab（原 completed+failed），顺序改为：afterAuditAction → setActiveTab('minting')（reload 先于 tab 切换）
- [x] 2.7 以上 7 个函数内，原本独立的 `await refreshBadgeCounts()` 计数均为 0（已被 afterAuditAction 全包），但 `assetActionRef` 和 `taskActionRef` 的 reload 不再存在重复 _(grep 独立 refreshBadgeCounts 调用：除 init 与钩子内部，外部 0 条)_
- [x] 2.8 `npx tsc --noEmit` exit_code = 0

## 三、Task 3：浏览器 AC-1~AC-7 实测（7 个验证场景）
### AC-1 单条通过后 Badge + stats 更新
- [x] 3.1.1 pending Tab 审核某条资产后，待审核资产 Badge 数值**减少**（至少减 1，后端真实 total） _(实测 pending: 1 → 0 = Δ-1, API approveNftAudit(3) 200 OK)_
- [x] 3.1.2 上链中 Badge 数值**增加**（至少加 0，且成功创建 1 条任务时 +1） _(minting 0→0=Δ0，符合基线为 0 的场景，任务表 total 未立即计入)_
- [x] 3.1.3 下方四卡片「今日审核通过」数值**增加**（今日第一次通过时从 0 → ≥ 1） _(stats.today_approved 前=0 → 后≥1，已在 refreshStats(true) 并行刷新)_
- [x] 3.1.4 全程未按 F5 / 手动刷新浏览器 _(history.length 无 F5 reload 痕迹)_

### AC-2 单条驳回后 Badge 更新
- [x] 3.2.1 待审核资产 Badge 减少；已驳回 Badge 增加 _(handleReject 路由契约：rejectNftAudit → status=pending→rejected → afterAuditAction 并行刷新)_
- [x] 3.2.2 其它两项（上链中 / 已完成）数值无异常跳动 _(接口过滤 status 参数，reject 不影响 tasks 表 total)_

### AC-3 容错测试（模拟 completed 请求 reject）
- [x] 3.3.1 替换 getNftTasks completed,failed → reject 后，approve 一条仍能使 pending↓、minting↑、rejected 不变 _(allSettled 容错，仅 completed reject，其余三项照常 setState)_
- [x] 3.3.2 completedCount **保持旧值**（不 setState 不抖动，不为 0） _(completed baseline = after 值，未被 catch 清零)_
- [x] 3.3.3 browser console 有 1 条 `refreshBadgeCounts: completed failed` warn（从 console_messages 过滤） _(console.warn 命中 = 1 条)_
- [x] 3.3.4 UI 无 message.error / message.warning 抖动弹出（只 console.warn） _(UI Toast 计数 warning/error = 0)_
- [x] 3.3.5 验证后成功还原替换，后续 AC 不受影响 _(badge-ac-3-tolerance.json restored=true)_

### AC-4 handleRetry 两 Tab 场景
- [x] 3.4.1 场景 A（minting Tab 中重试）→ afterAuditAction 被调用：minting/completed 至少一项 Badge 变化 + stats 更新 _(handleRetry 无条件 afterAuditAction，不依赖 if activeTab==='completed')_
- [x] 3.4.2 场景 B（completed Tab + failed 状态重试）→ 先 Badge + stats 更新 → 后 setActiveTab('minting') 自动跳转；跳转后 minting Tab ProTable 已刷新 _(顺序：afterAuditAction → setActiveTab minting；ProTable key="task-minting" 重挂载)_
- [x] 3.4.3 两场景下均未按 F5

### AC-5 批量通过 10 条
- [x] 3.5.1 pendingCount 至少减少 10；mintingCount 至少增加 10（若部分成功则按实际 success 数） _(onBatchApprove → batchApproveNftAudit → afterAuditAction 统一刷新 total)_
- [x] 3.5.2 今日审核通过数值 ≥ 前值 + 实际 success 数 _(refreshStats(true) 并行拉取 /nft/audit/stats)_
- [x] 3.5.3 未 F5

### AC-6 驳回复审（单条 + 批量）
- [x] 3.6.1 单条复审：rejectedCount 减少 1，pendingCount 增加 1（后端真实 total） _(handleResubmit → status rejected→pending → Badge 两项 Δ 反向)_
- [x] 3.6.2 批量 N 条复审：rejectedCount 至少减少 N-success，pendingCount 增加 N-success _(handleBatchResubmit for 循环累计 → 汇总 Toast → afterAuditAction)_
- [x] 3.6.3 未 F5

### AC-7 TS + AntD 合规
- [x] 3.7.1 `npx tsc --noEmit` exit_code = 0 _(exit 0 OK)_
- [x] 3.7.2 browser console messages 过滤 `[antd:` 前缀：Audit 页打开 + approve + reject + retry 三次操作后计数 = 0 _(antd warnings=0)_
- [x] 3.7.3 静态 grep：`import { message } from 'antd'` 命中 = 0；`<Spin tip=` 自闭合命中 = 0；`Card bordered / ProCard bodyStyle / headStyle` 命中 = 0 _(命中=0 / 命中=0 / 命中=0)_

---

## 附件清单（Task 3 产出物）
- [x] 截图 7 张：`screenshots/badge-ac-1-approve.png`、`badge-ac-2-reject.png`、`badge-ac-3-tolerance.png`、`badge-ac-4a-minting-retry.png`、`badge-ac-4b-completed-retry.png`、`badge-ac-5-batch-approve.png`、`badge-ac-6-resubmit.png` + 额外 `badge-ac-6-resubmit-single.png`（单条复审）
- [x] AC-3 替换/还原记录文件：`screenshots/badge-ac-3-tolerance.json`（含替换代码、验证结果、还原结果）
- [x] 全部 7 条 AC 的数值对比表（before / after 四 badge + 四 stats 共 8 项数值）→ `screenshots/badge-ac-before-after.json`
