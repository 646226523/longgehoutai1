# 入驻审核操作台重构 - Product Requirement Document

## Overview
- **Summary**: 将"入驻审核详情页"从信息陈列板重构为审核操作台，实现证明材料缩略图预览、引导式审核面板、审核历史记录等功能，提升管理员审核效率和体验。
- **Purpose**: 当前审核详情页存在证明材料无法直观预览、审核操作缺乏引导等问题，导致管理员审核效率低、决策信心不足。
- **Target Users**: 公棚审核管理员

## Goals
- 证明材料从纯文本链接升级为缩略图预览，支持点击放大查看
- 审核操作从孤立按钮升级为引导式审核面板
- 驳回时强制填写原因
- 展示审核通过后的预期操作结果
- 增加审核历史记录

## Non-Goals (Out of Scope)
- 不修改后端接口
- 不实现批量审核功能
- 不实现文件上传功能（仅处理已有文件的预览）

## Background & Context
- **技术栈**: React + Ant Design v5 + Pro Components
- **问题文件**: `admin-web/src/pages/loft/Audit.tsx`
- **当前实现**: 
  - Drawer 宽度 600px，单栏布局
  - 场地证明只有文本链接，无法预览
  - 审核按钮在 Drawer 顶部，操作反馈不足
  - 无审核历史记录

## Functional Requirements
- **FR-1**: 证明材料区域改为缩略图卡片展示，支持点击大图预览
- **FR-2**: 采用左右分栏布局（信息区+审核区），Drawer 宽度扩展至 900px
- **FR-3**: 右侧审核面板包含：审核步骤引导、操作预期说明、历史记录
- **FR-4**: 审核通过按钮展示"将自动创建公棚档案"的预期结果
- **FR-5**: 驳回按钮强制填写驳回原因（已有逻辑，保持不变）
- **FR-6**: 审核历史记录区域展示提交申请、审核中、审核通过/驳回等时间线

## Non-Functional Requirements
- **NFR-1**: 修改后不应影响现有功能（列表、审核流程等）
- **NFR-2**: 构建无 TypeScript 错误
- **NFR-3**: UI 风格与现有系统保持一致

## Constraints
- **Technical**: 使用 Ant Design v5 组件库，不引入新依赖
- **Dependencies**: 使用后端已有的 `site_proof` 字段（URL）

## Acceptance Criteria

### AC-1: 证明材料缩略图预览
- **Given**: 管理员打开入驻申请详情
- **When**: 查看"场地证明"区域
- **Then**: 显示为卡片形式，包含文件名和缩略图预览区域
- **Verification**: `human-judgment`

### AC-2: 左右分栏布局
- **Given**: 管理员打开入驻申请详情
- **When**: 查看详情页布局
- **Then**: 采用左右分栏，左侧为申请人信息和材料预览，右侧为审核操作面板
- **Verification**: `human-judgment`

### AC-3: 引导式审核面板
- **Given**: 管理员查看审核操作面板
- **When**: 查看右侧面板
- **Then**: 包含审核步骤、操作预期、历史记录等区域
- **Verification**: `human-judgment`

### AC-4: 构建通过
- **Given**: 代码修改完成
- **When**: 运行 `npm run build`
- **Then**: 构建成功，无 TypeScript 错误
- **Verification**: `programmatic`

## Open Questions
- [ ] 当前 `site_proof` 字段存储的是 URL 还是 base64？需要确认以决定预览实现方式
