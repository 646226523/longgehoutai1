# Banner管理页面重构 - 实施计划

## [x] Task 1: 扩展后端 Banner 接口
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 `admin-api/src/modules/content/db.ts` 中为 banners 表添加新字段迁移：
    - `jump_type TEXT` 跳转类型（race/auction/nft/gene/external/page）
    - `jump_target TEXT` 跳转目标 ID 或链接
    - `is_draft INTEGER` 是否草稿
    - `impressions INTEGER DEFAULT 0` 曝光量
    - `clicks INTEGER DEFAULT 0` 点击量
    - `created_by TEXT` 创建人
  - 实现字段迁移逻辑（检查字段是否存在，不存在则添加）
  - 更新示例数据填充新字段
  - 在 `admin-api/src/routes/content.ts` 中更新 Banner CRUD 接口支持新字段
  - 新增统计接口 `GET /api/content/banners/stats` 返回统计数据
- **Acceptance Criteria Addressed**: AC-1, AC-8
- **Test Requirements**:
  - `programmatic` TR-1.1: 字段迁移逻辑正确，重复执行不报错
  - `programmatic` TR-1.2: CRUD 接口支持新字段
  - `programmatic` TR-1.3: 统计接口返回正确数据
  - `human-judgement` TR-1.4: 示例数据字段填充合理
- **Completed**: 字段迁移、示例数据更新、CRUD 接口扩展、统计接口已实现

## [x] Task 2: 更新前端 Service 类型
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 在 `admin-web/src/services/content.ts` 中：
    - 扩展 `BannerItem` 接口添加新字段
    - 扩展 `BannerSaveParams` 接口
    - 新增 `getBannerStats` 接口
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `programmatic` TR-2.1: TypeScript 类型定义正确
  - `programmatic` TR-2.2: 所有字段在接口中已定义
- **Completed**: BannerItem、BannerSaveParams、BannerStats 接口已扩展，getBannerStats 函数已添加

## [x] Task 3: 重构 Banner.tsx 主体布局
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 重写 `admin-web/src/pages/content/Banner.tsx`，实现完整重构
  - 导入所需组件（Statistic, Card, Row, Col, Tag, Drawer, Upload, Form, DatePicker, Select, Dropdown, Image, Space, Button, Popconfirm, Avatar, Tooltip）
  - 实现统计看板（5 个统计卡片）
  - 实现筛选与操作栏（搜索、筛选、新建、刷新）
  - 实现 Banner 列表（新列结构、状态标签、操作按钮）
  - 实现状态计算逻辑（根据 start_time/end_time/status 计算投放状态）
  - 实现跳转配置下拉选项
  - 实现模拟数据（曝光/点击）
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-7
- **Test Requirements**:
  - `programmatic` TR-3.1: 统计看板正确渲染
  - `programmatic` TR-3.2: 筛选功能正常工作
  - `programmatic` TR-3.3: 状态标签颜色正确
  - `human-judgement` TR-3.4: 列表布局美观
- **Completed**: 737 行完整实现，包含 BannerDashboard、BannerDrawer、BannerPreview、ContentBanner 四个组件

## [x] Task 4: 实现抽屉编辑器
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 实现右侧抽屉（Drawer）替代 ModalForm
  - 分 4 个分区：
    - 基础信息（Banner 名称、投放位置、排序权重）
    - 封面图片上传（使用 ImageUploader 组件）
    - 跳转配置（跳转类型 + 链接/选择已有内容）
    - 投放规则（开始时间、结束时间、投放状态）
  - 实现表单校验
  - 实现初始化数据填充
- **Acceptance Criteria Addressed**: AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-4.1: 抽屉能正常打开和关闭
  - `programmatic` TR-4.2: 表单校验正常工作
  - `programmatic` TR-4.3: 图片上传功能正常
  - `human-judgement` TR-4.4: 抽屉布局合理
- **Completed**: Drawer + Form 实现，分 4 区，接入 ImageUploader

## [x] Task 5: 实现预览弹窗
- **Priority**: medium
- **Depends On**: Task 4
- **Description**: 
  - 实现预览弹窗，展示手机模拟样式的 Banner 效果
  - 包含：手机边框、状态栏、Banner 图片、标题文字、轮播指示器
  - 预览弹窗支持关闭
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `human-judgement` TR-5.1: 预览弹窗布局美观
  - `programmatic` TR-5.2: 点击关闭按钮能正常关闭
- **Completed**: Modal 预览弹窗，手机边框样式，含状态栏/Banner/指示器/内容区

## [x] Task 6: 实现拖拽排序
- **Priority**: medium
- **Depends On**: Task 3
- **Description**: 
  - 为列表行添加拖拽手柄（≡）
  - 实现前端拖拽交互（视觉反馈：背景色变化、插入线）
  - 拖拽释放后调用排序接口保存新顺序
  - 使用 antd 的 dnd-kit 或原生 HTML5 拖拽 API
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgement` TR-6.1: 拖拽交互流畅
  - `programmatic` TR-6.2: 排序保存功能正常
- **Completed**: 原生 HTML5 拖拽 API 实现，含拖拽手柄、视觉反馈（蓝色插入线）、批量排序保存

## [x] Task 7: 验证与测试
- **Priority**: high
- **Depends On**: Task 1-6
- **Description**: 
  - 启动前后端服务
  - 访问 Banner 管理页面验证所有功能
  - 运行 TypeScript 类型检查
  - 修复发现的问题
- **Acceptance Criteria Addressed**: AC-1 至 AC-8
- **Test Requirements**:
  - `programmatic` TR-7.1: TypeScript 类型检查通过
  - `human-judgement` TR-7.2: 页面整体效果美观
  - `programmatic` TR-7.3: 所有交互功能正常
- **Completed**: TypeScript 编译零错误，页面截图验证通过，35 项检查点全部通过
