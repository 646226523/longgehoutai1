# ProTable 添加 density:false - 验证清单

## 文件级验证
- [ ] Checkpoint 1: `gene/List.tsx` - ProTable 包含 `options={{ density: false }}`
- [ ] Checkpoint 2: `gene/Audit.tsx` - ProTable 包含 `options={{ density: false }}`
- [ ] Checkpoint 3: `gene/Detail.tsx` - ProTable 包含 `options={{ density: false }}`
- [ ] Checkpoint 4: `detection/Org.tsx` - ProTable 包含 `options={{ density: false }}`
- [ ] Checkpoint 5: `detection/Report.tsx` - ProTable 包含 `options={{ density: false }}`
- [ ] Checkpoint 6: `detection/Order.tsx` - 已存在 `options={{ density: false }}`(验证确认)
- [ ] Checkpoint 7: `nft/Audit.tsx` - 2 处 ProTable 均包含 `options={{ density: false }}`
- [ ] Checkpoint 8: `nft/List.tsx` - 2 处 ProTable 均包含 `options={{ density: false }}`
- [ ] Checkpoint 9: `competition/List.tsx` - ProTable 包含 `options={{ density: false }}`
- [ ] Checkpoint 10: `competition/Verify.tsx` - ProTable 包含 `options={{ density: false }}`
- [ ] Checkpoint 11: `competition/Result.tsx` - ProTable 包含 `options={{ density: false }}`
- [ ] Checkpoint 12: `content/Banner.tsx` - ProTable 包含 `options={{ density: false }}`
- [ ] Checkpoint 13: `content/News.tsx` - ProTable 包含 `options={{ density: false }}`
- [ ] Checkpoint 14: `content/Notice.tsx` - ProTable 包含 `options={{ density: false }}`
- [ ] Checkpoint 15: `loft/List.tsx` - ProTable 包含 `options={{ density: false }}`
- [ ] Checkpoint 16: `loft/Audit.tsx` - ProTable 包含 `options={{ density: false }}`
- [ ] Checkpoint 17: `loft/Pigeons.tsx` - ProTable 包含 `options={{ density: false }}`
- [ ] Checkpoint 18: `auction/Session.tsx` - ProTable 包含 `options={{ density: false }}`
- [ ] Checkpoint 19: `auction/Items.tsx` - 2 处 ProTable 均包含 `options={{ density: false }}`
- [ ] Checkpoint 20: `auction/Deal.tsx` - ProTable 包含 `options={{ density: false }}`
- [ ] Checkpoint 21: `arbitration/Case.tsx` - 第 484 行 ProTable 添加 `options={{ density: false }}`;第 693 行 `options={false}` 保持不变
- [ ] Checkpoint 22: `user-member/UserList.tsx` - ProTable 包含 `options={{ density: false }}`
- [ ] Checkpoint 23: `user-member/MemberLevel.tsx` - 2 处 ProTable 均包含 `options={{ density: false }}`
- [ ] Checkpoint 24: `system/Admin.tsx` - ProTable 包含 `options={{ density: false }}`
- [ ] Checkpoint 25: `system/Role.tsx` - ProTable 包含 `options={{ density: false }}`
- [ ] Checkpoint 26: `system/Dict.tsx` - ProTable 包含 `options={{ density: false }}`
- [ ] Checkpoint 27: `system/AuditLog.tsx` - ProTable 包含 `options={{ density: false }}`

## 编译级验证
- [ ] Checkpoint 28: `npx tsc --noEmit` 退出码 0,零类型错误

## 代码风格验证
- [ ] Checkpoint 29: 所有修改保持与原有代码一致的缩进风格
- [ ] Checkpoint 30: 仅添加 `options={{ density: false }}`,无其他无关变更