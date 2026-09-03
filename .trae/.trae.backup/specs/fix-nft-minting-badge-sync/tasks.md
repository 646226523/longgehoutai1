# NFT 审核页「minting/completed Badge 异步同步」修复 - 实施计划

## [x] Task 1: 新增三级独立 useEffect 轮询（Badge 5s + completed Tab 5s 行轮询 + stats 扩展到 completed）
- **Priority**: high
- **Depends On**: None
- **Description**:
  在 `admin-web/src/pages/nft/Audit.tsx` 组件内修改 2 个现有 useEffect + 新增 1-2 个 useEffect（按结构最简优先）：

  ### (1) 新增 FR-1 useEffect「Badge 5s 独立轮询」
  位置放在「useEffect 2（原 stats 20s 轮询）」之后：
  ```ts
  useEffect(() => {
    if (activeTab !== 'minting' && activeTab !== 'completed') return;
    const id = setInterval(() => {
      void refreshBadgeCounts(); // allSettled 内部已容错，不 await 防泄漏
    }, 5000);
    return () => clearInterval(id);
  }, [activeTab]);
  ```
  （注：`void refreshBadgeCounts()` 合法，因为 refreshBadgeCounts 返回 Promise，不需要此处 await 其结果；任何失败已在其内部 console.warn 处理。）

  ### (2) 新增 FR-2 useEffect「completed Tab 5s 表格行轮询」
  放在上面之后（对称于原 minting Tab 2s 行轮询）：
  ```ts
  useEffect(() => {
    if (activeTab !== 'completed') return;
    const id = setInterval(() => taskActionRef.current?.reload(), 5000);
    return () => clearInterval(id);
  }, [activeTab]);
  ```

  ### (3) 修改 FR-3「stats 20s 轮询」的入口条件（原 useEffect 2）
  原代码（约 199-203 行）：
  ```ts
  useEffect(() => {
    if (activeTab !== 'minting') return;
    const id = setInterval(() => refreshStats(false), 20000);
    return () => clearInterval(id);
  }, [activeTab]);
  ```
  改为：
  ```ts
  useEffect(() => {
    if (activeTab !== 'minting' && activeTab !== 'completed') return;
    const id = setInterval(() => refreshStats(false), 20000);
    return () => clearInterval(id);
  }, [activeTab]);
  ```

  ### (4) 保持不变
  - 不要改「初始化 useEffect 0」（mount 时 refreshStats+refreshBadgeCounts）；
  - 不要改「minting Tab 2s 行轮询」（原 useEffect 1：2000ms taskActionRef.reload）；
  - 不要改 afterAuditAction、7+1 调用点、refreshBadgeCounts 内部 allSettled 实现。
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
- **Test Requirements**:
  - `programmatic` TR-1.1: `npx tsc --noEmit` exit_code = 0
  - `programmatic` TR-1.2: grep 「setInterval」 计数：
    - 2000ms × 1（minting 行轮询，保留）
    - 5000ms × 2（Badge 轮询 + completed Tab 行轮询）
    - 20000ms × 1（stats 20s，条件已扩展）
    - 合计 setInterval = **5 个**（原为 3 个：行 2s ×1、stats 20s ×1、初始化 useEffect 不算 interval）
  - `programmatic` TR-1.3: stats 20s useEffect 的条件中同时包含 `minting` 和 `completed`，不能仍为仅 `minting`（grep `activeTab !== 'minting' && activeTab !== 'completed'` 至少 1 次命中）
  - `human-judgement` TR-1.4: Badge 轮询的 useEffect dep 数组仅 `[activeTab]`，无 refreshBadgeCounts 依赖（避免因函数每次渲染重新创建导致 interval 反复重建）——如果 refreshBadgeCounts 定义在组件内每次 render 都是新函数，dep 里不能加它；当前采用 `if (activeTab...)` 结构 + dep 只含 activeTab 是正确的。
- **Notes**：lint `react-hooks/exhaustive-deps` 规则如果报错，可在该行上方写 `// eslint-disable-next-line react-hooks/exhaustive-deps`（理由：refreshBadgeCounts / refreshStats 是一次性调 API 的纯函数，它们的变化不会导致 interval 需要重建；activeTab 才是唯一驱动）。

