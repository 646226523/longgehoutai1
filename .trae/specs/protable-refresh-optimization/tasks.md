# ProTable 刷新功能优化 - Implementation Plan

## [x] Task 1: 创建 useTableRefresh 自定义 Hook
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 创建 `admin-web/src/hooks/useTableRefresh.ts`
  - 封装刷新逻辑，提供:
    - `refreshing` 状态（Boolean，用于控制按钮 loading）
    - `lastRefreshTime` 时间戳（用于显示"上次刷新"）
    - `handleRefresh()` 方法（调用 reload，管理 loading 状态，显示成功/失败提示）
    - `tableLoading` 状态（用于 ProTable loading prop）
  - 接受参数: `actionRef`, `onSuccess?`, `onError?`, `showToast?`
  - 返回: `{ refreshing, lastRefreshTime, handleRefresh, tableLoading, formatTime }`
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
- **Test Requirements**:
  - `programmatic` TR-1.1: Hook 返回正确的状态和方法
  - `human-judgement` TR-1.2: 刷新过程中状态正确变化（refreshing → true → false）
  - `programmatic` TR-1.3: 错误情况下 refreshing 状态正确恢复

## [x] Task 2: 创建 RefreshIndicator 组件
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 创建 `admin-web/src/components/RefreshIndicator.tsx`
  - 显示"上次刷新: YYYY-MM-DD HH:mm:ss"时间戳
  - 支持 loading 状态（显示旋转图标）
  - 当没有刷新记录时显示"尚未刷新"
  - 样式：灰色小字，放在工具栏右侧
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgement` TR-2.1: 时间戳格式正确
  - `human-judgement` TR-2.2: loading 状态视觉反馈清晰

## [x] Task 3: 封装通用刷新按钮
- **Priority**: high
- **Depends On**: Task 1, Task 2
- **Description**:
  - 创建 `admin-web/src/components/RefreshButton.tsx`
  - 整合 useTableRefresh 和 RefreshIndicator
  - 提供一键接入的刷新方案
  - Props: `actionRef`, `messageApi`, `onRefresh?`
  - 使用 `<Button loading={refreshing} icon={<ReloadOutlined />}>` 实现
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-3.1: 点击按钮后 loading 状态正确切换
  - `human-judgement` TR-3.2: 旋转动画流畅

## [x] Task 4: 逐页接入刷新优化
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3
- **Description**:
  - 修改所有 ProTable 页面，接入 useTableRefresh
  - 涉及页面（约 20+ 个）:
    - competition/List.tsx
    - competition/Verify.tsx
    - competition/VerifyDetail.tsx
    - competition/Result.tsx
    - gene/List.tsx, gene/Audit.tsx, gene/Detail.tsx
    - loft/List.tsx, loft/Pigeons.tsx, loft/Audit.tsx
    - auction/Deal.tsx, auction/Session.tsx, auction/Items.tsx
    - system/Admin.tsx, system/Role.tsx, system/Dict.tsx, system/AuditLog.tsx
    - content/Banner.tsx, content/News.tsx, content/Notice.tsx
    - arbitration/Case.tsx
    - detection/Order.tsx, detection/Report.tsx, detection/Org.tsx
    - user-member/UserList.tsx, user-member/MemberLevel.tsx
    - nft/List.tsx, nft/Audit.tsx
  - 每个页面改动:
    1. 引入 useTableRefresh hook
    2. 添加 hook 调用代码
    3. 将 `actionRef.current?.reload()` 替换为 `handleRefresh()`
    4. ProTable 添加 `loading={tableLoading}` prop
    5. 在工具栏添加 RefreshIndicator 组件
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-5
- **Test Requirements**:
  - `programmatic` TR-4.1: 每个页面 TypeScript 编译无错误
  - `human-judgement` TR-4.2: 每个页面刷新按钮功能正确

## [x] Task 5: 构建与集成验证
- **Priority**: high
- **Depends On**: Task 1-4
- **Description**:
  - 运行 `npm run build` 确保无编译错误
  - 启动前端开发服务器
  - 浏览器自动化测试验证典型页面刷新功能
  - 测试场景：
    - 点击刷新按钮 → 按钮旋转 → 成功提示 → 时间戳更新
    - 网络异常 → 错误提示 → 按钮恢复
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-5.1: `npm run build` 构建成功
  - `human-judgement` TR-5.2: 浏览器测试中刷新反馈流畅
