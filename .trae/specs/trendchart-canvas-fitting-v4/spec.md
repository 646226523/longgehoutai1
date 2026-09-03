# 数据趋势 Canvas 适配修复 V4 - Product Requirement Document

## Overview
- **Summary**: 针对用户 1080p 实机截图暴露的数据趋势模块 ECharts Canvas 三个核心问题（左右 Y 轴数值标签被遮挡、近 7 天柱状图左右端越出数据网格、X 轴日期节点显示不全）进行系统性修复。对 `LayoutV3Config.gridMain/Sub` 与 `buildMainOption/buildSubOption` 的边界参数（grid 四边留白、boundaryGap、xAxis 显隐策略、endLabel/markPoint 不越界）做一次三维度的联动重算，保证 3 档分辨率（2K / 1080p / compact）× 3 种周期（7 / 30 / 90 天）= 9 种组合下：双 Y 轴标签完整不被切、主辅双柱不越 grid 边界、X 轴首末日期必定显示。
- **Purpose**: 解决实机截图中红框标红的三区域数据被 Canvas 容器边界裁掉的显示缺陷，让运营人员在三档主流商务屏上无需调整缩放即可完整读出"存量 0/600/1200 羽"、"环比 0%/±30%/±50%/±100%"等决策数字，以及 7 天档每一天的日期节点（7/30 - 8/5 必须全显，不得省略中间日期）。
- **Target Users**: 基因档案业务运营、数据分析师、公棚管理员、超级管理员后台日常复盘。

## Goals
- **G1**: 左右 Y 轴数值标签 100% 完整可见：主图左侧 `XX羽` 不贴边、右侧 `±XX%` 不被 canvas 右边界裁掉；辅图左侧整数 label 完整不裁剪。
- **G2**: 柱状图柱体绝对不越 grid 数据区域：主图 rate 柱状（日增环比%）左右两端第一根和最后一根不超 grid；辅图 NFT / 活跃用户双柱左右第一/最后柱贴边但不越界。
- **G3**: X 轴日期节点全量可核读：7 天档 7 个日期全部显示（7/30, 7/31, 8/1, 8/2, 8/3, 8/4, 8/5）；30 天档首中末 8~10 个日期无首尾裁；90 天档首中末 12~15 个日期无首尾裁。
- **G4**: 三档分辨率 × 三周期 9 组合视觉效果一致不回归；主图折线终点 endLabel `159 羽` / markPoint 峰值气泡不再溢出 canvas。

## Non-Goals (Out of Scope)
- 不改变 V3 驾驶舱 6:4 双栏结构比例、KPI 卡数量、图例条底部样式（V3 规格保持不变）。
- 不调整 prevTrend 数据层、Tooltip 文案、洞察块洞察文案生成逻辑。
- 不新增 dataZoom 或引入滚动条到主辅图内（除 2K 档既有的 slider 保持不动）。
- 不修改导出 CSV 功能、不做交互逻辑重构（仅修复 canvas 边界 fitting 问题）。

## Background & Context
### 问题现象（由用户 1080p 实机截图提供）
1. **左右 Y 轴数值参数被遮挡**（截图红框左右两边）：主图双 Y 轴右轴 `100%/90%/60%/30%/0%/-30%/-50%` 数字右对齐后超出 canvas 右边界约 12px，左轴 `0/300/600/900/1200/1500羽` 被 canvas 左边界裁掉左侧 6~8px。
2. **主图柱状越出数据栏**（切换近 7 天时截图第 3 张红框中 7/30 和 8/5 两根主图柱）：boundaryGap=false + barWidth=50% 导致左右两端柱体超出 grid 最左和最右竖线约 16px，第一根柱贴边越入左 Y 轴留白区。
3. **X 轴底部日期节点显示不全**（第 3 张截图红色横框 7/30 - 8/5）：使用 `hideOverlap=true` + grid.bottom=30 过窄，底部仅剩 22px 高度，X 标签被裁成"7/30" "8/1" "8/3" "8/5" 4 个（共应显示 7 个），首末日期只剩半截。

