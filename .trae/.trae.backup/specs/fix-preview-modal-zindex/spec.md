# 修复认证材料预览弹窗层级问题 - 产品需求文档

## Overview
- **Summary**: 修复认证审核详情抽屉中身份证材料预览弹窗的z-index层级问题，确保预览弹窗正确显示在抽屉之上
- **Purpose**: 当前点击身份证材料预览时，Modal弹窗显示在Drawer抽屉后面被遮挡，导致用户无法正常查看预览图片
- **Target Users**: 后台管理员

## Goals
- 修复预览Modal的z-index层级，确保显示在Drawer之上
- 确保身份证材料预览功能正常工作
- 保持其他功能不受影响

## Non-Goals (Out of Scope)
- 不修改Drawer组件本身
- 不修改身份证材料的生成逻辑
- 不修改列表页的功能

## Background & Context
- Ant Design的Drawer默认z-index为1000
- Ant Design的Modal默认z-index也为1000
- 当Modal渲染在Drawer之后时，可能被Drawer遮挡
- 需要显式设置Modal的zIndex属性来确保层级正确

## Functional Requirements
- **FR-1**: 预览Modal必须设置更高的z-index（如2000），确保显示在Drawer之上
- **FR-2**: 点击身份证正面、反面、手持身份证的预览按钮时，弹窗必须显示在最顶层
- **FR-3**: 预览弹窗内的图片切换功能必须正常工作

## Non-Functional Requirements
- **NFR-1**: 代码修改最小化
- **NFR-2**: TypeScript类型检查通过

## Constraints
- **Technical**: 仅修改AuditList.tsx文件中的预览Modal配置

## Assumptions
- 设置zIndex=2000可以确保Modal显示在Drawer之上
- Ant Design的Modal组件支持zIndex属性

## Acceptance Criteria

### AC-1: 预览弹窗显示在最顶层
- **Given**: 用户打开认证审核详情抽屉
- **When**: 点击身份证材料预览
- **Then**: 预览Modal弹窗显示在Drawer之上，不被遮挡
- **Verification**: `human-judgment`

### AC-2: 预览功能正常工作
- **Given**: 预览Modal已显示在顶层
- **When**: 用户查看图片并切换
- **Then**: 图片正常显示，上一张/下一张功能正常
- **Verification**: `human-judgment`

### AC-3: TypeScript编译通过
- **Given**: 代码修改完成
- **When**: 运行TypeScript类型检查
- **Then**: 无新增类型错误
- **Verification**: `programmatic`
