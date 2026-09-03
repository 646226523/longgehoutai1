# 检测机构资质文件上传修复 - 实施计划

## Task 1: 修复 Mock 服务器上传接口
- **状态**: `completed`
- **优先级**: high
- **依赖**: 无
- **描述**:
  - 在 `server/mock-plugin.js` 中添加 `/api/upload` POST 接口处理器
  - 解析 multipart/form-data 请求，返回带文件 URL 的成功响应
  - 响应格式: `{ code: 0, message: 'success', data: { url: "/uploads/mock_xxx.ext" } }`
- **验收标准**: AC-1
- **测试需求**:
  - `rule` TR-1.1: 向 `/api/upload` 发送 POST 请求返回 `{ code: 0, data: { url: string } }` 格式的响应；通过命令行验证 ✓ 已通过
- **备注**: Mock 接口返回正确格式，fetch 验证通过

## Task 2: 修复前端上传处理逻辑
- **状态**: `completed`
- **优先级**: high
- **依赖**: Task 1
- **描述**:
  - 使用 `customRequest` 替代 `beforeUpload+return false` 的方式，让 Upload 组件正确管理文件状态
  - 从 `response` 中提取 URL 并更新 `fileList` 和 `formData.qualification_files`
  - 上传成功后通过 `onSuccess` 回调通知 Upload 组件文件已完成
  - 通过 `onChange` 处理函数同步文件状态和 URL
- **验收标准**: AC-2, AC-3
- **测试需求**:
  - `rule` TR-2.1: 选择文件上传后显示成功提示，文件在列表中显示为 done 状态；代码逻辑已验证 ✓
  - `rule` TR-2.2: 上传成功后右侧预览面板的资质文件区域显示文件名；代码逻辑已验证 ✓

## Task 3: 错误处理和边界情况
- **状态**: `completed`
- **优先级**: medium
- **依赖**: Task 2
- **描述**:
  - 文件大小校验（≤10MB）：在 `beforeUpload` 中检查
  - 文件类型校验（PDF/JPG/PNG）：通过 `accept` 属性限制
  - 上传失败时显示 `message.error` 提示
  - 删除已上传文件时同步更新 `formData.qualification_files`
- **验收标准**: AC-4
- **测试需求**:
  - `rule` TR-3.1: 上传超过10MB文件显示"文件不能超过10MB"提示 ✓
  - `rule` TR-3.2: 无URL返回时显示"上传失败:无URL返回"提示 ✓

## Task 4: TypeScript 编译和浏览器验证
- **状态**: `completed`
- **优先级**: high
- **依赖**: Task 1, 2, 3
- **描述**:
  - 运行 TypeScript 编译器验证无类型错误
  - 浏览器自动化测试验证完整流程
- **验收标准**: AC-1, AC-2, AC-3, AC-4
- **测试需求**:
  - `rule` TR-4.1: `npx tsc --noEmit` 无错误输出 ✓ 通过
  - `rule` TR-4.2: 页面加载无 JavaScript 错误 ✓ 通过
