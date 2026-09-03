# 资讯内容编辑器升级 - Implementation Plan

## [ ] Task 1: 安装 wangEditor v5 依赖
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 安装 `@wangeditor/editor` 和 `@wangeditor/editor-for-react`
  - 这是轻量级富文本编辑器，支持 React 18，中文社区活跃
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: `package.json` 中包含两个编辑器依赖
  - `programmatic` TR-1.2: `node_modules` 中存在 `@wangeditor/editor` 和 `@wangeditor/editor-for-react`

## [ ] Task 2: 创建 RichTextEditor 组件
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 在 `admin-web/src/components/RichTextEditor.tsx` 创建可复用的富文本编辑器组件
  - 封装 wangEditor React 组件，配置常用功能模块：基础格式、标题、列表、图片、链接、表格
  - 支持受控模式（value/onChange），便于与 Form 集成
  - 图片上传使用自定义 uploadImage 函数，将本地图片转为 Base64
  - 导出默认组件和类型
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-4
- **Test Requirements**:
  - `programmatic` TR-2.1: 组件接受 value prop 并触发 onChange 回调
  - `programmatic` TR-2.2: 工具栏包含加粗、斜体、标题、列表、图片、链接、表格按钮
  - `programmatic` TR-2.3: 图片上传能将本地图片转为 Base64 插入

## [ ] Task 3: 集成到资讯编辑抽屉
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 替换 `News.tsx` 中的 `Input.TextArea` 为 `RichTextEditor` 组件
  - 保留"编辑/预览"Tab 切换结构
  - 编辑 Tab 使用富文本编辑器，预览 Tab 保持不变
  - 将编辑器的 value 绑定到 `contentHtml` 状态
  - 确保表单提交时 content 字段正确传递
- **Acceptance Criteria Addressed**: AC-3, AC-5, AC-6
- **Test Requirements**:
  - `programmatic` TR-3.1: 打开编辑抽屉显示富文本编辑器（带工具栏）
  - `programmatic` TR-3.2: 编辑 Tab 切换到预览 Tab 正确渲染 HTML
  - `programmatic` TR-3.3: 保存时 content 字段包含富文本 HTML
  - `human-judgement` TR-3.4: 编辑器界面美观，工具栏按钮直观可用

## [ ] Task 4: TypeScript 编译与浏览器验证
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 运行 TypeScript 类型检查确保零错误
  - 启动前端开发服务器
  - 在浏览器中验证编辑器功能：加粗、标题、列表、图片、预览、保存
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7
- **Test Requirements**:
  - `programmatic` TR-4.1: `npx tsc --noEmit` 编译零错误
  - `programmatic` TR-4.2: 浏览器控制台无错误
  - `human-judgement` TR-4.3: 完整编辑流程测试通过（输入→格式化→预览→保存）
