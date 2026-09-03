# 会员等级编辑页面布局优化 - 实施计划

## [ ] Task 1: 调整布局顺序和滚动行为
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改MemberLevel.tsx中Modal内的布局代码
  - 调整grid顺序为 `gridTemplateColumns: '1fr 320px'`（左侧表单，右侧预览）
  - 左侧表单容器设置独立滚动：`overflowY: 'auto'`
  - 右侧预览容器设置固定：`position: 'sticky'` 或不滚动
  - 整体容器保持 `maxHeight: '70vh'`
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3
- **Test Requirements**:
  - `human-judgement` TR-1.1: 布局顺序正确（左表单，右预览）
  - `human-judgement` TR-1.2: 左侧表单可滚动
  - `human-judgement` TR-1.3: 右侧预览固定不动

## [ ] Task 2: 验证与清理
- **Priority**: medium
- **Depends On**: Task 1
- **Description**: 
  - 浏览器验证布局效果
  - 运行TypeScript类型检查
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3
- **Test Requirements**:
  - `human-judgement` TR-2.1: 滚动效果符合预期
  - `programmatic` TR-2.2: TypeScript编译无新增错误
