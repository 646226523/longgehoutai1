# 修复基因信息管理 findDOMNode 报错 - 实施计划

## [x] Task 1: 禁用所有 ProTable 的 density 选项
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 遍历所有 27 个使用 `ProTable` 的 .tsx 文件
  - 为每个 `<ProTable>` 组件添加 `options={{ density: false }}` 属性
  - 仅修改 ProTable 相关的属性，不改动其他逻辑
  - 重点关注基因模块 3 个页面：GeneList.tsx、GeneAudit.tsx、GeneDetail.tsx
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-1.1: `npx tsc --noEmit` 零错误
  - `programmatic` TR-1.2: 浏览器访问 /gene/list 控制台无 findDOMNode 错误
  - `programmatic` TR-1.3: 浏览器访问 /gene/audit 控制台无 findDOMNode 错误
  - `programmatic` TR-1.4: 浏览器访问 /gene/detail/:id 控制台无 findDOMNode 错误
- **Notes**: 添加 density:false 后用户无法通过工具栏切换表格密度，为稳定性让步。其他 ProTable 功能不受影响。

## [x] Task 2: 验证与回归测试
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 重启前端开发服务器
  - 访问基因模块 3 个页面验证
  - 测试所有页面核心功能
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3
- **Test Requirements**:
  - `programmatic` TR-2.1: 基因模块 3 个页面控制台 findDOMNode 错误数为 0
  - `human-judgement` TR-2.2: 所有页面视觉/功能无回归
  - `programmatic` TR-2.3: `npx tsc --noEmit` 零错误
