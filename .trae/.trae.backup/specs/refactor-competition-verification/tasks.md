# 赛事核验功能重构 - Implementation Plan

## [x] Task 1: 后端接口新增与调整
- [x] SubTask 1.1: 新增 `GET /api/competition/verify-list` 接口
- [x] SubTask 1.2: 新增 `POST /api/competition/batch-verify` 接口
- [x] SubTask 1.3: 前端 services 层新增对应 API 调用
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 `admin-api/src/routes/competition.ts` 中新增接口。
  - 新增 `GET /api/competition/verify-list`：返回用于核验列表页的赛事数据，每个赛事需包含统计字段（total, verified_count, failed_count）和计算出的 verify_progress 状态。
  - 新增 `POST /api/competition/batch-verify`：接收 `{ competition_ids: number[] }`，批量核验多场赛事的所有未核验参赛鸽。
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-1.1: `GET /api/competition/verify-list` 返回的数据包含 `verify_progress` 和 `status` 字段。
  - `programmatic` TR-1.2: `POST /api/competition/batch-verify` 能正确处理多个赛事 ID。

## [x] Task 2: 重构赛事核验列表页 (VerifyList)
- [x] SubTask 2.1: ProTable 展示赛事列表，含进度条和状态标签
- [x] SubTask 2.2: 实现筛选、行选择和批量操作
- [x] SubTask 2.3: 添加核验统计看板

## [x] Task 3: 实现核验详情页 (VerifyDetail)
- [x] SubTask 3.1: 参赛鸽列表展示与搜索筛选
- [x] SubTask 3.2: 单羽核验与批量核验操作

## [x] Task 4: 集成扫码设备联动 (UI 模拟)
- [x] SubTask 4.1: 创建设备状态指示器
- [x] SubTask 4.2: 创建模拟扫码输入框与扫描记录
- [x] SubTask 4.3: 实现模拟扫码核验流程

## [x] Task 5: 前端路由与入口整合
- [x] SubTask 5.1: 路由配置更新，`/competition/verify` 指向 `VerifyList`
- [x] SubTask 5.2: 路由配置更新，`/competition/verify/:id` 指向 `VerifyDetail`
- [x] SubTask 5.3: 赛事列表页入口按钮跳转修正

## [x] Task 6: 构建与浏览器全流程验证
- [x] SubTask 6.1: 项目构建成功 (npm run build)
- [x] SubTask 6.2: 核验列表页功能验证 (列表渲染、进度条、状态标签、统计看板)
- [x] SubTask 6.3: 核验详情页功能验证 (参赛鸽列表、扫码设备联动 UI)
- [x] SubTask 6.4: 模拟扫码流程验证 (扫码输入、记录更新)
