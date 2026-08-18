# 中控数据中台三栏对齐与溢出修复 - Product Requirement Document

## Overview
- **Summary**: 修复中控数据中台三栏布局（左侧指标卡/中间地图/右侧Tab面板）中右侧容器溢出、三栏矩形边界不对齐的问题。核心是将三栏 Grid 约束在视口可用高度内，三栏顶部和底部严格对齐成一个矩形，右侧 Tab 内容在容器内部滚动而非溢出。
- **Purpose**: 当前右侧 Tab 容器明显超过中间和左侧卡片的底部边界，形成错位，严重影响大屏视觉完整性。本次修复要让三栏形成统一的矩形对齐，并让所有内容在各自容器内部滚动。
- **Target Users**: 后台管理员、数据监控人员

## Goals
- **G1**: 三栏容器顶部对齐、底部对齐，形成一个完整的矩形区域。
- **G2**: 右侧 Tab 容器不再溢出，所有拍卖/赛事列表在容器内滚动。
- **G3**: 左侧指标卡、中间地图也被约束在同一矩形内，超出部分内部滚动。
- **G4**: 在 1920×1080 分辨率下整体布局美观，下方飞行数据列表不受影响。

## Non-Goals (Out of Scope)
- 不改变三栏宽度比例（仍为 25% / 50% / 25%）。
- 不修改卡片内的 mock 数据和业务字段。
- 不改变整体暗色科技主题配色。

## Background & Context
- 数据中台页面文件：`admin-web/src/pages/datacenter/index.tsx`。
- 外层 wrapper 使用 `minHeight: 100vh` 但 Grid 容器本身未被约束。
- 三栏使用 `display: grid; gridTemplateColumns: 25% 50% 25%; align-items: stretch`。
- 问题根源：Grid 行高由最高内容决定（内容驱动），而非视口可用高度驱动。右侧 Tabs 因新增分页和丰富信息后内容高度超过中间地图区域，导致右侧溢出。
- 左侧栏目目前由多个独立卡片组成，没有整体 flex 滚动，内容多时也可能突破边界。

## Functional Requirements
- **FR-1**: 为三栏 Grid 容器设置视口约束高度（如 `height: calc(100vh - 350px)`，或通过 `flex: 1` 占满剩余空间），使其高度不随内容膨胀。
- **FR-2**: 三栏均设置 `height: 100%` + `minHeight: 0` + `overflow: hidden`，统一外框。
- **FR-3**: 左侧栏目改用 flex 纵向布局 + `overflow-y: auto`，指标卡/图表多时在栏内滚动。
- **FR-4**: 中间栏目地图区域使用 `flex: 1` 填充剩余空间，`mapContent` 中的子内容也通过 flex 合理分配。
- **FR-5**: 右侧栏目 Tabs 保持 `flex: 1` 填充，Tab children 使用 `overflow-y: auto`，列表内容在栏内滚动。
- **FR-6**: 顶部标题栏与底部飞行数据列表保持原位，三栏矩形区域刚好嵌入两者之间。

## Non-Functional Requirements
- **NFR-1**: 1920×1080 下三栏严格对齐，无溢出、无错位。
- **NFR-2**: 1366×768 下仍可用，通过内部滚动承载更多内容。
- **NFR-3**: 所有滚动条样式统一（已在 `style` 标签中定义 `::-webkit-scrollbar`）。

## Constraints
- **Technical**: 只能修改 `admin-web/src/pages/datacenter/index.tsx`；不得引入新依赖。
- **Business**: 保留现有分页、卡片信息密度和 hover 效果。

## Assumptions
- 顶部标题栏高度约 72px，底部飞行数据列表约 230px，页面 padding 约 40px，故三栏可用高度 ≈ `calc(100vh - 342px)`。
- 用户主要使用 1920×1080 及以上分辨率。

## Acceptance Criteria

### AC-1: 三栏矩形对齐
- **Given**: 页面在 1920×1080 分辨率下打开
- **When**: 观察三栏布局
- **Then**: 左、中、右三栏顶部边线对齐，底部边线对齐，形成完整矩形
- **Verification**: `human-judgment`

### AC-2: 右侧不溢出
- **Given**: 切换到热门拍卖或赛事实时 Tab
- **When**: 翻页到最后一页
- **Then**: 右侧卡片底部不超过中间卡片底部，内容在栏内滚动
- **Verification**: `human-judgment`

### AC-3: 左侧不溢出
- **Given**: 页面正常加载
- **When**: 左侧指标卡 + 图表渲染完成
- **Then**: 左侧内容在矩形范围内，若超出则内部滚动
- **Verification**: `human-judgment`

### AC-4: 中间地图适配
- **Given**: 地图渲染完成
- **When**: 中间栏内容加载
- **Then**: 地图区域自动填充剩余空间，实时赛事卡片在底部
- **Verification**: `human-judgment`

### AC-5: 构建通过
- **Given**: 修改完成
- **When**: 运行 `npm run build`
- **Then**: 无 TypeScript 错误
- **Verification**: `programmatic`

## Open Questions
- [ ] 是否需要支持窗口 resize 动态调整？默认通过 flex 自适应即可。
