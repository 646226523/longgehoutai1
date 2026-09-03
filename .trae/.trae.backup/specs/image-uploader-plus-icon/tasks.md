# 图片上传占位图标优化 - 实施计划

## [x] Task 1: 将鸽子剪影占位图替换为加号图标
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 打开 `p:\龙鸽项目\longgehoutai\admin-web\src\components\ImageUploader.tsx`
  - 将 `PIGEON_SVG` 常量（第 18-24 行）替换为加号 SVG 图标
  - 加号图标设计：一个圆角矩形背景框 + 居中的加号（+），尺寸 80×80，颜色 #d9d9d9
  - 在占位图渲染区域（第 303-308 行）将 `<img>` 的 src 从 `PIGEON_SVG` 改为新图标
  - 保持原有文字和布局不变
- **Test Requirements**:
  - `programmatic` TR-1.1: 无图片时显示加号图标，而非鸽子剪影
  - `human-judgment` TR-1.2: 加号图标视觉清晰，直观指示上传功能
  - `programmatic` TR-1.3: `npx tsc --noEmit` 零错误