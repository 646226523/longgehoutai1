# 上链审核工作台重构 - 产品需求文档 (PRD)

## Overview
- **Summary**: 将 NFT 上链审核页面从"两个互不关联的独立表格"重构为"一个统一流程工作台"。以状态 Tab 驱动视图（待审核资产 / 上链中 / 已完成 / 已驳回），打通"人工审核通过 → 自动创建上链任务 → 实时进度反馈 → 完成闭环"的数据联动，新增预览、批量操作与今日统计看板，解决"审核通过后资产在任务列表看不到"的流程断裂核心问题。
- **Purpose**: 修复当前上链审核页面的两大缺口：① 审核通过时 mock 后端只更新资产状态不创建 chain_task 记录，且 `/api/nft/tasks` 接口缺失，导致前后端数据完全断链；② UI 层缺少状态驱动视图、进度可视化与统计反馈，后台管理员无法完整感知"审核→上链→完成"全链路。
- **Target Users**: 赛鸽基因后台管理员（公棚运营人员，通常权限为 `nft:audit`），非技术背景，需要"一个页面看完、一键操作通过、能看到进度"。

## Goals
- G1: **打通核心数据联动**：审核通过接口自动创建 NftMintTask 记录，并补全 `/api/nft/tasks` mock 路由 + 区块确认进度/重试/交易哈希等字段，管理员能在同一页面从"待审核"看到"已完成"全链路。
- G2: **统一工作台 UI**：将上下两张独立表格改为 Tab 驱动（待审核 / 上链中 / 已完成 / 已驳回），附带每个阶段的数字徽标。
- G3: **可视化进度与反馈**：上链中/已完成 Tab 展示区块确认进度（3/12）、任务状态徽标（⏳ 🔵 🔄 ✅ ❌）、重试次数、交易哈希省略号+复制。
- G4: **审核前质量保障**：待审核资产增加 👁️ 预览按钮，展示 NFT 预览卡片 + 元数据结构化信息，避免误操作通过。
- G5: **批量操作效率**：提供全选/批量通过/批量驳回；底部追加"今日审核通过/今日上链成功/今日上链失败/平均耗时"4 项实时统计。

