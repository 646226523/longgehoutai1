# 资讯管理"无效的ID"错误修复 - Implementation Plan

## [x] Task 1: 修复后端路由注册顺序
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 将 `/news/stats` 路由（第576行）移动到 `/news/:id` 路由（第392行）之前
  - 确保 Express 优先匹配固定路径 `/news/stats`，而非参数化路径 `/news/:id`
  - 具体操作：剪切第575-584行的 stats 路由代码，粘贴到第391行（`/news/:id` 路由）之前
- **Acceptance Criteria Addressed**: AC-1, AC-4
- **Test Requirements**:
  - `programmatic` TR-1.1: `GET /api/content/news/stats` 返回 200 和统计数据
  - `programmatic` TR-1.2: `GET /api/content/news/:id` 对数字ID正常工作
  - `programmatic` TR-1.3: `GET /api/content/news/stats` 不再返回 400 错误
- **Notes**: 路由文件路径 `admin-api/src/routes/content.ts`

## [ ] Task 2: 浏览器验证修复结果
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 重启后端服务
  - 访问资讯管理页面验证
  - 确认无"无效的ID"错误
  - 确认统计看板正常显示
  - 确认所有资讯操作功能正常
- **Acceptance Criteria Addressed**: AC-2, AC-3
- **Test Requirements**:
  - `programmatic` TR-2.1: 页面加载无错误提示
  - `programmatic` TR-2.2: 统计看板显示5个指标数值
  - `programmatic` TR-2.3: 控制台无错误信息
