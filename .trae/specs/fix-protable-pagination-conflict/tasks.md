# ProTable 分页状态冲突修复 - The Implementation Plan (Decomposed and Prioritized Task List)

## 修复模式说明

### 问题代码模式（当前）
```tsx
// 1. 外部 state 管理分页
const [tablePagination, setTablePagination] = useState({ current: 1, pageSize: 10 });

// 2. pagination 展开 state，与 ProTable 内部状态冲突
pagination={{
  ...tablePagination,  // ← 这里把 current/pageSize 传入，造成冲突
  showSizeChanger: true,
  pageSizeOptions: [10, 20, 50, 100],
  onChange: (current, pageSize) => {
    setTablePagination({ current, pageSize });
  },
  onShowSizeChange: (_current, pageSize) => {
    setTablePagination({ current: 1, pageSize });
  },
}}
```

### 修复后代码模式
```tsx
// 1. 删除外部 state（或保留不影响功能）
// const [tablePagination, setTablePagination] = useState({ current: 1, pageSize: 10 });

// 2. 让 ProTable 内部管理分页，仅提供配置
pagination={{
  showSizeChanger: true,
  pageSizeOptions: [10, 20, 50, 100],
  defaultPageSize: 10,
}}
```

### 影响范围
共有 **22 个文件、24 个 ProTable 实例**需要修复，分为三组：

**第一组 - NFT 核心模块（3 个 ProTable）**
- nft/List.tsx (1 个 ProTable)
- nft/Audit.tsx (2 个 ProTable：资产列表 + 任务列表)

**第二组 - 业务模块（12 个 ProTable）**
- competition/List.tsx, competition/Verify.tsx, competition/Result.tsx
- detection/Order.tsx, detection/Report.tsx, detection/Org.tsx
- auction/Items.tsx, auction/Deal.tsx, auction/Session.tsx
- arbitration/Case.tsx
- loft/List.tsx, loft/Pigeons.tsx, loft/Audit.tsx

**第三组 - 系统/内容/基因/用户模块（9 个 ProTable）**
- system/Admin.tsx, system/Role.tsx, system/Dict.tsx, system/AuditLog.tsx
- content/News.tsx, content/Notice.tsx, content/Banner.tsx
- gene/List.tsx, gene/Audit.tsx
- user-member/UserList.tsx

**不修改的页面**
- statistics/Overview.tsx（普通 Table，showSizeChanger: false）
- gene/Detail.tsx（pagination={false}）
- user-member/MemberLevel.tsx（pagination={false}）
- system/Config.tsx（普通 Table，pagination={false}）

---

## [x] Task 1: NFT 核心模块 ProTable 分页修复（2 个文件，3 个 ProTable）
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修复 nft/List.tsx 中 1 个 ProTable 的分页配置：移除 `...tablePagination` 展开和 `onChange`/`onShowSizeChange` 回调，改为使用 `defaultPageSize: 10`
  - 修复 nft/Audit.tsx 中 2 个 ProTable（资产列表 + 任务列表）的分页配置：移除 `...assetPagination`/`...taskPagination` 展开和对应回调
  - 可选删除不再使用的 state 声明
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-1.1: NFT 列表页面点击第 2 页，页码正确选中，数据正确刷新
  - `programmatic` TR-1.2: NFT 列表页面切换 "20 条/页"，分页器显示正确，数据刷新
  - `programmatic` TR-1.3: NFT 审核页面（资产列表 Tab）切换 pageSize 正常
  - `programmatic` TR-1.4: NFT 审核页面（已完成 Tab）点击第 2 页正常
  - `programmatic` TR-1.5: Console 无 AntD Table 分页警告
  - `programmatic` TR-1.6: TypeScript 编译通过 `npx tsc --noEmit`
- **Notes**: NFT/Audit.tsx 有两个独立 ProTable，需分别修改

## [x] Task 2: 业务模块 ProTable 分页修复（13 个文件，13 个 ProTable）
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 竞赛模块：competition/List.tsx, competition/Verify.tsx, competition/Result.tsx
  - 检测模块：detection/Order.tsx, detection/Report.tsx, detection/Org.tsx
  - 拍卖模块：auction/Items.tsx, auction/Deal.tsx, auction/Session.tsx
  - 仲裁模块：arbitration/Case.tsx
  - 鸽舍模块：loft/List.tsx, loft/Pigeons.tsx, loft/Audit.tsx
  - 每个文件移除 `...tablePagination` 展开和 `onChange`/`onShowSizeChange` 回调
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-2.1: 每个页面点击页码切换正常
  - `programmatic` TR-2.2: 每个页面切换 pageSize 正常
  - `programmatic` TR-2.3: Console 无 AntD Table 分页警告
  - `programmatic` TR-2.4: TypeScript 编译通过
- **Notes**: detection/Order.tsx 有 1 个 ProTable，其他文件均为 1 个

## [x] Task 3: 系统/内容/基因/用户模块 ProTable 分页修复（10 个文件，10 个 ProTable）
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 系统模块：system/Admin.tsx, system/Role.tsx, system/Dict.tsx, system/AuditLog.tsx
  - 内容模块：content/News.tsx, content/Notice.tsx, content/Banner.tsx
  - 基因模块：gene/List.tsx, gene/Audit.tsx
  - 用户模块：user-member/UserList.tsx
  - 每个文件移除 `...tablePagination` 展开和 `onChange`/`onShowSizeChange` 回调
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-3.1: 每个页面点击页码切换正常
  - `programmatic` TR-3.2: 每个页面切换 pageSize 正常
  - `programmatic` TR-3.3: Console 无 AntD Table 分页警告
  - `programmatic` TR-3.4: TypeScript 编译通过
- **Notes**: system/Dict.tsx 的 ProTable 在嵌套结构中，需注意定位

## [x] Task 4: 全面验证
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3
- **Description**:
  - 运行 `npx tsc --noEmit` 全量编译检查
  - 浏览器验证 NFT 列表、NFT 审核、基因列表等页面的分页功能
  - 确认所有 ProTable 页面的页码点击和 pageSize 切换功能正常
  - 确认 Console 无任何 AntD Table 分页警告
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-4.1: `npx tsc --noEmit` 零错误
  - `human-judgement` TR-4.2: 浏览器测试页码点击切换正常
  - `human-judgement` TR-4.3: 浏览器测试 pageSize 切换正常
  - `programmatic` TR-4.4: Console 无 Warning
- **Notes**: 重点验证 NFT 核心模块和多个 ProTable 实例的页面