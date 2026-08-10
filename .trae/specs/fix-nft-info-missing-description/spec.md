# NFT 审核预览「信息详情 · 核心属性」缺失描述字段修复 - Product Requirement Document

## Overview
- **Summary**：修复 NFT 审核预览 Drawer 与 NFT List 详情抽屉的「📋 核心属性」卡片中 description（描述）字段丢失问题。通过扩展公共函数 `renderMetadataInfoSection` 新增第三参 `extraDescription` 显式接收 NFT 资产顶层 description 字段，将其注入核心属性卡片末尾整行（span=2）展示，解决用户在浏览器选中 HTML 时仅看到 4 项（品系/性别/羽色/出生年份）却没有描述的困惑。
- **Purpose**：后台审核员需要在「信息详情」看到完整的 NFT 资产文字介绍（品系简介 + 赛事背景 + 血统说明等文本）。当前由于 description 是 `NFT_ASSETS_STORE` 的顶层独立字段（和 name/image_url/metadata 平级，见 mock.ts:827），而 `renderMetadataInfoSection(Audit.tsx:1111)` 只接收 metadata+image_url 两参数，导致 CN_MAPPING 明明有 `description: '描述'` 却永远取不到实际值，描述永久空缺。
- **Target Users**：NFT 审核员（高频查看描述判断上架合规性）、运营人员（List 详情复查资产简介）、内容质检。

## Goals
- 让描述字段在 Audit.tsx 和 List.tsx 两个调用点的「📋 核心属性」卡片**完整显示**（核心属性从 4 项 → 5 项，计数 N1=5）
- 描述值为长文本时支持 copyable + 三行折叠 / 展开按钮（复用 intelligentValueRenderer 已有的长文本 Paragraph 分支）
- 描述 span=2 整行占满两列空间，不与其他字段挤在同一行（避免短描述造成大片留白）
- 保持与"NFT 预览卡片（顶部左图右信息）+ 基因档案信息"已有描述显示的语义一致（值内容相同）
- 当 asset.description 为 null / "" / undefined 时，核心属性卡片不额外显示空行，计数仍为 4 项，UI 与修复前一致

## Non-Goals (Out of Scope)
- ❌ 不改变「🖼️ 图片附件」「✨ 自定义扩展属性」两卡片的现有结构（本次只动核心属性）
- ❌ 不把 description 从顶层字段迁进 metadata JSON（纯展示层修复，不动数据流 / mock 种子 / 数据库）
- ❌ 不做富文本 / Markdown 渲染描述（继续走纯文本 copyable paragraph 分支）
- ❌ 不修改「基因档案信息」卡片与「NFT 预览卡片」的 description 显示逻辑（这两处已独立从 asset.description 渲染，不在本轮 scope）
- ❌ 不做描述的编辑 / 上传功能（只读展示）

## Background & Context
- **Data Shape**（NFT_ASSETS_STORE，mock.ts 约 820-840 行）：
  ```
  NFTAsset {
    id: number;
    name: string;
    description: string;              ← 顶层字段，值形如"赛鸽新希望，品系贺尔梅斯…"
    image_url: string;                ← 顶层封面图
    metadata: string(JSON) {          ← 内部 JSON，包含 breed/color/gender/birth_year/custom_attrs 等
      breed, color, gender, birth_year, custom_attrs, …
    }
    owner_name: string;
    status: 'pending' | 'approved';
    …
  }
  ```
- **调用点**（仅两处调用 renderMetadataInfoSection）：
  - Audit.tsx `pages/nft/Audit.tsx:1111`：`renderMetadataInfoSection(previewAsset?.metadata ?? null, previewAsset?.image_url)` — 未传 description
  - List.tsx `pages/nft/List.tsx`（同样存在详情抽屉，推测同样只传 metadata+image_url 未传 description）
- **公共函数签名（当前）**：`renderMetadataInfoSection(metadata: string|null, extraImageUrl?: string|null): React.ReactNode`，只设计了 metadata 内部属性（CN_MAPPING 取 key）。历史原因：早期 description 可能被误设计放进 metadata 内部，后来移到顶层但公共函数签名未同步。
- **技术栈**：AntD 5 · React 18 · TypeScript strict（已 2 轮修复 tsc exit_code 0）。
- **文件范围**：按前一轮 spec 约束，尽量把所有修复集中在 `admin-web/src/utils/nft-metadata-render.tsx`（公共函数），调用方只做最小传第三参改动。

