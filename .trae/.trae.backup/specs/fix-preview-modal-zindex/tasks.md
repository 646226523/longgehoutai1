# 修复认证材料预览弹窗层级问题 - 实施计划

## [x] Task 1: 修复预览Modal的z-index层级
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 位置：AuditList.tsx第838-860行的预览Modal组件
  - 修改：添加`zIndex={2000}`属性，确保显示在Drawer（默认z-index=1000）之上
  - 同时添加`maskStyle={{ zIndex: 1999 }}`确保遮罩层也在Drawer之上
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-1.1: Modal组件已添加zIndex属性
  - `human-judgement` TR-1.2: 预览弹窗显示在Drawer之上

## [x] Task 2: 验证与清理
- **Priority**: medium
- **Depends On**: Task 1
- **Description**: 
  - 运行TypeScript类型检查
  - 浏览器验证预览弹窗功能
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-2.1: TypeScript编译无新增错误
  - `human-judgement` TR-2.2: 预览弹窗显示正确，功能正常
