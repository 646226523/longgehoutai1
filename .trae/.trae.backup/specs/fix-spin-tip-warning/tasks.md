# 修复 Ant Design Spin tip 属性警告 - The Implementation Plan

## [x] Task 1: 修复 LoftMapPicker.tsx 中两处 Spin 组件
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 第 450 行: 将 `<Spin tip="加载地图配置..." />` 改为 Spin 包裹提示文字的嵌套模式
  - 第 531 行: 将 `<Spin tip="地图加载中..." />` 改为 Spin 包裹提示文字的嵌套模式
  - 修改后结构: `<Spin><div style={{...}}>加载提示文字</div></Spin>`
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-1.1: 两处 Spin 组件都有子元素包裹
  - `human-judgement` TR-1.2: 加载时仍能看到提示文字

## [x] Task 2: 构建与验证
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 运行 `npm run build` 验证构建通过
  - 启动开发服务器验证控制台无警告
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-2.1: `npm run build` 成功
  - `programmatic` TR-2.2: 启动后控制台无 Spin tip 警告
