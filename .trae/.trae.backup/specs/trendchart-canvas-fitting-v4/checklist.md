# 数据趋势 Canvas 适配修复 V4 - 验证清单

> 验证模式：每一行检查点 = 3 档分辨率 × 3 周期 = 9 组合，需全部打 [x]。**P0 = 1080p × 7/30/90（用户实机）**，P1 = 2K × 7/30/90，P2 = compact × 7/30/90。

## 模块 A：grid 留白计算（useResolutionTier）
- [ ] A1 (P0/P1/P2): buildLayoutConfig 返回 gridMain.left 1080p >= 56, 2k >= 64, compact >= 50
- [ ] A2 (P0/P1/P2): buildLayoutConfig 返回 gridMain.right 1080p >= 76（含 endLabel 36px 预留）, 2k >= 86, compact >= 70
- [ ] A3 (P0/P1/P2): buildLayoutConfig 返回 gridMain.bottom 1080p >= 52, 2k >= 62, compact >= 48
- [ ] A4 (P0/P1/P2): buildLayoutConfig 返回 gridSub.left 1080p >= 46, 2k >= 54, compact >= 40
- [ ] A5 (P0/P1/P2): buildLayoutConfig 返回 gridSub.bottom 1080p >= 46, 2k >= 56, compact >= 42
- [ ] A6 (P0/P1/P2): buildLayoutConfig 返回 LayoutForOption.axisLabelHideOverlap === false
- [ ] A7 (P0/P1/P2): buildLayoutConfig 返回 LayoutForOption.endLabelReserveRightPx 1080p >= 36, 2k >= 42, compact >= 30
- [ ] A8: `npm run type-check` exit 0（单测）

## 模块 B：buildMainOption 边界参数
- [ ] B1 (9 组合): yAxis[0].axisLabel.margin = 10，align = 'right'；yAxis[1].axisLabel.margin = 10，align = 'left'
- [ ] B2 (9 组合 × rate 可见): xAxis.boundaryGap = ['15%', '15%']
- [ ] B3 (9 组合 × rate 隐藏): xAxis.boundaryGap = false（仅 stock 折线，两端撑满）
- [ ] B4 (P0×7d): barWidth = '35%'；barMaxWidth <= 24
- [ ] B5 (P0×30d): barWidth = '50%'；barMaxWidth <= 20
- [ ] B6 (P0×90d): barWidth = '60%'；barMaxWidth <= 14
- [ ] B7 (P0×7d): xAxis.axisLabel.interval = 0；hideOverlap = false → 渲染 7 个日期标签
- [ ] B8 (P0×30d): xAxis.axisLabel.interval ∈ [2, 4]；渲染标签数 >= 8；首末日期必现
- [ ] B9 (P0×90d): xAxis.axisLabel.interval ∈ [4, 8]；渲染标签数 >= 12；首末日期必现
- [ ] B10 (9 组合): endLabel.position = 'right'；formatter 不含"今日"；endLabel 宽度 <= gridMain.right 预留中的 36px 缓冲区
- [ ] B11 (P0×7d markPoint): symbolSize = 14；label font = 14；markPoint.top 像素 ≥ canvas.top + 3（越顶 = 0）
- [ ] B12 (P0×30d markPoint): symbolSize = 12；label font = 13
- [ ] B13 (P0×90d markPoint): symbolSize = 10；label font = 12
- [ ] B14 (compact 档 3 周期): xAxis.axisLabel.rotate = -15

