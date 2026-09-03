# 修复身份证图片渲染问题 - 实施计划

## [x] Task 1: 添加图片URL处理函数和BASE_URL
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在AuditList.tsx顶部添加BASE_URL常量
  - 添加getImageUrl函数处理图片URL：
    - data:image开头的直接返回
    - http/https开头的直接返回
    - 以/开头的拼接BASE_URL
    - 其他情况拼接BASE_URL
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: getImageUrl函数正确处理各种URL格式

## [x] Task 2: 优化MaterialCard组件占位图
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 当src为空时，显示"暂无图片"文字和占位图样式
  - 使用getImageUrl处理src
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgement` TR-2.1: 空值时显示"暂无图片"占位图

## [x] Task 3: 列表页添加身份证材料缩略图
- **Priority**: medium
- **Depends On**: Task 1
- **Description**: 
  - 在列表页添加"认证材料"列，显示身份证正面缩略图
  - 点击缩略图可直接预览
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgement` TR-3.1: 列表页显示身份证材料缩略图

## [x] Task 4: 验证与清理
- **Priority**: medium
- **Depends On**: Task 1, 2, 3
- **Description**: 
  - 浏览器验证图片显示效果
  - 验证空值占位图
  - 验证列表页缩略图
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3
- **Test Requirements**:
  - `human-judgement` TR-4.1: 所有图片显示正常
  - `programmatic` TR-4.2: TypeScript编译无新增错误
