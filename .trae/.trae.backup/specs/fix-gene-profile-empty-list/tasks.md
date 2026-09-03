# 修复新增基因档案后列表无数据 BUG - 实施计划

## [ ] 任务 1: 启动后端服务器并验证数据库
- **优先级**: 高
- **依赖**: 无
- **描述**:
  - 启动后端 API 服务器 (port 3015)
  - 验证数据库文件 `admin-api/data/admin.db` 是否存在
  - 验证 `gene_profiles` 表结构是否正确
  - 通过 curl 或 API 测试工具验证后端接口可用
- **验收标准**: [AC-2, AC-3]
- **测试要求**:
  - `programmatic` TR-1.1: 后端服务器在 3015 端口正常运行
  - `programmatic` TR-1.2: `GET /api/gene/profiles` 接口返回成功
  - `programmatic` TR-1.3: `POST /api/gene/profiles` 接口能成功创建档案并返回 ID
  - `programmatic` TR-1.4: 数据库中 `gene_profiles` 表存在且结构正确
- **备注**: 如果后端未启动，需要先启动服务。如果数据库表不存在，需要运行初始化脚本。

## [ ] 任务 2: 启动前端服务器并验证 API 代理配置
- **优先级**: 高
- **依赖**: [任务 1]
- **描述**:
  - 启动前端开发服务器 (port 3014)
  - 验证 Vite 代理配置正确转发 `/api/gene` 请求到后端 3015
  - 验证 mock 插件正确跳过 `/api/gene` 路由
  - 通过浏览器开发者工具验证 API 请求正确发送
- **验收标准**: [AC-2]
- **测试要求**:
  - `programmatic` TR-2.1: 前端服务器在 3014 端口正常运行
  - `programmatic` TR-2.2: 浏览器登录后，`GET /api/gene/profiles` 请求成功返回数据
  - `programmatic` TR-2.3: 浏览器登录后，`POST /api/gene/profiles` 请求成功创建档案

## [ ] 任务 3: 修复前端表单验证和提交逻辑
- **优先级**: 高
- **依赖**: [任务 1, 任务 2]
- **描述**:
  - 检查 `GeneForm.tsx` 的 `handleSubmit` 函数验证逻辑
  - 确保手动输入鸽主时，`owner_name` 字段正确更新
  - 检查 `SearchSelect.tsx` 在 `allowCreate` 模式下的值传递
  - 修复状态更新时序问题，确保表单验证使用最新的表单值
  - 添加必要的调试日志以便排查问题
- **验收标准**: [AC-1, AC-5, AC-6]
- **测试要求**:
  - `programmatic` TR-3.1: 未填写必填字段时，表单验证正确阻止提交
  - `programmatic` TR-3.2: 填写所有必填字段后，表单提交成功
  - `programmatic` TR-3.3: 手动输入鸽主后，`owner_name` 和 `owner_phone` 正确设置
  - `programmatic` TR-3.4: 选择现有鸽主后，`owner_id`、`owner_name`、`owner_phone` 正确设置
  - `human-judgement` TR-3.5: 用户体验流畅，无意外的验证错误

## [ ] 任务 4: 验证列表刷新和数据显示
- **优先级**: 高
- **依赖**: [任务 3]
- **描述**:
  - 验证 `List.tsx` 中 `handleRefresh` 函数正确刷新列表
  - 验证 `getGeneProfiles` 返回的数据正确渲染到表格中
  - 检查分页、搜索等功能是否正常
  - 验证创建档案后自动刷新列表显示新数据
- **验收标准**: [AC-4]
- **测试要求**:
  - `programmatic` TR-4.1: 点击"确定"后，列表自动刷新并显示新档案
  - `programmatic` TR-4.2: 手动点击"刷新"按钮后，列表正确显示数据
  - `programmatic` TR-4.3: 列表数据与数据库记录一致
  - `programmatic` TR-4.4: 搜索、分页功能正常工作

## [ ] 任务 5: 端到端测试和回归验证
- **优先级**: 高
- **依赖**: [任务 4]
- **描述**:
  - 执行完整的新增档案流程测试
  - 验证边界情况（重复足环号、空字段等）
  - 验证编辑、删除等其他档案操作
  - 确保其他功能模块不受影响
- **验收标准**: [AC-1, AC-2, AC-3, AC-4, AC-5, AC-6]
- **测试要求**:
  - `programmatic` TR-5.1: 完整的新增档案流程无错误
  - `programmatic` TR-5.2: 重复足环号正确提示错误
  - `programmatic` TR-5.3: 编辑档案功能正常
  - `programmatic` TR-5.4: 删除档案功能正常
  - `human-judgement` TR-5.5: 整体用户体验流畅，无明显缺陷

## 实施顺序
1. 先完成 [任务 1] 和 [任务 2]，确保基础设施正常
2. 然后完成 [任务 3]，修复核心问题
3. 接着完成 [任务 4]，验证列表功能
4. 最后完成 [任务 5]，进行全面测试