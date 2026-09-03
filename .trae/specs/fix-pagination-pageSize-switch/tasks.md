# 后台管理表格分页 pageSize 切换 Bug 修复 - The Implementation Plan

## 修复模式说明

### 当前问题代码
```tsx
pagination={{ pageSize: 10, showSizeChanger: true }}
```

### 修复后代码模式
```tsx
// 1. 在组件顶部添加 state
const [tablePagination, setTablePagination] = useState({
  current: 1,
  pageSize: 10,
});

// 2. ProTable 使用 state 管理分页
pagination={{
  ...tablePagination,
  showSizeChanger: true,
  pageSizeOptions: [10, 20, 50, 100],
  onChange: (current, pageSize) => {
    setTablePagination({ current, pageSize });
  },
  onShowSizeChange: (current, pageSize) => {
    setTablePagination({ current: 1, pageSize });
  },
}}
```

### 文件分组（按依赖模块）
为了减少修改风险，按模块分组分批修复：

**第一批 - NFT 核心模块（3个文件，3处分页）**
- NFT/List.tsx (1处)
- NFT/Audit.tsx (2处)

**第二批 - 业务模块（12个文件，12处分页）**
- competition/List.tsx, competition/Verify.tsx, competition/Result.tsx
- detection/Order.tsx, detection/Report.tsx, detection/Org.tsx
- auction/Items.tsx, auction/Deal.tsx, auction/Session.tsx
- arbitration/Case.tsx
- loft/List.tsx, loft/Pigeons.tsx, loft/Audit.tsx

**第三批 - 系统/内容/基因/用户模块（10个文件，14处分页）**
- system/Admin.tsx, system/Role.tsx, system/Dict.tsx, system/Config.tsx, system/AuditLog.tsx
- content/News.tsx, content/Notice.tsx, content/Banner.tsx
- gene/List.tsx, gene/Audit.tsx, gene/Detail.tsx
- user-member/UserList.tsx, user-member/MemberLevel.tsx
- statistics/Overview.tsx (3处)

---

## [x] Task 1: NFT 核心模块分页修复（3个文件，3处分页）
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修复 NFT/List.tsx 中 1 处分页配置
  - 修复 NFT/Audit.tsx 中 2 处分页配置（asset table + task table）
  - 每个 ProTable 添加 pagination state、onChange、onShowSizeChange、pageSizeOptions
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-1.1: 访问 NFT 列表页面，切换 pageSize 到 20，表格显示 20 条数据
  - `programmatic` TR-1.2: 访问 NFT 审核页面（资产列表 Tab），切换 pageSize 到 50，表格刷新显示正确数量
  - `programmatic` TR-1.3: 访问 NFT 审核页面（上链中/已完成 Tab），切换 pageSize 到 100，表格刷新显示正确数量
  - `programmatic` TR-1.4: Console 中无 AntD Table pagination 警告
  - `programmatic` TR-1.5: TypeScript 编译通过 `npx tsc --noEmit`
- **Notes**: NFT/Audit.tsx 有两个 ProTable（asset table 和 task table），需要分别添加独立的 pagination state

## [x] Task 2: 业务模块分页修复（12个文件，12处分页）
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 竞赛模块：competition/List.tsx, competition/Verify.tsx, competition/Result.tsx
  - 检测模块：detection/Order.tsx, detection/Report.tsx, detection/Org.tsx
  - 拍卖模块：auction/Items.tsx, auction/Deal.tsx, auction/Session.tsx
  - 仲裁模块：arbitration/Case.tsx
  - 鸽舍模块：loft/List.tsx, loft/Pigeons.tsx, loft/Audit.tsx
  - 每个文件添加独立的 pagination state 和正确的回调
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-2.1: 逐个访问每个页面，验证 pageSize 切换功能
  - `programmatic` TR-2.2: 每个页面 Console 无 pagination 警告
  - `programmatic` TR-2.3: TypeScript 编译通过
- **Notes**: 注意部分文件可能有多个 ProTable，需要分别检查

## [x] Task 3: 系统/内容/基因/用户模块分页修复（10个文件，14处分页）
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 系统模块：system/Admin.tsx, system/Role.tsx, system/Dict.tsx, system/Config.tsx, system/AuditLog.tsx
  - 内容模块：content/News.tsx, content/Notice.tsx, content/Banner.tsx
  - 基因模块：gene/List.tsx, gene/Audit.tsx, gene/Detail.tsx
  - 用户模块：user-member/UserList.tsx, user-member/MemberLevel.tsx
  - 统计模块：statistics/Overview.tsx (3处分页，其中2处 showSizeChanger:false 需保持不变)
  - 每个文件添加独立的 pagination state 和正确的回调
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-3.1: 逐个访问每个页面，验证 pageSize 切换功能
  - `programmatic` TR-3.2: statistics/Overview.tsx 中 showSizeChanger:false 的保持不变
  - `programmatic` TR-3.3: 每个页面 Console 无 pagination 警告
  - `programmatic` TR-3.4: TypeScript 编译通过
- **Notes**: 统计模块 Overview.tsx 中有3处分页，其中2处 `showSizeChanger: false` 不需要修改

## [x] Task 4: 全面验证和最终测试
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3
- **Description**:
  - 启动前端开发服务器
  - 浏览器自动化测试所有页面的分页功能
  - 确认所有 29 处分页配置正确工作
  - 确认 Console 无任何 AntD Table pagination 警告
  - 运行完整 TypeScript 类型检查
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
- **Test Requirements**:
  - `programmatic` TR-4.1: 全量 `npx tsc --noEmit` 编译通过
  - `human-judgement` TR-4.2: 浏览器逐个页面测试，pageSize 切换正常
  - `programmatic` TR-4.3: Console 无 Warning 错误
- **Notes**: 这是最终验证环节，需要覆盖所有 23 个页面
