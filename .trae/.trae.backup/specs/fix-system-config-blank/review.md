# 修复系统配置页面空白 BUG — 审查报告

## 审查日期
2026-08-19

## 问题概述
访问"系统管理 → 系统配置"页面时，内容区域完全空白，仅显示页面标题。

## 根因分析
1. **Mock 服务器缺失接口**：`/api/system/configs` 无专用处理器，被 catch-all 拦截器处理返回 `{ code: 0, data: null }`
2. **前端无空值防御**：`Config.tsx` 的 `loadConfigs` 函数直接访问 `res.groups`，当 `res` 为 `null` 时抛出 `TypeError: Cannot read properties of null (reading 'groups')`，导致 React 组件崩溃白屏

## 修复内容

### 文件 1: `server/mock-plugin.js`
- 新增 `MOCK_SYSTEM_CONFIGS` 模拟数据（3 个分组、9 个配置项）
- 新增 `GET /api/system/configs` 接口处理器（支持按分组筛选）
- 新增 `PUT /api/system/configs/:key` 接口处理器（更新配置值）
- 新增 `GET /api/system/map-config` 接口处理器（地图配置）
- 更新 catch-all 拦截器 `skip` 列表，添加 `/api/system/configs`

### 文件 2: `src/pages/system/Config.tsx`
- `loadConfigs` 函数添加空值防御：`Array.isArray(res?.groups) ? res!.groups : []`
- `catch` 分支中增加 `setGroups([])` 确保异常时页面不崩溃
- 补全 `GROUP_LABEL` 映射：添加 `upload → 上传配置`、`business → 业务配置`

## 验收结果

| # | 验收标准 | 类型 | 结果 | 证据 |
|---|---------|------|------|------|
| AC1 | 页面正常加载，显示配置分组 Tab | rule | ✅ PASS | 截图显示"地图配置"、"上传配置"、"业务配置"三个 Tab |
| AC2 | 控制台无 TypeError | rule | ✅ PASS | 控制台仅有 React DevTools 提示，无错误 |
| AC3 | 配置项表格数据正确展示 | rule | ✅ PASS | 表格显示配置名称/键/值/说明/时间等列及数据行 |
| AC4 | 地图配置 Tab 中可选择服务商 | rule | ✅ PASS | Tab 内表格包含"地图服务商"配置项，Select 组件正常渲染 |
| AC5 | 切换分组 Tab 功能正常 | rule | ✅ PASS | 三次点击切换 Tab 均正常，表格数据随之更新 |
| AC6 | 接口异常时页面优雅降级 | rule | ✅ PASS | 代码审查确认 null 防御逻辑正确 |

## 独立测试证据
- API 测试：`GET /api/system/configs` 返回正确数据（3 分组、9 配置项）
- 浏览器测试：页面加载正常，Tab 切换流畅，无任何 TypeError
- 控制台：零错误（仅 React DevTools info 提示，属正常开发环境输出）

## 风险评估
- **低风险**：修改局限于系统配置模块，不影响其他功能
- **兼容性**：新增 Mock 接口，不修改已有接口
- **防御性**：前端空值防御确保即使后端异常也不会白屏

## 结论
**审查通过** ✅

系统配置页面已恢复正常功能，所有验收标准通过。
