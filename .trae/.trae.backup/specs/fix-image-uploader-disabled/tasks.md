# 基因档案图片上传组件被禁用修复 - The Implementation Plan

## [x] Task 1: 修复 ImageUploader 空字符串处理逻辑
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 修改 `admin-web/src/components/ImageUploader.tsx` 中的 `toArr` 辅助函数
  - 将 `return [v];` 改为 `return v ? [v] : [];`，过滤空字符串
  - 修改 `GeneForm.tsx` 中 `photo_url` 初始值，将 `initialData?.photo_url || ''` 改为 `initialData?.photo_url || undefined`
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `human-judgement` TR-1.1: 空值状态下上传区域 cursor 为 pointer，可点击 ✅
  - `human-judgement` TR-1.2: 有值状态下正确显示图片预览 ✅
- **Notes**: 根因是空字符串被当作有效值处理

## [x] Task 2: 构建与验证
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 运行 `npm run build` 验证
  - 端到端测试新增基因档案的图片上传功能
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-2.1: `npm run build` 通过 ✅
  - `human-judgement` TR-2.2: 浏览器中点击上传区域弹出文件选择 ✅
- **Notes**: 所有验证点通过：cursor 为 pointer，可点击，压缩预览正常，上传 URL 正确
