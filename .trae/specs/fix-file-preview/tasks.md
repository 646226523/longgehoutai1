# 修复证明材料预览功能 - The Implementation Plan

## [x] Task 1: 修改材料数据解析逻辑
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 添加 `parseUrls` 函数，支持解析逗号分隔的多个 URL
  - 修改 `site_proof` 字段解析，返回 URL 数组
  - 支持单 URL 和多 URL 两种格式
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: `parseUrls` 函数能正确解析单 URL
  - `programmatic` TR-1.2: `parseUrls` 函数能正确解析逗号分隔的多 URL

## [x] Task 2: 使用 Image.PreviewGroup 实现多图预览
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 使用 `Image.PreviewGroup` 包裹材料卡片中的图片
  - 支持多图缩略图展示
  - 点击缩略图打开预览弹窗
  - 利用 PreviewGroup 自带的切换和序号功能
- **Acceptance Criteria Addressed**: AC-2, AC-3
- **Test Requirements**:
  - `human-judgement` TR-2.1: 点击缩略图可打开预览弹窗
  - `human-judgement` TR-2.2: 弹窗支持左右切换和序号显示

## [x] Task 3: 优化非图片文件预览
- **Priority**: medium
- **Depends On**: Task 2
- **Description**: 
  - 对于非图片文件（PDF 等），使用 iframe 或新窗口预览
  - 保持点击体验一致性
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgement` TR-3.1: 非图片文件点击后有合理的预览方式

## [x] Task 4: 构建与验证
- **Priority**: high
- **Depends On**: Task 2, Task 3
- **Description**: 
  - 运行 `npm run build` 验证构建通过
  - 启动开发服务器验证功能正常
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `programmatic` TR-4.1: `npm run build` 成功
  - `human-judgement` TR-4.2: 页面功能正常
