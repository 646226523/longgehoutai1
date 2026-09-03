# 富文本编辑器图片上传流程优化 - Implementation Plan

## [ ] Task 1: 修改工具栏 key 并启用多图上传
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 将 `RichTextEditor.tsx` 工具栏的 `insertImage` key 改为 `uploadImage`
  - 在 `MENU_CONF.uploadImage` 中添加配置：`multiple: true` 启用多图选择
  - 在 `uploadImage` 配置中添加 `allowedFileTypes` 限制图片类型
  - 添加 `customUpload` 的多张图片处理逻辑
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3
- **Test Requirements**:
  - `programmatic` TR-1.1: 工具栏 key 为 `uploadImage` 而非 `insertImage`
  - `programmatic` TR-1.2: 配置 `multiple: true`
  - `human-judgement` TR-1.3: 点击图片按钮弹出系统文件选择器

## [ ] Task 2: TypeScript 编译与浏览器验证
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 运行 TypeScript 类型检查确保零错误
  - 浏览器验证：点击图片按钮 → 选择本地文件 → 图片自动插入
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-2.1: `npx tsc --noEmit` 编译零错误
  - `human-judgement` TR-2.2: 图片上传完整流程测试通过
