# 上链审核工作台重构 - 实施计划 (tasks.md)

## [x] Task 1: 扩展类型定义 & 补全数据契约（接口层）
- **Priority**: high (P0 基础设施)
- **Depends On**: None
- **Description**:
  - 在 `services/nft.ts` 中扩展 `NftMintTask` 接口：新增 `block_current` (number), `block_target` (number), `asset_status` 字段（保留老字段不删，保持 List.tsx / NftMintForm 不破坏）
  - 新增 `NftAsset` status 枚举值补充：`rejected`（审核驳回独立状态，避免与 draft 混淆），对应 `ASSET_STATUS_COLOR/LABEL` 后续调整
  - 扩展 `approveNftAudit` 返回值：`{ task_id: number, asset_id: number, created: boolean }` 可选扩展；保持 `{ task_id: number }` 为最小契约（已在 Audit.tsx handleApprove 未使用 task_id，兼容）
  - 新增批量审核接口：`batchApproveNftAudit(ids: number[])`、`batchRejectNftAudit(ids: number[], reason: string)`
  - 新增"今日统计"接口：`getNftAuditStats(): Promise<{ today_approved: number; today_mint_success: number; today_mint_failed: number; avg_duration_sec: number }>`
  - 新增 `reSubmitAudit(id: number)` 用于"已驳回→重新提交审核"（FR-10）
  - 注意：所有导入 message 的地方（本文件是 services 层，不使用任何 message，所以没有 AntD Warning 风险）
- **Acceptance Criteria Addressed**: AC-1, AC-6, AC-7, AC-8
- **Test Requirements**:
  - `programmatic` TR-1.1: `npx tsc --noEmit` 0 错误（只改完这一步就跑一遍，确认接口层没有破坏现有调用点）
  - `programmatic` TR-1.2: 在 `Audit.tsx` 现有的 `import { approveNftAudit, getNftAuditList, getNftTasks, rejectNftAudit, retryNftTask } from '../../services/nft'` 引用仍能解析且调用签名不变（现有 82 行 approveNftAudit(record.id) 参数仍为单个 number，不报错）
  - `programmatic` TR-1.3: 新增的 4 个接口（batch 2 个 + stats + resubmit）导出名正确、Promise 返回类型齐全。
- **Notes**: 这是纯"加字段/加导出"的改动，不会破坏现有运行时。先完成这一步再做 UI/后端，防止后续改 UI 时接口契约来回改导致 tsc 反复报错。

