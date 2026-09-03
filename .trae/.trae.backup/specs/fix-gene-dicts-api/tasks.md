# 基因档案新增页面 Bug 修复 - 实施计划

## [x] Task 1: 后端实现 GET /api/gene/dicts 接口
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 `admin-api/src/routes/gene.ts` 中新增 `GET /dicts` 路由
  - 返回基因档案表单所需的全部字典数据：colors、eye_colors、genders、statuses、breeds、bloodlines
  - colors 和 eye_colors 使用内置常量（灰、雨点、白、红轮、花、石板、其他 / 黄眼、砂眼、牛眼）
  - genders 使用 [{label:'雄', value:'male'}, {label:'雌', value:'female'}, {label:'未知', value:'unknown'}]
  - statuses 使用 [{label:'正常', value:1}, {label:'停用', value:0}]
  - breeds 和 bloodlines 从 gene_profiles 表中查询 DISTINCT 非空值
  - 路由需放在 `geneRouter.use(authenticate)` 之后，但不需要 `requirePermission`（登录用户均可访问）
- **Acceptance Criteria Addressed**: AC-1, AC-3
- **Test Requirements**:
  - `programmatic` TR-1.1: GET /api/gene/dicts 返回 200 状态码和正确的数据结构
  - `programmatic` TR-1.2: 响应体包含 colors, eye_colors, genders, statuses, breeds, bloodlines 字段
  - `programmatic` TR-1.3: breeds 和 bloodlines 为字符串数组，来自已有档案的去重数据
- **Notes**: 路由注册位置需注意，应在其他业务路由之前或合理位置

## [x] Task 2: 前端 breeds/bloodlines 字段添加 fallback 支持
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - 修改 `admin-web/src/pages/gene/GeneForm.tsx`，为 breeds 和 bloodlines 的 AutoComplete 组件添加 fallback 支持
  - 当 dicts 为 null（接口失败）时，仍使用 fallback 空数组或预置数据，确保 AutoComplete 可自由输入
  - 同时确保 breeds 和 bloodlines 的 AutoComplete 的 `options` 使用 dicts 的 fallback
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgement` TR-2.1: 新增档案弹窗打开后，品种和血统字段可正常输入文字
  - `programmatic` TR-2.2: 无 dicts 数据时，AutoComplete 组件 options 为空数组但允许自由输入
- **Notes**: 核心是将 `options={(dicts?.breeds || [])}` 改为 `options={(dicts?.breeds ?? [])}` 或保持 `||` 但确保 fallback 明确

## [x] Task 3: 构建验证
- **Priority**: high
- **Depends On**: Task 1, Task 2
- **Description**:
  - 执行 `npm run build` 验证前后端构建
  - 确保无 TypeScript 编译错误
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `programmatic` TR-3.1: `npm run build` 命令执行成功，退出码为 0
- **Notes**: 无需额外的单元测试

## [x] Task 4: API 接口验证
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 启动后端服务
  - 使用 curl 或类似工具测试 `GET /api/gene/dicts` 接口
  - 验证返回数据格式正确
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-4.1: 接口返回 200 状态码
  - `programmatic` TR-4.2: 返回的 JSON 包含预期的字段结构