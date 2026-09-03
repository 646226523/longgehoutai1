# 图片压缩比例配置 — 产品需求文档

## Overview

- **Summary**: 在系统配置 → 图片处理 Tab 中新增"图片压缩"卡片，提供原图压缩比例（90%/70%/50%/20%）供管理员选择，选中后保存到 `system_configs`，上传接口 `/api/upload` 按该配置对原图进行二次压缩。

- **Purpose**: 控制上传原图的文件体积，节省存储空间与 CDN 带宽。

- **Target Users**: 后台管理员（系统配置维护者）、内容编辑（上传图片时自动受益）。

## Goals

- G1: 图片处理 Tab 新增第 3 张卡片"图片压缩"，与已有"缩略图尺寸"、"水印设置"卡片并列

- G2: 卡片内提供 4 档压缩比例选项（90% / 70% / 50% / 20%），使用 Segmented 或 Radio.Button 组件呈现

- G3: 选中比例后点击"保存设置"按钮持久化到后端，保存成功后显示 Message 提示

- G4: 后端 upload 路由读取该配置，使用 sharp 库对原图进行 JPEG/PNG/WEBP quality 压缩后再落盘

- G5: 保留"不压缩"选项（值为 `100`）以便管理员临时关闭压缩

## Non-Goals (Out of Scope)

- 不实现压缩前/后预览对比（本轮仅配置 + 上传链路生效）

- 不对历史已上传图片做批量重压缩

- 不引入前端上传前压缩（全部放在后端 upload 路由统一处理）

- 不新增多档质量配置（仅单档全局压缩比例）

## Background & Context

- 图片处理 Tab 已有 2 张 Card：缩略图尺寸（6 个 image\_large/medium/small\_\* 配置项）+ 水印设置（3 个 image\_watermark\_\* 配置项）

- 后端 upload 路由（`admin-api/src/routes/upload.ts`）目前是 base64 → Buffer → 直接写文件，**无任何图像处理**

- 后端 package.json **尚未安装 sharp / jimp / canvas** 等图像处理库，本轮需新增 sharp（最轻量、性能最好、无 native 编译问题的主流方案）

- 七牛云已配置（cloud\_storage 组 7 项），后续可扩展为"本地上传压缩 + 直传七牛"双模式

## Functional Requirements

- **FR-1**: 后端新增配置项 `image_compress_quality`，默认值 `90`，type=select，options=\[{label:'90%（高清）',value:'90'},{label:'70%（标准）',value:'70'},{label:'50%（中等）',value:'50'},{label:'20%（低质）',value:'20'},{label:'不压缩',value:'100'}]

- **FR-2**: 前端 Config.tsx 在 FIELD\_META 注册 `image_compress_quality` 元信息（type=select）

- **FR-3**: 前端 renderImagePanel 在水印 Card 之后插入第 3 张 Card"图片压缩"，含 Segmented/Radio.Button、说明文案、保存按钮

- **FR-4**: 后端 upload 路由读取 `image_compress_quality`（默认 90），若值 < 100 则用 sharp 对 JPEG/PNG/WEBP 原图按对应 quality 压缩

- **FR-5**: 压缩失败时 fallback 为原 Buffer（不阻塞上传），并在控制台记录 warn

## Non-Functional Requirements

- **NFR-1**: 压缩处理耗时 < 300ms（1MB JPEG → 70% 质量压缩），sharp 在 Node 中轻松达标

- **NFR-2**: 前端新增 Card 与已有 Card 视觉风格一致（圆角 12px、渐变图标 + 标题 + 副标题）

- **NFR-3**: 不破坏已有图片处理配置项的渲染和保存功能

## Constraints

- **Technical**: sharp 是 native addon，Windows 需 prebuilt binary（sharp 0.33+ 官方提供 win32-x64 预编译包，npm install 即可）

- **Business**: 压缩仅作用于"原图"返回给前端的 URL，缩略图和水印不在本轮处理（当前也未实现缩略图生成）

- **Dependencies**: 依赖 `better-sqlite3` 已有 `system_config` 表、依赖 `sharp` npm 包

## Assumptions

- JPEG/WEBP 使用 quality 参数（1-100），PNG 使用 compressionLevel + palette 降色处理

- 管理员理解"质量百分比"概念，无需额外换算说明

- 上传图片 ≤ 5MB 限制已足够覆盖压缩前场景

## Acceptance Criteria

### AC-1: 图片处理 Tab 渲染三张 Card

- **Given**: 管理员已登录后台，进入系统配置 → 图片处理 Tab

- **When**: 页面加载完成

- **Then**: 依次渲染"缩略图尺寸"、"水印设置"、"图片压缩"三张 Card

- **Verification**: `human-judgment`

- **Notes**: 第三张 Card 图标用 `CompressOutlined`（ant-design/icons）

### AC-2: 压缩比例选项可切换并保存

- **Given**: 在图片压缩 Card 内

- **When**: 点击 Segmented 上的"70%"后点击"保存设置"

- **Then**: 出现"✓ 配置已更新"消息提示；刷新页面后再次进入，Segmented 仍选中"70%"

- **Verification**: `programmatic`

- **Notes**: 底层 PUT /api/system/configs/image\_compress\_quality 返回 code=0

### AC-3: 后端 seed 函数补齐配置项

- **Given**: 全新安装的数据库

- **When**: 后端启动执行 seed 函数

- **Then**: `SELECT config_key FROM system_config WHERE config_key='image_compress_quality'` 有一行，默认值 `90`

- **Verification**: `programmatic`

### AC-4: 上传接口按配置压缩

- **Given**: 数据库中 `image_compress_quality = '70'`

- **When**: POST /api/upload 上传一张 1MB 的 JPEG 图片

- **Then**: 返回的文件写入磁盘时已是 quality=70 的压缩版本，文件体积 < 原体积（通常缩小 30%-50%）

- **Verification**: `programmatic`

### AC-5: 值为 100 时不压缩

- **Given**: 数据库中 `image_compress_quality = '100'`

- **When**: POST /api/upload 上传图片

- **Then**: 文件按原 Buffer 写入，不调用 sharp

- **Verification**: `programmatic`

## Open Questions

- [ ] 是否需要支持 PNG（quality 概念不直观，PNG 无损压缩用 compressionLevel）→ 本轮统一处理：JPEG/WEBP 用 quality，PNG 按 quality 值映射 compressionLevel 1-9

