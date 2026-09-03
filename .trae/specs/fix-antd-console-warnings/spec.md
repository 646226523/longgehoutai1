# 修复 AntD 控制台 2 条警告 - PRD

## Overview
- **Summary**: 修复 admin-web 控制台持续出现的 2 条 AntD 官方弃用/上下文警告：① `[antd: message] Static function can not consume context like dynamic theme. Please use 'App' component instead.`（静态 message 无法消费主题上下文）；② `[antd: Spin] \`tip\` only work in nest or fullscreen pattern.`（自闭合 Spin 的 tip 属性无效）。通过顶层 App context 注入、组件内切换 `useApp().message`、非组件代码引入实例注册机、以及自闭合 Spin 改包裹模式，实现控制台 0 警告，同时保留所有用户反馈功能不变。
- **Purpose**: 控制台有警告意味着：(a) 动态主题（ConfigProvider 自定义主题）时静态 message 会使用默认主题，出现颜色不一致；(b) Spin tip 不会显示"加载中..."文字，影响用户体验；(c) 项目上线后 console 不整洁，后续排查真正问题困难。修复后可以统一主题、消除混淆。
- **Target Users**: 后台管理员、二次开发工程师。

## Goals
- 控制台不再出现上述 2 条 AntD 警告（刷新页面、进入 NFT 列表、提交新增铸造、触发接口错误各场景都 0 警告）
- 所有 message 提示（成功/失败/警告/loading）文字内容与样式保持不变，调用方不需要修改参数
- HTTP 拦截器、自定义 hook、普通页面组件都能一致地弹出提示
- 现有所有使用 Spin tip 加载提示的页面，加载时能继续显示"加载中..."文字

## Non-Goals (Out of Scope)
- 不迁移 Modal / notification 静态调用（虽然它们同样有上下文问题，但用户只提供了 2 条 message/Spin 日志，不在本次 scope）
- 不重构业务逻辑，不增删字段，不改变交互行为
- 不改动 AntD 版本
- 不引入额外依赖（如 zustand 等全局 store；用原生 React ref + 模块级单例即可）

## Background & Context
- 技术栈：React 18 + AntD 5.17.4 + TypeScript + Vite
- 顶层 `App.tsx` **已经使用** `import { App as AntdApp } from 'antd'` 在第 85 行用 `<AntdApp>` 包裹了整棵 `<Routes>`，具备提供 message/modal/notification 实例的基础能力
- 触发警告 1 的调用路径：点击 NFT 列表页「新增铸造」Modal → 提交 → handleMintSubmit（`List.tsx` 第 382 行）→ `message.error(...)`。代码库全量搜索共 **148 处** `message.(success|error|info|warning|warn|loading|open|config)` 调用，分布在：页面组件 / 自定义组件（ImageUploader）/ 布局组件（AdminLayout）/ 自定义 hook（useRequest.ts）/ axios 拦截器（services/request.ts 用 `_message.error` 别名）/ 登录找回密码页面（Login.tsx、ForgotPassword.tsx，在 `<AntdApp>` 子树内）
- 触发警告 2 的调用路径：任意使用自闭合 `<Spin tip="加载中..." />` 的组件 render。全量搜索共 **4 处**（Case.tsx/Deal.tsx/Items.tsx/NFT List.tsx）；App.tsx 第 73 行的 Spin 已包裹 div 作为 children，不触发警告
- AntD 5 官方要求：动态主题下的 message/modal/notification 必须通过 `App.useApp()` hook 拿实例，不能用 `import { message } from 'antd'` 静态调用；Spin 的 tip 只在"包裹内容（children 存在）"或"fullscreen 模式"下生效，自闭合无 children 时 tip 被忽略且警告。

## Functional Requirements
- **FR-1（全局 message 实例注册器）**：新增一个模块 `src/utils/antd-app-instance.ts`，提供 `setAppInstance(app)`（在 App.tsx 顶层组件 useEffect 里调用一次注入）、`getMessage()`（任何地方调用，返回实例，注入前 fallback 到静态 message，保证启动阶段不报错）
- **FR-2（顶层注入）**：在 `App.tsx` 顶层组件内调用 `const app = AntdApp.useApp()`，并在 useEffect 中调用 `setAppInstance(app)`，保证子组件挂载前完成
- **FR-3（组件层切换）**：对所有在 React 组件/自定义 hook body 中出现的 `message.xxx()`，统一改为：
  - `import { App } from 'antd'` + `const { message } = App.useApp()`
  - 移除 `import { message } from 'antd'`
  - 函数签名 `success()/error()/warning()/info()/loading()` 完全兼容，调用参数不变
- **FR-4（非组件层切换）**：services/request.ts（axios 拦截器）中原本的 `_message.error(content)` 改为从 `antd-app-instance.getMessage()` 取实例再调用 `.error(content)`
- **FR-5（Spin tip 修复）**：4 处自闭合 `<Spin tip="加载中..." />` 统一改为：
  - 包裹一个占位 div 作为 children，保留 tip 属性
  - 占位 div 具有最小高度（200px 左右）以确保 spinner+文字视觉居中
  - `Case/Deal/Items/NFT List` 4 个页面均按此方式修改

