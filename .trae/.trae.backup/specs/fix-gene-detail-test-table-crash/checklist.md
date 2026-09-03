# 修复控制台三个报错日志 - 验证清单

## Bug 1: Modal destroyOnClose 废弃警告
- [x] 所有 `modalProps={{ destroyOnClose: true, ... }}` 已改为 `destroyOnHidden`
- [x] 控制台不再出现 `[antd: Modal] 'destroyOnClose' is deprecated` 警告
- [x] 所有 ModalForm 弹窗打开/关闭功能正常

## Bug 2: GeneDetail 检测记录表格崩溃
- [x] `server/mock.ts` 已添加 `/api/gene/profiles/:id/tests` Mock 端点
- [x] Mock 端点注册在通用 `/api/gene/profiles` 处理器之前
- [x] Mock 返回格式为数组的检测记录数据
- [x] `GeneDetail.tsx` 中 ProTable `request` 函数已添加 `Array.isArray()` 类型检查
- [x] 控制台不再出现 `TypeError: rawData.some is not a function` 错误
- [x] 基因档案详情页的检测记录 Tab 可正常渲染显示数据

## Bug 3: 连锁崩溃
- [x] Bug 2 修复后，React error boundary 不再触发
- [x] 基因档案详情页整体可正常访问，无崩溃