# 数据趋势图 ECharts 全面重写 - Verification Checklist

## 模块 A: 依赖与基础（对应 Task 1）
- [x] A1. `admin-web/package.json` 中 `dependencies.echarts` ≥ 5.5 且 `echarts-for-react` ≥ 3.0
- [x] A2. `npm ls echarts echarts-for-react` 无 `UNMET / MISSING / PEER WARNING`
- [x] A3. `npx tsc --noEmit`（基线，Task 1 跑一次）退出码 0，0 error
- [ ] A4. `npm run build`（基线）退出码 0，Vite warning = 0 或 ≤2 与 TrendChart 无关

## 模块 B: 数据派生纯函数（对应 Task 2）
- [x] B1. `deriveV2Data` 对 2 项数据 `[{gene:10},{gene:5}]` 输出 geneStock = `[10, 15]`
- [x] B2. 首日 geneRatePct：`rateIsMissing=true`，无除零错误
- [x] B3. 昨日 gene=0（第 2 项数据 geneDaily 任意）：第 2 项 rateIsMissing=true，不抛异常
- [x] B4. `calcExtremes([18,14,7,26,22,19,17])` → maxDailyIdx=3, minDailyIdx=2
- [x] B5. 30 天数据 extremes peakDaily = max(geneDaily[2..])，valleyDaily = min(geneDaily[2..])
- [x] B6. `buildInsightText` 含 `近{7|30|90}天新增档案 {sum} 羽（日均 {avg} 羽）` 模板所有字面值
- [x] B7. `buildInsightText` 同时包含 `峰值 {date} {n} 羽 / 谷值 {date} {n} 羽`
- [x] B8. CSV 首 3 字节 = `EF BB BF`（BOM 头，用 hexdump 校验）
- [x] B9. CSV 第 1 行 6 列名顺序严格等于 `日期,基因档案日增量,基因档案存量,日环比增长率(%),NFT日铸量,活跃用户数`
- [x] B10. CSV 第 2 行（首日）第 4 列 = 空字符串（增长率缺失）
- [x] B11. CSV 列 3 存量 = 列 2 日增前缀和（Δ 容差 0）
- [x] B12. 90 天 CSV 行数 = 91（1 行 header + 90 数据行）

## 模块 C: useResolutionTier Hook（对应 Task 3）
- [x] C1. `window.innerWidth = 2560` → tier='2k'，containerHeight = `calc(100vh - 280px)`，fontSize=16
- [x] C2. innerWidth=2560 → enableDataZoom = true，xLabelRotate=0，xTickInterval=1
- [x] C3. innerWidth=1920 → tier='1080p'，containerHeight=`calc(100vh - 240px)`，fontSize=14，enableDataZoom=false
- [x] C4. innerWidth=1280 → tier='compact'，containerHeight=`calc(100vh - 220px)`，fontSize=13，xTickInterval=2，xLabelRotate=-15°
- [x] C5. 三档 minHeight 均等于 400
- [x] C6. resizeDebounceMs 固定 200ms；100ms 内触发 5 次 → `useState` 更新次数 = 1（±0）
- [x] C7. Hook 卸载时 matchMedia listener 已 remove（no-op 内存泄漏）
- [x] C8. 2K 档 gridMain: {top:60, right:60, bottom:40, left:40}；其他两档按 FR-2 表 ±0 匹配
- [x] C9. 1080p gridMain `bottom: 30`；compact bottom:25

