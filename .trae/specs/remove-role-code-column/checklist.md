# 移除角色列表页的"角色编码"列与筛选 - Verification Checklist

- [x] columns 数组中角色编码列定义已删除（grep 零匹配）
- [x] 角色列表表格不再显示"角色编码"列
- [x] 顶部搜索筛选不再出现"角色编码"输入框（ProTable 按 dataIndex 自动生成筛选，列删除则筛选自动消失）
- [x] npx tsc --noEmit 退出码 0
- [x] 角色列表其他列（ID/名称/描述/类型/状态/时间/操作）正常
