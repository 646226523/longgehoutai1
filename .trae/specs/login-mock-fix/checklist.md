# 登录接口Mock服务修复 - 验证清单

- [ ] 验证点 1: Mock 中间件文件 server/mock.ts 已创建
- [ ] 验证点 2: POST /api/auth/login 接口 mock 正常工作
- [ ] 验证点 3: admin / admin123 登录成功返回有效 token
- [ ] 验证点 4: 错误密码显示"用户名或密码错误"
- [ ] 验证点 5: GET /api/auth/profile 接口返回用户信息
- [ ] 验证点 6: POST /api/auth/refresh 接口返回新 token
- [ ] 验证点 7: GET /api/admin/dashboard/overview 返回 Dashboard 数据
- [ ] 验证点 8: vite.config.ts 已正确集成 mock 中间件
- [ ] 验证点 9: Token 正确存储到 localStorage
- [ ] 验证点 10: 登录成功后跳转到工作台页面
- [ ] 验证点 11: 工作台页面数据正常加载显示
- [ ] 验证点 12: 浏览器控制台无错误日志
- [ ] 验证点 13: TypeScript 编译无错误
- [ ] 验证点 14: Vite 开发服务器正常启动