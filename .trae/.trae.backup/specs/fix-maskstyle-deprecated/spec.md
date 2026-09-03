# 修复maskStyle弃用警告 - 产品需求文档

## Overview
- **Summary**: 修复Ant Design Modal组件中`maskStyle`属性弃用的控制台警告
- **Purpose**: Ant Design 5.x中`maskStyle`已弃用，需要使用`styles.mask`替代
- **Target Users**: 后台管理员

## Goals
- 将`maskStyle={{ zIndex: 1999 }}`替换为`styles={{ mask: { zIndex: 1999 } }}`
- 消除控制台Warning
- 保持遮罩层层级功能不变

## Non-Goals (Out of Scope)
- 不修改Modal其他属性
- 不修改其他组件

## Background & Context
- Ant Design 5.x版本中Modal组件的`maskStyle`属性已弃用
- 新API使用`styles`对象来配置各个部分的样式
- `styles.mask`用于配置遮罩层样式

## Functional Requirements
- **FR-1**: 将maskStyle属性替换为styles.mask
- **FR-2**: 保持遮罩层z-index功能不变

## Non-Functional Requirements
- **NFR-1**: 代码修改最小化
- **NFR-2**: 无控制台Warning

## Constraints
- **Technical**: 仅修改AuditList.tsx文件第846行

## Acceptance Criteria

### AC-1: maskStyle弃用警告消除
- **Given**: 用户打开认证材料预览Modal
- **When**: 检查控制台
- **Then**: 不再出现`maskStyle is deprecated`警告
- **Verification**: `programmatic`

### AC-2: 遮罩层功能正常
- **Given**: 预览Modal已显示
- **When**: 检查遮罩层层级
- **Then**: 遮罩层z-index仍为1999，正确显示在Drawer之上
- **Verification**: `programmatic`
