# 登录页面 Bug 修复 - PRD

## Overview
- **Summary**: 修复登录页面的 4 个报错和 6 个 UI/UX 问题：图片加载失败、轮播速度、分割线、按钮阴影、缺少忘记密码功能。
- **Purpose**: 确保登录页面视觉完美、功能完整、无控制台错误。

## Issues to Fix

| # | 问题 | 根因 | 修复方案 |
|---|------|------|---------|
| 1 | 登录按钮点击后 `/api/auth/login` 返回 500/ERR_ABORTED | 后端登录链路或前端请求路径/错误处理异常 | 排查登录请求路径、后端登录接口和前端请求拦截，保证错误可见且不再出现中断式报错 |
| 2 | 登录页远程图片加载异常 | 外部图片资源被浏览器策略阻止或网络不可达 | 使用本地可渲染的视觉方案替代外部图片 |
| 3 | `[antd: Spin] tip` 警告 | RequireAuth 中 Spin tip 用法不当 | 移除 tip 属性或改用嵌套模式 |
| 4 | 轮播图片区展示异常 | 同 #2，图片全部加载失败 | 用 CSS 渐变背景 + 内联 SVG 插画替代 |
| 5 | 中间分割线太明显 | 渐变 overlay 不够柔和 | 增加渐变宽度至 300px，使用更柔和过渡 |
| 6 | 登录按钮下方多余阴影 | CSS box-shadow | 移除 button 的 box-shadow |
| 7 | 缺少忘记密码功能 | 未实现 | 添加忘记密码入口 + 两个选项对话框 |

## Acceptance Criteria

### AC-1: 图片正常显示
- **Given**: 登录页加载完成
- **When**: 观察左侧图片区域
- **Then**: 4 张图片正常轮播显示
- **Verification**: `human-judgment`

### AC-2: 无控制台错误
- **Given**: 登录页加载完成
- **When**: 检查控制台
- **Then**: 无 Spin tip 警告、无 ORB 错误
- **Verification**: `programmatic`

### AC-3: 忘记密码功能正常
- **Given**: 用户点击"忘记密码"
- **When**: 弹出对话框
- **Then**: 显示两个选项（记得密码 / 完全不记得密码），点击后跳转到对应页面
- **Verification**: `programmatic`

### AC-4: TypeScript 编译通过
- **Given**: 修改完成后
- **When**: 运行 `npx tsc --noEmit`
- **Then**: 返回 0 错误
- **Verification**: `programmatic`
