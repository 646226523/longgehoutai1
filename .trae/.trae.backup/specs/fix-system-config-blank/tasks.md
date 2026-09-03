# 修复任务列表 — 系统配置页面空白 BUG

## Task 1: mock-plugin.js 添加系统配置 Mock API
- **优先级**: high
- **状态**: completed
- **描述**: 在 mock-plugin.js 中添加 `/api/system/configs` GET、`/api/system/configs/:key` PUT、`/api/system/map-config` GET 接口
- **测试要求**:
  - [rule] GET /api/system/configs 返回有效分组数据 (groups 数组非空) — ✅ PASS (3 分组/9 配置项)
  - [rule] GET /api/system/map-config 返回有效地图配置 — ✅ PASS
  - [rule] PUT /api/system/configs/:key 能正确更新配置值 — ✅ PASS (代码审查)
- **完成证据**: API 测试 `groups count: 3, list count: 9`，代码审查确认接口正确

## Task 2: Config.tsx 添加空值防御
- **优先级**: high
- **状态**: completed
- **描述**: 在 loadConfigs 中对返回数据做空值检查，确保 res 为 null/undefined 时页面不崩溃
- **测试要求**:
  - [rule] 当 getConfigs 返回 null 时，页面不崩溃，显示空数据状态 — ✅ PASS (`Array.isArray(res?.groups) ? res!.groups : []`)
  - [rule] 当 getConfigs 返回有效数据时，页面正常渲染 — ✅ PASS
- **完成证据**: 代码审查确认 null 安全检查，浏览器验证页面正常渲染

## Task 3: 端到端验证
- **优先级**: high
- **状态**: completed
- **描述**: 启动开发服务器，访问系统配置页面，验证所有功能正常
- **测试要求**:
  - [rule] 页面正常加载，显示配置分组 — ✅ PASS (截图显示 3 个 Tab)
  - [rule] 控制台无 TypeError — ✅ PASS (仅 React DevTools info 提示)
  - [rule] 切换 Tab 正常 — ✅ PASS (三个 Tab 均切换正常)
  - [rule] 配置项表格数据正确展示 — ✅ PASS (表格显示完整数据列和行)
- **完成证据**: 浏览器截图 3 张 + 控制台检查通过
