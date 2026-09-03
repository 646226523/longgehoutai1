# 修复检测机构创建后列表不可见问题

## 问题描述

用户在检测机构管理页面创建新机构时，系统提示"创建成功"，但在机构列表中看不到任何已创建的检测机构信息。

## 根本原因

**Mock 插件缺少检测机构路由处理，catch-all 返回空数据。**

`admin-web/server/mock-plugin.js` 第 430-436 行的 catch-all 处理器拦截了所有未注册的 `/api/*` 路由，统一返回：

```json
{ "code": 0, "message": "mock", "data": null }
```

检测机构路由（`/api/detection/orgs`）未在 mock 插件中注册，导致：
1. **POST 创建请求**：返回 `{ code: 0, data: null }` → 前端认为"成功"（code=0），但实际数据未存储
2. **GET 列表请求**：返回 `{ code: 0, data: null }` → 前端解析 `res.list` 为 undefined，列表为空

## 影响范围

- `admin-web/server/mock-plugin.js`：需要添加检测机构 CRUD mock 数据处理器

## 目标用户

- 后台管理员使用检测机构管理功能时，创建后能立即在列表中看到数据

## 功能需求

1. **POST `/api/detection/orgs`**：接收机构数据，存储到内存 Map 中，返回 `{ id: 新ID }`
2. **GET `/api/detection/orgs`**：返回分页列表支持 keyword 和 status 筛选
3. **GET `/api/detection/orgs/options`**：返回仅合作中（status=1）的机构下拉选项
4. **GET `/api/detection/dict/item-types`**：返回检测项目类型字典数据
5. **POST 创建后数据持久存在**：在当前会话中创建的机构能在列表中查询到

## 非功能需求

1. **开发环境自包含**：mock 数据存储在内存中，无需真实后端即可运行检测机构模块
2. **与现有 mock 架构一致**：使用与现有 mock handler 相同的编码风格
3. **TypeScript 编译不受影响**：mock-plugin.js 是纯 JS，不影响 TS 编译

## 约束

- 仅修改 `admin-web/server/mock-plugin.js`
- 不修改后端 admin-api 代码
- 不修改前端 Org.tsx 代码

## 验收标准

### AC-1: 创建机构后列表可见
- 类型：rule
- 在检测机构管理页创建新机构后：
  1. 系统提示"创建成功"
  2. 列表立即显示新创建的机构
  3. 刷新页面后数据仍然存在（内存中）
- 证据：浏览器测试截图

### AC-2: 搜索过滤正常
- 类型：rule
- 列表支持按机构名称/编码/联系人关键字搜索，按状态筛选
- 证据：浏览器交互测试

### AC-3: 下拉选项正确
- 类型：rule
- 检测预约订单页面能获取到检测机构下拉选项（仅 status=1 的合作中机构）
- 证据：浏览器测试

### AC-4: 项目类型字典可用
- 类型：rule
- 创建机构时"可检项目"字段能加载检测项目类型字典
- 证据：浏览器测试

### AC-5: 控制台无错误
- 类型：rule
- 创建和列表操作过程中控制台无 error 级别消息
- 证据：browser_console_messages 输出
