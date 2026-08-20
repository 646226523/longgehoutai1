# 修复代理域第三方浏览器会话令牌错误 - 验证清单

## 配置与基础设施检查点
- [x] Checkpoint 1: `vite.config.ts` 包含正确的 `allowedHosts` 或等效代理处理配置
- [x] Checkpoint 2: Vite dev server 能正确处理来自代理域的请求

## Cookie 认证检查点
- [x] Checkpoint 3: Cookie 工具函数 `cookie.ts` 正确实现 `setCookie`, `getCookie`, `deleteCookie` 方法
- [x] Checkpoint 4: 登录成功后 accessToken 和 refreshToken 同时存储在 localStorage 和 Cookie 中
- [x] Checkpoint 5: Cookie 属性正确设置（path=/, SameSite=Lax）
- [x] Checkpoint 6: 退出登录时 Cookie 被正确清除

## 请求拦截器检查点
- [x] Checkpoint 7: axios 实例配置了 `withCredentials: true`
- [x] Checkpoint 8: 请求拦截器同时从 localStorage 和 Cookie 读取 Token
- [x] Checkpoint 9: 请求同时携带 Authorization Header 和 Cookie
- [x] Checkpoint 10: localStorage 为空但 Cookie 有效时能自动恢复 Token
- [x] Checkpoint 11: 代理错误响应（missing session token）能被正确识别和处理

## Mock API 检查点
- [x] Checkpoint 12: Mock 登录接口设置 Set-Cookie 响应头
- [x] Checkpoint 13: Mock 认证接口（profile 等）支持从 Cookie 读取 Token
- [x] Checkpoint 14: 无 Authorization Header 但有有效 Cookie 时 API 返回正常
- [x] Checkpoint 15: CORS 响应头包含 `Access-Control-Allow-Credentials: true`

## 登录页面检查点
- [ ] Checkpoint 16: 登录组件能检测代理环境
- [ ] Checkpoint 17: 代理环境下登录成功流程正常
- [ ] Checkpoint 18: 页面加载时能从 Cookie 自动恢复 Token

## 编译与构建检查点
- [ ] Checkpoint 19: TypeScript 类型检查 (`npx tsc --noEmit`) 通过
- [ ] Checkpoint 20: Vite 生产构建 (`npm run build`) 通过

## 功能验证检查点
- [ ] Checkpoint 21: localhost 直连模式登录 → 数据加载 → 页面导航正常
- [ ] Checkpoint 22: localhost 直连模式退出登录正常
- [ ] Checkpoint 23: Cookie 存储/读取/清除流程正常
- [ ] Checkpoint 24: 代理环境下第三方浏览器登录流程正常（如可用）
- [ ] Checkpoint 25: 代理错误不会导致白屏或崩溃

## 代码规范检查点
- [ ] Checkpoint 26: 新增代码符合现有 ESLint 规范
- [ ] Checkpoint 27: 新增代码使用与现有代码一致的 import 风格和 TypeScript 类型
- [ ] Checkpoint 28: 所有新增工具函数和组件有清晰的命名和导出