## [x] Task 2: Mock 后端补全 —— 任务存储 / 审核建任务 / 任务列表 / 进度模拟 / 重试 / 统计（P0 核心数据流）
- **Priority**: high (P0 后端数据层)
- **Depends On**: Task 1
- **Description**:
  在 `server/mock.ts` `nft` 区块（834 行之前的 `server.middlewares.use('/api/nft/audit', ...)` 与 `server.middlewares.use('/api/nft/assets', ...)` 之后追加）：

  **2.1 新增 NFT_TASKS_STORE**
  - 新建内存数组 `NFT_TASKS_STORE`（初始空数组）+ seq `NFT_TASK_ID_SEQ = 1`
  - 新建 helper `toPublicTask(task, asset)`：返回 { id, nft_asset_id, status, retry_count, error_msg, tx_hash, contract_address, started_at, finished_at, created_at, block_current, block_target, asset_name, token_id, owner_name }，关联资产对应字段
  - 新建 helper `todayStartTs()` = 当天 0 点 ts（本地时区），用于统计

  **2.2 改造 approve 分支（/api/nft/audit/:id/approve）原子化建任务**
  - 当前实现仅 `item.status = 'minting'`；改为：
    1. `item.status = 'approved'`（审核通过但还没开始铸造的中间态，供 Tab 过滤使用，之后定时器才进入 'minting'）
    2. `item.approved_at = Date.now()`（新增字段，mock 层不影响 TS）
    3. `const taskRecord = { id: NFT_TASK_ID_SEQ++, nft_asset_id: item.id, status: 'pending', retry_count: 0, error_msg: null, tx_hash: null, contract_address: null, started_at: null, finished_at: null, created_at: Date.now(), block_current: 0, block_target: 12, _assetRef: item }`
    4. `NFT_TASKS_STORE.unshift(taskRecord)`
    5. **启动进度模拟定时器**（见 2.4 scheduleMintTask）
    6. 返回 `{ task_id: taskRecord.id }`

  **2.3 reject 分支改为 status='rejected'**
  - 把当前的 `item.status = 'draft'`（会让驳回资产混到草稿 Tab，用户明确要"已驳回"独立 Tab）改为 `item.status = 'rejected'`，保留 `audit_remark`、`rejected_at = Date.now()`、`rejected_by`（mock 层留 'admin'）

  **2.4 scheduleMintTask 函数（上链进度+失败模拟+自动重试状态机）**
  - 首次调用：500ms 后置 `task.status = 'executing'`, `task.started_at = Date.now()`, `item.status = 'minting'`
  - 之后每 1000ms 触发一步：
    - 10% 概率抛 'Gas 不足' / 10% '网络拥堵' / 5% '合约异常'（累计 25% 抛错，75% 正常前进）
    - 正常：`block_current++`，若 block_current < 6 → `status = 'executing'`；6 ≤ block < block_target → `status = 'confirming'`；block == block_target → `status = 'completed'` / `finished_at = Date.now()` / 生成 8 字节 tx_hash (`0x` + 40 位 hex 随机) / 生成假 `contract_address` / 同步写回 `item.tx_hash / item.contract_address / item.status = 'minted' / item.minted_at = Date.now()`；然后 `clearInterval`
    - 失败：
      - 若是 'Gas 不足' / '网络拥堵' 且 `retry_count < 3`：`retry_count++`，30s 后重新 `status = 'executing' / block_current = Math.max(0, block_current - 2)`（回退两步再继续）
      - 若是 '合约异常' 或 retry_count ≥ 3：`task.status = 'failed'` / `task.error_msg = reason` / `item.status = 'failed'`，`clearInterval`
  - 要求 scheduleMintTask 允许被"人工重试"重复触发：传入 task_id 即可 reset。

  **2.5 实现 `/api/nft/tasks` GET 路由**
  - 与 `/api/nft/audit` 平级：`server.middlewares.use('/api/nft/tasks', handler)`
  - Query: `page / pageSize / status(可多选逗号分隔 pending,executing,confirming) / nft_asset_id`
  - 逻辑：从 NFT_TASKS_STORE 按关联找对应 asset → toPublicTask → 过滤 → 分页 → `sendJson(res, { list, total })`
  - 额外：status 的"上链中"语义 = pending | executing | confirming（后续 Tab 切换时传这个集合）

  **2.6 实现 `/api/nft/tasks/:id/retry` POST**
  - 找到 task，仅当 status='failed' 时：重置 `retry_count = task.retry_count + 1, status = 'pending', block_current = 0, error_msg = null, finished_at = null`，调用 `scheduleMintTask(task)`

  **2.7 实现 `/api/nft/audit/batch-approve` POST & `/api/nft/audit/batch-reject` POST**
  - batch-approve: body { ids: number[] }，顺序 Promise.allSettled 跑单条 approve 逻辑（复用 2.2 的 helper），返回 { total, success, failed }
  
  **2.8 实现 `/api/nft/audit/stats` GET（今日统计）**
  - `today_approved`: `NFT_ASSETS_STORE.filter(item => status==='approved'||'minting'||'minted'||'failed' && approved_at > todayStartTs).length`（或者更精确：单独统计 approved_at 当日）
  - `today_mint_success`: task `status==='completed' && finished_at > todayStartTs`
  - `today_mint_failed`: task `status==='failed' && finished_at(或 updated_at) > todayStartTs`
  - `avg_duration_sec`: completed 任务 `(finished_at - created_at)/1000` 的平均

  **2.9 实现 `/api/nft/assets/:id/resubmit` POST（FR-10 复审）**
  - 要求 asset.status === 'rejected'：`status='pending'`, `audit_remark=null`, `updated_at=Date.now()`

- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-6, AC-7, AC-8
- **Test Requirements**:
  - `programmatic` TR-2.1: tsc 0 错误（mock.ts 是 JS，不参与 tsc，实际跑 admin-web tsc 只是为了没破坏前端）
  - `programmatic` TR-2.2: 写一段简单 HTTP 调用或用 curl/Invoke-WebRequest 验证 5 条新路由：
    - `POST /api/nft/audit/:id/approve` → 返回 task_id 且 `/api/nft/tasks?status=pending,executing,confirming` 列表 1 条命中，nft_asset_id 匹配
    - 等待 ~15s 后再次 GET tasks，block_current > 0
    - `POST /api/nft/audit/:id/reject` → 资产 status 变成 'rejected'（不是 'draft'）
    - `GET /api/nft/audit/stats` → 返回 4 个数字字段且类型正确
    - `POST /api/nft/tasks/:id/retry`（先造一条 failed 任务再触发）→ task status 回到 pending/executing
  - `human-judgement` TR-2.3: 状态机视觉上至少观察到 1 条任务从 pending → executing → confirming → completed 走完完整生命周期（约 12s+），在 completed 状态下 task.tx_hash 非空、asset.status='minted'、asset.tx_hash==task.tx_hash
- **Notes**: scheduleMintTask 定时器要处理"多次调用重复注册 interval"问题，需在 task 上挂 `_timerId` 字段，调用前若存在则先 `clearInterval(task._timerId)`。避免内存堆积。

## [x] Task 3: Audit.tsx UI 重构 - 四状态 Tab 工作台 + 列表列升级（P0 主视图）
- **Priority**: high (P0 UI 层)
- **Depends On**: Task 2（因为 Tab 的数据源依赖新的 tasks 路由 + 资产 status 枚举）
- **Description**:
  对 `src/pages/nft/Audit.tsx` 进行结构重写，保留现有的 import 模式、App.useApp() 用法、useCurrentUser/hasPermission 权限校验不动，重点改造 UI：

  **3.1 顶部 Tab + 徽标（取代上下两张独立表格的结构）**
  - 新增 `const [activeTab, setActiveTab] = useState<'pending' | 'minting' | 'completed' | 'rejected'>('pending')`
  - 使用 `Tabs`（或 `Segmented`，更符合设计稿"四段式点击"视觉，用户设计稿是 Segmented 风格），四个选项：
    - TabKey=pending label='待审核资产' badge=`<Badge count={pendingCount} showZero />`
    - TabKey=minting label='上链中' badge=`<Badge count={mintingCount} color="blue" />`
    - TabKey=completed label='已完成' badge=`<Badge count={completedCount} color="green" />`
    - TabKey=rejected label='已驳回' badge=`<Badge count={rejectedCount} color="volcano" />`
  - **徽标数据源**：通过 useEffect + 并行请求（进入页面时先拉 4 个 Tab 的 `/api/nft/audit/list?status=pending`、`/api/nft/audit/list?status=rejected`、`/api/nft/tasks?status=pending,executing,confirming`、`/api/nft/tasks?status=completed`）只拿 total 作为 badge，不拿完整列表，避免首屏慢。
  - `Tabs.onChange` 切换时 setActiveTab 并触发对应 ProTable 的 reload。

  **3.2 单 ProTable + 按 activeTab 切换 columns 和 request**（减少重复代码，不要写 4 份 ProTable）
  - 条件分支：
    - 当 activeTab === 'pending' | 'rejected'：走资产 request：`getNftAuditList({ ...params, status: activeTab })`；columns 复用 auditColumns 基础版（下面 3.3 升级）
    - 当 activeTab === 'minting' | 'completed'：走任务 request：`getNftTasks({ ...params, status: activeTab === 'minting' ? 'pending,executing,confirming' : 'completed,failed' })`；columns 用 taskColumns（下面 3.4 升级）

  **3.3 资产列升级（pending & rejected 共用，小差异）**
  - pending：操作列保留"👁️ 预览（新）"按钮 + "✅ 通过" + "❌ 驳回"，使用 `EyeOutlined, CheckOutlined, CloseOutlined`（AntD icons 已在当前 import 里）
  - rejected：操作列放"📋 查看驳回理由"（Drawer 展示 audit_remark + rejected_at + rejected_by）+ "🔁 重新提交审核"按钮
  - 追加 rowSelection（仅 pending 时开启，用于 FR-7 批量审核）：`rowSelection={activeTab==='pending' ? { selectedRowKeys, onChange: setSelectedRowKeys, getCheckboxProps: (r) => ({ disabled: r.status !== 'pending' }) } : undefined}`
  - pending Tab 的 toolBarRender 放"✅ 批量通过 / ❌ 批量驳回"

  **3.4 任务列升级（minting & completed 共用，核心：进度条 + 状态徽标）**
  - 新增 TASK_STATUS_META 对象（设计稿 5 态）：
    - pending: ⏳ 待执行 #FFB800
    - executing: 🔵 执行中 #3B82F6
    - confirming: 🔄 区块确认中 (X/12) #8B5CF6
    - completed: ✅ 已完成 #10B981
    - failed: ❌ 失败 #EF4444
  - "任务状态"列：从简单的 Tag 改为 `<Space>` 排列 `{icon} {label}` 加 Progress 条 `percent={ Math.round(block_current / block_target * 100) }`，confirming 状态下 label 后缀带 ` (${block_current}/${block_target})`。
  - "进度"列：新增或合并到状态列，使用 AntD Progress（size="small"），颜色随状态切换。
  - "交易哈希"列：`Typography.Paragraph copyable ellipsis={{ rows: 1, expandable: false }}`；若 tx_hash 为 null 显示 "-"。
  - "合约地址"列：同交易哈希，可复制+省略。
  - "重试次数"列：`${retry_count} / 3`，>0 时显示橙色数字提示。
  - "失败原因"列：`Tooltip title={error_msg}` + 省略号，失败状态下显示。
  - "操作"列：仅当 status === failed 时显示 "🔁 重试"（Popconfirm）；completed 显示 "👁️ 查看链上记录"（跳区块浏览器，mock 期仅弹 message 提示 tx_hash）；其余状态显示 "-"。

  **3.5 轮询钩子（仅 minting Tab 激活 + 存在非终态任务时）**
  - `useEffect(() => { if (activeTab !== 'minting') return; const id = setInterval(() => actionRef.current?.reload(), 2000); return () => clearInterval(id); }, [activeTab, /* 可选：检测列表中是否仍有非终态，全部 done 也提前 clear */])`
  - **不要对 completed Tab 轮询**（避免性能浪费）。

  **3.6 单条通过后自动切 Tab + 启动轮询**
  - handleApprove 现有逻辑：调用 approveNftAudit → message.success('审核通过,已进入上链队列') → auditActionRef.current?.reload() → taskActionRef.current?.reload()
  - 升级为：① message.success 带 task_id（显示 `审核通过，已创建上链任务 T{result.task_id}`）；② 当前列表 reload；③ setActiveTab('minting')；④ 手动触发一次 minting 列表 reload。

  **3.7 单条驳回逻辑不变**，但 reject 分支后端已改为 status='rejected'，因此驳回后列表 reload + 从 pending 减少，badge 数字自动更新。

- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-6, AC-8
- **Test Requirements**:
  - `programmatic` TR-3.1: tsc 0 错误
  - `programmatic` TR-3.2: 所有 `message.xxx` 使用 `const { message } = App.useApp()`（不得有静态 message 导入残留；此文件现有第 68 行已经是正确写法，只要新增部分不破坏即可）
  - `human-judgement` TR-3.3: Tab 切换顺畅（< 300ms 切换反馈）；徽标数字与各自 request 返回 total 完全一致；pending/rejected 走资产列、minting/completed 走任务列，表格数据源不串台。
  - `human-judgement` TR-3.4: 任务行进度条随轮询（2s）或 mock 定时器真实增长；确认"3/12 → 6/12 → 12/12"可见。
- **Notes**: 若 ProTable 单实例切换 columns 出现 search form 字段错位（因为资产列是 name/status/owner_name 搜索而任务列有 status/asset_id 搜索），可以退化为"两个 ProTable 各挂载一个，通过 Tab key 控制显示隐藏"，但要避免重复 DOM；优先尝试 `columns = useMemo(...)` + `search={...}` 根据 activeTab 动态切换。

## [/] Task 4: 审核前预览 Drawer（P1）
- **Priority**: medium (P1)
- **Depends On**: Task 3
- **Description**:
  在 Audit.tsx 内新增：
  - `const [previewOpen, setPreviewOpen] = useState(false); const [previewAsset, setPreviewAsset] = useState<NftAsset | null>(null);`
  - 操作列"👁️ 预览"按钮：`setPreviewAsset(record); setPreviewOpen(true);`
  - Drawer 宽度 720，title="NFT 审核预览"，content 三块（ProCard + title）：
    1. **NFT 预览卡片**：左图右信息 —— 图：`previewAsset.image_url`（为空则使用 ImageUploader 同款占位加号 SVG）；右：资产名称 / 预占位 Token ID `# ----` / `品系：从 metadata 解析 breed` / `鸽主：owner_name` / `赛绩：achievement`。布局完全参考 NftMintPreview.tsx 中右侧预览卡片样式（高度、居中）。
    2. **信息详情**：使用 List.tsx 第 6 节实现的"信息详情"组件函数族（`safeJsonParse, parseMetadata, CN_MAPPING, intelligentValueRenderer, renderStructuredInfoGrid`），若这些函数当前是 List.tsx 的内部函数则需要：
       - 提取到独立 helper：`admin-web/src/utils/nft-metadata-render.ts`
       - 导出 `renderMetadataInfoSection(metadata: string | null, image_url?: string | null): ReactNode` 公共函数
       - List.tsx 与 Audit.tsx 都从该文件导入（减少重复代码，避免两处不一致）
    3. **基因档案信息**：足环号 / 鸽名 / owner_name /（若 gene_profile 中有 breed 则品系）；足环号显示为 `Tag color="blue"`。
  - Drawer 底部：`<Space><Button onClick={() => setPreviewOpen(false)}>关闭</Button> <Popconfirm title="确认审核通过该资产?"><Button type="primary" onClick={...handleApprove inline}>审核通过</Button></Popconfirm>`（方便预览完直接通过，不用回到列表点）。
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `programmatic` TR-4.1: tsc 0 错误
  - `programmatic` TR-4.2: List.tsx 原有的信息详情展示逻辑没有被破坏（用 npx tsc 验证调用点）
  - `human-judgement` TR-4.3: 预览 Drawer 内显示"信息详情"板块中，图片字段显示缩略图（宽度 80-100 圆角化），自定义属性带 `【自定义】` 徽标，长文本可展开/复制，观感与 List.tsx 详情抽屉一致。

