# Banner 编辑数据回显修复 - Product Requirement Document

## Overview
- **Summary**: 修复Banner管理页面中编辑功能的数据回显问题。当点击Banner列表中的"编辑"按钮时，右侧抽屉编辑器必须正确显示该Banner的所有已有数据，包括标题、封面图片、投放位置、排序权重、跳转类型、跳转目标、开始时间和结束时间等字段。
- **Purpose**: 当前编辑Banner时表单数据未能正确回显，导致后台工作人员无法看到原始数据进行修改，严重影响运营效率。
- **Target Users**: 后台运营人员，负责Banner内容的日常管理和更新。

## Goals
- **G1**: 修复Banner编辑时所有表单字段的数据回显问题
- **G2**: 确保ImageUploader组件能正确显示已有图片
- **G3**: 确保新建Banner功能不受影响
- **G4**: 确保日期字段（开始时间、结束时间）正确回显
- **G5**: 确保跳转配置字段（jump_type、jump_target）正确回显

## Non-Goals (Out of Scope)
- Banner新建功能的重新设计
- Banner列表展示的修改
- 后端API的修改（数据结构已正确返回）
- 拖拽排序功能的修改

## Background & Context
- 当前Banner管理页面采用"统计看板 + 筛选/操作栏 + 列表 + 侧边抽屉编辑"模式
- 编辑功能通过BannerDrawer组件实现，使用Ant Design的Form组件管理表单状态
- ImageUploader是自定义图片上传组件，使用valuePropName="value"与Form集成
- 后端API `/api/content/banners/:id` 已正确返回所有字段数据
- 主要问题：useEffect中resetFields和setFieldsValue的时序问题，以及ImageUploader组件的状态管理问题

## Functional Requirements
- **FR-1**: 点击编辑按钮时，标题字段必须显示Banner的原始标题
- **FR-2**: 点击编辑按钮时，封面图片必须在ImageUploader中正确显示预览
- **FR-3**: 点击编辑按钮时，投放位置下拉框必须选中Banner的原始位置
- **FR-4**: 点击编辑按钮时，排序权重必须显示Banner的原始排序值
- **FR-5**: 点击编辑按钮时，跳转类型下拉框必须选中Banner的原始跳转类型
- **FR-6**: 点击编辑按钮时，跳转目标必须显示Banner的原始跳转目标URL
- **FR-7**: 点击编辑按钮时，开始时间和结束时间必须正确回显为日期选择器值
- **FR-8**: 新建Banner时，表单必须显示正确的默认值（位置为首页顶部，排序为0）

## Non-Functional Requirements
- **NFR-1**: 编辑功能打开后，所有字段的回显时间应在500ms以内
- **NFR-2**: 回显功能不得影响新建功能的正常使用
- **NFR-3**: TypeScript类型检查必须通过
- **NFR-4**: 不得引入新的控制台错误或警告

## Constraints
- **Technical**: 
  - 必须使用Ant Design的Form组件和useForm hook
  - ImageUploader组件使用valuePropName="value"与Form集成
  - 项目使用React + TypeScript + Vite技术栈
- **Business**: 后台工作人员需要快速编辑Banner，减少操作成本
- **Dependencies**: 
  - dayjs库用于日期处理
  - Ant Design v5组件库

## Assumptions
- 后端API返回的Banner数据结构正确，包含所有必要字段
- 数据库中已有Banner数据可供编辑测试
- ImageUploader组件的onChange回调正常工作

## Acceptance Criteria

### AC-1: 标题字段回显
- **Given**: 存在一个标题为"春季赛推广"的Banner
- **When**: 点击该Banner的编辑按钮
- **Then**: 表单中的"Banner名称"输入框显示"春季赛推广"
- **Verification**: `programmatic`

### AC-2: 封面图片回显
- **Given**: 存在一个已上传封面图片的Banner
- **When**: 点击该Banner的编辑按钮
- **Then**: ImageUploader组件显示该图片的预览缩略图
- **Verification**: `programmatic`

### AC-3: 投放位置回显
- **Given**: 一个Banner的投放位置为"home_mid"（首页中部）
- **When**: 点击该Banner的编辑按钮
- **Then**: 投放位置下拉框显示"首页中部"选项被选中
- **Verification**: `programmatic`

### AC-4: 排序权重回显
- **Given**: 一个Banner的排序权重为5
- **When**: 点击该Banner的编辑按钮
- **Then**: 排序权重输入框显示数字5
- **Verification**: `programmatic`

### AC-5: 跳转类型回显
- **Given**: 一个Banner的跳转类型为"race"（赛事详情）
- **When**: 点击该Banner的编辑按钮
- **Then**: 跳转类型下拉框显示"赛事详情"被选中
- **Verification**: `programmatic`

### AC-6: 跳转目标回显
- **Given**: 一个Banner的跳转目标为"/race/detail/R2026001"
- **When**: 点击该Banner的编辑按钮
- **Then**: 跳转目标输入框显示"/race/detail/R2026001"
- **Verification**: `programmatic`

### AC-7: 日期字段回显
- **Given**: 一个Banner的开始时间为1725024000000（2024-08-31），结束时间为1727702399000（2024-09-30）
- **When**: 点击该Banner的编辑按钮
- **Then**: 开始时间显示为2024-08-31 00:00，结束时间显示为2024-09-30 23:59
- **Verification**: `programmatic`

### AC-8: 新建功能正常
- **Given**: 点击新建Banner按钮
- **When**: 抽屉打开
- **Then**: 显示空表单，投放位置默认为"首页顶部"，排序权重默认为0
- **Verification**: `programmatic`

### AC-9: 保存更新功能正常
- **Given**: 已打开一个Banner的编辑抽屉，修改了部分字段
- **When**: 点击"保存"按钮
- **Then**: 修改成功提示，列表刷新显示最新数据
- **Verification**: `programmatic`

## Open Questions
- [ ] 是否需要处理ImageUploader在编辑模式下的特殊逻辑（如直接显示URL而非重新上传）？
- [ ] 当数据库中jump_type为空字符串时，是否应该显示为"外部链接"或保持空值？
