# 新增铸造申请页面重构 - Product Requirement Document

## Overview
- **Summary**: 重构 NFT 资产管理模块中"新增铸造申请"页面，移除技术概念暴露（元数据 JSON、图片 URL），改为业务化流程：选择基因档案 → 填写资产信息 → 本地上传图片 → 预览确认。新增左表单右预览布局、搜索选择器、ImageUploader 本地上传、自动生成元数据、自定义键值对属性、描述模板等功能。
- **Purpose**: 让不懂技术的公棚运营人员（核心用户）像发朋友圈一样轻松完成 NFT 铸造，消除 JSON/URL 等技术障碍，降低错误提交率和培训成本。
- **Target Users**: 公棚运营人员（非技术背景）、后台管理员

## Goals
- P0: 图片上传从 URL 输入改为 ImageUploader 本地上传（点击/拖拽/粘贴），移除 URL 输入框
- P0: 移除"元数据(JSON)"文本域，改为系统自动从基因档案提取元数据
- P0: 关联基因档案从 Select 改为 SearchSelect 搜索选择器 + 卡片展示（足环号/鸽名/品系/鸽主），支持模糊搜索
- P1: 实现左表单+右预览的响应式布局，右侧实时展示 NFT 预览卡片
- P1: 选择基因档案后自动联动回填资产名称（鸽名）、持有者（鸽主）、预览品系/赛绩
- P1: 提供资产描述模板生成器（【生成描述】按钮），支持 200 字内字数统计
- P1: 新增自定义属性（键值对列表），可视化增删，自动合并到 metadata
- P2: 响应式适配三种分辨率（2560×1440 / 1920×1200 / 1920×1080）
- P2: 选择基因档案后自动带入该鸽已有照片（photo_url）作为默认资产图片，可替换

## Non-Goals (Out of Scope)
- 不涉及上链流程、链上状态、合约调用等后端逻辑修改
- 不涉及流转记录、审核模块的改动
- 不修改 NFT 资产列表页 ProTable 的列结构和查询功能
- 不实现 NFT 图片自动裁剪（1:1）功能，MVP 阶段保留原始比例
- 不实现多图上传（3-5 张），MVP 阶段仅保留单张主图，与现有字段对齐
- 不新增 mock 数据接口，现有接口能力足够支撑（searchGeneProfiles、getGeneProfiles 等已存在）

## Background & Context
现有代码结构：
- `pages/nft/List.tsx` 包含 NFT 资产列表 ProTable + DrawerForm 新增/编辑（第 410-458 行）
- `components/ImageUploader.tsx` 已实现点击/拖拽/粘贴上传、自动压缩（基因表单共用组件）
- `components/SearchSelect.tsx` 已实现远程搜索+防抖选择器（基因表单共用组件）
- `services/nft.ts` 的 `NftAssetCreateParams` 支持 `image_url`（base64 string）和 `metadata`（Record<string, unknown>），现有接口无需修改
- `services/gene.ts` 的 `searchGeneProfiles` 和 `GeneProfileOption` 已提供基因档案搜索能力，选择后可通过 `getGeneProfiles(id)` 获取详细信息（品系/羽色/眼砂/基因序列/照片等）供自动填充和元数据生成使用

抽屉宽度从 560px 改为 1100px（与 GeneForm 一致，≥1920 屏）/720px（<1920 屏）。

## Functional Requirements
### FR-1: 关联基因档案搜索选择器
- 使用 `SearchSelect` 组件替换现有 `ProFormSelect`
- `onSearch` 调用 `searchGeneProfiles`（支持足环号/鸽名模糊搜索）
- `optionLabel` 显示卡片：足环号 + 鸽名 + 品系（若有）+ 鸽主
- 选择后回调：根据基因档案 ID 调用详情接口，获取 name/owner_name/breed/color/eye_color/gender/photo_url/achievement 等字段

### FR-2: ImageUploader 本地上传替换 URL 输入
- 移除 `ProFormText name="image_url"`，改用 `ImageUploader` 组件
- 上传后图片压缩结果（dataURL）存入 `image_url` 字段，与现有服务层接口兼容
- 若选择基因档案时已有 photo_url，自动填入预览，允许操作员点击替换

### FR-3: 元数据自动生成 + 自定义属性
- 移除 `ProFormTextArea name="metadata_obj"`（JSON 文本域）
- 提交时系统自动组装 metadata：合并"基因档案自动提取字段"+"用户自定义键值对"
- 自动提取字段：name、ring_number、breed、gender、color、eye_color、owner、image_url（占位，上链后替换）、achievement（若有）
- 自定义属性：键值对表格，三列（属性名/属性值/删除操作），支持【+ 添加属性】按钮；初始默认显示 3 行（眼砂/羽色/性别，自动提取）

### FR-4: 资产名称自动回填 + 描述模板生成
- 选择基因档案后 `name` 字段默认填充为鸽名，允许修改
- 资产描述区新增【生成描述】按钮 + 字数统计 `(当前x/200)`
- 模板：`{鸽名}，{品系}品系。血统纯正，遗传稳定。{若有赛绩则追加：曾获得{赛绩}。}`
- 模板生成后允许人工微调，不强制

