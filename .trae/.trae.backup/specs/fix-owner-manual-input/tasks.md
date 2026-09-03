# 修复鸽主姓名手动填写功能 - 实施计划

## [x] Task 1: 重写 SearchSelect 组件支持 allowCreate
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 使用 Ant Design Select 的 `mode="tags"` 模式原生支持手动输入新值
  - 当 `allowCreate` 属性为 true 时，自动启用 tags 模式
  - 处理 tags 模式的值转换（数组 → 单值）
  - 保留现有选项搜索和显示功能
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-1.1: TypeScript 编译无错误（tsc --noEmit 通过）
  - `programmatic` TR-1.2: 组件在 allowCreate=true 时使用 tags 模式
  - `programmatic` TR-1.3: handleChange 正确提取 tags 数组的最后一个元素作为新值

## [x] Task 2: 更新 GeneForm 鸽主信息处理逻辑
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - handleOwnerChange 区分手动输入和选择现有鸽主
  - 选择现有鸽主时：设置 owner_id、owner_name、自动填充 owner_phone
  - 手动输入时：设置 owner_name，owner_id 为 null，owner_phone 为空
  - 电话字段根据 owner_id 是否存在来决定 disabled 状态
- **Acceptance Criteria Addressed**: AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-2.1: 选择现有鸽主后，owner_id 被设置
  - `programmatic` TR-2.2: 选择现有鸽主后，电话字段禁用
  - `programmatic` TR-2.3: 手动输入鸽主后，owner_id 为 null
  - `programmatic` TR-2.4: 手动输入鸽主后，电话字段可编辑

## [x] Task 3: 端到端功能验证
- **Priority**: high
- **Depends On**: Task 1, Task 2
- **Description**:
  - 浏览器自动化测试验证完整流程
  - 测试手动输入鸽主 + 电话
  - 测试选择现有鸽主 + 电话联动
  - 测试表单提交成功
  - 测试表单验证
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7
- **Test Requirements**:
  - `programmatic` TR-3.1: 手动输入鸽主姓名后字段保持显示
  - `programmatic` TR-3.2: 选择现有鸽主后电话自动填充且禁用
  - `programmatic` TR-3.3: 表单保存成功（对话框关闭、成功提示）
  - `programmatic` TR-3.4: 清除鸽主后电话字段清空
