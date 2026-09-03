# 数据趋势模块 · 现代数据中台布局 V3（Cockpit 6:4 双栏范式）- PRD

## Overview
- **Summary**: 彻底重构 `TrendChart.tsx` 的整体空间布局，从"堆叠 4 层（主图 / 辅图 / 4×3 表 / Insight，外层 overflow:hidden）"改为「6:4 驾驶舱双栏布局」：**左侧占 60% 做主辅双图纵向堆叠**（Canvas 独占 ≥ 72% 卡片横向空间），**右侧占 40% 放 4 个今日 KPI 卡 + 指标统计抽屉 + 洞察摘要块**。外层容器按 2k / 1080p / compact 三档各自独立设置卡片总高度与子块高度比，彻底消除「12 个重叠 / 溢出 / 文字遮挡 / 今日重复 / 图例 2× 冗余 / Y 轴名字与 endLabel 互撞 / 辅图双今日重叠」等 12 项已知问题。
- **Purpose**: 解决当前版本用户截图反馈（`canvas 853×394 + canvas 853×251` + 下 4×3 表 + Insight 堆叠在 height:containerHeight 中导致 overflow:hidden 截断；文字 6 处重叠，运营无法判断数据、导出误看错误今日数据）。让后台操作人员在 3 种主流分辨率下 0 遮挡 0 歧义。
- **Target Users**: 龙鸽后台管理员 / 运营数据分析师 / 活动运营 / 监赛人员（每日打开工作台 ≥ 8 次）

## Goals
- G1 可视化零遮挡：三档分辨率（2560×1440 / 1920×1200 / 1920×1080）endLabel / Y 轴名 / 峰值文字 / 双今日 / 4×3 表 **0 处重叠**
- G2 数据零二义：页面「今日」统一只出现在右侧 **4 个 KPI 卡**；画布内部不再渲染 3 处「今日」文字（改"终点大数值标签"无语义冲突词）
- G3 空间利用率：**左 Canvas 区 ≥ 72% 卡片横向面积**，右信息区 4 KPI 每行 1 个纵向（不挤）；抽屉可展开但默认不占空间
- G4 现代中台范式：符合阿里云 DataWorks / 帆软 FineBI / 百度数据中台 / 腾讯云 BI 的 6:4 双栏驾驶舱范式
- G5 兼容 + 无回归：`TrendChartProps` 6 字段 **100% 向后兼容**；hover 十字准星、导出 CSV、周期切换（7/30/90d）等原有功能 100% 保留

## Non-Goals (Out of Scope)
- NG1 不改动 Dashboard 页面其他模块（MetricCard / AlertCenter / QuickEntry 等仍保持现状）
- NG2 不引入新图表库；继续使用 ECharts 5 + echarts-for-react（已安装可用）
- NG3 不改变数据层字段；`TrendPoint / TrendPointV2` 不变；`deriveV2Data / calcExtremes` 不增参
- NG4 不做暗色主题（预留 CSS 变量钩子，但本期不切换）
- NG5 不做多语言（仅中文）
- NG6 不做移动端响应式（仅 PC 三档）

## Background & Context
- 上轮重构 `trendchart-echarts-rewrite` 已完成底层 ECharts 化，解决数据口径打架（存量 vs 流量分双 Y 轴、主辅图分离）。
- 用户截图问题集中在 **布局 & 文字遮挡**，数据层与图型层是对的，只是图、图例、统计、操作按钮都挤在同一横条导致 12 处溢出/重叠。
- 现有代码：
  - 外层 `TrendChart-outer-wrap` 用 flex-direction:column + overflow:hidden + 固定 containerHeight，造成 4 个子块抢高度（G9 冲突根因）
  - `echartsOptions.ts` 把 legend 放 canvas 内 top-right，又在 TrendChart.tsx DOM 里再放一份 TrendLegendStatsPanel，**图例 × 2** 浪费 76px 高度
  - endLabel 硬编码「今日: N 羽」 + 辅图两柱顶 label 都写「今日 N 个/人」= 3 处今日与统计面板 4 个「今日总计」**重复 6 倍**
  - yAxis[0].nameLocation = 'start' 贴 0 轴，与 axisLabel「0 羽」重叠 18px

