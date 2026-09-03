# 数据趋势布局 V3（Cockpit 6:4 驾驶舱）- 实施计划 tasks.md

依赖：trendchart-echarts-rewrite 10 tasks 已完成（100% baseline 数据/ECharts/响应式层正确）。

任务总数：**8 任务**（T1 基线 → T8 终验）

---

## [ ] Task 1: 修复基线（基线构建 / 任何回归缺陷清零）
- **Priority**: high
- **Depends On**: 无（先验）
- **Description**:
  - 再次跑一次 admin-web `npm run type-check` 和 `npm run build`，确认趋势模块相关文件（TrendChart / echartsOptions / trend-data / useResolutionTier / trendChart.css）构建错误 0
  - 手动查 TrendChart.tsx 当前结构和 PRD 的对接口，确保 Props 接口仍是 6 字段（向后兼容）
  - 预写一个 10 行检查脚本 `verify_layout_baseline.cjs`，读 5 文件，保证字段 interface TrendChartProps = 6
- **Acceptance Criteria Addressed**: AC-11 / AC-12
- **Test Requirements**:
  - `programmatic` TR-1.1: tsc 0 error / build 0 trend warning
  - `programmatic` TR-1.2: Props fields = [data7,data30,data90,insights,prevTrendData7?,prevTrendData30?,prevTrendData90?] → 7 keys = 6 + 1 prev可选三；完全匹配 → PASS
  - `human-judgement` TR-1.3: Dashboard 截图默认数据未溢出（未改布局前的基线）
- **Notes**: 确保开始前 TrendLegendStatsPanel 还在（Task 3 要拆分它，不要提前干掉）

---

## [ ] Task 2: 拆用ResolutionTier V2（三档高度 + 左右栏比例 + 各块高度表）
- **Priority**: high
- **Depends On**: T1
- **Description**:
  - 在 `useResolutionTier.ts` 中新增 `LayoutV3` 导出：
    - `columns: { leftPct: 60, rightPct: 40, gap: 16 }`
    - `cardHeight: {2k:840, 1080p:700, compact:600}`（NFR-1 三档高）
    - `leftHeights: { mainRatio: 0.70, subRatio: 0.26, gapPx: 40/30/20 }` → 输出 `mainHeightPx, subHeightPx`
    - `rightHeights: { kpiCardH: 84/72/64, statsDrawerH: 260/220/180, insightH: 'auto' }`
    - `grid: { main: { top/right/bottom/left }, sub: { top/right/bottom/left } }`（去掉 legend.top 省 36px）
    - `titleBarH: 48`（Segmented+导出 独立）
    - `legendBarH: 40`（底部图例条）
  - 重写 `debounce` 保留；`matchMedia` 阈值保持 1441 / 1147（与 media query 同步）
- **Acceptance Criteria Addressed**: AC-1 / AC-4 / NFR-1
- **Test Requirements**:
  - `programmatic` TR-2.1: 三档 tier 下，`cardHeight` 与 PRD 表完全一致（===）
  - `programmatic` TR-2.2: `leftPct+rightPct = 100`；2K 档 main=520 / sub=180 / gap=40 总和 + titleBarH 48 + legendBarH 40 + padding = 840 → 误差 ≤ 2
  - `programmatic` TR-2.3: grid.main.right 相比旧值减小 14（Y 轴名移除）
- **Notes**: 不影响 useResolutionTier V1 旧返回（向后兼容），加新字段 LayoutV3，Task3 后再去 V1 字段可选

---

