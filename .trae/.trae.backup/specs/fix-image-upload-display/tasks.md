# 图片上传后无法显示 BUG 修复 - 实施计划

## [x] Task 1: 诊断图片 URL 数据流全链路
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 从前端上传入口追踪到后端存储，再到前端展示的完整数据流
  - 重点检查：ImageUploader 组件 onUploadComplete 回调 → formValues.photo_url → GeneForm 提交 → 后端 API 保存 → 列表 API 返回 → 列表/详情页渲染
  - 排查是否存在 URL 格式不一致、数据丢失、或渲染错误
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-1.1: 验证 ImageUploader 上传成功后 onChange 回调参数为 `/uploads/xxx.jpg` 格式 ✅
  - `programmatic` TR-1.2: 验证 GeneForm 提交时 payload.photo_url 字段非空且为正确格式 ✅
  - `programmatic` TR-1.3: 验证后端 GET /api/gene/profiles 返回的 photo_url 字段与保存时一致 ✅
  - `human-judgement` TR-1.4: 在浏览器 DevTools Network 面板中观察上传、保存、列表查询全过程 ✅
- **Root Cause Found**: 后端数据流正常，photo_url 正确保存和返回。根因是前端渲染缺失：List.tsx 没有图片列，Detail.tsx 没有照片展示区域，ImageUploader 缺少加载错误处理。

## [x] Task 2: 修复 ImageUploader 组件的预览 URL 处理
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 检查 ImageUploader 组件中图片上传完成后的 URL 处理逻辑
  - 确保上传后将后端返回的 URL 正确设置为预览图片 src
  - 处理 base64 预览到服务器 URL 的切换，确保不出现闪烁或空白
  - 添加图片加载失败的错误处理（onError 事件）
- **Acceptance Criteria Addressed**: AC-1, AC-6
- **Test Requirements**:
  - `programmatic` TR-2.1: 上传成功后，组件内 `<img>` 标签 `src` 属性值应为后端返回的 URL（以 `/uploads/` 开头） ✅
  - `programmatic` TR-2.2: 在 Chrome DevTools 中验证 `<img>` 标签能够成功加载（无 404 错误） ✅
  - `human-judgement` TR-2.3: 视觉验证图片在组件内完整显示，无空白或破损 ✅
- **Changes Made**: 新增 loadError/loadErrors 状态追踪图片加载失败，添加 onError 处理显示占位符。

## [x] Task 3: 修复基因档案列表页图片渲染
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 检查 List.tsx 中 photo_url 字段的渲染逻辑
  - 确保列表中的图片列使用正确的 URL 渲染
  - 添加图片加载失败的 fallback 占位符
  - 如 ProTable 列定义中缺少图片列，补充添加
- **Acceptance Criteria Addressed**: AC-3, AC-6
- **Test Requirements**:
  - `programmatic` TR-3.1: 基因档案列表 API 返回数据中 photo_url 字段被正确映射到列渲染 ✅
  - `human-judgement` TR-3.2: 列表页所有记录的鸽子照片均正常显示 ✅
  - `human-judgement` TR-3.3: 删除图片文件后刷新列表，显示占位符而非破损图标 ✅
- **Changes Made**: 新增 PhotoThumb 组件，在 List.tsx 序号列后插入照片列（dataIndex: photo_url, width: 100）。

## [x] Task 4: 修复基因档案表单预览区和详情页图片渲染
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 检查 GeneFormPreview.tsx 中 photo_url 的渲染逻辑
  - 检查详情抽屉/弹窗中图片的渲染
  - 确保表单状态中 photo_url 变化时预览区实时更新
  - 添加图片加载失败 fallback
- **Acceptance Criteria Addressed**: AC-4, AC-5, AC-6
- **Test Requirements**:
  - `programmatic` TR-4.1: GeneForm 中 photo_url 字段变化时 useEffect 或 useState 正确触发预览区更新 ✅
  - `human-judgement` TR-4.2: 表单填写过程中上传图片后右侧预览区实时展示 ✅
  - `human-judgement` TR-4.3: 编辑模式下已保存的图片正确回显 ✅
- **Changes Made**: GeneFormPreview 添加 imgError 状态和 onError 处理；Detail.tsx 新增鸽子照片卡片和 descriptionItems 中的照片行。

## [x] Task 5: 端到端验证测试
- **Priority**: high
- **Depends On**: Task 2, Task 3, Task 4
- **Description**:
  - 在浏览器中完成完整的"上传→保存→列表展示→详情查看"流程测试
  - 验证多个图片相关页面（基因档案、检测机构资质等）的上传功能
  - 验证图片删除和重新上传功能
  - 验证刷新页面后图片仍然正常显示
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
- **Test Requirements**:
  - `programmatic` TR-5.1: 完整流程的 Network 请求均返回 200，无 JS 错误 ✅
  - `human-judgement` TR-5.2: 所有图片展示场景均正常 ✅
  - `human-judgement` TR-5.3: 多图上传（maxCount > 1）场景正常 ✅
- **Test Result**: 8/8 步骤全部通过。上传后 img src 为 http://localhost:3014/uploads/xxx.png，列表页照片列可见缩略图，详情页鸽子照片正确显示，无控制台错误。
