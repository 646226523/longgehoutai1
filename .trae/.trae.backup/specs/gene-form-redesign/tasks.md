# 新增基因档案页面重构 - 实施计划

## [ ] Task 1: 创建图片上传组件
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 创建 `ImageUploader.tsx` 组件,实现本地图片上传功能
  - 支持:点击选择、拖拽上传、Ctrl+V 粘贴
  - 支持格式:JPG/PNG/WEBP,≤5MB
  - 上传前自动压缩(>2MB 时压缩至 2MB 以内)
  - 无图片时显示鸽子剪影占位图
  - 上传后返回 base64 或 Blob URL,用于预览
  - 提供 `onChange` 回调,将图片 URL 传递给父组件
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: 组件渲染后显示上传区域和占位图
  - `programmatic` TR-1.2: 点击可触发文件选择对话框
  - `programmatic` TR-1.3: 拖拽文件到区域可触发上传
  - `programmatic` TR-1.4: 粘贴(Ctrl+V)图片可触发上传
  - `programmatic` TR-1.5: 超过 5MB 的文件显示错误提示
  - `programmatic` TR-1.6: 非图片格式显示错误提示
  - `programmatic` TR-1.7: 上传成功后 onChange 回调被调用,预览图更新
- **Notes**: 使用 Ant Design 的 `Upload` 组件或自定义实现;图片压缩使用 canvas API

## [ ] Task 2: 创建实时预览面板组件
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 创建 `GeneFormPreview.tsx` 组件
  - 显示照片预览区(上部)
  - 显示字段摘要:足环号、鸽名、品系、鸽主
  - 未填写字段显示占位虚线
  - 接收 formData props,实时更新显示
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `programmatic` TR-2.1: 接收 formData 后渲染对应字段值
  - `programmatic` TR-2.2: formData 变化时预览面板实时更新
  - `programmatic` TR-2.3: 未填写字段显示占位符
  - `human-judgement` TR-2.4: 预览面板视觉布局清晰,信息层次分明

## [ ] Task 3: 创建搜索选择器组件(鸽主/父鸽/母鸽)
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 创建 `SearchSelect.tsx` 通用搜索选择器组件
  - 支持远程搜索(防抖 300ms)
  - 支持自定义 optionLabel(显示格式)
  - 支持 onChange 回调(value + 选中对象)
  - 支持清空
  - 用于鸽主、父鸽、母鸽三个场景
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `programmatic` TR-3.1: 输入关键词后 300ms 内触发搜索请求
  - `programmatic` TR-3.2: 选择选项后 onChange 返回 value 和 option 对象
  - `programmatic` TR-3.3: 点击清空按钮可清除选择
  - `programmatic` TR-3.4: 无匹配结果时显示"无数据"

## [ ] Task 4: 创建重构后的基因档案表单组件
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3
- **Description**:
  - 重构 `pages/gene/GeneForm.tsx`,替代原 DrawerForm 内部结构
  - 6 个分组:基础信息(必填)、外观特征、鸽主信息、遗传数据、亲子关系、档案状态
  - 2 列并排布局(宽屏)
  - 集成 ImageUploader、GeneFormPreview、SearchSelect
  - 性别/状态改为单选按钮组
  - 羽色/眼砂改为下拉选择
  - 足环号实时校验(格式+唯一性)
  - 鸽主选择后自动回填电话
  - 底部操作区:取消 | 确定 | 保存并新增下一个
  - 保存并新增:提交成功后清空表单,保持打开
  - 响应式适配
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-4, AC-5, AC-7, AC-8
- **Test Requirements**:
  - `programmatic` TR-4.1: 表单分为 6 个分组,每组有标题
  - `programmatic` TR-4.2: 宽屏下字段 2 列并排
  - `programmatic` TR-4.3: 足环号输入格式不正确时显示红色错误
  - `programmatic` TR-4.4: 足环号已存在时显示红色错误
  - `programmatic` TR-4.5: 鸽主选择后电话自动回填
  - `programmatic` TR-4.6: 父鸽/母鸽选择器可正常搜索和选择
  - `programmatic` TR-4.7: 提交必填项缺失时阻止提交并提示
  - `programmatic` TR-4.8: "保存并新增"提交成功后清空表单
  - `programmatic` TR-4.9: "确定"提交成功后关闭抽屉
  - `human-judgement` TR-4.10: 整体布局美观、分组清晰、交互流畅