## [ ] Task 3: 重写 TrendChart.tsx 顶层布局（6:4 双栏驾驶舱）
- **Priority**: high
- **Depends On**: T2
- **Description**:
  - **HTML 结构改造（核心 1）**：原 `<outer-wrap flex:col overflow:hidden>` 改为三层：
    ```
    <TrendChart-root Card>
      <TitleBar />（Antd Card title=数据趋势 / extra=Segmented+导出，保持不变）
      <div className="TCC-body 2row">
        <div className="TCC-columns 6:4" style={gridTemplateColumns: 60% 40%, gap:16, minHeight: layout.cardHeight-96 (title+legend)}>
          <LeftColumn className="TCC-left">MainChart / SubChart 纵叠</LeftColumn>
          <RightColumn className="TCC-right">
            <TCC-kpi-grid>4×KpiCard（垂直堆叠）</TCC-kpi-grid>
            <TCC-stats-drawer collapsible>指标统计 竖表 4维度 × 3列（纵向排列不截断）</TCC-stats-drawer>
            <TCC-insight>洞察摘要（绿色块）</TCC-insight>
          </RightColumn>
        </div>
        <LegendBarBottom className="TCC-legend" />（4 项 ✓/✕ + tooltip/联动 ECharts highlight）
      </div>
    </TrendChart-root>
    ```
  - **画布去 legend（核心 2）**：传 `disableCanvasLegend=true` 新参数给 echartsOptions 的 buildMainOption / buildSubOption，内部 `legend.show=false`
  - **去除 3 处「今日」**（核心 3）：传 `disableTodayWord=true` 给两个 buildOption → 改 endLabel `{value} 羽`；辅柱 `{c}个 / {c}人`（Task 4 改 echartsOptions 实现，本任务只改参数传递）
  - 新增 3 个 memo 组件（文件内，不新建，避免跨文件 ref 复杂）：
    1. `KpiCard4`：4 卡垂直，每卡 title=今日存量 / 今日环比 / 今日 NFT / 今日活跃；大号数字 + 右小箭头环比 Δ（AC-5）；hover 时 className='is-highlighted' 高亮（AC-13）
    2. `LegendBarBottom`：4 项 一行，点击 toggle hiddenSeries，`✓/✕`，hover 时 ECharts dispatchAction highlight
    3. `StatsDrawerVertical`：4 维度 × 3 列，纵向 4 行 × 每行 3 格（总计/日均/峰值），rate 总计 = `—`，顶部有折叠按钮▼▲
  - 保留原 hiddenSeries 顶层 Set 管理、range 切换重置、resize debounce、crosshair mousemove 同步 （不破坏）
  - 同步改外层高度 = `layoutV3.cardHeight`，`overflow-x:hidden; overflow-y:auto`（NFR-1 AC-4）
- **Acceptance Criteria Addressed**: AC-1 / AC-3 / AC-4 / AC-5 / AC-7 / AC-13 / G2 G3
- **Test Requirements**:
  - `programmatic` TR-3.1: 90d compact 档 outer.scrollHeight - outer.clientHeight ≤ 2（AC-4）
  - `programmatic` TR-3.2: /今日/g 总数 = 4（KpiCard4 标题共 4 次 "今日"）；左栏 TCC-left 内 innerText.match(/今日/g) = null（AC-3）
  - `programmatic` TR-3.3: 左栏宽度 / 右栏宽度 = 1.5 ± 0.04（60/40 比例）→ PASS
  - `human-judgement` TR-3.4: 视觉上左 Canvas 面积 ≥ 72%（肉眼对照对比面板）
- **Notes**: 本任务把"布局搭起来"，Canvas option/内部 12 个遮挡由 Task 4 / Task 5 具体修，不要越界

---

## [ ] Task 4: echartsOptions 增强（去内置 legend + 去 3 处今日 + 双 Y 轴外置 title + markPoint 气泡）
- **Priority**: high
- **Depends On**: T3
- **Description**:
  - 给 buildMainOption / buildSubOption args 新增：
    ```
    disableCanvasLegend?: boolean;
    disableTodayWord?: boolean; // 对应 FR-2
    mainGridTitle?: { left: string; right: string } | null; // 默认不再渲染 yAxis[0/1].name，改为左上角 DOM title（此任务只给 option，DOM 层 T3 已写 TCC-mainTitles）
    markPointBubbleOffsetPx?: number; // 默认 18（AC-14）
    ```
  - 改 `buildMainOption.legend.show = !disableCanvasLegend`（false → legend 全隐藏，grid.top 省 36px）
  - 改 buildSubOption.legend.show = false 同理
  - 改 `endLabel.formatter` 主图：`${Number(p.value).toLocaleString('zh-CN')} 羽`（无今日词）
  - 改辅图 NFT / 用户柱最后一柱 label：`{value}个` / `{value}人`（无今日词）
  - yAxis 名字调整：
    - `yAxis[0].name = ''`（不重复了，由左栏 DOM 顶部一行 TCC-mainTitles：「左 Y：存量（羽） ·  右 Y：日增环比（%）」展示 → 省 18px）
    - `yAxis[1].name = ''`（同理）
  - markPoint 新增 `symbolOffset: [0, -markPointBubbleOffsetPx]` 让气泡浮在柱顶上方 18px，label 不撞 line（AC-14）
