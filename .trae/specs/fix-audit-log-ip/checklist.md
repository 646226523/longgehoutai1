# 审计日志 IP 地址溯源修复 — Verification Checklist

## 代码修改检查
- [x] Checkpoint 1: `admin-web/src/services/request.ts` 请求拦截器中同时设置了 `X-Forwarded-For` 和 `X-Client-Public-IP` 头
- [x] Checkpoint 2: `admin-web/src/services/request.ts` 头设置逻辑有 try-catch 异常处理（在 fetchPublicIp 中）
- [x] Checkpoint 3: `admin-web/src/services/request.ts` 在 `cachedPublicIp` 存在时才设置头（不覆盖代理已有链）
- [x] Checkpoint 4: Vite proxy 配置 `xfwd: true` 保持不变（vite.config.ts）

## Vite proxy 链路验证
- [x] Checkpoint 5: 通过 Vite proxy 发请求带 `X-Forwarded-For: 119.126.114.228`，后端 audit_logs 新记录 ip 字段 = `119.126.114.228`（≠ localhost）✅ 实测 id=15 ip=119.126.114.228
- [ ] Checkpoint 6: 通过 Vite proxy 发请求仅带 `X-Client-Public-IP: 119.126.114.228`（不带 X-Forwarded-For），后端 audit_logs 新记录 ip 字段应 fallback 到 X-Client-Public-IP 的值（验证 getClientIp 的 fallback 逻辑）

## 端到端验收（浏览器驱动）
- [ ] Checkpoint 7: 浏览器控制台输出 `[HTTP] 检测到浏览器公网 IP: {真实IP}`（fetchPublicIp 成功）
- [ ] Checkpoint 8: 登录后 audit_logs 最新记录 ip 字段 ≠ "localhost" 且符合 IPv4 格式
- [ ] Checkpoint 9: 执行业务写操作（修改用户/管理员/内容）后 audit_logs 最新记录 ip 与登录 IP 一致
- [ ] Checkpoint 10: 审计日志页面详情抽屉中 IP 地址字段显示正确公网 IP

## 代码质量与清理
- [ ] Checkpoint 11: `admin-api/src/index.ts` 临时 `/_debug/ip` 调试端点已删除
- [ ] Checkpoint 12: `admin-api/src/routes/_debug.ts` 临时文件已删除（如存在）
- [ ] Checkpoint 13: 根目录 `debug_ip.json` / `debug_ip2.json` 临时文件已删除
- [ ] Checkpoint 14: admin-api `npx tsc --noEmit` exit code 0
- [ ] Checkpoint 15: admin-web `npx tsc --noEmit` exit code 0
- [ ] Checkpoint 16: admin-api `npm run test` 全部测试通过

## 回归风险检查
- [ ] Checkpoint 17: 直连后端（localhost:3015）+ 完整代理链头场景 → getClientIp 正确返回首个公网 IP（生产环境安全）
- [ ] Checkpoint 18: 浏览器未启用公网 IP（fetchPublicIp 失败）→ 审计日志 ip 字段降级为 localhost，但不会报错崩溃
