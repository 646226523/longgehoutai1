# 数据趋势图 ECharts 全面重写 - Product Requirement Document

## Overview
- **Summary**: 废弃 `TrendChart.tsx` 当前的手写原生 SVG 实现（其在 7/30/90 天三周期、2K/1080p/紧凑三分辨率下暴露 11 项渲染缺陷），改用 **ECharts 5 + `echarts-for-react` + 原生 Flex + `myChart.resize()` 防抖** 重写整个 `TrendChart` 模块。严格遵循用户在原始需求中给出的「主图双 Y 轴（存量面积折线 + 日增环比%柱）/ 辅图双柱（NFT日铸 + 活跃用户）」的 option 模板，落地三分辨率自适应、智能极值标注、Tooltip 环比、图例统计面板、CSV 口径一致六大功能，并一次性修复 11 项截图中确认的 Bug。
- **Purpose**: 解决手写 SVG 在真实分辨率+数据周期下的全部渲染失控问题（Y轴倒序刻度、数字被压缩、图例重叠、今日标签二义性、X轴重叠、双0轴混淆等），让运营看到的图表不再"反人类"，具备专业级后台分析工具的可信度。
- **Target Users**: 超级管理员、运营经理、赛事负责人、数据分析师（使用 2560×1440 驾驶舱 / 1920×1200 商务屏 / 1920×1080 通用屏三类桌面）。

## Goals
1. **根治 11 项渲染 Bug**：三张用户截图中每一项视觉缺陷都对应到一条程序化解验收标准，确保三周期×三分辨率组合下不再出现。
2. **严格对齐原始交互 PRD**：主辅图三明治分层、双 Y 轴单位分离、智能极值红/绿标注、Tooltip 含环比+占比、图例点击同步统计面板、三档布局 rem+flex+debounce resize、2560 宽屏开 dataZoom，逐项可追溯到用户原文。
3. **数据口径 100% 一致**：主图终点标签 / Tooltip / 底部洞察条 / 导出 CSV 四者在同一周期下，同一项指标（今日存量、日增、日环比、NFT日铸、活跃用户）数值完全一致，消除"两个今日打架"的二义性。
4. **性能 ≤ 原 SVG**：单次渲染 DOM 节点数 ≤ 300（原 SVG 7+30+90 days 模式下超过 800 节点），hover 响应 ≤ 80ms，周期切换 ≤ 250ms，resize 防抖 200ms。

## Non-Goals (Out of Scope)
- 不更换现有 Ant Design 5 / React 18 主框架。
- 不调整 TrendPoint 接口（`{date,gene,user,nft}`）作为**唯一原始数据源**的契约，任何派生数据（存量、环比、均值等）只在 ECharts option 构造层完成。
- 不做后端 API 改造，仍复用 `mockData.ts` 格式；真实接口上线时**仅需**替换 `data7/30/90` 来源。
- 不做移动端 / 竖屏适配，明确服务于 1920+ 宽屏桌面。
- 不引入 ECharts 主题库（官方主题包体积大），沿用 spec 已有色板 CSS 变量直接传入 option。

## Background & Context
- 前次实现（`MainChart.tsx / SubChart.tsx / TrendLegend.tsx / TrendTooltip.tsx / useHoverIndex.ts` 共 5 个手写 SVG 文件）的 **viewBox 投影映射**与**实际 CSS 像素压缩**之间存在不可控的视觉误差：
  - 四位数数字（1721 羽）在 viewBox 1000 宽度被实际压到约 700px 时，SVG `<text>` 的 subpixel antialiasing 会让 `1721` 在 100% 缩放的 1920×1200 屏幕上读成"79"和"今日：xxx"两截叠加（证据：用户 90 天截图左轴 79 羽上方实际数字是 1800+ 存量，刻度计算和字体渲染双重偏离）。
  - 终点标签 `textAnchor=middle` 在曲线末端靠近右轴 50px 时必然溢出覆盖右轴"增长率（%）"标题。
  - 90 天 × compact 档 `xLabelRotate=15°` 但 `xTickInterval=2` 只实现了一半，45 个标签挤在 800 viewBox 宽里造成"麻花文字"。
