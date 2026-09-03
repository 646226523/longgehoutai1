# 中控数据中台大屏 - The Implementation Plan

## [x] Task 1: 添加导航菜单和路由
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 `AdminLayout.tsx` 的 `menuData` 数组最前面添加"中控数据中台"菜单项
  - 使用 `ControlOutlined` 图标
  - 在 `App.tsx` 中添加路由 `/datacenter`
  - 导入新页面组件
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgement` TR-1.1: 左侧导航显示"中控数据中台"
  - `human-judgement` TR-1.2: 菜单位置在"工作台"上方

## [x] Task 2: 创建数据中台页面组件
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 创建 `admin-web/src/pages/datacenter/index.tsx`
  - 实现页面整体布局（顶部标题栏 + 三栏布局）
  - 暗色科技风格主题
  - 响应式设计
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgement` TR-2.1: 页面采用暗色科技风格
  - `human-judgement` TR-2.2: 布局为顶部+三栏结构

## [x] Task 3: 实现左侧指标卡区域
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 使用 ECharts 实现数据可视化卡片
  - 公棚总数、在线公棚数、鸽子总数等指标
  - 添加趋势图表
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgement` TR-3.1: 显示核心指标卡片
  - `human-judgement` TR-3.2: 图表正常显示

## [x] Task 4: 实现中间中国地图
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 使用 ECharts 实现中国地图
  - 加载中国地图 GeoJSON 数据（从 CDN fetch）
  - 标注各省公棚分布点
  - 添加地图特效（飞线、涟漪等）
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgement` TR-4.1: 中国地图正常显示
  - `human-judgement` TR-4.2: 公棚标注点可见

## [x] Task 5: 实现右侧信息面板（拍卖/赛事切换）
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 使用 Tabs 组件实现切换
  - "拍卖信息"Tab：显示热门拍卖、成交价等
  - "赛事实时"Tab：显示当前进行中的赛事列表
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgement` TR-5.1: Tab 切换正常
  - `human-judgement` TR-5.2: 内容正确显示

## [x] Task 6: 实现底部实时飞行数据列表
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 使用表格或滚动列表展示鸽子飞行数据
  - 字段：足环号、当前位置、飞行速度、飞行高度、经纬度
  - 添加模拟实时更新效果（定时刷新）
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgement` TR-6.1: 飞行数据列表正常显示
  - `human-judgement` TR-6.2: 数据有滚动或刷新效果

## [x] Task 7: 构建与验证
- **Priority**: high
- **Depends On**: Task 1-6
- **Description**: 
  - 运行 `npm run build` 验证构建通过
  - 启动开发服务器验证页面功能
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `programmatic` TR-7.1: `npm run build` 成功
  - `human-judgement` TR-7.2: 页面功能正常
