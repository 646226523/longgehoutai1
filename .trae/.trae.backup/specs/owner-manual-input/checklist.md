# 鸽主信息可手动填写优化 - Verification Checklist

## 组件层验证
- [ ] Checkpoint 1: `SearchSelect` 组件支持 `allowCreate` 属性
- [ ] Checkpoint 2: `allowCreate=true` 时用户可自由输入文本

## 表单层验证
- [ ] Checkpoint 3: 手动输入新鸽主后，电话字段变为可编辑
- [ ] Checkpoint 4: 选择已有鸽主后，电话字段自动填充且禁用
- [ ] Checkpoint 5: 电话字段 placeholder 根据状态正确显示

## 提交验证
- [ ] Checkpoint 6: 手动输入的鸽主信息正确提交到 payload
- [ ] Checkpoint 7: 选择已有鸽主时 owner_id 正确传递

## 兼容性验证
- [ ] Checkpoint 8: 其他使用 SearchSelect 的组件（血统选择、鸽主选择器）不受影响
- [ ] Checkpoint 9: TypeScript 编译零错误
