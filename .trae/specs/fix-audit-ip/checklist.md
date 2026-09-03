# 修复审计日志 IP 地址显示不准确 — Verification Checklist

- [x] Checkpoint 1: audit.ts 中新增了 getClientIp(req) 函数，从 X-Forwarded-For/X-Real-IP/CF-Connecting-IP/req.ip/remoteAddress 多来源提取
- [x] Checkpoint 2: getClientIp 内部每个 IP 头读取都有 try-catch 保护
- [x] Checkpoint 3: getClientIp 能从 X-Forwarded-For 链中提取首个非内网 IP
- [x] Checkpoint 4: audit.ts L644 的 `formatIp(req.ip)` 已替换为 `formatIp(getClientIp(req))`
- [x] Checkpoint 5: auth.ts L90 和 L175 的 `formatIp(req.ip)` 已替换为 `formatIp(getClientIp(req))`
- [x] Checkpoint 6: getClientIp 单元测试覆盖 X-Forwarded-For / X-Real-IP / CF-Connecting-IP / 全内网 fallback / 无头 fallback 等场景
- [x] Checkpoint 7: vitest 全部通过（既有 61 + 新增 ≥ 6）
- [x] Checkpoint 8: TypeScript 编译通过（admin-api 下 npx tsc --noEmit 退出码 0）
- [x] Checkpoint 9: 触发写操作后查看审计日志详情，IP 地址字段显示有意义的值（非空白/undefined/null）
- [x] Checkpoint 10: 后端数据库 audit_logs 最新记录的 ip 字段非空

