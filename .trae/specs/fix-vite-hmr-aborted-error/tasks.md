# 修复 Vite HMR ERR_ABORTED 错误 - 实施计划

## [x] Task 1: 改进 console.error 过滤逻辑以正确处理 Error 对象
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 [main.tsx](file:///workspace/admin-web/src/main.tsx#L17-L27) 中的 `console.error` 拦截逻辑
  - 当前 `args.join(' ')` 无法正确处理 Error 对象（会转为 `[object Object]`）
  - 需要实现 `formatArgs()` 辅助函数，通过 `String(arg)` 和 `arg?.message` 提取可读文本
  - 覆盖过滤模式：`net::ERR_ABORTED`、`net::ERR_CONNECTION_REFUSED`、`@vite/client` + `ping`
  - 必须在应用渲染前生效

- **Acceptance Criteria Addressed**: AC-1, AC-2

- **Test Requirements**:
  - `programmatic` TR-1.1: 模拟 `console.error(new Error('net::ERR_ABORTED http://localhost:3014/'))` 不应输出到控制台
  - `programmatic` TR-1.2: 模拟 `console.error('net::ERR_CONNECTION_REFUSED')` 不应输出到控制台
  - `programmatic` TR-1.3: 模拟 `console.error('@vite/client ping timeout')` 不应输出到控制台
  - `programmatic` TR-1.4: 模拟 `console.error(new TypeError('业务错误'))` 应正常输出到控制台
  - `programmatic` TR-1.5: 模拟 `console.error('普通警告信息')` 应正常输出到控制台

- **Notes**: 关键改动在 `args.join(' ')` → 遍历 args 用 `String()` + `.message` 提取文本

## [x] Task 2: 添加 unhandledrejection 事件监听
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 [main.tsx](file:///workspace/admin-web/src/main.tsx#L37) 附近添加 `window.addEventListener('unhandledrejection', ...)` 
  - 捕获 Promise rejection 形式的 HMR 连接错误
  - 使用与 Task 1 相同的过滤逻辑检测 `net::ERR_ABORTED` 等关键字
  - 调用 `event.preventDefault()` 和 `event.stopImmediatePropagation()` 阻止错误传播

- **Acceptance Criteria Addressed**: AC-5

- **Test Requirements**:
  - `programmatic` TR-2.1: 模拟 `Promise.reject(new Error('net::ERR_ABORTED'))` 不应输出到控制台
  - `programmatic` TR-2.2: 模拟 `Promise.reject(new TypeError('业务错误'))` 应正常输出到控制台

- **Notes**: unhandledrejection 需要同时 preventDefault 和 stopImmediatePropagation

## [x] Task 3: 优化 Vite HMR 配置以适配代理环境
- **Priority**: medium
- **Depends On**: None
- **Description**: 
  - 修改 [vite.config.ts](file:///workspace/admin-web/vite.config.ts#L14-L20) 中的 HMR 配置
  - 将 `hmr.host` 从硬编码 `'localhost'` 改为动态获取或省略（让 Vite 自动检测）
  - 将 `hmr.port` 设为 `0` 让 Vite 自动分配端口，避免端口冲突
  - 保留 `overlay: false` 设置
  - 考虑设置 `hmr.clientPort` 为 undefined 让 Vite 自动匹配

- **Acceptance Criteria Addressed**: AC-3

- **Test Requirements**:
  - `programmatic` TR-3.1: `vite.config.ts` 语法正确，`vite type-check` 或 `vite build` 无错误
  - `human-judgement` TR-3.2: 在 Trae 预览环境中打开页面，HMR 连接不再报错

- **Notes**: 此任务为配置优化，核心修复在 Task 1 和 Task 2

## [x] Task 4: 验证所有修改
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3
- **Description**: 
  - 重启 Vite dev 服务器验证配置生效
  - 在 Trae 预览环境中打开登录页面
  - 检查浏览器控制台是否还有 ERR_ABORTED 错误
  - 验证业务错误仍能正常显示
  - 验证 HMR 热更新仍能正常工作

- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5

- **Test Requirements**:
  - `programmatic` TR-4.1: 重启后 `npm run dev` 能正常启动
  - `programmatic` TR-4.2: TypeScript 类型检查通过（`npx tsc --noEmit`）
  - `human-judgement` TR-4.3: 浏览器控制台无 ERR_ABORTED 错误
  - `human-judgement` TR-4.4: 业务错误正常显示
  - `human-judgement` TR-4.5: 修改源文件后 HMR 仍能触发热更新

- **Notes**: 需要在重启 dev server 后完整验证
