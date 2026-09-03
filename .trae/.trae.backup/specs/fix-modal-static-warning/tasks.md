# 修复Modal静态方法警告 - 实施计划

## [x] Task 1: 添加确认弹窗状态管理
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在AuditList组件中添加状态管理，用于控制确认弹窗的显示/隐藏和配置
  - 创建`confirmModal`状态，包含以下字段：
    - `visible`: boolean - 控制弹窗显示
    - `title`: string - 弹窗标题
    - `content`: React.ReactNode - 弹窗内容
    - `okText`: string - 确认按钮文案
    - `cancelText`: string - 取消按钮文案
    - `onOk`: () => Promise<void> | void - 确认回调
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-1.1: 确认状态变量已正确声明
  - `programmatic` TR-1.2: 状态类型定义完整
- **Notes**: 建议使用useState管理，保持与现有代码风格一致

## [x] Task 2: 创建动态确认Modal组件
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 在组件返回部分添加动态Modal组件
  - 使用状态控制Modal的open、title、children等属性
  - 实现onOk和onCancel的回调逻辑
  - okButtonProps设置loading状态防止重复点击
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-2.1: Modal组件正确渲染配置内容
  - `programmatic` TR-2.2: 点击确定按钮正确执行onOk回调
  - `programmatic` TR-2.3: 点击取消按钮正确关闭弹窗
  - `human-judgement` TR-2.4: 弹窗显示与原静态方法视觉一致

## [x] Task 3: 替换批量审核中的Modal.confirm
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 修改`handleBatchAudit`函数
  - 将`Modal.confirm({...})`调用替换为设置confirmModal状态
  - 保持原有的业务逻辑不变
- **Acceptance Criteria Addressed**: AC-1, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-3.1: 代码中不再包含Modal.confirm调用
  - `programmatic` TR-3.2: 批量通过功能正常工作
  - `programmatic` TR-3.3: 批量驳回功能正常工作

## [x] Task 4: 替换重试按钮中的Modal.confirm
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 修改"重试"按钮的onClick事件
  - 将`Modal.confirm({...})`调用替换为设置confirmModal状态
  - 保持原有的业务逻辑不变
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-4.1: 代码中不再包含Modal.confirm调用
  - `programmatic` TR-4.2: 重试功能正常工作

## [x] Task 5: 验证与清理
- **Priority**: medium
- **Depends On**: Task 1, Task 2, Task 3, Task 4
- **Description**: 
  - 移除未使用的Modal导入（如果Modal仅用于静态方法）
  - 运行TypeScript类型检查确保无错误
  - 在浏览器中验证功能正常且控制台无警告
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `programmatic` TR-5.1: TypeScript编译无错误
  - `programmatic` TR-5.2: 浏览器控制台无Modal静态方法警告
  - `human-judgement` TR-5.3: 所有交互功能正常
- **Notes**: 注意Modal组件仍用于预览弹窗，因此需要保留导入
