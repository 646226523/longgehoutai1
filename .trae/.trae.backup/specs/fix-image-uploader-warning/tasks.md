# 修复 ImageUploader 渲染期 setState 警告 - The Implementation Plan

## [x] Task 1: 修复 handleFile 中 setState updater 内的 onChange 调用
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 `admin-web/src/components/ImageUploader.tsx` 中的 `handleFile` 函数
  - 将两处 `setPreviewList((prev) => { ... onChange?.(...) ... })` 中的 `onChange` 调用移到 `setPreviewList` 外部
  - 单图模式：先调用 `setPreviewList([serverUrl])`，再调用 `onChange?.(serverUrl)`
  - 多图模式：先计算 limited 数组，调用 `setPreviewList(limited)`，再调用 `onChange?.(toEmit(limited, multi))`
  - 同样修复 `emitChange` 函数中的顺序问题
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3
- **Test Requirements**:
  - `human-judgement` TR-1.1: 上传图片时控制台无警告
  - `human-judgement` TR-1.2: 上传图片功能正常
  - `human-judgement` TR-1.3: 删除图片功能正常
- **Notes**: 根因是在 setState updater 函数体内调用了 onChange（触发父组件 setState）

## [x] Task 2: 构建与验证
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 运行 `npm run build` 验证构建通过
  - 端到端验证：打开基因档案新增页面，上传图片，检查控制台无警告
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-2.1: `npm run build` 通过 ✅
  - `human-judgement` TR-2.2: 浏览器控制台无警告 ✅
