# IP地址信息布局优化 - Product Requirement Document

## Overview
- **Summary**: 优化用户详情页面中活动记录Tab的IP地址展示布局，将当前简陋的 `<Text code>` 样式升级为更专业、更实用的展示方式，包含视觉优化、交互增强和信息整合。
- **Purpose**: 当前活动记录中的IP地址展示采用 Ant Design 的 `Text code` 组件，呈现为灰色背景的代码样式，视觉上与整体设计不协调，且缺少实用功能（如复制、位置标签等）。优化后将提升管理员的查看和使用体验。
- **Target Users**: 后台管理员，需要查看用户活动记录中的IP地址信息进行安全审计和行为分析。

## Goals
- **视觉优化**: 将IP地址从代码样式升级为更清晰的标签化展示
- **交互增强**: 添加一键复制IP地址功能
- **信息整合**: 合理利用空间，考虑将IP与位置信息整合展示
- **布局优化**: 调整列宽和对齐方式，提升表格整体美观度

## Non-Goals (Out of Scope)
- 不涉及后端IP地理位置查询接口的开发
- 不涉及活动记录其他Tab内容的修改
- 不涉及用户详情页其他部分的重构

## Background & Context
- 当前页面：用户详情抽屉 → 活动记录Tab
- 当前实现：IP地址列使用 `<Text code>{ip}</Text>` 渲染，列宽110px
- 技术栈：React + TypeScript + Ant Design 5.x
- 活动记录数据结构：包含 id, time, type, typeLabel, typeColor, content, ip

## Functional Requirements
- **FR-1**: IP地址应以清晰易读的方式展示，不再使用灰色代码背景样式
- **FR-2**: 每行IP地址旁应提供复制按钮，支持一键复制IP到剪贴板
- **FR-3**: 复制成功后应有视觉反馈（如Tooltip提示"已复制"）
- **FR-4**: 列宽应适当调整以优化视觉舒适度（建议120-140px）
- **FR-5**: 鼠标悬停IP地址时应有视觉高亮效果

## Non-Functional Requirements
- **NFR-1**: 复制功能需兼容主流浏览器（Chrome、Edge、Firefox）
- **NFR-2**: 优化后的布局在 1440px 及以上分辨率下显示正常
- **NFR-3**: 代码改动应最小化，仅修改IP地址相关渲染逻辑

## Constraints
- **Technical**: 必须使用 Ant Design 5.x 组件库，与现有设计风格保持一致
- **Dependencies**: 依赖 Ant Design 的 Tooltip、Button 组件

## Assumptions
- IP地址为IPv4格式，长度在15字符以内
- 所有活动记录都有有效的IP地址数据
- 管理员有查看活动记录的权限

## Acceptance Criteria

### AC-1: IP地址视觉展示优化
- **Given**: 管理员打开用户详情抽屉的活动记录Tab
- **When**: 查看活动记录表格中的IP地址列
- **Then**: IP地址以清晰的文本样式展示，不带灰色代码背景，字体颜色与表格其他列协调
- **Verification**: `human-judgment`

### AC-2: 复制功能
- **Given**: 活动记录表格中的IP地址列
- **When**: 点击IP地址旁的复制按钮
- **Then**: IP地址被复制到剪贴板，并显示"已复制"的反馈提示
- **Verification**: `programmatic`

### AC-3: 悬停效果
- **Given**: 鼠标悬停在IP地址上
- **When**: 悬停超过0.3秒
- **Then**: IP地址显示视觉高亮效果（如颜色变深或下划线）
- **Verification**: `human-judgment`

### AC-4: 列宽和布局
- **Given**: 活动记录表格在1440px及以上分辨率显示
- **When**: 查看IP地址列
- **Then**: 列宽适当调整（120-140px），IP地址完整显示无截断，与其他列对齐整齐
- **Verification**: `human-judgment`

### AC-5: TypeScript编译
- **Given**: 代码修改完成
- **When**: 运行 tsc --noEmit 检查
- **Then**: 无类型错误
- **Verification**: `programmatic`

## Open Questions
- [ ] 是否需要添加IP地理位置查询功能？（当前不在范围内）
- [ ] 是否需要将IP地址与"操作"列合并？（建议保持独立列）
