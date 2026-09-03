# 资讯内容编辑器升级 - Product Requirement Document

## Overview
- **Summary**: 将资讯管理编辑抽屉中的 `textarea` 纯文本输入框升级为所见即所得的富文本编辑器，支持标题、粗体、斜体、列表、图片、链接、表格等常用排版功能。
- **Purpose**: 让运营人员在编辑资讯正文时能够直观地进行富文本排版，而非手写 HTML 标签，降低内容生产门槛，提升内容质量和编辑效率。
- **Target Users**: 内容运营人员、赛事编辑

## Goals
- 用富文本编辑器替代当前的 `Input.TextArea`，实现所见即所得的编辑体验
- 支持常用排版功能：标题层级、加粗/斜体/下划线、有序/无序列表、图片插入、链接插入、表格
- 保留现有"编辑/预览"切换功能
- 图片支持本地上传并转换为 Base64 或 URL
- 与现有数据结构完全兼容（`content` 字段存储 HTML 字符串）

## Non-Goals (Out of Scope)
- 不实现 Markdown 编辑模式
- 不实现多人协同编辑
- 不实现代码高亮编辑
- 不添加视频嵌入功能（可后续扩展）

## Background & Context
- 当前资讯编辑使用 Ant Design 的 `Input.TextArea`，需要手写 HTML 标签
- 已存在"编辑/预览"双 Tab 切换模式
- 后端 `news.content` 字段为 TEXT 类型，存储富文本 HTML 字符串
- 项目技术栈：React 18 + Ant Design 5 + TypeScript + Vite
- 目前无任何富文本编辑器依赖

## Functional Requirements
- **FR-1**: 提供可视化富文本编辑器，支持加粗、斜体、下划线、删除线
- **FR-2**: 支持标题层级（H1-H4）和正文段落格式
- **FR-3**: 支持有序列表和无序列表
- **FR-4**: 支持插入图片（本地上传转 Base64 或远程 URL）
- **FR-5**: 支持插入超链接
- **FR-6**: 支持表格插入和编辑
- **FR-7**: 支持清除格式、撤销、重做
- **FR-8**: 保留"编辑/预览"Tab 切换功能
- **FR-9**: 编辑器内容以 HTML 格式存储，与后端接口完全兼容

## Non-Functional Requirements
- **NFR-1**: 编辑器加载时间 < 2 秒
- **NFR-2**: 编辑器组件不产生 TypeScript 类型错误
- **NFR-3**: 图片上传需复用项目现有 ImageUploader 组件或保持一致的上传体验
- **NFR-4**: 代码改动范围仅限于 News.tsx 及必要的依赖/组件新增

## Constraints
- **Technical**: 新增编辑器依赖需与 React 18、Ant Design 5 兼容
- **Dependencies**: 后端接口不需要修改
- **Scope**: 仅修改资讯管理页面的编辑器，不影响其他模块

## Assumptions
- 选择 wangEditor v5（@wangeditor/editor + @wangeditor/editor-for-react）作为富文本解决方案
- 图片通过本地上传后以 Base64 嵌入 HTML
- 运营人员具备基础排版操作能力

## Acceptance Criteria

### AC-1: 富文本编辑器替代 textarea
- **Given**: 用户打开资讯新增或编辑抽屉
- **When**: 查看正文编辑区域
- **Then**: 显示富文本编辑器界面（带工具栏），而非 textarea
- **Verification**: `human-judgment`

### AC-2: 工具栏功能完整
- **Given**: 富文本编辑器已加载
- **When**: 查看工具栏
- **Then**: 工具栏包含加粗、斜体、标题、列表、图片、链接、表格等常用按钮
- **Verification**: `human-judgment`

### AC-3: 所见即所得编辑体验
- **Given**: 用户在编辑器中输入内容
- **When**: 设置加粗、插入图片等操作
- **Then**: 编辑区立即显示格式化效果，无需手写 HTML
- **Verification**: `human-judgment`

### AC-4: 图片上传功能
- **Given**: 用户在编辑器中点击图片按钮
- **When**: 选择本地图片或输入 URL
- **Then**: 图片成功插入编辑器并显示
- **Verification**: `programmatic`

### AC-5: 预览切换正常
- **Given**: 用户已编辑内容
- **When**: 切换到"预览"Tab
- **Then**: 正确渲染富文本 HTML 内容
- **Verification**: `programmatic`

### AC-6: 数据保存兼容
- **Given**: 用户编辑完成后保存
- **When**: 提交表单
- **Then**: content 字段以 HTML 格式正确提交到后端，不丢失格式
- **Verification**: `programmatic`

### AC-7: TypeScript 编译通过
- **Given**: 代码修改完成
- **When**: 运行 `npx tsc --noEmit`
- **Then**: 编译零错误
- **Verification**: `programmatic`

## Open Questions
- 无待确认问题
