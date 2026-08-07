# 注册端口 / 登录端口饼图内外标签统一 V3 - 产品需求文档 (PRD)

## Overview
- **Summary**: 针对 Dashboard 工作台两张端口分析饼图（注册端口 / 登录端口）当前存在的「一个参数百分比被塞在饼图内部、与其他 4~3 个外显标签风格不一致」问题做一次性修复：统一所有扇区（无论占比 ≥1% 及以上）全部外显 + 引线系统；并新增邻近外显标签的竖向碰撞规避，避免把最小项强行拉到外面后与相邻扇区的标签重叠。
- **Purpose**: 饼图所有扇区的百分号展示口径统一，杜绝视觉上出现「有的在里有的在外」的不协调，同时把最小项那 7.8% / 6.8% 也展示在饼外跟其他扇区一样遵循引线规则，符合运营肉眼扫读习惯。
- **Target Users**: 运营人员 / 超级管理员 / 数据分析师

## Goals
- G-1 所有端口饼图扇区占比 ≥ 1% 的百分号 **全部外显**，不再有一个在内一个在外的风格分裂
- G-2 同象限相邻引线标签自动避让，任意两个外显文本在 x/y 方向上的 bbox 距离 ≥ 4px，不能出现叠字
- G-3 外显文本末端到饼图所在 Card 的 body 四条边的留白 buffer ≥ 6px（右/左/上/下），不被裁剪
- G-4 三档分辨率（2560/1920/1600）下 注册卡 4 扇区 + 登录卡 5 扇区 全量引线无越界、无叠字
- G-5 原交互（双向 hover 高亮 / KPI 总量条 / Tooltip / 图例对齐）保持不变、不回归

## Non-Goals (Out of Scope)
- NG-1 不引入 ECharts pie 或其他饼库，仍使用手写 SVG `<path>` + leader line
- NG-2 不把 0.9% 以下极端小扇区也外显（保留 Tooltip 兜底即可）
- NG-3 不调整图例布局 / 不新增空心 donut 中心总量
- NG-4 不做 click 下钻只高亮一项的状态

## Background & Context
- 现有 V2 实现在 `calcPieSlicesWithLeads` 里设置了两道阈值：`showOuterMinPct = 8`（≥8% 外显）和 `showInnerMinPct = 5`（5~7.9% 内显），导致注册卡的 7.8%（第三方 OAuth / 紫）、登录卡的 6.8%（第三方登录 / 紫）刚好落在 5~7.9% 区间内被放到饼内。
- 运营一眼看过去看到「4 个在外 + 1 个在内」会误以为那一项是不是「没数据」或「没正确渲染」，口径不统一。
- 技术栈：React 18 + TS Strict + AntD Card + 手写 SVG viewBox 2*(R+padOuter)，R 按 tier 取 78/66/56，padOuter=72（V2 已扩到满足 41.1% 右边界 buffer）

## Functional Requirements
- **FR-1**: 重写 `calcPieSlicesWithLeads` 的阈值逻辑——凡 `percent >= 1` 一律外显（textOuter=true），同时移除 `innerText` 分支（兼容接口保留字段，但生成时不再产出 innerText 对象，避免将来有扇区跑到饼里）。
- **FR-2**: 增加「邻近竖向碰撞规避」——对所有生成好的外显 label，按 labelSide（left/right）分两列依次扫描：若后一个 label 的 y 与前一个 label 的 y 差绝对值 < 14px（即 1 行 12px 字高 + 2px 间距），则对后一个 label 的 `labelAnchorY`、p2y、p2BarEndY 同步做 nudge（偶数号项 +8px，奇数号项 -8px），并同步重算引线路径，确保铅垂线末端跟着走。
- **FR-3**: 对被 nudge 后的引线仍保留三段式结构（饼边切线小段 -> 径向段 -> 末端横杠），横杠方向始终保持水平（横杠长度保持 4px），不出现斜向横杠。
- **FR-4**: `innerText` 生成逻辑全部清空（恒为 undefined），渲染层 `<g>{slice.innerText && <text>...</text>}</g>` 保留但不会有任何元素命中，保证代码向后兼容。
- **FR-5**: 边界修正：若最右 labelAnchorX + 文本宽度估算（4 字 * 12px ≈ 36px）超过 `viewBoxWidth - 6`，则 `anchorRadius` 从 `R+32` 自动收缩到 `R+22`、`p2BarEndX` 同步左移，确保 buffer ≥ 6px；同理若最左 `labelAnchorX - 36 < 6` 则 anchorRadius 收缩；同理上/下 `y - 6 < 6` 或 `y + 6 > viewBoxHeight - 6` 时做竖向收缩。