### FR-5: 持有者(鸽主)显示逻辑
- 字段显示为只读标签：`持有者：北京赵氏铭家（来自基因档案）`
- 点击【修改】切换为可输入框；未修改时提交 `owner_name` 不填（沿用后端自动取值逻辑）

### FR-6: 左表单+右预览布局（响应式）
- **2560×1440 大屏**：左右 6:4 分栏；左侧表单 6 分组卡片（关联档案/资产信息/资产图片/高级设置），右侧预览面板（NFT 卡 + 资产属性列表）
- **1920×1200 / 1080**：Drawer 宽度 900px 改为上下结构或 7:3 分栏，预览面板固定在右侧或折叠面板
- 预览卡片内容：封面图（资产图片或默认鸽图）、资产名称、Token ID（#---- 占位）、价格（"未定价"标签）、品系、赛绩、鸽主

### FR-7: 底部操作区
- 三按钮：【取消】【保存草稿】【提交上链审核】
- 【保存草稿】对应 `handleSubmit` 原流程（status=draft）
- 【提交上链审核】= `handleSubmit` 创建草稿 + `submitNftAssetAudit()` 二次提交，需二次确认

## Non-Functional Requirements
- **NFR-1**: 选择基因档案 → 自动回填字段的响应延迟 ≤ 300ms（基于缓存）
- **NFR-2**: `npx tsc --noEmit` 零错误
- **NFR-3**: 复用 `ImageUploader.tsx` 与 `SearchSelect.tsx`，不新增重复代码
- **NFR-4**: 抽屉 `destroyOnClose` 改为 `destroyOnHidden`（遵循已修复的 AntD 弃用规则）

## Constraints
- **Technical**: React 18 + AntD 5 + ProComponents + TypeScript；Drawer 作为容器不变（避免路由切换对产品记忆的打断）
- **Business**: 现有 `/nft/assets` 创建/更新接口参数不变；提交审核流程不变
- **Dependencies**: `ImageUploader.tsx`、`SearchSelect.tsx`、`services/gene.ts`、`services/nft.ts`

## Assumptions
- 后端 `image_url` 字段可接受 dataURL（base64）作为图片值（基因档案已采用此方案，已验证可行）
- 选择基因档案后调用详情接口可返回 `photo_url`、`breed`、`achievement`（若无则为空字符串，不阻塞流程）
- 自定义属性作为 `metadata.custom_props` 嵌套字段或直接合并顶层，具体方式在任务中与服务层现有解析逻辑兼容

## Acceptance Criteria

### AC-1: 图片上传为拖拽本地上传，不再出现 URL 输入框
- **Given**: 打开"新增铸造申请"抽屉
- **When**: 操作员查看资产图片字段
- **Then**: 显示 ImageUploader（虚线框+加号+文字说明），无 `<input>` URL 输入框
- **Verification**: `human-judgment`（视觉检查）+ `programmatic`（grep 无 `image_url` ProFormText 残留）

### AC-2: "元数据(JSON)"字段完全移除
- **Given**: 打开抽屉
- **When**: 浏览所有表单字段
- **Then**: 页面上不出现"元数据"或"JSON"字样的输入控件；高级设置中显示自定义属性键值对表格
- **Verification**: `human-judgment`

### AC-3: 关联基因档案为搜索选择器且展示卡片
- **Given**: 打开抽屉
- **When**: 在"关联基因档案"输入框键入关键字
- **Then**: 下拉项显示 `足环号 鸽名（品系，鸽主）` 组合信息；选择后资产名称等字段自动更新
- **Verification**: `human-judgment`

### AC-4: 提交时 metadata 自动生成正确（无手动 JSON）
- **Given**: 选择了基因档案 + 填写资产信息
- **When**: 调用 createNftAsset / updateNftAsset
- **Then**: payload.metadata 包含基因档案 name、ring_number、breed、gender、color、eye_color、owner、自定义键值对；JSON 格式合法
- **Verification**: `programmatic`（调试打印 payload 或 mock 断言）

### AC-5: 右侧预览面板实时同步
- **Given**: 左表单填写中
- **When**: 修改资产名称、上传图片、选择基因档案
- **Then**: 右预览卡片对应位置 ≤ 300ms 内更新
- **Verification**: `human-judgment`

### AC-6: 【生成描述】功能可用
- **Given**: 已选择基因档案，品系/赛绩字段有值
- **When**: 点击【生成描述】
- **Then**: 资产描述文本域自动填入模板文案；字数计数器正确
- **Verification**: `human-judgment`

### AC-7: 保存草稿 / 提交审核 双动作
- **Given**: 表单合法
- **When**: 点击【保存草稿】
- **Then**: 仅调用 createNftAsset，status=draft
- **Given**: 表单合法
- **When**: 点击【提交上链审核】并确认
- **Then**: createNftAsset 成功后自动调用 submitNftAssetAudit，提示"已提交审核"
- **Verification**: `programmatic`（mock 接口调用计数）

### AC-8: 编译零错误
- **Verification**: `programmatic`（`npx tsc --noEmit` exit 0）

## Open Questions
- 自定义属性是合并到 metadata 顶层（推荐，与现有解析逻辑一致）还是嵌套 `metadata.custom_props`？**暂定顶层合并**，需要用户确认前先用此方案。
