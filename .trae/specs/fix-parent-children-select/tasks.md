# 修复亲子关系选择器 - 实施计划

## [x] Task 1: 修改 SearchSelect 组件支持聚焦加载和 tags 模式 ✅
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 添加 `mode` 属性支持，当值为 `'tags'` 时允许手动输入任意值
  - 添加 `onFocus` 事件处理，当聚焦且选项为空时自动触发无关键词搜索加载默认数据
  - 修改空关键词处理逻辑：不再直接 `setOptions([])`，而是调用 `onSearch('')` 加载后端默认数据
  - 使用 useRef 缓存最新的 onSearch 回调
  - 处理 tags 模式下 onChange 回调的值传递（区分自定义输入和已有选项）
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-6
- **Test Requirements**:
  - `programmatic` TR-1.1: 聚焦 SearchSelect 时，自动调用 onSearch('') 加载默认数据
  - `programmatic` TR-1.2: 在 tags 模式下，用户输入新值后按回车可选中自定义值
  - `programmatic` TR-1.3: 搜索关键词输入后，正确调用 onSearch 并更新选项
  - `human-judgement` TR-1.4: 鸽主选择器（非 tags 模式）行为与修改前一致
- **Notes**: 需保持向后兼容，现有使用 SearchSelect 的地方不受影响

## [x] Task 2: 修改 GeneForm 中父鸽/母鸽选择器 ✅
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 为父鸽和母鸽的 SearchSelect 组件添加 `mode="tags"` 属性
  - 初始化时加载现有档案数据作为默认选项
  - 修改 onChange 处理逻辑：选中已有档案时存 ID，输入新值时存字符串
  - 编辑模式下回显已关联父鸽/母鸽的显示名称
  - 提交时正确传递 sire_id 和 dam_id（数字 ID 或字符串名称）
- **Acceptance Criteria Addressed**: AC-3, AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-2.1: 聚焦父鸽/母鸽输入框时，下拉显示已有档案
  - `programmatic` TR-2.2: 输入关键词可过滤档案列表
  - `programmatic` TR-2.3: 手动输入不存在的鸽名可选中并保存
  - `programmatic` TR-2.4: 编辑模式下正确回显父鸽/母鸽信息
  - `programmatic` TR-2.5: 提交表单时 sire_id/dam_id 值类型正确
- **Notes**: 需处理好 number | string 类型的 sire_id/dam_id

## [x] Task 3: 构建验证 ✅
- **Priority**: high
- **Depends On**: Task 1, Task 2
- **Description**:
  - 运行 `npm run build` 确认构建通过
  - 启动开发服务器验证功能
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `programmatic` TR-3.1: npm run build 无 TypeScript 错误
  - `human-judgement` TR-3.2: 手动测试聚焦加载、搜索过滤、手动输入、编辑回显功能
- **Notes**: 需验证所有场景
