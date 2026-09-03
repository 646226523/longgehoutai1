# 修复控制台三个报错日志 - 实施计划

## [x] Task 1: 修复所有 ModalForm modalProps 中的 destroyOnClose 废弃警告
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 全局搜索所有 `modalProps={{ destroyOnClose: true, maskClosable: false` 模式
  - 将 `destroyOnClose` 改为 `destroyOnHidden`
  - 涉及文件：`auction/Items.tsx`、`arbitration/Case.tsx`（2处）、`competition/Verify.tsx`、`competition/Result.tsx`（2处）、`content/Notice.tsx`、`competition/List.tsx`、`detection/Order.tsx`、`content/Banner.tsx`、`gene/Detail.tsx`、`loft/Audit.tsx`、`nft/List.tsx`、`loft/Pigeons.tsx`、`nft/Audit.tsx`、`loft/List.tsx`、`user-member/MemberLevel.tsx`（2处）、`user-member/UserList.tsx`（2处）、`system/Admin.tsx`（2处）、`system/Dict.tsx`、`system/Role.tsx`
- **Test Requirements**:
  - `programmatic` TR-1.1: 控制台不再出现 `[antd: Modal] 'destroyOnClose' is deprecated` 警告
  - `human-judgment` TR-1.2: 所有 ModalForm 弹窗功能正常（打开、关闭、提交）

## [x] Task 2: 添加 /api/gene/profiles/:id/tests Mock 端点并增强 GeneDetail 容错
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 `server/mock.ts` 中，在通用 `/api/gene/profiles` 处理器之前添加 `/api/gene/profiles/:id/tests` 的 Mock 端点
  - 返回模拟的基因检测记录数组（含 2-3 条示例数据）
  - 在 `GeneDetail.tsx` 的 ProTable `request` 函数中添加 `Array.isArray()` 检查，确保非数组返回时不崩溃
- **Test Requirements**:
  - `programmatic` TR-2.1: `GET /api/gene/profiles/1/tests` 返回数组格式的检测记录
  - `programmatic` TR-2.2: 基因档案详情页的检测记录 Tab 正常显示，不抛出 `rawData.some` 错误
  - `programmatic` TR-2.3: 控制台无 `TypeError: rawData.some is not a function` 错误

# Task Dependencies
- Task 1, Task 2 可并行执行