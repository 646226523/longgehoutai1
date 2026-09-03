# 数据趋势布局 V3（trendchart-layout-cockpit-v3） - 验证 Checklist

说明：每项检查都是具体可操作的（"是什么，怎么测"）。Checklist 共 6 模块 99+ 检查点。
- [ ] = 待测
- [/] = 进行中
- [x] = 通过

---

## 模块 A. 构建与类型基线（T1/T2/T6）权重 5%
- [ ] A1. `npm run type-check` 退出码 0；TrendChart 5 文件 0 error
- [ ] A2. `npm run build` 退出码 0；TrendChart 相关 0 warnings（全局 chunk size 警告不算）
- [ ] A3. grep `@ts-ignore` 5 文件 → 0 条；grep `: any` 5 文件 → 0 条；grep `as any` 5 文件 → 0 条
- [ ] A4. Props 接口 7 keys（6 字段 + 3 可选 prev）完整匹配，无新增必填字段 → 向后兼容
- [ ] A5. tree-shake：`grep -iE "buildStockPath|MainChart\.tsx|SubChart\.tsx|TrendTooltip" dist/assets/index-*.js` → 0 条（确保不回归旧 SVG）
- [ ] A6. `useResolutionTier.ts` LayoutV3 存在 3 档 cardHeight = 840/700/600，与 PRD 表 ===
- [ ] A7. LayoutV3.columns {leftPct:60,rightPct:40,gap:16} 之和 = 100
- [ ] A8. smoke-press.cjs 3×build exit 0；Δ heap ≤ 1MB
- [ ] A9. TrendChart.tsx ≤ 580 行（NFR-5，可维护性）
- [ ] A10. echartsOptions.ts / trend-data.ts / useResolutionTier.ts 未删除现有导出（其他模块引用不破坏）

---

## 模块 B. 6:4 双栏结构（AC-1 / FR-1）权重 15%
- [ ] B1. 卡片区存在 `.TCC-body` 和 `.TCC-columns` 两个根容器 DOM
- [ ] B2. `.TCC-columns` `gridTemplateColumns` 计算 `leftPx / rightPx = 1.5 ± 0.04`（60/40 ± 2%）
- [ ] B3. `TCC-left` 下存在 2 张 canvas（主 + 辅），按从上到下布局
- [ ] B4. `TCC-right` 下按顺序存在：4 个 KPI / StatsDrawer / InsightBar（子元素顺序正确，数量正确）
- [ ] B5. 左栏 Canvas 总面积 = 主宽×主高 + 辅宽×辅高 ≥ 卡片总内面积 (cardH-48-40) × cardW × **0.72**（AC-1 G3 72%）
- [ ] B6. 三档独立高度：
  - [ ] B6.1 2K 档（≥1441px）外层 clientHeight = 840 ± 2
  - [ ] B6.2 1080p 档 700 ± 2
  - [ ] B6.3 compact 档 600 ± 2
- [ ] B7. 左栏主辅两 canvas 高度比 = 0.70 / 0.26 ± 0.02（PRD 520:180 etc.）
- [ ] B8. TitleBar 48px / LegendBar 40px 占用正确，不重叠 KPI 或 Canvas
- [ ] B9. 外层 overflow = `overflow-x:hidden; overflow-y:auto`（非 hidden，不再裁内容）
- [ ] B10. 90d compact 档 scrollHeight - clientHeight ≤ 2（AC-4，不出纵向滚动）

---

## 模块 C. 12 项旧 Bug 零回归（AC-2 / Diff 清单 12） 权重 25%
> 每个点在 9 组合（3res × 3range）下 × 1 测 = 108 断言，PASS 108。

