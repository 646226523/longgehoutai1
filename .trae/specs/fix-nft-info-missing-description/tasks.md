# NFT 信息详情核心属性「描述缺失」修复 - Implementation Plan

## [x] Task A: 公共函数 renderMetadataInfoSection 改造 — 新增第三参 + 描述注入 + span=2 整行排序末尾
- **Priority**: high
- **Depends On**: None
- **Description**：
  - 在 `admin-web/src/utils/nft-metadata-render.tsx` 修改 `renderMetadataInfoSection(metadata, extraImageUrl?, extraDescription?)` 签名，第三参可选 `extraDescription: string | null | undefined`
  - Pipeline 位置：expandCustomAttrsArrays 返回之后，分类 nonEmptyKeys 之前，注入 `record.description`（若 record 已有 description 来自 metadata 内部 → **顶层 extraDescription 覆盖**，不丢失系统顶层描述），并 customOrigins 标记 `{ custom:false, fromExpanded:false, fromExtraDescription:true }`；空值/null/空白 trim 后空 = 不注入
  - 排序：`orderedSystemKeys` 构造末尾强制把 description 排序到最后（即使 CN_MAPPING 中 description 很靠前也要后移，保证用户阅读顺序先核心字段→再看文字介绍）
  - span 覆盖：在 `renderStructuredInfoGrid` 的 span 计算处，若 key === 'description'（且 fromExtraDescription=true 或强制标记）→ span=COL（2），不按 isImageKey 判
  - 徽章：描述 label 后追加 `<Tag color="green" style={{marginLeft:6}}>系统顶层</Tag>`，**不加** magenta 【自定义】徽章（即使 forceCustomLabel=true 的自定义卡也永远不会走到 description）
  - 长文本：复用 intelligentValueRenderer（FR-3.2），自动 >80 字 copyable paragraph + 展开
  - 向后兼容：不传第三参时（extraDescription=undefined），与修复前完全一致（核心属性仍是 4 项，不出现描述空行）
- **Acceptance Criteria Addressed**: AC-1, AC-3, AC-4, AC-6
- **Test Requirements**:
  - `programmatic` TR-A.1: `npx tsc --noEmit` exit_code=0
  - `programmatic` TR-A.2: 调用 `renderMetadataInfoSection(mockMetaStr, imgUrl, "测试描述 A")`，生成的核心属性 Descriptions innerText 中包含"测试描述 A"；调用 `renderMetadataInfoSection(mockMetaStr, imgUrl, "   ")`（纯空白）和 `renderMetadataInfoSection(mockMetaStr, imgUrl, null)`，innerText 均**不**包含"📝 描述"标签
  - `programmatic` TR-A.3: span=2 不触发 Descriptions warning，在 `pad` 算法中 `acc + span (2)` 正确处理，当 `acc=0` 时占整行后 acc=0；当 `acc=1`（奇数）时先 pad 1 再占整行
  - `human-judgement` TR-A.4: 浏览器 Audit Drawer 核心属性卡片视觉顺序为「品系→性别→羽色→出生年份→描述」，描述 label 带绿色【系统顶层】徽章且整行 span=2 不与其他字段同排
- **Notes**: customOrigins 新增 fromExtraDescription 字段为可选键，TS interface 要扩（`{custom: boolean, fromExpanded: boolean, fromExtraDescription?: boolean}`）

## [x] Task B: 调用方两处（Audit.tsx + List.tsx）补传第三参 asset.description + tsc 回归
- **Priority**: high
- **Depends On**: Task A
- **Description**：
  - 修改 `admin-web/src/pages/nft/Audit.tsx` 约 1111 行：`renderMetadataInfoSection(previewAsset?.metadata ?? null, previewAsset?.image_url, previewAsset?.description)`（第三参补 description，允许 null/undefined 透传）
  - 找到 `admin-web/src/pages/nft/List.tsx` 中 renderMetadataInfoSection 的调用（搜索函数名），同样补传第三参 asset.description
  - 运行 `npx tsc --noEmit` 校验类型（3 文件合计修改，不应引入 any 类型外溢）
  - 可选：对 `renderMetadataInfoSection` 所有 grep 调用点排查（如有其他第 3/4 调用处），若无第三参需求保持现状即可（向后兼容，不必都传 description）
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-5, AC-6
- **Test Requirements**:
  - `programmatic` TR-B.1: tsc exit_code=0
  - `programmatic` TR-B.2: Audit.tsx 调用参数按 FR-4.1 传齐 3 参（tsc AST 级断言：renderMetadataInfoSection 调用实参数量 ≥3 或包含 `previewAsset?.description`）
  - `human-judgement` TR-B.3: List Drawer 同样显示描述 N1=5 核心属性，与 Audit Drawer 一致（AC-5）
  - `human-judgement` TR-B.4: 顶部预览卡片描述值 = 核心属性卡片描述值 逐字一致（AC-2）
- **Notes**: List.tsx 调用位置路径可能需要先 grep 定位；如果 renderMetadataInfoSection 是通过中间组件包装层调用，需逐层追查到最终调用位置并传参。

## [x] Task C: 浏览器两调用点验证 + AC 全量核对 + checklist 回归
- **Priority**: high
- **Depends On**: Task B
- **Description**：
  - Playwright 打开 http://localhost:3014 登录 admin/admin123
  - 进入 NFT 审核（pages/nft/Audit.tsx）→ NFT ID=1 预览 Drawer → 滚动信息详情 → 截图保存，提取 innerText 存文件 A
  - 进入 NFT 列表（pages/nft/List.tsx）→ NFT ID=1 查看详情 → 滚动信息详情 → 截图保存，提取 innerText 存文件 B
  - A vs B 核心属性卡逐字段比对（顺序/徽章/描述内容一致，AC-5）
  - AC-1（描述行存在 span=2 + N1=5 badge）、AC-2（预览卡片描述 = 核心属性描述一致）、AC-3（空白 description 场景如可用临时 mock 切换验证 N1=4 无描述）、AC-4（排序末尾）、AC-6（tsc + console warnings 0 + 静态 grep message/Spin tip 自闭合）
  - checklist.md 10 个检查点全部 PASS
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
- **Test Requirements**:
  - `programmatic` TR-C.1: tsc exit_code=0
  - `programmatic` TR-C.2: 两调用点 console messages `[antd:` 计数 0
  - `programmatic` TR-C.3: grep 静态 message import = 0；`<Spin tip=` 自闭合 = 0
  - `human-judgement` TR-C.4: 核心属性 5 项截图中 description 行在最后，span=2，绿色徽章 + 值正确
  - `human-judgement` TR-C.5: 两张截图 + innerText A/B 文件核心属性段逐字一致，仅空白差异可忽略
  - `human-judgement` TR-C.6: 若有能力临时构造 asset.description="" 场景验证 N1=4，不显示空描述行
- **Notes**: AC-3 空场景如果难以修改 mock（dev server 已运行），可通过临时在 Audit.tsx 调用处传第三参 `""` 手动验证并回滚；或者通过 browser_evaluate 直接替换 window.PREVIEW_ASSET.description 触发重渲染（如果有全局变量）。
