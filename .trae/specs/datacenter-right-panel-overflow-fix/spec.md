# 数据中台右侧面板溢出与对齐修复 - Product Requirement Document

## Overview
- **Summary**: 修复数据中台右侧"热门拍卖/赛事实时"板块的溢出问题，确保内容在容器边界内正确显示，且右侧面板与顶部标题栏、底部飞行数据列表保持矩形对齐。
- **Purpose**: 当前右侧 Tabs 面板存在内容溢出容器边界、分页组件超出面板底部、右侧与上下矩形不对齐等问题，影响视觉效果和交互体验。
- **Target Users**: 超级管理员、运营人员

## Goals
- **G1**: 修复右侧面板内容溢出，确保所有内容（包括分页组件）在容器边界内显示。
- **G2**: 右侧面板与顶部标题栏、底部飞行数据列表保持矩形对齐。
- **G3**: 热门拍卖列表滚动区域正确工作，分页组件固定在底部。
- **G4**: 赛事实时表格正确显示，不溢出容器。

## Non-Goals (Out of Scope)
- 不改变数据中台的整体三栏布局。
- 不修改左侧指标卡和中间地图的功能。
- 不改变 mock 数据和业务逻辑。

## Background & Context
- 现有文件：`admin-web/src/pages/datacenter/index.tsx`
- 问题：
  1. 右侧 Tabs 面板内容溢出容器，分页组件和部分卡片超出面板底部边界
  2. 右侧面板与顶部标题栏、底部飞行数据列表的右侧边缘不对齐
  3. Ant Design Tabs 组件未正确处理 flex 高度继承，导致 content 区域高度不受约束
- 技术栈：React + TypeScript + Ant Design v5 + ECharts

## Functional Requirements
- **FR-1**: 右侧 Tabs 组件需正确约束高度，使用 `destroyInactiveTabPane` 或确保非激活 Tab 内容不占空间。
- **FR-2**: 热门拍卖 Tab 内容区使用 `flex: 1` + `overflowY: auto` 实现卡片列表滚动，分页组件固定在底部。
- **FR-3**: 赛事实时 Tab 内容区同样使用 flex 布局约束高度，表格超出时内部滚动。
- **FR-4**: 右侧面板外容器确保 `height: 100%` 且 `overflow: hidden`，内部 Tabs 继承高度。
- **FR-5**: 右侧面板的上下边缘与中间地图面板、左侧指标卡面板对齐。

## Non-Functional Requirements
- **NFR-1**: 1920×1080 分辨率下右侧面板无溢出。
- **NFR-2**: 切换 Tab 时无布局跳动。
- **NFR-3**: 列表滚动流畅，不卡顿。

## Constraints
- **Technical**: 只能修改 `admin-web/src/pages/datacenter/index.tsx`。
- **Business**: 保持现有暗色科技主题和 mock 数据。

## Acceptance Criteria

### AC-1: 右侧面板无溢出
- **Given**: 页面加载完成，浏览器分辨率为 1920×1080
- **When**: 查看右侧热门拍卖面板
- **Then**: 所有内容（包括分页）在面板边框内显示，不溢出
- **Verification**: `human-judgment`

### AC-2: 矩形对齐
- **Given**: 页面加载完成
- **When**: 对比右侧面板与左侧、中间面板的上下边缘
- **Then**: 三个面板顶部和底部边缘严格对齐
- **Verification**: `human-judgment`

### AC-3: Tab 切换不溢出
- **Given**: 页面加载完成
- **When**: 在"热门拍卖"和"赛事实时"之间切换
- **Then**: 切换后面板高度不变，内容仍在边界内
- **Verification**: `human-judgment`

### AC-4: 构建通过
- **Given**: 修改完成
- **When**: 运行 `npm run build`
- **Then**: 无 TypeScript 错误
- **Verification**: `programmatic`
