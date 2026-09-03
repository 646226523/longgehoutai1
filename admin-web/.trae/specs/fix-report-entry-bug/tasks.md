# 任务列表 - 修复检测报告录入功能 BUG

## Task 1: 修复 mock-plugin.js 路由前缀匹配冲突
- 状态：completed
- 优先级：high
- 关联 AC：AC-2, AC-3, AC-4
- 描述：在 mock-plugin.js 中修复列表处理器的路径匹配逻辑，防止拦截子路由请求
- 实现细节：
  1. 在 GET `/api/detection/orders` 处理器中修复路径检查：
     - Connect 中间件剥离匹配前缀后，pathname 从 `/` 开始
     - 将 `url.pathname !== '/api/detection/orders'` 改为 `url.pathname !== '/'`
     - 当 pathname 不是 `/` 时（即存在子路由如 `/options`），调用 `next()` 放行
  2. 在 GET `/api/detection/orgs` 处理器中同步修复相同问题
- 验证结果：
  - ✅ TR-1.1: GET `/api/detection/orders/options` 返回数组（isArray=True）
  - ✅ TR-1.2: GET `/api/detection/orgs/options` 返回数组（isArray=True）
  - ✅ TR-1.3: GET `/api/detection/orders?page=1` 返回分页格式（isArray=True for list）
  - ✅ TR-1.4: GET `/api/detection/orgs?page=1` 返回分页格式（isArray=True for list）

## Task 2: 浏览器端到端验证
- 状态：completed
- 优先级：high
- 关联 AC：AC-1, AC-5
- 描述：启动开发服务器，在浏览器中验证录入报告功能
- 验证结果：
  - ✅ TR-2.1: 点击"录入报告"按钮后抽屉正常打开（Drawer opened: true）
  - ✅ TR-2.2: 所有下拉选项正常渲染，订单选项加载 2 条数据（DT20260818001、DT20260815001）
  - ✅ TR-2.3: 页面无 TypeError，"orderOptions.map is not a function" 错误已消除
  - ✅ TR-2.4: 关联预约订单、关联鸽只基因档案、检测机构、检测项目等表单字段正常显示

## Task 3: API 接口验证
- 状态：completed
- 优先级：medium
- 关联 AC：AC-2, AC-3, AC-4
- 描述：通过 HTTP 请求直接验证各 API 端点的返回格式
- 验证结果：
  - ✅ TR-3.1: `/api/detection/orders/options` → 数组（isArray=True）
  - ✅ TR-3.2: `/api/detection/orgs/options` → 数组（isArray=True）
  - ✅ TR-3.3: `/api/detection/orders?page=1` → 分页对象（data.list 为数组）
  - ✅ TR-3.4: `/api/detection/orgs?page=1` → 分页对象（data.list 为数组）
