# 手动录入审核 → 基因档案审核 更名

## Why
"手动录入审核"这个名称容易让后台操作员误解为"后台手动录入数据的审核"，而实际功能是审核**用户端用户自行上传**的基因档案。更名为"基因档案审核"更准确地反映业务含义，降低操作员理解成本。

## What Changes
- 将后台管理系统侧边栏菜单项"手动录入审核"更名为"基因档案审核"
- 将页面标题"手动录入审核"更名为"基因档案审核"
- 更新代码中相关注释以保持一致性

## Impact
- Affected code:
  - `layouts/AdminLayout.tsx` — 菜单配置项
  - `pages/gene/Audit.tsx` — 页面标题、注释
  - `services/gene.ts` — 注释

## ADDED Requirements
无

## MODIFIED Requirements
### Requirement: 菜单更名
侧边栏菜单"手动录入审核"→"基因档案审核"，路径 `/gene/audit` 不变。

### Requirement: 页面标题更名
`ProTable` 的 `headerTitle` 从"手动录入审核"改为"基因档案审核"。

## REMOVED Requirements
无