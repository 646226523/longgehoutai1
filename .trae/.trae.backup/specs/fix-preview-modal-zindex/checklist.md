# 修复认证材料预览弹窗层级问题 - 验证清单

## 代码验证
- [x] Checkpoint 1: 预览Modal已添加zIndex属性 ✅ 已验证（zIndex={2000}）
- [x] Checkpoint 2: 遮罩层已添加maskStyle.zIndex属性 ✅ 已验证（maskStyle={{ zIndex: 1999 }}）

## 功能验证
- [x] Checkpoint 3: 点击身份证正面预览，弹窗显示在Drawer之上 ✅ 已验证
- [x] Checkpoint 4: 点击身份证反面预览，弹窗显示在Drawer之上 ✅ 已验证
- [x] Checkpoint 5: 点击手持身份证预览，弹窗显示在Drawer之上 ✅ 已验证
- [x] Checkpoint 6: 预览弹窗中图片正常显示 ✅ 已验证
- [x] Checkpoint 7: 上一张/下一张切换功能正常 ✅ 已验证

## 质量验证
- [x] Checkpoint 8: TypeScript类型检查无新增错误 ✅ 已验证（仅有之前存在的未使用变量警告）