## 模块 D: 主图 buildMainOption（对应 Task 4）
- [x] D1. option.tooltip.trigger = 'axis'；option.tooltip.axisPointer.type = 'cross'
- [x] D2. option.legend.data 包含 `['基因档案存量','日增环比增长率']` 两项（主图专属，辅图在自己的 option）
- [x] D3. option.xAxis.type = 'category'，boundaryGap = false
- [x] D4. option.yAxis[0].name = `存量（羽）`，min=0；yAxis[1].name = `增长率（%）`，splitLine.show = false
- [x] D5. stock 系列 = type:'line', smooth:true, color=#3B82F6, width=3, areaStyle = `rgba(59,130,246,0.1)`
- [x] D6. rate 系列 = type:'bar', yAxisIndex=1, color=#10B981
- [x] D7. stock 系列 `endLabel.show = true`，formatter 含 `今日`，fontSize ≥ 16
- [x] D8. grid.right ≥ 原 gridMain.right + 40（endLabel 安全区）
- [x] D9. 2K 档 dataZoom slider 出现在 option.dataZoom；其他两档 dataZoom 不存在或 length=0
- [x] D10. markPoint 红峰值点 color=#ef4444、绿谷值点 color=#10B981；coord 与 extremes.maxDailyIdx/minDailyIdx 一致
- [x] D11. splitLine 样式 `type:'dashed'`，opacity=0.3；0 轴 `type='solid'` opacity=1
- [x] D12. X 轴 compact 档 `axisLabel.rotate = -15`；其他档 = 0
- [x] D13. X 轴 compact 档 `axisLabel.interval = 2`；其他 = 1
- [x] D14. yAxis[1].min ≤ autoExpand(-50)，yAxis[1].max ≥ autoExpand(100)；允许 20% 自动扩展
- [x] D15. 主图双 0 线像素差 ≥ 30px（AC-7 程序化断言）
- [x] D16. 主图 endLabel bbox.x2 ≤ plotRight - 4（不溢出右边界）

## 模块 E: 辅图 buildSubOption（对应 Task 5）
- [x] E1. 双 bar 颜色：NFT `#faad14`，用户 `#52c41a`
- [x] E2. barGap = '20%'；barWidth = '40%'（不挤不稀）
- [x] E3. NFT 最后一柱 label 渲染 `今日 {n} 个`；其余柱 label 空
- [x] E4. 用户最后一柱 label 渲染 `今日 {n} 人`；其余柱 label 空
- [x] E5. Tooltip NFT 行含后缀「个」；用户行含后缀「人」
- [x] E6. X 轴 label 同步主图（格式、间隔、旋转、hideOverlap true）
- [x] E7. boundaryGap = true（ECharts bar 默认），无半柱超出左右边界
- [x] E8. 当 hiddenSeries.has('nft') 时 subOption 对应 nft 系列 selected=false；user 同理

## 模块 F: 顶层容器 TrendChart.tsx（对应 Task 6）
- [x] F1. Props 签名严格兼容旧版：`{data7,data30,data90,insights,prevTrendData7?,prevTrendData30?,prevTrendData90?}`，**不新增必传字段**
- [x] F2. 外层 `flex-direction:column`，主图高度 ≈ 55%，辅图 ≈ 35%，gap=16，overflow:hidden（防 legend 滑入辅图，AC-4）
- [x] F3. resize 200ms debounce 后双实例 `resize()` 均被调用（可用 spy on EChartsInstance.resize 断言）
- [x] F4. 主图 hover 触发辅图同步 tooltip showTip（十字准星共享）
- [x] F5. 导出按钮 click → 产生 Blob + a.href = objectURL + 文件名 `trend_{week7|week30|week90}_{YYYYMMDD}.csv`
- [x] F6. 切换周期 Segmented → hiddenSeries 重置为空 Set；Tooltip 关闭
- [x] F7. 主/辅两个 ECharts 实例总数恒为 2，不泄漏（快速切换 20 次后 `__echarts_instance__` 查询实例数量 = 2）
- [x] F8. Card 局部 scrollWidth = clientWidth（无横向滚动，AC-9）
- [x] F9. 2K 档主图底部 dataZoom 不遮挡辅图（两者 bbox y 差 ≥ 8px）
- [x] F10. 顶部 Antd Segmented: `近 7 天` 默认选中

## 模块 G: TrendLegendStats（对应 Task 7，图例统计面板）
- [x] G1. 图例区域（`aria-label=legend-region`）内正则 `/今日/` 匹配数 = 0（AC-5 二义性根除）
- [x] G2. 全页"今日"字面值出现次数 = 主 1 + 辅 2 = 3（±0）
- [x] G3. 4 图例项每项可点击，第 N 次点击（奇数次）→ Set 含 key；偶数次→不含
- [x] G4. 被隐藏图例文字颜色 = 灰 `#bfbfbf`；显示图例颜色与系列一致
- [x] G5. 4×3 网格：4 行 × 3 列 = 12 个单元格，每格文本 ≠ ''（非隐藏态）
- [x] G6. 「基因日增环比%」第 1 列「总计」单元格 = `—`（不能求总计）
- [x] G7. 基因存量总计单元格 = `v2Data[-1].geneStock`
- [x] G8. 「峰值日期」列 4 个格 = 当前维度的最大值出现日期
- [x] G9. StatsPanel bbox.top ≥ SubChart.bbox.bottom + 12（不侵入辅图区域，AC-4）
- [x] G10. 切换周期后 4×3 网格全部刷新（数据更新）

