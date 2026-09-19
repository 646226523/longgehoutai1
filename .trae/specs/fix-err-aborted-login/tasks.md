# 修复 ERR_ABORTED /login - 实施计划

## Task 1: 消除 RequireAuth 中的冗余 401 重定向
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - **文件**: `admin-web/src/App.tsx`
  - **操作**: 删除 `RequireAuth.loadUser` 的 `.catch()` 中对 `axiosErr.response?.status === 401` 的处理分支。该分支清除 token 并 `window.location.replace('/login')`，但 request.ts 的 axios 响应拦截器已经统一处理了 401 → refresh → redirectToLogin 的完整流程。删除后，401 错误仍然会被 request.ts 拦截并正确跳转，RequireAuth 只需要关心网络级错误和 ERR_ABORTED 静默。
  - catch 块应该只保留：
    1. `ERR_ABORTED` 静默忽略（现有）
    2. 非 401、非 ERR_ABORTED 的网络异常 → `setNetworkError(true)`（现有）
    3. 去掉整个 401 分支（包括 token 清除和 replace 调用）
  - 注意：`loadUser` 内已经 import 了 `ACCESS_TOKEN_KEY` / `REFRESH_TOKEN_KEY`，删除 401 分支后检查是否还有其他使用，没有则可以一起清理 import

- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-6
- **Test Requirements**:
  - `rule` TR-1.1: `App.tsx` 中不再有任何 `window.location.replace('/login')` 或 token 清除逻辑（grep 验证）；Evidence: grep 命令输出
  - `rule` TR-1.2: `tsc --noEmit` 编译通过；Evidence: 命令退出码 0
  - `rule` TR-1.3: ERR_ABORTED 静默分支和 networkError 分支完整保留；Evidence: 代码审查

---

## Task 2: 修复 logout 不污染 history
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: None
- **Description**:
  - **文件**: `admin-web/src/services/auth.ts`
  - **操作**: 将 `logout()` 函数中的 `window.location.href = '/login'` 改为 `window.location.replace('/login')`
  - 这是一行改动，确保登出后 history 栈不残留业务页面

- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `rule` TR-2.1: logout 使用 `replace` 而非 `href`；Evidence: grep 验证
  - `rule` TR-2.2: `tsc --noEmit` 编译通过；Evidence: 命令退出码 0

---

## Task 3: 统一登录路径常量 + 增强 redirectToLogin 幂等保护
- **Status**: `pending`
- **Priority**: low
- **Depends On**: Task 1
- **Description**:
  - **文件**: `admin-web/src/services/auth.ts`, `admin-web/src/services/request.ts`
  - **操作**:
    1. `auth.ts` 的 logout 中的硬编码 `/login` 改为从 request.ts 导入（或在 auth.ts 中定义同一常量 `LOGIN_PATH = '/login'`）
    2. 给 `redirectToLogin()` 增加一个轻量的"正在重定向"标记，函数开始时检查标记，已标记则直接 return，防止极端情况下（如同步链上的多次调用）仍能触发双重导航
    3. 标记使用模块级 flag + 500ms 超时自动清除（防止永久卡死）

  - 伪代码：
    ```ts
    let isRedirecting = false;
    function redirectToLogin() {
      if (isRedirecting) return;
      isRedirecting = true;
      setTimeout(() => { isRedirecting = false; }, 500);
      // ... 原有的 token 清除 + replace 逻辑
    }
    ```

- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-6
- **Test Requirements**:
  - `rule` TR-3.1: redirectToLogin 增加幂等保护 flag；Evidence: 代码审查
  - `rule` TR-3.2: LOGIN_PATH 常量被统一引用；Evidence: grep 验证
  - `rule` TR-3.3: `tsc --noEmit` 编译通过；Evidence: 命令退出码 0

---

## Task 4: E2E 手动回归测试
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3
- **Description**:
  - 启动 vite dev server + 后端
  - 执行以下场景的手动测试，每个场景 Network 面板和 Console 都要截图：
    1. **过期 accessToken + 过期 refreshToken**：localStorage 手动设置无效 token → 访问 `/` → 观察是否只触发一次到 `/login` 的导航
    2. **过期 accessToken + 无 refreshToken**：只设 accessToken → 访问 `/` → 观察同上
    3. **正常登录 → 访问业务页 → 登出**：验证 Back 按钮行为
    4. **正常登录 → 401 自动处理**：登录后手动改 localStorage 中的 accessToken 为无效值 → 刷新页面 → 观察重定向是否干净
    5. **正常链路无回归**：登录正常、路由守卫正常、业务 API 正常

- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `rule` TR-4.1: 所有 5 个场景 Network 面板中无 ERR_ABORTED；Evidence: 截图
  - `rule` TR-4.2: Console 无 ERR_ABORTED 错误日志；Evidence: 截图
  - `rule` TR-4.3: logout 后 Back 不回到业务页；Evidence: 手动回归
  - `rule` TR-4.4: 正常登录/业务流程无回归；Evidence: 手动回归

