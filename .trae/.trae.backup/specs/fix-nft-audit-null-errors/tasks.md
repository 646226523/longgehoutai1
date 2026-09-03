# 任务列表

## Task 1: 修复 refreshStats 空值处理
- **优先级**：high
- **描述**：在 `refreshStats` 函数中，对 `getNftAuditStats()` 返回值进行 null 检查，若为 null 则使用默认值对象
- **验收**：
  - [ ] 当 API 返回 null 时，`stats` 保持为初始默认值（today_approved=0 等）
  - [ ] 控制台不再出现 `today_approved` 相关错误
  - [ ] TypeScript 编译通过

## Task 2: 修复 refreshBadgeCounts 空值处理
- **优先级**：high
- **描述**：在 `refreshBadgeCounts` 函数中，对 `r.value` 进行 null 检查，若为 null 则将对应计数设为 0
- **验收**：
  - [ ] 当 API 返回 null 时，徽章计数显示为 0
  - [ ] 控制台不再出现 `total` 相关错误
  - [ ] TypeScript 编译通过

## Task 3: 浏览器验证
- **优先级**：high
- **描述**：启动开发服务器，访问 NFT 审核页面，验证无控制台报错
- **验收**：
  - [ ] 页面正常渲染
  - [ ] 控制台无 TypeError 错误
  - [ ] 统计数据显示默认值或实际数据
