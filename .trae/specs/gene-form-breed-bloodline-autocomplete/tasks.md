# 血统与品种输入框优化 - 实施计划

## [x] Task 1: 扩展 GeneDicts 接口与 Mock 数据
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 `services/gene.ts` 的 `GeneDicts` 接口中添加 `breeds: string[]` 和 `bloodlines: string[]`
  - 在 `server/mock.ts` 的 `/api/gene/dicts` 响应中添加 breeds 和 bloodlines 数据（从现有 GENE_PROFILES_STORE 中提取：breeds: ['詹森','贺尔梅斯','盖比']；bloodlines: ['詹森 × 凡龙','贺尔梅斯 × 詹森','盖比 × 贺尔梅斯']）
- **Test Requirements**:
  - `programmatic` TR-1.1: `GeneDicts` 类型包含 `breeds` 和 `bloodlines` 字段
  - `programmatic` TR-1.2: Mock `/api/gene/dicts` 返回的 data 中包含 breeds 和 bloodlines 数组
  - `programmatic` TR-1.3: `npx tsc --noEmit` 零错误

## [x] Task 2: 将品种和血统输入框改为 AutoComplete
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 在 `GeneForm.tsx` 的 antd import 中添加 `AutoComplete`
  - 品种输入框（第 326-333 行）从 `<Input>` 改为 `<AutoComplete>`，options 来自 `dicts?.breeds`
  - 血统输入框（第 337-343 行）从 `<Input>` 改为 `<AutoComplete>`，options 来自 `dicts?.bloodlines`
  - 保持原有的 `value` 和 `onChange` 绑定，支持自由输入
  - 保持原有样式和布局不变
- **Test Requirements**:
  - `programmatic` TR-2.1: 品种输入框可自由输入文本（手动输入）
  - `programmatic` TR-2.2: 品种输入框聚焦/输入时显示下拉选项（系统已有数据）
  - `programmatic` TR-2.3: 血统输入框可自由输入文本（手动输入）
  - `programmatic` TR-2.4: 血统输入框聚焦/输入时显示下拉选项（系统已有数据）
  - `programmatic` TR-2.5: 选择下拉选项后，值正确绑定到表单
  - `programmatic` TR-2.6: `npx tsc --noEmit` 零错误

# Task Dependencies
- Task 1 → Task 2