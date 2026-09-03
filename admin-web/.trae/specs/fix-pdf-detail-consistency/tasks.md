# 任务列表 - 修复PDF导出与详情不一致

## Task 1: 修复Mock API详情数据完整性
**优先级**: critical
**状态**: pending
**关联AC**: AC-1, AC-2

### 描述
修复 `server/mock-plugin.js` 中检测报告详情接口返回的数据不完整问题。

### 实现方案
1. 在详情GET handler中（约第774-790行），根据报告的 `order_id` 查询 `detectionOrderStore` 获取订单信息
2. 根据报告的 `gene_profile_id` 查询鸽只档案store获取鸽只信息
3. 填充 `order` 嵌套对象（包含 `order_no`, `user_name`, `ring_number` 等）
4. 填充 `gene_profile` 嵌套对象（包含 `name`, `ring_number`, `owner_name`）

### 测试要求
- TR-1: GET /api/detection/reports/:id 返回完整 gene_profile
- TR-2: GET /api/detection/reports/:id 返回完整 order 对象
- TR-3: 创建新报告后，详情查询也能返回正确的嵌套数据

## Task 2: 统一数据准备函数
**优先级**: high
**状态**: pending
**关联AC**: AC-3, AC-4, AC-5, AC-6

### 描述
创建集中的数据准备函数，确保详情抽屉和打印使用完全相同的数据处理逻辑。

### 实现方案
1. 在 Report.tsx 中创建 `prepareReportData(report)` 函数
2. 将 `getReportIntegrity`、`getVerificationCode`、`getDetectionProtocol` 的调用统一到一个入口
3. 确保返回的对象包含所有视图需要的派生数据
4. 详情抽屉和 `buildPrintHtml` 都使用此函数

### 测试要求
- TR-4: 详情抽屉和打印使用相同的数据输入
- TR-5: 关键字段值（报告编号、鸽主、检测结果等）完全一致

## Task 3: 验证buildPrintHtml与详情渲染一致性
**优先级**: high
**状态**: pending
**关联AC**: AC-3, AC-4, AC-5, AC-6

### 描述
逐项检查 `buildPrintHtml` 函数与详情抽屉渲染是否使用相同的字段和逻辑。

### 实现方案
1. 检查所有字段映射：报告编号、状态、检测项目、检测日期、签发时间、版本
2. 检查Section 01：委托人/鸽主、关联订单、检测对象、足环号、档案编号、样本编号、样本类型
3. 检查Section 02：检测机构、机构状态、检测项目、质量控制、检测方法、检测依据
4. 检查Section 03：检测结果渲染（结构化数据）
5. 检查Section 04：声明文字
6. 检查Section 05-06：文件记录、追溯信息
7. 修复发现的不一致

### 测试要求
- TR-6: 所有字段在详情和打印中一致
- TR-7: 结构化检测结果渲染一致

## Task 4: 端到端验证
**优先级**: high
**状态**: pending
**关联AC**: AC-7, AC-8, AC-9

### 描述
进行完整的端到端测试验证。

### 测试要求
- TR-8: TypeScript 编译零错误
- TR-9: 浏览器端打开报告详情，验证显示内容
- TR-10: 点击导出PDF，验证打印对话框正常弹出
- TR-11: 对比详情截图与打印内容截图的一致性
- TR-12: 浏览器控制台无 JavaScript 错误
