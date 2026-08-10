# 验证清单：NFT 审核预览「信息详情」三卡片分组 + custom_attrs 展开

## 一、字段字典 & 模糊映射（对应 AC-1 / TR-1.3）
- [ ] 1.1 `birth_year` label 显示为「出生年份」中文，非英文 key，且归位于「核心属性」卡片而非自定义卡片
- [ ] 1.2 `hatch_year / age / sire / dam / lineage / ancestry / ring_id / father_strain / mother_strain / detection_no / chip_id / level / race_rank` 等 13 个新补齐字段全部显示对应中文 label
- [ ] 1.3 扩展前缀 key（如 `custom_birth_year` / `extra_image1` / `attr_age` / `user_lineage`）即使碰巧命中 CN_MAPPING，仍强制归「自定义扩展属性」卡片并带 magenta 【自定义】徽标
- [ ] 1.4 纯中文模糊 key（如 `鸽子出生年月日`、`血统-父系`、`足环照片`）即使未命中字典，也能显示推断出的中文 alias 而不是 raw key（但仍保留【自定义】徽标）

## 二、custom_attrs 数组展开 & 不出现 raw JSON（对应 AC-2 / TR-1.2 / TR-2.5）
- [ ] 2.1 原 custom_attrs 这一行（label="custom_attrs"、value=raw JSON）完全从页面中消失
- [ ] 2.2 custom_attrs[0] 赛绩 = "430KM 第8名" → 展开为单独一行 label="赛绩"，value 前带 🏅 emoji
- [ ] 2.3 custom_attrs[1] 血统等级 S 级且 custom:true → 展开为 label="血统等级"，带 magenta 【自定义】+ ✅ 用户高亮 Tag，值="S 级"
- [ ] 2.4 卡片 3 DOM innerText 中不包含任何 raw JSON 特征字符串：`"key":` / `"value":` / `[` `{` 包裹的数组/对象结构字符串（纯 key 中括号如【自定义】不算）
- [ ] 2.5 OpenSea traits 结构 `[{trait_type:'羽质',value:'油羽'}]` 也能正常展开（如 attributes 字段）
- [ ] 2.6 非 KV 数组（纯字符串数组 `['公棚A','公棚B']`）→ 渲染为 Space + Tag 组，不是 JSON 字符串

## 三、三卡片分组结构 & 计数正确（对应 AC-3）
- [ ] 3.1 三张卡片按固定顺序出现：核心属性 → 图片附件 → 自定义扩展属性
- [ ] 3.2 每张卡片标题带 item 数 badge：「📋 核心属性（N 项）」「🖼️ 图片附件（N 项）」「✨ 自定义扩展属性（N 项）」
- [ ] 3.3 顶部 section 标题显示「信息详情 · 共 (N1+N2+N3) 个属性」，与三子项相加一致
- [ ] 3.4 卡片 3 右上角额外加一个 magenta small 徽标「用户上传」
- [ ] 3.5 三卡片之间有视觉分隔（gap ≥ 12px 或默认 Card margin），不要粘成一张大卡片

## 四、智能值渲染增强（对应 TR-2.4）
- [ ] 4.1 出生年份类值追加中文「年」单位：2024 → "2024 年"
- [ ] 4.2 赛绩排名映射正确：第1名→🥇；第2名→🥈；第3名→🥉；第8名→🏅；仅含"赛绩"关键词无排名→🏁
- [ ] 4.3 性别映射保持：male→雄 / female→雌
- [ ] 4.4 嵌套对象（如 `血统: {父:'A',母:'B'}`）→ 展开为两行：「血统.父 / A」「血统.母 / B」（深度≤2）
- [ ] 4.5 深度超过 2 的嵌套对象 → copyable paragraph，不会无限递归

## 五、两调用点一致性（对应 AC-4）
- [ ] 5.1 Audit.tsx 审核预览 Drawer 与 List.tsx 详情抽屉打开同一 NFT ID=1 资产，信息详情三卡片分组逐字段顺序一致
- [ ] 5.2 两调用点的字段分类、中文 label、emoji、Tag 徽标、计数完全相同（行自动换行差异可忽略）
- [ ] 5.3 图片附件的缩略图 + 查看原图链接在两调用点表现一致（extraImageUrl 兜底、IPFS 占位图相同）

## 六、AntD 合规 & tsc 类型安全（对应 AC-5 / TR-2.1/TR-3.1/TR-3.2/TR-3.3）
- [ ] 6.1 `cd admin-web && npx tsc --noEmit` exit_code = 0
- [ ] 6.2 Audit.tsx 调用点 `browser_console_messages` 过滤 `[antd:` → 0 条 warning（尤其 Descriptions span 对齐 warning）
- [ ] 6.3 List.tsx 调用点 `browser_console_messages` 过滤 `[antd:` → 0 条 warning
- [ ] 6.4 静态 `import { message } from 'antd'` 在 admin-web/src 下 grep → 0 条（全部走 app.useApp.message）
- [ ] 6.5 `<Spin tip=` 自闭合（或等价 AntD 已弃用 Spin tip prop）grep → 0 条
- [ ] 6.6 Card / ProCard 不使用已废弃 bordered/bodyStyle/headStyle props（如 ProCard bodyStyle → styles.body）

## 七、异常场景 & 不崩溃（对应 AC-6 / TR-3.5）
- [ ] 7.1 纯字符串数组 metadata → 无白屏，Tag 组展示
- [ ] 7.2 嵌套对象 metadata（深度 ≤2）→ 点路径展开；深度 >2 → copyable paragraph
- [ ] 7.3 展开 key 与顶层 key 重名 → 以原顶层值为准，展开值不覆盖系统字段
- [ ] 7.4 乱码/invalid JSON 字符串（如 metadata = "this is not json{123"）→ 不抛错，进入 ParseError 分支：Empty + "元数据格式异常已按原文展示"提示 + `<Pre copyable>` 原文
- [ ] 7.5 完全空 metadata（null / undefined / 空对象）→ 三卡片各显示 Empty "暂无…"，无任何 runtime error
