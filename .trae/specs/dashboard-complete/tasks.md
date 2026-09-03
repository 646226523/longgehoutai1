# 工作台功能闭环扩展 - 实施计划

## [x] Task 1: 扩展 Mock 数据（90天趋势 + 待办事项）
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 修改 `src/pages/dashboard/mockData.ts`
  - 新增 `trendData90`（90 天趋势数据，复用 `generateTrendData(90)`）
  - 新增 `TodoItem` 接口与 `todos` 数组（5-6 条待办，含 title/count/path/businessKey）
  - 新增 `trendInsights.week90` 文案
- **Acceptance Criteria Addressed**: AC-1, AC-4
- **Test Requirements**:
  - `programmatic` TR-1.1: `npx tsc --noEmit` 零错误
  - `programmatic` TR-1.2: `trendData90.length === 90`
  - `programmatic` TR-1.3: `todos.length >= 4`

## [x] Task 2: 创建待办事项组件 TodoListPanel.tsx
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 新建 `src/pages/dashboard/TodoListPanel.tsx`
  - 卡片标题"待办事项"，右上角"展开全部/收起"按钮
  - 默认展示前 3 条，展开后显示全部
  - 每条：圆点 + 标题 + 数量徽章 + 右箭头
  - 点击单条触发 `onNavigate(path)`
  - Props: `todos: TodoItem[]`, `onNavigate: (path: string) => void`
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3
- **Test Requirements**:
  - `human-judgement` TR-2.1: 默认显示 3 条，按钮文字"展开全部"
  - `human-judgement` TR-2.2: 点击后显示全部，按钮切换为"收起"
  - `programmatic` TR-2.3: 点击条目触发 onNavigate 回调

## [x] Task 3: 扩展 TrendChart 支持 90 天
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - 修改 `src/pages/dashboard/TrendChart.tsx`
  - Segmented 选项新增"近 90 天"
  - state `range` 类型扩展为 `'week7' | 'week30' | 'week90'`
  - Props 新增 `data90: TrendPoint[]`
  - 90 天视图下，X 轴日期标签稀疏化（约每 10 天显示一个）
  - 切换时清空 hoverIndex
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgement` TR-3.1: 切换至 90 天后图表正确渲染
  - `human-judgement` TR-3.2: X 轴日期标签不重叠
  - `programmatic` TR-3.3: `npx tsc --noEmit` 零错误

## [x] Task 4: 实现趋势图 CSV 导出功能
- **Priority**: medium
- **Depends On**: Task 3
- **Description**:
  - 在 `TrendChart.tsx` 中实现 `handleExport` 函数
  - 拼接 CSV 字符串：表头 `日期,基因档案新增,活跃用户,NFT铸造数`
  - 内容行：当前选中 range 的数据
  - 添加 UTF-8 BOM（`\uFEFF`）避免 Excel 中文乱码
  - 文件名：`运营趋势_近X天_YYYYMMDD.csv`（X 为 7/30/90）
  - 使用 Blob + URL.createObjectURL + a 标签触发下载
  - 导出按钮 onClick 绑定 `handleExport`
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `programmatic` TR-4.1: 点击导出后生成 CSV 文件
  - `programmatic` TR-4.2: CSV 文件含 UTF-8 BOM
  - `programmatic` TR-4.3: CSV 行数 = 数据天数 + 1（表头）

## [x] Task 5: 重构 Dashboard.tsx 模块顺序
- **Priority**: high
- **Depends On**: Task 2, Task 3
- **Description**:
  - 修改 `src/pages/Dashboard.tsx`
  - 调整模块顺序为：欢迎卡片 → 指标卡片 → 预警中心（独立行）→ 趋势图（独立行）→ 快捷入口（独立行）→ 待办事项（独立行）
  - 传入新的 props：TrendChart 增加 `data90`，TodoListPanel 接入
  - 验证指标卡片点击跳转路径有效（控制台无 404 warning）
- **Acceptance Criteria Addressed**: AC-6, AC-7
- **Test Requirements**:
  - `human-judgement` TR-5.1: 模块顺序符合视觉示意
  - `programmatic` TR-5.2: 点击指标卡片触发 navigate
  - `programmatic` TR-5.3: `npx tsc --noEmit` 零错误

## [x] Task 6: 浏览器端到端验证
- **Priority**: high
- **Depends On**: Task 5
- **Description**:
  - 启动 dev server，浏览器打开工作台
  - 截图验证全部 6 个模块按顺序展示
  - 测试待办展开/收起、90 天切换、CSV 导出
  - 检查控制台零 error
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-4, AC-5, AC-6, AC-7
- **Test Requirements**:
  - `programmatic` TR-6.1: 控制台零 error
  - `human-judgement` TR-6.2: 截图确认完整布局
  - `human-judgement` TR-6.3: CSV 导出文件可正常打开

# Task Dependencies
- Task 1 → (无依赖)
- Task 2 → Task 1
- Task 3 → Task 1
- Task 4 → Task 3
- Task 5 → Task 2, Task 3
- Task 6 → Task 5
