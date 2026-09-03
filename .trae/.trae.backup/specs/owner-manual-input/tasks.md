# 鸽主信息可手动填写优化 - The Implementation Plan

## [ ] Task 1: 扩展 SearchSelect 组件支持自由输入
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 `admin-web/src/components/SearchSelect.tsx` 中添加 `allowCreate` 属性
  - 当 `allowCreate=true` 时，底层 Select 组件启用 `allowCreate` 模式
  - 修改 `handleChange` 逻辑，当用户输入新值时正确触发 onChange
  - 返回值中需要区分"选择已有"和"手动输入"（通过 option 是否存在来判断）
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: `allowCreate=true` 时用户可输入任意文本
  - `programmatic` TR-1.2: 手动输入时 onChange 被正确调用

## [ ] Task 2: 修改 GeneForm 鸽主选择逻辑
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 在 `admin-web/src/pages/gene/GeneForm.tsx` 中：
  1. 为鸽主 `SearchSelect` 添加 `allowCreate` 属性
  2. 修改 `handleOwnerChange` 逻辑：
     - 选择已有鸽主：设置 owner_id、owner_name、owner_phone，电话字段禁用
     - 手动输入新鸽主：owner_id 设为 null，owner_name 为输入值，电话字段启用可编辑
  3. 电话字段 `disabled` 属性根据 `owner_id` 是否存在动态切换
  4. 修改电话字段 placeholder 文案
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-5
- **Test Requirements**:
  - `programmatic` TR-2.1: 手动输入新鸽主后电话字段可编辑
  - `programmatic` TR-2.2: 选择已有鸽主后电话字段自动填充且禁用
  - `programmatic` TR-2.3: 提交 payload 包含正确的 owner_name 和 owner_phone

## [ ] Task 3: 验证与修复
- **Priority**: medium
- **Depends On**: Task 1, Task 2
- **Description**: 
  - TypeScript 编译检查
  - 浏览器端测试：手动输入鸽主 → 电话可编辑 → 提交
  - 浏览器端测试：选择已有鸽主 → 电话自动填充 → 提交
  - 确认其他使用 SearchSelect 的组件不受影响
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `programmatic` TR-3.1: TypeScript 编译零错误
  - `human-judgement` TR-3.2: 交互流畅，无明显卡顿
