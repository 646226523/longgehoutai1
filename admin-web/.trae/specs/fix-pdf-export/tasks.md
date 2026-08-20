# 任务列表 - 修复导出PDF/打印按钮

## Task 1: 修复变量名错误并改用 `window.print()` 方案
**优先级**: high  
**状态**: pending  
**关联AC**: AC-1, AC-3, AC-6, AC-7

### 描述
修复 `handlePrint` 和 `handleExportPdf` 函数中的变量名错误（`message` → `msg`），并将实现从 `window.open()` 改为 `window.print()` 方案，避免弹窗拦截问题。

### 实现方案
1. 修改 `handlePrint` 函数：
   - 修复 `message.error(...)` → `msg.error(...)`
   - 移除 `window.open()` 逻辑
   - 改为在当前页面通过 CSS class 控制打印内容的显隐
   - 创建一个隐藏的打印容器 `div.print-container`，将报告内容注入其中
   - 打印时通过 `@media print` 样式隐藏所有其他元素，仅显示打印容器
   - 调用 `window.print()` 触发打印
   - 打印完成后恢复页面状态

2. 新增/修改 CSS 样式：
   - `.no-print` class：标记需要在打印时隐藏的元素
   - `.print-container` class：打印时显示的报告容器
   - `@media print` 规则：隐藏 Layout、侧边栏、导航等

3. 简化 `handleExportPdf`：
   - 直接复用 `handlePrint` 逻辑（浏览器打印对话框支持"另存为PDF"）

### 测试要求
- TR-1 (rule): 点击打印按钮 → 打印对话框弹出，无 JS 错误
- TR-2 (rule): 点击导出PDF按钮 → 打印对话框弹出，无 JS 错误
- TR-3 (rule): 打印预览仅显示报告内容

## Task 2: 添加打印专用样式
**优先级**: high  
**状态**: pending  
**关联AC**: AC-2, AC-4

### 描述
添加完整的 `@media print` CSS 规则，确保打印时布局正确、样式合理。

### 实现方案
在 Report.tsx 中添加内联 `<style>` 或在组件内使用 `<style>` 标签添加：
- 隐藏 Ant Design Layout 的 Sider、Header、Footer
- 隐藏操作按钮（打印、导出PDF、关闭等）
- 隐藏抽屉遮罩层和抽屉头部
- 仅保留 `.print-container` 内的报告内容
- 保留报告的视觉样式（渐变标题、卡片、统计数据、进度条等）
- 优化分页（`break-inside: avoid`），避免卡片在中间被截断
- 设置合理的页面边距和纸张尺寸（A4）

### 测试要求
- TR-4 (rule): 打印时侧边栏/导航/按钮不显示
- TR-5 (rule): 打印时报告卡片完整显示，布局正确
- TR-6 (rule): 渐变标题、统计数据、进度条等样式正确保留

## Task 3: 浏览器端验证
**优先级**: high  
**状态**: pending  
**关联AC**: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7

### 描述
在浏览器中验证所有功能正常工作。

### 测试要求
- TR-7 (rule): TypeScript 编译通过
- TR-8 (rule): 浏览器端点击打印按钮 → 打印对话框弹出
- TR-9 (rule): 浏览器端点击导出PDF按钮 → 打印对话框弹出
- TR-10 (rule): 打印预览中布局正确，仅显示报告内容
- TR-11 (rule): 控制台无 JavaScript 错误
