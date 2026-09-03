# 删除待审核统计卡片 - 实施计划

## [x] Task 1: 删除待审核统计卡片并调整布局
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 删除AuditList.tsx第665-667行的"待审核"卡片代码（`<Col span={6}>`包裹的renderStatCard调用）
  - 将剩余3个卡片的span从6改为8，实现3等分布局
  - 涉及行号：669、672、675的Col组件
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-1.1: 代码中不再包含"待审核"卡片的renderStatCard调用
  - `programmatic` TR-1.2: 剩余3个卡片span值为8
  - `human-judgement` TR-1.3: 页面布局视觉平衡

## [x] Task 2: 验证与清理
- **Priority**: medium
- **Depends On**: Task 1
- **Description**: 
  - 运行TypeScript类型检查
  - 浏览器验证页面效果
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-2.1: TypeScript编译无新增错误
  - `human-judgement` TR-2.2: 页面正常显示3个统计卡片