- **Acceptance Criteria Addressed**: AC-2 / AC-3 / AC-14 / 12 bug 清 5 条（#2 #5 #7 #8 #10 ）
- **Test Requirements**:
  - `programmatic` TR-4.1: `legend.show = false` 主 + 辅；`grid.main.top` < 原 grid.main.top（验证节省 ≥ 24px）
  - `programmatic` TR-4.2: option 中 `今日` 字面值 0 条（grep 整个 option 对象字符串）
  - `programmatic` TR-4.3: markPoint symbolOffset y ≤ -18px
  - `programmatic` TR-4.4: `yAxis[0].name + yAxis[1].name` = '' → 省掉 4 字空间
  - `human-judgement` TR-4.5: 主图终点大数字 + 左 Y label「N 羽」无相撞
- **Notes**: markPoint 不要用 label 位置 inside，会与柱 line 叠；必须 symbolOffset + label position:'top'

---

## [ ] Task 5: trendChart.css V2 完整翻写（三档 6:4 驾驶舱令牌）
- **Priority**: medium
- **Depends On**: T3
- **Description**:
  - 重写 `trendChart.css` 83 行 → **160 行左右**（保留原有 tokens，新增 TCC-*）：
    - 新增：`.TCC-body { display: grid; grid-template-rows: 1fr auto; }`
    - 新增：`.TCC-columns { display: grid; grid-template-columns: 60% 40%; gap: 16px; }` + compact 档 1080p 时 58%/42%（少挤）
    - 新增：`.TCC-left { display: flex; flex-direction: column; gap: layout.gap px（通过 var 变量注入或者直接 30/20/40）; min-height:0 }`
    - 新增：`.TCC-kpi-grid { display: grid; grid-auto-rows: auto; gap: 12px; }` 每张 KPI
    - 新增：`.TCC-kpi-card { background: var(--surface); border:1px solid var(--border); border-radius: 8px; padding:12px; display:flex; flex-direction:column; justify-content:space-between }`
    - 新增：`.TCC-kpi-title { color: var(--text-muted); font-size: 12px }`
    - 新增：`.TCC-kpi-value { font-size: 22px; font-weight: 800; color: var(--text) }`
    - 新增：`.TCC-kpi-card.is-highlighted { background: rgba(22,119,255,0.06); border-color: rgba(22,119,255,0.3) }`（AC-13）
    - 新增：`.TCC-legend { display: flex; gap: 24px; padding: 8px 0 4px; flex-wrap: wrap; border-top:1px solid var(--border) }`
    - 新增：`@media min-width 1441px` 下 KPI 字号 24，紧凑档 20（base）
    - 保留原 `:root` 8 个 tokens + Insight 绿色块类 + TrendChart-root 圆角 / overflow（已改 y 为 auto）
  - 用 CSS 变量注入方式：`--tcc-card-h: 840px / 700px / 600px`；`--tcc-mainH` 等 6 个，方便 Task 3 inline style 只传最少
- **Acceptance Criteria Addressed**: FR-1/5/6 / NFR-1 三档自适应
- **Test Requirements**:
  - `programmatic` TR-5.1: `TCC-columns` width ratio 60/40（getComputedStyle.gridTemplateColumns 解析为「Xfr Yfr」→ X/Y=1.5）
  - `programmatic` TR-5.2: 三档字号：2K KPI-value 24px / 1080p 22 / compact 20
  - `human-judgement` TR-5.3: 4 张 KPI 卡片水平对齐、数字大号易读；绿 Insight 不挤
- **Notes**: 不要改现有 .TrendLegendStatsPanel 类（Task 6 会删除它们，避免误删其他页面引用；先留）

---

## [ ] Task 6: 清理回归（移除旧 4×3 横表 / 重叠隐患 / any 残留 + dataZoom 空间）
- **Priority**: medium
- **Depends On**: T4, T5
- **Description**:
  - 移除 TrendChart.tsx 内 `TrendLegendStatsPanel` 4×3 横表（旧版本网格，因为 T3 新增了 `StatsDrawerVertical` 竖表），避免两处 legend/两处 stats
  - 删除 trendChart.css 中 13 类中以 `.TrendLegendStatsPanel` 开头的规则（7 条左右），防止冲突
  - 改外层 TrendChart-outer-wrap `justify-content: space-between`（原规则已不需要，T3 用 grid 了），保留但改为 align-items
  - 改 dataZoom 2K 90d：grid.main.bottom += 26（Task 7 checklist J3 需要出现在主图底部，没地方时）
  - 检查 any / @ts-ignore / 未使用变量
