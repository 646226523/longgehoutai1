# NFT 资产详情 - 信息详情板块重构 PRD

## Overview
- **Summary**: 重构"NFT 资产详情"抽屉中的"基本信息"Tab，将当前不合理的"元数据(JSON 代码块 + 平铺长链接)"展示方式，替换为**结构化、可视化、人性化的"信息详情"**板块：元数据按字段一行一行键值对展示、图片字段用缩略图展示而非裸 URL、标签"元数据"改为"信息详情"，并同步调整整个抽屉的信息架构，让后台工作人员能够一眼看清这份 NFT 的完整档案。
- **Purpose**: 解决当前后台工作人员打开详情后面对"一大段 JSON 字符串 + 超长图片 URL 链接"无法快速识别 NFT 内容的问题。现状：把元数据（实际上就是鸽子的档案属性：品系、羽色、眼砂、足环号、赛绩、鸽主、自定义属性、链上图片哈希等）直接 JSON.stringify 丢到 `<pre>`，并且"资产图片"也只是一个 href 平铺，导致：① 视觉上是整屏无意义的长链接，截图里可见 90% 内容都是蓝色超链接；② 后台工作人员无法快速扫一眼知道"这羽鸽子品系、赛绩、性别是什么"。
- **Target Users**: 后台管理员、公棚运营人员、审核员（非技术背景，不理解 JSON，需要一眼看懂信息）。

## Goals
- G1：将"元数据"标签名称改为"信息详情"。
- G2：将 metadata JSON 解析为**键值对列表**（字段名→字段值），一个字段一个 Descriptions.Item 行直观展示（不再用 `<pre>` JSON 代码块）。
- G3：图片类字段（image_url、ipfs_image 等）改为**缩略图 + 原图链接**，避免裸 URL 超长链接占满整屏。
- G4：metadata 字段按业务语义**分组**（基础属性、基因档案属性、自定义属性），信息架构清晰。
- G5：整个抽屉"基本信息 Tab"的字段顺序、列数优化，信息密度合理。
- G6：超长值（如 description、交易哈希、合约地址）合理省略/可展开/可复制，不全屏溢出。

## Non-Goals (Out of Scope)
- 不修改"流转记录"Tab 和"链上状态"Tab 的内容和结构。
- 不修改 ProTable 列表页的列和操作。
- 不改动 NftMintForm 铸造表单和服务端接口。
- 不实现 metadata 的编辑功能（这次只是展示优化，不是可编辑）。

