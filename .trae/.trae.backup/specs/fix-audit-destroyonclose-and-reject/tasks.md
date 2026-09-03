# 修复审核页面 destroyOnClose 弃用警告并完善驳回功能 - The Implementation Plan

## [x] Task 1: 修复 destroyOnClose 弃用警告
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 AuditList.tsx 文件中，将 ModalForm 组件的 modalProps 中的 `destroyOnClose: true` 改为 `destroyOnHidden: true`
  - 搜索项目中所有使用 `destroyOnClose` 的文件，确认是否还有其他需要修改的地方
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: 代码中不再存在 `destroyOnClose` 属性
  - `human-judgement` TR-1.2: 打开审核弹窗后关闭再打开，表单状态正确重置
- **Notes**: 仅修改 AuditList.tsx 第 780 行

## [x] Task 2: 完善驳回操作入口
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改审核操作列的渲染逻辑，将当前的单一"审核"按钮改为 Dropdown 下拉菜单
  - 下拉菜单包含两个选项："审核通过"（绿色）和"驳回申请"（红色）
  - 点击选项后打开对应操作的弹窗
  - 需要添加 Dropdown 组件和 DownOutlined 图标的导入
- **Acceptance Criteria Addressed**: AC-2, AC-3
- **Test Requirements**:
  - `programmatic` TR-2.1: 操作列显示带下拉箭头的按钮
  - `human-judgement` TR-2.2: 点击下拉按钮显示"通过"和"驳回"选项
  - `programmatic` TR-2.3: 选择驳回后弹出驳回弹窗，标题为"驳回申请"，按钮为红色
  - `programmatic` TR-2.4: 选择通过后弹出通过弹窗，标题为"审核通过"，按钮为绿色
- **Notes**: 需要引入 Dropdown, DownOutlined 组件

## [x] Task 3: 验证驳回流程完整性
- **Priority**: medium
- **Depends On**: Task 1, Task 2
- **Description**: 
  - 确保驳回弹窗中备注字段为必填项（已实现）
  - 确保驳回成功后列表自动刷新
  - 确保驳回后统计卡片数值正确更新
- **Acceptance Criteria Addressed**: AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-3.1: 驳回时无备注提交会触发校验错误
  - `programmatic` TR-3.2: 驳回成功后列表刷新，记录状态变更为"已驳回"
  - `human-judgement` TR-3.3: 驳回后的列表展示正确显示驳回标签和备注