- **Acceptance Criteria Addressed**: AC-2 / AC-11 / NFR-2
- **Test Requirements**:
  - `programmatic` TR-6.1: TrendChart.tsx + echartsOptions.ts grep TrendLegendStatsPanel-grid → 0 条
  - `programmatic` TR-6.2: grep any / @ts-ignore 计数 = 0（5 指定文件）
  - `programmatic` TR-6.3: 90d 2K buildMainOption grid.main.bottom = 原底部 + 26
- **Notes**: 若 buildSourcemap 仍出现 MainChart/SubChart（SVG），要在 Dashboard 检查是否引用；之前 tree-shake 了应该没有

---

## [ ] Task 7: 构建压力（Typecheck/Build/Smoke）+ 108 Assertions（Checklist J 模块 9res×3range×12 bug）
- **Priority**: high
- **Depends On**: T6
- **Description**:
  - 重跑 `npm run type-check`；`npm run build`；`node smoke-press.cjs`（保留上次通过的脚本，增加 10 次 range 切换 + 40 次 legend 切换）
  - 写 `verify_layout_v3.cjs` 或 Python 脚本（哪个有 Playwright / 浏览器可用用哪个）：
    - 9 组合视口（2560×1440,1920×1200,1920×1080）× 3 range（week7/30/90）= 27？ 不 PRD 里要求 108 = 9×12 Bug；所以：
      1. 每 9 组合截图 2 张（全页 + 数据趋势卡）→ 18 张
      2. 每次对 12 个碰撞点做 getBoundingClientRect 差检查：
         - B1 主图终点值 vs 右 Y 轴标题 DOM rect → diff ≥ 10px
         - B2 峰值 markPoint vs 最近柱顶 rect diff ≥ 14px
         - B3 底部 Legend 任何文字 vs 辅图柱 rect diff ≥ 8px
         - B4 4 KPI 卡 vs TCC-insight 绿色块 diff ≥ 8px
         - B5 StatsDrawerVertical 第 4 行文字（峰值日期） vs Insight 顶部 rect diff ≥ 6px
         - B6-B12: 其他 Checklist A/B/C/D 模块对应点（不一一写，由断言表驱动）
- **Acceptance Criteria Addressed**: AC-9 / AC-10 / AC-11 / NFR-2
- **Test Requirements**:
  - `programmatic` TR-7.1: typecheck 0, build 0 trend warnings, smoke Δ heap ≤ 0（上次 -0.44，这次应 ≤ 1MB）
  - `programmatic` TR-7.2: 9 × 12 = 108 碰撞断言 → **0 FAIL**（不允许 1 处漏）
  - `programmatic` TR-7.3: 切换周期 10 次平均 ≤ 200ms（performance mark）→ PASS
- **Notes**: 如果本机没 Playwright，把这 108 断言拆为 JS DOM 脚本来做 rect 碰撞（browser_use 环境内执行 9 次遍历 + 12 check per loop），不要等 Playwright

---

## [ ] Task 8: 用户交付 + 签字 Checklist J16（截图对比页 + 文档）
- **Priority**: medium
- **Depends On**: T7
- **Description**:
  - 生成 9×2 截图对比 HTML：index.html 放 screenshots 目录，三栏：分辨率 × 周期 ×「旧版 vs 新版」卡片，4 列表格
  - 把规格 spec.md / tasks.md / checklist.md 的 3 文档路径 + 变更文件清单 + 回滚指南写入交付说明（用户文本看就行）
  - Checklist J1-J15 全部代码/实机核对后标 [x]；J16 用户签字确认保留 [ ] 给用户
  - 若用户 24h 内没有反馈 → 默认签字（按约定）
- **Acceptance Criteria Addressed**: 全 AC 双证
- **Test Requirements**:
  - `programmatic` TR-8.1: Checklist 中除 J16 外 96 项全 [x]
  - `human-judgement` TR-8.2: 对比 9 组合旧新截图无"麻花/遮挡/重叠/溢出"
- **Notes**: 交付后自动结束本轮 todo；如用户要求回滚，提供一个回滚 commit 范围

