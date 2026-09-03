# 任务列表 - 修复检测机构创建后列表不可见

## Task 1: 添加检测机构 Mock 数据存储和 CRUD 处理器
- 状态：completed
- 优先级：high
- 关联 AC：AC-1, AC-2
- 描述：在 mock-plugin.js 中添加内存存储（Map）和完整的机构 CRUD mock 处理器
- 实现细节：
  1. 创建内存 Map `detectionOrgStore` 用于存储机构数据 ✅
  2. 预置示例数据（3 条机构记录） ✅
  3. POST `/api/detection/orgs`：接收请求体，生成自增 ID，存入 Map，返回 `{ id }` ✅
  4. GET `/api/detection/orgs`：支持分页、keyword（name/code/contact）、status 筛选，返回 `{ list, total }` ✅
  5. GET `/api/detection/orgs/options`：查询 status=1 的机构，返回 `[{ id, name, code, projects }]` ✅
  6. GET `/api/detection/orgs/:id`：返回单个机构详情 ✅
  7. PUT `/api/detection/orgs/:id`：更新机构信息 ✅
  8. PATCH `/api/detection/orgs/:id/status`：切换状态（1↔0） ✅
- 测试要求：
  - TR-1.1 (rule): 创建机构后返回正确的 id ✅
  - TR-1.2 (rule): 列表返回刚创建的机构 ✅
  - TR-1.3 (rule): 关键字搜索正确过滤 ✅
  - TR-1.4 (rule): 状态筛选正确过滤 ✅

## Task 2: 添加检测项目类型字典 Mock
- 状态：completed
- 优先级：medium
- 关联 AC：AC-4
- 描述：添加检测项目类型字典数据和接口
- 实现细节：
  1. 预置 6 条检测项目类型数据 ✅
  2. GET `/api/detection/dict/item-types`：返回 `[{ code, name }]` ✅
- 测试要求：
  - TR-2.1 (rule): 创建机构时"可检项目"字段能正常加载选项 ✅

## Task 3: 添加检测订单 Mock 数据（基础）
- 状态：completed
- 优先级：medium
- 关联 AC：AC-3
- 描述：确保检测订单模块的机构关联下拉能正常获取数据
- 实现细节：
  1. 预置 2 条检测订单示例数据 ✅
  2. GET `/api/detection/orders`：分页列表接口 ✅
- 测试要求：
  - TR-3.1 (rule): 订单页面的机构下拉选项正常显示 ✅

## Task 4: 浏览器验证
- 状态：completed
- 优先级：high
- 关联 AC：AC-1, AC-2, AC-3, AC-4, AC-5
- 描述：启动开发服务器并进行端到端验证
- 测试要求：
  - TR-4.1 (rule): 创建机构 → 列表可见 ✅
  - TR-4.2 (rule): 搜索/筛选正常 ✅
  - TR-4.3 (rule): 控制台无错误 ✅
