# 用户详情页头像真实化与布局优化 - 实施计划

## [x] Task 1: 头像真实化实现
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 Avatar 组件，当 record.avatar 有值时使用 src 属性显示真实头像
  - 无头像时显示默认 fallback（用户名首字或图标）
  - 处理图片加载失败的情况
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-1.1: 有 avatar 数据时 Avatar 显示 src 图片
  - `programmatic` TR-1.2: 无 avatar 时显示 fallback
  - `programmatic` TR-1.3: tsc --noEmit 编译通过

## [x] Task 2: 头像布局优化
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 增大头像尺寸至 120px
  - 添加外圈装饰渐变光环效果
  - 重新排列头像区域布局（垂直排列：头像→等级→认证）
  - 优化右侧信息区排列
  - 增强整体视觉层次
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgement` TR-2.1: 头像尺寸明显增大
  - `human-judgement` TR-2.2: 布局紧凑美观，信息层次清晰
  - `programmatic` TR-2.3: 控制台无错误

## [x] Task 3: 验证与截图
- **Priority**: medium
- **Depends On**: Task 2
- **Description**: 
  - 浏览器验证所有修改效果
  - 截图确认
  - 检查控制台错误
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgement` TR-3.1: 截图确认效果符合预期
  - `programmatic` TR-3.2: 控制台无 error 级错误
