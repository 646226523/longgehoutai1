# 修复导出PDF内容与检测报告详情不一致问题

## 问题描述

检测报告详情抽屉展示的内容与「导出PDF」功能生成的打印内容存在严重不一致。用户点击「导出PDF」后，打印预览中的报告内容与详情页显示的内容在数据、结构和细节上存在明显差异。

## 根因分析

### 根因1：Mock API数据不完整
**严重程度**：CRITICAL

详情API（GET /api/detection/reports/:id）返回的数据存在以下缺失：
- `gene_profile` 始终硬编码为 `null`，即使报告关联了鸽只基因档案
- `order` 嵌套对象缺失，列表API返回了 `order: { order_no: '' }` 但详情API完全不包含 `order` 字段
- 导致详情页和打印中所有涉及鸽主、鸽只、足环号、订单号等字段均显示"未记录"

**位置**：`server/mock-plugin.js` 第789行
```javascript
res.end(JSON.stringify({ code: 0, message: 'success', data: { ...report, gene_profile: null } }));
```

### 根因2：两套独立渲染路径
**严重程度**：HIGH

- 详情抽屉：使用React组件（Descriptions、Tag、Typography、renderStructuredDetail）
- 打印HTML：使用原始HTML字符串拼接（buildPrintHtml + renderPrintResult）

两套代码需要手动保持同步，任何一方修改后另一方未同步更新都会导致不一致。

### 根因3：数据准备逻辑分散
**严重程度**：MEDIUM

`buildPrintHtml` 内部自行调用 `getReportIntegrity`、`getVerificationCode` 等函数，与详情抽屉中的同名函数调用虽然共用实现，但数据传递方式不同。

## 目标

1. 修复Mock API，确保详情接口返回完整的嵌套数据
2. 确保导出PDF的内容与详情抽屉显示**完全一致**
3. 建立数据一致性校验机制
4. TypeScript编译零错误

## 非目标

- 不改变详情抽屉的视觉设计
- 不引入新的依赖库
- 不修改报告数据结构

## 功能需求

### FR-1: 详情API数据完整性
- GET /api/detection/reports/:id 返回的 `gene_profile` 应包含鸽只档案信息
- 返回的 `order` 应包含订单编号
- 字段与列表接口保持一致

### FR-2: 打印内容与详情数据一致
- 报告编号、检测项目、检测日期、签发时间完全一致
- 委托人/鸽主、检测对象、足环号等鸽只信息完全一致
- 检测结果数据（结构化）完全一致
- 可信状态、数据完整度一致

### FR-3: 打印功能可用性
- 点击「导出PDF」按钮能正常触发浏览器打印对话框
- 打印预览中显示正确的报告内容
- 不出现JavaScript错误

## 验收标准

| ID | 类型 | 描述 |
|----|------|------|
| AC-1 | rule | 详情API返回的gene_profile包含完整鸽只档案信息 |
| AC-2 | rule | 详情API返回的order包含订单编号 |
| AC-3 | rule | 详情抽屉与打印PDF显示的报告编号一致 |
| AC-4 | rule | 详情抽屉与打印PDF显示的鸽只信息（鸽主、足环号、档案编号）一致 |
| AC-5 | rule | 详情抽屉与打印PDF显示的检测结果数据一致 |
| AC-6 | rule | 详情抽屉与打印PDF显示的可信状态和完整度一致 |
| AC-7 | rule | 点击导出PDF按钮后打印对话框正常弹出 |
| AC-8 | rule | TypeScript编译零错误 |
| AC-9 | rule | 浏览器控制台无JavaScript错误 |

## 技术方案

### 1. 修复Mock API（mock-plugin.js）
- 详情GET handler中，根据报告的`gene_profile_id`和`order_id`查询对应store，填充嵌套对象
- 确保列表和详情返回一致的字段结构

### 2. 统一数据准备函数
- 创建 `prepareReportData(report)` 函数，集中处理报告的衍生数据
- 详情抽屉和打印函数都使用此函数获取数据

### 3. 验证buildPrintHtml一致性
- 逐项对比详情抽屉和buildPrintHtml使用的字段
- 确保所有字段映射一致