## Non-Functional Requirements
- **NFR-1 (可读性)**: 登录卡 5 个外显标签（34.8 / 27.5 / 18.3 / 12.7 / 6.8）的 y 轴两两间距 ≥ 14px，肉眼一条一条不叠
- **NFR-2 (性能)**: `calcPieSlicesWithLeads` 为纯函数 O(n²)，n ≤ 7，总耗时 ≤ 0.05ms（肉眼 0 帧）
- **NFR-3 (兼容)**: `PieSliceWithLead` 接口字段不增不减（`innerText` 字段保留类型但永远 undefined），所有上游调用方无需修改
- **NFR-4 (安全/构建)**: `npm run type-check` exit 0；`npm run build` exit 0

## Constraints
- **Technical**: TS Strict + React 18 + 原生 SVG；不允许用 ECharts pie；不依赖 `d3-force` 等布局库（自己写简单 nudge）
- **Business**: 不改 mock 数据；注册 4 项 1234/856/678/234，登录 5 项 2345/1856/1234/856/456 比例保持不变
- **Dependencies**: 依赖 `useResolutionTier` tier 计算 `actualR`，不新增外部依赖

## Assumptions
- A-1 所有外显标签文本长度统一 4 字符 `XX.X%`（`toFixed(1)` 最多 4 字符），估算宽度 36px 可信
- A-2 饼图 n ≤ 7（注册端口最多 4 个+预留 3 个扩展；登录最多 5 个+预留 2 个），O(n²) 无性能问题
- A-3 用户要「全部外显」是指 ≥ 1% 的项，极端小扇区（<1%）仍用 Tooltip，不在本次强制外显范围内

## Acceptance Criteria

### AC-1: 所有 ≥1% 扇区外显
- **Given**: 浏览器打开 Dashboard 工作台 1920×1080
- **When**: 检查两张饼图所有 `<text class="PAC-leadText">` 个数
- **Then**: 注册卡 **4 条 leadText**（41.1 / 28.5 / 22.6 / 7.8）；登录卡 **5 条 leadText**（34.8 / 27.5 / 18.3 / 12.7 / 6.8）
- **Verification**: `programmatic`（`querySelectorAll('.PAC-leadText').length`）
- **Notes**: 用 Playwright 或 DevTools 均可验证数量

### AC-2: 内显 DOM 为 0
- **Given**: 同上
- **When**: 执行 `querySelectorAll('.PAC-innerText')`
- **Then**: 返回空 NodeList（两项内显的 7.8 / 6.8 已挪到外面，内层不应该再有文本节点）
- **Verification**: `programmatic`

### AC-3: 登录卡 5 标签两两不叠字
- **Given**: 1920×1080 档
- **When**: 对 5 个 `.PAC-leadText` 取 `getBBox()`，比对两两之间的 y 距离
- **Then**: 任意两 bbox 的垂直距离 ≥ 4px；若 x 还重叠（同一侧），则 y 距离必须 ≥ 14px
- **Verification**: `programmatic`（Playwright `evaluate` 里算）

### AC-4: 四边 buffer ≥ 6px
- **Given**: 2560 / 1920 / 1600 三档
- **When**: 取所有 `.PAC-leadText` bbox 极值 & 引线最大端点
- **Then**: `minX ≥ 6`、`maxX ≤ viewBoxWidth - 6`、`minY ≥ 6`、`maxY ≤ viewBoxHeight - 6`（1600 档 compact 也满足）
- **Verification**: `programmatic`

### AC-5: 回归原交互
- **Given**: 两卡 1920×1080 档
- **When**: 图例 hover 第 5 行「第三方登录 456 6.8%」
- **Then**: 对应扇区高亮（opacity=1，其他扇区 opacity=0.6）；6.8% 对应的 lead line 不透明度仍 1
- **Verification**: `human-judgment`

### AC-6: 类型 + 构建
- **Given**: `cd admin-web`
- **When**: `npm run type-check` 然后 `npm run build`
- **Then**: 两个命令均 exit 0
- **Verification**: `programmatic`

## Open Questions
- [ ] OQ-1: 若未来出现 n ≥ 8 项（7 条外显），nudge 算法是否要升级成两列「左 4 右 4 自动分列」而不是只按当前象限列放？—— 默认否，按实际数据再做 V4
- [ ] OQ-2: 外显文本是否要加「通道名 + 数值 + %」三列（类似 ECharts rich formatter）？—— 本期不做，保持一行 %，通道名 / 数值看图例对齐
