# 修复 placeholder 图片 URL 加载失败问题 - 产品需求文档

## Overview
- **Summary**: 修复后台管理系统中使用外部图片服务 `via.placeholder.com` 作为示例数据的问题，该服务在国内网络环境下无法访问，导致浏览器控制台出现 `net::ERR_CONNECTION_CLOSED` 错误。
- **Purpose**: 消除浏览器控制台报错，提升用户体验，确保内容管理模块的 Banner 和新闻封面图能正常显示。
- **Target Users**: 后台管理员

## Goals
- [Primary goal 1]: 消除控制台中 `via.placeholder.com` 相关的 3 条报错日志
- [Primary goal 2]: 确保 Banner 管理模块的示例图片能正常显示
- [Primary goal 3]: 确保资讯管理模块的封面图能正常显示

## Non-Goals (Out of Scope)
- 不修改数据库表结构
- 不影响其他模块的功能
- 不实现图片上传功能的优化

## Background & Context
- 项目使用 `via.placeholder.com` 作为 Banner 和新闻封面的示例图片 URL
- 该服务在国内网络环境下无法访问
- 项目已有使用内联 SVG data URL 生成图片的成功经验（如用户头像、认证材料图片）
- 需要对已有数据库数据进行迁移更新

## Functional Requirements
- **FR-1**: 在 `content/db.ts` 中添加生成 Banner 占位图 SVG 的函数
- **FR-2**: 在 `content/db.ts` 中添加生成 News 封面占位图 SVG 的函数
- **FR-3**: 使用新函数替换所有 `via.placeholder.com` URL
- **FR-4**: 实现数据迁移逻辑，更新已有数据库中的图片 URL

## Non-Functional Requirements
- **NFR-1**: 生成的 SVG 图片需与原始占位图视觉风格相似
- **NFR-2**: SVG 图片需使用双引号属性，确保兼容性
- **NFR-3**: 数据迁移需幂等，可重复执行不会出错

## Constraints
- **Technical**: 必须使用内联 SVG data URL，不依赖外部网络
- **Technical**: 需兼容现有 Ant Design Image 组件的渲染
- **Business**: 需考虑已有数据库数据的更新

## Assumptions
- 数据库中可能已存在旧的 `via.placeholder.com` URL 数据
- 生成的 SVG 占位图大小需要与原图一致（Banner: 750x300, News: 400x240）
- 用户接受使用风格一致的 SVG 占位图替代外部图片服务

## Acceptance Criteria

### AC-1: Banner 占位图显示正常
- **Given**: 后台管理系统已初始化
- **When**: 管理员访问内容管理/Banner 列表
- **Then**: 所有 Banner 图片能正常显示，无加载失败
- **Verification**: `programmatic`

### AC-2: News 封面图显示正常
- **Given**: 后台管理系统已初始化
- **When**: 管理员访问内容管理/资讯列表
- **Then**: 所有新闻封面图能正常显示，无加载失败
- **Verification**: `programmatic`

### AC-3: 控制台无 placeholder 报错
- **Given**: 后台管理系统正在运行
- **When**: 打开浏览器开发者工具查看控制台
- **Then**: 无 `net::ERR_CONNECTION_CLOSED` 错误指向 `via.placeholder.com`
- **Verification**: `programmatic`

### AC-4: 数据迁移幂等
- **Given**: 数据库中可能存在旧的 placeholder URL
- **When**: 后端服务重启初始化数据库
- **Then**: 自动将旧 URL 更新为新的 SVG data URL，重复执行不会出错
- **Verification**: `programmatic`

### AC-5: SVG 图片样式正确
- **Given**: Banner 和新闻列表页面
- **When**: 查看占位图显示效果
- **Then**: 图片具有合理的渐变背景和文字，宽度与高度符合设计要求
- **Verification**: `human-judgment`

## Open Questions
- [ ] 是否需要考虑清除浏览器缓存后的图片显示？（假设系统会自动处理）