- 用户原始需求中明确给出的 ECharts option 模板（双 Y 轴、系列类型、颜色）是**本 PRD 技术选型的硬约束**，本次重写直接基于该 option 扩展而非重新发明。
- 当前 `package.json` 尚未引入 `echarts` 与 `echarts-for-react`（见 admin-web/package.json dependencies），Task 1 将显式加入这两个依赖并跑通 `tsc + vite build`。

## Functional Requirements

- **FR-1 主辅图分层结构**（三明治结构）
  - 上方主图（容器高度 55%）：双 Y 轴。左轴：基因档案**存量**（面积折线 `smooth:true`，蓝 `#3B82F6` + 面积透明度 0.1）。右轴：日环比**增长率%**（绿色柱状 `#10B981`，首天或昨日=0 时 `rateIsMissing` 不渲染柱）。
  - 下方辅图（容器高度 35%）：统一数值轴，双柱并列对比。NFT 资产**日铸量**（橙 `#faad14`）+ 活跃**用户日活数**（绿 `#52c41a`）。
  - 主/辅图 16px gap，共享 X 轴日期对齐、共享十字准星。

- **FR-2 三分辨率自适应**
  - 2K 驾驶舱（≥2560）：容器 `calc(100vh - 280px)`；grid 边距 `60/60/40/40`；字号 16；主图开启 `dataZoom: [{type:'slider', bottom: 5, height: 14}]`；X 轴 interval=1。
  - 1080p 标准（≥1920 <2560）：容器 `calc(100vh - 240px)`；grid 边距 `50/50/30/30`；字号 14；`dataZoom` 关闭；X 轴 interval=1。
  - compact 紧凑（<1920）：容器 `calc(100vh - 220px)`；grid 边距 `40/40/25/25`；字号 13；X 轴 interval=2、`axisLabel.rotate = -15`。
  - 三档 min-height 均 ≥ 400px；`window.resize` 通过 200ms debounce 后调用 `echartsRef.current?.resize()`。
  - 以上档位由新 hook `useResolutionTier` 返回对象驱动（保留原 hook 文件但重写其内部为 `matchMedia`）。

- **FR-3 智能极值标注 + 终点大字号今日标签**
  - 主图 stock 折线：自动计算当前周期 `daily gene 日增` 的最高/最低日期；最高点 `markPoint: {symbol:'circle', color:'#ef4444', label:'峰值'}`，最低点 `markPoint: {symbol:'circle', color:'#10B981', label:'谷值'}`。
  - 折线末端（最后一个数据点）：ECharts `series-line.endLabel` + `valueAnimation: true`，渲染 `今日: {geneStock} 羽`，字号 16+2=18，粗体 700，颜色 `#3B82F6`，**ECharts endLabel 自带 right-boundary prevent-overflow 内置逻辑，不再溢出右轴**。
  - 辅图 NFT 柱 / 活跃用户柱：各自的最后一柱用 `series-bar.label.show` 在柱顶渲染 `今日 {nft} 个` 和 `今日 {user} 人`；与主图今日标签统一取 `v2Data[dataLen-1]` 为单一数据源，**不再在 Legend 另写一套今日标签**（消除 Bug #5 二义性）。

