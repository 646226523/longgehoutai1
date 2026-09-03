# 后台管理表格分页 pageSize 切换 Bug 修复 - Verification Checklist

## Task 1: NFT 核心模块分页修复（3个文件，3处分页）

### 代码修改检查
- [x] Checkpoint 1.1: NFT/List.tsx 添加 `const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })`
- [x] Checkpoint 1.2: NFT/List.tsx 的 ProTable pagination 改为使用 state，包含 `onChange` 和 `onShowSizeChange`
- [x] Checkpoint 1.3: NFT/List.tsx 的 pagination 添加 `pageSizeOptions: [10, 20, 50, 100]`
- [x] Checkpoint 1.4: NFT/Audit.tsx asset table 添加独立的 pagination state (`assetPagination`)
- [x] Checkpoint 1.5: NFT/Audit.tsx asset table pagination 添加 `onChange`、`onShowSizeChange`、`pageSizeOptions`
- [x] Checkpoint 1.6: NFT/Audit.tsx task table 添加独立的 pagination state (`taskPagination`)
- [x] Checkpoint 1.7: NFT/Audit.tsx task table pagination 添加 `onChange`、`onShowSizeChange`、`pageSizeOptions`

### 功能验证
- [x] Checkpoint 1.8: 访问 NFT 列表页面，切换到 20 条/页，显示 20 条数据
- [x] Checkpoint 1.9: 访问 NFT 列表页面，切换到 50 条/页，显示 50 条数据（或实际数据总量）
- [x] Checkpoint 1.10: 访问 NFT 审核页面（资产 Tab），切换 pageSize 正常工作
- [x] Checkpoint 1.11: 访问 NFT 审核页面（上链中 Tab），切换 pageSize 正常工作
- [x] Checkpoint 1.12: Console 中无 `Warning: [antd: Table] dataSource length is less than pagination.total`
- [x] Checkpoint 1.13: TypeScript 编译通过 `npx tsc --noEmit`

---

## Task 2: 业务模块分页修复（12个文件，12处分页）

### 代码修改检查
- [x] Checkpoint 2.1: competition/List.tsx 分页配置已修复
- [x] Checkpoint 2.2: competition/Verify.tsx 分页配置已修复
- [x] Checkpoint 2.3: competition/Result.tsx 分页配置已修复
- [x] Checkpoint 2.4: detection/Order.tsx 分页配置已修复
- [x] Checkpoint 2.5: detection/Report.tsx 分页配置已修复
- [x] Checkpoint 2.6: detection/Org.tsx 分页配置已修复
- [x] Checkpoint 2.7: auction/Items.tsx 分页配置已修复
- [x] Checkpoint 2.8: auction/Deal.tsx 分页配置已修复
- [x] Checkpoint 2.9: auction/Session.tsx 分页配置已修复
- [x] Checkpoint 2.10: arbitration/Case.tsx 分页配置已修复
- [x] Checkpoint 2.11: loft/List.tsx 分页配置已修复
- [x] Checkpoint 2.12: loft/Pigeons.tsx 分页配置已修复
- [x] Checkpoint 2.13: loft/Audit.tsx 分页配置已修复

### 功能验证
- [x] Checkpoint 2.14: 竞赛列表页面 pageSize 切换正常
- [x] Checkpoint 2.15: 竞赛审核页面 pageSize 切换正常
- [x] Checkpoint 2.16: 竞赛结果页面 pageSize 切换正常
- [x] Checkpoint 2.17: 检测订单页面 pageSize 切换正常
- [x] Checkpoint 2.18: 检测报告页面 pageSize 切换正常
- [x] Checkpoint 2.19: 检测机构页面 pageSize 切换正常
- [x] Checkpoint 2.20: 拍卖物品页面 pageSize 切换正常
- [x] Checkpoint 2.21: 拍卖成交页面 pageSize 切换正常
- [x] Checkpoint 2.22: 拍卖场次页面 pageSize 切换正常
- [x] Checkpoint 2.23: 仲裁案件页面 pageSize 切换正常
- [x] Checkpoint 2.24: 鸽舍列表页面 pageSize 切换正常
- [x] Checkpoint 2.25: 鸽子管理页面 pageSize 切换正常
- [x] Checkpoint 2.26: 鸽舍审核页面 pageSize 切换正常
- [x] Checkpoint 2.27: 以上页面 Console 均无 AntD Table pagination 警告
- [x] Checkpoint 2.28: TypeScript 编译通过

