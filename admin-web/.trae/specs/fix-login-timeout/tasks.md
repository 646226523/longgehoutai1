# 修复登录超时与控制台报错 - Implementation Plan

## [x] Task 1: 启用 Mock 服务器
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 `vite.config.ts` 中启用 `mockApiPlugin()`，取消注释导入和插件注册
  - 验证 Mock 插件中的认证接口（`/api/auth/login`、`/api/auth/profile`、`/api/auth/refresh`）正常工作
  - 确保 Mock 模式下所有现有页面数据均可用
- **Acceptance Criteria Addressed**: AC-1, AC-5
- **Test Requirements**:
  - `programmatic` TR-1.1: 使用 admin/admin123 登录成功，跳转到首页
  - `programmatic` TR-1.2: 登录后访问 /datacenter 页面正常渲染数据
  - `programmatic` TR-1.3: 控制台无 `ERR_ABORTED` 错误
  - `human-judgement` TR-1.4: Mock 模式下页面加载流畅，数据合理

## [x] Task 2: 增加网络级错误处理
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 `services/request.ts` 的响应拦截器中，处理非 HTTP 错误（`ERR_ABORTED`、`ECONNREFUSED`、`ETIMEDOUT` 等）
  - 区分"后端不可达"与"业务错误"，显示不同的错误提示
  - 网络错误提示："后端服务连接失败，请检查后端服务是否启动"
  - 业务错误保持原有提示逻辑
- **Acceptance Criteria Addressed**: AC-2, AC-3
- **Test Requirements**:
  - `programmatic` TR-2.1: 模拟后端不可达时，显示友好错误提示而非原始错误信息
  - `programmatic` TR-2.2: `error.code === 'ERR_ABORTED'` 或 `error.code === 'ECONNREFUSED'` 时显示特定提示
  - `human-judgement` TR-2.3: 控制台错误信息可理解，不暴露底层实现细节

## [x] Task 3: 优化认证守卫 Token 保留策略
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - 修改 `App.tsx` 中的 `RequireAuth` 组件
  - `getCurrentUser()` 失败时区分错误类型：网络错误保留 token 并显示重试状态；401 错误清除 token 跳登录
  - 添加重试按钮，允许用户在网络恢复后重新尝试获取用户信息
  - 保留 localStorage 中的 token 和用户缓存
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `programmatic` TR-3.1: 网络错误时 token 不被清除
  - `programmatic` TR-3.2: 401 错误时 token 被清除并跳转登录
  - `programmatic` TR-3.3: 提供重试按钮可重新尝试
  - `human-judgement` TR-3.4: 认证错误状态 UI 清晰，用户知道该怎么做

## [x] Task 4: 降低开发模式超时时间
- **Priority**: medium
- **Depends On**: None
- **Description**:
  - 在 `vite.config.ts` 的 Mock 模式或开发模式下，将 axios 请求超时从 15000ms 降低到 5000ms
  - 或者根据环境变量动态设置超时
  - 避免在后端不可达时用户需等待 15 秒
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-4.1: 后端不可达时，错误提示在 5 秒内出现
  - `human-judgement` TR-4.2: 超时时间合理，不误伤慢响应场景

## [x] Task 5: 构建验证与集成测试
- **Priority**: medium
- **Depends On**: Task 1, Task 2, Task 3, Task 4
- **Description**:
  - 运行 `tsc --noEmit` 确保 TypeScript 编译通过
  - 完整流程验证：登录 → 数据中心 → 其他页面 → 退出登录
  - 验证 Mock 模式与真实后端模式切换
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-5.1: TypeScript 编译零错误
  - `programmatic` TR-5.2: 完整登录→浏览→登出流程正常
  - `human-judgement` TR-5.3: 无控制台 error 级日志（预期错误除外）