## Functional Requirements
### FR-1 卡片改为 6:4 双栏驾驶舱
- 整卡（Antd Card 内）拆成：
  ```
  ┌─ TitleBar（数据趋势 / [近 7 | 近 30 | 近 90] / [导出]） ───────────────────────┐
  │ ┌─────────────────────────────────────────┬─────────────────────────────────┐ │
  │ │  左侧 60%                              │  右侧 40%                       │ │
  │ │  ┌───────────────────────────────────┐  │  ┌───────────────────────────┐  │ │
  │ │  │ 主图 Canvas（68% 左栏高度）        │  │  │ KPI Card #1 今日存量      │  │ │
  │ │  │ 存量蓝面积线 + 环比%绿柱          │  │  │ KPI Card #2 今日环比%     │  │ │
  │ │  │ 红峰值 / 绿谷值点标                │  │  │ KPI Card #3 今日 NFT 铸量  │  │ │
  │ │  └───────────────────────────────────┘  │  │ KPI Card #4 今日活跃用户  │  │ │
  │ │  ┌───────────────────────────────────┐  │  ├───────────────────────────┤  │ │
  │ │  │ 辅图 Canvas（32% 左栏高度）        │  │  │ 指标统计抽屉（默认展开）  │  │ │
  │ │  │ NFT橙柱 vs 活跃绿柱               │  │  │ · 4 维度 × 3 列 总计/日均/  │  │ │
  │ │  │                                 │  │  │   峰值日期                  │  │ │
  │ │  └───────────────────────────────────┘  │  ├───────────────────────────┤  │ │
  │ │                                          │  │ 洞察摘要块（buildInsightText）│ │
  │ └─────────────────────────────────────────┴─────────────────────────────────┘ │
  │ 底部统一图例条（4 项：存/环/NFT/活 · 点击显隐 ✓ ✕）                            │
  └──────────────────────────────────────────────────────────────────────────────┘
  ```

### FR-2 移除 3 处「今日」硬编码 → 终点大数值标签（无语义词）
- 主图原 `endLabel: { formatter: '今日: {c} 羽' }` 改为：
  ```ts
  endLabel: {
    show: true,
    formatter: (p) => `${Number(p.value).toLocaleString('zh-CN')} 羽`,
    position: 'insideEndTop', // ECharts 5 内置：末端点的内侧上方，不越 grid
    distance: 2,
    fontWeight: 800,
    fontSize: endFontSize,
  }
  ```
- 辅图 NFT / 活跃用户两柱顶 label 原「今日 {c} 个 / 今日 {c} 人」改为：
  ```ts
  label: {
    position: 'top',
    formatter: (p) => (p.dataIndex === lastIdx ? `${p.value}${key==='nft'?'个':'人'}` : ''),
    // 不加「今日」词，避免右侧 KPI 写"今日"再冲突
  }
  ```

### FR-3 双 Y 轴 name 外置 + 移除左 Y nameLocation.start 重叠
- yAxis[0].name 「存量（羽）」删除；单位全移 axisLabel `'{value} 羽'`（原 D1 已有），title 放主图 Canvas 左上角单独 DOM 块「左 Y：存量（羽）· 右 Y：日增环比%」一行小字 ≥ 12px，**省 18px Y 名称 space**
- yAxis[1].name 「增长率（%）」删除；单位在 axisLabel 已用 `%`，title 在同一行 title 内显示
- grid.left / right 各减少 14 → 更多绘图区

### FR-4 图例：底部外置 1 条 + 移除 ECharts 内部 legend
- `echartsOptions.ts` 中 `legend: { show: false }`（给 grid.top 再省 36px）
- DOM 图例：卡片 TitleBar 正下方新增 1 条 `TrendLegendBarBottom`（4 项），点击 toggle hiddenSeries；状态 icon ✓/✕ 保留；hover 时高亮系列（dispatchAction highlight / downplay）
- 不再渲染 `TrendLegendStatsPanel-grid 4×3` 横表 → 改为右侧信息区"指标统计抽屉"**竖表**（4 维度 × 3 列 → 列数变为维度项 堆叠排列）