- [ ] C1. 主图终点值 vs 右 Y 标题 DOM：**间距 ≥ 10px**（根治 #2 endLabel 叠 Y 名）
- [ ] C2. 峰值 markPoint 气泡 vs 最近柱顶 rect：**y 差 ≥ 14px**（根治 #10 压柱）
- [ ] C3. 辅图 NFT 柱顶值标签 vs 活跃用户柱顶标签：**y 差 ≥ 6px 或 左右错开 ≥ 8px**（根治 #3 双今日重叠；现在应该无"今日"词但仍要避免同高）
- [ ] C4. 底部 LegendBar 文字 bottom vs 辅图柱 top：**diff ≥ 8px**（根治 #4 legend 滑入辅图）
- [ ] C5. 4 张 KPI 文字 value bottom vs StatsDrawer 顶部：**diff ≥ 8px**
- [ ] C6. StatsDrawerVertical 第 4 行（活跃用户 峰值日期）vs InsightBlock 顶部：**diff ≥ 6px**（根治 #5 4×3 截断）
- [ ] C7. Segmented + 导出按钮最小宽 ≥ 420px，compact 档不换行（根治 #7 操作区挤压）
- [ ] C8. 左 Y axisLabel "0 羽" 与卡片左侧距离 = grid.left（≥ 36px），不再被 name.start 重复叠（根治 #8）
- [ ] C9. 横向 scroll 检查：Card scrollWidth = clientWidth（根治 #9 横向 4px 滚动条）
- [ ] C10. 两 canvas 大小与外层容器 box 对齐：主 853×394 等不再固定死（根治 #10 canvas 限死尺寸导致压缩变形）→ canvas.width = 外层 offsetWidth × dpr
- [ ] C11. Canvas 内 legend 全隐藏：调用 `mainECharts.getOption().legend[0].show === false` & sub 同（根治 #12 图例 2x 冗余）
- [ ] C12. 所有显示"终点值" / "柱顶值"的 3 处数值文本：`indexOf('今日') === -1`（根治 #1 #5 二义性重复 → 今日统一只在右侧 KPI 出现）

---

## 模块 D. 数据与操作（AC-5/6/7/8/9/13/14） 权重 20%
### D1. 数据正确性
- [ ] D1.1 右栏 4 KPI 显示值 = v2Data[-1].geneStock / .geneRatePct / .nftDaily / .userDaily
- [ ] D1.2 环比 3 态：`>0.1` 显示 `+X.X%`，`< -0.1` 显示 `-X.X%`，abs ≤ 0.1 显示 `持平`
- [ ] D1.3 数值格式化：`toLocaleString('zh-CN')` 千分位（1,758 羽 / 158 个 / 18 人）
### D2. StatsDrawerVertical（竖表）
- [ ] D2.1 4 × 3 = 12 格文本非空
- [ ] D2.2 环比 总计格 = `—`（emdash，不得为 0 或 null）
- [ ] D2.3 存量总计 = v2[-1].geneStock，NFT 总计 = Σ nftDaily（7d/30d/90d 分别）
- [ ] D2.4 峰值日期 4 格 = calcExtremes / getDimensionStats 返回日期（字符串一致）
### D3. LegendBarBottom 联动
- [ ] D3.1 点击奇数次 → hiddenSeries.has(key) = true → ECharts `option.legend.selected[name] === false`
- [ ] D3.2 点击偶数次 → has false；selected true
- [ ] D3.3 状态 icon ✓/✕ 颜色 ✓ 绿 `#52c41a` ✕ 红 `#ff4d4f`
- [ ] D3.4 hover 图例 0.5s 主 canvas dispatchAction highlight 对应系列（肉眼可观察 + 高亮事件触发）
### D4. CSV 导出（FR-8）
- [ ] D4.1 文件名 `trend_{week7|week30|week90}_YYYYMMDD.csv` 正确
- [ ] D4.2 首字符 = `\uFEFF`（UTF-8 BOM，防乱码）
- [ ] D4.3 行数 = header (1) + 7 / 30 / 90（对应 range）
- [ ] D4.4 6 列：日期 / 基因日增 / 存量 / 环比(%) / NFT日铸 / 活跃用户
### D5. Tooltip 与 KPI 高亮脉冲
- [ ] D5.1 主图 mousemove → 辅图 showTip（十字准星）仍保留（原 FR-9，不回归）
- [ ] D5.2 主图 hover last index → 4 张 KPI className 含 'is-highlighted'（AC-13）
- [ ] D5.3 last index hover 时，4 KPI.value 有瞬时 pulse 动画（视觉 + CSS animation 存在）
### D6. markPoint 气泡离柱
- [ ] D6.1 convertToPixel({seriesIndex:1}, {dataIndex:maxDailyIdx, value:maxGeneRate}) y 像素 - markPoint pixel y ≥ 14px（AC-14）
- [ ] D6.2 谷值气泡同理 ≥ 14px 下方
---