- **FR-4 Tooltip 悬浮窗重构**
  - Trigger: axis，AxisPointer: `{type:'cross', label:{show:true, precision:0}}`。
  - 渲染行：
    1. 日期：`2026-08-04`（完整 ISO 日期）
    2. 基因档案存量：`590 羽`（主图左轴）
    3. 基因日增：`18 羽`（辅助文本，非主图系列），其后附 `较昨日 ↓ 11.5%` 或 `较昨日 ↑ 25.3%` 或 `较昨日 —`（首天）
    4. 基因日增占周期总量：`占近7天总量 11.5%`
    5. 日环比增长率：`+8.2%`（右轴系列值）
    6. NFT 资产（辅图口径）：`8 个` + `较昨日 ↓ / ↑`
    7. 活跃用户（辅图口径）：`13 人` + `较昨日 ↓ / ↑`
  - 主图和辅图共享一个 Tooltip（ECharts `axisGroup` 或 React 外层合并，二选一；推荐主辅图分别渲染但 hoverIndex 由外层 React 同步）。

- **FR-5 图例交互升级**
  - 4 项可点击图例：「基因档案存量」「日增环比%」「NFT 日铸量」「活跃用户数」，颜色与系列一致，每项右侧渲染一个**可下钻统计面板**：
    - 图例被点击隐藏 → 对应图例文字置灰 `#bfbfbf`、统计面板收起。
    - 图例被点击显示 → 底部对应 3 个数字：`总计 / 均值 / 峰值日期`（峰值日期=该维度最大值发生日期）。
    - 统计面板每行 4 列网格对齐（主图 2 项 × 辅图 2 项 = 4 列 × 3 行数字）。
  - **严禁**再渲染浮动"今日"大字在图例区（上一版 Bug #5 根因）。

- **FR-6 周期 Segmented + CSV 导出**
  - 右上角 Segmented: 近 7 天 / 近 30 天 / 近 90 天。切换时重置 legend 选中态、自动关闭 dataZoom 选区、resize 一次。
  - 右上角导出按钮：导出 6 列 CSV：`日期,基因档案日增量,基因档案存量,日环比增长率(%),NFT日铸量,活跃用户数`。首行 BOM `EF BB BF` 保证 Excel 中文。首天增长率写空字符串""。导出文件名 `trend_{range}_{YYYYMMDD}.csv`。

- **FR-7 视觉样式**
  - 网格线：`splitLine: {lineStyle:{color:'#d9d9d9', type:'dashed', opacity:0.3}}`；仅 0 轴实线。
  - 左 Y 轴：`name:'存量（羽）'`，右 Y 轴：`name:'增长率（%）'`，右轴 splitLine show:false。
  - X 轴 label 格式 `MM/dd`，`boundaryGap:false`（主图 stock line）、`boundaryGap:true`（主图 rate bar / 辅图双 bar）—— 由 ECharts `series.bar` 默认自动处理 boundary。
  - 卡片背景：极浅渐变 `#F8FAFC → #FFFFFF`，与现有一致；卡片 border `1px solid #f0f0f0`，`border-radius:8px`。

- **FR-8 洞察条数据驱动**
  - 图表下方一条浅绿色提示：`💡 近{7|30|90}天新增档案 {sum} 羽（日均 {avg} 羽），峰值 {peakDate} {peakDaily} 羽 / 谷值 {valleyDate} {valleyDaily} 羽。今日较昨日：{upOrDown}{pct}%。` —— **全部数字来自与 CSV 相同的 v2Data 派生，保证口径一致**。

## Non-Functional Requirements
- **NFR-1 包体增量**：`echarts + echarts-for-react` 生产 gzip 后 ≤ 220 KB（2024 年 ECharts 5.5 tree-shakable 基准）。
- **NFR-2 性能**：在 1920×1200 浏览器（i5-12400 核显 + 8GB 内存）下，切换周期（7→30→90→7）循环 10 次平均耗时 ≤ 250ms；Tooltip 悬停 80ms 内弹出；resize 200ms 防抖后布局完整无抖动。
- **NFR-3 可用性（a11y）**：每个 `<EChartsReact>` 带 `aria-label="主图/辅图"`；图例项按 space/enter 可切换；Tooltip 键盘 Tab 可达。
- **NFR-4 类型安全**：全部 option 构造使用显式 `EChartsOption` 类型；弃用 `any`；`tsc --noEmit` 零报错。
- **NFR-5 可测试性**：导出 `buildMainOption / buildSubOption / deriveV2Data / csvContent` 纯函数，vitest 无 DOM 即可单测（Task 9 单测覆盖）。