### FR-5 指标统计抽屉竖排结构（根治 4×3 文字被夹）
- 右侧抽屉（默认展开，可点击 ▼ ▲ 折叠仅留 32px 标题）
- 竖排：每项维度 1 行 3 值「总计 · 日均 · 峰值日期」→ 宽 220px 下不折行
- 环比行：显示 `—` 不显示总计

### FR-6 洞察摘要块独立块（右信息区底部）
- 原 `TrendChart-insight` 移到右侧底部（在抽屉之下），绿色背景；宽度 = 右栏 100%，不会与左栏 Canvas / legend 抢高度

### FR-7 三档尺寸独立容器高度（避免 flex 百分比乱比）
| Tier | 总卡片外高 (minHeight) | 左栏总高（主+辅+间距）| 主图高 / 辅图高 | 右栏 4 KPI 高度 | 抽屉默认 |
|---|---|---|---|---|---|
| 2K (≥1441) | 840px | 740px | 520px (70%) / 180px (26%) + gap=40 | 4× 84px = 336px | 展开 260px |
| 1080p (≥1148) | 700px | 620px | 430px (69%) / 140px (23%) + gap=30 | 4× 72px = 288px | 展开 220px |
| Compact | 600px | 540px | 380px (70%) / 120px (22%) + gap=20 | 4× 64px = 256px | 展开 180px |
- 移除外层 `overflow: hidden`（会裁切内容）→ 改为 `overflow-x: hidden; overflow-y: auto` 仅在异常极端时允许纵向滚，正常三档下都 **不出现滚动条**。

### FR-8 操作区（周期切换 + 导出）固定到 TitleBar 右上角
- 保持现状 Segmented 三值 + Button（下载），但外层加 `min-width: 420px` 保证 compact 档下也不折行
- 90d 时，dataZoom slider 放在「左 Canvas 主图底部独立 26px 区」，不占其他元素空间（Task7 检查 J3）

### FR-9 hover 十字准星 + Tooltip 跨两栏继续同步
- 原 `mousemove → 双 canvas dispatchAction(showTip)` 保留；并把 Tooltip 中对应数值同步**右侧 4 KPI 背景瞬时黄色高亮 0.6s**（AC-13 视觉增强）

### FR-10 无障碍：`role="region" aria-label`
- 卡片区 `role="region" aria-label="数据趋势模块 6:4 驾驶舱"`
- 左栏 `aria-label="主辅双图"`
- 右栏 KPI 分别 `aria-label="今日存量指标卡"` 等 4 项
- 底部图例条 `role="toolbar" aria-label="图例显隐切换 共 4 项"`

## Non-Functional Requirements
### NFR-1 性能
- 切换周期间（week7→week30→week90→week7）× 10 次平均 ≤ 200ms（上次 250ms，目标 -20%）
- 冷加载后 5 分钟 heap Δ ≤ 6MB（上次 8MB，-25%）

### NFR-2 构建质量
- `npx tsc --noEmit` 0 error / 0 `@ts-ignore` / 0 `as any` / 0 `any`
- `npm run build` 退出码 0；TrendChart 相关 0 warnings
- 旧 SVG `buildStockPath / MainChart/ SubChart / TrendTooltip` 仍然 0 处（确保不回归）

### NFR-3 分辨率三档校验
- 9 组合（3res × 3range）× 12 项已知 Bug 断言 = 108 条，PASS ≥ 108

### NFR-4 安全
- CSV 导出仍用 UTF-8 BOM `\uFEFF`，确保 Excel/WPS 不中文乱码
- 无 `dangerouslySetInnerHTML`；Tooltip formatter 仍返回纯 string（echarts 内部 HTML 白名单已过滤）

### NFR-5 可维护性
- `TrendChart.tsx` ≤ 580 行（当前 528，新增结构控制在 52 行内）
- 子结构拆为文件内 3 个 memo 组件（KpiCardColumn / LegendBarBottom / StatsDrawerVertical）→ 不可跨文件避免 ref 传参绕圈

