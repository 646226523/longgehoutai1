# 基因档案图片上传修复 v2 - The Implementation Plan

## [x] Task 1: 诊断当前 ImageUploader 上传流程的实际 Bug
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 启动后端服务（3015 端口）
  - 使用 curl/postman 测试 `POST /api/upload` 是否正确接收 base64 并返回 URL
  - 启动前端，打开基因档案新增页面，使用浏览器 DevTools 观察上传点击链路
  - 确认上传按钮是否可点击、是否触发文件选择、是否触发压缩、是否触发上传
  - 观察 Network 面板中请求和响应，定位具体失败点
  - 产出：明确 bug 根因列表
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3
- **Test Requirements**:
  - `programmatic` TR-1.1: curl POST /api/upload 返回 200 且 body 含 url 字段 ✅ 通过
  - `human-judgement` TR-1.2: 浏览器中点击上传区域可弹出文件选择 ✅ 通过
  - `human-judgement` TR-1.3: 选择图片后 DevTools Network 显示 /api/upload 请求 ✅ 通过
- **Notes**: 诊断结论：后端接口正常，前端组件基本正常。需改进：1) 开发环境缺少 `/uploads` Vite 代理；2) ImageUploader 错误处理可优化；3) 需要更健壮的 UI 反馈

## [x] Task 2: 修复 ImageUploader 组件核心问题
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 根据诊断结果修复 `admin-web/src/components/ImageUploader.tsx`：
    1. 在 catch 分支中显示具体错误信息（`err.message`），不再只是笼统的"请重试"
    2. 保留 previewList 回滚逻辑
  - 在 `admin-web/vite.config.ts` 增加 `/uploads` 代理，确保开发环境上传图片可访问
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-6
- **Test Requirements**:
  - `human-judgement` TR-2.1: 上传成功后预览图显示服务器返回 URL ✅
  - `human-judgement` TR-2.2: 上传失败后能看到具体错误提示且可以重试 ✅
- **Notes**: 参考 `request.ts` 中响应拦截器：后端返回 `{code:0, data}`，前端 http 会自动解包为 `data`

## [x] Task 3: 增强后端 `/api/upload` 接口健壮性
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - 检查并修复 `admin-api/src/routes/upload.ts`：
    1. base64 解析增加纯 base64 兼容分支（不强制要求 data: 前缀）
    2. `Buffer.from` 用 try/catch 包裹，防止非法 base64 导致崩溃
    3. 前端通过 Vite 代理 `'/uploads'` 可以访问返回的 url
- **Acceptance Criteria Addressed**: AC-3, AC-5
- **Test Requirements**:
  - `programmatic` TR-3.1: curl POST /api/upload 返回 url 字段且格式正确 ✅
  - `programmatic` TR-3.2: 通过 `GET /uploads/xxx.jpg` 可访问图片 ✅
- **Notes**: TypeScript 类型检查通过 (`npx tsc --noEmit` exit 0)

## [ ] Task 4: 构建与端到端验证
- **Priority**: high
- **Depends On**: Task 2, Task 3
- **Description**:
  - 运行 `npm run build` 前后端构建
  - 启动完整系统，端到端验证：
    1. 打开基因档案新增页面
    2. 选择图片 → 上传 → 预览 → 保存
    3. 查看基因档案列表/详情页，照片显示正常
    4. 刷新后仍可访问图片
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7
- **Test Requirements**:
  - `programmatic` TR-4.1: `npm run build` 无报错
  - `programmatic` TR-4.2: 数据库 `gene_profiles.photo_url` 字段写入正确
  - `human-judgement` TR-4.3: 详情页照片显示正常
