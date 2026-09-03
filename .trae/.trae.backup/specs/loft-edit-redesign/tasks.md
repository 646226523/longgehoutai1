# 公棚编辑页重构 - Implementation Plan

## [x] Task 1: 后端扩展 lofts 表结构与接口
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 lofts 表中确保 `description`（公棚简介 TEXT）和 `status`（状态 0/1/2）字段存在
  - 更新 PUT /api/loft/lofts/:id 接口支持新字段
  - 新增 GET /api/loft/lofts/:id/competitions 接口返回已关联赛事列表
  - 更新 GET /api/loft/lofts 列表接口返回 pigeon_total（当前存棚数）和 capacity 用于计算使用率
- **Acceptance Criteria Addressed**: AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-1.1: API 返回数据包含 description, status, pigeon_total 字段
  - `programmatic` TR-1.2: PUT 接口能正确保存新字段
- **Notes**: 使用 SQLite ALTER TABLE ADD COLUMN，若字段已存在则跳过

## [x] Task 2: 创建公棚专用地图选点组件 LoftMapPicker
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 基于现有 RealMapSelector 封装或创建简化版地图选点组件
  - 支持：地图点击放置标记、拖拽标记、搜索地址定位
  - 双向同步：props 接收 lng/lat/address，onChange 回调返回
  - 地图未配置时回退到 SVG 静态地图
  - 显示经纬度信息面板
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-2.1: 组件接收 props 并在地图上正确渲染标记
  - `human-judgement` TR-2.2: 点击/拖拽标记后经纬度和地址自动更新

## [x] Task 3: 重构 Loft/List.tsx 编辑弹窗
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 将 ModalForm 宽度从 560px 扩展到 1080px
  - 采用左右分栏布局：左侧 Col(12) 表单，右侧 Col(12) 地图
  - 左侧表单分组：基础信息、位置信息、运营配置
  - 右侧：地图选点 + 经纬度信息 + 已关联赛事列表
  - 新增字段：description(TextArea)、status(Radio)
  - 容量使用率进度条：<75%绿，75-90%橙，>90%红
  - 位置变更提示
  - 保存时将经纬度正确组装为 location JSON
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-3.1: 表单所有字段正确渲染和提交
  - `human-judgement` TR-3.2: 地图交互流畅，数据双向同步正确

## [x] Task 4: 构建与浏览器验证
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 运行 npm run build 验证构建通过
  - 启动前后端服务，使用 Playwright 进行浏览器自动化测试
  - 验证：编辑弹窗打开、表单字段完整、地图交互、保存功能
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `programmatic` TR-4.1: npm run build 无错误
  - `programmatic` TR-4.2: 浏览器自动化测试通过所有检查点
