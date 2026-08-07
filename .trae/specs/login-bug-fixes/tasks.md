# 登录页面 Bug 修复 - 实施计划

## [x] Task 1: 修复 Login.tsx 全部 6 个问题
- **Priority**: high
- **Depends On**: None
- **Description**:
  1. 将 Unsplash 图片替换为 CSS 渐变背景 + 内联 SVG 鸽子插画（4 组不同配色）
  2. 调整轮播间隔为 5 秒，transition 缩短为 0.6s
  3. 加宽渐变遮罩（300px），消除中间分割线
  4. 移除登录按钮的 box-shadow
  5. 添加"忘记密码"链接按钮
  6. 实现忘记密码对话框：两个选项（记得密码/完全不记得密码）
- **Acceptance Criteria Addressed**: AC-1, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-1.1: `npx tsc --noEmit` 零错误
  - `human-judgement` TR-1.2: 左侧图片正常轮播
  - `human-judgement` TR-1.3: 无明显分割线
  - `programmatic` TR-1.4: 忘记密码对话框功能正常

## [x] Task 2: 修复 App.tsx Spin tip 警告
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 读取 App.tsx 中 RequireAuth 组件的 Spin 用法
  - 将 `tip="加载中..."` 改为嵌套子元素模式（或移除 tip）
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-2.1: 控制台无 `[antd: Spin]` 警告

## [x] Task 3: 浏览器验证
- **Priority**: high
- **Depends On**: Task 1, Task 2
- **Description**:
  - 浏览器截图验证视觉效果
  - 检查控制台错误为 0
  - 测试忘记密码功能
  - 测试登录功能
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3
- **Test Requirements**:
  - `programmatic` TR-3.1: 控制台错误为 0
  - `human-judgement` TR-3.2: 截图确认