## Constraints
- **技术栈**: React 18 + TypeScript 5.4 + Ant Design 5 + ECharts 5.x + echarts-for-react + Vite 5。**不能引入 ECharts wrapper 第三方主题**。
- **向后兼容**: `TrendChart` 的顶层 Props 签名**必须**与前版完全一致：`{data7,data30,data90,insights,prevTrendData7?,prevTrendData30?,prevTrendData90?}`。`insights.text` 字段**不再渲染**，改由 FR-8 洞察条派生；保留字段是避免消费方 Dashboard 改破。
- **兼容性浏览器**: Chrome / Edge 最后两个大版本；不考虑 Safari 14- / Firefox 95-。
- **交付时限**: 规格批准后 2 个工作日内完成 Task 1-10。

## Assumptions
1. `data7/30/90` 传入顺序都是「旧→新」，最后一项=今日；用户首版需求中的 data7 `['7/29',...,'8/4']` 符合。
2. `geneStock = prefixSum(geneDaily)`；如果后端某一天返回负值（撤回），prefixSum 自然下降，图表允许下行。
3. prevTrendData 仅影响 FR-8 洞察条的"环比上周/上月/上季"替换"环比昨日"；未传则降级为 `(今日-昨日)/昨日`。
4. 90 天周期下 dataZoom 的 slider 位于主图 X 轴下方，不会挡住辅图（grid.bottom + dataZoom.bottom 合计 ≤ 主图 margin.bottom）。

## Acceptance Criteria

### AC-1: 修复 Y 轴刻度乱序 / 倒序 Bug（Bug #1）
- **Given**: 打开 Dashboard → 数据趋势 → 切换到 90 天档
- **When**: 屏幕宽度 = 1920 × 1200
- **Then**: 主图左 Y 轴 5 个刻度从下到上严格按 `0 < t1 < t2 < t3 < t4 ≤ maxStock*1.1` 单调递增；不出现任何 `>数字` 前缀、不出现数值文本被截断叠加、不出现任何刻度数字是其他数字的 sub-pixel 残像
- **Verification**: programmatic（Playwright 取 yAxis 标签文本数组 + 校验 sort）+ human-judgment（截图肉眼无乱码）
- **Notes**: 校验函数签名 `isMonotonicAscending(ticks[])`

### AC-2: 「今日: N 羽」终点标签不再遮挡 Y 轴标题（Bug #2 #7）
- **Given**: 三周期 × 三分辨率的 9 种组合
- **When**: 加载完成
- **Then**: 主图 endLabel 的 bbox `x2 ≤ (plotRight - 4px)`；endLabel 与 Y 轴标题 `存量（羽）`/`增长率（%）` bbox 交集为空；辅图柱顶今日标签与辅图 Y 轴标题 `数量` 不重叠
- **Verification**: programmatic（ECharts convertToPixel bbox 重叠面积=0 断言）

### AC-3: 今日数值与左轴刻度不矛盾（Bug #3）
- **Given**: 近 7 天 / 30 天 / 90 天
- **When**: 对比终点标签数值 vs 左轴最大刻度 vs `prefixSum(gene)[last]`
- **Then**: 三者满足：终点数值 = `v2Data[-1].geneStock`；左轴最大刻度 `≥ v2Data[-1].geneStock`；不出现 79 羽刻度区写 1721 羽这种跨 2+ 个数量级的矛盾
- **Verification**: programmatic（单测 deriveV2Data + DOM 取 endLabel value）

