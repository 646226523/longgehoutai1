# 工作台功能闭环扩展 - PRD

## Overview
- **Summary**: 在已完成的工作台 P0 基础能力（指标卡片、预警中心、快捷入口、趋势图）之上，补齐 P1/P2 功能：待办事项列表、时间维度 90 天扩展、数据导出（CSV/PDF），并按"完整重构版"视觉示意调整模块顺序，实现工作台功能闭环。
- **Purpose**: 让管理员一打开页面就能掌握全局——"数据在变好还是变坏、哪里需要关注、接下来该做什么"，将工作台从"陈列数据"升级为"辅助决策"。
- **Target Users**: 后台管理员、运营人员

## Goals
- 新增待办事项列表模块，与业务系统联动展示待处理任务
- 时间维度扩展为 7 天 / 30 天 / 90 天三档
- 实现趋势图数据导出功能（CSV + PDF）
- 按"完整重构版"调整工作台模块顺序
- 验证指标卡片点击跳转详情页路径完整可用

## Non-Goals (Out of Scope)
- 不对接真实后端 API（继续使用 Mock 数据）
- 不修改其他页面的功能
- 不引入第三方图表库或导出库（CSV 原生实现，PDF 用浏览器打印或简易实现）
- 不实现预警中心的 WebSocket 实时推送（保持当前 Mock 列表）

## Background & Context
- 前序 spec `dashboard-redesign` 已完成 P0 模块（指标卡片、趋势图、预警中心、快捷入口）
- 当前 Dashboard.tsx 模块顺序为：欢迎卡片 → 指标卡片 → 趋势图 → 预警中心+快捷入口
- 用户提供的"完整重构版"视觉示意要求的顺序为：欢迎卡片 → 指标卡片 → 预警中心 → 趋势图 → 快捷入口 → 待办事项
- TrendChart 当前仅支持 7/30 天切换，导出按钮为占位无功能

## Functional Requirements

### FR-1: 待办事项列表模块（P1 新增）
- 在工作台底部新增"待办事项"卡片
- 默认显示 3 条待办，支持"展开全部 / 收起"切换
- 每条待办包含：标题、数量徽章、跳转链接
- 待办类型：
  - 审核新上传的基因档案（条数）
  - 确认 NFT 资产上架（个数）
  - 查看今日开赛赛事数据（场数）
  - 处理用户注册审核（人数）
- 点击单条待办跳转到对应业务页面

### FR-2: 时间维度扩展为 90 天（P2）
- TrendChart 时间切换由 `[近7天 / 近30天]` 扩展为 `[近7天 / 近30天 / 近90天]`
- 新增 90 天 Mock 趋势数据
- 90 天视图下，X 轴日期标签自适应稀疏化显示（避免重叠）

### FR-3: 数据导出功能（P2）
- TrendChart 的"导出"按钮实现真实功能
- 导出格式：CSV（必选）、PDF（可选，使用浏览器打印方案）
- CSV 内容：日期、基因档案新增、活跃用户、NFT 铸造数 列
- CSV 文件名：`运营趋势_近X天_YYYYMMDD.csv`
- 导出当前选中时间范围的数据

### FR-4: 视觉布局重构
- 调整 Dashboard.tsx 模块顺序为：
  1. 欢迎卡片（含日期）
  2. 4 个指标卡片（一行）
  3. 预警中心（独立一行）
  4. 运营趋势图（独立一行，含导出按钮）
  5. 快捷入口（独立一行）
  6. 待办事项（独立一行，含展开/收起）
- 移动端响应式：所有模块在窄屏下纵向堆叠

### FR-5: 指标卡片点击跳转验证（P1）
- 验证 4 个指标卡片的 `navigatePath` 路径有效（不报 404）
- 路径列表：`/gene/list`、`/nft/list`、`/competition/list`、`/user-member/user`
- 若路径无效，在控制台输出 warning 但不阻断跳转（Mock 阶段保留）

## Non-Functional Requirements
- **NFR-1**: 首屏加载 < 1.5s（新增 90 天 Mock 数据不影响性能）
- **NFR-2**: 响应式布局适配移动端
- **NFR-3**: TypeScript 类型安全（`npx tsc --noEmit` 零错误）
- **NFR-4**: CSV 导出文件编码为 UTF-8 with BOM（避免 Excel 中文乱码）
- **NFR-5**: 浏览器控制台零 error 级别日志

## Constraints
- **Technical**: React 18 + Ant Design 5 + TypeScript + Vite
- **Dependencies**: 复用现有 `dashboard/` 目录组件，不引入新依赖
- **Business**: 所有数据继续使用 Mock，保留后端对接的接口形态

## Assumptions
- 假设路由 `/gene/list`、`/nft/list`、`/competition/list`、`/user-member/user` 已存在（前序项目已建立）
- 假设导出功能仅前端实现，无需后端配合
- 假设 PDF 导出可接受浏览器原生打印对话框方案（用户可选打印为 PDF）

## Acceptance Criteria

### AC-1: 待办事项列表展示
- **Given**: 工作台加载完成
- **When**: 滚动至页面底部观察待办事项模块
- **Then**: 显示"待办事项"卡片，默认展示 3 条待办，每条带数量徽章，提供"展开全部"按钮
- **Verification**: `human-judgment`

### AC-2: 待办事项展开/收起
- **Given**: 待办事项模块展示中
- **When**: 点击"展开全部"按钮
- **Then**: 显示全部待办（≥4 条），按钮文字切换为"收起"
- **Verification**: `human-judgment`

### AC-3: 待办跳转
- **Given**: 待办事项展示中
- **When**: 点击某一条待办
- **Then**: 跳转到对应业务页面（如 `/gene/list`）
- **Verification**: `programmatic`

### AC-4: 90 天时间维度
- **Given**: 趋势图展示中
- **When**: 点击"近 90 天"切换按钮
- **Then**: 折线图刷新为 90 天数据，X 轴日期标签稀疏化显示，数据洞察文字更新
- **Verification**: `human-judgment`

### AC-5: CSV 导出
- **Given**: 趋势图展示中，当前选中近 7 天
- **When**: 点击"导出"按钮
- **Then**: 浏览器下载 CSV 文件，文件名包含日期与时间范围，内容包含日期/基因/用户/NFT 四列数据
- **Verification**: `programmatic`

### AC-6: 布局顺序符合视觉示意
- **Given**: 工作台加载完成
- **When**: 从上到下观察
- **Then**: 模块顺序为：欢迎卡片 → 指标卡片 → 预警中心 → 趋势图 → 快捷入口 → 待办事项
- **Verification**: `human-judgment`

### AC-7: 指标卡片点击跳转
- **Given**: 工作台展示中
- **When**: 点击任一指标卡片
- **Then**: 跳转到对应详情页（路径有效，不报 404）
- **Verification**: `programmatic`

### AC-8: TypeScript 编译通过
- **Given**: 所有修改完成
- **When**: 运行 `npx tsc --noEmit`
- **Then**: 零错误
- **Verification**: `programmatic`

## Open Questions
- [ ] PDF 导出是否需要专业排版？暂定使用浏览器打印方案（window.print），如需更精致可后续引入 jspdf
- [ ] 待办事项的"全部"是几条？暂定 5-6 条 Mock 数据