## Non-Functional Requirements
- **NFR-1（0 警告）**：修复后 6 个关键场景（登录/进入 NFT 列表/打开新增铸造/提交上链审核/删除记录/模拟 HTTP 401 拦截器触发）刷新/操作控制台无 AntD `Warning:` 级别输出
- **NFR-2（行为一致）**：原有 message 文案与消失时长不变；Spin 视觉和 tip 显示位置不变
- **NFR-3（编译 0 错误）**：tsc `--noEmit` 0 errors
- **NFR-4（调用语义兼容）**：MessageInstance 返回值（Promise 或 key 函数）与原生保持一致，例如 `message.loading('x', 0)` + `message.success` 的关闭语义不变

## Constraints
- **Technical**: 必须继续使用 AntD 5；不引入新依赖；不更改 Antd ConfigProvider；保持 `App.useApp()` 只能在组件/自定义 hook 顶层调用的 React 规则
- **Business**: 所有业务按钮操作的成功/失败提示文字必须原样保留（比如 `message.success('删除成功')` 文本一字不改）
- **Dependencies**: AntD `App` 组件已有；React 18 hooks 规则不变

## Assumptions
- 顶层 `<AntdApp>` 只存在一个实例（现在在 App.tsx 里），不会再有嵌套 `<App>` 覆盖实例
- 页面组件均为函数组件且都在 `<AntdApp>` 子树内（Login/ForgotPassword 已在 `<Routes>` 子节点，受 `<AntdApp>` 包裹）
- 非组件代码调用 getMessage() 时即使实例尚未注入（App.tsx useEffect 执行前），使用静态 fallback 能显示并允许短暂上下文警告，这种情况理论上不会发生（HTTP 请求至少在页面挂载后才会触发）

## Acceptance Criteria

### AC-1：NFT 列表 handleMintSubmit 提交不再触发静态 message 警告
- **Given**: 已登录，已打开新增铸造 Modal 且填完内容
- **When**: 点击【提交上链审核】或触发 handleMintSubmit 分支
- **Then**: 控制台不再出现 `[antd: message] Static function can not consume context...` 警告
- **Verification**: `programmatic`
- **Notes**: 具体 stack 里的 List.tsx 第 382 行是调用点，需验证实例已切换

### AC-2：4 处自闭合 Spin tip 警告全部消除
- **Given**: 进入任意使用自闭合 Spin 的页面（Case/Deal/Items/NFT List 的详情加载态）
- **When**: 该 Spin 组件 render 时
- **Then**: 控制台不再出现 `[antd: Spin] \`tip\` only work in nest or fullscreen pattern.` 警告
- **Verification**: `programmatic`
- **Notes**: 必须同时验证 tip 仍然实际显示（有 children 后 tip 会显示）

### AC-3：非组件层 HTTP 错误拦截仍能弹提示
- **Given**: 登录状态，token 过期（模拟 401 响应）
- **When**: 触发任意 GET/POST 请求返回 4xx/5xx
- **Then**: services/request.ts 拦截器中依然弹出 message.error 红色提示条，文字内容等于原 content，且控制台不出现静态 message 警告
- **Verification**: `programmatic`

### AC-4：静态 message 导入 0 残留
- **Given**: 修复完成的代码
- **When**: 在 `src/**/*.ts(x)` 下搜索 `import.*\bmessage\b.*from.*antd`
- **Then**: 不出现任何组件文件的 `message` 静态导入（允许 services/request.ts 仅在 fallback 时引用静态，且有明确注释说明仅作 fallback）
- **Verification**: `programmatic`

### AC-5：tsc 编译 0 错误
- **Given**: 修复完成的代码
- **When**: 执行 `npx tsc --noEmit`
- **Then**: 退出码为 0，且 stdout/stderr 无 error 行
- **Verification**: `programmatic`

### AC-6：关键页面操作 message 提示文字与行为一致
- **Given**: 登录进入 NFT 列表 → 新增铸造 → 不填直接提交
- **When**: 依次点击提交上链审核 / 删除 / 保存草稿等按钮
- **Then**: 提示文案与修复前完全一致（"请先关联基因档案" / "删除成功" 等）
- **Verification**: `human-judgment`

### AC-7：Spin 加载时 tip 文字可见
- **Given**: 进入 Case 详情页或 NFT List 详情页触发 loading 态
- **When**: Spin 组件显示时
- **Then**: "加载中..."文字显示在 spinner 下方，视觉居中
- **Verification**: `human-judgment`

## Open Questions
- [ ] 若未来要同样迁移 Modal.confirm 静态调用，是否需要扩展 setAppInstance 为保存整个 app 对象（message + modal + notification）而不是只取 message？→ 当前设计已保存整个 app 实例，后续可直接扩展 `getModal()`/`getNotification()`，无技术风险。
