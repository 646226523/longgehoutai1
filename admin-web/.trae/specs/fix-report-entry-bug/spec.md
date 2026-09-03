# 修复检测报告"录入报告"功能 BUG

## 问题描述

在检测报告管理页面点击"录入报告"按钮时，系统崩溃，控制台报错：

```
TypeError: orderOptions.map is not a function
    at DetectionReport (Report.tsx:320)
```

导致无法打开录入报告的抽屉表单，检测报告功能完全不可用。

## 根本原因

**Connect 中间件路径前缀匹配导致路由冲突。**

`admin-web/server/mock-plugin.js` 中注册了两个使用前缀匹配的中间件：

1. `server.middlewares.use('/api/detection/orders', handler)` (第 648 行)
2. `server.middlewares.use('/api/detection/orgs', handler)` (第 500 行)

Connect 框架的 `use()` 方法使用**路径前缀匹配**，即 `/api/detection/orders` 会匹配所有以该路径开头的请求，包括 `/api/detection/orders/options`。

因此当 `getDetectionOrderOptions()` 请求 `GET /api/detection/orders/options` 时：
1. 请求被 `/api/detection/orders` 的列表处理器（第 648 行）拦截
2. 该处理器不区分精确路径，直接返回分页格式 `{ code: 0, data: { list, total } }`
3. HTTP 拦截器解包后，前端收到 `{ list, total }` 对象而非数组
4. `setOrderOptions({ list, total })` 将状态设为对象
5. 渲染时 `orderOptions.map(...)` 报错，因为对象没有 `.map()` 方法

同样的问题也影响 `getDetectionOrgOptions()` → `/api/detection/orgs/options`。

## 影响范围

**受影响页面：**
- `admin-web/src/pages/detection/Report.tsx`：录入报告、编辑报告功能完全不可用
- `admin-web/src/pages/detection/Order.tsx`：创建/编辑订单时的机构下拉选项可能异常

**受影响文件：**
- `admin-web/server/mock-plugin.js`：路由处理逻辑

## 目标用户

- 后台管理员使用检测报告录入功能时，能正常打开表单、选择关联订单、鸽只基因档案、检测机构、检测项目等

## 功能需求

1. **GET `/api/detection/orders/options`**：必须返回纯数组 `DetectionOrderOption[]`，不能返回分页格式
2. **GET `/api/detection/orgs/options`**：必须返回纯数组 `DetectionOrgOption[]`，不能返回分页格式
3. **GET `/api/detection/orders`**（分页列表）：仅匹配精确路径，不应拦截 `/options`、`/:id` 等子路由
4. **GET `/api/detection/orgs`**（分页列表）：仅匹配精确路径，不应拦截 `/options`、`/:id`、`/:id/status` 等子路由
5. **录入报告抽屉**：打开时所有下拉选项（订单、鸽只、机构、项目）正常加载和渲染

## 非功能需求

1. **向后兼容**：修复不改变任何 API 的请求/响应格式
2. **性能**：不引入额外的请求或计算开销
3. **代码风格一致**：修复代码与现有 mock handler 编码风格一致

## 约束

- 仅修改 `admin-web/server/mock-plugin.js`（根因修复）
- 可选修改前端服务函数增加防御性处理（参考 `getGeneProfileOptions` 的 `normalizeArray` 模式）
- 不修改后端 admin-api 代码
- 不修改核心业务逻辑

## 验收标准

### AC-1: 录入报告抽屉正常打开
- 类型：rule
- 在检测报告管理页点击"录入报告"按钮后：
  1. 抽屉正常打开，无 TypeError
  2. 所有下拉选项（关联订单、鸽只基因档案、检测机构、检测项目）正常显示
  3. 控制台无 error 级别消息
- 证据：浏览器端到端测试

### AC-2: 订单下拉选项正确
- 类型：rule
- `getDetectionOrderOptions()` 返回 `DetectionOrderOption[]`（数组）
- 下拉选项格式为 `{ label: "DT20260815001 - 陈鸽友", value: 1 }`
- 证据：API 测试 + 浏览器验证

### AC-3: 机构下拉选项正确
- 类型：rule
- `getDetectionOrgOptions()` 返回 `DetectionOrgOption[]`（数组）
- 下拉选项格式为 `{ label: "信鸽DNA检测中心", value: 1 }`
- 证据：API 测试 + 浏览器验证

### AC-4: 分页列表不受影响
- 类型：rule
- `GET /api/detection/orders?page=1&pageSize=10` 仍返回 `{ list, total }`
- `GET /api/detection/orgs?page=1&pageSize=10` 仍返回 `{ list, total }`
- 证据：API 测试

### AC-5: 控制台无错误
- 类型：rule
- 打开录入报告抽屉后，控制台无 error 和 warning 消息
- 证据：browser_console_messages 输出
