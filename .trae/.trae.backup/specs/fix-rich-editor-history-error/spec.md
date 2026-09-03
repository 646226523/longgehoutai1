# 富文本编辑器历史记录报错修复 - PRD

## Overview
- **Summary**: 修复 wangEditor v5 富文本编辑器在资讯编辑场景下出现的 "Cannot find a descendant at path" 报错。当用户编辑含图片的资讯内容时，编辑器的 undo/redo 历史记录与当前文档模型不一致，导致操作路径找不到对应节点。
- **Purpose**: 消除富文本编辑器的致命错误，确保编辑器稳定运行，支持含图片的富文本内容编辑。
- **Target Users**: 后台管理员/运营人员，使用资讯管理功能编辑含图片的富文本内容。

## Goals
- 修复 wangEditor "Cannot find a descendant at path" 错误
- 确保 setHtml() 后历史记录被正确清理
- 支持含图片的富文本内容正常编辑

## Non-Goals (Out of Scope)
- 不更换富文本编辑器
- 不实现新的富文本功能
- 不改变现有 UI/UX

## Background & Context
- 错误发生在用户编辑含图片的资讯内容时
- wangEditor v5 使用 Slate.js 作为底层编辑器
- 当调用 editor.setHtml() 时，文档被替换但历史记录未被清理
- 历史记录中的操作（如 remove_node、insert_text）引用了旧文档的路径
- 当用户执行 undo/redo 或其他操作时，这些路径在新文档中不存在，导致报错

## Functional Requirements
- **FR-1**: 在调用 setHtml() 设置编辑器内容后，必须清理 undo/redo 历史记录
- **FR-2**: 编辑器初始化后用户操作不应触发路径查找错误
- **FR-3**: 含图片的富文本内容应能正常加载和编辑

## Non-Functional Requirements
- **NFR-1**: 修复后编辑器加载时间无明显增加
- **NFR-2**: 修复不应影响现有的 onChange 回调机制

## Constraints
- **Technical**: 使用 wangEditor v5 API，需调用 clearHistory() 方法
- **Dependencies**: @wangeditor/editor-for-react, @wangeditor/editor

## Assumptions
- setHtml() 方法会替换文档但不清 history
- clearHistory() 方法可安全调用在 setHtml() 之后
- 用户不需要在 setHtml() 之后撤销操作（这是新内容，没有历史）

## Acceptance Criteria

### AC-1: 编辑器初始化后无历史错误
- **Given**: 用户打开一条含图片的资讯进行编辑
- **When**: 编辑器加载完成，用户开始编辑内容
- **Then**: 控制台不出现 "Cannot find a descendant at path" 错误
- **Verification**: `programmatic`

### AC-2: 含图片内容正常编辑
- **Given**: 资讯内容包含图片
- **When**: 用户编辑文本或添加新内容
- **Then**: 编辑器正常响应，无报错
- **Verification**: `human-judgment`

### AC-3: setHtml 后历史记录已清理
- **Given**: 编辑器已初始化并设置了内容
- **When**: 检查编辑器的 undo/redo 状态
- **Then**: 历史记录为空，undo 按钮应处于禁用状态
- **Verification**: `programmatic`
