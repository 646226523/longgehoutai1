# NFT 审核页「上链成功后 minting Badge 不清零 / completed Badge 不增加 需 F5」修复 - PRD

## Overview
- **Summary**：修复后台 `pages/nft/Audit.tsx` 中，后端 worker 异步把上链任务从「minting (pending/executing/confirming)」推进到「completed/failed」后，前端四个 Tab Badge 的 `mintingCount`/`completedCount` 不更新，必须工作人员手动刷新（F5）才能回正的 Bug。新增三级独立周期轮询机制，让工作人员在 minting Tab 和 completed Tab 观察期间，Badge、表格行、统计四卡能自动同步。
- **Purpose**：消除「行显示状态变了但 Tab 上方数字没变」的不一致错觉，避免工作人员以为上链卡住而重复重试或 F5，提升长时间观察 minting 任务的后台效率。
- **Target Users**：后台审核员 / 运营管理员（长期挂 minting / completed Tab 观察任务进度）。

## Goals
- G1：新增 **Badge 5s 独立轮询**，当 activeTab 为 minting 或 completed（任务异步变化高频窗口）时，每 5s 调用 `refreshBadgeCounts()` 自动更新 4 Tab 计数（不依赖 ProTable 行轮询）。
- G2：新增 **completed Tab 5s 表格行轮询**（对称于 minting Tab 的 2s 轮询，但 5s 即可，任务进入 completed 后不再高频变化），切到 completed Tab 后表格自动刷新失败→重试成功后的新状态。
- G3：**stats 20s 轮询扩展到 completed Tab**（原仅 minting Tab 生效），让 completed 观察场景下今日上链成功/失败统计保持新鲜。
- G4：与前一 Spec 的 `afterAuditAction` 一次性刷新 **互不干扰**：动作触发 → afterAuditAction 立即刷新；异步 worker 场景 → 周期轮询兜底。
- G5：向后兼容：pending / rejected Tab 下不新增周期轮询（无意义，减少网络开销）。

## Non-Goals (Out of Scope)
- **不做** WebSocket / SSE 推送（三级 HTTP 轮询已满足，不引入新依赖）。
- **不做** ProTable request 的 total 副作用回写 state（方案 B 放弃，避免与组件挂载顺序耦合与竞态）。
- **不做** Badge 的乐观本地 ±1 更新（后端权威 total 已在轮询中返回，避免幻数漂移）。
- **不做** List.tsx 等其他页面。
- **不做** `pending / rejected` 资产 Tab 的周期轮询（没有异步 worker 会自动改变 asset status，不需要）。

## Background & Context
### 1. 当前轮询现状（三独立 useEffect，仅作用于 minting Tab）
```
① 行轮询（useEffect 1 @ activeTab==='minting'）
   setInterval 2000ms → taskActionRef.current?.reload()
   → 只刷新 ProTable<NftMintTask> 行 request 的 { data, total, success }
   → ProTable 的 total 仅用于内部分页显示，**不回写**顶层 mintingCount / completedCount state。

② 统计卡轮询（useEffect 2 @ activeTab==='minting'）
   setInterval 20000ms → refreshStats(false)
   → 只刷 stats.today_approved / today_mint_success / today_mint_failed / avg_duration_sec，
     **不调用** refreshBadgeCounts()。

③ 初始化（useEffect 0 mount 时）
   refreshStats(true) + refreshBadgeCounts()
   → 只在 F5 或重新挂载页面（路由切换）时触发一次。
```

### 2. 当前完成 Tab 完全没有任何轮询
`activeTab !== 'minting'` → useEffect 1 和 2 都 **clearInterval**。completed Tab 打开后：
- 表格行不自动刷新（失败任务 retry 后的状态只能手动点刷新按钮）；
- Badge 4 计数不自动更新；
- stats 四卡不自动更新。

### 3. 前序修复保持（Spec 3 / fix-nft-audit-badge-stale）
- `refreshBadgeCounts()` Promise.allSettled 容错模式已生效；
- `afterAuditAction` 钩子并行 `refreshBadgeCounts + refreshStats(true)` 已存在，不改动；
- 7+1 处动作调用点不改动。

