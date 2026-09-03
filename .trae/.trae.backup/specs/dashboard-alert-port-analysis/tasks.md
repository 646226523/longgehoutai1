# 预警中心优化与端口数据分析 - 实施计划

## [x] Task 1: 优化预警中心 AlertCenter 组件
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 修改 `src/pages/dashboard/AlertCenter.tsx`
  - 减少列表项 padding：从 `12px 0` 改为 `8px 0`
  - 缩小图标尺寸：从 `28px` 改为 `24px`，字号从 `14px` 改为 `12px`
  - 缩小标题字号：从 `13px` 改为 `12px`
  - 缩小 Tag 字号：从 `11px` 改为 `10px`
  - 缩小时间字号：从 `12px` 改为 `11px`
  - 减少图标与文字间距：marginRight 从 `12px` 改为 `8px`
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgement` TR-1.1: 预警中心整体高度明显缩短
  - `human-judgement` TR-1.2: 所有预警信息仍清晰可读

## [x] Task 2: 扩展 Mock 数据 - 端口分析数据
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 修改 `src/pages/dashboard/mockData.ts`
  - 新增 `PortAnalysisData` 接口：`{ channel: string; value: number; color: string }`
  - 新增 `registerPortData` 数组（4 条：网页 1234、APP 856、小程序 678、第三方 234）
  - 新增 `loginPortData` 数组（5 条：网页 2345、APP 1856、小程序 1234、扫码 856、第三方 456）
- **Acceptance Criteria Addressed**: AC-2, AC-3
- **Test Requirements**:
  - `programmatic` TR-2.1: TypeScript 类型正确
  - `programmatic` TR-2.2: 数据总量 > 0

## [x] Task 3: 创建端口分析饼状图组件
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - 新建 `src/pages/dashboard/PortAnalysisChart.tsx`
  - 使用纯 SVG 实现饼状图
  - Props: `title: string`, `data: PortAnalysisData[]`
  - 绘制饼状图（SVG path arcs）
  - 显示百分比标签（在扇区外侧）
  - 鼠标悬停显示 Tooltip（渠道名称 + 数值）
  - 底部图例（Legend）
  - 尺寸：宽 280px，高 220px
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-4
- **Test Requirements**:
  - `human-judgement` TR-3.1: 饼状图正确渲染，扇区比例准确
  - `human-judgement` TR-3.2: 颜色区分明显，百分比标签清晰
  - `human-judgement` TR-3.3: 鼠标悬停显示 Tooltip
  - `programmatic` TR-3.4: `npx tsc --noEmit` 零错误

## [x] Task 4: 在 Dashboard 中集成端口分析
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - 修改 `src/pages/Dashboard.tsx`
  - 导入 PortAnalysisChart、registerPortData、loginPortData
  - 在预警中心与快捷入口之间新增端口分析区域
  - 使用 Row/Col 布局：桌面端两图并排（xl=12），移动端堆叠（xs=24）
  - 注册端口分析在左，登录端口分析在右
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-5
- **Test Requirements**:
  - `human-judgement` TR-4.1: 桌面端两个饼状图并排展示
  - `human-judgement` TR-4.2: 移动端纵向堆叠
  - `programmatic` TR-4.3: `npx tsc --noEmit` 零错误

## [x] Task 5: 浏览器端到端验证
- **Priority**: high
- **Depends On**: Task 4
- **Description**:
  - 启动 dev server，浏览器打开工作台
  - 截图验证预警中心紧凑化效果
  - 截图验证两个饼状图正确展示
  - 测试饼状图 Tooltip 交互
  - 检查控制台零 error
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-7
- **Test Requirements**:
  - `human-judgement` TR-5.1: 预警中心高度缩短效果
  - `human-judgement` TR-5.2: 两个饼状图正确渲染
  - `human-judgement` TR-5.3: Tooltip 交互正常
  - `programmatic` TR-5.4: 控制台零 error

# Task Dependencies
- Task 1 → (无依赖)
- Task 2 → (无依赖)
- Task 3 → Task 2
- Task 4 → Task 3
- Task 5 → Task 1, Task 4