### 技术根因分析（对照现有代码）
- `useResolutionTier.ts` 1080p 档 `gridMain: { left:30, right:36, bottom:30 }`：左右留白对 14px 字号 + 6~7 字符 (`-50% / 1500羽`) 的 label 宽度明显不足（双 Y 轴右 label 宽度 ≈ 44px；左 label ≈ 46px）。
- `echartsOptions.ts` `xAxis.boundaryGap = false` + `series[1].barWidth = '50%'`：主图为折线设计的 `boundaryGap:false`（两端撑满）会导致柱状 barWidth 向左/右各延伸 25% 半宽，必然越出 grid。
- `xAxis.axisLabel { hideOverlap: true, interval: layout.xTickInterval, fontSize: baseFontSizePx-2 }`：1080p 档虽 `xTickInterval=1`，但 `hideOverlap=true` 在 grid.bottom=30 时 ECharts 判定标签高度不足，仍会主动省略中间日期。
- `gridSub: { left:30, right:36, bottom:20 }`：辅图 Y 轴 label + 辅图 X 轴双行 label 旋转 -15°（compact 档）时 bottom=20 仅 20px 高，必然裁底。

## Functional Requirements
- **FR-1**: 主图/辅图 grid 四边留白按三档分辨率动态放大：对 `gridMain.left/right/bottom` 和 `gridSub.left/right/bottom` 分别提供新的三档预设，以 label 宽度经验公式 `leftPx = ceil(maxTickDigits × fontPx × 0.62) + 8` 为基线；右轴额外预留右 label + 右刻度 margin。
- **FR-2**: 主图 xAxis `boundaryGap` 按 series 组合智能切换：仅当显示 `stock+rate`（同时有柱）时，改为 `boundaryGap:['15%','15%']`；若用户隐藏 rate 柱仅剩折线，切回 `boundaryGap:false` 保持折线两端撑满（与 V3 预期一致）。
- **FR-3**: 主图柱体 `barMaxWidth` 硬上限 + 按周期分档 barWidth：7d `35%`、30d `50%`、90d `60%`，7d 档保证两端柱不超边界 + 柱宽够大不拥挤。
- **FR-4**: X 轴日期显示策略升级：`hideOverlap=false` 三档全关；`xTickInterval` 三档分别定规则保证首末日期强制显示；compact 档 `xLabelRotateDeg` 主图 -15°、辅图 -20° 防止 7 天档 7 日期水平重叠。
- **FR-5**: endLabel 位置安全兜底：主图 stock line endLabel `position:'right'`（画布最右端外），配合 `grid.right` 额外 + 36px 为其保留专用缓冲区；保证 `159 羽` 无论字体 16/15/14px 永不越 canvas 右边界。
- **FR-6**: markPoint 气泡不越顶 / 不越左右：`symbolSize` 7d=14, 30d=12, 90d=10；label font 三档分别是 14/13/12；并给 `gridMain.top` 加 10~14px 缓冲区。
- **FR-7**: `LayoutForOption` 新增主辅图 boundaryGap 开关和轴 label 宽度字段，供 option 构造器直接读取，避免硬编码。

## Non-Functional Requirements
- **NFR-1 视觉性能**: 9 组合下 `npm run build` 零 TS error；ECharts `resize` 时三档容器高度正确，重排耗时 ≤ 80ms。
- **NFR-2 兼容性**: Props 接口保持不变（7 字段：data7/data30/data90/insights + prev×3 可选），父组件 `Dashboard.tsx` 零改动。
- **NFR-3 可测性**: 提供 `scripts/verify_canvas_fit_v4.py` 新 Playwright 脚本：9 组合 × DOM 断言（canvas 容器 vs axisLabel 像素级不越界 + X label 数量符合预期 + bar position 越不越 grid）+ 截图存档。
- **NFR-4 三档自适应**: 分辨率切换时（拖动窗口宽度 ≥2560 → 1920~2560 → <1920），grid 留白同步按档位切换无卡顿，layoutV3 重新渲染间隔 ≤ 300ms（debounce 200ms + ECharts 100ms）。

