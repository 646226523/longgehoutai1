# 修复 3 项报错日志 BUG — The Implementation Plan

## [x] Task 1: 为 BrowserRouter 配置 React Router v7 future flags ✅
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 `src/main.tsx` 的 `<BrowserRouter>` 组件上添加 `future` 属性
  - 配置 `v7_startTransition: true` 和 `v7_relativeSplatPath: true` 两个 flag
- **实际代码变更** (main.tsx:59):
  ```tsx
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
  ```
- **验证结果**: 新标签页打开后控制台零 `Future Flag Warning` ✅

## [x] Task 2: 修复 mock-plugin.js 的 Node.js http 模块 ESM 导入 ✅
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 将 `server/mock-plugin.js` 的默认导入改为命名空间导入
  - 触发 HMR 验证 Vite 控制台零 `Dynamic require` 错误
- **实际代码变更** (mock-plugin.js:6):
  ```javascript
  import * as http from 'node:http';
  ```
- **验证结果**: 修改后 Vite 输出 `server restarted` 零崩溃，浏览器功能正常 ✅

## [x] Task 3: 扩展 main.tsx 的 Vite 重启噪声日志过滤器 ✅
- **Priority**: medium
- **Depends On**: None
- **Description**: 
  - 将噪声模式提取为 `VITE_NOISE_PATTERNS` 常量数组
  - 扩展 console.error 过滤器覆盖 `@vite/client` 全局匹配 + `ERR_CONNECTION_RESET`
  - 新增 console.warn 过滤器覆盖 Vite 内部 `server connection lost` 噪声
  - 保持 window.error 过滤器使用统一的 `isViteNoise` 函数
- **实际代码变更** (main.tsx:15-50):
  - `VITE_NOISE_PATTERNS`: `['net::ERR_CONNECTION_REFUSED', 'net::ERR_ABORTED', 'net::ERR_CONNECTION_RESET', '@vite/client']`
  - `isViteNoise()` 工具函数
  - console.error/console.warn/window.error 三层拦截
- **验证结果**: 页面刷新后仅 1 条 ERR_ABORTED（远低于 ≤ 3 标准），业务错误不受影响 ✅

## [x] Task 4: 全量回归验证 ✅
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3
- **Description**: 
  - TypeScript 编译、HTTP 可达性、浏览器页面渲染、控制台统计
- **验证结果**:
  - `npx tsc --noEmit`: **exit 0** ✅
  - HTTP 200: `/` ✅ `/system/audit-log` ✅ `/user-member/list` ✅
  - 浏览器控制台: FutureFlagWarnings=0, DynamicRequire=0, Errors=1, Warn=0 ✅
  - 页面渲染: 工作台 ✅ 用户列表 ✅（审计日志路由 HTTP 200）
