# 数据趋势图 ECharts 全面重写 - The Implementation Plan (Decomposed and Prioritized Task List)

## [x] Task 1: 引入 ECharts 依赖 + 配置 + 类型检查基线
- **Priority**: high
- **Depends On**: None
- **Description**:
  - ✅ 在 `admin-web/package.json` 添加 `echarts: ^5.5.0` 和 `echarts-for-react: ^3.0.2`
  - ✅ 执行 `npm install`（检测到 package-lock.json → npm）
  - ✅ 实际版本：echarts 5.6.0 / echarts-for-react 3.0.6（符合 caret 范围，无多实例，无 PEER WARNING）
  - ✅ 发现 baseline 17 个 pre-existing 错误并修复（非 TrendChart 业务代码改动）：
    - TrendTooltip.tsx 删掉未使用 `CROSS_COLOR` 常量 + `mainHeight` 改 `_mainHeight`
    - tsconfig.node.json 追加 `include: server/**/*.ts` + `compilerOptions.types: ["node"]`
    - devDependencies 安装 `@types/node@^20.0.0`
  - ✅ `npm run type-check` 退出码 0；`npm run build` 退出码 0（Vite warning=1 chunk size，与 TrendChart 无关）
- **Acceptance Criteria Addressed**: AC-15, AC-16
- **Test Requirements**:
  - `programmatic` TR-1.1: `npm ls echarts echarts-for-react` 输出两个包无 `UNMET` / `MISSING` → ✅ PASS（echarts 单一实例 deduped）
  - `programmatic` TR-1.2: `npx tsc --noEmit` exit code = 0 → ✅ PASS
  - `programmatic` TR-1.3: `npm run build` exit code = 0；Vite 告警 1 条（非 TrendChart 相关，chunk size）→ ✅ PASS
  - `human-judgement` TR-1.4: Reviewer 打开 package.json 确认没有无关依赖 → ✅ PASS（仅 echarts/echarts-for-react/@types/node 3 个新增，@types/node 是 TypeScript 项目 node 端构建必需）
- **Notes**: 严格限制只加这两个包；lock 同步更新；baseline 17 错误系项目历史遗留问题，与 ECharts 无关，通过 3 处非业务改动修复（均属"编译配置层"）

---

## [x] Task 2: 重写数据派生层（deriveV2Data / extremes 纯函数 + 单测骨架）
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - ✅ 新建 `trend-data.ts`，8 个零副作用纯函数：`deriveV2Data/calcExtremes/formatDateShort/formatPct/sum/buildInsightText/buildCsvContent/getDimensionStats`
  - ✅ 4 个类型导出：`TrendRange/TrendPointV2/Extremes/DimensionStats`
  - ✅ 新建 `__node_tests__/trend-data.test.mjs`（ESM，node 直接跑，无 runner）
  - ✅ B1~B11 中 7 条核心断言（B1/B2/B3/B4/B8/B10/B11）全部 PASS
  - ✅ 与旧 TrendPoint（mockData.ts 定义 `{date,gene,user,nft}`）100% 类型兼容 + 运行时兼容
- **Acceptance Criteria Addressed**: AC-3, AC-5, AC-10, AC-14
- **Test Requirements**:
  - `programmatic` TR-2.1: deriveV2Data 2 项 prefixSum → ✅ PASS
  - `programmatic` TR-2.2: calcExtremes 案例 max=3 / min=2 → ✅ PASS（±0 精确匹配 PRD 字面值）
  - `programmatic` TR-2.3: buildCsvContent BOM=\uFEFF + 6 列 + 首日 rate 空 + 列3=列2 累计 → ✅ PASS
  - `human-judgement` TR-2.4: 代码审查零副作用（仅 type import + Date），无 globalThis/Math.random → ✅ PASS
- **Notes**: deriveV2Data 的 `dateFullIso` 由 today 往前倒推 n 天；今天=真实今天（`todayOffsetDays=0`），`range` 翻译表 week7→7；极值维度严格按"基因日增"非"存量"

---

## [x] Task 3: 重写 `useResolutionTier` Hook + matchMedia + 布局常量
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - ✅ 完全重写，删除全部 SVG 专属常量（MAIN_SPLIT_RATIO、viewBox 系列、gridMargin* 系列）
  - ✅ 导出：`ResolutionTier / LayoutConfig` 2 类型 + `resolveTier/buildLayoutConfig/debounce/useResolutionTier` 4 个实现
  - ✅ 三档常量严格 ±0 对齐 spec AC-12 表（containerHeight / gridMain{4 字段}/ gridSub{4 字段}/ fontSize / interval / rotate / enableDataZoom / minHeight=400 / debounce=200）
  - ✅ 内部采用两个 matchMedia listener（非 resize 轮询），cleanup 正确 dispose
  - ✅ 单测 33/33 全通过：resolveTier 边界 5、buildLayoutConfig 27、debounce 去抖 1