## [ ] Task 5: 重写基因档案列表页集成新表单
- **Priority**: high
- **Depends On**: Task 4
- **Description**:
  - 修改 `pages/gene/List.tsx`,将 DrawerForm 替换为 GeneForm 组件
  - 保留 ProTable 列表功能
  - 保留新增/编辑/删除/详情/二维码等操作
  - 确保表单提交逻辑正确对接 createGeneProfile / updateGeneProfile
  - 保留编辑态数据回填
- **Acceptance Criteria Addressed**: AC-2, AC-7
- **Test Requirements**:
  - `programmatic` TR-5.1: 点击"新增档案"按钮弹出 GeneForm
  - `programmatic` TR-5.2: 点击"编辑"按钮弹出 GeneForm 并回填数据
  - `programmatic` TR-5.3: 新增成功后列表刷新
  - `programmatic` TR-5.4: 编辑成功后列表刷新
  - `programmatic` TR-5.5: 取消操作关闭抽屉不提交
  - `programmatic` TR-5.6: 父/母下拉选项正确加载(无自循环)

## [ ] Task 6: 扩展 Mock 数据与接口
- **Priority**: medium
- **Depends On**: None
- **Description**:
  - 在 `server/mock.ts` 中添加足环号唯一性校验 Mock 接口
  - 添加鸽主搜索 Mock 接口(返回鸽主列表)
  - 添加基因档案搜索 Mock 接口(供父/母选择器使用)
  - 添加图片上传 Mock 接口(返回 URL)
  - 添加羽色/眼砂字典 Mock 接口
- **Acceptance Criteria Addressed**: AC-1, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-6.1: GET /api/gene/profiles/check-ring?ring_number=xxx 返回是否存在
  - `programmatic` TR-6.2: GET /api/gene/owners?keyword=xxx 返回鸽主列表
  - `programmatic` TR-6.3: GET /api/gene/profiles/search?keyword=xxx 返回档案列表
  - `programmatic` TR-6.4: POST /api/upload 返回图片 URL
  - `programmatic` TR-6.5: GET /api/gene/dicts 返回羽色/眼砂/性别字典

## [ ] Task 7: 扩展 services/gene.ts API 层
- **Priority**: medium
- **Depends On**: None
- **Description**:
  - 在 `services/gene.ts` 中添加新 API 函数:
    - `checkRingNumber(ring_number: string)`: 校验足环号唯一性
    - `searchOwners(keyword: string)`: 搜索鸽主
    - `searchGeneProfiles(keyword: string)`: 搜索基因档案
    - `uploadImage(file: File)`: 上传图片
    - `getGeneDicts()`: 获取字典数据
  - 添加对应的 TypeScript 类型定义
- **Acceptance Criteria Addressed**: AC-1, AC-3, AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-7.1: checkRingNumber 返回 { exists: boolean }
  - `programmatic` TR-7.2: searchOwners 返回 OwnerOption[]
  - `programmatic` TR-7.3: searchGeneProfiles 返回 GeneProfileOption[]
  - `programmatic` TR-7.4: uploadImage 返回 { url: string }
  - `programmatic` TR-7.5: getGeneDicts 返回羽色/眼砂/性别字典

## [x] Task 8: 集成测试与验证
- **Priority**: high
- **Depends On**: Task 5, Task 6, Task 7
- **Description**:
  - 启动开发服务器,在浏览器中完整测试新增/编辑基因档案流程
  - 验证所有交互:图片上传、表单填写、校验、提交
  - 验证响应式布局
  - 验证 Mock 接口正确响应
  - 修复所有发现的问题
- **Acceptance Criteria Addressed**: AC-1 through AC-8
- **Test Requirements**:
  - `programmatic` TR-8.1: 打开新增抽屉 → 图片上传 → 表单填写 → 提交 → 列表刷新
  - `programmatic` TR-8.2: 打开新增抽屉 → 足环号输入 → 格式错误校验
  - `programmatic` TR-8.3: 打开新增抽屉 → 足环号输入 → 唯一性校验(存在/不存在)
  - `programmatic` TR-8.4: 打开新增抽屉 → 鸽主搜索选择 → 电话自动回填
  - `programmatic` TR-8.5: 打开新增抽屉 → 父/母搜索选择
  - `programmatic` TR-8.6: 打开编辑抽屉 → 数据正确回填 → 提交更新
  - `programmatic` TR-8.7: 保存并新增 → 表单清空 → 可继续录入
  - `human-judgement` TR-8.8: 整体视觉效果和交互体验评估