## Functional Requirements

### FR-1：renderMetadataInfoSection 新增可选第三参 `extraDescription`
- **FR-1.1**：函数签名变为 `renderMetadataInfoSection(metadata: string|null, extraImageUrl?: string|null, extraDescription?: string|null) → React.ReactNode`。该参数向后兼容（省略 = 等同于 null，行为与修复前完全一致）。
- **FR-1.2**：内部在 `expandCustomAttrsArrays` 之后、分类（nonEmptyKeys）之前，如果 `extraDescription != null && extraDescription !== ''`：将值写入 `record['__extraDescription']`（或直接复用 description key，避免与 metadata 内部 description 冲突——若 metadata 内部本身也有 description 则顶层值优先），并在 `customOrigins` 中标记 `{ custom: false, fromExpanded: false, fromExtraDescription: true }`。
- **FR-1.3**：对于 `__extraDescription` 或顶层 description 注入的项，**强制归入 systemKeys**（核心属性），强制 span=2 整行占满（覆盖 isImageKey/COL 规则）。label 固定为 `📝 描述` 且带绿色 Tag「系统顶层」徽章（不用【自定义】）。

### FR-2：核心属性排序 — 描述固定在核心属性末尾
- **FR-2.1**：在 `orderedSystemKeys` 的 Set 拼接顺序中，把 description/`__extraDescription` 强制排序到最后（不管 CN_MAPPING 位置），确保：品系 → 性别 → 羽色 → 出生年份 → …其他系统字典字段… → **描述**。不会出现描述插在字段中间的违和感。
- **FR-2.2**：若 extraDescription 空或 metadata 本身没有 description → 核心属性末尾不加描述行，orderedSystemKeys 长度与修复前一致（N=4）。

### FR-3：描述值的智能渲染
- **FR-3.1**：值 ≤80 字符短描述 → `<span>{值}</span>` 整行显示。
- **FR-3.2**：值 >80 字符长描述 → 走 intelligentValueRenderer 的长文本分支：`<Typography.Paragraph copyable ellipsis={{rows:3, expandable:true, symbol:'展开'}}>`（与已有长文本风格一致，保证视觉统一）。
- **FR-3.3**：若 extraDescription 为纯空白字符（trim 后空）→ 视为 null，不显示（避免空白一行占位）。

### FR-4：调用方两节点传值
- **FR-4.1**：Audit.tsx 调用改签名 → `renderMetadataInfoSection(previewAsset?.metadata ?? null, previewAsset?.image_url, previewAsset?.description)`。
- **FR-4.2**：List.tsx 同样在详情抽屉的 renderMetadataInfoSection 调用处补传第三参 asset.description。
- **FR-4.3**：调用方不必判断空值（允许直接传 undefined/null），由公共函数做判空，减少调用方样板代码。

## Non-Functional Requirements
- **NFR-1（TS 类型安全）**：`npx tsc --noEmit` exit_code = 0；公共函数签名可选参数不破坏其他调用点。
- **NFR-2（AntD Warning 0）**：核心属性卡片增加 span=2 后，`getLabelInfo + renderStructuredInfoGrid` 的 span pad 对齐算法需把描述行 span=COL 纳入考虑，不触发 Descriptions span 对齐 warning（`[antd: Descriptions]` 的 span 错误提示）。
- **NFR-3（向后兼容）**：若调用方不传第三参（或已有其他位置调用 renderMetadataInfoSection 未改），行为 100% 与修复前一致，不崩不报错。
- **NFR-4（长文本性能）**：超长描述 copyable paragraph 不做 memo，1000 字内渲染仍 <10ms。
- **NFR-5（响应式）**：Drawer 宽度 760px / 1024px 两种尺寸下描述 span=2 整行不溢出，长文本 Paragraph 自动 wrap。

