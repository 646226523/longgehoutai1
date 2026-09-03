# 血统与品种输入框优化 - Spec

## Why
当前"血统"和"品种"输入框仅为普通文本输入框，后台工作人员需要手动输入，缺乏系统已有数据的辅助选择能力。优化后支持手动输入 + 从系统已有数据中选择，提升录入效率和准确性。

## What Changes
- 扩展 `GeneDicts` 接口，增加 `breeds` 和 `bloodlines` 数组字段
- 在 Mock `/api/gene/dicts` 端点中补充 breeds 和 bloodlines 数据
- 将品种和血统输入框从普通 `<Input>` 升级为 Ant Design `AutoComplete` 组件，支持自由输入 + 下拉选择

## Impact
- Affected code: `services/gene.ts`、`server/mock.ts`、`pages/gene/GeneForm.tsx`

## ADDED Requirements
### Requirement: 品种/血统字典数据扩展
`GeneDicts` 接口新增 `breeds: string[]` 和 `bloodlines: string[]`，Mock 端点返回系统已有数据。

### Requirement: AutoComplete 输入组件
品种和血统输入框使用 `AutoComplete` 组件，options 来自字典数据，用户可自由输入也可从下拉选择。

## MODIFIED Requirements
### Requirement: 字典数据响应
Mock `/api/gene/dicts` 响应中新增 `breeds` 和 `bloodlines` 字段，返回从现有基因档案中提取的去重品种和血统列表。

## REMOVED Requirements
无