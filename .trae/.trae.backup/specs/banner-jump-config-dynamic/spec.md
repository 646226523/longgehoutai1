# Banner跳转配置动态选择 - Product Requirement Document

## Overview
- **Summary**: 重构Banner编辑页面的跳转配置功能，当后台操作员选择特定的跳转类型（赛事、拍卖、NFT、基因档案）时，跳转目标字段自动变为可搜索和选择的下拉组件，加载对应的内容列表供操作员选择，而不是手动输入URL。
- **Purpose**: 提升Banner跳转配置的用户体验和数据准确性，减少输入错误，使运营人员可以方便地关联已有内容。
- **Target Users**: 后台运营人员、内容编辑人员

## Goals
- 根据跳转类型动态切换跳转目标字段的UI组件（Select下拉选择 vs Input文本输入）
- 当选择赛事/拍卖/NFT/基因类型时，自动加载对应的内容数据供选择
- 支持搜索过滤，方便在大量数据中快速定位目标
- 显示内容的关键信息（如赛事名称、状态、时间等）帮助操作员识别
- 保持编辑时的数据回显功能正常工作

## Non-Goals (Out of Scope)
- 不修改后端API接口
- 不实现跳转目标的实时预览功能
- 不添加批量选择功能
- 不修改Banner列表页的跳转链接显示方式

## Background & Context
### Current State
当前Banner编辑表单的跳转配置包含两个字段：
1. `jump_type`：跳转类型（Select下拉框）
   - 赛事详情（race）
   - 拍卖场次（auction）
   - NFT资产（nft）
   - 基因档案（gene）
   - 外部链接（external）
   - APP页面（page）
2. `jump_target`：跳转目标（Input文本输入框）
   - 操作员需要手动输入链接或ID

### Available APIs
- 赛事选项：`getCompetitionOptions()` → `CompetitionOption[]`
  - 字段：id, name, status, type, start_time, end_time
- 拍卖场次：`getAuctionSessions()` → `PageResult<AuctionSession>`
  - 字段：id, name, status, start_time, end_time, location
- NFT资产：`getNftAssets()` → `PageResult<NftAsset>`
  - 字段：id, name, owner_name, status
- 基因档案：`getGeneProfileOptions()` → `GeneProfileOption[]`
  - 字段：id, ring_number, name, owner_name

## Functional Requirements
- **FR-1**: 当用户选择跳转类型为"赛事详情"时，跳转目标字段变为可搜索的Select组件，加载赛事列表
- **FR-2**: 当用户选择跳转类型为"拍卖场次"时，跳转目标字段变为可搜索的Select组件，加载拍卖场次列表
- **FR-3**: 当用户选择跳转类型为"NFT资产"时，跳转目标字段变为可搜索的Select组件，加载NFT资产列表
- **FR-4**: 当用户选择跳转类型为"基因档案"时，跳转目标字段变为可搜索的Select组件，加载基因档案列表
- **FR-5**: 当用户选择跳转类型为"外部链接"或"APP页面"时，跳转目标字段保持为Input文本输入框
- **FR-6**: Select组件支持按名称搜索过滤
- **FR-7**: Select组件的选项显示关键信息（名称、状态、时间等）
- **FR-8**: 切换跳转类型时，自动清空已选择的跳转目标
- **FR-9**: 编辑已有Banner时，数据回显正常工作（显示已选中的选项）
- **FR-10**: 数据加载过程中显示loading状态

## Non-Functional Requirements
- **NFR-1**: 数据加载响应时间应在1秒内（本地网络环境）
- **NFR-2**: 组件切换流畅，无明显闪烁
- **NFR-3**: 代码遵循项目现有的TypeScript类型规范
- **NFR-4**: 保持与Ant Design组件库的一致性

## Constraints
- **Technical**: 使用React + TypeScript + Ant Design组件库
- **Technical**: 复用现有的API服务函数
- **Business**: 前端组件需兼容现有后端接口返回的数据结构
- **Dependencies**: 依赖competition.ts、auction.ts、nft.ts、gene.ts中的API函数

## Assumptions
- 后端API接口正常运行，能返回对应的数据列表
- 操作员在使用时知道要关联的内容类型
- 数据量适中，Select组件可以承载全部加载（赛事和基因档案有全量接口，拍卖和NFT需要分页加载）

## Acceptance Criteria

### AC-1: 动态切换组件类型
- **Given**: 后台操作员正在编辑Banner
- **When**: 操作员选择跳转类型为"赛事详情"
- **Then**: 跳转目标字段变为可搜索的Select组件，显示赛事选项列表
- **Verification**: `programmatic`

### AC-2: 赛事选项加载
- **Given**: 跳转类型为"赛事详情"
- **When**: 下拉框展开
- **Then**: 显示赛事列表，选项包含赛事名称和状态信息
- **Verification**: `programmatic`

### AC-3: 搜索过滤
- **Given**: 跳转目标Select组件已加载选项
- **When**: 用户输入关键词
- **Then**: 选项列表按关键词过滤显示匹配项
- **Verification**: `programmatic`

### AC-4: 外部链接模式
- **Given**: 跳转类型为"外部链接"
- **When**: 组件渲染
- **Then**: 跳转目标字段为Input文本输入框
- **Verification**: `programmatic`

### AC-5: 切换类型清空目标
- **Given**: 已选择了一个赛事作为跳转目标
- **When**: 用户切换跳转类型为"拍卖场次"
- **Then**: 跳转目标字段被清空，变为拍卖场次的Select组件
- **Verification**: `programmatic`

### AC-6: 编辑数据回显
- **Given**: 正在编辑一个已有Banner，其跳转类型为"赛事详情"，关联ID为5
- **When**: BannerDrawer打开
- **Then**: 跳转类型显示为"赛事详情"，跳转目标显示ID为5的赛事名称
- **Verification**: `programmatic`

### AC-7: 加载状态
- **Given**: 跳转类型刚切换
- **When**: 数据正在加载
- **Then**: Select组件显示loading状态
- **Verification**: `programmatic`

### AC-8: 所有类型支持
- **Given**: 操作员依次选择所有跳转类型
- **When**: 每次切换
- **Then**: 对应的Select组件正确加载并显示对应的数据
- **Verification**: `human-judgment`

## Open Questions
- [ ] 拍卖场次和NFT资产数据量较大时，是否需要支持分页？当前设计假设全量加载
- [ ] 是否需要显示已下架/已过期的内容供选择？（建议只显示活跃状态的内容）
