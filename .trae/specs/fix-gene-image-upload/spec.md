# 基因档案图片上传功能修复 - Product Requirement Document

## Overview
- **Summary**: 修复基因档案"新增/编辑"表单中图片上传功能。当前 `ImageUploader` 组件仅在前端将图片压缩为 base64 Data URL，未调用后端上传接口；同时后端缺少 `/upload` 文件上传路由，导致图片无法正常存储和显示。本次修复需实现完整的文件上传链路：前端压缩 → 后端接收 → 保存到磁盘 → 返回可访问 URL。
- **Purpose**: 恢复基因档案照片上传功能，确保图片可正常上传、存储、显示。
- **Target Users**: 系统管理员、基因档案管理人员

## Goals
- 实现后端 `/api/upload` 文件上传接口，接收图片文件并保存到服务器静态目录
- 修改前端 `ImageUploader` 组件，压缩后调用后端上传接口获取 URL
- 确保图片在基因档案列表、详情页中可正常显示
- 构建验证通过

## Non-Goals (Out of Scope)
- 不实现图片云存储（当前阶段使用本地磁盘存储）
- 不实现图片 CDN 分发
- 不实现图片水印或 EXIF 信息保留

## Background & Context
- 技术栈：React + Ant Design v5 前端，Express + Multer 后端
- 前端已有 `ImageUploader` 组件实现图片压缩（Canvas 压缩 + base64）
- `services/gene.ts` 中已定义 `uploadImage` 函数（POST `/upload`），但后端路由未实现
- 后端项目使用 Express 框架，数据库为 SQLite
- 项目已有 `express.static` 或类似静态文件服务配置

## Functional Requirements
- **FR-1**: 后端新增 `POST /api/upload` 接口，接收 multipart/form-data 文件上传
- **FR-2**: 接口校验文件类型（JPG、PNG、WEBP）和大小（≤5MB）
- **FR-3**: 上传文件保存到服务器指定目录（如 `uploads/`），生成唯一文件名
- **FR-4**: 返回可前端访问的 URL（如 `/uploads/xxx.jpg`）
- **FR-5**: 前端 `ImageUploader` 组件在压缩完成后调用上传接口，获取并传递服务器 URL
- **FR-6**: 确保后端静态文件服务正确配置，可通过 URL 访问上传的图片

## Non-Functional Requirements
- **NFR-1**: 单文件上传大小限制 5MB
- **NFR-2**: 上传接口响应时间 < 2s（对于 5MB 压缩后图片）
- **NFR-3**: `npm run build` 构建通过
- **NFR-4**: 文件名使用时间戳 + 随机字符串，避免冲突

## Constraints
- **Technical**: 后端需使用 Multer 处理 multipart/form-data，需在 Express 静态目录中暴露上传文件
- **Business**: 图片存储为本地磁盘文件，非云存储
- **Dependencies**: 依赖 `multer` 库（需检查是否已安装）

## Assumptions
- 服务器磁盘空间充足
- 上传目录 `uploads/` 在后端项目根目录下
- 前端通过 `/uploads/xxx.jpg` 路径直接访问上传的图片
- 管理员对图片精度要求不高（压缩后质量 75% 可接受）

## Acceptance Criteria

### AC-1: 后端上传接口正常工作
- **Given**: 后端服务正常运行
- **When**: 发送 POST `/api/upload` 请求（multipart/form-data，字段名 `file`）
- **Then**: 返回 200 状态码，响应体包含 `url` 字段，指向可访问的图片路径
- **Verification**: `programmatic`

### AC-2: 图片文件正确保存到服务器
- **Given**: 上传接口调用成功
- **When**: 检查服务器文件系统
- **Then**: 文件保存在指定目录，使用唯一命名，可通过 URL 访问
- **Verification**: `programmatic`

### AC-3: 前端 ImageUploader 调用后端上传
- **Given**: 基因档案新增/编辑弹窗已打开
- **When**: 用户选择图片文件
- **Then**: 图片压缩后自动上传到服务器，预览显示服务器 URL 而非 base64
- **Verification**: `human-judgment`

### AC-4: 图片在列表/详情页正常显示
- **Given**: 已保存带照片的基因档案
- **When**: 在列表页或详情页查看
- **Then**: 照片可正常显示，无破碎图片
- **Verification**: `human-judgment`

### AC-5: 构建验证通过
- **Given**: 代码修改完成
- **When**: 执行 `npm run build`（前端 + 后端）
- **Then**: 构建成功，无编译错误
- **Verification**: `programmatic`

## Open Questions
- [ ] 上传目录的具体路径和清理策略（当前假设手动维护）
- [ ] 是否需要实现图片删除功能（当前仅关注上传）