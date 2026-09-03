# NFT 审核预览信息详情修复优化 - The Implementation Plan (Decomposed and Prioritized Task List)

## [x] Task 1: 字段字典扩充 + 模糊映射 + custom_attrs 展开算法 + 字段分类工具函数
- **Priority**: high
- **Depends On**: None
- **Description**：
  - 在 `admin-web/src/utils/nft-metadata-render.tsx` 扩展 `CN_MAPPING`：新增 birth_year/出生年份、hatch_year/出生年份、age/鸽龄、sire/父鸽血统、dam/母鸽血统、lineage/血统谱系、ancestry/祖先、ring_id/足环编号、father_strain/父系、mother_strain/母系、detection_no/检测编号、chip_id/芯片编号、level/等级、race_rank/赛事排名、attributes/属性列表 15 条
  - 修改 `getLabelInfo(key)`：新增 `inferAliasByFuzzy(key)` 辅助函数与 FR-1.2 四条前缀/模糊匹配规则（year/生日/年龄→出生年份；image/图/照片→图片；血统/血缘/sire/dam→血统类；custom_/extra_/attr_/user_前缀→扩展）；新增 "alias 中文但 label 仍保留【自定义】徽标" 逻辑
  - 新增 `getFieldCategory(key, meta?)` 返回 `system | image | custom` 三分类（按 FR-1.3 定义）
  - 新增 `expandCustomAttrsArrays(parsed: Record<string, any>) => {record: Record<string, any>, customFlags: WeakMap<object,Record<string,boolean>>}` 函数：按 FR-2.1 三种 KV 数组结构识别（custom_attrs/attributes/extra_attributes）并展开；冲突按顶层原值覆盖；删除原数组 key；custom=true 的项写入 customFlags；识别失败的数组/嵌套对象走 FR-2.3/FR-4.5 的展开规则
  - 把 `parseMetadata` 结果 pipeline 改造成：`parse → expandCustomAttrsArrays → 分类 + 字典`
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-6
- **Test Requirements**:
  - `programmatic` TR-1.1: `npx tsc --noEmit` exit_code=0
  - `programmatic` TR-1.2: 对 metadata = `{birth_year:2024, custom_attrs:[{key:'赛绩',value:'430KM 第8名'},{key:'血统等级',value:'S级',custom:true}]}` 调用 `expandCustomAttrsArrays`，返回的 record 中 **key='custom_attrs' 不存在**，key='赛绩'存在且 value='430KM 第8名'，key='血统等级'存在且 customFlags 中 origin.custom=true
  - `programmatic` TR-1.3: 对 key='birth_year' 调用 getLabelInfo()，返回 label='出生年份' 且 category='system'；对 key='custom_birth_year' 命中扩展前缀，返回 alias='出生年份' 但 category='custom' 且带 magenta 【自定义】徽标
  - `human-judgement` TR-1.4: birth_year、age、sire、dam、ring_id 5 个典型新增字段的中文字典 label 完整无缺字/错字，与 spec FR-1.1 一致
- **Notes**: 注意 WeakMap 在 React 重渲染中的生命周期问题，用 WeakMap<parsedObject, Record<key,flag>> 避免内存泄漏；TS 类型需给 expand 的返回值定义 interface。