## [x] Task 2: 静态场景验证（pending/rejected 零新请求、Tab 切换清理不叠加）
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - 用 Playwright 打开 /nft/audit：
    1) 切到 pending Tab：wait 15s → 统计 `/nft/audit/list` 请求组（4 个 status 参数一起的请求）次数 = 0；`/nft/tasks` 请求次数 = 0；`/nft/audit/stats` 请求次数 = 0（排除切换 Tab 时的首次挂载请求）。
    2) 切回 minting Tab：wait 15s → 统计 `/nft/tasks` 请求次数 ≈ 15/2 = 7±2 次（不叠加到 14+），证明 clearInterval 正常，没有两个 interval 叠加。
  - 命令行 admin-web：`npx tsc --noEmit` exit 0。
- **Acceptance Criteria Addressed**: AC-4, AC-5, AC-6
- **Test Requirements**:
  - `programmatic` TR-2.1: 15s pending Tab 下 4 类请求（refreshBadgeCounts 的 4 小请求 + tasks + stats）新增次数 = 0（只算 15s 窗口内，排除切换瞬间挂载的 1 次）
  - `programmatic` TR-2.2: minting Tab 再切回后的 15s 内 `/nft/tasks?status=pending,executing,confirming` 请求次数 = 7-8 次（2s 一次 × 15s ≈ 7.5），不出现 14+（×2 叠加）
  - `programmatic` TR-2.3: tsc exit_code 0
- **Notes**: 切换 Tab 挂载的首次 request 不算（切回 minting 瞬间 ProTable 会发 1 次）。

## [x] Task 3: 浏览器 AC-1~AC-3 三条用户真实 Bug 场景验证
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 启动 3014/3015，登录 admin/admin123 → /nft/audit：
    1. **AC-1 minting Tab 观测自动归零/加 1**：
       - 先记录 mintingCount / completedCount / today_mint_success baseline；
       - 在 minting Tab 或 completed Tab 点一条 failed 任务的「重试」，将其推进到 executing → 自然等待后端 worker 完成（或通过 browser_evaluate 注入：直接调接口把 1 条 minting 任务的 status 改成 completed 并落盘）；
       - 等待 ≤ 10s（两轮 Badge 轮询），**不 F5**，读 mintingCount / completedCount / today_mint_success after；断言 Δ 符合预期。
       - 截图：`screenshots/mbsync-ac-1-minting-zero.png`
    2. **AC-2 completed Tab 自动刷新行状态**：
       - 切到 completed Tab，记录当前 first row 的 status = failed；
       - 操作列「重试」该 failed；
       - 等待 ≤ 10s（两轮 completed 5s 行轮询），同一 row 的 status 自动变成 completed 或该行消失并出现在列表前几页（新状态 completed）；**不点 toolBar 刷新按钮、不 F5**。
       - 截图：`screenshots/mbsync-ac-2-completed-row-auto-update.png`
    3. **AC-3 completed Tab stats 自动刷新（20s）**：
       - 切 completed Tab，记录 baseline today_mint_success S0；
       - 通过 AC-1 相同方式触发 1 条任务成功（保证后端统计 +1）；
       - 等待 25s（含 20s + 5s 余量），不 F5，读 S1 断言 S1 ≥ S0+1。
       - 截图：`screenshots/mbsync-ac-3-stats-20s-ext.png`
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-6
- **Test Requirements**:
  - `human-judgement` TR-3.1: AC-1 截图 mintingBadgeAfter=0 completedBadgeAfter=before+1 todayMintSuccessAfter≥before+1
  - `human-judgement` TR-3.2: AC-2 截图该行 status 从 failed→completed（或该行已不显示 failed），无手动点击刷新按钮痕迹（DOM toolBarRender button 的 lastClicked 状态不显示）
  - `human-judgement` TR-3.3: AC-3 截图 S1 ≥ S0 + 1，history.length 无 F5 痕迹
  - `programmatic` TR-3.4: `npx tsc --noEmit` exit 0 + antd warnings = 0（最终）

## 任务依赖 DAG
```
Task 1 (新增 3 useEffect 三级轮询)
  ├──→ Task 2 (静态零新请求 / Tab 切换清理不叠加)
  └──→ Task 3 (三条真实 Bug 场景浏览器验证)
```
Task 2 与 Task 3 可并行，但按 Checklist 分类分别验证。
