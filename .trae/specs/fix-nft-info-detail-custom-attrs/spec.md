# NFT 审核预览「信息详情」板块修复优化 - Product Requirement Document

## Overview
- **Summary**：对 NFT 审核预览 Drawer（及所有复用了 `renderMetadataInfoSection` 的地方，包括 NFT List.tsx 详情抽屉）的「信息详情」板块进行重新设计与修复，采用「三卡片分组」结构（核心属性 / 图片附件 / 自定义扩展属性），同时解决两大 UX bug：`birth_year` 等系统字段未翻译成中文、`custom_attrs` 数组被 `JSON.stringify` 成原始 JSON 字符串造成完全不可读。
- **Purpose**：后台审核员在进行 NFT 资产上架审核时，需要通过「信息详情」快速确认鸽子的核心属性（品系、性别、羽色、出生年份、赛绩、血统等级等）是否完整、真实、准确。当前 raw 英文 key + raw JSON 的呈现方式严重干扰审核判断，增加人工成本和审核错误。
- **Target Users**：平台管理员 / NFT 审核员（审核工作量大，对信息可读性要求高）；前端运营人员（NFT List 详情查看时同样需要清晰的属性展示）。

## Goals
- 彻底消除「截图红框」两处 UX 缺陷：birth_year → 中文"出生年份"，custom_attrs → 人类可读展开
- 把"系统核心属性"与"用户自定义扩展属性"**分层展示**，审核员一眼即知哪些字段可做信任基准
- 图片/附件单独成卡片，支持缩略图 + 原图跳转，不干扰文字属性
- 信息属性计数（共 N 个）自动按三卡片子项分别显示，总数保持一致但更精确
- 兼容所有使用 `renderMetadataInfoSection` 的调用点（Audit.tsx 预览 Drawer + List.tsx 详情抽屉 + NftMintPreview 如有调用），结果一致
- 不引入 AntD 5 废弃 API、不新增控制台 Warning

## Non-Goals (Out of Scope)
- ❌ 不改变「NFT 预览卡片」板块（截图顶部的左图右信息）
- ❌ 不改变「基因档案信息」板块（截图底部的足环号/鸽名/鸽主/品系卡片）
- ❌ 不引入新的业务字段（如新增"创建人"/"审核状态"等非 metadata 内部字段）
- ❌ 不做 metadata 数据清洗/迁移（只改展示层，不修改数据库存）
- ❌ 不做前台 NFT 详情页的展示（只做 admin-web 后台两个调用点）

## Background & Context
- **当前 data shape**（mock 种子代码 `admin-web/server/mock.ts` L831-840，admin-api `NFT_ASSETS_STORE` 相同）：
  ```
  metadata: {
    breed: '贺尔梅斯', color: '雨点', gender: 'male',
    birth_year: 2024,
    custom_attrs: [
      { key: '赛绩', value: '430KM 第8名' },
      { key: '【自定义】血统等级', value: 'S级', custom: true },
    ]
  }
  ```
- **当前 render pipeline**：`parseMetadata(metadata:string) → Record<string,any>` → `getLabelInfo(key)` 查 `CN_MAPPING` 命中则中文，否则返回 key+magenta 【自定义】徽标 → `intelligentValueRenderer` 对非 string/number 的值（即 custom_attrs 数组）直接 `JSON.stringify` 输出 → `renderStructuredInfoGrid` 生成一张两列带边框 Descriptions → 被 `renderMetadataInfoSection` 包成 Card。
- **当前 Bug 根因**：
  (1) CN_MAPPING 只定义了 18 个字段，`birth_year` / `sire` / `dam` / `lineage` / `ring_id` 这些鸽界常用字段没有覆盖，被误判成「自定义」并显示英文 key；
  (2) `intelligentValueRenderer` 171-177 行：只要 value 不是 string/number 就 `JSON.stringify`，完全没处理"键值对数组"这种 metadata 常见结构。
- **技术栈**：AntD 5.17.4（ProComponents 2.7.19）· React 18.3.1 · TypeScript 5.4.5 · admin-web 单仓。
- **复用文件**：所有修复集中在 `admin-web/src/utils/nft-metadata-render.tsx`（6 导出公共文件，前一轮 spec 刚抽取）。

