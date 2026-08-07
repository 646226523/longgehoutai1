# 数据趋势图逻辑重构 - Product Requirement Document

## Overview
- **Summary**: 对后台 Dashboard 「数据趋势」模块进行深度重构，解决当前存在的「指标口径打架（存量/流量混Y轴）、注释与图表脱节、缺乏波动归因」三大核心问题，采用「主图+辅图」三明治分层布局、双Y轴分离存量与增量、智能极值标注、三分辨率自适应，构建专业的数据分析可视化组件。
- **Purpose**: 运营人员无法从当前趋势图中获取有效决策依据（累计曲线压扁日活、无法定位峰值谷值原因、今日数据不可见），重构后需支持「一眼看今日、一图看趋势、一标看极值」的数据感知闭环。
- **Target Users**: 后台管理员（超级管理员、运营管理员、赛事管理员），每日高频访问 Dashboard 进行运营数据复盘。

## Goals
- **G1 数据口径分层**: 将存量累计值（基因档案存量）与流量日值（活跃用户、NFT日铸）彻底分离，采用主图双Y轴 + 辅图独立轴，消除跨量级混轴导致的曲线失真。
- **G2 极值与归因可感知**: 自动标注周期内最高/最低点并说明原因，Tooltip 含环比昨日与占比，曲线终点直接悬浮今日数值。
- **G3 三分辨率完美适配**: 在 2560×1440（大屏）、1920×1200（标准）、1920×1080（紧凑）三档分辨率下均呈现专业可视化效果，无滚动即可见全貌。
- **G4 交互闭环增强**: 图例点击同步显示维度总计与均值，导出 CSV 口径与图表一致，网格线/坐标轴/背景全面升级视觉专业度。

## Non-Goals (Out of Scope)
- **不引入 ECharts 等重型图表库**：保持现有手写 SVG + React 架构，不新增第三方图表依赖。
- **不实现后端真实接口对接**：本次仅在 mockData 中扩展数据结构，后端接口由 P1 迭代承接。
- **不实现关键事件联动（赛事透出）**：你方案中提到的「大型赛事导致注册量暴增，图表背景透出赛事图标」为后期 P2 可扩展项，本次 MVP 不落地。
- **不实现 7/30/90 天切换的 dataZoom 滑块**：宽屏 dataZoom 为 P2 功能，MVP 使用默认全量显示。
- **不修改核心指标卡与其他模块**：仅改造 TrendChart 组件自身及其数据层，不影响 Dashboard 其他模块布局。

## Background & Context
- 当前代码位于 `admin-web/src/pages/dashboard/TrendChart.tsx`，采用纯 SVG 手绘：800×300 固定 viewBox + 三条面积折线（基因档案/活跃用户/NFT资产）共用单Y轴。
- 数据接口 `TrendPoint = { date, gene, user, nft }` 均为**日增量**，但用户感知中「基因档案」「NFT资产」是**存量累计**概念，口径严重不匹配，导致曲线被误读。
- 三档分辨率适配问题：当前用 `width:100%, height:auto` 拉伸 viewBox，在 1080p 下图表过高、在 2K 屏上字体过小、Grid 边距不随屏宽调整。
- Tooltip 仅显示日期+三数值，不含环比昨日/占比，无法支撑运营复盘；底部 insight 文本为固定文案，未与实际数据联动计算。
- 项目约束：不使用 findDOMNode、ProTable 禁用 density；遵循「value + trend + health」卡片规范与四级告警配色。

