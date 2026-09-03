# 移除角色列表页的"角色编码"列与筛选 - Implementation Plan

## [x] Task 1: 删除 columns 中的角色编码列
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 `p:\龙鸽项目\longgehoutai\admin-web\src\pages\system\Role.tsx` 第 812 行，删除：
    ```
    { title: '角色编码', dataIndex: 'code', width: 140, ellipsis: true },
    ```
  - 这一行是 ProTable columns 数组中的一项，删除后列表不再显示该列，顶部搜索也不再有对应筛选框
  - 运行 tsc 确认编译通过
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3
- **Test Requirements**:
  - `programmatic` TR-1.1: `Select-String "角色编码" src/pages/system/Role.tsx` 对 columns 定义处零匹配
  - `programmatic` TR-1.2: `npx tsc --noEmit` 退出码 0
  - `human-judgement` TR-1.3: 角色列表页面无角色编码列、无角色编码筛选框
- **Notes**: 
  - RoleItem 接口保留 code 字段（其他地方如"从现有角色复制"下拉可能用到）
  - 后端接口不改，只是前端不渲染
