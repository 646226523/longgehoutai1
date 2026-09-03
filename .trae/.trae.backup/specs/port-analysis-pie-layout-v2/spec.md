# 注册端口/登录端口分析饼图重构 V2 - Product Requirement Document

## Overview
- **Summary**: 对 Dashboard 第二行「注册端口分析」「登录端口分析」两张 Ant Card 进行视觉重构。根因是：现有 `PortAnalysisChart.tsx` 采用"左图例 + 右饼图"左右两栏 5:5 硬分布局，在 xl=8 (≈ 33% 宽度) 的 Col 约束下，饼图仅拿到 180px 宽，导致 SVG viewBox 180×180 外围 percent 标签（`41.1% / 28.5%` 等）因 `textAnchor=start/end` 固定贴边、超出 card-body 范围被浏览器裁剪；图例侧列 4~5 行的"端口名 + 数值 + 占比"三元素挤在仅 400~500px 卡片宽的左栏，数字和百分号贴右边界导致视觉上与饼图争夺空间。
- **Purpose**: 解决运营人员肉眼可见的三处痛点：① 饼图外侧百分号被 card 右边缘或上/下边缘遮挡；② 图例区"通道名（字左）+ 数值（字右）"两端分散对齐在窄卡片中产生视觉断裂；③ 两卡片缺少"总量 KPI 数字"信息，运营必须手算才能知道总注册/总登录人数。
- **Target Users**: 后台运营（每日必看工作台 3 次以上）、超级管理员、渠道投放经理（对比网页/APP/小程序注册占比）。

## Goals
- **G-1 [布局重排]**: 将"左图例 5 / 右饼 5"的横排二分式改为"上方标题行 + 总量 KPI 数字条 + 下左右图例区/饼图区"的 **四分舱布局**，图例与饼图通过宽度计算自动获得充足空间。
- **G-2 [标签防遮]**: 饼图外部百分号标签由"直接贴边的 text"升级为 **内/外双半径 + 引线 (leader line)** 标注系统，保证最大扇区 `41.1%` 与最小扇区 `6.8%` 在任何 33% 列宽下均完整露出，不进入 card padding 外。
- **G-3 [信息完備]**: 每张端口分析卡顶部新增 **「总量」粗体大数字 + 环比昨日箭头** 的 KPI 摘要条，运营第一眼不必手算。
- **G-4 [三档自适应]**: 对 2560 / 1920 / 1600 三档分辨率，卡片最小高度、图例字体大小、饼图直径按 useResolutionTier 规则阶梯缩放，保证"不遮挡 / 不越界 / 不出现横向滚动"。

