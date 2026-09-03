# 修复身份证照片显示问题 - 实施计划

## [x] 任务 1: 修复后端SVG生成函数的XML结构

**优先级**: 高

**描述**:
1. 修复 `generateIdCardFrontSvg` 函数，将 `<defs>` 标签移到 SVG 内容最前面
2. 检查 `generateIdCardBackSvg` 和 `generateHandheldIdCardSvg` 函数是否存在类似问题
3. 确保所有SVG的 `<defs>` 标签都在引用它的元素之前

**验收标准**: AC-1, AC-2, AC-3

**测试要求**:
- `programmatic` TR-1.1: 检查 generateIdCardFrontSvg 函数生成的SVG中 `<defs>` 是否在最前面
- `programmatic` TR-1.2: 检查 generateHandheldIdCardSvg 函数生成的SVG中 `<defs>` 是否在最前面
- `human-judgement` TR-1.3: 在浏览器中验证身份证照片能正常显示

**注意**: 修改后需要重启后端服务以重新初始化数据


## [x] 任务 2: 重启服务并验证修复效果

**优先级**: 高

**描述**:
1. 重启后端服务，触发数据库重新初始化（重新生成认证材料SVG数据）
2. 在浏览器中验证修复效果

**验收标准**: AC-1, AC-2, AC-3

**测试要求**:
- `programmatic` TR-2.1: 后端服务成功启动
- `human-judgement` TR-2.2: 在浏览器中访问认证审核页面，检查身份证照片是否正常显示
- `human-judgement` TR-2.3: 点击照片验证大图预览功能正常

**注意**: 需要清除浏览器缓存或使用硬刷新