## Background & Context
- 当前抽屉位于 [List.tsx L476-L630](file:///p:/龙鸽项目/longgehoutai/admin-web/src/pages/nft/List.tsx#L476-L630)。
- 当前"元数据"渲染：`formatMetadata()`（L87-L94）直接 `JSON.stringify(JSON.parse(metadata), null, 2)` → `<pre>`，这对开发人员友好，对业务人员是灾难。
- 当前"资产图片"渲染（L517-L525）：简单的 `<a href>{URL}</a>`，URL 是几十一百字符长链，撑满 Descriptions 单元格，和元数据里的 `ipfs_image` 重复显示。
- 现存 metadata 标准字段约定（铸造表单组装逻辑里）：`name / ring_number / breed / gender / color / eye_color / achievement / owner / ipfs_image` + 自定义属性。这些字段应映射为中文标签（如 breed→品系，color→羽色，achievement→赛绩）。
- 本项目使用 AntD 5 + React 18 + TypeScript + Vite，ProComponents 的 Drawer/Descriptions/Tabs。

## Functional Requirements
- **FR-1 更名**：抽屉"基本信息"Tab 中原来的 `label="元数据"` 改为 `label="信息详情"`。
- **FR-2 元数据结构化渲染**：删除现有 `<pre>JSON.stringify` 方式，改为：
  1. 将 metadata（字符串或 null）安全 JSON.parse，失败回退为 `{}`。
  2. 按"已知字段→中文 label + 未知字段→原样作为 label"拆分。
  3. 每个字段作为一行 Descriptions.Item（键=中文 label，值=字段值），2 列布局输出。
- **FR-3 字段分组**：将"基本信息"Tab 内容分为三个区块（用 Card/子标题/分组 label 分隔）：
  - 区块① **基础信息**（资产名称/ID/Token ID/状态/持有者/关联基因档案/描述/创建&更新时间）
  - 区块② **资产图片**（缩略图 + 原图链接，点击打开新标签）
  - 区块③ **信息详情**（即 metadata 解析后字段；子标题显示"共 N 个属性"）
- **FR-4 图片字段缩略图处理**：
  - 检测值疑似 URL（以 http:// 或 https:// 或 ipfs:// 开头）且字段名包含 `image / img / photo / url / 图` 关键字，自动渲染为：
    - 左侧缩略图（100×100，object-fit cover，圆角）
    - 右侧"查看原图"链接 + 域名缩写（或省略 path 显示）
  - 其他 URL（如非图片字段）仍以普通省略文本（ellipsis + tooltip + 可复制）显示，不再是几屏长的蓝色链接。
- **FR-5 已知字段中文映射**：提供字典，把英文 key 翻译成业务语义：
  - name→资产名, ring_number→足环号, breed→品系, bloodline→血统, gender→性别, color→羽色, eye_color→眼砂, achievement/race→赛绩, owner/owner_name→鸽主, ipfs_image→链上图片, image_url→封面图片, attributes→属性。
  - 性别值 male/female/unknown 再映射为"雄/雌/未知"。
- **FR-6 自定义属性区分标记**：不在映射字典中的字段，标签右加"（自定义）"灰色 Tag 标记，视觉上一眼分辨系统字段和自定义字段。
- **FR-7 长值处理**：
  - 文本超过 60 字（或数字超过 24 位）→ 省略号 + Tooltip 显示全值 + 右侧"复制"图标按钮（AntD 的 Typography.Text copyable 可复用）。
  - 不再 `word-break: break-all` 把 URL 每个字母断开换行，而是优雅省略。
- **FR-8 兼容 draft 空 metadata 场景**：草稿状态下 metadata 可能为 null/空对象，信息详情区显示"暂无属性"Empty，而不是整个 `<pre>` 为空。

## Non-Functional Requirements
- **NFR-1（性能）**：打开详情抽屉后首次渲染时间变化不超过 50ms（DOM 替换几乎不增加节点数，Descriptions 轻量）。
- **NFR-2（健壮性）**：metadata 非合法 JSON 不崩溃，回退为 `{}` 并在最后一行标记"元数据格式异常，已按原文展示"。
- **NFR-3（无障碍）**：缩略图有 alt；长文本 Tooltip 可被屏幕阅读器读取；复制按钮有 aria-label。
- **NFR-4（视觉一致性）**：沿用 AntD Design Token（颜色、间距、字体），不引入自定义色彩体系。
- **NFR-5（TS 类型安全）**：所有新增 helper 函数参数返回值严格 typed，tsc --noEmit 0 错误。

## Constraints
- **Technical**：必须只修改 `admin-web/src/pages/nft/List.tsx`（最多在同文件加几个 helper 函数；如果 helper 超过 40 行可抽 `admin-web/src/pages/nft/NftDetailInfo.tsx` 组件，但优先保持在 List.tsx 降低复杂度）。不能改 services 和 mock.ts（本次是纯展示层优化）。
- **Business**：现有字段必须全部可见（不能丢失任何 metadata key），只能优化展示形式，不能隐藏字段。
- **Dependencies**：仅用现有依赖（antd @ant-design/icons），**禁止新增 npm 包**。

## Assumptions
- A1：metadata 对象扁平（不含嵌套对象数组）；如果以后出现嵌套数组 attributes（如 OpenSea 标准 [{trait_type, value}]）可扩展兼容，但本次 MVP 按扁平对象处理，嵌套值做 JSON.stringify 降维为字符串展示。
- A2：图片 URL 多为 http/https，ipfs:// 在浏览器中不能直接显示 img 资源，检测到 ipfs:// 前缀时退化为"查看原图"链接（点击用网关 https://ipfs.io/ipfs/xxxxx 打开）+ 占位 SVG，不显示破图。
- A3：详情抽屉宽度 820px（现有宽度不变），布局以这个宽度为基准设计。

## Acceptance Criteria

### AC-1：元数据标签更名为"信息详情"
- **Given**：进入 NFT 资产列表页，点击任意一条数据的"详情"按钮
- **When**：抽屉打开并切到"基本信息"Tab
- **Then**：原来显示"元数据"的标签名现在显示为"信息详情"
- **Verification**：`programmatic`（DOM 查询 label text）+ `human-judgment`（肉眼确认显示的是中文"信息详情"）

### AC-2：信息详情按字段结构化键值对显示
- **Given**：一条 NFT 资产的 metadata = `{"breed":"詹森","gender":"雄","color":"灰","achievement":"500KM冠军","owner":"北京赵氏铭家"}`
- **When**：打开该条数据的详情抽屉"基本信息"Tab
- **Then**：信息详情区块显示 5 行 Descriptions.Item，分别是 `品系：詹森`、`性别：雄`、`羽色：灰`、`赛绩：500KM冠军`、`鸽主：北京赵氏铭家`，不再出现 `<pre>` 格式的 JSON 大括号和缩进
- **Verification**：`programmatic`（断言 `<pre>` 标签不存在；断言存在 5 个对应 label 的 Descriptions.Item）+ `human-judgment`（视觉上一行一属性，对齐工整）

### AC-3：图片字段缩略图展示而非裸 URL
- **Given**：一条 NFT 的 `image_url = "https://example.com/very/long/path/to/pigeon.jpg"`，且 metadata 中 `ipfs_image = "ipfs://QmAbcd1234....xyz"`
- **When**：打开详情抽屉基本信息 Tab
- **Then**：区块②"资产图片"显示缩略图（100×100，圆角，img tag，alt=资产名称），右下角有"查看原图"链接（新标签打开）；信息详情区块的 ipfs_image 字段不再显示超长 URL，而是：显示占位缩略图（ipfs 风格）+"链上原图"链接（跳转 ipfs 网关）+ 值截断；整个页面不再出现超过 2 行的蓝色长链接
- **Verification**：`programmatic`（检查 `<a>` 标签 textContent 长度均不超过 20 字符；检查存在至少 1 个 `<img>` 缩略图）+ `human-judgment`（截图中不再是整屏蓝色超链接）

### AC-4：已知字段中文映射正确
- **Given**：metadata = `{"ring_number":"CN-2024-01-123456","breed":"詹森","gender":"male","eye_color":"黄眼","ipfs_image":"ipfs://Qm..."}`
- **When**：打开详情信息详情区块
- **Then**：标签分别显示为"足环号/品系/性别/眼砂/链上图片"；性别值显示为"雄"而非"male"
- **Verification**：`programmatic`（逐个 DOM 查询 label 和值文本）

### AC-5：自定义字段带（自定义）标记
- **Given**：metadata 中含字典外 key：`{"wing_length":"24cm"}`
- **When**：打开详情信息详情区块
- **Then**：该行标签为"wing_length （自定义）"或"翼长（自定义）"，灰色 Tag 标记；自定义字段排在已知字段之后
- **Verification**：`programmatic`（查询是否有"自定义"文本）+ `human-judgment`（视觉上一眼区分）

### AC-6：长文本/长哈希优雅省略+可复制
- **Given**：metadata 中 `contract_address = "0x" + 重复 40 位字符`
- **When**：打开详情
- **Then**：单元格中显示为 `0xabcd…wxyz`（中间省略），鼠标悬停显示 Tooltip 全部内容，右侧有复制按钮点击复制完整值到剪贴板；页面不出现 3 行以上的垂直拉伸变形
- **Verification**：`human-judgment`

### AC-7：空/异常元数据不崩溃
- **Given**：一条 NFT 的 metadata = null（草稿未设置）或 `"非法 JSON 字符串"`
- **When**：打开详情
- **Then**：信息详情区块显示"暂无属性"（Empty 组件）或最后一行标记"元数据格式异常"；页面无 JS Error（控制台无红错）
- **Verification**：`programmatic`（控制台 error 数量 0）+ `human-judgment`

### AC-8：整体信息架构分 3 区块
- **Given**：打开任一详情抽屉基本信息 Tab
- **When**：从上往下滚动 Tab 内容
- **Then**：顺序依次为"基础信息 → 资产图片（缩略图）→ 信息详情（属性键值对）"；视觉上三区块有明显的分组标题或间距分隔
- **Verification**：`human-judgment`

## Open Questions
- [ ] 字段中文映射字典中是否需要额外 key？如 `mint_number / batch / generation / microchip_no`（如果后续有这些元数据 key，请再补充）。当前按铸造表单约定的 9 个 key + 自定义处理。
- [ ] 缩略图尺寸：用户截图显示的是 1440p 屏，100×100 会不会太小？备选方案是 120×120。如果无答复，MVP 默认 100×100，可后续一次改动。
