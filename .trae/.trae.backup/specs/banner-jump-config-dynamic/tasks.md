# Banner跳转配置动态选择 - Implementation Plan

## [x] Task 1: 创建跳转类型配置映射和类型定义
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 创建跳转类型配置对象，定义每种跳转类型对应的标签、API函数、选项值/标签字段
  - 定义JumpOption通用接口
  - 导入所需的API服务函数
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: 配置对象包含所有6种跳转类型的映射
  - `programmatic` TR-1.2: 类型定义正确导出，无TypeScript错误
- **Notes**: 在Banner.tsx文件顶部添加配置

## [x] Task 2: 实现动态跳转目标组件JumpTargetSelect
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 创建JumpTargetSelect组件，根据jump_type prop动态渲染Select或Input
  - 实现数据加载逻辑，根据类型调用对应API
  - 实现搜索过滤功能
  - 实现loading状态
  - 处理空数据状态
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-7
- **Test Requirements**:
  - `programmatic` TR-2.1: 选择赛事类型时显示赛事Select组件
  - `programmatic` TR-2.2: 选择拍卖类型时显示拍卖Select组件
  - `programmatic` TR-2.3: 选择NFT类型时显示NFT Select组件
  - `programmatic` TR-2.4: 选择基因类型时显示基因Select组件
  - `programmatic` TR-2.5: 选择外部链接/APP页面时显示Input组件
  - `programmatic` TR-2.6: Select组件支持关键词搜索
  - `programmatic` TR-2.7: 数据加载时显示loading状态

## [x] Task 3: 集成JumpTargetSelect到BannerDrawer表单
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 替换BannerDrawer中原有的jump_target字段
  - 添加jump_type变化监听，切换类型时清空目标值
  - 处理编辑模式下的数据回显
  - 配置表单验证规则
- **Acceptance Criteria Addressed**: AC-4, AC-5, AC-6
- **Test Requirements**:
  - `programmatic` TR-3.1: 切换跳转类型时清空jump_target值
  - `programmatic` TR-3.2: 编辑模式下正确回显已选中的跳转目标
  - `programmatic` TR-3.3: 表单提交时正确提交jump_type和jump_target

## [x] Task 4: 测试和优化
- **Priority**: medium
- **Depends On**: Task 3
- **Description**: 
  - 所有跳转类型的端到端测试
  - 边界情况测试（无数据、网络错误等）
  - 优化用户体验（选项显示格式、空状态提示等）
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `human-judgement` TR-4.1: 手动测试所有跳转类型的切换和选择功能
  - `programmatic` TR-4.2: 验证TypeScript编译无错误
  - `human-judgement` TR-4.3: 检查空状态和错误状态的用户体验