## [/] Task 5: 批量审核操作（P1）
- **Priority**: medium (P1)
- **Depends On**: Task 3
- **Description**:
  - 追加 `const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])`（已在 Task 3 3.3 的 rowSelection 中提到）
  - toolBarRender 在 pending Tab 下：
    ```tsx
    <Space>
      <Button onClick={onBatchApprove} icon={<CheckOutlined />} disabled={!selectedRowKeys.length} type="primary">✅ 批量通过 ({selectedRowKeys.length})</Button>
      <Button onClick={() => setBatchRejectOpen(true)} icon={<CloseOutlined />} danger disabled={!selectedRowKeys.length}>❌ 批量驳回 ({selectedRowKeys.length})</Button>
    </Space>
    ```
  - onBatchApprove：Popconfirm "将对选中的 X 条资产审核通过并自动创建上链任务，是否继续？" → 调 batchApproveNftAudit(ids.map(Number)) → message.success(`批量通过完成：成功 ${r.success} / 共 ${total}`) → reload pending 列表 + badge 刷新 + setSelectedRowKeys([])
  - 批量驳回 ModalForm：字段 `reject_reason` (TextArea, min 3 字)；onFinish：调 batchRejectNftAudit(ids, reason) → message.success('批量驳回 X 条已记录') → 关闭 Modal + reload pending + 清空选中
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `programmatic` TR-5.1: tsc 0 错误
  - `human-judgement` TR-5.2: 选中 2 条 → 批量通过 → Toast 提示与列表减少数量一致；上链中 Tab 新增 2 条任务且 task_id 不同。
  - `human-judgement` TR-5.3: 未选中状态下按钮均为 disabled 灰置，防止误触。

## [/] Task 6: 今日统计看板（P1）
- **Priority**: medium (P1)
- **Depends On**: Task 2（因依赖 stats 接口）
- **Description**:
  - Tab 下方或页面底部追加 4 列 ProCard（或 Row+Col 25%/25%/25%/25%），使用 `Statistic` from 'antd'：
    ```
    今日审核通过        今日上链成功        今日上链失败        平均耗时
    12 （蓝色数字）    10 （绿色）         2 （红色）         3分28秒（灰色）
    ```
  - 首次加载 + minting Tab 每完成一笔（轮询中检测到"有 completed/failed"的信号）自动刷新一次 stats；不要高频轮询 stats（避免性能问题）。可以用 useEffect 监听 "最近 2 次 tasks 列表的 completed 总数 diff > 0" 时才触发 stats 刷新。
  - 平均耗时 formatter：秒数 → `Math.floor(sec/60)分 ${sec%60}秒`，如果没有完成过任何一笔则显示 "-"。
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `human-judgement` TR-6.1: 完成 AC-1 操作后"今日审核通过"数字 +1，其余不变；等待 ~15s 任务 completed 后"今日上链成功"+1，平均耗时显示非零。
  - `programmatic` TR-6.2: stats 接口返回的 4 个数字与 UI 上显示的完全一致（例如 today_approved: 3 → UI 显示 3）。

