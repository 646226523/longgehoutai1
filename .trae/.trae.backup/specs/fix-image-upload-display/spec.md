# 图片上传后无法显示 BUG 修复 - 产品需求文档

## Overview
- **Summary**: 修复赛鸽基因溯源平台中图片上传后无法正常显示的 BUG。系统在基因档案表单、检测机构表单等多处使用 ImageUploader 组件上传图片，上传成功后返回的图片 URL 无法在前端正确渲染，导致 `<img>` 标签显示为空白或破损图片。
- **Purpose**: 确保管理员通过后台系统上传鸽子照片、检测机构资质等图片后，能够立即在表单预览区、详情页和列表页正确显示图片，保障核心业务流程顺畅。
- **Target Users**: 后台系统管理员、鸽子养殖场工作人员

## Goals
- 修复图片上传后 `<img>` 标签无法显示的核心 BUG
- 确保图片从上传、保存到展示的完整链路畅通
- 支持单图和多图（maxCount > 1）两种上传模式
- 修复基因档案列表页、详情页中已保存图片的显示问题

## Non-Goals (Out of Scope)
- 不修改图片压缩算法
- 不增加水印功能
- 不修改图片存储目录结构
- 不增加 CDN 加速功能

## Background & Context
- **技术架构**: 前端 React + Vite (端口 3014) → Vite Proxy → 后端 Express (端口 3015) → 静态文件服务 `/uploads/`
- **现有组件**: `ImageUploader.tsx` 组件负责图片上传，位于 `admin-web/src/components/ImageUploader.tsx`
- **后端接口**: `POST /api/upload` 接收 base64 编码图片，解码后保存到 `admin-api/uploads/` 目录，返回 `{ url: "/uploads/xxx.jpg" }`
- **代理配置**: `vite.config.js` 已配置 `/api/upload` 和 `/uploads` 的代理规则
- **Mock 插件**: `mock-plugin.js` 已修改以放行 `/api/upload` 请求（`server.middlewares.use('/api/upload', (req, res, next) => { next(); })`）并在 catch-all 中将 `/upload` 加入 skip 列表
- **已验证**: 后端 `/api/upload` 接口正常（返回 `/uploads/xxx.png`），后端 `/uploads/` 静态文件服务正常（HTTP 200），前端代理转发正常（通过 3014 端口可访问后端上传的文件）

## Functional Requirements
- **FR-1**: ImageUploader 组件上传图片后，返回的 URL 应立即在组件内预览显示
- **FR-2**: 基因档案表单提交后，`photo_url` 字段应正确保存到后端数据库
- **FR-3**: 基因档案列表页应能显示已保存的鸽子照片
- **FR-4**: 基因档案详情页（预览区）应能正确显示已保存的鸽子照片
- **FR-5**: 表单再次打开编辑时，已有的图片应正确回显
- **FR-6**: 图片 URL 应为相对路径（`/uploads/xxx.jpg`），通过前端 Vite 代理正确转发

## Non-Functional Requirements
- **NFR-1**: 图片上传后首次渲染应在 500ms 内完成显示
- **NFR-2**: 支持 JPG、PNG、WEBP 格式，单文件最大 5MB
- **NFR-3**: 图片加载失败时应有优雅降级（显示占位符）

## Constraints
- **Technical**: 必须使用现有的 Vite Proxy 架构，不可引入 CDN
- **Business**: 上传的图片 URL 必须保持为 `/uploads/xxx.jpg` 格式
- **Dependencies**: 依赖后端 Express 静态文件服务和 Vite proxy 配置

## Assumptions
- 后端 Express 服务运行在 3015 端口且正常工作
- 前端 Vite dev server 运行在 3014 端口且正常工作
- 上传的图片文件确实保存在 `admin-api/uploads/` 目录中
- 后端静态文件服务路径 `/uploads` 配置正确

## Acceptance Criteria

### AC-1: 图片上传后立即预览显示
- **Given**: 用户在基因档案表单页面，ImageUploader 组件可交互
- **When**: 用户通过点击/拖拽/粘贴方式上传一张 JPG 图片
- **Then**: 图片在 1 秒内于上传组件内成功显示，且显示"图片上传成功"提示
- **Verification**: `programmatic`
- **Notes**: 通过浏览器 DevTools 验证 `<img>` 标签的 `src` 属性为 `/uploads/xxx.jpg`

### AC-2: 表单提交后数据库正确保存图片 URL
- **Given**: 用户已通过 ImageUploader 上传图片并完成其他必填字段
- **When**: 用户点击"确定"提交表单
- **Then**: 后端数据库对应记录的 `photo_url` 字段保存为 `/uploads/xxx.jpg` 格式的 URL
- **Verification**: `programmatic`
- **Notes**: 通过 SQLite 查询验证

### AC-3: 列表页正确显示图片
- **Given**: 数据库中已存在带有 `photo_url` 的基因档案记录
- **When**: 用户打开基因档案列表页
- **Then**: 列表中的鸽子照片正确渲染显示，无破损图标
- **Verification**: `human-judgment`
- **Notes**: 视觉验证图片是否正确加载

### AC-4: 详情页/预览区正确显示图片
- **Given**: 用户在基因档案表单页面上传了图片
- **When**: 用户查看右侧实时预览区或打开详情抽屉
- **Then**: 预览区和详情页的 `<img>` 标签正确显示图片
- **Verification**: `human-judgment`

### AC-5: 编辑模式下回显已有图片
- **Given**: 用户编辑一个已有图片的基因档案
- **When**: 编辑抽屉打开
- **Then**: ImageUploader 组件正确回显已有图片，右侧预览区同步显示
- **Verification**: `programmatic`

### AC-6: 图片加载失败时优雅降级
- **Given**: 图片 URL 对应的文件已被删除或路径错误
- **When**: 浏览器加载图片失败
- **Then**: 不显示破损图标，应展示占位符或默认图像
- **Verification**: `human-judgment`

## Open Questions
- [ ] 图片是否需要额外的鉴权保护（当前为公开访问）？
- [ ] 是否需要实现图片删除功能（从服务器物理删除）？
