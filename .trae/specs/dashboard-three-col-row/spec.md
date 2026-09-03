# 三模块合并为一行横向布局 - PRD

## Overview
- **Summary**: 将预警中心、注册端口分析、登录端口分析三个独立板块合并为同一行展示（三等分列），并重构饼状图组件为左文右图的横向布局，确保三个矩形高度完全一致。
- **Purpose**: 优化工作台信息密度，将相关的监控与分析模块集中展示，减少页面滚动，提升视觉平衡感。
- **Target Users**: 后台管理员、运营人员

## Goals
- 预警中心 + 注册端口分析 + 登录端口分析合并为一行三列布局
- 饼状图组件重构为：左侧文字/图例信息，右侧饼状图
- 三个卡片高度完全一致，无高低差
- 保持所有现有功能不变

## Non-Goals (Out of Scope)
- 不修改预警数据或端口 Mock 数据
- 不修改其他模块（指标卡片、趋势图、快捷入口、待办事项）
- 不添加新功能

## Background & Context
- 当前 Dashboard 布局：欢迎卡片 → 指标卡片 → 预警中心（独立行）→ 端口分析（独立行）→ 快捷入口 → 趋势图 → 待办事项
- 用户要求将预警中心 + 两个端口分析合并为一行
- 当前 PortAnalysisChart 为纵向布局（饼图在上，图例在下）
- 需要改为横向布局（图例在左，饼图在右）

## Functional Requirements

### FR-1: 三模块合并为一行
- 将 AlertCenter、PortAnalysisChart(注册)、PortAnalysisChart(登录) 放入同一个 Row
- 使用 Col 三等分：`xs={24} xl={8}`（桌面端 8+8+8=24）
- 移动端（xs）纵向堆叠

### FR-2: 饼状图横向布局
- PortAnalysisChart 组件重构为左右布局：
  - 左侧：图例/文字信息（渠道名、数值、百分比）
  - 右侧：SVG 饼状图
- 使用 flex 横向排列

### FR-3: 高度一致性
- 三个 Card 高度必须完全一致
- 通过 Row 的 `display: flex` + `align: stretch` 或 Card 设置固定高度实现
- 饼状图内部布局需自适应撑满高度

## Non-Functional Requirements
- **NFR-1**: `npx tsc --noEmit` 零错误
- **NFR-2**: 浏览器控制台零 error 级别日志
- **NFR-3**: 响应式：移动端 xs=24 堆叠，桌面端 xl=8 三等分

## Constraints
- **Technical**: React 18 + Ant Design 5 + TypeScript + Vite
- **Scope**: 修改 Dashboard.tsx 和 PortAnalysisChart.tsx

## Acceptance Criteria

### AC-1: 三模块同一行展示
- **Given**: 工作台加载完成，屏幕宽度 ≥ 1280px
- **When**: 观察预警中心区域
- **Then**: 预警中心、注册端口分析、登录端口分析在同一行并排显示
- **Verification**: `human-judgment`

### AC-2: 饼状图左文右图布局
- **Given**: 端口分析卡片展示中
- **When**: 观察注册端口分析
- **Then**: 左侧显示图例文字（渠道名+数值+百分比），右侧显示饼状图
- **Verification**: `human-judgment`

### AC-3: 三卡片高度一致
- **Given**: 工作台加载完成
- **When**: 观察三个卡片
- **Then**: 三个卡片底部对齐，无高低差
- **Verification**: `human-judgment`

### AC-4: 响应式布局
- **Given**: 在移动端屏幕（< 768px）
- **When**: 观察三个卡片
- **Then**: 三个卡片纵向堆叠显示
- **Verification**: `human-judgment`

### AC-5: 功能完整性
- **Given**: 三模块合并展示中
- **When**: 测试各模块交互
- **Then**: 预警列表点击跳转正常，饼状图 Tooltip 正常，图例正确
- **Verification**: `programmatic`

### AC-6: TypeScript 编译通过
- **Given**: 修改完成
- **When**: 运行 `npx tsc --noEmit`
- **Then**: 零错误
- **Verification**: `programmatic`
