# 修复 Vite Proxy 丢失客户端 IP - 实施计划

## [ ] Task 1: Vite proxy 添加 xfwd: true

- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 `admin-web/vite.config.ts` 的 `/api` proxy 配置项中添加 `xfwd: true`
  - 修改后完整 proxy 配置应为：
    ```ts
    proxy: {
      '/api': {
        target: 'http://localhost:3015',
        changeOrigin: true,
        xfwd: true,
      },
    },
    ```
  - 同时添加注释说明作用：开启 http-proxy 自动注入 X-Forwarded-For 等头
  - 重启 Vite dev server 使配置生效

- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: vite.config.ts 中 `/api` proxy 配置包含 `xfwd: true` 选项
  - `programmatic` TR-1.2: TypeScript 编译通过（`npx tsc --noEmit`）

- **Notes**: 改动极小（1 行），但必须重启 Vite dev server 才能生效

## [ ] Task 2: 验证后端收到 X-Forwarded-For 头

- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Vite dev server 重启后，用浏览器或 curl 发起登录请求
  - 直接调用后端 API 检查最新一条 audit_log 的 ip 字段
  - 同时对比 Node.js 直接请求（带 X-Forwarded-For）和通过 Vite proxy 请求的结果是否一致

- **Acceptance Criteria Addressed**: AC-2, AC-3
- **Test Requirements**:
  - `programmatic` TR-2.1: 通过 Vite proxy 请求后新生成的 audit_log.ip !== "localhost"
  - `programmatic` TR-2.2: audit_log.ip 等于浏览器网络层 IP（119.126.114.228）

## [ ] Task 3: 浏览器端验收

- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - 浏览器访问审计日志页面
  - 执行一次登录或其他写操作产生新日志
  - 打开最新记录的详情抽屉
  - 确认 IP 地址行显示真实公网 IP

- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgement` TR-3.1: 详情抽屉 IP 字段显示真实公网 IP，不是 localhost
  - `human-judgement` TR-3.2: 截图留存证据