## Constraints
- **Technical**: React 18 + TS + AntD 5 + ECharts 5 + echarts-for-react；禁止新增依赖（含 react-resizable / antd Grid 等已可用）
- **Business**: 上线时间窗口 ≤ 1 次代码评审周期；改动必须在 TrendChart 相关 5 文件闭环
- **Dependencies**: 不改动 mockData 数据；外层 `<Dashboard>` `{...trendInsights}` 仍可传（即使 deprecated）

## Assumptions
- A1 当前用户端 PC 屏幕 ≥ 1147px（compact 档下限），<1147px 时自动按 compact 并允许右栏 280px 最小宽
- A2 用户使用 Chrome / Edge / Safari 最新版；支持 matchMedia / CSS Grid / ECharts
- A3 导出 CSV 文件名 `trend_{week7|week30|week90}_{YYYYMMDD}.csv` 当前约定继续保留
- A4 图例显隐联动与上次实现一致（hiddenSeries: Set<'stock'|'rate'|'nft'|'user'>）

## Acceptance Criteria

### AC-1 6:4 双栏结构成立 & 横宽占比
- **Given**: 任一分辨率档位进入 Dashboard，看到「数据趋势」卡
- **When**: 检查左右两栏宽度
- **Then**: 左栏宽 / 右栏宽 = 60% / 40%（误差 ≤ 2%，考虑 grid gap），左栏 canvas 2 张高度之和 ≥ 卡片内部高度的 60%（保证面积占比 ≥ 72%）
- **Verification**: `programmatic`（getBoundingClientRect 比例检查）

### AC-2 12 项已知 Bug 全零回归
- **Given**: 上次截图的 12 个问题清单（Comparison Diff 1→12）
- **When**: 跑 J 模块 9 组合 × 12 断言
- **Then**: 108 / 108 条 = PASS；每条"有重叠 / 有截断 / 有溢出"检测方法在 TR-10.2
- **Verification**: `programmatic`（DOM 碰撞盒检测）

### AC-3 页面「今日」语义零冲突（≤ 4 处且仅右侧）
- **Given**: 加载默认 7d
- **When**: 正则 `/今日/g` 统计 body innerText
- **Then**: 总数 = **4**（右栏 4 KPI 标题各自含「今日××」1 次，不多不少）；Canvas 内（两张 canvas 之外）= 0 处；左栏 Canvas wrapper 内 = 0 处
- **Verification**: `programmatic`

### AC-4 三档外层不出现纵向滚动条（正常数据）
- **Given**: 90d 紧凑档（最大数据量）
- **When**: `outer.clientHeight === outer.scrollHeight`
- **Then**: 等式成立；允许 `scrollHeight - clientHeight ≤ 2`（四舍五入误差）
- **Verification**: `programmatic`

### AC-5 右栏 4 个 KPI 显示值 = v2Data[-1].geneStock / .geneRatePct / .nftDaily / .userDaily
- **Given**: 任一 range，取 v2Data[-1]
- **When**: 读右侧 4 卡大号粗体数字
- **Then**: 值完全匹配，环比% 用 `+.1f% / -.1f% / 持平` 三态
- **Verification**: `programmatic`

### AC-6 指标统计抽屉（垂直版）4×3 = 12 单元格均非空 & 峰值日期对应 calcExtremes
- **Given**: 展开抽屉（默认展开）
- **When**: 比对 `getDimensionStats(v2Data, k)` 返回
- **Then**: 12 格文本 = 预期；rate 行总计显示 `—`（G6 同前）
- **Verification**: `programmatic`

### AC-7 图例显隐：点击 4 项任意 one → 对应系列 hidden → hiddenSeries Set 变化 → 双 canvas option.selected 同步
- **Given**: 默认全部显示（hiddenSeries size=0）
- **When**: 点击图例「NFT 日铸量」一次 → 再点一次
- **Then**: 点击 1 次后：hiddenSeries.has('nft')=true，辅图 NFT 系列 option.selected=false；再点击：has=false / selected=true；**图例状态 icon ✓/✕ 一致**
- **Verification**: `programmatic`