## 模块 C：buildSubOption 边界参数
- [ ] C1 (9 组合): yAxis.axisLabel.margin = 10；align = 'right'；label 最左字符不越 canvas 左 3px
- [ ] C2 (9 组合): xAxis.boundaryGap = true；双柱不超 grid 左右竖线
- [ ] C3 (P0×7d): barWidth = '38%'；barGap = '20%'；barMaxWidth <= 20
- [ ] C4 (P0×30d): barWidth = '42%'；barMaxWidth <= 16
- [ ] C5 (P0×90d): barWidth = '48%'；barMaxWidth <= 12
- [ ] C6 (P0×7d): xAxis.axisLabel.interval = 0；hideOverlap = false → 7 个日期全显
- [ ] C7 (P0×30d): 标签渲染数 >= 8；首末日期必现
- [ ] C8 (P0×90d): 标签渲染数 >= 12；首末日期必现
- [ ] C9 (9 组合): series[0]/[1] 末柱 top label distance >= 4，label 顶部不越 canvas.top + 3
- [ ] C10 (compact 档): xAxis.axisLabel.rotate = -20

## 模块 D：TrendChart 透传 & 行为
- [ ] D1: TrendChart Props 字段不变（data7/data30/data90/insights + prev×3 可选），父组件零修改
- [ ] D2: hiddenSeries 变化 → useMemo 重算 → boundaryGap 在 ['15%','15%'] / false 间切换（用 ECharts option 快照）
- [ ] D3: range 变化 → useMemo deps 触发，ECharts option key 变化触发 resize 防抖 200ms + notMerge=false
- [ ] D4: hiddenSeries 变化 rate 显/隐 2 次后，主图 canvas 无残留 stale 柱（视觉检查）
- [ ] D5: KPI 4 张不重叠、比例 6:4、主辅 >= 2.5（V3 回归）
- [ ] D6: 主/辅图 Y 轴 name 仍为空字符串，单位信息只在顶部 DOM 小字展示（V3 回归，防与单位标签重叠）
- [ ] D7: 左栏 canvas / canvas 背景 + 渐变、右下角 tooltip 按钮不越界（视觉）

## 模块 E：样式兜底
- [ ] E1: `.TCC-mainChart, .TCC-subChart` overflow = hidden；border-radius = 6px；background = `#F8FAFC→#FFF`（V3 渐变保持）
- [ ] E2: 1080p/compact 档 outline = 1px solid var(--tcc-border)（可选）；不影响布局
- [ ] E3: 拖拽窗口 2560 ↔ 1920 ↔ 1600 三次切换，每次 canvas 0~80ms 完成重排，无明显卡顿或卡白屏

## 模块 F：构建 & 自动化脚本 & 最终报告
- [ ] F1: `npm run type-check` exit 0
- [ ] F2: `npm run build` exit 0
- [ ] F3: `grep -rn 'any\\|@ts-ignore' admin-web/src/pages/dashboard/{useResolutionTier,echartsOptions,TrendChart}.tsx` = 0 条
- [ ] F4: `scripts/verify_canvas_fit_v4.py` 创建成功，可独立 `python scripts/verify_canvas_fit_v4.py` 运行
- [ ] F5: 脚本 9 组合 → 18 张截图成功保存到 `out/fit_v4/*.png`
- [ ] F6: 脚本断言 (a) KPI=4, 比例≈1.5 ±0.1 → 9 组合 9/9 通过
- [ ] F7: 脚本断言 (b) canvas 左右 clip 越界像素=0 → 9 组合 9/9 通过
- [ ] F8: 脚本断言 (c) X 标签数量阈值 7d>=7/30d>=8/90d>=12 → 27 断言 >= 25 通过
- [ ] F9: 脚本断言 (d) 主图 rate 柱色 COLOR_RATE 在 grid 外像素数 = 0 → 9 组合 9/9 通过
- [ ] F10: `out/fit_v4/report.md` 生成，附 18 张截图路径和每组合通过/未通过列表
- [ ] F11 (用户签字确认): 实机截图 7d/30d/90d 红框 3 问题 100% 消失，用户已肉眼确认（由人工勾选）

---

> 总断言数：A(8) + B(14) + C(10) + D(7) + E(3) + F(11) = **53 项**，其中 **P0 用户实机档 7/30/90 = 18 项必须全 [x]**，剩余 P1/P2 允许 ≤2 项由人工补充截图核验。
