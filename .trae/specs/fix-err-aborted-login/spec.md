# 修复 ERR_ABORTED /login 错误日志 Bug - 产品需求文档

## Overview
- **Summary**: 修复用户浏览器 Console 中偶现的 `net::ERR_ABORTED http://localhost:3014/login` 错误日志，该错误来源于 401 未授权场景下的**双重重定向竞态**。
- **Purpose**: 消除无意义的 ERR_ABORTED 控制台噪音，并防止其在极端情况下（如 localStorage 读写时序问题）引发跳转死循环或白屏。
- **Target Users**: 后端管理平台的所有登录用户。

## Goals
- 消除 401 未授权流程中对 `/login` 的双重重定向，确保只触发一次文档级导航
- 消除 logout 操作对浏览器 history 栈的不必要污染
- 保持现有认证/重定向行为完全向后兼容（token 清除、UI 跳转路径不变）

## Non-Goals
- 不修改后端认证 API（`/api/auth/login`、`/api/auth/refresh`、`/api/auth/profile` 的协议和返回格式不变）
- 不重构 axios 请求拦截器的整体架构（仅修复重定向触发点的冗余）
- 不处理 HMR 热更新时 Vite 自己产生的 ERR_ABORTED（那是 Vite 内部行为）

## Background & Context

### 根因分析

项目中存在 **4 处** 触发 `/login` 导航的代码，其中 2 处形成了竞态：

| # | 位置 | 代码 | 触发条件 |
|---|------|------|----------|
| 1 | `request.ts:255` | `redirectToLogin()` | 401 且无 refreshToken |
| 2 | `request.ts:283` | `redirectToLogin()` | 401 有 refreshToken 但刷新失败 |
| 3 | `request.ts:322` | `window.location.replace(LOGIN_PATH)` | `redirectToLogin()` 内部，带路径保护 |
| 4 | `App.tsx:70` | `window.location.replace('/login')` | RequireAuth.loadUser 的 catch 捕获 401 |

**双重重定向路径**：

```
用户访问受保护路由 → /api/auth/profile 返回 401
  → request.ts 拦截 → 尝试 refresh → refresh 也失败
  → redirectToLogin() → window.location.replace('/login')  ← 第一次导航发起
  → Promise.reject(refreshErr)
  → 传播到 RequireAuth.loadUser().catch()
  → catch 内又 window.location.replace('/login')          ← 第二次 replace 立即 abort 第一次
  → Network 面板显示 ERR_ABORTED http://localhost:3014/login
```

同理，"无 refreshToken" 的 401 场景也会触发相同的双重重定向（`request.ts:255` + `App.tsx:70`）。

### 附带问题
- `auth.ts:36` 的 `logout()` 使用 `window.location.href = '/login'` 而非 `replace`，会在 history 栈留下残留记录（用户按浏览器 Back 可能会回到登出前页面）

## Functional Requirements

- **FR-1**: 401 未授权时，系统必须且只能触发一次到 `/login` 的重定向
- **FR-2**: 重定向时必须清除所有认证相关 localStorage 键
- **FR-3**: `logout()` 必须使用 `replace` 而非 `href` 以清空 history 栈
- **FR-4**: 必须保留 RequireAuth 对 ERR_ABORTED 的静默处理（浏览器正常导航时的请求中断不应弹错）
- **FR-5**: 必须保留 RequireAuth 的 networkError 降级 UI（后端全挂时显示友好错误页）

## Non-Functional Requirements

- **NFR-1**: 修复后 TypeScript 编译通过（`tsc --noEmit` 零错误）
- **NFR-2**: 不引入任何新的运行时依赖或新的全局状态
- **NFR-3**: 修改范围局限于 `request.ts`、`App.tsx`、`auth.ts` 三个文件

## Constraints
- **Technical**: 必须保持 axios 拦截器的响应解包行为不变（`res.data` 自动解包）
- **Dependencies**: 依赖现有 `ACCESS_TOKEN_KEY` / `REFRESH_TOKEN_KEY` / `USER_INFO_KEY` 的存储位置和命名

## Assumptions
- `request.ts` 的 axios 响应拦截器是所有 HTTP 请求的统一入口，所有 API 调用都经过它
- 401 响应的唯一合规处理是清除 token + 跳转登录页（不做静默重试）

## Acceptance Criteria

### AC-1: 401 场景只触发一次重定向
- **Type**: `rule`
- **Given**: 用户 localStorage 中有过期的 accessToken 和 refreshToken
- **When**: 用户访问受保护路由（如 `/`）
- **Then**: Network 面板中只有一次文档级导航到 `/login`（无 ERR_ABORTED），Console 中无 ERR_ABORTED 错误
- **Pass Condition**: `window.location.replace('/login')` 在 401 流程中最多被调用一次；ERR_ABORTED 日志不再出现
- **Evidence**: 浏览器 DevTools Network 面板截图；Console 面板截图

### AC-2: 无 refreshToken 时的 401 也只触发一次重定向
- **Type**: `rule`
- **Given**: 用户 localStorage 中有过期的 accessToken 但无 refreshToken
- **When**: 用户访问受保护路由
- **Then**: Network 面板中只有一次文档级导航到 `/login`
- **Pass Condition**: 同 AC-1
- **Evidence**: 浏览器 DevTools Network 面板截图

### AC-3: logout 不污染 history
- **Type**: `rule`
- **Given**: 用户已登录，在 `/gene/detail/1` 页面
- **When**: 用户执行 logout
- **Then**: 跳转到 `/login`，浏览器 Back 按钮不可回到 `/gene/detail/1`（History Length 减少 1）
- **Pass Condition**: 点击 Back 不会回到登出前的业务页面
- **Evidence**: 手动回归测试

### AC-4: 正常登录 → 访问业务路由 → 登出 全链路回归
- **Type**: `rule`
- **Given**: 用户在登录页
- **When**: 用户正常登录 → 访问业务路由 → 登出
- **Then**: 各步骤无异常，无 ERR_ABORTED 日志
- **Pass Condition**: 手动回归测试通过
- **Evidence**: 手动回归测试记录

### AC-5: TypeScript 编译通过
- **Type**: `rule`
- **When**: 运行 `tsc --noEmit`
- **Then**: 零错误
- **Pass Condition**: `tsc --noEmit` exit code = 0
- **Evidence**: 命令行输出

### AC-6: 代码可维护性提升（消除冗余）
- **Type**: `rubric`
- **Dimension**: 认证重定向职责清晰度
- **Scale**: 1-5
- **Anchors**: 1 = 多处散落调用互相打架；3 = 统一入口但有注释说明；5 = 单一权威入口 + 调用方无需关心重定向
- **Pass Threshold**: >= 4
- **Evidence**: 代码审查；重构后 request.ts + App.tsx + auth.ts 的重定向逻辑审视
