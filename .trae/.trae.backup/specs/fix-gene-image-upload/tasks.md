# 基因档案图片上传功能修复 - The Implementation Plan

## [x] Task 1: 后端添加文件上传接口
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 `admin-api/src/routes/` 中新增 `upload.ts` 路由文件
  - 安装 `multer` 依赖（如未安装）
  - 实现 `POST /api/upload` 接口：接收 multipart/form-data，字段名 `file`
  - 校验文件类型（image/jpeg, image/png, image/webp）和大小（≤5MB）
  - 使用 `multer.diskStorage` 保存到 `uploads/` 目录，生成唯一文件名（时间戳+随机串+扩展名）
  - 返回 `{ url: '/uploads/xxx.jpg' }` 格式的响应
  - 在 `src/index.ts` 中注册路由并配置静态文件服务 `app.use('/uploads', express.static('uploads'))`
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-1.1: POST /api/upload 返回 200 和 { url: string }
  - `programmatic` TR-1.2: 文件实际保存在 uploads/ 目录
  - `programmatic` TR-1.3: 通过返回的 URL 可以访问到图片文件
- **Notes**: 需要确保 uploads 目录存在，路由挂载在 `/api/upload`

## [x] Task 2: 前端 ImageUploader 组件改为调用后端上传
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 修改 `admin-web/src/components/ImageUploader.tsx`
  - 在 `handleFile` 方法中，压缩完成后不直接 emit base64，而是调用 `uploadImage` 接口上传
  - 上传成功后获取服务器返回的 URL，用 URL 替换 base64 作为 onChange 的值
  - 上传过程中显示 loading 状态
  - 上传失败时显示错误提示，允许重新上传
  - 预览时，如果 value 是 URL 则直接用 `<img src={url}>` 显示
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgement` TR-2.1: 选择图片后，预览显示正常
  - `programmatic` TR-2.2: onChange 回调传递的是 `/uploads/xxx.jpg` URL 而非 base64
  - `programmatic` TR-2.3: 后端 uploads/ 目录中有对应的图片文件
- **Notes**: 需要 import `uploadImage` from services/gene

## [x] Task 3: 构建验证
- **Priority**: high
- **Depends On**: Task 1, Task 2
- **Description**:
  - 执行前端 `npm run build` 和后端 TypeScript 编译
  - 确保无编译错误
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `programmatic` TR-3.1: `npm run build` 构建成功
- **Notes**: 后端可使用 `npx tsc --noEmit` 或 `tsx` 编译

## [/] Task 4: 端到端功能验证
- **Priority**: high
- **Depends On**: Task 1, Task 2
- **Description**:
  - 启动前后端服务
  - 使用 curl/postman 测试上传接口
  - 在浏览器中打开基因档案新增页面，测试图片上传、保存、显示完整流程
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-4.1: curl 调用上传接口成功返回 url
  - `human-judgement` TR-4.2: 浏览器中上传图片 → 保存 → 列表显示完整流程正常