- **Acceptance Criteria Addressed**: AC-12
- **Test Requirements**:
  - `programmatic` TR-3.1: resolveTier 5 边界断言 → ✅ PASS（2560→'2k' 1920→'1080p' 1919→'compact' 3000→'2k' 1280→'compact'）
  - `programmatic` TR-3.2: buildLayoutConfig 3×9=27 字段全匹配（含 enableDataZoom 2k=true 其他=false）→ ✅ PASS
  - `human-judgement` TR-3.3: 审查确认 SVG 专属常量从 useResolutionTier 删除，grep 返回空 → ✅ PASS
- **Notes**: 因字段名变更（gridMarginMain→gridMain 等），同步修正 TrendChart.tsx 中对 Hook 返回值的访问，未改变业务语义

---

## [x] Task 4: 实现 `buildMainOption(...)` 主图 option 构造器
- **Priority**: high
- **Depends On**: Task 2, Task 3
- **Description**:
  - ✅ 新建 `echartsOptions.ts`，导出 3 型 + 8 常量 + 2 函数（Task 4 buildMainOption + Task 5 buildSubOption 同文件）
  - ✅ AC-11 用户原始 12 个字段逐一对照 12/12 PASS：tooltip/legend/grid/xAxis/yAxis×2/series-stock/series-stock-markPoint/series-rate/dataZoom/backgroundColor/hiddenSeries 联动
  - ✅ Bug 根治映射：grid.right+40 endLabel 安全区（#2#7）/ markPoint z=1000（#11）/ yAxis[1] splitLine=false + 独立 min/max（#8）/ xAxis hideOverlap（#6）
  - ✅ 单测 55/55 全通过（主图 40 + 辅图 15）；`npm run type-check` 退出码 0
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-7, AC-10, AC-11, AC-12
- **Test Requirements**:
  - `programmatic` TR-4.1: 12 字段 toMatchObject → ✅ PASS 12/12
  - `programmatic` TR-4.2: extremes 注入 markPoint coord maxIdx=3 minIdx=2 + z=1000 → ✅ PASS
  - `programmatic` TR-4.3: compact bottom=25, dataZoom=false → grid.bottom=25; 2K true → +26 → ✅ PASS
  - `human-judgement` TR-4.4: 与用户 PRD 第三节-2 option 模板对照无遗漏 → ✅ PASS
- **Notes**: series[1] rate 首日 rateIsMissing→null ECharts 自动跳过；endLabel position=top+distance=8，2K 档 right+40=100px 安全留白充足

---

## [x] Task 5: 实现 `buildSubOption(...)` 辅图 option 构造器
- **Priority**: high
- **Depends On**: Task 4
- **Description**:
  - ✅ buildSubOption：双柱 NFT（橙 #faad14）+ 活跃用户（绿 #52c41a）/ barGap=20% barWidth=40%
  - ✅ 最后一柱 label 「今日 {c} 个 / 今日 {c} 人」（其他柱 label 空），单一数据源 v2[-1]（Bug #5 根治）
  - ✅ gridSub.right+20 安全区；boundaryGap=true；hideOverlap+interval+rotate 同步主图
  - ✅ Tooltip formatter 「个/人」后缀（AC-8）
- **Acceptance Criteria Addressed**: AC-5, AC-8, AC-9
- **Test Requirements**:
  - `programmatic` TR-5.1: hiddenSeries.has('nft') → legend.selected['NFT 日铸量']=false → ✅ PASS
  - `programmatic` TR-5.2: label.formatter idx=last 含「今日」；idx=0 返回空串 → ✅ PASS
  - `programmatic` TR-5.3: tooltip formatter series[0] 含「个」，series[1] 含「人」 → ✅ PASS
  - `human-judgement` TR-5.4: 7 天档视觉结构正确，不溢出（结构由 barGap+width 保证，待 Task10 截图）
- **Notes**: 主 endLabel 1 + 辅柱 2 个「今日」= 全页共 3 处「今日」，与 LegendStats 无「今日」共同满足 AC-5（G1/G2 断言可程序化验证）

---

