# 用户详情页头像真实化与布局优化 - PRD

## Overview
- **Summary**: 修复用户详情抽屉中头像始终显示默认图标（UserOutlined）的问题，改为读取用户真实头像数据（record.avatar），同时重新优化头像区域的布局设计，使头像展示更加突出、美观、信息密度更高。
- **Purpose**: 提升用户详情页的真实感和专业度，让管理员能直观看到用户的真实头像，而非千篇一律的默认占位图标。
- **Target Users**: 后台管理员

## Goals
- [ ] 头像组件读取 record.avatar 真实数据，有头像时显示图片，无头像时回退显示默认图标
- [ ] 重新优化头像区域布局，增大头像尺寸，增强视觉层次
- [ ] 优化头像周围信息排列，提升信息密度和美观度

## Non-Goals
- 不修改后端 API
- 不修改 UserItem 数据结构
- 不改动 Tab 内容区

## 现状分析

当前代码问题：
1. Avatar 组件硬编码 `icon={<UserOutlined />}`，未使用 `record.avatar` 数据
2. 头像尺寸 90px 偏小，周围信息排列松散
3. 头像区域视觉层次感不足，渐变背景没有很好衬托头像

## 优化方案

### 头像真实化
- 当 `record.avatar` 有值时，使用 `<Avatar src={record.avatar}>` 显示真实头像
- 当 `record.avatar` 为空时，回退显示用户名首字或 UserOutlined 图标
- 添加加载失败的 fallback 处理

### 布局重新设计
- 增大头像尺寸至 110-120px
- 头像外圈添加装饰性渐变光环
- 头像区域垂直排列：头像 → 等级徽章 → 认证状态
- 右侧信息区优化：姓名+状态+数据卡片紧凑排列
- 添加装饰性光晕和阴影效果

## Acceptance Criteria

### AC-1: 头像真实显示
- **Given**: 用户有 avatar 数据
- **When**: 打开用户详情抽屉
- **Then**: 显示用户真实头像图片，而非默认图标
- **Verification**: `programmatic`

### AC-2: 无头像 fallback
- **Given**: 用户 avatar 为空
- **When**: 打开用户详情抽屉
- **Then**: 显示默认图标或用户名首字作为 fallback
- **Verification**: `programmatic`

### AC-3: 布局视觉优化
- **Given**: 用户详情抽屉
- **When**: 查看头像区域
- **Then**: 头像尺寸更大、布局更紧凑、视觉层次更丰富
- **Verification**: `human-judgment`

### AC-4: TypeScript 编译通过
- **Given**: 修改后的代码
- **When**: 执行 tsc --noEmit
- **Then**: 无编译错误
- **Verification**: `programmatic`