### 4. 典型 Bug 复现（用户截图）
> 上链任务 1 条在 minting Tab → 后端 worker 在 5s 内 minting→completed（数据库层 tasks.status=completed）→ 表格行由于 2s 轮询已显示「成功」→ **但 minting Badge 仍 = 1，completed Badge 仍 = 28，已完成信息数值参数没增加**。用户必须手动 F5 → useEffect 0 再跑，数值才回正到「minting=0，completed=29」。

## Functional Requirements
- **FR-1** 新增「Badge 5s 独立轮询」useEffect（G1）：
  - 触发条件：`activeTab === 'minting' || activeTab === 'completed'`
  - 频率：5000ms
  - 动作：每 5000ms 调用 `void refreshBadgeCounts()`（**不 await**，避免 Promise 泄漏；但 refreshBadgeCounts 内部 allSettled 已处理失败，void 也 OK）
  - 清理：useEffect return clearInterval

- **FR-2** 新增「completed Tab 5s 表格行轮询」useEffect（G2）：
  - 触发条件：`activeTab === 'completed'`
  - 频率：5000ms
  - 动作：每 5000ms `taskActionRef.current?.reload()`（对称于 minting Tab 的 2s task 行轮询，但选择 5s 因为完成后变化低频）
  - 清理：return clearInterval

- **FR-3** 扩展 stats 20s 轮询（原 useEffect 2）（G3）：
  - 原条件：`activeTab !== 'minting' return` → 改为：`if (activeTab !== 'minting' && activeTab !== 'completed') return;`
  - 频率保持 20000ms，内容 `refreshStats(false)`，不增加网络压力。
  - 清理：return clearInterval

- **FR-4** Tab 切换清理 + 避免重复 interval：
  - 三个新 useEffect 都把 `activeTab` 写进 dep 数组；tab 切换 → return 先清上一个 interval，再按新 activeTab 建立新 interval。
  - FR-1/FR-2/FR-3 三个 dep 数组都只含 `[activeTab]`（与现有两个 useEffect 风格一致）。

- **FR-5** 与一次性钩子 afterAuditAction 和平共处（G4）：
  - 在 afterAuditAction 触发的瞬间会并行刷新一次 Badge + stats（即时），周期轮询作为异步 worker 兜底（延后），二者不互斥。
  - 不修改 afterAuditAction 逻辑。

- **FR-6** 无意义 Tab 不发请求（G5）：
  - 当 activeTab 为 pending / rejected → FR-1/FR-2/FR-3 的 useEffect 全部 return，不产生额外网络开销。

## Non-Functional Requirements
- **NFR-1** 类型安全：`npx tsc --noEmit` exit_code = 0。
- **NFR-2** AntD 合规：切 Tab + 打开 30s 后 `[antd:` 前缀计数 = 0。
- **NFR-3** 不引入新废弃 props：Card variant / styles.body 保持现状。
- **NFR-4** 性能：新增三级轮询请求量 ≤ 4 请求/min（badge 每 5s = 12/min？不对：badge 每次 4 请求？哦 refreshBadgeCounts 里是 Promise.allSettled(4× pageSize=1 请求)。每 5s 发 4 请求 = 48 请求/min。考虑到后台并发用户少，可接受。）
  补充：如果 admin-api 有 `/nft/audit/badge-counts` 专用单接口返回 { pending, minting, completed, rejected } 4 字段——**但后端目前没有，不新增 API（Constraints 第三条）**。按现状复用 refreshBadgeCounts 即可。
- **NFR-5** 稳定性：refreshBadgeCounts 的 allSettled 模式保证单请求失败不影响其它三项，与 minting Tab 的行轮询 2s 不冲突，不会 double setState（两个轮询频率不同，React 18 会自动批处理）。

## Constraints
- **Technical**：React Hooks setInterval 模式；不能引入 WebSocket/SSE；不能改后端 schema。
- **Business**：不能让后台审核员看到 Badge 与表格行不一致的陈旧状态。
- **Dependencies**：复用现有 `refreshBadgeCounts()` / `refreshStats()` / `taskActionRef.current?.reload()` 三个调用，**不新增 API**。

## Assumptions
- 后台 admin-api 和 admin-web 都常驻（setInterval 在切换到 completed Tab 期间有效）。
- 后台审核员长时间停留在 minting / completed Tab 的场景是典型场景（否则切 Tab 会触发挂载重绘已足够）。
- minting Tab 原有的 2s 行轮询不需要加快（表格进度条 / 百分比 / status 粒度足够）。

## Acceptance Criteria

