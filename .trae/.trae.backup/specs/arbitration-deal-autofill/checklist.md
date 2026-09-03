# 仲裁案件关联成交单自动回填 - 验证清单

## 功能验证
- [x] Checkpoint 1: TypeScript 编译零错误
- [x] Checkpoint 2: 选择关联成交单后，申诉人自动填入 seller 名称
- [x] Checkpoint 3: 选择关联成交单后，被诉人自动填入 buyer 名称（非 null 时）
- [x] Checkpoint 4: 选择关联成交单后，争议金额自动填入 final_price 并显示 ¥ 前缀
- [x] Checkpoint 5: 清除关联成交单后，已回填字段保持不被清空
- [x] Checkpoint 6: 切换关联成交单时，未手动修改的字段自动更新
- [x] Checkpoint 7: 切换关联成交单时，已手动修改的字段不被覆盖
- [x] Checkpoint 8: 申诉人字段支持用户搜索选择
- [x] Checkpoint 9: 被诉人字段支持用户搜索选择
- [x] Checkpoint 10: 申诉人/被诉人字段支持手动输入任意文本
- [x] Checkpoint 11: 未选择关联成交单时，手动输入流程不受影响
- [x] Checkpoint 12: 右侧预览面板实时显示回填后的当事人和金额信息
- [x] Checkpoint 13: buyer 为 null 时，被诉人字段不被错误覆盖
- [x] Checkpoint 14: 表单提交时使用正确的字段值
- [x] Checkpoint 15: 编辑模式下回填行为正确
