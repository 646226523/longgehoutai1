# 取消角色编码字段 - The Implementation Plan

## [x] Task 1: 移除 UI + 自动生成 code
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 `p:\龙鸽项目\longgehoutai\admin-web\src\pages\system\Role.tsx` 中：
  1. 删除 ProFormText name="code" 组件块（大约 line 1017-1025）
  2. 在 handleSubmit 中，新建角色时自动生成 `code: 'role_' + Date.now()`
  3. 编辑角色时传原 code（不修改）
  4. 后端返回 409 时重试一次（时间戳 + 1000）
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-1.1: 搜索 Role.tsx 中 `name="code"` 结果为空
  - `programmatic` TR-1.2: `npx tsc --noEmit` 退出码 0
  - `human-judgement` TR-1.3: 打开新增角色弹窗，基本信息 Card 只显示角色名称/状态/描述
  - `human-judgement` TR-1.4: 填写角色名称后提交，接口请求体包含 code 字段（自动生成的 role_xxx）
- **Notes**: 
  - 前端编辑角色时 payload 可能不含 code（后端 PUT 接口不强制校验 code），这是安全的
  - 新建/编辑角色的 handleSubmit 代码路径需要分别检查
