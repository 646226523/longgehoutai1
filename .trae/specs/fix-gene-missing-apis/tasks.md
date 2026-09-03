# 修复基因档案缺失接口 - The Implementation Plan

## [x] Task 1: 实现鸽主搜索接口 GET /api/gene/owners
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 `admin-api/src/routes/gene.ts` 中新增 `GET /owners` 路由
  - 从 `gene_profiles` 表中查询不重复的鸽主信息
  - 支持按 `keyword` 关键词模糊搜索
  - 返回 `{ id, name, phone }` 数组
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: `GET /api/gene/owners` 返回 200 和鸽主数组 ✅
  - `programmatic` TR-1.2: `GET /api/gene/owners?keyword=李` 返回匹配鸽主 ✅

## [x] Task 2: 实现足环号校验接口 GET /api/gene/profiles/check-ring
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 新增 `GET /profiles/check-ring` 路由
  - 接收 `ring_number` 参数，查询是否存在
  - 返回 `{ exists: boolean }`
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-2.1: 已存在的足环号返回 `{ exists: true }` ✅
  - `programmatic` TR-2.2: 不存在的足环号返回 `{ exists: false }` ✅

## [x] Task 3: 实现档案搜索接口 GET /api/gene/profiles/search
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 新增 `GET /profiles/search` 路由
  - 按关键词搜索档案（匹配足环号、鸽名）
  - 返回 `GeneProfileOption[]` 格式
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-3.1: 返回匹配的档案数组 ✅
  - `programmatic` TR-3.2: 空关键词返回最近档案 ✅

## [x] Task 4: 构建与端到端验证
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3
- **Description**:
  - 重启后端服务
  - 打开基因档案新增页面，在鸽主输入框输入文字
  - 检查控制台无"接口不存在"错误
  - 测试足环号校验功能
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgement` TR-4.1: 鸽主搜索下拉显示结果 ✅
  - `human-judgement` TR-4.2: 控制台无错误 ✅
