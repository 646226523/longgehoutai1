# 修复 ERR_ABORTED /login - 独立审查

- [x] CP-R1: 401 流程只触发一次到 /login 的重定向
  - **Type**: `rule`
  - **Covers**: AC-1, AC-2; TR-4.1, TR-4.2
  - **Evidence**: 场景1（过期双 token）Network 无 ERR_ABORTED，只发起一次 document 导航到 /login；场景2（仅过期 accessToken + 无 refreshToken）同上

- [x] CP-R2: logout 不污染 history 栈
  - **Type**: `rule`
  - **Covers**: AC-3; TR-4.3
  - **Evidence**: 场景3 执行 logout（replace）后，点击浏览器 Back 仍停留在 /login，无法回到登出前业务页

- [x] CP-R3: 正常登录→业务→登出全链路无回归
  - **Type**: `rule`
  - **Covers**: AC-4; TR-4.4
  - **Evidence**: 场景4 手动破坏 accessToken 后刷新，refreshToken 自动恢复 accessToken（正常刷新流程）；场景5 Dashboard 业务 API 正常返回 200

- [x] CP-R4: TypeScript 编译零错误
  - **Type**: `rule`
  - **Covers**: AC-5
  - **Evidence**: `npx tsc --noEmit` exit code = 0

- [x] CP-U1: 认证重定向职责清晰度
  - **Type**: `rubric`
  - **Covers**: AC-6; TR-1.1, TR-3.1, TR-3.2
  - **Scale**: 1-5
  - **Anchors**: 1 = 多处散落调用互相打架；3 = 统一入口但有注释说明；5 = 单一权威入口 + 调用方无需关心重定向
  - **Pass Threshold**: >= 4
  - **Evidence**: grep 验证 — 唯一的重定向入口是 request.ts redirectToLogin()（带幂等保护 + 路径保护），App.tsx 不再有任何重定向代码，auth.ts logout() 也用 LOGIN_PATH 常量统一引用

## Review History

### Review R1
- **Result**: `pass`
- **Evidence**:
  - tsc --noEmit exit code 0
  - grep 验证: 重定向调用点收敛到 2 处 (request.ts redirectToLogin + auth.ts logout)
  - 5 个 E2E 场景浏览器手动测试全部通过
  - 场景1/2 修复前后对比：修复前 ERR_ABORTED 存在双重 replace，修复后只有一次 replace
- **Blocked By**: 无
- **Resume When**: N/A