## Functional Requirements

### FR-1：字段中文映射（CN_MAPPING + 模糊匹配双保险）
- **FR-1.1 字典扩充**：CN_MAPPING 在原有 18 条基础上补齐鸽界常用字段（约 15 条）：
  `birth_year/出生年份` · `hatch_year/出生年份` · `age/鸽龄` · `sire/父鸽血统` · `dam/母鸽血统` · `lineage/血统谱系` · `ancestry/祖先` · `ring_id/足环编号` · `father_strain/父系` · `mother_strain/母系` · `detection_no/检测编号` · `chip_id/芯片编号` · `level/等级` · `race_rank/赛事排名` · `attributes/属性列表`
- **FR-1.2 模糊识别规则**：key 不在 CN_MAPPING 但满足以下任一条件 → 自动推断分类 & 加中文 alias（但仍保留 【自定义】徽标，因为推断并非 100% 正确）：
  - key 含 `year/生日/年龄/出生` / `鸽龄` → 自动 alias "出生年份/鸽龄"
  - key 含 `image/图/照片/photo/img` → 自动识别为图片字段（已在 isImageKey 规则基础上扩展到模糊中文匹配）
  - key 含 `血统/血缘/sire/dam/lineage/ancestor` → 自动 alias "血统类"
  - key 前缀为 `custom_ / extra_ / attr_ / user_` → 自动识别为扩展属性（直接跳过字典查询，即使凑巧命中 CN_MAPPING 也仍保留自定义徽标）
- **FR-1.3 字段分类**：通过 `getFieldCategory(key)` 返回 `system | image | custom` 三类：
  - system：CN_MAPPING 命中且 key 不在 FR-1.2 扩展前缀白名单
  - image：isImageKey(key) 或 FR-1.2 图片类模糊命中
  - custom：其余全部（key 不在 CN_MAPPING；或前缀命中 FR-1.2 扩展前缀；或来自 custom_attrs 展开且 origin 标记 custom）

### FR-2：custom_attrs / attributes 数组展开算法
- **FR-2.1 三种可识别的自定义数组结构**：
  1. `[{key: string, value: any, custom?: boolean}]` — 当前 mock 使用的标准结构（custom 字段若为 true → 强制 category=custom+magenta 徽标）
  2. `[{trait_type: string, value: any}]` — OpenSea 通用 ERC-721 metadata 标准
  3. `[{name: string, value: any}]` / `[string, any][]` 元组 — 兼容用户自定义上传的 JSON
  以上任何一种结构被 parseMetadata 后识别到（key 是 `custom_attrs / attributes / extra_attributes` 且 value 是数组）→ **展开**为顶层 key-value，并写入 `__customOrigin` WeakMap 记录每个展开 key 的 origin flag（custom: true / false）。
- **FR-2.2 展开优先级**：展开 key 如与原顶层 metadata 的 key 重名 → 原顶层值**覆盖**展开值（不采用展开，避免冲突丢失系统字段）；展开完成后**从 metadata 中删除**原数组 key（custom_attrs、attributes、extra_attributes 这三行不再单独输出）。
- **FR-2.3 不可识别结构的兜底**：value 是数组但不属于以上 3 种结构（如纯字符串数组 `['公棚A','公棚B']`）→ 不展开，改成 `Tag + ', ' 分隔` 用 AntD 的 `<Space><Tag>公棚A</Tag><Tag>公棚B</Tag></Space>` 展示，不再 JSON.stringify。value 是嵌套对象（非数组非 primitive）→ 展开成"子字段"行（`血统.父: xxx` / `血统.母: xxx`）。

