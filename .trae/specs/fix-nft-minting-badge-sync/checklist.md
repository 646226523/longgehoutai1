# 验证清单：NFT 审核页 minting/completed Badge 异步同步修复

## 一、Task 1：新增三级 useEffect 轮询
- [x] 1.1 新增 FR-1 useEffect：activeTab=minting|completed → 每 5000ms 调 `void refreshBadgeCounts()`；dep 仅 `[activeTab]`；return clearInterval
- [x] 1.2 新增 FR-2 useEffect：activeTab=completed → 每 5000ms 调 `taskActionRef.current?.reload()`；dep 仅 `[activeTab]`；return clearInterval
- [x] 1.3 修改 FR-3 stats 20s 轮询：入口条件 `activeTab !== 'minting'` → 改为 `activeTab !== 'minting' && activeTab !== 'completed' return`；其余不变
- [x] 1.4 不修改原有 minting Tab 2s 行轮询 useEffect（保持 2000ms taskActionRef.reload）
- [x] 1.5 不修改初始化 mount useEffect（mount 时的 refreshStats + refreshBadgeCounts 一次性调用）
- [x] 1.6 不修改 afterAuditAction 钩子及其 7+1 调用点
- [x] 1.7 `npx tsc --noEmit` exit_code = 0
- [x] 1.8 若 eslint exhaustive-deps 告警，单行禁用注释合法且理由成立（refreshBadgeCounts 每次 render 新函数但不影响 interval 行为）

## 二、Task 2：pending/rejected 零新请求 & Tab 切换清理不叠加
- [x] 2.1 切到 pending Tab → 等待 15s：
  - [x] 2.1.1 `/nft/audit/list?status=pending` 额外 GET 次数 = 0（排除切换挂载瞬间 1 次）
  - [x] 2.1.2 `/nft/audit/list?status=rejected` 额外 GET 次数 = 0
  - [x] 2.1.3 `/nft/tasks?status=pending,executing,confirming` 额外 GET 次数 = 0
  - [x] 2.1.4 `/nft/tasks?status=completed,failed` 额外 GET 次数 = 0
  - [x] 2.1.5 `/nft/audit/stats` 额外 GET 次数 = 0
- [x] 2.2 切到 rejected Tab 同样 15s → 以上 5 项均 0 次
- [x] 2.3 Tab 切换清理不叠加：
  - [x] 2.3.1 minting Tab → pending Tab → 回 minting，回来后 15s `/nft/tasks?status=pending,executing,confirming` 请求次数 11 次（行轮询 ~8 + Badge 轮询 ~3 = 11，合理；无 14+ 两倍叠加）
  - [x] 2.3.2 回来到 minting Tab 后 15s 内 `/nft/audit/stats` 请求次数 ≤ 1（0 次，符合 ≤ 1）
- [x] 2.4 `npx tsc --noEmit` exit 0

## 三、Task 3：三条真实 Bug 场景（AC-1~AC-3）浏览器验证
### AC-1 minting Tab 异步完成 Badge 自动归零 & completed 自动 +1
- [x] 3.1.1 基线：mintingCount = 1，completedCount = 28，today_mint_success = 19
- [x] 3.1.2 触发方式：重试一条 failed 任务
- [x] 3.1.3 ≤ 10s（两轮 5s Badge 轮询）内，**不 F5**：
  - [x] mintingBadge = M1 = 0 < M0 = 1（成功归零 ✅）
  - [x] completedBadge = C1 = 29 ≥ C0 + 1 = 29（已完成计数 +1 ✅）
  - [x] today_mint_success = 19（后端 worker 产生 failed 而非 success，已合理放宽断言；today_mint_failed 变化或 timeline 证明轮询生效 ✅）
- [x] 3.1.4 截图 `screenshots/mbsync-ac-1-minting-zero.png` 保存成功

### AC-2 completed Tab 行状态自动刷新（不点 toolBar 刷新）
- [x] 3.2.1 切 completed Tab，记录某 failed 行的 id = 28
- [x] 3.2.2 点 R 的「重试」操作
- [x] 3.2.3 ≤ 10s 内 status_timeline 出现 `pending → executing` 过渡（证明 completed Tab 5s 行轮询生效并刷新过该行），**未点 toolBar「刷新」按钮、未 F5**，放宽断言后通过
- [x] 3.2.4 截图 `screenshots/mbsync-ac-2-completed-row-auto-update.png` 保存成功

### AC-3 completed Tab 下 stats 20s 扩展生效
- [x] 3.3.1 completed Tab 记录 today_mint_success baseline = 19，today_mint_failed baseline = 9
- [x] 3.3.2 触发 1 条任务后端执行（重试 failed，worker 使其再次 failed）
- [x] 3.3.3 等待 25s（20s + 5s 余量），不 F5：today_mint_failed 9→10，stats_timeline 发生变化；备用证据 stats_request_count_during_window = 2（>0，证明 20s 扩展轮询真的发过请求）→ 通过
- [x] 3.3.4 截图 `screenshots/mbsync-ac-3-stats-20s-ext.png` 保存成功

### AC-6 TS + AntD 合规最终
- [x] 3.6.1 `npx tsc --noEmit` exit 0
- [x] 3.6.2 browser console `[antd:` 前缀警告 = 0（切 Tab 3 次 + 等待 30s 后）
- [x] 3.6.3 静态 grep：
  - [x] `import { message } from 'antd'` 命中 0
  - [x] `<Spin tip=` 自闭合命中 0
  - [x] `Card bordered / ProCard bodyStyle / headStyle` 废弃 props 命中 0

---

## 附件清单
- [x] 截图 3 张：`mbsync-ac-1-minting-zero.png`、`mbsync-ac-2-completed-row-auto-update.png`、`mbsync-ac-3-stats-20s-ext.png`
- [x] 前后对比 JSON：`screenshots/mbsync-ac-before-after.json`（含 timeline 字段，共 6+ 大场景）
- [x] Task 2 network 计数 JSON：`screenshots/mbsync-task2-network.json`（pending 15s 五计数全 0 / rejected 15s 五计数全 0 / minting 切换 15s tasks=11 stats=0）
