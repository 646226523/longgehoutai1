# 登录接口Mock服务修复 - 实施计划

## [x] Task 1: 创建Mock中间件文件
- **优先级**: high
- **依赖**: None
- **描述**: 
  - 创建 `admin-web/server/mock.ts` 文件
  - 实现 Vite 中间件函数
  - 包含登录、用户信息、Token刷新接口的 mock 处理
  - 使用 admin/admin123 作为测试账号
  - 生成模拟的 JWT token（Base64 编码）
- **验收标准关联**: AC-1, AC-2, AC-5
- **测试要求**:
  - `programmatic` TR-1.1: mock.ts 文件创建成功，导出中间件函数
  - `programmatic` TR-1.2: 中间件能正确处理 POST /api/auth/login 请求
  - `human-judgement` TR-1.3: 代码结构清晰，易于扩展

## [x] Task 2: 集成Mock到Vite配置
- **优先级**: high
- **依赖**: Task 1
- **描述**:
  - 修改 `vite.config.ts`
  - 添加中间件插件，仅在开发模式下启用
  - 保留原有的 proxy 配置作为备选
- **验收标准关联**: AC-1, AC-3
- **测试要求**:
  - `programmatic` TR-2.1: vite.config.ts 已添加 mock 中间件
  - `human-judgement` TR-2.2: 配置正确，无语法错误

## [x] Task 3: 创建Dashboard Mock数据接口
- **优先级**: high
- **依赖**: Task 1
- **描述**:
  - 在 mock.ts 中添加 Dashboard 数据接口
  - `GET /api/admin/dashboard/overview`
  - 返回与前端 mockData.ts 一致的数据结构
- **验收标准关联**: AC-4
- **测试要求**:
  - `programmatic` TR-3.1: mock.ts 包含 Dashboard overview 接口
  - `human-judgement` TR-3.2: 返回数据结构合理

## [ ] Task 4: 重新构建并重启开发服务器
- **优先级**: high
- **依赖**: Task 2, Task 3
- **描述**:
  - 运行 TypeScript 类型检查
  - 重启 Vite 开发服务器
  - 验证中间件正常工作
- **验收标准关联**: AC-1, AC-2, AC-3, AC-4, AC-5
- **测试要求**:
  - `programmatic` TR-4.1: TypeScript 编译无错误
  - `programmatic` TR-4.2: 服务器正常启动，mock 接口可访问
  - `human-judgement` TR-4.3: 登录功能测试通过

## [ ] Task 5: 浏览器验证
- **优先级**: high
- **依赖**: Task 4
- **描述**:
  - 在浏览器中测试登录流程
  - 验证 admin/admin123 登录成功
  - 验证错误密码提示
  - 验证 Dashboard 数据加载
- **验收标准关联**: AC-1, AC-2, AC-3, AC-4, AC-5
- **测试要求**:
  - `human-judgement` TR-5.1: admin/admin123 登录成功跳转到工作台
  - `human-judgement` TR-5.2: 错误密码显示"用户名或密码错误"
  - `human-judgement` TR-5.3: Dashboard 页面数据正常显示
  - `human-judgement` TR-5.4: 控制台无错误日志