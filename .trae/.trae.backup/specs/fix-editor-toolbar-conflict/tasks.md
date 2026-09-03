# 富文本编辑器 Toolbar 重建冲突修复 - The Implementation Plan

## [x] Task 1: 简化组件，移除 editorKey 机制
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 完全移除 editorKey state 和 key 属性
  - 使用 initialValueRef = useRef(value) 捕获初始值
  - 在 handleCreated 中通过 setHtml 初始化内容
  - 保留文件上传功能（insertImages）
  - 移除复杂的 useEffect 外部值同步逻辑
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-3]
- **Test Requirements**:
  - `programmatic` TR-1.1: TypeScript 编译通过
  - `human-judgement` TR-1.2: 点击编辑按钮后编辑器正常加载内容（含图片）
  - `human-judgement` TR-1.3: 控制台无错误日志

## [x] Task 2: 浏览器验证
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 浏览器自动化测试验证编辑器加载和内容显示
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-3]
- **Test Requirements**:
  - `human-judgement` TR-2.1: 点击编辑按钮后无 "Something went wrong" 弹窗 ✅
  - `human-judgement` TR-2.2: 控制台无 "Repeated create toolbar" 错误 ✅
  - `human-judgement` TR-2.3: 控制台无 "Cannot find a descendant" 错误 ✅
  - `human-judgement` TR-2.4: 编辑器显示图文内容 ✅
  - `human-judgement` TR-2.5: 关闭后重新打开编辑器内容正常 ✅
