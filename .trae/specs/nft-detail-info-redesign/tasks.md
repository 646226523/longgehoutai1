# NFT 资产详情"信息详情"重构 - 实施计划

## [x] Task 1: 信息详情重构 - 工具函数（解析+中文映射+智能值渲染）
- **Priority**: high
- **Depends On**: None
- **Description**：在 [List.tsx](file:///p:/龙鸽项目/longgehoutai/admin-web/src/pages/nft/List.tsx) 顶部新增 4 个 helper（同文件内，不新增组件）：
  1. `parseMetadata(metadata: string|null): Record<string, any>`：安全 parse，失败回退 `{}`，非字符串/字符串空返回空对象。
  2. `const METADATA_LABEL_MAP: Record<string, string>`：英文 key→中文 label（含品系/羽色/眼砂/性别/赛绩/足环号 等）。
  3. `const GENDER_VALUE_MAP: Record<string, string>`：male→雄，female→雌，unknown→未知。
  4. `isImageKey(key: string): boolean`：key 包含 image/img/photo/url/图 判定为图片字段。
  5. `isImageUrl(val: any): boolean`：val 是字符串且以 http(s):// 或 ipfs:// 开头。
  6. `formatValueLabel(key: string, value: any): { custom: boolean, label: string; renderValue: ReactNode }`：综合以上字典，生成 label（自定义带标记否），以及要 render 的 ReactNode（含 Typography.Text copyable/ellipsis、缩略图+查看原图链接等）。对 ipfs:// 前缀图片，使用 `https://ipfs.io/ipfs/${hash}` 网关作为原图链接，img 不直接渲染 ipfs 链接而是显示占位 SVG（AntD 的 file-image 图标或纯色块占位，避免破图红×）。
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-4, AC-5, AC-6, AC-7
- **Test Requirements**:
  - `programmatic` TR-1.1：`parseMetadata(null)` → `{}`；`parseMetadata('不合法}')` → `{}`，不抛异常；`parseMetadata('{"a":1}')` → `{a:1}`。
  - `programmatic` TR-1.2：METADATA_LABEL_MAP 覆盖 ring_number/breed/gender/color/eye_color/achievement/owner/ipfs_image/image_url/name/bloodline 共 11 个基础 key。
  - `programmatic` TR-1.3：`isImageKey('ipfs_image')` true，`isImageKey('breed')` false。
  - `human-judgement` TR-1.4：打开详情截图中，品系/性别等字段的中文标签正确，性别值正确映射雄/雌。
- **Notes**: 占位 SVG 可直接用内联 data URI 或 AntD 的 `<Image fallback={...} />`，避免额外资源。

## [x] Task 2: 详情抽屉基本信息 Tab 三区块结构改造
- **Priority**: high
- **Depends On**: Task 1
- **Description**：重写 [List.tsx](file:///p:/龙鸽项目/longgehoutai/admin-web/src/pages/nft/List.tsx#L490-L538) 的 Tabs `items[0].children`：把原来的"一个超长 Descriptions 平铺所有字段"拆为三个区块，区块之间用 `divider` 或 Card subTitle 分隔：
  1. 区块①"基础信息"：Descriptions(2 列 bordered size=small) → 资产名称(span=2)/资产 ID/Token ID/状态/持有者/关联基因档案(span=2)/资产描述(span=2)/创建时间/更新时间。
  2. 区块②"资产图片"：`div` + 子标题 → 缩略图（100×100，圆角 8，object-fit cover，img 外层卡片样式）右侧"查看原图"新标签链接；用 `detail.image_url` 作为主图；如果 metadata 中也有 `ipfs_image` 且不同，再追加一张"链上图片（ipfs）"副缩略图 + 链接并排。
  3. 区块③"信息详情"（注意不是 metadata 名称，现在改成区块标题"信息详情"，右侧显示"共 N 个属性"灰色小文字）：Descriptions(2 列)，每一行对应 metadata 的一个字段；先按"字典顺序"遍历 METADATA_LABEL_MAP 存在且 metadata 中存在的字段；然后追加自定义字段（metadata 中非字典 key）。**删除 `<pre>formatMetadata(...)` 那整段**。Descriptions.Item 的 label 直接使用 formatValueLabel 返回的带 Tag 自定义标记 label。
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5, AC-8
- **Test Requirements**:
  - `programmatic` TR-2.1：打开详情后，基本信息 Tab DOM 中不再存在 `<pre>` 元素（检查 `querySelectorAll('pre').length === 0`）。
  - `programmatic` TR-2.2：区块③顶部存在"信息详情"文本，且不再有"元数据"标签文本（整个 Tab 文本中 "元数据" substring 出现次数 = 0）。
  - `programmatic` TR-2.3：区块②至少 1 个 `<img>` 标签（或 Image 组件渲染的 img）。
  - `human-judgement` TR-2.4：从上到下顺序"基础信息→资产图片→信息详情"，三区块明显分区，不混排。
  - `human-judgement` TR-2.5：信息详情行数 = metadata 非空 key 数量，且每一行值不超过 2 行高，不会垂直撑爆。
- **Notes**: AntD Card 用 variant="outlined"，title 用 14px 字体；或者纯 Descriptions + style marginTop/marginBottom 分隔也行，优先轻量不要加太多嵌套 Card。

## [x] Task 3: 长文本省略 + Tooltip + 复制按钮
- **Priority**: medium
- **Depends On**: Task 2
- **Description**：在 Task 1 的 formatValueLabel 中，针对"字符串长度>60 字符"或"明显 ID/哈希类"（key 包含 hash/address/tx/token/id 且值长度>24）：
  - 值使用 `<Typography.Text ellipsis={{ tooltip: true, symbol: '…' }} copyable style={{ maxWidth: 360, display: 'inline-block' }} />`
  - 原有"资产图片 URL 链接"、"合约地址"、"交易哈希"、"足环号"、"ipfs hash"全部用这套；image_url 字段只在区块②里展示缩略图，信息详情里如果也有 ipfs_image key，信息详情里也用省略+复制。
- **Acceptance Criteria Addressed**: AC-3, AC-6
- **Test Requirements**:
  - `programmatic` TR-3.1：塞一个 200 字的 description 或 66 字符 hash，DOM 中出现 `ant-typography-copy` 按钮数量 ≥ 1。
  - `human-judgement` TR-3.2：长值不会出现"断开换行的 URL"，都是中间省略号。

## [x] Task 4: 集成验证（tsc + 启动服务 + 冒烟）
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3
- **Description**：
  - 运行 `npx tsc --noEmit` 0 错误。
  - 重启 vite（必要时），打开 http://localhost:3014/nft/list，点击任一行详情（先创建一个：在新增铸造里选"闪电侠"填完信息提交草稿后再点详情），截图验证三区块结构正确、缩略图不溢出、信息详情不出现 JSON。
- **Acceptance Criteria Addressed**: AC-1 ~ AC-8
- **Test Requirements**:
  - `programmatic` TR-4.1：`tsc --noEmit` exit code 0。
  - `human-judgement` TR-4.2：三张浏览器截图——①详情抽屉整体全貌②信息详情区块特写③长值省略效果。
  - `human-judgement` TR-4.3：对比"重构前"截图（用户最初给的），可见蓝色超链接大幅减少，不再有整屏长 URL。
- **Notes**: 若创建新草稿麻烦，直接走 evaluate 调用 fetch 创建后再点详情即可，不一定要手动填写 UI。
