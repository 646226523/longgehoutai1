# 登录页面现代化重构 - 实施计划

## [x] Task 1: 重写 Login.tsx 为左右分屏布局
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 重写 Login.tsx，采用左右分屏 flex 布局
  - 左侧：图片轮播区域，3-4 张鸽子主题图片，自动播放，CSS transition 过渡
  - 右侧：玻璃拟态登录表单，包含用户名、密码、登录按钮
  - 左右之间渐变遮罩融合
  - 保持现有登录逻辑不变
  - 移动端响应式（<768px 隐藏左侧）
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-1.1: `npx tsc --noEmit` 零错误
  - `programmatic` TR-1.2: 登录功能正常（admin/admin123 可登录跳转）
  - `human-judgement` TR-1.3: 视觉效果符合现代分屏登录页风格

## [x] Task 2: 浏览器验证与截图
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 浏览器访问登录页截图确认视觉效果
  - 测试登录功能
  - 检查响应式布局
- **Acceptance Criteria Addressed**: AC-1, AC-4
- **Test Requirements**:
  - `human-judgement` TR-2.1: 桌面端截图确认
  - `programmatic` TR-2.2: 登录成功跳转首页
