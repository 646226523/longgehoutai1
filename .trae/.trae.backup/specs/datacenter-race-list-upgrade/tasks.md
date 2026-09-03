# 赛事实时板块视觉与交互升级 - Implementation Plan

## [x] Task 1: 重构赛事实时渲染组件
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 移除原有的 `raceColumns` 和 `Table` 组件。
  - 重新实现 `renderRaceList` 函数，使用 Flex 布局渲染卡片列表。
  - 每张卡片结构：
    - **头部**: 赛事名称 (`fontSize: 13px, fontWeight: 600`) + 状态 Tag。
    - **中部**: `Progress` 进度条组件，显示 `progress` 数据。
    - **底部**: 关键数据行，显示 `totalCount` (总羽) / `returnedCount` (归巢) / `location` (线路)。
    - **操作**: "详情" / "飞线" 链接按钮。
  - 卡片样式：
    - `padding: '12px 14px'`
    - `borderRadius: 6`
    - `background: linear-gradient(135deg, #1a2332 0%, #151d2d 100%)`
    - `border: 1px solid #2a3a5a`
    - `marginBottom: 10px`
  - 确保卡片在 320px 宽度内正确换行和截断。
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3
- **Test Requirements**:
  - `programmatic` TR-1.1: DOM 中不再包含 `ant-table` 结构。
  - `human-judgement` TR-1.2: 卡片布局清晰，包含名称、状态、进度、数据和操作。

## [x] Task 2: 视觉细节打磨与验证
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - 调整字体大小、颜色、间距，确保与左侧拍卖卡片风格统一。
  - 添加状态颜色映射（进行中: 绿色, 即将结束: 橙色）。
  - 验证在 1920x1080 分辨率下无横向滚动。
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgement` TR-2.1: 视觉效果符合“现代化”、“科技感”的要求。
  - `programmatic` TR-2.2: `npm run build` 构建成功。
