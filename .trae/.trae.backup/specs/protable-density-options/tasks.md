# ProTable 添加 density:false - 实施任务计划

## [x] Task 1: 创建规划文档
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 创建 spec.md、tasks.md、checklist.md
  - 分析所有 ProTable 使用情况
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-1.1: 27 个文件中使用 ProTable 的位置已全部识别
  - `programmatic` TR-1.2: 特殊情况(options={false}、options 变量引用)已标记

## [x] Task 2: 修改基因模块 (gene/) 文件
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 修改 `gene/List.tsx` (1 处 ProTable)
  - 修改 `gene/Audit.tsx` (1 处 ProTable)
  - 修改 `gene/Detail.tsx` (1 处 ProTable)
- **Acceptance Criteria Addressed**: AC-1, AC-6
- **Test Requirements**:
  - `programmatic` TR-2.1: 每个 ProTable 均包含 `options={{ density: false }}`
  - `programmatic` TR-2.2: tsc --noEmit 零错误

## [x] Task 3:修改检测模块 (detection/) 文件
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 修改 `detection/Org.tsx` (1 处 ProTable)
  - 修改 `detection/Report.tsx` (1 处 ProTable)
  - `detection/Order.tsx` 已包含 `options={{ density: false }}`,无需修改
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-3.1: 每个 ProTable 均包含 `options={{ density: false }}`

## [x] Task 4: 修改 NFT 模块 (nft/) 文件
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 修改 `nft/Audit.tsx` (2 处 ProTable)
  - 修改 `nft/List.tsx` (1 处 ProTable,1 处 `options={false}` 跳过)
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-4.1: 每个 ProTable 均包含 `options={{ density: false }}`

## [x] Task 5: 修改赛事模块 (competition/) 文件
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 修改 `competition/List.tsx` (1 处 ProTable)
  - 修改 `competition/Verify.tsx` (1 处 ProTable)
  - 修改 `competition/Result.tsx` (1 处 ProTable)
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-5.1: 每个 ProTable 均包含 `options={{ density: false }}`

## [x] Task 6: 修改内容模块 (content/) 文件
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 修改 `content/Banner.tsx` (1 处 ProTable)
  - 修改 `content/News.tsx` (1 处 ProTable)
  - 修改 `content/Notice.tsx` (1 处 ProTable)
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-6.1: 每个 ProTable 均包含 `options={{ density: false }}`

## [x] Task 7: 修改鸽舍模块 (loft/) 文件
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 修改 `loft/List.tsx` (1 处 ProTable)
  - 修改 `loft/Audit.tsx` (1 处 ProTable)
  - 修改 `loft/Pigeons.tsx` (1 处 ProTable)
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-7.1: 每个 ProTable 均包含 `options={{ density: false }}`

## [x] Task 8: 修改拍卖模块 (auction/) 文件
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 修改 `auction/Session.tsx` (1 处 ProTable)
  - 修改 `auction/Items.tsx` (1 处 ProTable,1 处 `options={false}` 跳过)
  - 修改 `auction/Deal.tsx` (1 处 ProTable)
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-8.1: 每个 ProTable 均包含 `options={{ density: false }}`

## [x] Task 9: 修改仲裁模块 (arbitration/) 文件
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 修改 `arbitration/Case.tsx` (1 处 ProTable 需修改,1 处 `options={false}` 跳过)
  - 第 693 行 ProTable 有 `options={false}` → 跳过
  - 第 484 行 ProTable 无 options → 添加
- **Acceptance Criteria Addressed**: AC-1, AC-4
- **Test Requirements**:
  - `programmatic` TR-9.1: 第 484 行 ProTable 添加 `options={{ density: false }}`
  - `programmatic` TR-9.2: 第 693 行 ProTable 保持 `options={false}` 不变

## [x] Task 10: 修改用户会员模块 (user-member/) 文件
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 修改 `user-member/UserList.tsx` (1 处 ProTable)
  - 修改 `user-member/MemberLevel.tsx` (2 处 ProTable)
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-10.1: 每个 ProTable 均包含 `options={{ density: false }}`

## [x] Task 11: 修改系统管理模块 (system/) 文件
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 修改 `system/Admin.tsx` (1 处 ProTable)
  - 修改 `system/Role.tsx` (1 处 ProTable)
  - 修改 `system/Dict.tsx` (1 处 ProTable)
  - 修改 `system/AuditLog.tsx` (1 处 ProTable)
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-11.1: 每个 ProTable 均包含 `options={{ density: false }}`

## [x] Task 12: TypeScript 编译验证
- **Priority**: high
- **Depends On**: Task 2-11
- **Description**:
  - 运行 `npx tsc --noEmit` 验证所有修改后类型正确
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `programmatic` TR-12.1: `npx tsc --noEmit` 退出码为 0,无错误输出

## [x] Task 13: 最终验证与报告
- **Priority**: medium
- **Depends On**: Task 12
- **Description**:
  - 验证关键文件 `gene/List.tsx`、`gene/Audit.tsx`、`gene/Detail.tsx`
  - 汇总所有修改文件列表
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `programmatic` TR-13.1: 关键文件 ProTable 均包含 `options={{ density: false }}`
  - `programmatic` TR-13.2: 输出完整修改文件列表