# 检测机构资质文件上传修复 - 检查清单

## 修复概述
修复了"新增检测机构"页面中资质文件上传功能提示"上传失败:无URL返回"的错误。

## 修复内容
1. **Mock 服务器**: 在 `mock-plugin.js` 中添加 `/api/upload` POST 接口，返回正确格式的文件 URL
2. **前端上传**: 使用 `customRequest` 替代 `beforeUpload+return false`，正确处理文件状态和 URL 提取

## 检查清单

### ✅ Mock 服务器接口
- [x] `/api/upload` POST 接口已添加
- [x] 接口返回 `{ code: 0, data: { url: "..." } }` 格式
- [x] 接口能从 multipart/form-data 中提取文件名
- [x] 接口返回的 URL 包含正确的文件扩展名

### ✅ 前端上传逻辑
- [x] 使用 `customRequest` 处理上传请求
- [x] `beforeUpload` 仅做校验（大小/类型），返回布尔值
- [x] `customRequest` 正确发送 FormData 到 `/api/upload`
- [x] 从响应中正确提取 `url` 字段
- [x] 通过 `onSuccess` 回调通知 Upload 组件完成
- [x] `onChange` 正确更新文件列表和表单数据
- [x] `onRemove` 正确同步删除表单数据中的 URL

### ✅ 错误处理
- [x] 文件超过 10MB 显示"文件不能超过 10MB"
- [x] 无 URL 返回时显示"上传失败:无URL返回"
- [x] 网络请求异常显示"上传失败"

### ✅ 代码质量
- [x] TypeScript 编译零错误
- [x] 无未使用变量或参数
- [x] 类型安全（使用 RcFile、UploadFile 等类型）

### ✅ 浏览器验证
- [x] 页面加载无 JavaScript 错误
- [x] 上传组件正确渲染
- [x] 右侧预览面板与文件上传联动

## 验证方法
1. **Mock 接口测试**: `fetch('http://localhost:3014/api/upload', { method: 'POST' })` → 返回正确格式
2. **TypeScript 编译**: `npx tsc --noEmit` → 无错误
3. **页面加载**: 浏览器打开检测机构管理页面 → 无控制台错误
4. **代码审查**: 审查 `Org.tsx` 和 `mock-plugin.js` 的关键代码路径

## 遗留事项
- 真正的文件存储尚未实现（Mock 仅返回虚拟 URL）
- 地图选点功能待后续实现
