# 富文本编辑器 Toolbar 重建冲突修复 - 验证清单

## 代码检查
- [x] Checkpoint 1: 已移除 editorKey state 和 key 属性
- [x] Checkpoint 2: 使用 initialValueRef 捕获初始值
- [x] Checkpoint 3: handleCreated 中通过 setHtml 初始化内容
- [x] Checkpoint 4: 文件上传功能保留（insertImages、handleFileChange、triggerFileSelect）
- [x] Checkpoint 5: TypeScript 编译通过

## 功能验证
- [x] Checkpoint 6: 点击编辑按钮后富文本编辑器正常渲染（含图片内容）
- [x] Checkpoint 7: 无 "Something went wrong" 弹窗
- [x] Checkpoint 8: 控制台无 "Repeated create toolbar" 错误
- [x] Checkpoint 9: 控制台无 "Cannot find a descendant" 错误
- [x] Checkpoint 10: 关闭后重新打开编辑器内容正常显示
- [x] Checkpoint 11: 无其他控制台错误
