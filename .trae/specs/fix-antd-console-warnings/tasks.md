# 修复 AntD 控制台 2 条警告 - 实施计划

## [x] Task 1: 新增全局 AntD App 实例注册器模块 + 顶层注入
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 新建 `src/utils/antd-app-instance.ts`：导出 `setAppInstance(app: App)` 存单例 + `getApp(): App` 取实例 + 便捷导出 `getMessage()` 返回 `app.message`（如未注入则 fallback 到静态 `import { message } from 'antd'`，加注释说明仅作为兜底）
  - 在 `App.tsx` 顶层组件（`function App()` 内部）调用 `const app = AntdApp.useApp();`，并在 `useEffect(/* empty deps */)` 中调一次 `setAppInstance(app)`
  - 确保 Login / ForgotPassword 路由在 `<AntdApp>` 子树内（现状已经是，保持不变）
- **Acceptance Criteria Addressed**: AC-1, AC-3, AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-1.1: `getMessage()` 在调用 setAppInstance 前返回静态 message（兜底），调用后返回 app.message 实例。
  - `programmatic` TR-1.2: App.tsx 编译通过，tsc 无类型错误。
  - `human-judgement` TR-1.3: 登录后刷新页面，触发任意 message.success，能正常显示。
- **Notes**: 顶层 `<AntdApp>` 组件必须始终包裹 `<Routes>`，避免 useApp 找不到 context。

## [x] Task 2: 组件层（pages + layouts + components）静态 message 替换为 useApp().message
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 共约 148 处调用，按文件逐一替换：
    ① 移除组件文件中的 `import { message } from 'antd'`（如果是解构则仅移除 message，保留 Button/Space 等）
    ② 在组件函数**顶层**（不进 if/循环）添加 `const { message } = App.useApp();`（注意：React hooks 规则要求）
    ③ 若文件里使用 `import { App } from 'antd'` 已存在则不用重复引入
    ④ 保留所有调用参数完全一致（`message.loading(x,0)` 第二个参数不丢、模板字符串保持一致）
  - 受影响文件清单（按 grep 结果）：components/ImageUploader.tsx、layouts/AdminLayout.tsx、pages/** 下所有包含 message 调用的 30+ 文件
  - 注意：`services/request.ts`（axios 拦截器）和 `hooks/useRequest.ts` 留到 Task 3 处理，本 Task 仅覆盖 React 组件函数/hook 函数体内部可合法调用 useApp 的位置
- **Acceptance Criteria Addressed**: AC-1, AC-4, AC-5, AC-6
- **Test Requirements**:
  - `programmatic` TR-2.1: grep `import.*\bmessage\b.*from ['\"]antd['\"]` 在组件/布局/自定义组件目录返回 0 条。
  - `programmatic` TR-2.2: `npx tsc --noEmit` 0 错误。
  - `human-judgement` TR-2.3: 登录 → 操作 3 个典型按钮（NFT删除/新增草稿/退出登录）对应 message 文字与消失时长与修复前一致。
- **Notes**: 若遇到 HOC 或非函数组件（本项目全是函数组件），则需用 `antd-app-instance.getMessage()` 作为 fallback；但目前 grep 结果无类组件。

## [x] Task 3: 自定义 hook & 非组件拦截器切换为全局实例
- **Priority**: high
- **Depends On**: Task 1, Task 2
- **Description**:
  - `hooks/useRequest.ts`: 原本调用 `message.success(...)`。因为自定义 hook 本身可以合法调用 `App.useApp()`，所以改为 `const { message } = App.useApp();` 优先；如果 useRequest 的调用位置存在不在 AntdApp 子树的情况（暂时没发现），再退回 `antd-app-instance.getMessage()`。
  - `services/request.ts`: 原本 `import { message as _message } from 'antd'; _message.error(content)`。改为从 `utils/antd-app-instance` 导入 `getMessage()`，然后 `getMessage().error(content)`；**同时保留静态 message 作为 fallback 的二次兜底**（`const fallback = (c: string) => { try { getMessage().error(c); } catch { message.error(c); } }`；且 `message` 静态导入必须加注释：`// eslint-disable-next-line no-restricted-imports -- fallback 仅在 App 挂载前极端情况使用`）。
- **Acceptance Criteria Addressed**: AC-3, AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-3.1: 用浏览器工具在控制台故意模拟 401（`localStorage.admin_access_token='invalid' + refresh`），network 401 拦截器触发时，仍然弹错误提示，且 console 无静态 message 警告。
  - `programmatic` TR-3.2: tsc 0 错误。
  - `human-judgement` TR-3.3: useRequest 的成功提示（如果有）文字与修复前相同。
- **Notes**: HTTP 请求拦截器触发时 React 树必然已挂载完毕（否则不会有 token 发起请求），所以 setAppInstance 一定会先执行；fallback 仅为防御。

## [x] Task 4: 修复 4 处自闭合 Spin tip 警告（改为包裹模式）
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 定位到的 4 处自闭合 `<Spin tip="加载中..." />`：
    1) `src/pages/arbitration/Case.tsx:593`
    2) `src/pages/auction/Deal.tsx:289`
    3) `src/pages/nft/List.tsx:626`
    4) `src/pages/auction/Items.tsx:470`
  - 修复模式（统一）：`<Spin tip="加载中..." size="default"><div style={{ minHeight: 200, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} /></Spin>`
  - 注意：如果原 Spin 有其他属性（size/className）保持原样；包裹 div 的尺寸依据原容器选取，保证不影响布局（如果原父容器有高度，minHeight 用 200 兜底）
- **Acceptance Criteria Addressed**: AC-2, AC-5, AC-7
- **Test Requirements**:
  - `programmatic` TR-4.1: 代码中 `src/pages/**` grep `<Spin tip=` 自闭合数量 = 0；全部改为有 children 的嵌套写法。
  - `programmatic` TR-4.2: tsc 0 错误。
  - `human-judgement` TR-4.3: 打开 Case 详情页、NFT 详情抽屉加载态，"加载中..."文字正常显示在 spinner 下方。
- **Notes**: App.tsx:73 的 `<Spin size="large" tip="加载中...">` 已有 children div，不修改，已验证不触发警告。

## [x] Task 5: 回归验证 & 控制台 0 警告
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3, Task 4
- **Description**:
  - `npx tsc --noEmit` 0 错误
  - 如果 vite 没启动则 `npm run dev`，然后通过浏览器自动化或人工触发 6 个关键场景抓取 console 输出：
    ① 登录（success/warning）
    ② 进入 NFT 列表 → 打开详情抽屉（Spin + message）
    ③ 进入新增铸造 → 选中"闪电侠" → 直接点击【提交上链审核】不填 → 触发 3 条校验错误 message
    ④ 模拟 HTTP 错误（evaluate 故意 fetch 不存在接口或手动 401）
    ⑤ 删除一条 NFT → message.success
    ⑥ 点击退出登录 → message.success
  - 每个场景控制台 filter 为 `warning level` + 包含 `[antd:` 的数量 = 0
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-6, AC-7
- **Test Requirements**:
  - `programmatic` TR-5.1: tsc --noEmit 退出码 0
  - `programmatic` TR-5.2: 6 个场景控制台 `[antd: message]` 与 `[antd: Spin]` 类警告出现次数 = 0
  - `human-judgement` TR-5.3: 每个场景 message 视觉效果（颜色/时长/位置）与修复前相同
- **Notes**: 不排查其他非 AntD 警告（例如 React key 警告），仅对本次 2 条日志负责。
