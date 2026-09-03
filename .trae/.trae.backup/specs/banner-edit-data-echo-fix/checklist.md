# Banner 编辑数据回显修复 - Verification Checklist

## ImageUploader组件修复验证
- [x] Checkpoint 1: ImageUploader组件接收到外部value后能正确更新预览列表
- [x] Checkpoint 2: ImageUploader组件value为空字符串或undefined时显示上传占位符
- [x] Checkpoint 3: ImageUploader组件value变化时useEffect正确触发更新

## BannerDrawer表单数据回显验证
- [x] Checkpoint 4: 点击编辑按钮后，标题字段显示Banner原始标题
- [x] Checkpoint 5: 点击编辑按钮后，封面图片在ImageUploader中显示预览
- [x] Checkpoint 6: 点击编辑按钮后，投放位置下拉框选中正确选项
- [x] Checkpoint 7: 点击编辑按钮后，排序权重显示原始数值
- [x] Checkpoint 8: 点击编辑按钮后，跳转类型下拉框选中正确选项
- [x] Checkpoint 9: 点击编辑按钮后，跳转目标显示原始URL
- [x] Checkpoint 10: 点击编辑按钮后，开始时间显示为正确的日期时间
- [x] Checkpoint 11: 点击编辑按钮后，结束时间显示为正确的日期时间
- [x] Checkpoint 12: jump_type空字符串处理正确（转换为undefined供Select组件使用）
- [x] Checkpoint 13: jump_target空字符串处理正确（转换为undefined供Input组件使用）

## 新建功能验证
- [x] Checkpoint 14: 点击新建按钮打开抽屉时显示空表单
- [x] Checkpoint 15: 新建时投放位置默认为"首页顶部"
- [x] Checkpoint 16: 新建时排序权重默认为0
- [ ] Checkpoint 17: 新建表单填写完整后保存成功

## 保存更新功能验证
- [ ] Checkpoint 18: 编辑Banner后修改字段并保存成功
- [ ] Checkpoint 19: 保存成功后列表自动刷新显示最新数据
- [ ] Checkpoint 20: 再次点击编辑验证修改后的数据正确回显

## 代码质量验证
- [x] Checkpoint 21: TypeScript编译无错误
- [x] Checkpoint 22: 浏览器控制台无错误或警告
- [x] Checkpoint 23: 修复不影响现有功能（列表展示、预览、删除等）
