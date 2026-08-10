# 血统与品种输入框优化 - 验证清单

## 类型与 Mock 数据
- [x] `GeneDicts` 接口已添加 `breeds: string[]` 和 `bloodlines: string[]`
- [x] Mock `/api/gene/dicts` 返回响应中包含 breeds 和 bloodlines 数据
- [x] `npx tsc --noEmit` 零错误

## 品种输入框
- [x] 品种输入框从 `<Input>` 改为 `<AutoComplete>`
- [x] 可自由输入文本（手动输入场景）
- [x] 输入/聚焦时显示系统已有品种下拉选项
- [x] 选择下拉选项后值正确绑定
- [x] 样式与布局与原输入框一致

## 血统输入框
- [x] 血统输入框从 `<Input>` 改为 `<AutoComplete>`
- [x] 可自由输入文本（手动输入场景）
- [x] 输入/聚焦时显示系统已有血统下拉选项
- [x] 选择下拉选项后值正确绑定
- [x] 样式与布局与原输入框一致

## 整体
- [x] 表单提交时品种和血统值正确传递
- [x] 编辑态数据回填后 AutoComplete 正常显示