### FR-3：三卡片分组结构（方案 B）
`renderMetadataInfoSection(metadata, extraImageUrl)` 返回的结构从一张 Descriptions 改成三张 `Card variant="outlined"`（或等价 Descriptions 三段式）垂直堆叠：
- **卡片 1 · 核心属性（系统字典）**：title = "📋 核心属性" + `(N 项)` badge。只渲染 category = system 的 key。两列 Descriptions bordered small 样式（保持现有设计一致性）。若 N=0 → 显示 Empty "暂无核心属性"。
- **卡片 2 · 图片附件**：title = "🖼️ 图片附件" + `(N 项)` badge。所有 category = image 且值是图 URL 的项：缩略图（80×80 圆角）+ "查看原图" Typography.Link（target="_blank"）。注意 IPFS 链接仍用 ipfsToHttp 处理。若 N=0 且 extraImageUrl 存在 → 把 extraImageUrl 作为唯一一项渲染（保留现有逻辑）。若 N=0 且 extraImageUrl 空 → Empty "暂无图片"。
- **卡片 3 · 自定义扩展属性**：title = "✨ 自定义扩展属性" + `(N 项)` badge，title 右边标 magenta "用户上传"小徽标。所有 category = custom 的 key（包括从 custom_attrs 展开的、CN_MAPPING 没命中的、前缀扩展的）。渲染方式：两列表格或 Descriptions 行，key 标签处**强制**加 magenta 【自定义】徽标（若是 custom_attrs[i].custom:true 的项再加 `tag: true` 加粗高亮"✅用户勾选自定义"徽标）。N=0 → Empty "暂无自定义扩展属性"。
- 计数回写：info count 标题 = "信息详情 · 共 (N1 + N2 + N3) 个属性"，其中 N1/N2/N3 分别是三卡片的项数。

### FR-4：`intelligentValueRenderer` 智能值渲染补强
- **FR-4.1**：性别值映射保持（male→雄/female→雌）
- **FR-4.2**：出生年份（birth_year 等 number 类型）→ 渲染为 `2024 年`（追加"年"中文单位）
- **FR-4.3**：赛绩/赛事排名类字段（key 含 `赛绩/race/achievement/rank`）→ 值前面加 🥇/🥈/🥉/🏅 emoji（根据排名：第1名→🥇，第2→🥈，第3→🥉，其他→🏅；没排名则只加 🏁）
- **FR-4.4**：纯字符串数组兜底 → Tag 组 space + comma。
- **FR-4.5**：嵌套对象兜底 → 点路径 key 展开成多行（递归深度最大 2，超出则 stringify 为 copyable 长文本）。

## Non-Functional Requirements
- **NFR-1（AntD 5 合规）**：不使用已废弃 prop（Card bordered/bodyStyle、ProCard bodyStyle/headStyle、Descriptions bordered、<Spin tip自闭合、静态 message import）。
- **NFR-2（类型安全）**：`admin-web$ npx tsc --noEmit` exit_code = 0，不引入 any 类型外溢。
- **NFR-3（控制台 0 AntD Warning）**：在 Audit.tsx 预览 Drawer 与 List.tsx 详情抽屉分别打开，`browser_console_messages` 过滤 `[antd:` 前缀均为 0 条（含 Descriptions span 对齐警告，需保持实时 pad 算法）。
- **NFR-4（兼容性）**：List.tsx 详情原有的 image 渲染、智能值渲染、长文本复制/展开、IPFS 占位图、ParseError 提示等功能**不得破坏**。
- **NFR-5（性能）**：单条 metadata 展开/渲染单次 ≤ 50ms（常见 metadata < 30 字段，无需 memo 优化，但避免 for 循环中 JSON.stringify 重复调用）。
- **NFR-6（响应式）**：Drawer width=760 宽度下三卡片均不溢出；窗口宽 1200 / 1920 两种分辨率均布局正常。

## Constraints
- **Technical**：只允许修改 `admin-web/src/utils/nft-metadata-render.tsx`；不得改动 Audit.tsx、List.tsx 中的调用代码（保持公共 API 签名 `renderMetadataInfoSection(metadata, extraImageUrl?)` 不变）。
- **Business**：审核场景对 UI/UX 稳定性敏感，短期内若有新的 metadata 字段出现，模糊规则必须兜底，不得再出现「raw key / raw JSON」。
- **Dependencies**：仅使用已安装的 AntD 5、React 18，不引入新 npm 包。