## 模块 E. 性能与稳定（AC-9/10/NFR-1/2） 权重 10%
- [ ] E1. 冷加载后 10× 周期切换（week7→30→90→7×…）**中位数 ≤ 200ms**
- [ ] E2. P95 切换 ≤ 260ms
- [ ] E3. 5 分钟 / 15 次 range 切换 Chromium heap Δ ≤ **6MB**
- [ ] E4. 图例点击 20 次，ECharts instance uid 不变（不重建实例）
- [ ] E5. resize 20 次：主辅 canvas.width = outer × dpr（响应不锁死）
- [ ] E6. 冷加载停留 1 分钟 page.error = 0（非第三方）

---

## 模块 F. 现代中台视觉与 a11y（AC-15/FR-10） 权重 10%
### F1. 视觉评审分 ≥ 4.2/5
- [ ] F1.1 2K / 近 7d 截图：视觉协调
- [ ] F1.2 1080p / 近 30d 截图：信息清晰
- [ ] F1.3 compact / 近 90d：不麻花，无碰撞
### F2. a11y（FR-10）
- [ ] F2.1 卡片区 `role="region" aria-label="数据趋势模块 6:4 驾驶舱"`
- [ ] F2.2 左栏 `aria-label="主辅双图"`
- [ ] F2.3 4 KPI 分别有 aria-label 4 条
- [ ] F2.4 底部 LegendBar `role="toolbar" aria-label="图例显隐切换 共 4 项"`
- [ ] F2.5 每个图例项 `tabindex=0` + `role=button` + `aria-pressed`（隐藏态 true / 显示 false）
### F3. 三档字号
- [ ] F3.1 2K: KPI 数值 24px / 标题 13px
- [ ] F3.2 1080p: 22 / 12
- [ ] F3.3 compact: 20 / 12
### F4. dataZoom
- [ ] F4.1 2K / 90d：主图底部可见 dataZoom slider（≥ 24px 高）
- [ ] F4.2 其余档 无 dataZoom（节省 26px 空间给图）
---

## 模块 G. 截图矩阵签字（Task 8 / J 模块） 权重 15%
> 9 分辨率 × 周期 = 9 组合，每组合 2 张 = 18 张；命名 `trend_v3_{W}x{H}_{range}_{page|card}.png`

- [ ] G1. 2560×1440 / week7: **2 张 ≥ 50KB**
- [ ] G2. 2560×1440 / week30
- [ ] G3. 2560×1440 / week90: dataZoom 可见
- [ ] G4. 1920×1200 / week7
- [ ] G5. 1920×1200 / week30
- [ ] G6. 1920×1200 / week90: X 轴无重叠
- [ ] G7. 1920×1080 / week7: 横向滚动 = 0
- [ ] G8. 1920×1080 / week30
- [ ] G9. 1920×1080 / week90: compact X 轴旋转 -15° 不麻花
- [ ] G10. 18 张图 12 Bug × = 216 点人工检查全 PASS（可抽样，≥ 108 点自动 PASS）
- [ ] G11. 3 张近 7d（各分辨率）`/今日/g` 统计 = **4 次（4 个 KPI） ± 0**
- [ ] G12. 导出 3 份 CSV（3 res × 1 次）打开 Excel 无乱码，行数正确
- [ ] G13. 3 张左 Y 轴单调性（刻度依次增大，无倒序）→ PASS
- [ ] G14. 3 张终点大数值不遮挡任何标签 → PASS
- [ ] G15. 数值核对：主 1 + 辅 2 柱顶值 = v2[-1]（3 张随机）→ 完全一致
- [ ] **G16. 用户签字确认**：18 张截图视觉无「麻花 / 重叠 / 二义性 / 溢出」（唯一 留给用户的 [ ]）