## [x] Task 2: renderMetadataInfoSection 改三卡片分组结构 + intelligentValueRenderer 智能增强
- **Priority**: high
- **Depends On**: Task 1
- **Description**：
  - 重写 `renderMetadataInfoSection(metadata, extraImageUrl?)`：按 FR-3 把输出由单 Descriptions 改成三卡片结构（Card variant=outlined，gap=12px 或等价 space）：
    1) 卡片 1 核心属性（system 集合）：两列 bordered 小 Descriptions；N=0 时 Empty
    2) 卡片 2 图片附件（image 集合 + extraImageUrl 兜底）：缩略图 + 原图链接；IPFS ipfsToHttp；N=0 且 extraImageUrl 空 → Empty
    3) 卡片 3 自定义扩展属性（custom 集合）：强制 magenta 徽标；origin.custom=true 再加 ✅ 用户自定义高亮 Tag
  - 计数：section 标题 = "信息详情 · 共 (N1+N2+N3) 个属性"，三卡片 title 分别带 (N 项) badge
  - 增强 `intelligentValueRenderer(key, value)`：
    - 性别映射保持；出生年份类值追加 "年"；赛绩/赛事排名按规则加 🥇/🥈/🥉/🏅/🏁 emoji；纯字符串数组 → Space Tag；嵌套对象 → 深度 ≤2 的点路径展开；深度超限 → Copyable long text
  - 修复/保留原 bug fixes：Descriptions span 对齐实时 pad（避免 antD Warning）、长文本 Paragraph copyable expanded=false、IPFS 占位图、ParseError 提示、"扩展属性" magenta Tag 的新 key
  - 保持公共 API 签名不变：`renderMetadataInfoSection(metadata: unknown, extraImageUrl?: string) => JSX.Element`
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-5, AC-6
- **Test Requirements**:
  - `programmatic` TR-2.1: `npx tsc --noEmit` exit_code=0
  - `programmatic` TR-2.2: 在浏览器 dev console 打开两个调用点，用 `browser_console_messages` 过滤 `[antd:` → 0 条（含 Descriptions span 对齐 warning）
  - `human-judgement` TR-2.3: 三卡片视觉顺序、标题、badge 数量与 AC-3 描述一致；system/custom/image 的字段分布正确
  - `human-judgement` TR-2.4: 赛绩 "430KM 第1名" → 前缀 🥇；"430KM 第2名" → 🥈；"430KM 第3名" → 🥉；"430KM 第8名" → 🏅；无排名词的赛绩 → 🏁；出生年份 2024 → "2024 年"；血统等级值前无 emoji（非赛绩类）
  - `human-judgement` TR-2.5: custom_attrs 完全不输出 raw JSON，custom_attrs 这个 key 本身在行中消失；截图两处核心缺陷都已不存在
- **Notes**: 不要使用 AntD 废弃 props（Card variant=outlined 不写 bordered=true）；卡片内部 Descriptions 若用 size="small" bordered={true} 需要确认该 prop 在 AntD 5 的保留状态（查过 AntD 5.17 Descriptions.bordered 是保留的，只 ProCard 有废弃）。嵌套对象展开深度限制很重要，避免 DOS 风险。

## [x] Task 3: 两调用点集成验证 + tsc + 6 项 AC 全量验证
- **Priority**: high
- **Depends On**: Task 2
- **Description**：
  - 在 `admin-web/src/pages/Asset/NftAudit/Audit.tsx` 的 NFT 审核预览 Drawer（Asset[0] 点开）走一遍完整 UI 验证（截图对比 AC-1/2/3）
  - 在 `admin-web/src/pages/Asset/Nft/List.tsx` 的同一 NFT ID=1 详情抽屉走一遍 UI 验证，确认两调用点信息详情**逐字段一致**
  - 执行 `npx tsc --noEmit`；grep 静态 `import { message } from 'antd'`；grep `<Spin tip=` 自闭合；console messages antd warning
  - 异常 5 种 metadata 用例（纯字符串数组、嵌套对象、重复 key、乱码 JSON 字符串、完全空）验证不崩溃
- **Acceptance Criteria Addressed**: AC-4, AC-5, AC-6
- **Test Requirements**:
  - `programmatic` TR-3.1: tsc exit_code = 0
  - `programmatic` TR-3.2: 两调用点 `browser_console_messages` `[antd:` 计数 = 0
  - `programmatic` TR-3.3: `Grep` admin-web/src 下静态 `import { message } from 'antd'` → 0 条；`<Spin tip=` 自闭合 → 0 条
  - `human-judgement` TR-3.4: 调用点 Audit.tsx / List.tsx 两 Drawer 截图对比信息详情板块一致
  - `human-judgement` TR-3.5: 5 个异常用例（纯字符串数组 / 嵌套对象 / 重复 key / 乱码 JSON / 空 metadata）页面不白屏，有合理兜底展示
- **Notes**: 所有验证通过后才能把 Task 3 标为 complete。
