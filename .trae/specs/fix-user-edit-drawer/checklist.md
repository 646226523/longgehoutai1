# 修复用户编辑抽屉数据空白 — Verification Checklist

[x]  Checkpoint 1: UserList.tsx 编辑 Drawer 已移除 `destroyOnHidden` 属性

[x]  Checkpoint 2: UserList.tsx 编辑 Form 已移除 `preserve={false}` 属性

[x]  Checkpoint 3: UserList.tsx 编辑 Form 添加了 `key={editModal.record?.id ?? 'empty'}` 确保切换不同用户时重置

[x]  Checkpoint 4: 打开用户管理页面，点击编辑按钮，昵称、手机号、真实姓名、成长值、会员等级、账号状态字段均有值（非空）

[x]  Checkpoint 5: 连续编辑两个不同用户，表单正确切换为新用户数据，不残留旧值

[x]  Checkpoint 6: 修改字段后点击"确定"，成功调用 updateUser API，提示"更新成功"，列表刷新

[x]  Checkpoint 7: 修改字段后点击"取消"，弹出确认框，确认后不保存修改

[x]  Checkpoint 8: 搜索 pages/ 下所有含 `destroyOnHidden` 的 Drawer，确认需要回填数据的编辑抽屉均已按统一模式修复

[x]  Checkpoint 9: TypeScript 编译通过（`admin-web` 目录下 `npx tsc --noEmit` 退出码 0）

[x]  Checkpoint 10: 抽查 Banner/News/Notice 等至少 2 个其他业务模块的编辑功能，确认回填正常

[x]  Checkpoint 11: 关闭浏览器开发服务器（如需重启），重新启动后编辑功能仍正常

