# 入驻审核操作台重构 - The Implementation Plan

## [x] Task 1: 重构 Drawer 布局为左右分栏
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 将 Drawer 宽度从 600px 扩展至 900px
  - 左侧区域：申请人信息 + 证明材料预览
  - 右侧区域：审核操作面板
  - 使用 CSS Grid 或 Flexbox 实现左右分栏布局
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgement` TR-1.1: Drawer 打开后呈现左右分栏布局
  - `programmatic` TR-1.2: Drawer width 修改为 900px

## [x] Task 2: 证明材料缩略图预览
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 将 `site_proof` 从文本链接改为卡片展示
  - 使用 Ant Design Image 组件实现缩略图和点击大图预览
  - 支持 PDF/图片等不同文件类型的图标展示
  - 文件不存在时显示占位提示
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgement` TR-2.1: 证明材料以卡片形式展示
  - `human-judgement` TR-2.2: 点击缩略图可弹出大图查看

## [x] Task 3: 引导式审核面板
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 添加审核步骤引导：①核实信息 → ②验证资质 → ③确认
  - 展示审核通过后的预期操作：创建公棚档案、生成编码等
  - 添加审核历史记录时间线
  - 优化通过/驳回按钮的视觉层次
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgement` TR-3.1: 右侧面板包含步骤引导、操作预期、历史记录
  - `human-judgement` TR-3.2: 审核通过按钮展示预期结果

## [x] Task 4: 构建与验证
- **Priority**: high
- **Depends On**: Task 2, Task 3
- **Description**: 
  - 运行 `npm run build` 验证构建通过
  - 启动开发服务器验证页面功能正常
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `programmatic` TR-4.1: `npm run build` 成功
  - `human-judgement` TR-4.2: 页面功能正常，无控制台错误