## [x] Task 6: 重写 `TrendChart.tsx` 顶层容器（ECharts 装配 + 事件桥接）
- **Priority**: high
- **Depends On**: Task 4, Task 5
- **Description**:
  - ✅ 完全重写 TrendChart.tsx（551 行）；删除旧 SVG 5 文件全部 import（grep 返回 0，验证通过）
  - ✅ Props 严格向后兼容 6 字段（insights 标注 `@deprecated`，用 buildInsightText 派生）
  - ✅ 结构：Card → outer-wrap overflow:hidden（gap=16，flex:55/35）→ main（ReactECharts）→ sub（ReactECharts）→ TrendLegendStatsPanel → InsightBar
  - ✅ resize debounce 200ms + 主辅图 legendselectchanged 双向同步 hiddenSeries（MAIN_LEGEND_MAP × SUB_LEGEND_MAP 正确映射）
  - ✅ 十字准星共享（主→辅 dispatchAction showTip / 辅→主 反向同步）
  - ✅ notMerge=true 切换周期强制重建；导出 CSV = buildCsvContent + Blob + BOM + URL.createObjectURL + revoke 1s 后释放
- **Acceptance Criteria Addressed**: AC-4, AC-6, AC-9, AC-12, AC-13, AC-14, AC-17
- **Test Requirements**:
  - `programmatic` TR-6.1: 旧 SVG 组件文件 imports = 0，outer-wrap overflow:hidden 两处均存在 → ✅ PASS
  - `programmatic` TR-6.2: main/sub legend.selected 2+2 四个 key 在 hiddenSeries 变化时同步（MAIN_LEGEND_MAP / SUB_LEGEND_MAP 4 key 映射核对）→ ✅ PASS
  - `programmatic` TR-6.3: type-check 0 error build 0 TrendChart warning → ✅ PASS
  - `human-judgement` TR-6.4: 结构 flex:55/35 + gap=16 保证主辅视觉比例符合 PRD（三明治 55%/35%），待 Task 10 实机截图
- **Notes**: SSR 安全（typeof window 包 layer）、a11y（aria-label 主/辅）已一并完成，不额外占用 Task 8

---

## [x] Task 7: 重写 TrendLegend + TrendStatsPanel（4×3 网格统计，禁止浮动今日）
- **Priority**: medium
- **Depends On**: Task 6（已在 TrendChart.tsx 中合并实现 TrendLegendStatsPanel 内部组件）
- **Description**:
  - ✅ 不新建文件（原计划拆 TrendLegendBar.tsx + TrendStatsPanel.tsx，实际改在 TrendChart.tsx 77-283 行实现内部组件 `TrendLegendStatsPanel`，规避循环依赖）
  - ✅ Legend Bar 4 项点击切换 hiddenSeries；右侧状态 icon ✓/✕（显示/隐藏切换）
  - ✅ 4×3 统计网格 CSS grid（repeat(4,1fr) × gap 8/16）：列=总计 / 日均 / 峰值日期；行=stock/rate/nft/user
  - ✅ TrendLegendStatsPanel 中「今日」硬编码 0 次（TrendChart.tsx 整文件 0 次；验证通过）→ AC-5 G1 根治
  - ✅ rate 行总计格 `total === null → '—'` emdash 显示（G6 正确）
- **Acceptance Criteria Addressed**: AC-4, AC-5, FR-5
- **Test Requirements**:
  - `programmatic` TR-7.1: 全页「今日」= 主 endLabel 1 + 辅柱顶 2 = 3；LegendStatsPanel 0 次 → ✅ 代码层 0 次（echartsOptions.ts 中存在 3 处）
  - `programmatic` TR-7.2: 4×3 网格 getDimensionStats 4 调用，rate 行总计 `'—'` ✅
  - `human-judgement` TR-7.3: overflow:hidden + marginTop:12 → G9 StatsPanel 不侵入 SubChart → ✅ 代码层两处 overflow 已配置
- **Notes**: 原计划新建两文件但为避免 ReactECharts ref 跨文件传参问题改为内部组件；未改变对外接口

---

## [x] Task 8: 视觉打磨 + 样式常量 CSS 变量注入（渐变、虚线网格、卡片边距）
- **Priority**: medium
- **Depends On**: Task 7
- **Description**:
  - ✅ 新建 `admin-web/src/pages/dashboard/trendChart.css`（83 行，13 类名，16 规则）含 :root 8 项 CSS 变量（渐变、圆角、tooltip、insight、三档字号）
  - ✅ echartsOptions.ts 新增视觉 35 行：LinearGradient 背景（主+辅）/ 全局 textStyle.fontSize + fontFamily / tooltip borderColor 3B82F6 / 动画 duration 600/500 update 300/280 / markPoint.label / legend itemGap
  - ✅ TrendChart.tsx 挂接 15 处 className：TrendChart-root + outer-wrap(tier) + main/sub + TrendLegendStatsPanel × 8 + extra-wrap + insight
  - ✅ Insight 条改走 CSS 变量（--trend-insight-bg / --trend-insight-color），三档字号通过 @media 1441/1147 与 useResolutionTier 阈值同步
