# 登录页面现代化重构 - PRD

## Overview
- **Summary**: 将当前居中卡片式登录页重构为现代左右分屏布局。左侧为鸽子主题海报轮播区域（带从右到左的渐变遮罩），右侧为整洁的登录表单。
- **Purpose**: 提升品牌形象，使登录页符合 2024-2025 年主流现代后台系统的设计趋势（如 Vercel、Linear、Stripe 的分屏登录设计）。
- **Target Users**: 后台管理员

## Goals
- 左右分屏布局：左侧图片展示 + 右侧登录表单
- 左侧鸽子海报轮播（3-4 张图片自动切换）
- 从右到左的渐变融合效果
- 玻璃拟态（Glassmorphism）设计风格
- 移动端响应式适配

## Non-Goals
- 不修改登录逻辑（API 调用、Token 处理）
- 不修改后端接口

## Functional Requirements
- **FR-1**: 左侧展示鸽子主题图片轮播，3-4 张图片自动轮播切换，带 CSS 过渡动画
- **FR-2**: 右侧为登录表单区域，包含用户名、密码、登录按钮
- **FR-3**: 左右之间有从右到左的渐变遮罩，实现平滑过渡
- **FR-4**: 移动端（<768px）隐藏左侧图片区域，仅显示表单

## Non-Functional Requirements
- **NFR-1**: 图片加载失败时应有优雅降级（纯色占位）
- **NFR-2**: 页面首屏加载时间 < 2s
- **NFR-3**: 保持现有登录功能完整可用

## Constraints
- **Technical**: 必须使用已有的 Ant Design 5.x 组件
- **图片资源**: 使用在线图片 URL（Unsplash），后续可替换为本地鸽子图片

## Acceptance Criteria

### AC-1: 分屏布局
- **Given**: 用户访问登录页
- **When**: 页面在桌面端（≥1024px）渲染
- **Then**: 左侧 50-55% 为图片轮播区域，右侧 45-50% 为登录表单区域
- **Verification**: `human-judgment`

### AC-2: 图片轮播
- **Given**: 登录页已加载
- **When**: 用户观察左侧图片区域
- **Then**: 每 4-5 秒自动切换到下一张图片，带平滑过渡动画
- **Verification**: `human-judgment`

### AC-3: 渐变融合
- **Given**: 登录页已加载
- **When**: 用户观察左右交界处
- **Then**: 右侧表单区域向左有渐变过渡到图片区域
- **Verification**: `human-judgment`

### AC-4: 登录功能正常
- **Given**: 用户输入正确的账号密码
- **When**: 点击登录按钮
- **Then**: 成功跳转到首页
- **Verification**: `programmatic`

### AC-5: TypeScript 编译通过
- **Given**: 修改完成后
- **When**: 运行 `npx tsc --noEmit`
- **Then**: 返回 0 错误
- **Verification**: `programmatic`