## Non-Goals (Out of Scope)
- **NG-1**: 不把 PortAnalysisChart 替换为 ECharts pie（现有 SVG 扇区 hover 高亮 + tooltip 已满足基本交互，升级引线即可）。
- **NG-2**: 不改 mockData 接口字段，`PortAnalysisData` 的 `{channel, value, color}` 三字段保持完全兼容，父组件 [Dashboard.tsx](file:///p:/龙鸽项目/longgehoutai/admin-web/src/pages/Dashboard.tsx#L66-L71) 不新增 props。
- **NG-3**: 不新增 CSV 导出或 Segmented 周期切换（端口分析目前无多周期需求，暂不扩展）。
- **NG-4**: 不改 Card 所在 Col 的 `xl=8` 栅格比例（用户截图反馈的是卡片内部，不是栅格列宽）。

## Background & Context
- 当前实现在 [PortAnalysisChart.tsx](file:///p:/龙鸽项目/longgehoutai/admin-web/src/pages/dashboard/PortAnalysisChart.tsx#L1-L140)：
  - line 78-81: SVG viewBox 硬编码 `0 0 180 180`，外层 max-width:180px；
  - line 42-45: 百分号 label 半径固定 `RADIUS + 18 = 78`，在 viewBox 宽度 180 下，右侧 label 的 `textAnchor=start` 会把 `41.1%` 渲染到 x≈164，仅留 16px 空间（5 字符 font-12 约 40px 宽），直接超出 svg 右边界被父 div 裁剪；
  - line 66-76: 图例区是 `flex:1` 撑满左侧剩余空间，在卡片宽 ~520px 下，图例可获 ~340px，而"网页注册 1234 (41.1%)" 单行长约 220px，虽然够长但 4 行贴左堆叠视觉失衡，通道名与占比没有引导线关联对应；
  - 数据来源 [mockData.ts](file:///p:/龙鸽项目/longgehoutai/admin-web/src/pages/dashboard/mockData.ts) 的 `registerPortData`(4 条) 与 `loginPortData`(5 条)，最大差值条数 5 条 vs 4 条，导致两卡图例行数不同但饼图直径相同 → 右留白不均。
- 技术栈约束：已引 ECharts 5、Ant Design Card、React 18、match-media 三档分辨率 Hook（`useResolutionTier.ts` 已存在）。
- 参考同页的 TrendChart 已完成 6:4 双栏驾驶舱式重构的视觉语言，端口分析卡需保持 **圆角 6px、极浅背景渐变、虚线网格感、粗体末点数字** 相同的视觉令牌（沿用 `--tcc-*` 变量或新立 `--pac-*` 变量）。

## Functional Requirements
- **FR-1 四分舱布局**: 每张卡片 card-body 内部采用垂直四行结构：
  1. 标题（已由 Ant Card `<Card title>` 提供，不重复）；
  2. **KPI 总量条**：左侧粗体总量 `总计 N 人/个`，右侧环比昨日 ↑x% 或 ↓y%（环比 mock 数据可在 PortAnalysisData 扩展 `prevValue?`，未提供则显示 `— —`）；
  3. **主体二栏**：左侧图例区（flex 6 份），右侧饼图区（flex 5 份），gap 固定 20px（三档同值）；
  4. 底部可留 4px padding 视觉呼吸。
- **FR-2 饼图引线标注**:
  - 每扇区生成三条路径：**起点短横线（扇边外 2px 切向）→ 引线（8~14px 长度，0°/90°/180°/270°附近走直线，其余象限按 45° 方向外扩）→ 末端横杠（长度 4px）** + 百分号文本放在横杠外侧；
  - `textAnchor` 策略：圆心以右→start，圆心以左→end，正上/正下居中兜底；
  - 标注分两档：`percent >= 8%` 才显示外部引线文字，否则只在扇区内部写小字号数值（5%≤percent<8% 内显；<5% 完全不显，只靠 tooltip 看）；
  - 引线路径应在扇区 hover 变 opacity 时保持 100% 不透明度，避免引线跟着淡掉。
- **FR-3 图例智能对齐**:
  - 图例每一行统一四格：色块 / 通道名（flex:1 左对齐）/ 计数（右对齐 font-weight:600）/ 括号百分号（右对齐 gray-2）；
  - 四格之间的分隔采用 `justify-content: space-between` 加 `min-width` 约束，防止"通道名字长短不一导致数值跳位"；
  - 每行 hover 时背景变 `var(--pac-hover)` 并同步高亮饼图对应扇区（与现有 hoverIndex 逻辑打通，现有逻辑只能 path→hoverIndex，要新增 legend row→hoverIndex 回写）。
- **FR-4 SVG viewBox 动态计算**:
  - 现有 `viewBox="0 0 180 180"` 改为按 `canvasW=2R+2*LABEL_AREA_PAD` 自动推：例如 R=70, LABEL_AREA_PAD=52 → viewBox `0 0 244 180`（或 264×264 对称方 viewBox），保证引线文本永远落在 viewBox 内而不被 svg 自身裁掉；
  - svg 外层 `max-width` 不再写死 180，而用 `min-width:200px; max-width: 100%`，让容器 flex 5 能按实际列宽自适应。
- **FR-5 三档缩放**:
  - 2k 档：饼 R=78、图例 font=14、KPI 数字 font=20、卡片 minH=280；
  - 1080p 档：饼 R=66、图例 font=13、KPI 数字 font=18、卡片 minH=256；
  - compact 档：饼 R=56、图例 font=12、KPI 数字 font=16、卡片 minH=232；
  - 直接复用 `useResolutionTier` 返回的 tier，不新增 hook。
- **FR-6 纵向卡片等高**: 同 Row 的三张（预警中心 / 注册端口 / 登录端口）因 loginPortData 比 register 多一条图例行，必须通过 `min-height` 配合 `Card body` 内部 flex layout 保证两者等高（Ant Card 外层已有 `display:flex; width:100%; height:100%` 容器驱动）。

## Non-Functional Requirements
- **NFR-1 [防遮挡]**: 三张截图（2k/1080p/compact）各取 2 张端口卡，`引线+文本` 的所有像素在 svg viewport 范围内（即 boundingClientRect 的 `x >= card-body x`、`x+w <= card-body x+card-body w`、`y >= card-body y + KPI条H`、`y+h <= card-body y+h`），0 像素溢出。
- **NFR-2 [响应性能]**: hover 切换高亮扇区 < 80ms 响应；DOM 节点数不超过原版本 1.4×（原≈70 节点，新≤98）。
- **NFR-3 [可测]**: 导出纯函数 `calcPieSlicesWithLeads(data:PortAnalysisData[], R, pad)` 便于单测验证 `labelX/Y + leaderLine endpoint` 均落在 viewBox 内。
- **NFR-4 [跨浏览器一致]**: Chrome ≥120、Edge ≥120 下，SVG 路径和字体渲染一致；不依赖 Safari 的 `dominant-baseline:-webkit-middle` 私有前缀（目前代码就没有，保持）。

## Constraints
- **Technical**: React 18 + TypeScript strict + Ant Design 5 `Card size="small"` 样式；SVG 2.0（不含 foreignObject）；CSS 变量沿用 `:root`，不引 Tailwind。
- **Business**: 上线窗口 1 个工作日，只改单文件 `PortAnalysisChart.tsx` + 可选的 `PortAnalysisChart.css`，不改其他文件；不能影响 TrendChart、AlertCenter、MetricCard、QuickEntry 其他四块渲染。
- **Dependencies**: 复用已有的 `useResolutionTier`；**禁止**引 `echarts/lib/chart/pie`（当前包体 trendChart 已够大）。

## Assumptions
- **A-1**: 昨日环比 mock 数据可直接在 `mockData.ts` 的 `PortAnalysisData` 每条上加一个可选字段 `prevValue?: number`，若后端未接回来则统一渲染为 `—`，不对零值做除零报错。
- **A-2**: 用户屏幕实际是 1920×1080 主流通用屏（xl 断点 1200 命中 Col xl=8 → 每列宽 (1920-左右padding-gutter*2)÷3 ≈ 600px 左右），截图即此档；2k 和 compact 通过 Playwright viewport 模拟复现。
- **A-3**: 最小扇区占比 ≥3%（目前 login 最小 6.8%），对 <3% 极端值只靠 tooltip，此约束由 mock 保证，重构期不需处理重叠标注避让算法（线性推引线即可）。
- **A-4**: 中文通道名最长 6 字（"第三方 OAuth/扫码登录"），图例行最小宽度按 14px font × 22 字符 ≈ 308px，因此列宽 ≥420px 时一定够（xl=8 最小宽约 372px，compact 档会自动缩 font=12 → 约 264px，安全）。

## Acceptance Criteria

### AC-1: 外侧百分号完整可见（不被卡边遮挡）
- **Given**: 登录端口分析卡最小扇区 6.8% 位于饼图顶部、注册端口分析卡最大扇区 41.1% 位于饼图右部  
- **When**: 在 1920×1080 viewport 下渲染工作台  
- **Then**: 两张卡扇区外部的 4~5 个百分号文本（`34.8% / 27.5% / 18.3% / 12.7% / 6.8%`）全部完整可读，每个字符 ≥100% 显示于 card-body 内部；引线末端横杠与文本距离 ≥2px，引线颜色 `#d9d9d9`
- **Verification**: `human-judgment`（Playwright 截图裁剪 + DOM 坐标断言混合）

### AC-2: 图例行四格对齐，数值与通道名不再视觉断裂
- **Given**: 注册端口卡四行图例（网页/APP/小程序/OAuth），其中通道名字长 4~8 字混合  
- **When**: 在 2k / 1080p / compact 三档任一档下渲染  
- **Then**: 四列（色/名/数/%）垂直对齐；**所有行的数字列左边缘与数字列右边缘各自对齐**（视觉上是一条竖线）；长名字"第三方 OAuth"自动省略（`text-overflow:ellipsis`）不折行；hover 任意图例行 → 对应饼扇区 opacity=1，其他扇区 opacity=0.55
- **Verification**: `human-judgment`

### AC-3: 顶部 KPI 总量条展示完整，环比昨日正常渲染
- **Given**: mockData 给每张卡 data[].prevValue 都赋值  
- **When**: 初次渲染  
- **Then**: KPI 条左：粗体总计 `总计 N 人`；KPI 条右：带 ↑↓ 的环比 `较昨日 ±X%`；若 prevValue 缺失（undefined），则右侧显示 `— —` 不报错；总计数字 = Σdata[i].value，严格等于
- **Verification**: `programmatic`（写一个简单 Playwright 断言 innerText 含总计且数值正确）

### AC-4: 3 档分辨率下零横向滚动与零越界
- **Given**: 2560×1440 / 1920×1080 / 1600×900 viewport  
- **When**: 分别渲染工作台并滚动到第二行三张卡  
- **Then**: Row scrollWidth ≤ clientWidth（无横向滚动）；`PortAnalysisChart` svg 的 getBoundingClientRect 的 top/left/right/bottom 全部在父 `ant-card-body` 内部；左右 margin 均 ≥ card padding=16px
- **Verification**: `programmatic`（verify 脚本断言）

### AC-5: hover 扇区 ↔ hover 图例双向联动
- **Given**: 登录端口卡第三方登录扇区处于未选中态  
- **When**: 用户鼠标移入图例第五行"第三方登录"  
- **Then**: 饼图紫色扇区高亮 `opacity=1`，其他 4 扇 `opacity=0.55`；tooltip 跟鼠标显示 `第三方登录: 456 (6.8%)`；移开 150ms 内恢复
- **Verification**: `human-judgment`（配合 Playwright 截图对比）

### AC-6: 类型安全与构建通过
- **Given**: 代码已合入当前 feature 分支  
- **When**: 执行 `npm run type-check && npm run build`  
- **Then**: exit 0，TS 0 错误；dist 产物中 `Dashboard.*.js` 不出现 undefined / NaN 字样（用字符串检索）
- **Verification**: `programmatic`

## Open Questions
- [ ] 注册/登录端口的"昨日环比数据"应由 mockData.ts 直接写死？还是通过 useQuery 调真实 API？（假设 A-1 先写死）
- [ ] 是否需要在饼图正中心显示「总量 N」空心 donut 效果？当前 Goals 未列，如不答则默认不做 donut（仍为完整 pie）。
- [ ] 图例行是否需要加"点击后全显高亮仅该项"的下钻交互？Goals 未列，默认只做 hover 联动。