### AC-8 CSV 导出 6 列正确 + BOM + 文件名对
- **Given**: 近 30d 点击导出
- **When**: 读取 Blob 内容 text
- **Then**: 首字符 `\uFEFF`；行数 = 31（1 表头 + 30 行）；列数 = 6（日期/基因日增/存量/环比%/NFT/活跃）
- **Verification**: `programmatic`（模拟 Blob 解析）

### AC-9 10× 周期切换平均 ≤ 200ms（NFR-1）
- **Given**: 冷加载 3s 后
- **When**: 依次 week7→week30→week90 循环 10 遍，Performance mark 记录 Segmented change 到 ReactECharts 'finished' 事件
- **Then**: 中位数 ≤ 200ms，P95 ≤ 260ms
- **Verification**: `programmatic`（performance mark）

### AC-10 5 分钟 Heap Δ ≤ 6MB（NFR-1 更严）
- **Given**: 1080p 档，停留在 dashboard，每 20 秒自动切一次 range（7→30→90→7 共 15 次）
- **When**: performance.memory.usedJSHeapSize 初始 vs 终值
- **Then**: Δ ≤ 6MB（上次 −0.44；本次更易达成）
- **Verification**: `programmatic`（only in Chromium-based）

### AC-11 TypeScript + Build 双绿
- **Given**: 代码提交后
- **When**: `npx tsc --noEmit && npm run build`
- **Then**: 双命令退出码 0；0 `@ts-ignore`（TrendChart 5 文件 grep 计数）；0 any
- **Verification**: `programmatic`

### AC-12 向后兼容：父组件传入 6 字段均不报错
- **Given**: 传入 6 字段（仅传 insights={trendInsights}，其他与现状一致），不传 prevTrendData×3
- **When**: 渲染 3 周期
- **Then**: 渲染正常；控制台 0 error / 0 warning（非第三方）
- **Verification**: `programmatic`

### AC-13 hover Tooltip 右侧 KPI 高亮联动（FR-9）
- **Given**: 主图 hover 某日 index = i
- **When**: Tooltip 显示
- **Then**: 右侧 KPI 4 卡背景临时变 `rgba(22,119,255,0.06)` 高亮，并在 i = last index（最后一日）时 **KPI 数字加粗瞬时 pulse 1 次**
- **Verification**: `human-judgement`（肉眼可见）+ `programmatic`（KPI 卡 className 有 'is-highlighted'）

### AC-14 极值 markPoint（峰值红 / 谷值绿）**不压柱顶** ≥ 14px 气泡
- **Given**: 主图 markPoint coord = extremes.maxDailyIdx / minDailyIdx
- **When**: 比较柱顶 y 坐标与气泡底部
- **Then**: 气泡底部 ≥ 柱顶 + 14px，label 文字不撞折线
- **Verification**: `programmatic`（getConvertPixel 比较）

### AC-15 人眼感知"像现代数据中台"
- **Given**: 10 位运营评审 7d 2K 截图 + 30d 1080p 截图
- **When**: 问卷「视觉协调 / 操作顺手 / 信息清晰」3 项，5 分制
- **Then**: 三项均分 ≥ 4.2 / 5
- **Verification**: `human-judgment`

## Open Questions
- [ ] **OQ-1（已默认方案 A）**：用户已口头批准方案 A（6:4 驾驶舱），如评审时希望换成 B 或 C，则把 FR-1 整体结构切换为 B（顶部 KPI）或 C（巨型 KPI + Tab）；对应 TR 任务切换。**默认 A**
- [ ] **OQ-2（已默认保留导出 CSV + INSIGHT）**：是否需要新增「导出 PNG」？当前 PRD 不含，可后续单独 spec。默认不加。
- [ ] **OQ-3（默认"折叠抽屉不做"）**：指标统计抽屉的"▼折叠"交互是否要做？PRD FR-5 中已列入，但如时间紧可砍（改为**默认展开不可折叠**）。当前 implementation 计划默认**可折叠**，不占多少行。
- [ ] **OQ-4（默认不做移动端）**：是否做 < 1147px 单栏自适应？NG6 已排除，默认 **不做**。
