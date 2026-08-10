# 上链审核工作台重构 - 验证清单 (checklist.md)

## P0 核心链路验证（必须全部通过才算 MVP 完成）
- [x] Checkpoint 1 (AC-1): 待审核 Tab 勾选 1 条资产 → 点击"✅ 通过"→ 资产从待审核列表消失（badge 数 -1）→ 页面自动切到"上链中"Tab 并出现对应的一条任务记录，资产名称/Token ID/鸽主字段非空；Toast 提示含"已创建上链任务 Txxxx"字样；控制台 0 AntD Warning。
- [x] Checkpoint 2 (AC-2): 停留在"上链中"Tab，不做操作持续 18 秒（2 秒一次轮询），应至少观察到 1 条任务连续经历：⏳待执行 → 🔵执行中 → 🔄区块确认中(X/12) → ✅已完成，且 AntD Progress 进度条百分比同步从 0→100%；任务最后从"上链中"Tab 消失，并出现在"已完成"Tab。
- [x] Checkpoint 3 (AC-3): 进入"已完成"Tab，该条任务的"交易哈希"列显示省略号格式 `0x…`（仅保留前 4 后 4 位或默认省略方式），悬停显示完整值，右侧有 AntD copyable 图标，点击后剪贴板粘贴出完整 42 位 hex；同时 asset.status 在资产详情中可验证为 'minted'。
- [x] Checkpoint 4 (P0 后端接口契约): `/api/nft/tasks` 路由存在（mock 中 0 命中 → 1 命中），调用 `GET /api/nft/tasks?status=pending,executing,confirming` 返回 list 数组非空且每项含 block_current/block_target 字段（number 类型）。
- [x] Checkpoint 5 (P0 后端 approve 原子性): `POST /api/nft/audit/:id/approve` 后，mock 内存 `NFT_ASSETS_STORE[i].status` 应为 'approved' 或后续推进的 'minting'（不再停留在 'pending'），且 `NFT_TASKS_STORE` 中存在一条 `nft_asset_id == i.id` 的新记录（task_id 唯一）。
- [x] Checkpoint 6 (TS & 规范): `admin-web$ npx tsc --noEmit` exit_code=0；`Audit.tsx` 无静态 message 导入；`Audit.tsx` 无自闭合 `<Spin tip=... />`。

## P1 功能增强验证
- [x] Checkpoint 7 (AC-5 预览 Drawer): 待审核某行点"👁️ 预览"→ 右侧滑出 Drawer（width≥680），包含三大板块：(1) NFT 预览卡（图片/名称/品系/鸽主/占位 Token ID）；(2) 信息详情（结构化键值对，不是 JSON raw 代码块，图片字段显示缩略图，自定义属性有"【自定义】"徽标，长文本可复制）；(3) 基因档案信息（足环号 Tag、鸽名、owner_name）。预览底部"审核通过"按钮可直接一键通过（跳 Tab 行为与 AC-1 一致）。
- [x] Checkpoint 8 (AC-6 批量通过): 待审核勾选 2 条 → 底部工具栏"✅ 批量通过 (2)"可点击 → Popconfirm 确认 → Toast "批量通过完成：成功 2 / 共 2"→ 待审核减 2 条，上链中新增 2 条任务，且两条任务 task_id 不同。
- [x] Checkpoint 9 (批量驳回): 勾选 2 条 → "❌ 批量驳回"→ ModalForm 输入公共理由"基因档案缺失" → 提交 → Toast 成功 → 待审核 badge 减 2 条，"已驳回"Tab 新增 2 条，且理由列均显示"基因档案缺失"。
- [x] Checkpoint 10 (AC-7 统计看板): 完成 Checkpoint 1~2（有 1 通过 + 1 成功）后，底部统计卡片 4 个值：今日审核通过 ≥ 1，今日上链成功 ≥ 1，今日上链失败 ≥ 0，平均耗时显示非零 "X分Y秒"。
- [x] Checkpoint 11 (AC-4 自动重试 + 人工重试): 制造 1 条 failed 任务（mock 抛合约异常或手动设置） → minting Tab 中该行消失后，到 completed Tab 的 failed 过滤视图找到它 → "重试次数"列显示 3/3 或 N/3，"操作"列显示"🔁 重试"按钮，点击后 Popconfirm → 状态回到 executing，进度从 0 重新开始，minting Tab 重新出现该任务。

## P2 增强验证（如本次不做 P2 可跳过）
- [x] Checkpoint 12 (AC-8 已驳回复审): 手动或批量驳回 1 条资产 → 切"已驳回"Tab → 行显示驳回时间、驳回理由列 → 操作列"🔁 重新提交审核" → 确认后资产状态从 'rejected'→'pending'，回到待审核 Tab 可再次看到它。
- [x] Checkpoint 13 (响应式): 浏览器 DevTools 切 1920×1080 模式 → ProTable scroll 正常无水平溢出；统计卡片自动 2×2 网格；次要列自动 ellipsis。

## 规范与前序修复不复发
- [x] Checkpoint 14 (控制台 0 AntD Warning 全局): 6 场景（页面首屏 / 单条通过 / 轮询 / 批量驳回 / 预览 Drawer / 统计刷新）执行中，DevTools console warning 过滤 `[antd:` 为 0 条。
- [x] Checkpoint 15 (前序页面不破坏): 进入 NFT 资产列表 List.tsx / 新增铸造 / 基因档案审核 / 系统管理各页面，功能与外观仍正常（批量路由改动不影响已存在 `/api/nft/assets` / `/api/nft/audit/list` 匹配，status 新增 'rejected' 不得让 `ASSET_STATUS_OPTIONS` 报 TS undefined）。
