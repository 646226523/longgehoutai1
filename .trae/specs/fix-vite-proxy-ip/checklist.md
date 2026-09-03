# 修复 Vite Proxy 丢失客户端 IP - 验证清单

## 配置层
- [ ] vite.config.ts `/api` proxy 配置包含 `xfwd: true`
- [ ] TypeScript 编译通过
- [ ] Vite dev server 已重启加载新配置

## 后端 API 层
- [ ] 通过 Vite proxy 的登录请求，后端 audit_log.ip 字段为真实公网 IP（非 localhost）
- [ ] 直接 Node.js 请求（带 X-Forwarded-For）与通过 Vite proxy 请求，audit_log.ip 值一致
- [ ] Express trust proxy=true 配置未被误改

## 浏览器展示层
- [ ] 审计日志页面表格正常加载
- [ ] 详情抽屉 IP 地址行显示真实公网 IP
- [ ] 详情抽屉 IP 可复制按钮功能正常
- [ ] 无 TypeError 或控制台报错
