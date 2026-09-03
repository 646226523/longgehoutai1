# 角色权限选择器层级化重构 - Verification Checklist

## Bug 修复（两条 Ant Design 弃用警告）
- [x] Card 组件 `bodyStyle` 已改为 `styles={{ body: {...} }}`
- [x] Spin 组件 `tip` 已改为嵌套子元素模式（不再是无 children 的独立 tip）
- [x] 浏览器 console 无 `[antd: Card] bodyStyle is deprecated` 警告
- [x] 浏览器 console 无 `[antd: Spin] tip only work in nest or fullscreen pattern` 警告

## 树形层级构建
- [x] 权限选择器已使用 Ant Design Tree 组件（非折叠面板/表格）
- [x] Tree 根据权限 code 的冒号分段自动构建多级节点
- [x] system 模块下 3 段式 code（如 `system:admin:manage`）展示为三级路径
- [x] 叶子节点的 key 格式为 `perm:{id}`，可正确映射到后端权限 ID
- [x] 非叶子（虚拟）节点的 key 不含真实权限 ID

## Tree 交互行为
- [x] Tree 启用 `checkable`，默认全部展开
- [x] 父子勾选级联正确（checkStrict=false）
- [x] 选中父节点 → 所有后代自动选中
- [x] 所有后代选中 → 父节点显示 "全选" 状态
- [x] 部分后代选中 → 父节点显示 indeterminate 半选状态
- [x] 全局 "全选" 按钮正常工作
- [x] 全局 "清空" 按钮正常工作
- [x] 全部展开 / 全部收起 功能正常

## Tree 节点展示样式
- [x] 模块节点显示：📁 图标 + 分组名 + 权限数量 Tag
- [x] 功能节点显示：📂 图标 + 功能名
- [x] 叶子节点显示：名称 + 类型彩色 Tag + 等宽编码 Tag
- [x] description 以 Tooltip 悬浮提示展示

## 实时统计
- [x] 工具栏显示 "已选择 X / Y 项权限"
- [x] X 实时随勾选变化
- [x] Y 为所有叶子节点总数

## 提交逻辑
- [x] 提交时从 checkedKeys 中仅提取 `perm:` 开头的叶子节点
- [x] 传给 assignRolePermissions 的是 number[]（权限 ID），不包含虚拟节点
- [x] 新增角色：先 createRole 再 assignRolePermissions
- [x] 编辑角色：先 updateRole 再 assignRolePermissions（覆盖式更新）
- [x] 提交按钮显示 "创建角色并分配权限(N 项)"，N 与实际选中一致

## 编辑权限回显
- [x] 前端逻辑正确：getRolePermissions 返回的 ID 数组 → perm:${id} 映射到 Tree checkedKeys
- [ ] 后端种子数据缺失（所有角色的 role_permissions 关联为空数组），无法看到实际效果 — **前端逻辑已验证正确，需要后端补充种子数据后才能完全确认**

## 编译与 Lint
- [x] `npx tsc --noEmit` 退出码 0，无错误
- [x] 无未使用的 import
- [x] 无 any 类型滥用（Set<number> 保留）

## UI 细节
- [x] 弹窗宽度 ≥ 900px（1000px）
- [x] Tree 区域可滚动
- [x] 空权限数据时显示 Empty 组件
- [x] Loading 状态正确（Spin 嵌套）
