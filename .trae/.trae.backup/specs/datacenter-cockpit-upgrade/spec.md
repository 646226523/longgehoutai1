# 数据中台重构 - 决策指挥舱升级 - Product Requirement Document

## Overview
- **Summary**: 将现有中控数据中台从"数据陈列室"升级为"决策指挥舱"。核心升级点包括：核心指标卡增加 Sparkline 趋势图与进度条、飞线地图动态化（公棚光晕+飞线流动+鸽群光点）、热门拍卖紧凑列表+价值排序、赛事监控改为可操作表格、赛鸽追踪增加状态筛选与异常置顶。
- **Purpose**: 当前数据中台存在"核心指标无趋势、地图静态、拍卖信息重复、赛事不可操作、赛鸽追踪平铺"等问题，管理员无法快速定位异常与做出决策。本次重构让管理员实现"一屏看全局，一眼识重点，一键达详情"。
- **Target Users**: 超级管理员、运营人员、技术支持人员

## Goals
- **G1**: 核心指标卡增加 Sparkline 微型趋势图和进度条，提升数据洞察。
- **G2**: 地图飞线动态化：公棚点位呼吸光晕、飞线发光流动、鸽群光点移动。
- **G3**: 热门拍卖列表去重、价值排序、紧凑展示。
- **G4**: 赛事监控改为表格化，支持状态筛选与操作按钮。
- **G5**: 赛鸽追踪增加状态筛选、异常强制置顶闪烁、关键信息突出。

## Non-Goals (Out of Scope)
- 不实现真实 WebSocket 推送（使用 mock interval 模拟）。
- 不引入 CesiumJS / Mapbox GL 等重型地图引擎（继续使用 ECharts）。
- 不实现真实后端接口对接（保持 mock 数据驱动）。
- 不改动左侧导航、登录、其他业务模块。

## Background & Context
- 现有文件：`admin-web/src/pages/datacenter/index.tsx`（约 1200 行）。
- 技术栈：React + TypeScript + Ant Design v5 + ECharts。
- 已有三栏布局（左指标/中地图/右 Tab）和底部飞行数据列表。
- 现有 `MetricCard` 组件仅显示数值+环比，无趋势/进度。
- 现有地图为静态 ECharts 热力图，无动态飞线与光点。
- 现有飞线数据列表为简单表格，无状态筛选和异常高亮。

## Functional Requirements
- **FR-1**: 新增 Sparkline 组件（使用 ECharts mini），每个指标卡底部展示近 7 日趋势。
- **FR-2**: 指标卡增加进度条，显示年度目标完成率或在线率等派生指标。
- **FR-3**: 飞线地图增加动态飞线动画（ECharts lines with effect）。
- **FR-4**: 公棚点位根据密度显示呼吸光晕（scatter + ripple effect）。
- **FR-5**: 热门拍卖改用紧凑列表展示，显示热度指数（★）与剩余时间，按当前价降序排序。
- **FR-6**: 赛事监控从 Tab 卡片改为表格，字段：赛事名、状态、参赛羽数、已归巢、归巢率、冠军分速、操作（查看详情/飞线追踪）。
- **FR-7**: 赛鸽追踪列表增加状态筛选下拉（全部/飞行中/归巢中/异常）。
- **FR-8**: 异常鸽置顶、红色标记、CSS 闪烁动画；归巢中鸽次置顶、橙色标记。
- **FR-9**: 赛鸽追踪列表新增"预计归巢"列和"操作"列（追踪/查看）。
- **FR-10**: 所有新增组件延续暗色科技主题配色（COLORS）。

## Non-Functional Requirements
- **NFR-1**: 飞线动画帧率 ≥ 30fps，不明显阻塞主线程。
- **NFR-2**: Sparkline 渲染开销 < 50ms。
- **NFR-3**: 1920×1080 下无溢出，三栏对齐（沿用前一轮修复）。
- **NFR-4**: 所有新增 TypeScript 类型严格，无 any 逃逸。

## Constraints
- **Technical**: 只能修改 `admin-web/src/pages/datacenter/index.tsx` 及同目录可能的子组件文件；不得新增第三方依赖。
- **Business**: 保留现有 mock 数据结构（可扩展）和暗色主题。
- **Dependencies**: 依赖 ECharts lines-effect 动画、Ant Design Table/Tabs/Tag/Progress 组件。

## Assumptions
- 管理员主要分辨率 1920×1080。
- 实时数据使用 `setInterval` 模拟，每 2-5 秒刷新。
- Sparkline 使用 ECharts `series: [{ type: 'line', showSymbol: false, lineStyle: { width: 2 } }]` 实现。

## Acceptance Criteria

### AC-1: 指标卡 Sparkline
- **Given**: 页面加载完成
- **When**: 观察指标卡
- **Then**: 每张指标卡底部展示 Sparkline 趋势图，下部显示进度条
- **Verification**: `human-judgment`

### AC-2: 地图动态飞线
- **Given**: 地图渲染完成
- **When**: 观察地图
- **Then**: 公棚点位有呼吸光晕，飞线有发光流动动画
- **Verification**: `human-judgment`

### AC-3: 热门拍卖紧凑列表
- **Given**: 切换到热门拍卖 Tab
- **When**: 查看列表
- **Then**: 卡片紧凑，显示热度指数 ★、剩余时间，按当前价降序
- **Verification**: `human-judgment`

### AC-4: 赛事监控表格
- **Given**: 切换到赛事 Tab
- **When**: 查看赛事列表
- **Then**: 以表格形式展示，包含状态、羽数、归巢率、冠军分速、操作按钮
- **Verification**: `human-judgment`

### AC-5: 赛鸽追踪状态筛选与异常置顶
- **Given**: 页面底部飞行数据列表
- **When**: 筛选状态为"异常"
- **Then**: 异常鸽置顶，红色标记，闪烁动画
- **Verification**: `human-judgment`

### AC-6: 构建通过
- **Given**: 修改完成
- **When**: 运行 `npm run build`
- **Then**: 无 TypeScript 错误
- **Verification**: `programmatic`

## Open Questions
- [ ] 是否将 Sparkline 封装为独立组件文件？默认仍在 index.tsx 内实现，避免多文件修改。