### AC-4: 图例统计面板 4 列对齐，绝不会滑入 SubChart 区域（Bug #4）
- **Given**: 三分辨率
- **When**: 默认渲染 + 每图例点一次
- **Then**: TrendLegend DOM 块的 `y1 ≥ SubChart.bbox.y2 + 12px`（外层 flex gap 16 保证）；统计面板 4 列文字不重叠；无任何图例项文本 left < SubChart.left 或 top > SubChart.top 视觉入侵
- **Verification**: human-judgment（截图）+ programmatic（getBoundingClientRect 断言）

### AC-5: 「今日」唯一数据源 — 消除二义性（Bug #5）
- **Given**: 任意一周期
- **When**: 提取主图 endLabel 数字 + 辅图 NFT 柱顶数字 + 辅图活跃柱顶数字 + Tooltip 今日行 + 洞察条 今日数字
- **Then**: 同一指标在 5 处完全相同（允许单位差异）；图例区不再渲染任何"今日 XX"字符串
- **Verification**: programmatic（Playwright 全 DOM 正则扫描：`今日` 匹配项数 = 主 1 + 辅 2 = 3；数值校验一致）

### AC-6: 90 天 X 轴标签不再麻花重叠（Bug #6）
- **Given**: 屏幕宽 = 1900（<1920 触发 compact 档）× 周期 = 90 天
- **When**: 渲染完毕
- **Then**: X 轴 visible 标签数 = ⌈90/xTickInterval(=2)⌉ = 45 个，但 ECharts `axisLabel.hideOverlap: true` 自动隐藏冲突后剩余 ≤ 23 个；任意两个 label bbox 不相交；旋转角度 -15°
- **Verification**: programmatic（ECharts `getModel().getComponent('xAxis')` 轴 label dump + O(n²) overlap 检测）+ human-judgment（截图）

### AC-7: 主图双 0 轴不重叠（Bug #8）
- **Given**: 周期中出现负环比（`geneRatePct < 0`）
- **When**: 渲染主图
- **Then**: `yAxis[0]` 的 0 线（存量基轴）位于绘图区**最底部** y=plotBottom；`yAxis[1]` 的 0 线（环比 0 分界）位于 plotHeight 中上部（对应 -50~100% 范围内）；两条 0 线 y 坐标差 ≥ 30px，不重合
- **Verification**: programmatic（ECharts convertToPixel({seriesIndex:0}, 0) vs convertToPixel({seriesIndex:1}, 0) 像素距离断言）

### AC-8: 辅图 人 / 个 维度识别（Bug #9）
- **Given**: 辅图默认渲染
- **When**: 查看 Tooltip 或 图例
- **Then**: NFT 系列所有数值后缀为 `{n} 个`；用户系列所有数值后缀为 `{n} 人`；图例色块+文字组合唯一对应一个维度
- **Verification**: programmatic（`series[0/1].tooltip.valueFormatter` 单测）

### AC-9: 安全留白不溢出（Bug #10）
- **Given**: 三分辨率 × 三周期 9 组合
- **When**: 全屏加载
- **Then**: 整卡 `document.querySelector('[title="数据趋势"]').closest('.ant-card')` 不出现横向滚动条；卡内所有子元素 bbox.x2 ≤ card.bbox.x2 - 2；最右元素（终点标签、dataZoom 右柄）距离右边界 ≥ 6px
- **Verification**: programmatic（Playwright card overflow = visible/scroll 断言 + scrollWidth == clientWidth）

### AC-10: 极值点颜色对应正确且渲染在顶层（Bug #11）
- **Given**: 7 天数据，geneDaily 数组 `[18,14,7,26,22,19,17]`
- **When**: 查看主图
- **Then**: 日期 index=3（26=峰值）处出现红色圆圈 markPoint；index=2（7=谷值）处绿色圆圈；它们的 z 层级高于 stock area 且高于 rate bar（视觉上被柱挡不住）
- **Verification**: programmatic（单测 extremes 计算）+ human-judgment（截图）

