# 修复身份证图片显示问题 - 实施计划

## [x] Task 1: 修改详情抽屉中MaterialCard高度
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 方案A（推荐）：移除详情抽屉中3个MaterialCard的`compact`属性，使其使用默认的150px高度
  - 涉及行号：512、527、542的`compact`属性
  - 方案B：修改MaterialCard组件，将compact模式高度从90px增加到180px
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-1.1: 详情抽屉中MaterialCard高度已从90px增加
  - `human-judgement` TR-1.2: 身份证图片中文字信息清晰可读

## [x] Task 2: 验证与清理
- **Priority**: medium
- **Depends On**: Task 1
- **Description**: 
  - 运行TypeScript类型检查
  - 浏览器验证详情抽屉中身份证图片显示效果
  - 验证点击预览功能正常
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-2.1: TypeScript编译无新增错误
  - `human-judgement` TR-2.2: 详情抽屉中身份证图片文字信息可读
  - `programmatic` TR-2.3: 点击图片可打开预览弹窗