## Constraints
- **Technical**: React 18 + TypeScript 5 + ECharts 5 + echarts-for-react + Ant Design 5；**严禁引入新的第三方依赖**；修改仅限 4 文件：`useResolutionTier.ts`、`echartsOptions.ts`、`TrendChart.tsx`（若需加 props）、`trendChart.css`。
- **Business**: 不破坏 V3 规格的 AC 验收标准（KPI 卡 4 张、比例 6:4、4 张不重叠、主辅比 ≥2.5、右轴不出现"今日"等）。
- **Dependencies**: 基于 V3 已交付代码继续改，无需 rollback。

## Assumptions
- A1: ECharts xAxis.axisLabel `interval:0` + `hideOverlap:false` 在 7 天档主图容器 ≈ 500~600px 宽 × font=12px 时可容纳 7 个日期不互相重叠（经粗算：7 日期 × 30px = 210px ≤ 500px 可用宽，成立）。
- A2: 右轴 label 最长值为 `-100.0%` ≈ 8 字符，`14px 字号 × 0.62 × 8 ≈ 70px`；加上 axisLabel.margin=8，grid.right 需 78px 左右（1080p 档）。
- A3: 用户当前实机窗口 ≈ 1920 × 1080 主流商务屏，1080p 档为最高频档，是本次修复的 P0 档，2K 和 compact 保持视觉一致。
- A4: 用户未要求改变主/辅图画布高度与 V3 KPI 列宽度，故主/辅图高度 main/sub 保持不变（G4 要求，不能为了留白偷面积）。

## Acceptance Criteria

### AC-1: 主图左右 Y 轴标签完整不裁剪（1080p × 30d 档，取最坏 case）
- **Given**: 浏览器窗口 width=1920，Dashboard 已登录并打开，数据趋势选择"近 30 天"
- **When**: 截取主图 canvas 左 60px 列和右 70px 列进行像素级检查
- **Then**: (1) 左轴所有数值标签 `0/300/600/900/1200/1500羽` 完整可见，任何一个字符不超过 canvas 左侧 3px 安全线内；(2) 右轴所有 `100%/90%/60%/30%/0%/-30%/-50%` 完整可见，右字符不超 canvas 右侧 3px 安全线内；(3) 轴标签与刻度线间距 ≥ 6px，不糊在一起。
- **Verification**: `programmatic`（Playwright clip + OCR on axis label pixels 非空 + label getBoundingClientRect < canvas 边界）
- **Notes**: 9 组合全部过一遍，最坏 case 是 30d/90d（右 label 含负号），仅当最坏 case 过视为通过。

### AC-2: 主图 rate 柱状（日增环比%）左右两端不越 grid
- **Given**: 数据趋势切换到"近 7 天"，主图同时显示 stock 折线和 rate 柱
- **When**: 观察第 1 根柱（7/30）和最后 1 根柱（8/5）与 grid 左右竖线相对位置
- **Then**: (1) 第一根柱的左边缘像素 x ≥ grid 左竖线 x；(2) 最后一根柱的右边缘像素 x ≤ grid 右竖线 x；(3) 两根柱不进入 Y 轴留白区（不盖在 0羽 / -50% label 上）；(4) bar 宽度占每个 category 宽度 30~40%，视觉上不挤不松。
- **Verification**: `programmatic`（取 canvas 像素颜色采样：柱色 COLOR_RATE 在 grid 外的像素数 = 0）

