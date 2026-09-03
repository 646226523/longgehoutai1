# 修复系统配置页面空白 BUG

## 问题

访问"系统管理 → 系统配置"页面时，页面内容区域完全空白，仅显示页面标题"系统配置"。控制台报错：`TypeError: Cannot read properties of null (reading 'groups')`。

## 根因

1. **Mock 服务器缺少 `/api/system/configs` 接口处理器** — 请求被 catch-all 拦截器处理，返回 `{ code: 0, message: 'mock', data: null }`
2. **Config.tsx 前端组件未做空值防御** — `getConfigs()` 返回 `null`，但组件直接访问 `res.groups` 导致 TypeError 崩溃

## 影响范围

- 系统配置页面完全不可用
- 地图配置子功能无法使用（`/api/system/map-config` 同样无 Mock）

## 修复方案

### 1. mock-plugin.js — 添加系统配置 Mock API

新增以下接口处理器：
- `GET /api/system/configs` — 返回分组配置列表
- `PUT /api/system/configs/:key` — 更新单个配置值
- `GET /api/system/map-config` — 返回地图配置

### 2. Config.tsx — 添加空值防御

在 `loadConfigs` 函数中对返回数据进行空值检查：
- `res` 为 `null` 或 `undefined` 时使用默认值
- `res.groups` 非数组时使用空数组

## 验收标准

| # | 标准 | 类型 |
|---|------|------|
| AC1 | 系统配置页面正常加载，显示配置分组 Tab | rule |
| AC2 | 页面无空白/崩溃，控制台无 TypeError | rule |
| AC3 | 配置项表格数据正确展示 | rule |
| AC4 | 地图配置 Tab 中可选择地图服务商 | rule |
| AC5 | 切换分组 Tab 功能正常 | rule |
| AC6 | 接口返回异常时页面优雅降级，不崩溃 | rule |
