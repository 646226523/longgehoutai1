# 登录接口Mock服务修复 - 产品需求文档

## 概述
- **摘要**: 由于后端服务未启动或不存在，导致登录请求 `/api/auth/login` 超时和中止。需要在前端实现 mock 服务，模拟登录接口返回，使系统可以独立运行。
- **目的**: 解决登录功能不可用的问题，允许用户使用 admin/admin123 登录测试系统功能。
- **目标用户**: 开发人员、测试人员

## 目标
- 实现前端 mock 登录服务
- 支持 admin / admin123 账号登录
- 返回合理的 token 和用户信息
- 支持其他基础 API mock（获取用户信息等）

## 非目标
- 不创建完整的后端服务
- 不实现真实的认证逻辑
- 不解决生产环境的部署问题

## 背景与上下文
当前问题：
1. 错误1: `timeout of 15000ms exceeded` - 请求超时
2. 错误2: `net::ERR_ABORTED http://localhost:3014/api/auth/login` - 请求被中止
3. Vite 配置代理 `/api` -> `http://localhost:3015`，但后端 3015 端口没有服务运行
4. 项目中没有后端代码

技术方案：
- 使用 Vite 中间件实现 mock 服务
- 在 vite.config.ts 中添加自定义中间件
- 无需额外依赖

## 功能需求

- **FR-1**: Mock 登录接口
  - `POST /api/auth/login`
  - 接收 username 和 password 参数
  - 验证 admin / admin123
  - 返回 accessToken, refreshToken, expiresIn

- **FR-2**: Mock 用户信息接口
  - `GET /api/auth/profile`
  - 返回当前用户信息（id, username, nickname, roles, permissions）

- **FR-3**: Mock Token 刷新接口
  - `POST /api/auth/refresh`
  - 接收 refreshToken 参数
  - 返回新的 token 对

- **FR-4**: Mock 其他基础接口（Dashboard 数据等）
  - `GET /api/admin/dashboard/overview`
  - 返回 Dashboard mock 数据

## 非功能需求

- **NFR-1**: Mock 服务应在开发模式下自动启用
- **NFR-2**: Mock 响应时间应 < 500ms
- **NFR-3**: Mock 数据应与前端现有 mockData 保持一致

## 约束

- **技术**: Vite 中间件, Node.js
- **依赖**: 无额外 npm 包
- **兼容性**: 仅在开发模式下生效

## 假设
- 假设当前仅需支持 admin/admin123 一个账号
- 假设 Mock 服务仅用于开发测试

## 验收标准

### AC-1: 登录功能可用
- **Given**: 开发服务器已启动
- **When**: 用户输入 admin / admin123 并点击登录
- **Then**: 登录成功，跳转到工作台页面
- **验证**: `human-judgment`

### AC-2: Token 正确生成和存储
- **Given**: 登录成功
- **When**: 检查 localStorage
- **Then**: admin_access_token 和 admin_refresh_token 已存储
- **验证**: `programmatic`

### AC-3: 用户信息获取正常
- **Given**: 已登录状态
- **When**: 访问需要认证的页面
- **Then**: 通过 Token 获取用户信息成功
- **验证**: `human-judgment`

### AC-4: Dashboard 数据正常显示
- **Given**: 已登录状态
- **When**: 访问工作台页面
- **Then**: 所有 Dashboard 数据正常加载
- **验证**: `human-judgment`

### AC-5: 错误提示正确
- **Given**: 用户输入错误的密码
- **When**: 提交登录
- **Then**: 显示"用户名或密码错误"提示
- **验证**: `human-judgment`