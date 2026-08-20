# 修复第三方浏览器 Session Token 错误 - 实施计划

## [x] Task 1: 增强请求拦截器的非标准错误格式处理能力
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 `src/services/request.ts` 中的响应拦截器，增加对非标准错误格式（如 `{error: string}`）的识别和转换
  - 在响应拦截器中添加对 `error` 字段的检测，将 `{"error":"missing session token"}` 转换为标准错误格式并触发相应的错误处理流程
  - 特别处理 session token 相关错误（missing session token, invalid session token, session expired 等），自动清除 token 并引导跳转登录页
  - 在请求拦截器中增加对 token 存在性的检查，若无 token 则在非登录页请求时直接处理
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-1.1: 当响应体包含 `error` 字段（如 `{"error":"missing session token"}`）时，拦截器应能正确识别并转换为标准错误
  - `programmatic` TR-1.2: 当检测到 session token 类错误时（关键字: "session token", "missing session", "session expired"），自动清除 localStorage 中的 access_token 和 refresh_token
  - `programmatic` TR-1.3: 清除 token 后应自动跳转到 `/login` 页面
  - `human-judgement` TR-1.4: 在浏览器中模拟返回非标准错误响应，检查是否正确显示错误提示且不白屏
- **Notes**: 保持现有 `{code, message, data}` 格式的处理逻辑不变，新增逻辑在其后补充

## [x] Task 2: 在 App.tsx 中添加全局错误边界
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 创建一个 ErrorBoundary 组件，包裹 Bootstrap 或 AdminLayout 组件
  - 捕获未处理的 React 渲染错误，显示友好的错误页面
  - 错误页面包含：错误图标、错误描述、"返回首页"按钮、"重新加载"按钮
  - 在 App.tsx 中集成 ErrorBoundary
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-2.1: ErrorBoundary 组件能正确捕获子组件中的渲染异常
  - `human-judgement` TR-2.2: 错误页面布局合理、信息清晰、操作明确（包含返回首页和重新加载按钮）
  - `programmatic` TR-2.3: 点击"重新加载"按钮能正常刷新页面
  - `programmatic` TR-2.4: 点击"返回首页"按钮能跳转到首页
- **Notes**: 错误边界应使用 React 类组件实现（getDerivedStateFromError + componentDidCatch）

## [x] Task 3: 增强 Vite Mock API 的跨浏览器兼容性
- **Priority**: medium
- **Depends On**: None
- **Description**: 
  - 修改 `server/mock-plugin.js`，在关键 API 响应中添加必要的 CORS 头信息
  - 确保 mock 响应包含 `Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials` 等头
  - 在登录、profile 等需要认证的端点中，确保错误响应格式统一
  - 可选：添加对 session cookie 的基本支持，当请求携带有效 cookie 时也能识别用户身份
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `programmatic` TR-3.1: Mock API 响应包含正确的 CORS 头信息
  - `programmatic` TR-3.2: 在不同浏览器中登录、获取 profile 等操作正常工作
  - `human-judgement` TR-3.3: 使用 Firefox 和 Edge 浏览器测试核心 API 调用，无跨域问题
- **Notes**: CORS 头信息仅在开发环境下生效

## [x] Task 4: 验证跨浏览器兼容性
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3
- **Description**: 
  - 启动开发服务器，在至少两种不同浏览器（如 Chrome 和 Firefox）中测试完整的用户流程
  - 验证登录、数据加载、页面导航等核心操作在不同浏览器中行为一致
  - 检查浏览器控制台是否有相关错误
  - 验证 TypeScript 编译和 Vite 生产构建通过
- **Acceptance Criteria Addressed**: AC-4, AC-6
- **Test Requirements**:
  - `programmatic` TR-4.1: TypeScript 类型检查 (`tsc --noEmit`) 通过，无错误
  - `programmatic` TR-4.2: Vite 生产构建 (`npm run build`) 通过
  - `human-judgement` TR-4.3: Chrome 浏览器中登录 → 查看报告 → 退出登录流程正常
  - `human-judgement` TR-4.4: Firefox 浏览器中执行相同流程，行为与 Chrome 一致
  - `human-judgement` TR-4.5: 在新浏览器（无本地 token）中打开页面，自动跳转到登录页，登录后正常使用
- **Notes**: 如果沙箱环境无法使用多种浏览器，至少验证 Chrome 中的行为

## [x] Task 5: 增强 RequireAuth 组件的错误处理
- **Priority**: medium
- **Depends On**: Task 1
- **Description**: 
  - 增强 `App.tsx` 中 `RequireAuth` 组件的错误处理逻辑
  - 在 `loadUser` 函数中增加对 `{error: string}` 格式错误的检测
  - 当检测到 session token 错误时，直接清除 token 并跳转登录，不进入 networkError 状态
  - 添加错误恢复机制，防止因单次错误导致的永久锁定状态
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-5.1: `loadUser` 函数能正确识别 `{error: string}` 格式的错误响应
  - `programmatic` TR-5.2: 检测到 session token 错误时，正确清除 token 并跳转
  - `human-judgement` TR-5.3: 手动模拟接口返回 session token 错误，页面正确跳转且不显示 networkError 页面
- **Notes**: 此任务与 Task 1 互补，Task 1 处理请求拦截器层面，Task 5 处理组件层面