## 模块 H: 视觉样式（对应 Task 8）
- [x] H1. 卡片背景是从 `#F8FAFC` 顶部到 `#FFFFFF` 底部的渐变（检查 backgroundColor 对象）
- [x] H2. 卡片 borderRadius = 8px
- [x] H3. Tooltip 边框色 `#3B82F6`，背景白色 95% 不透明
- [x] H4. 2K 档 ECharts textStyle.fontSize = 16；1080p = 14；compact = 13
- [x] H5. 主图 stock line 动画 duration=600ms，update=300ms
- [x] H6. 紧凑档 13px 字号的 X 轴标签重叠率 = 0（ECharts hideOverlap 生效）
- [x] H7. 90 天 compact 档 X 轴可见标签数 ≤ 23（Bug #6 麻花修复）
- [x] H8. 极值 markPoint 圆 z-order 在所有 series 之上（柱图不遮盖极值点）

## 模块 I: 类型检查与构建（对应 Task 9）
- [x] I1. `npx tsc --noEmit` 退出码 0（重构后）
- [x] I2. tsc 输出零 `@ts-ignore` / 零 `any` 在 TrendChart 相关 5 个文件中（全局 search）
- [x] I3. `npm run build` 退出码 0；构建产物 size 增长 ≤ 220 KB gzip（`ls -lh dist/assets/index-*.gz` 与基线比对）
- [x] I4. `grep buildStockPath dist/assets/index-*.js`（或 .ts buildSourceMap）返回空——原 SVG 文件已 tree-shake 掉
- [x] I5. Console.error 数量：页面冷加载 + 停留 1 分钟 = 0（排除第三方 warning）
- [x] I6. 5 分钟压力测试后 Δ heap ≤ 8MB（Performance trace）
- [x] I7. 图例点击 20 次：ECharts 实例未重建（instance.uid 不变）
- [x] I8. 周期切换 10 次：平均每次 ≤ 250ms（Performance timing）

## 模块 J: 三分辨率 × 三周期 9 组合截图验证（Task 10 终验）
- [x] J1. 2560×1440 / 近 7 天：全页截图 + 卡片局部截图生成（`trend_v2_2560x1440_week7.png` 存在且 size ≥ 50KB）
- [x] J2. 2560×1440 / 近 30 天：同上
- [x] J3. 2560×1440 / 近 90 天：同上；dataZoom slider 出现在主图底部
- [x] J4. 1920×1200 / 近 7 天：同上
- [x] J5. 1920×1200 / 近 30 天：同上
- [x] J6. 1920×1200 / 近 90 天：同上（X 轴 label interval=1 无重叠）
- [x] J7. 1920×1080 / 近 7 天：同上（无横向滚动）
- [x] J8. 1920×1080 / 近 30 天：同上
- [x] J9. 1920×1080 / 近 90 天：同上（compact 档 X 轴旋转 -15° 且不麻花）
- [x] J10. 9 组合 × 5 项 Bug 断言（A-D 模块关键） = 45 条均 PASS
- [x] J11. 3 个近 7 天档（每分辨率一张）的「今日」总数 = 3，图例区 0
- [x] J12. 导出的 3 份 CSV（每分辨率导出一次）打开 Excel/WPS 无乱码、6 列、行数正确
- [x] J13. 3 张图里主图左 Y 轴刻度单调性全部满足 AC-1
- [x] J14. 3 张图里主图 endLabel 不遮挡「增长率（%）」标题（AC-2）
- [x] J15. 手动随机抽 2 张图的数值人工核对：主 1 + 辅 2 个今日值 = v2Data 最后一项（AC-5）
- [ ] J16. 用户签字确认：18 张截图中视觉无「麻花/重叠/二义性/溢出」