## [/] Task 7: 失败自动重试可见性 + 人工重试（P1 与 Task 2 联动）
- **Priority**: medium (P1，重点是 UI 表现，Task 2 是 mock 行为)
- **Depends On**: Task 2, Task 3
- **Description**:
  - Task 2.4 已实现自动重试与 retry_count 计数，UI 层要把"重试次数"列显示为 `N/3`，并在 Tooltip 中显示"遇到 Gas 不足/网络拥堵将自动重试，最多 3 次，达到上限后可人工重试"说明文案（问号 icon + Tooltip）。
  - 失败行的操作列"🔁 重试"按钮点击后：Popconfirm → 调用 retryNftTask(id) → message.success('已重新触发上链任务') → 该行 2s 内回到 executing 状态。
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgement` TR-7.1: 连续观察一条失败任务（通过手动修改 mock 抛错概率或等待自然命中），确认 retry_count 在自动重试 3 次期间可见，且最后一次失败后行从 minting Tab 移到 completed Tab（过滤 failed）并出现人工"🔁 重试"按钮。
  - `human-judgement` TR-7.2: 点击人工重试后任务从 failed → pending/executing，且进度条重新开始增长。

## [/] Task 8: 已驳回 Tab + 复审入口（P2）
- **Priority**: low (P2)
- **Depends On**: Task 2, Task 3
- **Description**:
  - 已在 Task 2.3 中修改 reject 分支为 status='rejected'，本任务负责已驳回 Tab 的 columns 差异：
    - 新增"驳回时间"列（`rejected_at`，dayjs 格式 YYYY-MM-DD HH:mm）
    - 新增"驳回理由"列（`audit_remark`，省略号 Tooltip 完整版）
    - 操作列：① 📋 查看详情（Drawer 展示驳回理由全文 + 操作人 + 关联基因档案信息）；② 🔁 重新提交审核（Popconfirm "将重新提交至待审核资产队列，是否继续？" → 调 resSubmitAudit(id) → message.success('已重新提交，重新进入待审核队列') → reload 两张表并清空选中）
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `human-judgement` TR-8.1: 驳回一条资产 → 已驳回 Tab 显示它 + 理由列有值 → 点"重新提交审核" → 回到待审核 Tab，已驳回 Tab 该条消失。

## [x] Task 9: 回归验证（tsc + 控制台 0 AntD Warning + 6 场景功能回归）
- **Priority**: high
- **Depends On**: Task 1~8（若跳过 P2 则 Task 8 不依赖）
- **Description**:
  - TSC: `admin-web$ npx tsc --noEmit` 0 错误
  - 控制台 0 警告：启动 Vite 浏览器自动化验证 6 场景：① 进入上链审核页（Tab 首屏渲染）② 审核单条通过并等待进入 completed ③ 任务进度 1→12 增长 ④ 批量驳回 ⑤ 预览 Drawer 打开/关闭 ⑥ 统计看板数字更新；每个场景后 console.messages 过滤 warning，统计 `[antd:` 开头的条数（目标 0）
  - 功能回归：前序已修复的 AntD Warning 不得复发（静态 message / Spin tip 自闭合）；新增组件不得引入新的静态 message。
- **Acceptance Criteria Addressed**: AC-9
- **Test Requirements**:
  - `programmatic` TR-9.1: tsc exit_code = 0
  - `programmatic` TR-9.2: grep `import.*\bmessage\b.*from ['\"]antd['\"]` in src/pages/nft/Audit.tsx（目标 0 条，当前已正确使用 hook 版，确保不回退）
  - `programmatic` TR-9.3: grep `<Spin[^>]*tip=[^>]*/>` in Audit.tsx（目标 0 条，若有 Spin 必须为包裹模式）
  - `human-judgement` TR-9.4: 6 个场景下控制台 Warning 0 条 AntD 前缀。
- **Notes**: Task 9 必须由独立 subagent 跑完整验证，不能由前面 Task 的 agent 顺便做，避免遗漏。
