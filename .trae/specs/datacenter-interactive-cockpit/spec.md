# 数据中台交互式指挥舱重构 - Product Requirement Document

## Overview
- **Summary**: 将现有中控数据中台从"静态看板"升级为"交互式指挥舱"，核心优化包括：右侧面板改为Tab切换紧凑列表、底部飞行数据改为折叠面板、合并公棚总数到顶部指标卡、地图支持省份下钻和双模式切换。
- **Purpose**: 当前数据中台存在"功能有但不好用"的问题：右侧信息显示不全、底部占比过大、地图无法交互、左侧卡片浪费空间。管理员无法真正"用起来"进行决策。
- **Target Users**: 超级管理员、运营人员、赛事监控人员

## Goals
- **G1**: 右侧面板改为Tab切换（热门拍卖/赛事实时），使用紧凑表格布局完整展示信息。
- **G2**: 底部飞行数据改为可折叠面板，展开后使用紧凑列表提高信息密度。
- **G3**: 删除左侧独立"公棚总数"卡片，将其数据合并到顶部指标卡，释放地图空间。
- **G4**: 地图支持省份点击下钻（省级公棚列表+飞线）和双模式切换（公棚节点/飞行轨迹）。
- **G5**: 提升整体信息层级和交互深度，实现"一屏看全局，一眼识重点，一键达详情"。

## Non-Goals (Out of Scope)
- 不实现真实WebSocket推送（继续使用mock interval模拟）。
- 不引入CesiumJS/Mapbox GL等重型地图引擎。
- 不改动左侧导航、登录等其他模块。
- 不实现真实后端接口对接（保持mock数据驱动）。

## Background & Context
- 现有文件：`admin-web/src/pages/datacenter/index.tsx`（约1370行）
- 技术栈：React + TypeScript + Ant Design v5 + ECharts
- 当前布局：顶部标题栏 + 三栏主体（左：指标卡+统计图表 / 中：地图 / 右：Tabs） + 底部飞行数据列表
- 已有功能：Sparkline趋势图、呼吸光晕、飞线动画、拍卖卡片、赛事表格、飞行数据列表

## Functional Requirements
- **FR-1**: 右侧面板改为Tab切换布局，"热门拍卖"Tab使用紧凑表格（列：拍卖名/当前价/出价数/剩余时间/热度/操作）。
- **FR-2**: "赛事实时"Tab使用紧凑表格（列：赛事名/状态/参赛羽数/归巢率/冠军分速/操作）。
- **FR-3**: 底部飞行数据改为可折叠面板，默认只显示标题栏和关键统计（飞行中/归巢中/异常数量）。
- **FR-4**: 展开后的飞行数据使用紧凑列表，包含状态、足环号、位置、速度、高度、飞行时间、操作列。
- **FR-5**: 删除左侧独立"公棚总数"卡片，将其数据（在线数/暂停数/已关闭数）作为附加信息合并到顶部指标卡。
- **FR-6**: 地图支持双模式切换：公棚节点模式（显示热力点位）和飞行轨迹模式（显示飞线动画）。
- **FR-7**: 地图省份点击下钻：点击省份后切换为省级视图，显示该省公棚分布和飞线。
- **FR-8**: 顶部增加快捷操作按钮（刷新/全屏/通知）。
- **FR-9**: 拍卖卡片、赛事名称、赛鸽行支持点击跳转（预留路由，当前显示toast提示）。

## Non-Functional Requirements
- **NFR-1**: 1920×1080分辨率下无溢出，三栏对齐。
- **NFR-2**: Tab切换、面板展开/收起动画流畅（<200ms）。
- **NFR-3**: 所有新增TypeScript类型严格，无any逃逸。
- **NFR-4**: 延续暗色科技主题配色（COLORS）。

## Constraints
- **Technical**: 只能修改`admin-web/src/pages/datacenter/index.tsx`，不得新增第三方依赖。
- **Business**: 保留现有mock数据结构和暗色主题。
- **Dependencies**: 依赖ECharts geo-location、Ant Design Table/Collapse/Tabs/Tag/Progress组件。

## Acceptance Criteria

### AC-1: 右侧面板Tab切换+紧凑列表
- **Given**: 页面加载完成
- **When**: 点击"热门拍卖"Tab
- **Then**: 显示紧凑表格，包含拍卖名/当前价/出价数/剩余时间/热度/操作列
- **Verification**: `human-judgment`

### AC-2: 底部飞行数据折叠面板
- **Given**: 页面加载完成
- **When**: 查看底部区域
- **Then**: 默认折叠状态，仅显示标题栏和关键统计数字
- **Verification**: `human-judgment`

### AC-3: 公棚总数合并到顶部指标卡
- **Given**: 页面加载完成
- **When**: 查看指标卡区域
- **Then**: 公棚总数卡片显示在线/暂停/已关闭等附加信息
- **Verification**: `human-judgment`

### AC-4: 地图双模式切换
- **Given**: 地图渲染完成
- **When**: 点击"公棚节点"/"飞行轨迹"切换按钮
- **Then**: 地图内容切换为对应模式
- **Verification**: `human-judgment`

### AC-5: 省份点击下钻
- **Given**: 地图处于公棚节点模式
- **When**: 点击某个省份的公棚点位
- **Then**: 地图聚焦该区域，显示省级数据
- **Verification**: `human-judgment`

### AC-6: 构建通过
- **Given**: 修改完成
- **When**: 运行`npm run build`
- **Then**: 无TypeScript错误
- **Verification**: `programmatic`
