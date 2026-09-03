# 检测机构资质文件上传失败修复 - 产品需求文档

## 概述
- **摘要**: 修复"新增检测机构"页面中资质文件上传功能提示"上传失败:无URL返回"的错误
- **目的**: 让管理员能够正常上传PDF/JPG/PNG格式的资质证明文件
- **目标用户**: 后台管理员

## 问题分析

### 根本原因
Mock服务器 (`mock-plugin.js`) **缺少 `/api/upload` 接口处理器**，导致上传请求落入catch-all处理器，返回 `{ code: 0, message: 'mock', data: null }`。响应拦截器将 `data` 字段解包返回 `null`，前端代码尝试访问 `null.url` 失败。

### 问题链路
```
前端发起 /api/upload 请求
  → mock-plugin.js 无 upload 处理器
  → 落入 catch-all: 返回 { code: 0, data: null }
  → 响应拦截器解包: res.data = null
  → http.post 返回 null
  → const fileUrl = (null as any)?.url → undefined
  → if (fileUrl) 为 false
  → message.error("上传失败:无URL返回")
```

### 次要问题
1. Upload 组件 `beforeUpload` 返回 `false` 阻止上传，但与手动上传逻辑冲突
2. 上传成功后文件列表状态管理不正确（手动上传结果未同步到 Upload 组件的 fileList）

## 目标
- 上传资质文件后显示成功提示并在右侧预览面板展示
- 文件列表正确显示已上传的文件
- 删除和预览功能正常工作

## 非目标
- 不实现真正的文件存储
- 不修改其他上传相关组件 (ImageUploader, gene.ts uploadImage)

## 功能需求

- **FR-1**: Mock 服务器需提供 `/api/upload` POST 接口，接收 multipart/form-data 请求，返回 `{ code: 0, message: 'success', data: { url: "/uploads/mock_xxx.ext" } }` 格式的响应
- **FR-2**: 前端 `handleFileUpload` 函数正确解析上传响应，提取 URL 并更新表单数据
- **FR-3**: Upload 组件正确显示上传后的文件列表，包含文件名和状态
- **FR-4**: 上传成功后，右侧预览面板的"资质文件"区域显示已上传的文件
- **FR-5**: 删除已上传文件功能正常工作

## 非功能需求

- **NFR-1**: TypeScript 编译零错误
- **NFR-2**: 支持 PDF、JPG、PNG 格式，单文件 ≤10MB
- **NFR-3**: 上传成功后有成功反馈，失败时有明确错误提示

## 约束
- **技术**: 基于 Ant Design Upload 组件，使用 FormData 发送请求
- **依赖**: mock-plugin.js 提供 mock API，request.ts 提供 HTTP 封装

## 验收标准

### AC-1: Mock 服务器提供上传接口
- **类型**: `rule`
- **给定**: 开发服务器运行中
- **当**: 向 `/api/upload` 发送 POST 请求（multipart/form-data）
- **则**: 返回 `{ code: 0, data: { url: "..." } }` 格式的成功响应
- **通过条件**: 响应的 data 字段包含 url 字符串且非空

### AC-2: 前端上传功能正常工作
- **类型**: `rule`
- **给定**: 在"新增检测机构"页面
- **当**: 用户选择一个 PDF/JPG/PNG 文件上传
- **则**: 显示"上传成功"提示，文件列表中显示该文件
- **通过条件**: 无错误提示，文件在列表中显示为成功状态

### AC-3: 右侧预览同步更新
- **类型**: `rule`
- **给定**: 已上传资质文件
- **当**: 查看右侧预览面板
- **则**: "资质文件"区域显示已上传的文件名
- **通过条件**: 预览面板中列出所有已上传文件

### AC-4: 上传错误正确处理
- **类型**: `rule`
- **给定**: 上传失败场景（文件过大、格式错误等）
- **当**: 触发上传失败
- **则**: 显示明确的错误提示信息
- **通过条件**: 用户能看到具体的错误原因
