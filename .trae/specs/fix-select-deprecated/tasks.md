# 修复 Ant Design Select `onDropdownVisibleChange` 弃用警告 - The Implementation Plan

## [x] Task 1: 替换属性名 + 验证
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 `p:\龙鸽项目\longgehoutai\admin-web\src\pages\system\Role.tsx` 第 1072 行，将 `onDropdownVisibleChange` 改为 `onOpenChange`
  - 回调函数体完全不变
  - 运行 `npx tsc --noEmit` 确认编译通过
  - 浏览器验证 console 零警告
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-1.1: `Grep onDropdownVisibleChange src/pages/system/Role.tsx` 结果为空
  - `programmatic` TR-1.2: `npx tsc --noEmit` 退出码 0
  - `programmatic` TR-1.3: 打开角色弹窗，展开"从现有角色复制"下拉，console 无 onDropdownVisibleChange 警告
  - `human-judgement` TR-1.4: "从现有角色复制" Select 懒加载功能正常（首次展开时加载角色列表）