## Non-Goals (Out of Scope)
- 不接入真实区块链节点。进度、交易哈希、失败场景、自动重试等均通过 mock 后端使用定时器与随机数模拟，保证开发期 UI 可完整演示。
- 不实现真正的 Web3/合约调用或链上真实交易广播。
- 不实现申请人"通知申请人"的真实通知通道（mock 层只打 log 或置一个通知记录字段）。
- 不重构 NFT 资产列表（List.tsx）或新增铸造表单（NftMintForm.tsx），改造范围仅限 [Audit.tsx](file:///P:/龙鸽项目/longgehoutai/admin-web/src/pages/nft/Audit.tsx)、[services/nft.ts](file:///P:/龙鸽项目/longgehoutai/admin-web/src/services/nft.ts)、[server/mock.ts](file:///P:/龙鸽项目/longgehoutai/admin-web/server/mock.ts)。
- 不实现人工"强制完成 / 强制回滚"超管按钮（MVP 阶段只提供失败重试，P2 再考虑）。

## Background & Context
### 当前代码现状 (Audit.tsx + services/nft.ts + mock.ts)
1. [Audit.tsx 第 283-345 行](file:///P:/龙鸽项目/longgehoutai/admin-web/src/pages/nft/Audit.tsx#L283-L345)：页面上下两张独立 ProTable（"待审核资产"、"上链任务状态"），默认按 pending/status 过滤。没有 Tab，没有预览，没有批量，没有统计看板。
2. [mock.ts 第 823-826 行](file:///P:/龙鸽项目/longgehoutai/admin-web/server/mock.ts#L823-L826)（approve 分支）：审核通过仅执行 `item.status = 'minting'`，**不创建任何 chain_task 记录**，仅返回 `task_id: id + 10000` 假 ID。
3. `/api/nft/tasks` mock 路由：全局 grep 0 命中（mock.ts 中完全不存在该端点）。这是用户反馈"审核通过后任务列表里看不到"的直接根因。
4. 任务状态枚举（mock 第 638-646 行）：仅 `pending/processing/success/failed`，与用户设计的 5 阶段（pending/executing/confirming/completed/failed）有差异，需要在 Task 接口层扩展支持确认进度和交易哈希回填。

### 技术栈约束
- 组件层：React 18 + Ant Design 5 + @ant-design/pro-components（ProTable/ProCard 已使用）+ dayjs
- 已经完成 Task 1-4 控制台警告修复，所有 message 调用必须继续使用 `App.useApp()` 的 hook 版，严禁静态 `import { message } from 'antd'`。
- mock 路由已统一使用 `server.middlewares.use('/api/xxx', handler)` + stripped 路径匹配模式，新增 `NFT_TASKS_STORE` 存储 + `/api/nft/tasks` 路由必须遵循此约定，避免再次发生"prefix strip 导致路由不匹配"。

## Functional Requirements
- **FR-1 (P0: 状态 Tab 工作台)**: 页面顶部提供 4 个 Segmented/Tabs：待审核资产(N) / 上链中(N) / 已完成(N) / 已驳回(N)，每个 Tab 右侧有 badge 数字徽标，显示当前阶段记录数；切换 Tab 仅重渲染当前阶段对应的 ProTable，不影响其他 Tab 缓存。
- **FR-2 (P0: 审核通过自动创建上链任务)**: 点击"通过"（单条或批量）调用 `POST /api/nft/audit/:id/approve` 后，mock 后端必须原子完成三件事：① 更新资产 `status='minting'`；② 在新的 `NFT_TASKS_STORE` 中插入一条 NftMintTask 记录（asset_id 关联原资产，初始 `status='pending'`，`retry_count=0`，`block_progress = { current: 0, target: 12 }`）；③ 启动 mock 定时器模拟上链：pending → executing（500ms 后）→ confirming 逐步累加 block_progress（每 1 秒 +1）→ completed（12/12 或随机失败重试 3 次），最终回填 `tx_hash/contract_address/finished_at` 到 task 与 asset 两张表。
- **FR-3 (P0: 统一任务查询接口)**: 实现 `GET /api/nft/tasks` mock 路由，支持按 `status` 过滤（对应上链中 Tab 过滤 pending/processing/confirming，已完成过滤 completed/success，已驳回不显示任务），返回字段包含 `asset_name / token_id / owner_name / status / block_current / block_target / retry_count / tx_hash / contract_address / error_msg / created_at / started_at / finished_at`。
- **FR-4 (P0: 区块确认进度可视化)**: 在上链中 / 已完成 Tab 的任务行中，将之前简单的任务状态 Tag 升级为 "icon + label + Progress 进度条" 组合；进度百分比 = `block_current / block_target * 100`；执行中显示"3 / 12 区块"，完成时显示"12 / 12 ✅"。
- **FR-5 (P0: 审核通过后 UI 反馈闭环)**: 单条通过成功后：① `message.success('审核通过，已创建上链任务 Txxxx')`；② 当前待审核表格 reload（减少 1 条）；③ 自动切换 Tab 至"上链中"并触发 reload；④ 启动当前页面级 2s 轮询（只对仍在 executing/confirming/pending 的行生效）直至该行进入 completed/failed。
- **FR-6 (P1: NFT 审核前预览)**: 待审核 Tab 中每行新增"👁️ 预览"按钮，打开 Drawer/Modal，展示三大板块：① NFT 预览卡片（封面图 + 资产名称 + 品系/鸽主）；② 信息详情（结构化展示链上元数据：足环号、品系、羽色、眼砂、性别、赛绩、自定义属性等，使用前序 List.tsx 已验证过的 parseMetadata + safeJsonParse + CN_MAPPING 函数族，避免 JSON 代码块）；③ 基因档案关联信息。
- **FR-7 (P1: 批量审核)**: 待审核 Tab 中启用 ProTable rowSelection（仅 `status='pending'` 的行可选），底部工具栏显示"✅ 批量通过 / ❌ 批量驳回 / 已选中 X 条"；批量驳回时统一弹出输入框录入公共驳回理由（可为空）。
- **FR-8 (P1: 今日统计看板)**: 页面底部追加 4 项统计卡片（ProCard / 原生 Statistic）：今日审核通过 / 今日上链成功 / 今日上链失败 / 平均耗时；数据来源：mock 层对 asset 与 task 的 created_at/finished_at 做当日时间窗口统计；每完成一笔任务（定时器触发 completed 或 failed）自动刷新。
- **FR-9 (P1: 失败自动重试 + 人工重试)**: mock 定时器模拟 10% 概率抛"Gas 不足"、10% 概率抛"网络拥堵"、5% 概率抛"合约异常"；前两类当 `retry_count < 3` 时 30s 后自动重新进入 executing，第三类直接进入 failed 停止重试；UI 中 failed 行显示"失败原因"省略号 + Tooltip 完整文案 + "🔁 重试"按钮（调用 `POST /api/nft/tasks/:id/retry`，重置 `retry_count++`）。
- **FR-10 (P2: 驳回 Tab 保留可复审能力)**: "已驳回"Tab 显示被驳回的资产（status 支持 'rejected'），驳回理由、驳回时间、操作人；提供"重新提交审核"按钮（把 asset 状态切回 pending）。
- **FR-11 (P2: 响应式适配)**: 2560 宽度下统计看板一行 4 列平铺；1920 宽度下 2×2 网格；1080p 以下表格自动隐藏"失败原因 Tooltip/合约地址"次要列（ProTable 的 responsive ellipsis + scroll 已支持）。

## Non-Functional Requirements
- **NFR-1**: 控制台 0 条 AntD Warning——所有新增组件内的 message 必须来自 `const { message } = App.useApp()`，新增的 Spin（如果有 loading 占位）必须使用包裹 children 模式而非自闭合 + tip。
- **NFR-2**: 全局 `npx tsc --noEmit` 0 TS 错误（必须保留现有 `NftAsset / NftMintTask` 接口定义，并在其上扩展字段，保持 `List.tsx` 与 `NftMintForm.tsx` 的调用不被破坏）。
- **NFR-3**: 轮询性能：仅在存在"非终态任务"的 Tab 激活时才启动 2 秒轮询，离开 Tab 或全部任务完成后立即 `clearInterval` 释放。
- **NFR-4**: 所有新增接口必须返回 `{ code: 0, message: 'success', data: ... }` 统一格式，保持 axios 拦截器 `showError` 兼容。
- **NFR-5**: 交互一致性——新增按钮文案/图标与现有页面（NftMintForm.tsx 中 CheckOutlined/CloseOutlined/EyeOutlined 等）保持一致，不引入不统一的视觉风格。

## Constraints
- **Technical**: 继续使用 Ant Design 5 Pro 组件库（ProTable、ModalForm、ProCard、Statistic）；不引入 Zustand、Query 等新状态库；轮询用 useEffect + setInterval/clearInterval 原生方案；进度条使用 `Progress` from 'antd'。
- **Business**: 流程规则必须严格执行"审核通过即建任务；审核驳回流程终止"；审核通过后资产状态与任务状态必须 1:1 关联（asset.id → task.nft_asset_id），不允许孤儿 task。
- **Dependencies**: 复用 [services/nft.ts](file:///P:/龙鸽项目/longgehoutai/admin-web/src/services/nft.ts) 现有的 approveNftAudit / rejectNftAudit / retryNftTask / getNftAuditList / getNftTasks，仅扩展它们的 params 与返回类型；不额外引入 API 文件。

## Assumptions
- A1: 真实后端最终将替换 mock，但 MVP 阶段 mock 层需要能模拟"审核→建任务→执行→确认→完成/失败→重试"全流程，故 mock.ts 内允许使用 setInterval 做异步状态机。
- A2: 用户设计稿中"交易哈希 0x3f2a..b1c"省略号格式与复制按钮，使用前序 List.tsx 已使用的 Typography.Paragraph ellipsis + copyable 组合实现。
- A3: 今日统计的数据窗口定义为"自然日（本地时区 0 点起）"，平均耗时定义为"今日所有 completed 任务的 (finished_at - created_at) 平均值，单位分:秒"。
- A4: 批量通过在 mock 层顺序执行，单条失败不影响其他（Promise.allSettled），最终 UI 提示"通过成功 X / 失败 Y"。

## Acceptance Criteria

### AC-1: 审核通过自动创建任务并在"上链中"Tab 可见
- **Given**: 管理员处于"待审核资产"Tab，该 Tab 存在至少 1 条 pending 资产。
- **When**: 对其中 1 条资产点击"✅ 通过"并在 Popconfirm 确认。
- **Then**:
  - 该条资产从待审核 Tab 消失（总数减少 1）；
  - 页面自动跳转至"上链中"Tab，新 Tab 内立即出现刚通过的对应资产任务行（含资产名称、Token ID 预占位、鸽主、状态=待执行/执行中）；
  - 控制台 0 条 AntD Warning。
- **Verification**: `programmatic` + `human-judgment`（实机录制截图验证 UI 切换 + 控制台日志）

### AC-2: 区块确认进度可视化（Mock 推进）
- **Given**: 上链中 Tab 存在 1 条任务，当前 status=pending 或 executing。
- **When**: 停留在页面，不做任何操作，每隔约 1 秒轮询或 Mock 定时器推进进度。
- **Then**: Progress 进度条从 0/12 逐步增长至 12/12；状态 Tag 从 ⏳ 待执行 → 🔵 执行中 → 🔄 区块确认中 (X/12) → ✅ 已完成；最终行从"上链中"Tab 消失，出现在"已完成"Tab。
- **Verification**: `human-judgment`（视觉变化感知）

### AC-3: 交易哈希回填与可复制
- **Given**: 有一条任务已进入 completed 状态，通过轮询返回的 tx_hash 非空。
- **When**: 在"已完成"Tab 查看该任务行"交易哈希"列。
- **Then**: 哈希值以 `0x3f2a…b1c`（省略中间 8 位）形式展示，悬停显示 Tooltip 完整值，右侧有复制按钮可完整拷贝。
- **Verification**: `human-judgment`（悬停显示 + 剪贴板验证）

### AC-4: 失败重试 3 次 + 人工重试按钮
- **Given**: mock 定时器使一条任务连续 3 次"Gas 不足 / 网络拥堵"抛错。
- **When**: 观察该任务行的"重试次数"列。
- **Then**: 第 1/2/3 次自动重试时 retry_count 递增但仍停留在"上链中"Tab；第 3 次失败后转入 failed，出现在失败过滤区（可归入已完成 Tab 的 failed 子筛选或单独 Tab，与设计一致）并出现"🔁 重试"按钮，点击后任务重新回到 executing。
- **Verification**: `programmatic`（mock 数据断言 retry_count ≤ 3 且自动停止后才允许人工）

### AC-5: 审核前预览 Drawer 三板块展示
- **Given**: 待审核 Tab 存在 1 条 pending 资产。
- **When**: 点击该行操作列"👁️ 预览"按钮。
- **Then**: Drawer 从右侧滑出，包含：① NFT 预览卡片（图片、名称、预览 Token ID 占位）；② 信息详情（键值对列表、长文本省略+复制、中文映射、图片缩略图，复用 List.tsx 已实现的 parseMetadata/CN_MAPPING）；③ 足环号/鸽主/品系/赛绩关联信息。
- **Verification**: `human-judgment`

### AC-6: 批量审核通过
- **Given**: 待审核 Tab 中勾选 2 条不同的 pending 资产。
- **When**: 点击底部"✅ 批量通过"确认。
- **Then**: 两条资产从待审核 Tab 消失；"上链中"Tab 增加两条任务记录；Toast 提示"批量通过 2 条，失败 0 条"；两条资产的 NftMintTask.task_id 返回不同且唯一。
- **Verification**: `human-judgment` + `programmatic`（两次返回的 task_id 不相等）

### AC-7: 今日统计看板四卡
- **Given**: 已完成 AC-1 到 AC-6 多轮操作（至少有 1 条完成、1 条失败、3 条通过）。
- **When**: 停留在任意 Tab。
- **Today**: 自然日当天操作。
- **Then**: 底部统计卡片的"今日审核通过/今日上链成功/今日上链失败/平均耗时"四个数值与实际 mock 数据一致（审核通过数 = 所有通过次数；成功/失败 = 任务 completed/failed；平均耗时 = 取当天 completed 的平均）。
- **Verification**: `programmatic`（mock store 遍历统计值与 UI 文本对比）

### AC-8: 驳回资产进入"已驳回"Tab 且可复审（P2）
- **Given**: 待审核 Tab 对一条资产执行驳回（理由"基因档案未完善"）。
- **When**: 切换到"已驳回"Tab。
- **Then**: 该资产出现在列表中，并显示驳回理由、驳回时间、操作人；点击"重新提交审核"按钮后资产回到待审核 Tab。
- **Verification**: `human-judgment`

### AC-9: 编译与规范 0 错误
- **Given**: 代码改动仅涉及 Audit.tsx、services/nft.ts、mock.ts（及可能提取的小工具文件）。
- **When**: 在 `admin-web/` 执行 `npx tsc --noEmit`。
- **Then**: tsc exit_code = 0；控制台 grep `[antd:` 前缀 Warning 0 条。
- **Verification**: `programmatic`

## Open Questions
- [ ] "已驳回"状态在 mock 中是沿用旧的 asset.status='draft'（当前 mock 第 829 行 reject 分支会切为 draft），还是用户明确希望新增 'rejected'？设计稿描述为"已驳回"Tab，倾向新增 'rejected' 状态值，需确认。
- [ ] 今日统计的"平均耗时"是否需要排除失败任务？默认仅算 completed（成功上链）的耗时，符合设计稿"从审核通过到上链完成的平均时间"描述。
