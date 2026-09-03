# 修复 Ant Design 组件废弃警告 - Implementation Plan

## [x] Task 1: 搭建全局 App 上下文，统一 message 调用
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 App.tsx 或 AdminLayout.tsx 中确保使用 Ant Design 的 `<App>` 组件包裹整个应用
  - 创建 `src/hooks/useAntdApp.ts` Hook，导出 `message`、`modal`、`notification` 实例
  - 使 `message` 实例可在任意组件中通过 Hook 获取
  - 修改 `request.ts`（axios 拦截器）中的 `message.error()` 调用，改为使用可配置的 message 实例或回退到静态方法
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: 全局挂载 `<App>` 组件后，页面级组件通过 `useAntdApp()` 获取的 message 可正常使用
  - `programmatic` TR-1.2: 修改后的 `request.ts` 拦截器能正常显示错误提示
  - `programmatic` TR-1.3: `npx tsc --noEmit` 零错误
- **Notes**: request.ts 是普通 TS 文件（非组件），无法使用 Hook。需要通过导出一个可设置的 message 引用方案解决。

## [x] Task 2: 修复 Login.tsx 中的 message 静态调用
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 读取 Login.tsx，将所有 `message.success()` / `message.error()` 静态调用改为通过 `useAntdApp()` 获取的 `message` 实例调用
  - Login.tsx 需要用 `<App>` 组件包裹或在 App 组件内部渲染
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-2.1: 登录成功/失败时 message 提示正常显示
  - `programmatic` TR-2.2: 控制台不再出现 `[antd: message]` 错误
- **Notes**: Login 页面在 RequireAuth 路由之外，需要特殊处理（可用 App.useApp 或在 Login 外层包 App）

## [x] Task 3: 修复所有页面组件中的 message 静态调用
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 遍历所有 pages/ 下的 .tsx 文件
  - 将所有 `import { message } from 'antd'` 改为从 `useAntdApp()` 获取
  - 在每个需要 message 的组件中添加 `const { message } = useAntdApp()` Hook 调用
  - 确保组件均在 `<App>` 包裹的上下文中
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-3.1: 所有页面 message 提示功能正常
  - `programmatic` TR-3.2: 控制台 message 错误为 0
  - `programmatic` TR-3.3: `npx tsc --noEmit` 零错误
- **Notes**: 涉及文件较多（约 20+ 个文件），可批量处理

## [x] Task 4: 修复 Dashboard.tsx 中 Card bodyStyle 废弃警告
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 读取 Dashboard.tsx 第 83 行附近的 Card 组件
  - 将 `bodyStyle={{ textAlign: 'center', padding: '20px 12px' }}` 改为 `styles={{ body: { textAlign: 'center', padding: '20px 12px' } }}`
  - 检查所有页面是否还有其他 `bodyStyle` 使用
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-4.1: Dashboard 页面 Card 样式与修改前一致
  - `programmatic` TR-4.2: 控制台不再出现 `[antd: Card] bodyStyle is deprecated` 警告
  - `programmatic` TR-4.3: `npx tsc --noEmit` 零错误

## [x] Task 5: 升级 @ant-design/pro-components 版本以消除 findDOMNode 和 Spin 警告
- **Priority**: medium
- **Depends On**: None
- **Description**:
  - 检查是否有更新版本的 `@ant-design/pro-components` 可用
  - 如果有，升级到最新版本
  - 如果没有替代方案，在 package.json 中锁定版本并添加注释说明
  - 同时处理 Spin tip 在非嵌套模式下的警告
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-5.1: `npm install` 成功
  - `programmatic` TR-5.2: 升级后所有页面正常渲染
  - `programmatic` TR-5.3: `npx tsc --noEmit` 零错误
- **Notes**: 如果 ProComponents 无法升级，则此任务标记为"已验证，等待上游更新"

## [x] Task 6: 全面验证与回归测试
- **Priority**: high
- **Depends On**: Task 1-4
- **Description**:
  - 重新启动前端开发服务器
  - 访问所有 26 个页面，确保控制台错误为 0
  - 测试登录、退出、增删改查核心功能
  - 修复过程中发现的任何回归问题
- **Acceptance Criteria Addressed**: AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-6.1: 控制台错误数 ≤ 2（仅允许 ProComponents 内部 findDOMNode 和 React Router 警告）
  - `human-judgement` TR-6.2: 所有页面视觉无变化，功能正常
  - `programmatic` TR-6.3: `npx tsc --noEmit` 零错误

# Task Dependencies
- Task 1 → Task 2, Task 3（必须先搭建全局 App 上下文）
- Task 1, Task 4, Task 5 可并行
- Task 6 依赖 Task 1-5 全部完成