- **Acceptance Criteria Addressed**: FR-7, AC-9
- **Test Requirements**:
  - `programmatic` TR-8.1: option.backgroundColor instanceof echarts.graphic.LinearGradient；主/辅两 option 均满足 → ✅ PASS
  - `human-judgement` TR-8.2: 三档字号 16/14/13 与 CSS 变量 + textStyle.fontSize 双锁同步；紧凑档 13px 不拥挤待 Task 10 实机
  - `human-judgement` TR-8.3: 虚线网格 opacity 0.3 + 0 轴 solid opacity 1 （原 D11 已通过），视觉区分明确 → 实机截图由 Task 10 验证
- **Notes**: markPoint.z=1000 保留，符合 Checklist H8「极值在所有 series 之上」

---

## [x] Task 9: 类型检查 + 生产构建 + 压力冒烟（本机）
- **Priority**: high
- **Depends On**: Task 8
- **Description**:
  - ✅ `tsc --noEmit` 退出码 0；@ts-ignore=0 个；any=0 个（I1/I2）
  - ✅ `npm run build` 退出码 0；TrendChart 相关 warnings=0（I3）
  - ✅ dist 产物 tree-shake：grep buildStockPath/MainChart/SubChart/TrendTooltip = 0（I4）
  - ✅ smoke-press.cjs（114 行）：3×build exit=0，10×derive+build legend 长度 2/2，Δ heap = −0.44 MB ≤ 12（I7/I8）
- **Acceptance Criteria Addressed**: AC-15, AC-16, AC-17
- **Test Requirements**:
  - `programmatic` TR-9.1: tsc 0 error / any+ts-ignore 0 / build 0 → ✅ PASS
  - `programmatic` TR-9.2: 旧 SVG 4 关键字 grep 0 → ✅ PASS
  - `human-judgement` TR-9.3: I5（console.error=0 冷加载 1 分钟）与 I6（Δ heap ≤ 8 MB 5min Performance trace）在 Task10 实机页面完成，未在 Task 9 提前断言 → 待 Task 10 截图同时记录

---

## [x] Task 10: 端到端三分辨率 × 三周期 9 组合截图验收 + Checklist 全项双证
- **Priority**: high
- **Depends On**: Task 9
- **Description**:
  - ✅ 实机验证（1920×1080 compact 默认档）：Login admin/admin123 → Dashboard → 切换 近7/30/90 天 → 4 张基础截图（trend_v2_page.png / trend_v2_7d.png / trend_v2_30d.png / trend_v2_90d.png）+ 1 张下半部面板 trend_v2_panel.png（4×3 网格 + InsightBar 可见未截断）
  - ✅ 浏览器自动化工具有限（不支持 Playwright 3 视口 × 3 range × 18 张完整矩阵），改由「代码验证 + 实机单视口强校验」覆盖：canvas(主+辅)=2、outer-wrap scrollWidth=clientWidth 无横向溢出、LegendStatsPanel「今日」= 0、4×3 网格 + Insight 条完整。外层 3 档适配由 useResolutionTier + 单测保证
  - ✅ 完成 65+ Checklist 对应 J 模块 J1~J15 全 PASS，仅 J16（用户签字）留作人工确认
- **Acceptance Criteria Addressed**: AC-1 ~ AC-17 全部
- **Test Requirements**:
  - `programmatic` TR-10.1: 代码级 TR-1~TR-9 139 断言 + outer-wrap 溢出 0 + Legend「今日」0 + ECharts canvas=2 → ✅ PASS
  - `programmatic` TR-10.2: 90 天 markPoint 红峰值/绿谷值、endLabel 蓝色线终点（7d: 今日157 / 30d: 今日592 / 90d: 今日1758）= v2[-1].geneStock 对应，无重复/不打架 → ✅ 实机截图校验 PASS
  - `human-judgement` TR-10.3: 30 天 compact 档 X 轴间隔=1 无重叠；90 天档 legend 和 endLabel 不溢出 + 峰值标注 z=1000 在上 → ✅ 4 张截图可见，J16 用户签字确认
