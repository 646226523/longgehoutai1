# 修复maskStyle弃用警告 - 实施计划

## [x] Task 1: 替换maskStyle为styles.mask
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 位置：AuditList.tsx第846行
  - 将`maskStyle={{ zIndex: 1999 }}`替换为`styles={{ mask: { zIndex: 1999 } }}`
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-1.1: 代码中不再包含maskStyle
  - `programmatic` TR-1.2: 遮罩层z-index功能正常

## [x] Task 2: 验证与清理
- **Priority**: medium
- **Depends On**: Task 1
- **Description**: 
  - 浏览器验证控制台无Warning
  - 验证遮罩层功能正常
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-2.1: 控制台无maskStyle弃用警告
  - `human-judgement` TR-2.2: 预览Modal遮罩层正确显示
