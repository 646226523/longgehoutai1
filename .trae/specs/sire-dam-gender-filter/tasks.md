# 父鸽/母鸽性别筛选功能 - The Implementation Plan

## [x] Task 1: 后端接口支持性别筛选
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 `admin-api/src/routes/gene.ts` 中的 `/profiles/search` 接口
  - 支持从 query 参数中读取 `gender` 字段
  - 当 `gender` 参数存在时，在 SQL 查询中添加性别筛选条件
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-1.1: 调用 `GET /api/gene/profiles/search?gender=male` 返回的数据全部为雄性
  - `programmatic` TR-1.2: 调用 `GET /api/gene/profiles/search?gender=female` 返回的数据全部为雌性
  - `programmatic` TR-1.3: 调用 `GET /api/gene/profiles/search`（不传 gender）返回所有数据
- **Notes**: SQL 查询需动态拼接 WHERE 条件

## [x] Task 2: 前端服务层支持性别参数
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 修改 `admin-web/src/services/gene.ts` 中的 `searchGeneProfiles` 函数
  - 函数签名改为 `searchGeneProfiles(keyword?: string, gender?: string)`
  - 支持将 `gender` 参数传递给后端接口
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-2.1: 调用 `searchGeneProfiles('关键词', 'male')` 正确传递参数
  - `programmatic` TR-2.2: 调用 `searchGeneProfiles()` 不传性别参数时向后兼容

## [x] Task 3: 基因档案表单中应用性别筛选
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 修改 `admin-web/src/pages/gene/GeneForm.tsx`
  - 父鸽选择器的 `onSearch` 传递 `gender='male'`
  - 母鸽选择器的 `onSearch` 传递 `gender='female'`
  - 编辑模式下的 `defaultOptions` 保持不变（包含已保存的数据）
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-3.1: 父鸽选择器聚焦/搜索时调用后端接口带 `gender=male`
  - `programmatic` TR-3.2: 母鸽选择器聚焦/搜索时调用后端接口带 `gender=female`
  - `human-judgement` TR-3.3: 编辑模式下已保存数据正确回显
  - `human-judgement` TR-3.4: tags 模式下可手动输入新鸽名

## [x] Task 4: 构建与验证
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 运行 `npm run build` 验证构建通过
  - 检查 TypeScript 类型错误
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `programmatic` TR-4.1: `npm run build` 成功退出码为 0
  - `programmatic` TR-4.2: 无 TypeScript 类型错误
