# 修复第三方浏览器 Session Token 错误 - 验证清单

## 代码质量检查点
- [x] Checkpoint 1: `request.ts` 响应拦截器能正确识别 `{error: string}` 格式的非标准错误响应
- [x] Checkpoint 2: `request.ts` 中 session token 类错误（missing session token, session expired 等）能被正确检测和处理
- [x] Checkpoint 3: 检测到 session token 错误后，localStorage 中的 access_token 和 refresh_token 被正确清除
- [x] Checkpoint 4: 清除 token 后自动跳转到 `/login` 页面
- [x] Checkpoint 5: ErrorBoundary 组件能正确捕获子组件渲染异常
- [x] Checkpoint 6: 错误边界显示的错误页面包含"返回首页"和"重新加载"按钮
- [x] Checkpoint 7: RequireAuth 组件的 `loadUser` 函数能正确处理 `{error: string}` 格式错误
- [x] Checkpoint 8: Mock API 响应包含正确的 CORS 头信息（Access-Control-Allow-Origin 等）
- [x] Checkpoint 9: Mock API 在不同浏览器下行为一致

## 编译与构建检查点
- [x] Checkpoint 10: TypeScript 类型检查 (`npx tsc --noEmit`) 通过，无错误
- [x] Checkpoint 11: Vite 生产构建 (`npm run build`) 通过，产物正常生成

## 功能验证检查点
- [x] Checkpoint 12: Chrome 浏览器中登录 → 数据加载 → 页面导航流程正常
- [x] Checkpoint 13: Firefox/Edge 浏览器中执行相同流程，行为与 Chrome 一致
- [x] Checkpoint 14: 无 token 的新浏览器打开页面时，自动跳转到登录页
- [x] Checkpoint 15: 登录后所有核心功能正常使用（查看报告、提交表单等）
- [x] Checkpoint 16: 浏览器控制台无 `{"error":"missing session token"}` 相关错误
- [x] Checkpoint 17: 非标准错误响应显示友好提示，不出现白屏

## 代码规范检查点
- [x] Checkpoint 18: 新增代码符合现有 ESLint 规范
- [x] Checkpoint 19: 新增代码使用与现有代码一致的 import 风格和命名约定
- [x] Checkpoint 20: 错误处理逻辑不影响正常请求的性能（单次处理 <100ms）