### AC-1: minting Tab 等待任务异步完成 → Badge 自动归零 + completed 自动+1（无需 F5）
- **Given**：后端有 1 条 minting 任务（状态 executing），当前 `mintingCount=1, completedCount=28`；切到 minting Tab。
- **When**：模拟后端 worker 异步把该任务改成 status=completed（可通过 browser_evaluate 发一个 POST /api/admin/nft/tasks/:id/force-success 或直接 mock 更新 db；或通过「重试一个失败任务」等待 5s+ 自然完成——如果真实后端 10s 内能完成则用真实等待）。
- **Then**（无需 F5）：
  1. minting Badge 计数自动减少（期望值 = 0）
  2. completed Badge 计数自动增加（期望值 = 29），且时间 ≤ 最新轮询间隔（5-10s 内）
  3. stats 今日上链成功数值同步增加
- **Verification**: `human-judgment`
- **Notes**: 如果任务自然完成时间过长，请替换或注入完成触发方式（推荐：browser_evaluate 调用 retryNftTask 让一条 failed → executing → completed 循环后，等待 10s 观测）。

### AC-2: completed Tab 打开后，表格行状态自动刷新（无需 F5，无需点刷新按钮）
- **Given**：completed Tab 有 1 条 failed 任务；切到 completed Tab。
- **When**：点「重试」按钮 → 后端 worker 异步执行 → 完成。
- **Then**：≤ 2 × 5s 轮询周期（≤ 10s）内，failed 任务的表格行 status 自动变为 completed（或新出现一条成功任务），**未点 toolBarRender 的「刷新」按钮、未 F5**。
- **Verification**: `human-judgment`

### AC-3: completed Tab 下 stats 四卡自动刷新（20s 周期）
- **Given**：切到 completed Tab，记录 stats baseline today_mint_success = S0。
- **When**：等待 25s（比 20s 多留 5s 余量）期间有 1 条任务完成（可通过 AC-1 同方法触发）。
- **Then**：today_mint_success ≥ S0 + 1（数值变化过），未 F5。
- **Verification**: `human-judgment`

### AC-4: pending / rejected Tab 下不产生新周期请求（零开销）
- **Given**：切到 pending Tab 或 rejected Tab。
- **When**：等待 15s。
- **Then**：
  1. 不调用 refreshBadgeCounts（通过 browser_network_requests 过滤 /nft/audit/list 4 请求组 = 0 次）。
  2. 不调用 taskActionRef.reload（不发 /nft/tasks 请求）。
  3. 不调用 refreshStats（不发 /nft/audit/stats 请求）。
- **Verification**: `programmatic`（network request 计数）

### AC-5: 切换 Tab 时上一个 Tab 的 interval 清理成功
- **Given**：先停在 minting Tab 15s 让三个 interval 跑起来。
- **When**：切到 pending Tab → 等 10s 再切回 minting Tab。
- **Then**：
  1. Tab 切换期间 pending Tab 不发送任何额外请求（AC-4 成立）
  2. 切回 minting Tab 后，**轮询频率仍然为 2s / 5s / 20s（不翻倍）**——无「两个 setInterval 叠加」的抖动（可通过 browser_network_requests 采样 15s，统计 /nft/tasks 请求数 ≈ 15/2 = 7-8 次，不是 14+ 次）。
- **Verification**: `programmatic`（network 计数）
- **Notes**: 若出现 2× 叠加频率 = 未正确 clearInterval，立即修。

### AC-6: TS + AntD 合规不回归
- **Given**：修复完成。
- **When**：`npx tsc --noEmit` + browser console 过滤 `[antd:` + admin-api/services grep 废弃 API。
- **Then**：tsc exit 0；console `[antd:` 计数 = 0；`import { message }` / `<Spin tip=` 自闭合 / Card 废弃 props = 0。
- **Verification**: `programmatic`

## Open Questions
- [ ] 是否需要把 refreshBadgeCounts 的 4 个 pageSize=1 请求合并成后端专用单接口 `/nft/audit/badge-counts` → **当前不做**（Constraints：不改后端）。后续如发现 4× 请求/min 压力大，可单独开 Spec 升级。
- [ ] 是否把 minting Tab 的 2s 轮询也放慢到 3s 降低压力 → **不做（Non-Goals）**，保持现状（用户已有预期 2s 级进度条刷新）。
