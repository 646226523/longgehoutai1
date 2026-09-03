# 修复审核提交按钮无法点击问题 - Implementation Plan

## [x] Task 1: 修复 ModalForm submitter 配置
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 AuditList.tsx 中添加 formRef 引用，用于获取表单实例
  - 修改 submitter.render 配置，使用 form.submit() 触发正确的表单提交
  - 将操作列从 Dropdown 下拉菜单改为两个独立的按钮（通过 + 驳回）
  - 移除未使用的 Dropdown 和 DownOutlined 导入
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-1.1: 点击按钮能触发 handleAudit 函数
  - `programmatic` TR-1.2: 审核成功后弹窗关闭，列表刷新
  - `human-judgement` TR-1.3: 按钮点击有视觉反馈

## [x] Task 2: 验证驳回校验
- **Priority**: medium
- **Depends On**: Task 1
- **Description**: 
  - 确保驳回操作时无备注提交会触发校验错误
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-2.1: 驳回弹窗无备注提交时显示校验错误
