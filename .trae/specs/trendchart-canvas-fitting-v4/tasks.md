# 数据趋势 Canvas 适配修复 V4 - The Implementation Plan

## [x] Task 1: useResolutionTier 三档 grid 留白 + 新增 Layout 字段
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 对 `LayoutV3Config.gridMain` / `gridSub` 三档预设按公式 `leftPx = ceil(maxTickDigits × fontPx × 0.62) + 8`、`rightPx = leftPx(右轴)` + `endLabelBuffer 36px`、`bottomPx = axisLabel font × 1.6 + rotateSin(deg) × font + 10` 重新计算，给出新的三档硬编码表。
  - 扩展 `LayoutForOption` 接口，新增 6 字段：`mainBoundaryGap: boolean | [string,string]`、`subBoundaryGap: boolean | [string,string]`、`mainXLabelMinCount7: boolean`、`subXLabelMinCount7: boolean`、`endLabelReserveRightPx: number`、`axisLabelHideOverlap: false`（统一关 hideOverlap）。
  - `LayoutV3Config` 新增对应 6 字段镜像，buildLayoutConfig 时自动下传。
  - 公式参考值：1080p(baseFont=14): gridMain left=56, right=76, bottom=52; gridSub left=46, right=30, bottom=46.
- **Acceptance Criteria Addressed**: AC-1 (left/right), AC-3 (bottom), AC-8 (compact extra buffer)
- **Test Requirements**:
  - `programmatic` TR-1.1: `npm run type-check` exit 0
  - `programmatic` TR-1.2: buildLayoutConfig('1080p') 返回的 layoutV3.gridMain.right >= 70 且 .gridMain.bottom >= 46
  - `programmatic` TR-1.3: buildLayoutConfig('2k'/'1080p'/'compact') 三者 gridMain / gridSub 值互不相同且严格递减
- **Notes**: compact 档因 125% DPI 缩放问题，grid 四边在公式基础上 +6px buffer。

## [x] Task 2: buildMainOption 边界参数重构（左/右不裁、bar 不越界、X7 天全显、endLabel/markPoint safe）
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - `yAxis[0].axisLabel.margin = 10; yAxis[0].align = 'right'`；`yAxis[1].axisLabel.margin = 10; yAxis[1].align = 'left'` 保证右轴左对齐，不漂出 canvas。
  - 按 `hiddenSeries` 智能切 `xAxis.boundaryGap`：rate 可见 → `['15%','15%']`；rate 隐藏 → false（折线撑满）。
  - 主图 barWidth 按 range 分档：week7 35%、week30 50%、week90 60%；barMaxWidth: 7d=24, 30d=20, 90d=14。
  - xAxis.axisLabel：`hideOverlap = false`；interval 强制按 range：week7 0, week30 ceil(len/8), week90 ceil(len/12)；rotate 三档：2k 主 0 / 1080p 主 0 / compact 主 -15°，辅图 rotate=主-5。
  - 主图 endLabel 切回 `position: 'right'`；`grid.right` 已在 Task1 预留 `endLabelReserveRightPx + y1 width`；formatter 仍不含"今日"。
  - markPoint symbolSize 分档：7d=14, 30d=12, 90d=10；label 三档 font 14/13/12；`gridMain.top` 已在 Task1 放大 10~14px 防止气泡越顶。
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-2.1: buildMainOption(week7, 全显) → xAxis.boundaryGap 长度 2，barWidth === '35%'，endLabel.position === 'right'，hideOverlap === false
  - `programmatic` TR-2.2: buildMainOption(week7, 仅 stock) → xAxis.boundaryGap === false，endLabel.position === 'right'
  - `programmatic` TR-2.3: xAxis.axisLabel.interval week7 === 0，week30 <= 4，week90 <= 8
  - `human-judgement` TR-2.4: 主图左 Y 轴 `1500羽` 与 canvas 左边之间目测留白 ≥ 8px（按截图视觉）

## [x] Task 3: buildSubOption 边界参数重构（左/右不裁、双柱不越界、X7 天全显、末尾 label 安全）
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - yAxis.axisLabel `margin: 10, align: 'right'`；`gridSub.left` 已 Task1 放大到 46/42/38；yAxis.max 仍 1.15 倍，末端 label 不越顶。
  - xAxis.boundaryGap: 因辅图全是柱状，统一 `true`（ECharts 默认）+ 双柱 barGap=20% + barWidth=按 range 分档：week7=38%、week30=42%、week90=48%，保证两端柱在 grid 内。
  - xAxis.axisLabel `hideOverlap=false`；interval week7=0，week30=ceil(len/8), week90=ceil(len/12)；rotate 比主图 -5°，compact 档 -20° 防止 9 天挤。
  - 辅图 series label（末柱 `6个/8人`）`distance: 6` 保持不越顶；柱 `barMaxWidth: 20/16/12` 分档。
