# 修复 Ant Design Select `onDropdownVisibleChange` 弃用警告 - Verification Checklist

- [x] `onDropdownVisibleChange` 字符串在 Role.tsx 中已不存在（grep 零匹配）
- [x] 已替换为 `onOpenChange`，回调函数体不变
- [x] `npx tsc --noEmit` 退出码 0
- [x] 浏览器 console 无 `[antd: Select] onDropdownVisibleChange is deprecated` 警告
- [x] "从现有角色复制" Select 懒加载功能正常（7 个角色正常加载）