---

## Task 3: 系统/内容/基因/用户模块分页修复（10个文件，14处分页）

### 代码修改检查
- [x] Checkpoint 3.1: system/Admin.tsx 分页配置已修复
- [x] Checkpoint 3.2: system/Role.tsx 分页配置已修复
- [x] Checkpoint 3.3: system/Dict.tsx 分页配置已修复
- [x] Checkpoint 3.4: system/Config.tsx 分页配置已修复
- [x] Checkpoint 3.5: system/AuditLog.tsx 分页配置已修复
- [x] Checkpoint 3.6: content/News.tsx 分页配置已修复
- [x] Checkpoint 3.7: content/Notice.tsx 分页配置已修复
- [x] Checkpoint 3.8: content/Banner.tsx 分页配置已修复
- [x] Checkpoint 3.9: gene/List.tsx 分页配置已修复
- [x] Checkpoint 3.10: gene/Audit.tsx 分页配置已修复
- [x] Checkpoint 3.11: gene/Detail.tsx 分页配置已修复
- [x] Checkpoint 3.12: user-member/UserList.tsx 分页配置已修复
- [x] Checkpoint 3.13: user-member/MemberLevel.tsx 分页配置已修复
- [x] Checkpoint 3.14: statistics/Overview.tsx 3处分页检查
  - 2处 `showSizeChanger: false` 保持不变
  - 1处有 `showSizeChanger: true` 的已修复

### 功能验证
- [x] Checkpoint 3.15: 用户管理页面 pageSize 切换正常
- [x] Checkpoint 3.16: 角色管理页面 pageSize 切换正常
- [x] Checkpoint 3.17: 字典管理页面 pageSize 切换正常
- [x] Checkpoint 3.18: 系统配置页面 pageSize 切换正常
- [x] Checkpoint 3.19: 审计日志页面 pageSize 切换正常
- [x] Checkpoint 3.20: 新闻管理页面 pageSize 切换正常
- [x] Checkpoint 3.21: 通知管理页面 pageSize 切换正常
- [x] Checkpoint 3.22: 横幅管理页面 pageSize 切换正常
- [x] Checkpoint 3.23: 基因列表页面 pageSize 切换正常
- [x] Checkpoint 3.24: 基因审核页面 pageSize 切换正常
- [x] Checkpoint 3.25: 基因详情页面 pageSize 切换正常
- [x] Checkpoint 3.26: 会员列表页面 pageSize 切换正常
- [x] Checkpoint 3.27: 会员等级页面 pageSize 切换正常
- [x] Checkpoint 3.28: 以上页面 Console 均无 AntD Table pagination 警告
- [x] Checkpoint 3.29: TypeScript 编译通过

---

## Task 4: 全面验证和最终测试

### 最终验证
- [x] Checkpoint 4.1: 全量 `npx tsc --noEmit` 编译通过，零错误
- [x] Checkpoint 4.2: 所有 23 个页面的 pageSize 切换功能正常
- [x] Checkpoint 4.3: 切换到 20 条/页 → 显示 20 条数据
- [x] Checkpoint 4.4: 切换到 50 条/页 → 显示 50 条数据
- [x] Checkpoint 4.5: 切换到 100 条/页 → 显示 100 条数据（若数据足够）
- [x] Checkpoint 4.6: 切换 pageSize 后，分页器显示正确选中的 pageSize
- [x] Checkpoint 4.7: Console 无任何 AntD Table pagination 警告
- [x] Checkpoint 4.8: 切换 pageSize 后，搜索条件保持不丢失
- [x] Checkpoint 4.9: 切换 pageSize 后，当前 Tab 保持不变
- [x] Checkpoint 4.10: 页面刷新后 pageSize 重置为默认 10（预期行为）