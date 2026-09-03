# 修复图片上传后无法显示问题 - 实施计划

## [x] 任务1: 禁用mock插件中的上传接口拦截
- **优先级**: high
- **依赖**: 无
- **描述**:
  - 修改 `admin-web/server/mock-plugin.js`，将 `/api/upload` 的mock拦截改为直接放行（调用 `next()`）
  - 让上传请求能够通过Vite代理转发到后端真实服务
- **验收标准**: AC-1
- **测试要求**:
  - `programmatic` TR-1.1: 上传接口不再返回mock路径，而是转发到后端
  - `programmatic` TR-1.2: 请求返回的URL指向真实存在的文件

## [x] 任务2: 配置uploads静态资源路径代理
- **优先级**: high
- **依赖**: 无
- **描述**:
  - 在 `admin-web/vite.config.js` 中添加 `/uploads` 路径的代理配置
  - 将前端对 `/uploads/xxx.jpg` 的静态资源请求转发到后端服务器
  - 确保上传后的图片能够被前端正确加载显示
- **验收标准**: AC-2, AC-3
- **测试要求**:
  - `programmatic` TR-2.1: 前端访问 `/uploads/xxx.jpg` 时能正确获取到图片文件
  - `programmatic` TR-2.2: 已上传的图片在预览和列表页均能正常显示

## [x] 任务3: 端到端测试验证
- **优先级**: high
- **依赖**: 任务1, 任务2
- **描述**:
  - 重启前端服务器使配置生效
  - 通过浏览器测试完整的上传和显示流程
- **验收标准**: AC-1, AC-2, AC-3
- **测试要求**:
  - `programmatic` TR-3.1: 在基因档案表单中上传图片后能立即预览
  - `programmatic` TR-3.2: 保存档案后图片能在列表页正常显示
  - `human-judgement` TR-3.3: 图片显示清晰无变形