### AC-11: 严格对齐用户给的 ECharts option 结构
- **Given**: 对比 buildMainOption 返回对象 vs 用户 PRD 第三节-2 的 option 模板
- **When**: 字段逐一比对
- **Then**: 以下全部存在且值在 ±10% 容差内：tooltip trigger='axis' + axisPointer type='cross'；legend data 四元包含；grid left/right/top/bottom 相对值；xAxis category + boundaryGap=false；yAxis[0] name='存量（羽）' + min=0；yAxis[1] name='增长率（%）' + splitLine show=false；series[0] smooth + lineStyle color=#3B82F6 width=3 + areaStyle rgba(59,130,246,0.1)；series[1] bar + color=#10B981 + yAxisIndex=1
- **Verification**: programmatic（Jest `expect(option).toMatchObject(template)` 断言）

### AC-12: 三分辨率布局参数精确匹配
- **Given**: 三个 matchMedia 断点（2560 / 1920 / 1280）
- **When**: 触发各档位
- **Then**: 每个档位的 `containerHeight / grid margins / fontSize / xTickInterval / xLabelRotate / dataZoom` 与 FR-2 表完全一致，±0
- **Verification**: programmatic（useResolutionTier 单测）

### AC-13: Tooltip 环比与占比显示
- **Given**: 7 天数据 hover 最后一天
- **Then**: Tooltip 中显示"较昨日 ↓ 11.5%"和"占近7天总量 X.X%"；首天 hover 时显示"较昨日 —"
- **Verification**: programmatic（单测 formatter + Playwright screenshot）

### AC-14: CSV 口径一致（导出 6 列）
- **Given**: 7 天数据导出 CSV
- **Then**: 6 列 `日期,基因档案日增量,基因档案存量,日环比增长率(%),NFT日铸量,活跃用户数`；列 2 `sum = 列 3 [last] - 列 3 [first]`（若首日存量=首日日增）；列 4 首行空字符串；UTF-8 BOM 头 EFBBBF；Excel 打开中文无乱码
- **Verification**: programmatic（fs.readFileSync head === 0xEFBBBF + csv parser 断言）+ human-judgment（Excel/WPS 实开）

### AC-15: 类型零报错
- **Given**: `admin-web/` 根目录
- **When**: 运行 `tsc --noEmit`
- **Then**: 退出码 0；TrendChart 新实现文件零 `any`、零 `@ts-ignore`
- **Verification**: programmatic

### AC-16: 构建零告警
- **Given**: `admin-web/`
- **When**: 运行 `npm run build`
- **Then**: 退出码 0；Vite 告警 ≤ 2 项且均与 TrendChart 无关
- **Verification**: programmatic

### AC-17: 5 分钟压力测试无内存泄漏
- **Given**: 浏览器打开 Dashboard 停留 5 分钟
- **When**: 图例点 20 次 + 周期切换 10 次 + resize 快速 5 次
- **Then**: Performance 面板 JS heap 无线性上升（Δ heap ≤ 8MB）；无 `dispose()` 漏调用；ECharts 实例数恒为 2（主 1 辅 1）
- **Verification**: human-judgment（Chrome DevTools Performance trace 5min）

## Open Questions
- [ ] 用户 Q1/Q2/Q3 原始 PRD 中关于"大型赛事背景图标透出"的可扩展点标记，本次是否预留空事件槽（`onEventMarkClick` Props 可选）？→ **默认预留**，无需实现 UI
- [ ] 是否保留 `TrendLegend.tsx / TrendTooltip.tsx / useHoverIndex.ts` 空壳文件并标注 `@deprecated`？→ **默认删除**，减少维护面；如要保留需指出
- [ ] 导出 CSV 文件名日期格式 `YYYYMMDD` 还是 `YYYY-MM-DD`？→ **默认 YYYYMMDD**（Windows 文件名无短横线兼容性更好）