## Assumptions
- 假设 custom_attrs 数组结构总是 KV 对结构（FR-2.1 三种之一），如果用户上传了完全任意的 JSON 到 metadata，则走 FR-2.3 / FR-4.5 兜底不崩溃。
- 假设中文 key 不重名（如用户已在 key 中写了"出生年份"且 CN_MAPPING 有 birth_year→出生年份，两者同时出现则都显示且计数为 2，不合并）。
- 假定 extraImageUrl 仅当 metadata 本身无图时需要追加渲染，现有逻辑保留。

## Acceptance Criteria

### AC-1：birth_year 字段中文翻译 + 系统分类正确
- **Given**：metadata 中含 `birth_year: 2024`（或任一新补齐字段）且 key 不在扩展前缀白名单
- **When**：打开 NFT 审核预览 Drawer → 信息详情
- **Then**：label 显示为「出生年份」（中文），没有任何英文 "birth_year" 文字出现在 label 区；该行位于**卡片 1（核心属性）**而不是卡片 3；值显示为「2024 年」
- **Verification**：`human-judgment`

### AC-2：custom_attrs 数组展开 + 不出现 raw JSON
- **Given**：metadata 中含 `custom_attrs: [{key:'赛绩',value:'430KM 第8名'},{key:'血统等级',value:'S级',custom:true}]`
- **When**：信息详情渲染完成
- **Then**：原「custom_attrs」这一行**完全消失**不输出；替换为两行独立「赛绩」「血统等级」行；赛绩值前面加「🏁」或「🏅」emoji；血统等级加 magenta【自定义】+✅高亮徽标；审核员看到的是纯人类可读文本，任何一行中都**不包含** `[` `{` `"key"` `"value"` JSON 特征字符
- **Verification**：`human-judgment` + `programmatic`（browser_evaluate 查询卡片 3 DOM innerText 正则 `/[{,]"\s*key/` 匹配为 0）

### AC-3：三卡片分组结构 + 计数正确
- **Given**：以上同一 metadata（system 5 项 / image 1 项 / custom 2 项，共 8 项）
- **When**：renderMetadataInfoSection 渲染完成
- **Then**：三张卡片按顺序出现，标题分别为「📋 核心属性（5项）」「🖼️ 图片附件（1项）」「✨ 自定义扩展属性（2项）」；信息详情 header 显示「共 8 个属性」；三张卡片之间有清晰视觉分隔（AntD Card 默认间距或 12px gap）
- **Verification**：`human-judgment`

### AC-4：两个调用点视觉完全一致
- **Given**：同一个 NFT asset（ID = 1）
- **When**：在 Audit.tsx 预览 Drawer 打开 vs 在 List.tsx 详情抽屉打开
- **Then**：两张截图的「信息详情」板块在字段顺序、中文字典、自定义徽标、emoji、卡片分组、计数上**逐字段一致**（允许外层 Drawer 尺寸不同导致行自动换行差异）
- **Verification**：`human-judgment`

### AC-5：AntD 合规 + 类型安全
- **Given**：代码变更完成后
- **When**：执行 `npx tsc --noEmit`；以及 browser 打开两个调用点 console messages
- **Then**：tsc exit_code = 0；console `[antd:` warning 0 条（尤其 Descriptions span 对齐 Warning 不能复发）；grep 静态 message import = 0；grep 自闭合 Spin tip = 0
- **Verification**：`programmatic`

### AC-6：异常兜底场景不崩溃
- **Given**：5 个异常 metadata 用例（纯字符串数组 / 嵌套对象 / 重复 key / 乱码 JSON 字符串 / 完全空）
- **When**：渲染
- **Then**：页面不白屏；不抛错误；ParseError 情况保持 Empty + "元数据格式异常已按原文展示"提示
- **Verification**：`human-judgment`

## Open Questions
- [x] 修复方案：方案 B 分组卡片 ✅（用户已选）
- [x] 字典补齐范围：补全鸽界常用字段 + 模糊前缀规则 + 截图字段全修 ✅（用户三项均选）
