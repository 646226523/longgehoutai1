# 修复任务列表 — 系统配置保存按钮 BUG

## Task 1: 诊断 PUT 请求失败根因
- **优先级**: high
- **状态**: completed
- **描述**: 定位"点击保存提示缺少配置键"的根因
- **测试要求**:
  - [rule] 使用 curl 直接测试 PUT 接口，确认 400 错误来自服务端 — ✅ PASS
  - [rule] 添加调试日志确认 req.url 实际值 — ✅ PASS (发现 Express 剥离路径前缀)
- **完成证据**: curl 返回 `{"code":400,"message":"缺少配置键"}`，调试日志显示 `req.url = /map_provider`（非完整路径）

## Task 2: 修复 mock-plugin.js PUT 接口
- **优先级**: high
- **状态**: completed
- **描述**: 合并 GET/PUT 到单一中间件，适配 Express 路径前缀剥离行为
- **测试要求**:
  - [rule] PUT /api/system/configs/map_provider 返回成功 — ✅ PASS (`{"code":0,"message":"更新成功"}`)
  - [rule] GET /api/system/configs 仍正常工作 — ✅ PASS (返回 3 分组/9 配置项)
  - [rule] 更新后数据持久化 — ✅ PASS (GET 返回新值)
- **完成证据**: curl 测试 PUT→GET 流程成功，数据从 `amap` 更新为 `tencent`

## Task 3: 浏览器端到端验证
- **优先级**: high
- **状态**: completed
- **描述**: 在浏览器中验证保存功能完整流程
- **测试要求**:
  - [rule] 页面加载正常，无 TypeError — ✅ PASS
  - [rule] Select 切换值后保存按钮变为可用 — ✅ PASS
  - [rule] 点击保存后按钮恢复禁用（值已保存） — ✅ PASS
  - [rule] 数据实际已更新 — ✅ PASS (API 验证)
- **完成证据**: browser_use 脚本成功完成 Select 切换→保存→验证流程
