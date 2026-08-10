# 修复控制台三个报错日志 - Spec

## Why
控制台存在 3 条报错日志，其中 1 条为废弃警告，1 条导致基因档案详情页检测记录表格崩溃（`rawData.some is not a function`），第 3 条为崩溃后的错误边界追踪。需要立即修复以避免影响用户使用。

## What Changes
- **Bug 1**: 修复 `ModalForm` 的 `modalProps` 中 `destroyOnClose` 废弃警告，改为 `destroyOnHidden`
- **Bug 2**: 修复 `GeneDetail` 检测记录 ProTable 因 Mock 数据缺失导致的 `rawData.some is not a function` 运行时崩溃
- **Bug 3**: Bug 2 的连锁反应，修复 Bug 2 后自动消失

## Impact
- Affected code: 所有含 `modalProps={{ destroyOnClose: true }}` 的页面文件 + `server/mock.ts` + `GeneDetail.tsx`

## ADDED Requirements
### Requirement: 修复 Modal destroyOnClose 废弃警告
ModalForm 的 `modalProps` 中 `destroyOnClose` 已废弃，需改为 `destroyOnHidden`。

### Requirement: 修复检测记录表格崩溃
为 `/api/gene/profiles/:id/tests` 添加 Mock 端点，返回基因检测记录数组，避免被通用 `/api/gene/profiles` 处理器截获。

## MODIFIED Requirements
### Requirement: 增强 GeneDetail 检测记录表格容错
在 `GeneDetail.tsx` 的 ProTable `request` 函数中，对 `getGeneTests` 返回值做类型检查，确保即使返回非数组数据也不会崩溃。