# 基因档案新增页面"添加图片"功能修复 - Product Requirement Document

## Overview
- **Summary**: 修复基因档案"新增/编辑"表单中无法添加图片的问题。当前 `ImageUploader` 组件存在潜在缺陷：错误处理逻辑不正确、错误信息不清晰、上传成功后 URL 回写不一致。本次修复将完整梳理上传链路，确保用户可以顺利选择、压缩、上传、预览、保存鸽子照片。
- **Purpose**: 让管理员在新增/编辑基因档案页面可一键上传鸽子照片，并正确存储到服务器、显示在预览区和详情页。
- **Target Users**: 系统管理员、基因档案管理人员

## Goals
- 用户点击"点击/拖拽/粘贴 上传"区域后可以弹出文件选择对话框
- 选择图片后立即显示压缩后的预览
- 图片压缩 → 上传 → 获取服务器 URL → 替换预览 → 调用 onChange 成功回写
- 上传失败时给出清晰提示并允许重新选择
- 保存后图片 URL 存入数据库，在基因档案详情页可正常显示

## Non-Goals (Out of Scope)
- 不实现图片云存储（本地磁盘存储）
- 不实现图片 CDN 分发
- 不实现图片水印或 EXIF 信息保留
- 不涉及多图上传扩展

## Background & Context
- `ImageUploader` 组件位于 `admin-web/src/components/ImageUploader.tsx`
- `GeneForm.tsx` 第 487-491 行使用 `<ImageUploader value={formValues.photo_url} onChange={(url) => updateField('photo_url', url)} />`
- 后端 `upload.ts` 路由已实现 `POST /api/upload` 接收 base64 图片
- 后端 `index.ts` 已注册 `/uploads` 静态文件服务
- Vite dev proxy 已配置 `/api` 代理到后端，但未显式配置 `/uploads` 代理

## Functional Requirements
- **FR-1**: 前端图片选择后立即显示本地压缩预览，提示"正在压缩图片..."
- **FR-2**: 压缩完成后调用 `POST /api/upload`，请求体 `{ data: dataUrl }`
- **FR-3**: 上传成功后将预览图替换为服务器返回的 URL (`/uploads/xxx.jpg`)
- **FR-4**: 上传失败时清除预览、提示错误、允许重新选择
- **FR-5**: 预览图显示使用 `<img src={url}>` 正确渲染
- **FR-6**: onChange 回传服务器 URL（非 base64），持久化到数据库

## Non-Functional Requirements
- **NFR-1**: 压缩后单文件最大 2MB，超过阈值使用 0.75 质量压缩
- **NFR-2**: 上传接口响应时间 < 2s
- **NFR-3**: 支持 JPG/PNG/WEBP 格式，≤ 5MB 原图
- **NFR-4**: `npm run build` 构建通过

## Constraints
- 后端基于 Express + SQLite
- 前端基于 React + Ant Design v5
- 图片存储使用本地磁盘 `admin-api/uploads/`

## Assumptions
- 后端服务正常运行在 3015 端口
- `uploads/` 目录可写
- 前端通过 Vite 代理 `/api` 与后端通信

## Acceptance Criteria

### AC-1: 点击上传区域可弹出文件选择
- **Given**: 用户在"新增基因档案"抽屉中
- **When**: 点击"点击/拖拽/粘贴 上传"区域
- **Then**: 浏览器弹出文件选择对话框
- **Verification**: `human-judgment`

### AC-2: 选择图片后显示压缩预览
- **Given**: 用户选择了合法的 JPG/PNG/WEBP 图片
- **When**: 文件被读取并压缩
- **Then**: 组件立即显示压缩后的预览缩略图，同时显示"正在上传..."loading
- **Verification**: `human-judgment`

### AC-3: 上传成功回写 URL
- **Given**: 后端 `/api/upload` 接口正常
- **When**: 上传请求成功返回 `{ url: '/uploads/xxx.jpg' }`
- **Then**: ImageUploader 的 onChange 被调用，传入服务器 URL；预览图用服务器 URL 重新渲染
- **Verification**: `programmatic`

### AC-4: 保存后数据库持久化
- **Given**: 用户点击"确定"保存档案
- **When**: 后端处理 `POST /api/gene/profiles`
- **Then**: `photo_url` 字段保存为服务器 URL；查询返回相同值
- **Verification**: `programmatic`

### AC-5: 详情页可显示照片
- **Given**: 数据库中某档案的 `photo_url` 为有效路径
- **When**: 访问基因档案详情页
- **Then**: `<img src={photo_url}>` 正常渲染图片
- **Verification**: `human-judgment`

### AC-6: 上传失败有清晰提示
- **Given**: 网络异常或后端返回错误
- **When**: 上传请求失败
- **Then**: 显示错误 toast、清除失败的预览、允许重新选择
- **Verification**: `human-judgment`

### AC-7: 构建验证通过
- **Given**: 代码修改完成
- **When**: 执行 `npm run build`（前端 + 后端）
- **Then**: 构建成功，无编译错误
- **Verification**: `programmatic`

## Open Questions
- [ ] 是否需要在前端 vite proxy 增加 `/uploads` 代理以支持本地开发预览？
- [ ] 是否需要在后端上传接口增加 CSRF 或认证保护？
