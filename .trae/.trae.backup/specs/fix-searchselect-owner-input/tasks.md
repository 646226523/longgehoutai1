# 基因档案鸽主输入修复 - 实现计划

## [x] Task 1: 分析问题根因
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 分析 SearchSelect 组件的 allowCreate 和 allowClear 行为
  - 分析 GeneForm 中 value 传递逻辑的问题
  - 确定修复方案
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `human-judgement` TR-1.1: 确认 allowClear 默认值导致清除按钮显示
  - `human-judgement` TR-1.2: 确认手动输入时 value 与 options value 类型不匹配导致无法显示

## [x] Task 2: 修改 SearchSelect 组件支持标签值模式（labelInValue）
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 修改 SearchSelect 组件，当 isSingleAllowCreate 为 true 时，添加 labelInValue 支持
  - 修改 selectValue 逻辑，支持对象形式的 value（{value, label}）
  - 修改 handleChange 逻辑，正确处理 labelInValue 格式
  - 修改 handleBlur 逻辑，正确处理手动输入
  - 添加 allowClear 属性控制，默认为 false
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `human-judgement` TR-2.1: 单选模式下不再显示清除按钮
  - `human-judgement` TR-2.2: 手动输入后 Select 正确显示输入的文字
  - `programmatic` TR-2.3: TypeScript 编译零错误
- **Notes**: 关键改动点在 SearchSelect.tsx 的 value 处理和 onChange 回调

## [x] Task 3: 修改 GeneForm 组件适配新的 value 格式
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 修改 GeneForm 中 SearchSelect 的 value 传递逻辑
  - 修改 handleOwnerChange 函数，处理 labelInValue 格式的 value
  - 确保选择现有鸽主和手动输入两种模式都正确工作
  - 保持电话字段的联动逻辑
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-4, AC-5
- **Test Requirements**:
  - `human-judgement` TR-3.1: 选择现有鸽主后，姓名和电话都正确填充
  - `human-judgement` TR-3.2: 手动输入鸽主姓名后，姓名显示正确，电话可编辑
  - `programmatic` TR-3.3: 表单提交时数据结构正确（owner_id 为 ID 或 null，owner_name 为字符串）
- **Notes**: 需要处理 value 可能是字符串、数字或对象的情况

## [x] Task 4: 验证测试
- **Priority**: high
- **Depends On**: Task 2, Task 3
- **Description**: 
  - 启动开发服务器
  - 手动测试所有验收标准
  - 验证浏览器控制台无错误
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5
- **Test Requirements**:
  - `human-judgement` TR-4.1: 清除按钮不再显示
  - `human-judgement` TR-4.2: 手动输入功能正常
  - `human-judgement` TR-4.3: 电话字段联动正确
  - `human-judgement` TR-4.4: 父鸽/母鸽 tags 模式不受影响
