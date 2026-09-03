# 用户头像前后端数据对接 - The Implementation Plan

## [x] Task 1: 修复内联SVG data URL生成逻辑
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 检查并修复 `admin-api/src/modules/user/db.ts` 中的 `generateAvatarDataUrl` 函数
  - 确保生成的data URL格式正确，能被浏览器和Image组件正确渲染
  - 验证内联SVG的XML语法正确性
  - 添加错误处理和编码优化
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: 生成的data URL以 "data:image/svg+xml," 开头
  - `programmatic` TR-1.2: data URL长度合理（500-2000字符）
  - `programmatic` TR-1.3: 在浏览器中直接访问data URL能显示头像
- **Notes**: 
  - 当前可能使用了encodeURIComponent导致某些特殊字符编码问题
  - 考虑使用更简单的编码方式或直接拼接SVG字符串

## [ ] Task 2: 重置数据库并重新初始化
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 删除现有数据库文件 `admin-api/data/admin.db`
  - 重启后端服务触发数据库重新初始化
  - 验证新数据库中用户avatar字段包含有效的data URL
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-2.1: 数据库成功重新创建
  - `programmatic` TR-2.2: 至少5个用户的avatar字段非空且以data:image/svg+xml开头

## [x] Task 3: 验证API接口返回avatar数据
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 启动后端服务
  - 使用curl或Postman测试用户列表接口 GET /api/user/users
  - 测试用户详情接口 GET /api/user/users/:id
  - 验证返回数据中包含有效的avatar字段
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-3.1: 用户列表接口返回的每条记录avatar字段非空
  - `programmatic` TR-3.2: 用户详情接口返回的avatar字段非空
  - `programmatic` TR-3.3: avatar字段值以 "data:image/svg+xml," 开头

## [x] Task 4: 修复前端头像渲染逻辑
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 检查并修复 `UserList.tsx` 中头像显示逻辑
  - 确保Image组件能正确渲染内联SVG data URL
  - 添加图片加载失败的onError处理
  - 确保降级逻辑正常工作（无avatar时显示首字母）
- **Acceptance Criteria Addressed**: AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-4.1: 打开用户详情抽屉时，有ant-image-img元素存在
  - `human-judgement` TR-4.2: 头部身份卡片显示用户头像图片
  - `human-judgement` TR-4.3: 头像加载失败时显示首字母降级

## [x] Task 5: 浏览器端集成测试
- **Priority**: high
- **Depends On**: Task 4
- **Description**: 
  - 启动前后端服务
  - 打开用户管理页面
  - 点击多个用户的详情按钮打开抽屉
  - 验证每个用户的头像都能正确显示
  - 测试点击头像查看大图功能
  - 检查控制台无错误
- **Acceptance Criteria Addressed**: AC-3, AC-5, AC-6
- **Test Requirements**:
  - `human-judgement` TR-5.1: 至少3个用户的头像正常显示（非首字母）
  - `human-judgement` TR-5.2: 点击头像可以查看大图
  - `programmatic` TR-5.3: 浏览器控制台无TypeError
  - `programmatic` TR-5.4: 浏览器控制台无图片加载错误
  - `human-judgement` TR-5.5: 页面刷新后头像仍然正常显示

## [x] Task 6: 修复querySelectorAll错误
- **Priority**: medium
- **Depends On**: None
- **Description**: 
  - 查找并修复 "Cannot read properties of null (reading 'querySelectorAll')" 错误
  - 检查是否有DOM操作在元素未加载时执行
  - 添加null检查和错误处理
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `programmatic` TR-6.1: 浏览器控制台无querySelectorAll相关错误
  - `human-judgement` TR-6.2: 页面交互流畅无卡顿
