# 预警中心优化与端口数据分析 - PRD

## Overview
- **Summary**: 优化预警中心板块的高度使其更紧凑，并新增会员注册端口与登录端口的饼状图数据分析模块。
- **Purpose**: 解决预警中心占用过多垂直空间的问题，同时增加用户行为分析能力，帮助管理员了解用户注册和登录的来源渠道分布。
- **Target Users**: 后台管理员、运营人员

## Goals
- 缩短预警中心板块的垂直高度，使其更紧凑
- 新增会员注册端口分析饼状图（展示各注册渠道占比）
- 新增会员登录端口分析饼状图（展示各登录渠道占比）
- 保持预警中心功能完整性

## Non-Goals (Out of Scope)
- 不修改预警逻辑或预警数据
- 不对接真实后端 API（使用 Mock 数据）
- 不引入第三方图表库（使用纯 SVG 实现饼状图）

## Background & Context
- 当前 AlertCenter 组件（`src/pages/dashboard/AlertCenter.tsx`）使用 Ant Design List 组件展示预警列表，每个列表项 padding 12px + 圆形图标 + 标签 + 时间，导致整体高度较长
- 项目中无第三方图表库，TrendChart 已使用纯 SVG 实现折线图，应保持一致
- Dashboard 当前布局：欢迎卡片 → 指标卡片 → 预警中心 → 快捷入口 → 趋势图 → 待办事项

## Functional Requirements

### FR-1: 预警中心紧凑化
- 减少预警列表项的垂直间距（padding 从 12px 减至 8px）
- 缩小图标尺寸（从 28px 减至 24px）
- 缩小字号（从 13px 减至 12px）
- 移除 List 组件的额外底部间距
- 保持所有功能不变（点击跳转、等级标签、时间显示）

### FR-2: 注册端口饼状图
- 新增 `PortAnalysisChart` 组件用于展示端口分析
- 饼状图展示各注册渠道的占比分布
- 渠道包括：网页注册、APP 注册、小程序注册、第三方 OAuth
- 显示每个渠道的百分比标签
- 鼠标悬停显示具体数值

### FR-3: 登录端口饼状图
- 复用 `PortAnalysisChart` 组件
- 饼状图展示各登录渠道的占比分布
- 渠道包括：网页登录、APP 登录、小程序登录、扫码登录、第三方登录
- 显示每个渠道的百分比标签
- 鼠标悬停显示具体数值

### FR-4: 布局集成
- 在 Dashboard 中新增端口分析区域（两个饼状图并排展示）
- 注册端口分析在左，登录端口分析在右
- 响应式：移动端纵向堆叠

## Non-Functional Requirements
- **NFR-1**: `npx tsc --noEmit` 零错误
- **NFR-2**: 浏览器控制台零 error 级别日志
- **NFR-3**: 饼状图首屏渲染时间 < 300ms
- **NFR-4**: SVG 饼状图清晰可辨，颜色区分明显

## Constraints
- **Technical**: React 18 + Ant Design 5 + TypeScript + Vite
- **Implementation**: 纯 SVG 实现饼状图，不引入新依赖
- **Scope**: 修改 AlertCenter.tsx，新建 PortAnalysisChart.tsx，修改 Dashboard.tsx 和 mockData.ts

## Assumptions
- 假设端口数据使用 Mock 数据即可（后端接口待对接）
- 假设饼状图展示 4-5 个分类足够清晰

## Acceptance Criteria

### AC-1: 预警中心高度缩短
- **Given**: 工作台加载完成
- **When**: 观察预警中心板块
- **Then**: 整体高度相比优化前减少约 30-40%，更紧凑
- **Verification**: `human-judgment`

### AC-2: 注册端口饼状图展示
- **Given**: 工作台加载完成
- **When**: 找到注册端口分析区域
- **Then**: 显示饼状图，包含 4 个渠道（网页、APP、小程序、第三方），每个渠道有颜色区分和百分比标签
- **Verification**: `human-judgment`

### AC-3: 登录端口饼状图展示
- **Given**: 工作台加载完成
- **When**: 找到登录端口分析区域
- **Then**: 显示饼状图，包含 5 个渠道（网页、APP、小程序、扫码、第三方），每个渠道有颜色区分和百分比标签
- **Verification**: `human-judgment`

### AC-4: 鼠标交互
- **Given**: 饼状图展示中
- **When**: 鼠标悬停在某个扇区
- **Then**: 显示 Tooltip，包含渠道名称和具体数值
- **Verification**: `human-judgment`

### AC-5: 响应式布局
- **Given**: 在不同屏幕尺寸下
- **When**: 观察端口分析区域
- **Then**: 桌面端两图并排，移动端（xs）纵向堆叠
- **Verification**: `human-judgment`

### AC-6: TypeScript 编译通过
- **Given**: 所有修改完成
- **When**: 运行 `npx tsc --noEmit`
- **Then**: 零错误
- **Verification**: `programmatic`

### AC-7: 浏览器控制台无错误
- **Given**: 修改完成并在浏览器中打开
- **When**: 检查浏览器控制台
- **Then**: 零 error 级别日志
- **Verification**: `programmatic`
