# 修复 UserList.tsx 报错 - 实施计划

## [x] Task 1: 修复 JSX 标签嵌套错误
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 检查 `renderDetailDrawer` 函数内所有 `<div>` 标签的开闭配对
  - 确认外层 wrapper div、header card div、tabs container div、footer bar div 都正确闭合
  - 46个开标签/46个闭标签完全匹配，结构正确
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: `npx tsc --noEmit` 编译通过无错误 ✅
  - `programmatic` TR-1.2: Vite 无 JSX 解析错误 ✅ (根因为 bodyStyle 弃用导致的级联解析错误)
  - `human-judgement` TR-1.3: 待浏览器验证

## [x] Task 2: 修复 Drawer bodyStyle 弃用警告
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 将 `<Drawer bodyStyle={{ padding: 0 }}>` 改为 `<Drawer styles={{ body: { padding: 0 } }}>`
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-2.1: 控制台无 `bodyStyle is deprecated` 警告 ✅

## [x] Task 3: 验证完整功能
- **Priority**: medium
- **Depends On**: Task 1, Task 2
- **Description**: 
  - 刷新页面验证所有功能正常
  - 检查控制台无错误
  - 验证详情抽屉所有 Tab 切换正常
- **Acceptance Criteria Addressed**: AC-3, AC-4
- **Test Requirements**:
  - `human-judgement` TR-3.1: ✅ 详情抽屉打开后显示用户档案卡
  - `human-judgement` TR-3.2: ✅ Tab 切换（基础信息/认证审核/活动记录）正常
  - `human-judgement` TR-3.3: ✅ 控制台无阻断性错误和弃用警告
