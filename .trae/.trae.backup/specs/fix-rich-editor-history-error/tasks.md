# 富文本编辑器历史记录报错修复 - 任务列表

## [x] Task 1: 在 setHtml 后清理编辑器历史记录
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 RichTextEditor 组件的 handleCreated 和 useEffect 中，调用 editorInstance.setHtml(value) 后添加 editorInstance.clearHistory()
  - 防止旧的历史操作在新文档模型中找不到路径
- **Acceptance Criteria Addressed**: [AC-1, AC-3]
- **Test Requirements**:
  - `programmatic` TR-1.1: 调用 setHtml 后立即调用 clearHistory()
  - `programmatic` TR-1.2: clearHistory 调用在 setHtml 完成之后执行
- **Notes**: wangEditor v5 的 clearHistory() 方法可清理 undo/redo 栈

## [x] Task 2: 添加错误边界防止编辑器崩溃
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - 为 RichTextEditor 添加错误捕获，防止未预期的错误导致整个页面崩溃
  - 使用 try-catch 包裹可能出错的操作
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `human-judgement` TR-2.1: 即使编辑器内部出错，页面仍保持可用
  - `programmatic` TR-2.2: 错误被捕获并记录到控制台

## [x] Task 3: 验证含图片内容编辑
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 已改用 editorKey 方案：外部 value 变化时重建编辑器实例，避免历史记录损坏
  - isInternalChangeRef 区分用户输入和外部加载，防止用户输入时重建编辑器
  - 创建含图片的测试资讯，验证编辑无报错
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `human-judgement` TR-3.1: 编辑含图片内容无报错
  - `human-judgement` TR-3.2: undo/redo 功能正常
  - `human-judgement` TR-3.3: 保存后重新编辑内容正常回显
