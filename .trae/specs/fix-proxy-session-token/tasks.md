# 修复代理域第三方浏览器会话令牌错误 - 实施计划

## [x] Task 1: 增强 Vite 服务器配置以处理代理环境
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 `vite.config.ts`，配置 `server.proxy` 或相关设置以正确处理来自 Trae IDE 代理域的请求
  - 添加 `server.allowedHosts` 配置，允许代理域的请求
  - 配置正确的 HMR 路径，使其在代理环境下正常工作
  - 确保 Vite dev server 能识别转发代理头（X-Forwarded-For, X-Forwarded-Proto, X-Forwarded-Host）
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: Vite 服务器配置包含正确的 allowedHosts 和代理相关设置
  - `programmatic` TR-1.2: 通过代理域访问时，Vite 能正确响应
  - `human-judgement` TR-1.3: 代理域访问时 HMR 热更新正常工作
- **Notes**: 主要修改 `vite.config.ts` 的 `server` 配置

## [x] Task 2: 实现 Cookie 存储工具和登录流程增强
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 创建 `src/utils/cookie.ts` 工具文件，提供安全的 Cookie 读写功能
  - 修改 `src/services/auth.ts` 中的 `login` 函数，登录成功后同时将 Token 存储到 Cookie
  - 修改 `login` 函数，设置 Token Cookie 时使用 `path=/`、`SameSite=Lax` 属性
  - 修改 `getCurrentUser` 和 `refreshToken` 函数，支持从 Cookie 读取 Token 作为 localStorage 的补充
  - 修改 `logout` 函数，清除 Cookie 中的 Token
  - Cookie 有效期与 Token 的 expiresIn 保持一致
- **Acceptance Criteria Addressed**: AC-2, AC-4
- **Test Requirements**:
  - `programmatic` TR-2.1: 登录成功后，accessToken 和 refreshToken 同时存在于 localStorage 和 Cookie 中
  - `programmatic` TR-2.2: Cookie 的 path 为 `/`，SameSite 为 `Lax`
  - `programmatic` TR-2.3: 退出登录时，Cookie 中的 Token 被正确清除
  - `human-judgement` TR-2.4: 浏览器开发者工具中能看到正确的 Cookie
- **Notes**: Cookie 不设置 HttpOnly（前端需要读取），使用 SameSite=Lax 平衡安全和可用性

## [x] Task 3: 增强请求拦截器 - Cookie + Header 双重认证
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 修改 `src/services/request.ts`，在请求拦截器中同时从 localStorage 和 Cookie 读取 Token
  - 请求时同时携带 `Authorization: Bearer <token>` Header 和 Cookie（通过 `withCredentials: true` 自动发送）
  - 修改 axios 实例配置，添加 `withCredentials: true`
  - 当 localStorage 中没有 Token 但 Cookie 中有时，自动恢复到 localStorage
  - 当检测到代理错误响应时（非标准格式含 `error` 字段），尝试用 Cookie 中的 Token 重试
- **Acceptance Criteria Addressed**: AC-3, AC-5
- **Test Requirements**:
  - `programmatic` TR-3.1: 请求拦截器能同时从 localStorage 和 Cookie 读取 Token
  - `programmatic` TR-3.2: API 请求同时携带 Authorization Header 和 Cookie
  - `programmatic` TR-3.3: 当 localStorage 为空但 Cookie 有效时，自动恢复 Token 并正常请求
  - `programmatic` TR-3.4: axios 实例配置了 withCredentials: true
- **Notes**: 保持现有 401 刷新逻辑不变，新增 Cookie 恢复机制

## [x] Task 4: 增强 Mock API - 支持 Cookie 认证和代理会话
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 修改 `server/mock-plugin.js`，在登录接口中通过 `Set-Cookie` 响应头设置会话 Cookie
  - 登录成功后设置 `admin_session` Cookie，包含 JWT Token
  - 修改 profile 和其他需要认证的接口，支持从 Cookie 中读取 Token（不仅仅是 Authorization Header）
  - 添加 Cookie 验证逻辑：检查 `admin_session` Cookie 是否有效
  - 当请求无 Authorization Header 但有有效 Cookie 时，接受请求
  - Cookie 有效期设置为 24 小时
  - 确保 CORS 响应头中包含 `Access-Control-Allow-Credentials: true` 和正确的 `Access-Control-Allow-Origin`
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-5
- **Test Requirements**:
  - `programmatic` TR-4.1: 登录响应包含 Set-Cookie 头，设置 admin_session
  - `programmatic` TR-4.2: profile 接口能从 Cookie 中读取 Token 并验证
  - `programmatic` TR-4.3: 无 Authorization Header 但有有效 Cookie 时，API 返回正常数据
  - `programmatic` TR-4.4: CORS 响应头包含允许 Cookie 的设置
- **Notes**: Cookie 名使用 `admin_session`，值为 JWT Token

## [ ] Task 5: 登录页代理环境检测与适配
- **Priority**: medium
- **Depends On**: Task 3
- **Description**: 
  - 在 `src/pages/Login.tsx` 中添加环境检测，判断当前是否运行在代理域（检测 hostname 是否包含 `traecontent.cn` 或 `agent-sandbox`）
  - 当检测到代理环境时，显示提示信息告知用户需要完成登录认证
  - 增强登录提交逻辑：在代理环境下，如果收到代理层的 `missing session token` 错误，自动重试登录请求
  - 添加自动检测 Token 恢复的机制：页面加载时检查 Cookie 中是否有有效 Token
  - 在 Login 组件的 `useEffect` 中添加 Token 恢复逻辑：如果 Cookie 有 Token 但 localStorage 没有，自动恢复并跳转
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-5.1: 环境检测能正确识别代理域（检测 hostname 特征）
  - `programmatic` TR-5.2: 代理环境下登录成功后 Token 正确恢复
  - `human-judgement` TR-5.3: 代理环境下登录页显示友好提示
  - `programmatic` TR-5.4: 页面加载时自动从 Cookie 恢复 Token 并跳转
- **Notes**: 环境检测使用 hostname 模式匹配，不使用硬编码域名列表

## [ ] Task 6: 验证与测试
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3, Task 4, Task 5
- **Description**: 
  - 运行 TypeScript 类型检查
  - 运行 Vite 生产构建
  - 启动开发服务器并在代理环境下测试完整登录流程
  - 测试直连 localhost 模式不受影响
  - 测试 Cookie 和 localStorage 双重存储
  - 测试代理错误的正确处理
- **Acceptance Criteria Addressed**: AC-6, AC-7
- **Test Requirements**:
  - `programmatic` TR-6.1: `npx tsc --noEmit` 编译通过
  - `programmatic` TR-6.2: `npm run build` 构建成功
  - `programmatic` TR-6.3: localhost 直连模式登录 → 查看数据 → 退出登录流程正常
  - `programmatic` TR-6.4: Cookie 存储和读取正常工作
  - `human-judgement` TR-6.5: 代理环境下第三方浏览器登录流程正常
- **Notes**: 如果无法在代理环境下直接测试，至少确保 localhost 模式完全正常