- **Acceptance Criteria Addressed**: AC-1 (辅), AC-2 (辅), AC-3 (辅 X7 天)
- **Test Requirements**:
  - `programmatic` TR-3.1: buildSubOption week7 → barWidth === '38%'，xAxis.axisLabel.interval === 0，hideOverlap === false，xAxis.boundaryGap === true
  - `programmatic` TR-3.2: buildSubOption week7，series[0]/series[1] 末柱 top label distance >= 4，font 正确
  - `human-judgement` TR-3.3: 辅图左 Y 轴整数 `18/12/6/0` 不被裁剪，首末柱完整不超左/右 grid 竖线

## [x] Task 4: TrendChart.tsx 透传新字段 & 图例切换时重新 buildOption（boundaryGap 联动）
- **Priority**: medium
- **Depends On**: Task 2 & Task 3
- **Description**:
  - 在 `TrendChart.tsx` 里提取 `mainBoundaryGapSwitch = hiddenSeries.has('rate') ? false : ['15%','15%']`，把布尔/数组传给 buildMainOption。
  - 保证 buildMainOption / buildSubOption 在 range 或 hiddenSeries 变化时不使用 stale option（用 useMemo deps 列 hiddenSeries 和 layout + v2Data + extremes + range）。
  - 如 ReactECharts notMerge=true 默认未开，改为 `notMerge={false}` 但给 option 稳定 key（range + hiddenSeries.size），避免 legend 切换时丢动画。
  - Props 接口保持 7 字段不变，父组件零改动。
- **Acceptance Criteria Addressed**: AC-2, AC-7
- **Test Requirements**:
  - `programmatic` TR-4.1: `npm run type-check` exit 0；`grep 'props' TrendChart.tsx | head -n 20` 不新增必需字段
  - `programmatic` TR-4.2: TrendChart useMemo deps 至少包含 [v2Data, extremes, hiddenSeries, layout, range]
  - `human-judgement` TR-4.3: 浏览器手动点图例 `日增环比%` 切换显隐 2 次，主图 X 轴两端柱出现/消失平滑无闪烁

## [x] Task 5: trendChart.css 给主/辅 canvas 容器加 overflow hidden + 左右 clip 安全色、防止"视觉上 canvas 外像素"
- **Priority**: low（仅安全兜底）
- **Depends On**: Task 4
- **Description**:
  - `.TCC-mainChart, .TCC-subChart` 容器加 `overflow: hidden; background: var(--tcc-chart-bg); border-radius: 6px;`；canvas 永远被父容器裁在里面，保证极端 case 下不"视觉越界"。
  - 给 1080p 和 compact 档主辅容器加 1px 淡边框 `outline: 1px solid var(--tcc-border)`（可选，仅截图对照使用，正式上线可保留淡色）。
- **Acceptance Criteria Addressed**: AC-1, AC-2 (兜底)
- **Test Requirements**:
  - `human-judgement` TR-5.1: 截图中 canvas 容器圆角 6px 视觉可见，边界外无漂浮像素

## [x] Task 6: 构建压力 + 截图验证（9 组合 × verify_canvas_fit_v4.py）
- **Priority**: high
- **Depends On**: Task 1~5 全部
- **Description**:
  - 执行 `npm run type-check && npm run build`，必须 exit 0。
  - 生成 `scripts/verify_canvas_fit_v4.py` Playwright 本地复跑脚本：9 组合 (3 width=2560/1920/1600 × 3 range=week7/week30/week90) → 每组合存 dashboard 全页截图 + 数据趋势卡单独截图；程序断言：
    a) KPI 卡 4 张、比例 6:4
    b) 主图 canvas axisLabel 左右像素采样（color ≠ 白的像素不在 canvas 外区域）
    c) X 标签数量阈值（7d >= 7, 30d >= 8, 90d >= 12）
    d) 主图柱（COLOR_RATE 绿色）在 grid 外区域像素数 = 0
  - 输出 `out/fit_v4/report.md` 报告和 18 张截图。
- **Acceptance Criteria Addressed**: AC-1~AC-8 全覆盖
- **Test Requirements**:
  - `programmatic` TR-6.1: `npm run type-check && npm run build` exit 0
  - `programmatic` TR-6.2: 9 组合断言 (a)(b)(c)(d) 全部通过，report.md 中 36 个断言 [x] 不低于 34，剩余 ≤2 项需要 manual review
  - `human-judgement` TR-6.3: 9 组合截图视觉审阅，三个截图红框问题完全消失
