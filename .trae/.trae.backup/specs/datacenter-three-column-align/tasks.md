# 中控数据中台三栏对齐与溢出修复 - The Implementation Plan

## [x] Task 1: 为三栏 Grid 容器增加视口高度约束
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改外层 wrapper（`minHeight: 100vh`）为 `height: 100vh` + `display: flex` + `flexDirection: column`，将页面分为「顶部标题」「三栏主体」「底部飞行数据」三段。
  - 将三栏 Grid 容器设置为 `flex: 1` + `minHeight: 0`，使其占满剩余视口空间而不溢出。
  - 给 Grid 本身添加 `minHeight: 0` 防止 flex 子项突破父级。
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgement` TR-1.1: 1920×1080 下三栏 Grid 不再随内容膨胀。
- **Notes**: 注意 `minHeight: 0` 是 flex 子项允许收缩的关键。

## [x] Task 2: 三栏统一 Flex 布局对齐
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 左栏：外层 div 设置 `height: 100%` + `minHeight: 0` + `overflow: hidden`，内部改为 flex column，允许指标卡/图表区域通过 `flex: 1` + `overflow-y: auto` 滚动。
  - 中栏：设置 `height: 100%` + `minHeight: 0` + `overflow: hidden`，地图区域 `flex: 1` + `minHeight: 0`，底部实时赛事卡片固定。
  - 右栏：保持 `height: 100%` + `minHeight: 0` + `overflow: hidden`；Tabs `height: 100%`；Tab children `flex: 1` + `overflow-y: auto`。
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `human-judgement` TR-2.1: 三栏顶部底部完全对齐。
  - `human-judgement` TR-2.2: 右侧翻页到最后一页不溢出。

## [x] Task 3: 左侧栏目内容滚动与密度调整
- **Priority**: medium
- **Depends On**: Task 2
- **Description**:
  - 左侧栏目内部使用 flex column：顶部三个指标卡固定，下方图表区使用 `flex: 1` + `overflow-y: auto`。
  - 确保左侧所有卡片都能在视口内完整显示，超出则内部滚动。
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgement` TR-3.1: 左侧内容在矩形框内。

## [x] Task 4: 构建验证与浏览器复核
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3
- **Description**:
  - 运行 `npm run build`。
  - 通过 dev server 在浏览器中复核三栏对齐效果、右侧翻页、左侧/中间不溢出。
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `programmatic` TR-4.1: `npm run build` 成功。
  - `human-judgement` TR-4.2: 浏览器截图确认三栏对齐。
