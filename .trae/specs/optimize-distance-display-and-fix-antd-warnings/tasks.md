# 空距显示优化与 Ant Design 弃用警告修复 - The Implementation Plan (Decomposed and Prioritized Task List)

## [x] Task 1: 优化赛事列表空距显示格式
- [x] SubTask 1.1: 在 `List.tsx` 中为 `distance` 列添加 `toFixed(2)` 格式化
- [x] SubTask 1.2: 在 `CompetitionForm.tsx` 中通过 `<Space>` 包裹单位，替代 `InputNumber` 的 `addonAfter`
- [x] SubTask 1.3: 在 `CompetitionForm.tsx` 中引入 `App.useApp()` 获取 `message` 实例

## [x] Task 2: 验证与构建
- [x] SubTask 2.1: `npm run build` 成功
- [x] SubTask 2.2: 浏览器验证空距显示格式化，且控制台无 `InputNumber addonAfter` 和 `message static function` 警告
