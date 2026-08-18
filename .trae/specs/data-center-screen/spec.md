# 中控数据中台大屏 - Product Requirement Document

## Overview
- **Summary**: 在左侧导航栏添加"中控数据中台"功能入口，创建一个数据可视化大屏页面，展示全国各省市区鸽子公棚状态、拍卖信息、赛事实时飞行数据等。
- **Purpose**: 为管理员提供全局数据可视化视图，实时掌握公棚分布、拍卖动态和赛事飞行情况。
- **Target Users**: 超级管理员、运营管理员

## Goals
- 在左侧导航栏"工作台"上方添加"中控数据中台"入口
- 实现全国地图可视化，展示各省公棚分布和状态
- 支持切换查看拍卖信息
- 展示赛事实时数据和鸽子飞行参数
- 实现暗色科技风格的大屏效果

## Non-Goals (Out of Scope)
- 不修改现有业务逻辑
- 不新增后端接口（使用模拟数据）

## Background & Context
- **技术栈**: React + TypeScript + ECharts + Ant Design
- **已有依赖**: `echarts`, `echarts-for-react` 已安装
- **修改文件**: 
  - `admin-web/src/layouts/AdminLayout.tsx` - 添加导航菜单
  - `admin-web/src/App.tsx` - 添加路由
- **新增文件**:
  - `admin-web/src/pages/datacenter/index.tsx` - 数据中台大屏页面

## Functional Requirements
- **FR-1**: 左侧导航栏新增"中控数据中台"菜单项（位于工作台上方）
- **FR-2**: 大屏页面顶部展示标题、时间、实时状态
- **FR-3**: 左侧展示：全国公棚总数、在线公棚数、容量统计等指标卡
- **FR-4**: 中间展示：中国地图，标注各省公棚分布（使用 ECharts 地图）
- **FR-5**: 右侧展示：可切换的拍卖信息和赛事实时数据
- **FR-6**: 底部展示：实时鸽子飞行参数列表（足环号、位置、速度、高度等）

## Non-Functional Requirements
- **NFR-1**: 构建无 TypeScript 错误
- **NFR-2**: 页面采用暗色科技风格
- **NFR-3**: 数据使用模拟数据，无需真实接口

## Constraints
- **Technical**: 使用 ECharts 实现地图，需要加载中国地图 GeoJSON 数据
- **Dependencies**: 不新增 npm 依赖，使用已有的 echarts 和 echarts-for-react

## Acceptance Criteria

### AC-1: 导航菜单
- **Given**: 用户登录后台
- **When**: 查看左侧导航栏
- **Then**: "中控数据中台"显示在"工作台"上方
- **Verification**: `human-judgment`

### AC-2: 页面整体布局
- **Given**: 用户点击"中控数据中台"
- **When**: 页面加载完成
- **Then**: 展示暗色科技风格的大屏页面，包含顶部标题栏、左侧指标卡、中间地图、右侧信息面板
- **Verification**: `human-judgment`

### AC-3: 中国地图
- **Given**: 页面加载完成
- **When**: 查看中间区域
- **Then**: 显示中国地图，各省市区有公棚标注点
- **Verification**: `human-judgment`

### AC-4: 数据切换
- **Given**: 页面加载完成
- **When**: 点击右侧 Tab 切换
- **Then**: 可在"拍卖信息"和"赛事实时"之间切换
- **Verification**: `human-judgment`

### AC-5: 实时数据展示
- **Given**: 页面加载完成
- **When**: 查看底部或右侧区域
- **Then**: 显示鸽子飞行参数列表（模拟数据，包含足环号、位置、速度、高度等）
- **Verification**: `human-judgment`

### AC-6: 构建通过
- **Given**: 代码修改完成
- **When**: 运行 `npm run build`
- **Then**: 构建成功
- **Verification**: `programmatic`

## Open Questions
- [ ] 地图 GeoJSON 数据来源？需要从 CDN 加载或本地存储
