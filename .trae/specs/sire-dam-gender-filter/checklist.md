# 父鸽/母鸽性别筛选功能 - Verification Checklist

## 后端验证
- [x] Checkpoint 1: 后端 `/profiles/search` 接口支持 `gender` 查询参数
- [x] Checkpoint 2: 当传入 `gender=male` 时，返回数据只包含雄性鸽子
- [x] Checkpoint 3: 当传入 `gender=female` 时，返回数据只包含雌性鸽子
- [x] Checkpoint 4: 不传 `gender` 参数时保持向后兼容，返回所有数据

## 前端服务层验证
- [x] Checkpoint 5: `searchGeneProfiles` 函数签名支持可选的 `gender` 参数
- [x] Checkpoint 6: 传递 `gender` 参数时正确附加到请求 URL

## 前端表单验证
- [x] Checkpoint 7: 父鸽选择器搜索时传递 `gender='male'`
- [x] Checkpoint 8: 母鸽选择器搜索时传递 `gender='female'`
- [x] Checkpoint 9: 编辑模式下已保存的父鸽/母鸽数据正确回显（defaultOptions 机制）
- [x] Checkpoint 10: tags 模式下手动输入新鸽名功能正常

## 构建验证
- [x] Checkpoint 11: `npm run build` 构建成功
- [x] Checkpoint 12: 无 TypeScript 类型错误
