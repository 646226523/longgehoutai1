# 登录页面 P0 级 Bug 修复 - 实施计划

## [x] Task 1: 复制本地图片到 admin-web 并更新 Login.tsx
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 创建 admin-web/public 目录
  - 复制 `P:\龙鸽项目\longgehoutai\imgae\` 下 4 张图片到 public/
  - 修改 Login.tsx 用 `<img src="/鸽子1.jpg">` 等引用本地图片
  - 保持 5 秒轮播间隔
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgement` TR-1.1: 左侧 4 张图片正常显示并轮播
  - `programmatic` TR-1.2: `npx tsc --noEmit` 零错误

## [x] Task 2: 修复登录按钮下方空白布局
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 调整 `.login-glass-card .ant-form-item` 的 margin-bottom
  - 调整 ProForm submitter 的 margin
  - 确保按钮下方无多余空白
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgement` TR-2.1: 截图确认布局紧凑

## [x] Task 3: 重写忘记密码功能（完整流程）
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 忘记密码字号改为 16px，与登录按钮右侧对齐
  - 创建独立的"密码找回"页面 (`/forgot-password`)
  - 页面包含：账号验证 → 验证码/邮箱 → 设置新密码 的完整流程
  - 登录页忘记密码对话框：
    - 选项 A（记得密码）：关闭弹窗 + 提示用户继续输入密码
    - 选项 B（完全不记得密码）：跳转到 /forgot-password 完整找回流程
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-3.1: 忘记密码跳转正常
  - `programmatic` TR-3.2: 密码找回页面可访问
  - `human-judgement` TR-3.3: 两个选项视觉区分明显

## [x] Task 4: 浏览器验证
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3
- **Description**:
  - 截图验证登录页布局
  - 测试忘记密码完整流程
  - 检查控制台错误
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-4.1: 控制台错误为 0
  - `human-judgement` TR-4.2: 截图确认所有修复
