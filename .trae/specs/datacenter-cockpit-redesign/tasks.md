# 中控数据中台全面重构 - Implementation Plan

## [x] Task 1: 左侧指标卡紧凑化重构
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 将现有 4 个 MetricCard 改为 2×2 紧凑布局（gridTemplateColumns: repeat(2, 1fr)）
  - 每个卡片 padding: 10px 12px，图标 28×28，数值 fontSize: 22
  - Sparkline 微趋势图高度从 36px 改为 24px
  - 省份 TOP10 柱状图高度从 320px 压缩至 220px
  - 拍卖成交额趋势图高度从 220px 压缩至 160px
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: 左侧区域高度在 1080p 分辨率下合理
  - `human-judgement` TR-1.2: 4 个指标卡紧凑显示，无换行溢出
- **Notes**: ✅ 已完成

## [x] Task 2: 右侧拍卖/赛事布局重构
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 热门拍卖 Tab：紧凑卡片列表，每项 72px 高度，emoji 图标+名称+当前价+出价数
  - 固定宽度 320px，内容无需横向滚动
  - 赛事实时 Tab：紧凑表格，列宽压缩
  - Tabs 容器 height: 100%，flexDirection: column
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-2.1: 右侧面板内容区域无横向 overflow
  - `human-judgement` TR-2.2: 拍卖卡片信息完整清晰
- **Notes**: ✅ 已完成

## [x] Task 3: 地图交互升级（省份下钻）
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 实现省份数据下钻功能：点击地图节点 → 缩放聚焦 → 省份详情面板
  - 新增 selectedProvince 状态 + provinceData 映射表
  - 省份详情面板：公棚数/在线数/鸽子数/赛事数 + "返回全国"按钮
  - 地图数据源从 jsdelivr 切换到阿里云 DataV（多源兜底）
  - 修复公棚节点/飞行轨迹 Tab 切换地图重渲染
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-3.1: 地图正常渲染中国轮廓
  - `human-judgement` TR-3.2: 省份下钻交互流畅
- **Notes**: ✅ 已完成

## [x] Task 4: 底部飞行数据紧凑化
- **Priority**: medium
- **Depends On**: None
- **Description**:
  - 行高从 48px 压缩至 36px（padding: 6px 10px）
  - 列间距从 12px 压缩至 8px
  - 字体大小从 13px 降至 12px
  - 状态 Tag padding: 0 4px，fontSize: 11
  - 异常行背景 rgba(239,68,68,0.1)
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `programmatic` TR-4.1: 展开状态下每行高度 ≤ 40px
  - `human-judgement` TR-4.2: 信息密度合理
- **Notes**: ✅ 已完成

## [x] Task 5: 整体页面组装与构建验证
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3, Task 4
- **Description**:
  - 整合所有模块到主组件
  - 外层 height: 100vh, padding: 12px 16px
  - 三栏 gridTemplateColumns: 1fr 2fr 320px, gap: 12
  - 所有卡片 borderRadius: 6
  - 修复 Ant Design Tabs 弃用警告 (destroyInactiveTabPane → destroyOnHidden)
  - 运行 npm run build 验证
- **Acceptance Criteria Addressed**: AC-1, AC-5
- **Test Requirements**:
  - `programmatic` TR-5.1: `npm run build` 成功
  - `human-judgement` TR-5.2: 整体视觉效果现代、层次分明
- **Notes**: ✅ 已完成