## Functional Requirements
- **FR-1 主图（面积折线+柱状双轴）**: 上层 55% 高度渲染主图，左Y轴为「基因档案存量（羽·累计）」面积折线图，右Y轴为「日环比增长率（%）」柱状图，两者各自独立计算刻度。
- **FR-2 辅图（NFT vs 活跃用户双柱状）**: 下层 35% 高度渲染辅图，统一数值轴展示「NFT 日铸量」与「活跃用户数」的日粒度对比柱状。
- **FR-3 智能极值标注**: 自动扫描 7/30/90 天周期内主指标（基因日增量/存量）的最高点与最低点，用红色圆点标记最高点、绿色圆点标记最低点，hover Tooltip 提示「X月X日 新增XX羽（峰/谷值）」。
- **FR-4 今日数值终点标签**: 三条曲线的最新数据点（右端）旁，直接悬浮大号加粗数值标签，标明「今日:XX」。
- **FR-5 Tooltip 重构含环比**: 悬停任一天显示「日期 + 指标值 + 较昨日 ↑/↓ X% + 占本周总量 X%」。
- **FR-6 图例交互升级**: 点击图例显示/隐藏对应序列，同时在图表底部同步展示该维度的「周期总计」和「日均值」。
- **FR-7 三档分辨率自适应**: 监听 matchMedia，按屏幕宽度档位动态调整容器高度、Grid 边距、字体基准尺寸；2K 屏细化 X 轴标签密度，1080p 压缩间距避免滚动。
- **FR-8 视觉样式全面升级**: 网格线改为淡灰虚线（透明度 0.3），Y 轴加单位、X 轴日期格式 `MM/DD`；背景采用 `#F8FAFC → #FFFFFF` 极浅渐变；整体去除简陋感。
- **FR-9 底部洞察文案数据驱动**: 原固定 `insightText` 改为根据当前选中周期实时计算「本周新增 XX 羽，环比上周 ±X%，日均 XX 羽，峰值为 X月X日」。
- **FR-10 导出 CSV 口径对齐**: 导出字段扩展为「日期、基因存量、基因日增、日增环比%、NFT日铸、活跃用户」，与主辅图口径一致。

## Non-Functional Requirements
- **NFR-1 响应性能**: 图例切换/Tooltip 渲染均在 16ms 内完成（60fps）；resize 防抖 200ms，重绘无卡顿。
- **NFR-2 自适应鲁棒性**: 在 3 档分辨率及窗口拉伸过程中，SVG viewBox 与容器尺寸计算零误差、无溢出裁剪。
- **NFR-3 可维护性**: 组件拆分为 `TrendChart.tsx`（主容器）+ 内部子组件（MainChart / SubChart / Legend / Tooltip / InsightBar），单文件不超过 500 行。
- **NFR-4 类型安全**: 新增 `TrendPointV2`、`ExtremePoint`、`LegendState`、`ResolutionTier` 接口全部使用 TypeScript，无 any。
- **NFR-5 无障碍**: 交互元素均有对应 aria-label；对比度遵循 WCAG AA；焦点可到达图例切换与导出按钮。
- **NFR-6 一致性**: 主色沿用现有 `COLORS = { gene: #1677ff, user: #52c41a, nft: #faad14 }`，与全局 Ant Design 主题一致。

## Constraints
- **技术栈**: React 18 + TypeScript + Ant Design 5 + 原生 SVG（不引入 ECharts / Recharts 等库）。
- **架构约束**: 保留现有 props 结构向后兼容（`data7/data30/data90/insights`），在组件内部进行 V2 结构派生，外部调用方无需改动。
- **业务约束**: 数据单位「基因档案=羽、NFT资产=个、活跃用户=人」不可混淆；环比计算以昨日为基准，缺失数据按 0 处理。
- **样式约束**: 不使用全局 CSS 覆盖，所有样式用内联 style 或 styled-components 风格对象封装，避免污染其他模块。

## Assumptions
- **A1**: 现有 `TrendPoint.gene` 字段表示「基因档案日新增量」，存量需在组件内部 `prefixSum` 累加得到；`TrendPoint.nft` 表示「NFT 日铸量」；`TrendPoint.user` 表示「当日活跃用户数」。
- **A2**: 环比公式 `(今日 - 昨日) / 昨日 × 100%`，昨日为 0 时环比置为 0 且标注「—」避免 ∞。
- **A3**: 三档分辨率断点：≥2560 大屏档、≥1920 且 `<2560` 标准档、`<1920` 紧凑档；高度动态计算公式按你方案实现。
- **A4**: 极值判定以「基因日增量」为主指标，当其并列取最早日期；峰/谷值标记仅在主图渲染，辅图不单独标极值。
- **A5**: 图例总计/均值面板默认不显示，仅当任一图例被点击过滤后展开（或 hover 图例显示，具体实现由开发者选择，需 AC 验收）。

