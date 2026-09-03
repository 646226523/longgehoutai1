# 登录页面 P0 级 Bug 修复 - PRD

## Overview
- **Summary**: 修复登录页面的 4 个 P0 级问题：本地图片轮播、按钮布局、忘记密码功能、ERR_ABORTED 错误。
- **Purpose**: 确保登录页面使用本地图片、布局正确、忘记密码功能完整可用。

## Issues to Fix

| # | 优先级 | 问题 | 修复方案 |
|---|--------|------|---------|
| 1 | P0 | 图片无法显示 | 使用本地 `imgae/` 文件夹中的 4 张鸽子图片 |
| 2 | P0 | 登录按钮下方空白矩形超出 | 调整 ProForm 的 margin/padding |
| 3 | P0 | 忘记密码字号过小、无功能 | 字号 16px，创建独立密码修改页面 |
| 4 | P0 | net::ERR_ABORTED 错误 | 路由跳转优化 |

## Acceptance Criteria

### AC-1: 本地图片轮播
- **Given**: 登录页加载完成
- **When**: 观察左侧
- **Then**: 4 张鸽子图片正常轮播显示
- **Verification**: `human-judgment`

### AC-2: 布局正确
- **Given**: 登录页加载完成
- **When**: 观察登录按钮区域
- **Then**: 按钮下方无多余空白，整体布局紧凑
- **Verification**: `human-judgment`

### AC-3: 忘记密码功能完整
- **Given**: 用户点击"忘记密码"
- **When**: 弹出对话框
- **Then**: 两个选项清晰区分，点击后跳转到对应密码修改流程
- **Verification**: `programmatic`

### AC-4: 无控制台错误
- **Given**: 登录页加载完成
- **When**: 检查控制台
- **Then**: 无 ERR_ABORTED 错误
- **Verification**: `programmatic`

### AC-5: TypeScript 编译通过
- **Given**: 修改完成后
- **When**: 运行 `npx tsc --noEmit`
- **Then**: 返回 0 错误
- **Verification**: `programmatic`
