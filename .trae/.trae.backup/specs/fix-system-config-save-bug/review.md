# 修复系统配置保存按钮 BUG — 审查报告

## 审查日期
2026-08-19

## 问题
点击系统配置页面的"保存"按钮时，弹出错误提示"缺少配置键"，导致配置无法保存。

## 根因
Express 中间件路径前缀匹配行为：当使用 `server.middlewares.use('/api/system/configs', handler)` 注册中间件时，Express 会**自动剥离匹配的路径前缀**，使得 handler 内的 `req.url` 变为相对路径。

例如：
- 请求 `PUT /api/system/configs/map_provider`
- 中间件 handler 内 `req.url` = `/map_provider`（而非 `/api/system/configs/map_provider`）

原代码使用完整路径正则 `req.url.match(/^\/api\/system\/configs\/([^/?]+)/)`，因路径前缀已被剥离而匹配失败，导致 configKey 为空，返回"缺少配置键"错误。

## 修复方案
将两个分离的中间件（GET 和 PUT）合并为一个统一的处理器，正确解析 Express 剥离前缀后的相对路径：
- `req.url` = `/` → 列表请求（GET）
- `req.url` = `/map_provider` → 单键请求（PUT）

## 验收结果

| # | 验收标准 | 类型 | 结果 | 证据 |
|---|---------|------|------|------|
| AC1 | PUT 请求成功处理 | rule | ✅ PASS | `curl -X PUT` 返回 `{"code":0,"message":"更新成功"}` |
| AC2 | GET 请求不受影响 | rule | ✅ PASS | GET 仍返回 3 分组/9 配置项 |
| AC3 | 数据持久化 | rule | ✅ PASS | PUT 后 GET 返回新值 `tencent` |
| AC4 | 浏览器端保存正常 | rule | ✅ PASS | Select→保存→按钮恢复禁用 流程成功 |
| AC5 | 控制台无 TypeError | rule | ✅ PASS | 无错误日志 |

## 技术要点
- Express/Connect 中间件 `app.use('/prefix', handler)` 会剥离路径前缀
- handler 内 `req.url` 为剥离后的相对路径
- 同一中间件路径下，PUT/GET 等方法需要在同一 handler 内处理

## 结论
**审查通过** ✅

根因已定位并修复，系统配置的保存功能恢复正常。
