# 取消角色编码字段 - Verification Checklist

- [x] Role.tsx 中 ProFormText name="code" 已删除（grep 零匹配）
- [x] 新增角色弹窗基本信息 Card 只显示：角色名称 / 状态 / 描述
- [x] 提交新建角色时 payload 自动包含 code（`role_${Date.now()}` 格式）
- [x] 编辑角色功能正常（updateRole 不传 code，后端 PUT 不强制校验）
- [x] npx tsc --noEmit 退出码 0
- [x] 角色列表页面正常（code 列保留展示，只读）
- [x] 零后端改动、零数据库改动
