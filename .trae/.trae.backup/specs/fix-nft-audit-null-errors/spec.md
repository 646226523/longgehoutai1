# 修复 NFT 审核页空值访问报错

## 问题描述

NFT 审核页面 (`src/pages/nft/Audit.tsx`) 在加载时产生以下控制台错误：

1. **`TypeError: Cannot read properties of null (reading 'today_approved')`**
   - 位置：`Audit.tsx` 渲染阶段访问 `stats.today_approved`
   - 原因：`getNftAuditStats()` API 返回 `null` 时，`setStats(null)` 将 `stats` 设为 `null`，后续 JSX 渲染访问 `stats.today_approved` 触发空引用异常

2. **`TypeError: Cannot read properties of null (reading 'total')`**
   - 位置：`Audit.tsx` 的 `refreshBadgeCounts` 函数
   - 原因：`getNftAuditList` / `getNftTasks` API 返回 `null` 时，`r.value` 为 `null`，访问 `page.total` 触发空引用异常

## 目标

- 消除 NFT 审核页面的两条空引用报错
- 在 API 返回 null/异常时保持页面功能可用（显示默认值 0）
- 保持 TypeScript 类型安全

## 非目标

- 不修改后端 API 行为
- 不改变页面 UI 布局或样式
- 不引入新的功能模块

## 约束

- 现有响应拦截器在 `res.code === 0` 时返回 `res.data`，当 data 为 null 时透传 null
- 需在 `Audit.tsx` 前端层面处理 null 值防御
- 保持与现有 `NftAuditStats` 接口兼容

## 验收标准

| ID | 类型 | 描述 |
|----|------|------|
| AC-1 | rule | 访问 NFT 审核页面时，控制台不再出现 `Cannot read properties of null (reading 'today_approved')` 错误 |
| AC-2 | rule | 访问 NFT 审核页面时，控制台不再出现 `Cannot read properties of null (reading 'total')` 错误 |
| AC-3 | rule | 统计卡片（今日通过、铸造成功、铸造失败、平均耗时）在 API 返回 null 时显示默认值 0，而非崩溃 |
| AC-4 | rule | 徽章计数（待审核、已驳回、铸造中、已完成）在 API 返回 null 时显示默认值 0 |
| AC-5 | rule | TypeScript 编译零错误 |
