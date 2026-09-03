# 中控数据中台右侧面板溢出修复与分页优化 - Product Requirement Document

## Overview
- **Summary**: 修复中控数据中台右侧 Tab 面板（热门拍卖/赛事实时）内容溢出容器边界的问题；丰富热门拍卖卡片的信息字段（当前展示字段过少，需要展示完整拍卖信息）；利用现有下方空白区域展示更多数据；当数据超出可视区域时，采用分页（1-N 页）方式切换。
- **Purpose**: 提升大屏数据中控的视觉观感与信息密度，让热门拍卖 Tab 既能紧凑展示每一条记录的完整信息，又能承载更多条拍卖数据，避免 DIV 超出父容器造成的布局错乱。
- **Target Users**: 后台管理员、运营人员、公棚工作人员。

## Goals
- **G1**: 修复右侧 Tab 容器整体溢出父容器边界的问题，使其严格包含在父容器范围内。
- **G2**: 丰富「热门拍卖」列表卡片信息，展示完整拍卖信息（除名称/当前价/出价次数外，增加鸽主、品类、开拍时间、结拍时间、保证金、起拍价、最高出价人、所属公棚、竞拍状态等字段）。
- **G3**: 合理利用右侧面板下方的空白区域，增大单条卡片信息量，提高信息密度。
- **G4**: 当拍卖/赛事条目数超出单屏可视范围时，使用分页组件支持 1-N 页切换，保证无溢出。

## Non-Goals (Out of Scope)
- 不改动左侧指标卡、省份柱状图、拍卖趋势折线图、中间地图、底部飞行数据列表等其他模块。
- 不引入后端接口，仍使用 mock 数据（但可以扩充 mock 数量用于分页演示）。
- 不新增导出、筛选、搜索等功能。
- 不改变整体暗色科技主题。

## Background & Context
- 数据中台页面位于 `admin-web/src/pages/datacenter/index.tsx`，使用三栏 Grid 布局（25% / 50% / 25%）。
- 右侧容器内放有 Ant Design `Tabs`（热门拍卖 / 赛事实时）。
- 当前 `renderAuctionList` 仅展示名称、当前价、出价次数 3 个字段，信息密度低。
- 右侧 Tabs 容器未限制高度，导致 `maxHeight: 580` 设置在内部 Tab 上也无法阻止外层 DIV 溢出。
- 右侧下方存在明显空白，可通过增加卡片信息量与分页填充。
- 已有 Ant Design v5 + React + TypeScript 技术栈，天然支持 `Pagination` 组件。

## Functional Requirements
- **FR-1**: 右侧 Tab 面板容器必须设置 `height` 或 `max-height` + `overflow: hidden/auto`，保证不超出外层卡片边界。
- **FR-2**: 「热门拍卖」Tab 中的卡片展示完整拍卖信息，至少包含：鸽名/拍品名、当前价、出价次数、所属公棚、开拍时间、结拍时间、保证金、起拍价、当前领先（鸽主/ID）、状态（竞拍中/已结束/即将结拍）。
- **FR-3**: 每个拍卖卡片紧凑排版，信息分层（主信息 + 次信息 + 标签），在不显著增大单卡高度的前提下提升信息密度。
- **FR-4**: 扩充 `mockAuctions` 数据至 10+ 条，用于分页测试。
- **FR-5**: 热门拍卖 Tab 支持分页切换，默认每页展示 4 条，分页控件显示在列表底部，页码形如 `1 / N`。
- **FR-6**: 赛事实时 Tab 同样支持分页（每页 4 条），保证两个 Tab 行为一致。
- **FR-7**: 分页切换不改变容器的滚动/溢出行为，始终保持容器边界稳定。
- **FR-8**: 卡片 hover 效果保留并与整体暗色主题一致（青色高亮、边框发光）。

## Non-Functional Requirements
- **NFR-1**: 容器在 1920×1080 及以上分辨率下无明显空白浪费；在 1366×768 分辨率下不溢出且可用。
- **NFR-2**: 分页切换流畅，无抖动，无整体布局偏移。
- **NFR-3**: 单条卡片信息密度提升后仍保持阅读舒适性（字号 ≥ 11px，行高 ≥ 16px）。
- **NFR-4**: 新增的 mock 数据类型必须满足 TypeScript `AuctionItem` / `RaceItem` 接口（或扩展接口）。

## Constraints
- **Technical**: React + TypeScript + Ant Design v5 + ECharts；只能修改 `admin-web/src/pages/datacenter/index.tsx`。
- **Business**: 现有整体暗色科技主题色板 `COLORS` 必须沿用；不得引入新的 UI 依赖库。
- **Dependencies**: 依赖 Ant Design 的 `Pagination`、`Tag`、`Progress` 组件；依赖 dayjs（已导入）处理时间格式化。

## Assumptions
- 右侧 Tabs 容器可用总高度约为 `100vh - 顶部标题(72px) - padding(32px) - 底部飞行数据(约220px)` ≈ 视口剩余空间，需要通过 flex/百分比布局自适应。
- 分页数据为前端本地分页，暂不需要与后端对接。
- 用户默认希望每页展示 4 条拍卖/赛事，可按需调整 pageSize。

## Acceptance Criteria

### AC-1: 右侧面板不溢出
- **Given**: 中控数据中台页面已在浏览器中打开（默认 1920×1080 分辨率）
- **When**: 切换到「热门拍卖」Tab 与「赛事实时」Tab
- **Then**: 右侧 Tab 容器底部不超过外层卡片底部边界，无滚动条外溢、无内容被裁剪
- **Verification**: `human-judgment`

### AC-2: 热门拍卖卡片展示完整信息
- **Given**: 页面处于「热门拍卖」Tab
- **When**: 查看任意一条拍卖卡片
- **Then**: 卡片显示：拍品图标/名称、当前价（含货币单位）、出价次数、所属公棚、开拍时间、结拍时间、保证金、起拍价、领先出价人、竞拍状态标签
- **Verification**: `human-judgment`

### AC-3: 利用下方空白区域
- **Given**: 单屏可视区域内存在多余空间
- **When**: 渲染拍卖/赛事列表
- **Then**: 单条卡片采用紧凑排版、合理利用垂直空间，卡片下方不再出现大片空白；或使用分页填满
- **Verification**: `human-judgment`

### AC-4: 分页切换 1-N 页
- **Given**: `mockAuctions` 扩充至 10+ 条，每页 4 条
- **When**: 点击分页控件的下一页/上一页/页码
- **Then**: 列表按页切换显示，显示 `当前页 / 总页数`，切换过程容器边界保持稳定、无溢出
- **Verification**: `programmatic`

### AC-5: 代码可编译通过
- **Given**: 修改完成
- **When**: 运行 `npm run build`（或 `npx tsc --noEmit`）
- **Then**: 无 TypeScript 错误，构建成功
- **Verification**: `programmatic`

### AC-6: 赛事实时 Tab 同步分页
- **Given**: 切换至「赛事实时」Tab
- **When**: 查看分页
- **Then**: 赛事列表同样支持分页切换，交互与拍卖 Tab 一致
- **Verification**: `programmatic`

## Open Questions
- [ ] 是否需要将分页切换持久化（记住用户上次所在页）？默认不做。
- [ ] 单条拍卖卡片是否需要点击跳转详情？默认不做。
- [ ] 每页显示条数 pageSize 是否需要在 UI 上可切换？默认固定 4。