### AC-3: X 轴日期节点全部显示（7 天档必须 7 个日期全显）
- **Given**: 数据趋势选"近 7 天"
- **When**: 检查主辅两图 X 轴底部日期标签的个数和内容
- **Then**: (1) 主图 X 轴标签 = 7 个（7/30, 7/31, 8/1, 8/2, 8/3, 8/4, 8/5）全部显示，无省略；(2) 辅图 X 轴标签同样 7 个全显；(3) 首标签 `7/30` 左边缘 ≥ canvas 左 + 6px，末标签 `8/5` 右边缘 ≤ canvas 右 - 6px，两标签不裁；(4) 30d 档主辅标签数 ≥ 8 且首末全显；90d 档主辅标签数 ≥ 12 且首末全显；compact 档主 X 标签 -15° 旋转不重叠。
- **Verification**: `programmatic`（ECharts model 快照: xAxis[0].data 数量 × axisLabel 渲染数 >= 最低阈值；首末两标签文字和位置 DOM 断言）

### AC-4: endLabel `159 羽` 不越 canvas 右边界
- **Given**: 7d 档 1080p 数据末点 geneStock=159
- **When**: 观察主图折线终点 endLabel 位置
- **Then**: endLabel 右边缘像素 x ≤ canvas 右边缘 x - 3px，label 完全在画布内（因 FR-5 切换为 right + 额外 grid 预留，不允许飘出）
- **Verification**: `programmatic`（canvas 右侧 30px 列蓝像素采样 + 相对位置断言）

### AC-5: markPoint 峰值/谷值气泡不越顶不越左右
- **Given**: 7d × 1080p，极值气泡显示在 8/1 和 8/3 位置
- **When**: 检查两个气泡最外像素
- **Then**: 气泡最上像素 ≥ canvas 顶部 + 3px；最左像素 ≥ canvas 左 + 3px；最右像素 ≤ canvas 右 - 3px
- **Verification**: `programmatic`（颜色采样 COLOR_MAX/COLOR_MIN 越界像素 = 0）

### AC-6: 三档分辨率 × 三周期 9 组合 零视觉回归 V3 其他 AC
- **Given**: 按 playbook 跑 9 组合
- **When**: 逐一验证原 V3 规格 checklist J1~J15（除 canvas 边界之外）
- **Then**: J1 比例 6:4、J3 KPI=4、J4 不重叠、J6 主辅≥2.5、J8 左轴无"今日"、J9 画布不溢出 全部仍然 [x]
- **Verification**: `human-judgement`（截图对比 + `programmatic` 关键指标断言）

### AC-7: 父组件零改动 / TS 零错误
- **Given**: 代码改动完提交前
- **When**: 执行 `npm run type-check` + `grep 'TrendChart' src/pages/dashboard/Dashboard.tsx`
- **Then**: (1) type-check exit 0；(2) Dashboard.tsx TrendChart 调用点 props 数量 & 名字未变；(3) grep any/@ts-ignore 0 条
- **Verification**: `programmatic`

### AC-8: compact 档（<1920，模拟 1600 宽）三问题也修复
- **Given**: 窗口 width=1600，compact 档
- **When**: 看 AC-1/AC-2/AC-3 对应断言
- **Then**: compact 档三个 AC 子断言全部通过（X 标签旋转 -15°，允许水平方向更挤，但不允许被 canvas 裁）
- **Verification**: `programmatic`（verify_canvas_fit_v4 含 1600 width case）

## Open Questions
- [ ] 用户实机是否有 "窗口 DPI 缩放 125%" 导致 canvas 像素坐标偏移（如 125% 缩放实际可用宽 = 1536px）？→ 默认视为"有 125% 缩放"，compact 档 grid.left/right 额外 +6px 缓冲。
- [ ] 主图 boundaryGap 智能切换导致的 X 轴坐标在用户切换图例显隐时跳动，是否需要加平滑过渡动画？→ 默认保持 animationDurationUpdate=300ms 不开新需求，若跳动明显后续再调。