## Acceptance Criteria

### AC-1: 主辅图双轴分层渲染（G1→FR-1,FR-2）
- **Given**: Dashboard 加载完成，默认「近 7 天」视图
- **When**: 查看趋势图区域
- **Then**: 区域按 55% / 35% 高度划分为主图与辅图，主图左轴标注「存量（羽）」、右轴标注「增长率（%）」，辅图统一数值轴；基因存量曲线随日期递增、增长柱在右轴范围合理（-50% ~ +100%），辅图两柱高度与 nft/user 数值正相关且不互相压扁
- **Verification**: `programmatic`（检查 DOM 中存在两个独立 svg 分组 grid-main / grid-sub，yAxis-left/yAxis-right 文本正确；用 mock 7 天数据断言第 7 天存量=日增量之和，第 i 天环比=(data[i]-data[i-1])/data[i-1]）

### AC-2: 极值自动标注与颜色区分（G2→FR-3）
- **Given**: 选择任一数据周期
- **When**: 主图渲染完成
- **Then**: 基因日增量的最大值位置有红色圆点（#ff4d4f，r≥5px）、最小值位置有绿色圆点（#52c41a，r≥5px），其他点使用蓝色默认点；悬停峰值 Tooltip 含「（峰值）」字样，悬停谷值 Tooltip 含「（谷值）」字样
- **Verification**: `programmatic` + `human-judgment`（代码计算 maxIndex/minIndex 与渲染圆点位置差 <1px；肉眼确认颜色与尺寸与规范一致）

### AC-3: 今日数值终点标签（G2→FR-4）
- **Given**: 图表渲染完成
- **When**: 查看最右端数据点
- **Then**: 主图基因存量终点上方、辅图 NFT 与活跃用户终点上方各自悬浮大号加粗数值（≥14px），格式为「今日: N 单位」；标签不超出容器、不与网格线重叠
- **Verification**: `programmatic`（最新数据点旁边存在 `<text class="end-label">`，内容含「今日」，fontSize ≥ 14，fontWeight=700）

### AC-4: Tooltip 含环比昨日与本周占比（G2→FR-5）
- **Given**: 任意鼠标悬停到第 i 天（i>0）
- **When**: Tooltip 弹出
- **Then**: Tooltip 中每个指标除数值外，额外显示「较昨日 ↑/↓ X.X%」与「占周期总量 X%」；当日为第 1 天时环比显示「—」；所有百分比保留 1 位小数，环比为 0 显示「持平」
- **Verification**: `programmatic`（断言 tooltip DOM 中第 2 天环比=公式计算值，本周占比=value/totalSum）

### AC-5: 图例点击显示维度总计与均值（G4→FR-6）
- **Given**: 图表正常渲染
- **When**: 点击任意图例条目（如「基因档案存量」）
- **Then**: 对应序列被隐藏/显示切换；同时图表底部出现统计面板，显示该维度「周期总计: N、日均值: N」；点击全部 3 个图例后面板显示 3 行统计；再次点击可还原
- **Verification**: `programmatic`（图例点击后对应系列 path opacity<0.2 或 display=none；底部统计 panel innerText 含 `总计`/`均值` 字样，总计=数据求和、均值=总计/天数）

### AC-6: 三档分辨率自适应容器与Grid（G3→FR-7）
- **Given**: 三种典型分辨率（2560×1440、1920×1200、1920×1080）
- **When**: 分别在各分辨率窗口加载 Dashboard
- **Then**:
  - 2560档：高度=`calc(100vh - 280px)`，grid 边距 60/60/40/40，基准字号 16px，X轴标签间隔=1（全部显示）
  - 1920标准档：高度=`calc(100vh - 240px)`，grid 边距 50/50/30/30，基准字号 14px，X轴标签间隔=1 或自动旋转 15°
  - 1080紧凑档：高度=`calc(100vh - 220px)`，grid 边距 40/40/25/25，基准字号 13px，上下 padding 压缩
  - 三档均 min-height 400px，整图可完全展示不出现纵向滚动条
