# Banner 编辑数据回显修复 - 实施计划

## [x] Task 1: 修复 BannerDrawer 数据回显逻辑
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 `BannerDrawer` 组件中的 `useEffect`，确保正确回显数据
  - 在设置新值前先调用 `form.resetFields()` 清除旧状态
  - 处理可能为 `undefined`/`null` 的字段
  - 使用函数式更新确保最新状态
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3
- **Test Requirements**:
  - `programmatic` TR-1.1: TypeScript 编译通过
  - `human-judgement` TR-1.2: 编辑时所有字段正确回显
  - `human-judgement` TR-1.3: 图片正确回显
  - `human-judgement` TR-1.4: 新建功能不受影响
- **Completed**: 修复 useEffect 逻辑，添加 resetFields 和默认值处理

## [ ] Task 2: 验证与测试
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 启动服务进行实际测试
  - 验证编辑功能数据回显
  - 验证新建功能正常
  - 修复发现的问题
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-2.1: TypeScript 类型检查通过
  - `human-judgement` TR-2.2: 页面截图验证通过
