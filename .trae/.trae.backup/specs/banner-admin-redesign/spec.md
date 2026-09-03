# Banner管理页面重构 - 产品需求文档

## Overview
- **Summary**: 重构 Banner 管理页面，从简陋的表单列表升级为完整的"广告位运营工作台"。核心重构为"统计看板 + 筛选/操作栏 + 列表 + 侧边抽屉编辑 + APP 预览"模式。
- **Purpose**: 当前页面布局混乱、图片上传方式落后（URL 输入）、缺乏数据统计和预览功能，无法支持高效的 Banner 内容投放运营。
- **Target Users**: 内容运营人员、平台管理员

## Goals
- [Primary goal 1]: 重构页面布局，采用统计看板 + 筛选/操作栏 + 列表 + 侧边抽屉编辑模式
- [Primary goal 2]: 实现图片本地上传（替代 URL 输入），支持拖拽上传和预览
- [Primary goal 3]: 实现 Banner 预览功能（APP 模拟器样式）
- [Primary goal 4]: 实现状态标签优化和投放时间联动
- [Primary goal 5]: 增加拖拽排序和数据统计展示
- [Primary goal 6]: 实现跳转配置（选择已有内容 / 手动输入）

## Non-Goals (Out of Scope)
- 不实现真正的后端曝光/点击数据统计（使用模拟数据或占位结构）
- 不集成完整的富文本编辑器库（使用简单 textarea 占位实现）
- 不实现真实的图片裁剪功能（使用前端自动压缩替代）
- 不实现扫码真机预览功能

## Background & Context
- 现有页面：`admin-web/src/pages/content/Banner.tsx`（355 行）使用 ProTable + ModalForm
- 现有后端：`admin-api/src/routes/content.ts` 支持基本 CRUD 和状态切换
- 现有数据库：banners 表包含 id/title/image_url/link_url/position/sort_order/status/start_time/end_time
- 已有可复用组件：`ImageUploader.tsx`（支持拖拽上传、压缩、预览）
- 已有风格参考：`News.tsx` 使用 Drawer + Form 模式，状态标签化

## Functional Requirements
- **FR-1**: 统计看板展示 5 个指标（总 Banner、已投放、待投放、已过期、总曝光）
- **FR-2**: 筛选与操作栏支持搜索、位置筛选、状态筛选、重置、查询、新建 Banner、刷新
- **FR-3**: Banner 列表展示序号、缩略图、标题、投放位置、投放时间、状态标签、曝光/点击数据、操作按钮
- **FR-4**: 操作列支持编辑、预览、下架/发布（按状态动态显示）
- **FR-5**: 新增/编辑使用右侧抽屉，分区展示基础信息、封面图片上传、跳转配置、投放规则
- **FR-6**: 图片上传支持本地上传 + 拖拽上传 + 缩略图预览
- **FR-7**: 预览弹窗展示手机模拟样式的 Banner 效果
- **FR-8**: 状态标签使用彩色标识（已投放🟢绿色、待投放🟡橙色、已过期⚪灰色、草稿🔵蓝色）
- **FR-9**: 支持拖拽排序调整 Banner 顺序
- **FR-10**: 跳转配置支持下拉选择已有内容（赛事/拍卖/NFT/基因档案）或手动输入链接

## Non-Functional Requirements
- **NFR-1**: 保持与现有系统风格一致（antd 5.x + Pro Components）
- **NFR-2**: 响应式设计适配常见桌面分辨率
- **NFR-3**: TypeScript 类型检查通过
- **NFR-4**: 图片上传使用现有 `/api/upload` 接口

## Constraints
- **Technical**: 前端使用 antd 5.17.4 + @ant-design/pro-components 2.7.19
- **Technical**: 后端 banners 表结构已确定，新增字段需迁移
- **Business**: 拖拽排序为视觉实现，可通过现有 sort_order 接口保存
- **Dependencies**: 复用 ImageUploader 组件

## Assumptions
- 后端已具备图片上传接口 `/api/upload`
- 后端已具备 Banner CRUD、状态切换、排序调整接口
- 拖拽排序可通过多次调整 sort_order 实现，无需批量拖拽 API
- 曝光/点击数据使用模拟数据展示

## Acceptance Criteria

### AC-1: 统计看板展示
- **Given**: Banner 管理页面已加载
- **When**: 查看页面顶部
- **Then**: 显示 5 个统计卡片（总 Banner、已投放、待投放、已过期、总曝光）
- **Verification**: `human-judgment`

### AC-2: 筛选与操作栏
- **Given**: Banner 管理页面已加载
- **When**: 使用搜索、筛选功能
- **Then**: 能按标题、位置、状态筛选 Banner 列表
- **Verification**: `programmatic`

### AC-3: 列表字段完整
- **Given**: Banner 管理页面已加载
- **When**: 查看 Banner 列表
- **Then**: 每行显示缩略图、标题、位置、投放时间、状态标签、曝光/点击、操作按钮
- **Verification**: `human-judgment`

### AC-4: 抽屉编辑器
- **Given**: 点击"新建 Banner"或"编辑"按钮
- **When**: 右侧抽屉打开
- **Then**: 抽屉包含基础信息、封面图片上传、跳转配置、投放规则四个分区
- **Verification**: `human-judgment`

### AC-5: 图片本地上传
- **Given**: 抽屉编辑器已打开
- **When**: 点击或拖拽上传图片
- **Then**: 图片能成功上传、显示缩略图、支持删除
- **Verification**: `programmatic`

### AC-6: 预览功能
- **Given**: 点击列表中的"预览"按钮
- **When**: 预览弹窗打开
- **Then**: 显示手机模拟样式的 Banner 效果
- **Verification**: `human-judgment`

### AC-7: 状态标签
- **Given**: Banner 列表已加载
- **When**: 查看状态列
- **Then**: 不同状态显示对应颜色的标签（已投放🟢绿色、待投放🟡橙色、已过期⚪灰色、草稿🔵蓝色）
- **Verification**: `human-judgment`

### AC-8: TypeScript 编译通过
- **Given**: 代码已修改
- **When**: 运行 `npm run type-check`
- **Then**: 无 TypeScript 错误
- **Verification**: `programmatic`

## Open Questions
- [ ] 拖拽排序是否需要后端新增批量调整接口？（假设使用现有单条调整接口即可）
- [ ] 曝光/点击数据是否需要真实统计？（当前使用 mock 数据展示）