- **Verification**: `programmatic`（matchMedia 模拟三档宽度，读取容器 height / grid 对象数值 / font-size 变量均符合预期）+ `human-judgment`（截图肉眼检查不出现滚动条、布局均衡）

### AC-7: 视觉样式升级到位（G4→FR-8）
- **Given**: 图表加载完成
- **When**: 视觉检查
- **Then**:
  1. 网格线 strokeDasharray=4 4，opacity≈0.3，颜色 `#d9d9d9`
  2. Y 轴末端单位文字「（羽）/（%）/（个·人）」
  3. X 轴日期格式 `08/04`（无前导零为 8/4 也可接受，但无 `2026-` 前缀）
  4. 图表区背景为 `linear-gradient(#F8FAFC → #FFFFFF)` 或同等极浅色块区分于操作区
  5. 整体视觉与当前 Dashboard 卡片、MetricCard 风格一致，无「简陋」割裂感
- **Verification**: `human-judgment`（视觉验收清单 5 项逐项勾选）+ `programmatic`（网格线 strokeDasharray 属性、Y 轴文本含单位）

### AC-8: 底部洞察文案由数据计算生成（G2→FR-9）
- **Given**: 切换数据周期（7→30→90天）
- **When**: 查看底部绿色 insight 条
- **Then**: 文本内容为根据所选数据实时计算，格式如「近7天基因档案新增 156 羽，环比上周 ↑ 12.5%；日均 22 羽；峰值 8/1 日新增 26 羽」，所有数字与实际数据误差 ≤1 羽；切换周期时文案同步更新
- **Verification**: `programmatic`（断言 insight 文本中的总和、均值、峰值日期分别等于 `sum(data7.gene)`、`sum/7`、`argmax(data7.gene).date`）

### AC-9: 导出 CSV 口径与重构后一致（G4→FR-10）
- **Given**: 点击「导出」按钮
- **When**: 检查下载 CSV 文件
- **Then**: 表头字段为「日期、基因档案存量、基因日增量、日增环比%、NFT日铸量、活跃用户数」；行数=所选天数+1（表头）；环比列与图表中主图右轴数值逐行一致
- **Verification**: `programmatic`（在 jsdom 中模拟点击，读取 Blob 内容并断言 6 列表头 + 每行数据字段正确）

### AC-10: 重构无破坏性回归（G1→Constraints）
- **Given**: Dashboard 整体页面
- **When**: 加载并浏览所有模块
- **Then**: 指标卡、预警中心、端口分析、快捷入口、待办事项五模块布局与样式保持不变；TrendChart 组件 Props 接口未改，调用方 Dashboard.tsx 无需改动
- **Verification**: `programmatic`（TrendChart 组件 props shape 与原接口对比字段完全一致；其他模块 snapshot diff 为空）+ `human-judgment`（肉眼确认其他模块原样）

## Open Questions
- [ ] **Q1**: 图例总计/均值面板的触发方式——你倾向「点击任一图例即展开所有维度」还是「点击某图例只展开该维度」？本 PRD 默认两者兼顾（点击时显示被操作维度的统计，支持多图例同时筛选）。
- [ ] **Q2**: 峰值标注的主指标——当前默认按「基因日增量」取极值，是否需要支持切换到「NFT 日铸量」或「活跃用户」的极值标注？MVP 建议只做基因维度，P1 再做切换。
- [ ] **Q3**: 环比缺失日的处理——第 1 天（最早天）无昨日数据，除 Tooltip 显示「—」外，主图环比柱是否置空（不画柱）还是画 0 柱？默认画 0 柱并附 tooltip「—」。