## Constraints
- **Technical**：改动文件数量最小化。公共工具函数修改 = `admin-web/src/utils/nft-metadata-render.tsx`；调用方修改 = `pages/nft/Audit.tsx` + `pages/nft/List.tsx`（只改一行调用签名），合计 3 文件。禁止修改 mock.ts、services/nft、store 等其他模块。
- **Business**：审核场景 UI 稳定性敏感，若 metadata 内部恰好也有 description 键（极少数异常数据），**顶层 asset.description 优先**，不允许 metadata 内部 description 覆盖顶层。
- **Dependencies**：不新增 npm 包。仅使用 AntD 5 + React 18 已安装。

## Assumptions
- 假设现有其他调用 renderMetadataInfoSection 的位置（如 NftMintPreview 页若有调用）均只有 2 参 → 向后兼容，描述字段为空，无需担心。
- 假设 asset.description 始终是纯文本（不是 HTML 或 Markdown），Paragraph 直接渲染不会 XSS（AntD Paragraph 默认已 sanitize）。
- 假设 description 平均字数在 40-300 之间，核心属性卡片整体高度即使 + 描述也不会超过 Drawer 高度的 50%（超过则用 Drawer 原生 scroll 处理，不需要 sticky）。

## Acceptance Criteria

### AC-1：核心属性卡片新增描述行（span=2）并正确显示
- **Given**：NFT ID=1 asset.description = "赛鸽新希望 #7，品系贺尔梅斯，羽色雨点，血统纯正，490KM 赛事获得第 2 名，足环编号 CHN-2024-00001234"
- **When**：打开审核预览 Drawer → 信息详情 → 核心属性卡片
- **Then**：卡片显示为 2 行普通字段（品系/性别、羽色/出生年份）+ 1 行整行描述（span=2，label「📝 描述 【系统顶层】绿色徽章」），合计 **N1=5 项** badge；描述行值文本与 asset.description 逐字相等
- **Verification**：`human-judgment` + `programmatic`（browser_evaluate 核心属性卡 innerText 含"描述"与完整字符串）

### AC-2：与预览卡片/基因档案的描述值一致
- **Given**：同一 NFT ID=1
- **When**：预览区顶部「NFT 预览卡片」的 asset.description 显示 + 核心属性卡片描述显示 对比
- **Then**：两处文本逐字一致（忽略空白差异）
- **Verification**：`human-judgment`

### AC-3：描述为空时不出现空占位行
- **Given**：构造 asset.description = "" / null / undefined / "   "（纯空白）
- **When**：核心属性卡片渲染
- **Then**：N1 回到 4 项，与修复前完全一致；不出现 label 空、值「-」或其他尴尬占位行；UI 与修复前视觉等价（像素级可忽略差异）
- **Verification**：`human-judgment` + `programmatic`（browser_evaluate innerText 不包含"📝 描述"标签）

### AC-4：排序正确（描述在核心属性末尾）
- **Given**：核心属性卡片 5 项齐全
- **When**：从上到下读行顺序
- **Then**：前 4 项顺序 = 品系 → 性别 → 羽色 → 出生年份；最后一行 = 描述（描述绝不出现在品系之前或插在性别/羽色中间）
- **Verification**：`human-judgment`

### AC-5：两调用点（Audit Drawer + List Drawer）一致
- **Given**：同一 NFT ID=1
- **When**：Audit Drawer vs List Drawer 打开信息详情 → 核心属性卡片
- **Then**：核心属性 5 项顺序、badge（N1=5）、描述值、描述 span=2 整行布局逐字一致
- **Verification**：`human-judgment`

### AC-6：TS + AntD 合规不回归
- **Given**：修复完成后
- **When**：tsc + browser console messages + grep 静态导入
- **Then**：tsc exit_code=0；两调用点 `[antd:` Warning 0 条；静态 `import { message } from 'antd'` 0 条；`<Spin tip=` 自闭合 0 条；Card variant=outlined 合规，无废弃 bordered/bodyStyle
- **Verification**：`programmatic`

## Open Questions
- [x] 布局位置：方案 A 描述追加到核心属性 span=2 ✅（用户已选）
- [x] 注入方式：公共函数第三参 extraDescription ✅（用户已选）
