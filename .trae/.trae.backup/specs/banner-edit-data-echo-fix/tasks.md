# Banner 编辑数据回显修复 - The Implementation Plan (Decomposed and Prioritized Task List)

## [x] Task 1: 分析和修复ImageUploader组件数据回显问题
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 问题根因：ImageUploader组件使用useState(previewList)管理内部状态，初始化为toArr(value)。当Form通过setFieldsValue设置值时，组件的useEffect虽然会更新previewList，但可能存在时序问题。
  - 修复方案：
    1. 在ImageUploader组件中增强value变化的处理逻辑，确保当value从外部设置时能正确更新预览
    2. 处理空字符串或undefined值的情况，避免错误显示
    3. 使用useEffect的依赖确保每次value变化都能正确同步
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-1.1: 验证ImageUploader接收到value prop后能正确显示预览图片
  - `programmatic` TR-1.2: 验证当value为空字符串时显示上传占位符
  - `human-judgement` TR-1.3: 检查编辑Banner时图片是否正确显示

## [x] Task 2: 修复BannerDrawer表单数据回显逻辑
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 问题根因：useEffect中连续调用resetFields()和setFieldsValue()可能导致时序问题；jump_type和jump_target使用`|| undefined`会把空字符串转为undefined
  - 修复方案：
    1. 优化useEffect中的数据设置逻辑，确保先清空再填充
    2. 修复jump_type和jump_target的空值处理，使用??操作符替代||
    3. 增加对日期字段的处理，确保start_time和end_time正确转换
    4. 添加日志帮助调试数据回显问题
- **Acceptance Criteria Addressed**: AC-1, AC-3, AC-4, AC-5, AC-6, AC-7
- **Test Requirements**:
  - `programmatic` TR-2.1: 验证标题字段正确回显
  - `programmatic` TR-2.2: 验证投放位置下拉框正确选中
  - `programmatic` TR-2.3: 验证排序权重正确显示
  - `programmatic` TR-2.4: 验证跳转类型和跳转目标正确回显
  - `programmatic` TR-2.5: 验证日期字段正确回显
  - `human-judgement` TR-2.6: 检查所有字段的回显效果

## [x] Task 3: 确保新建Banner功能正常
- **Priority**: high
- **Depends On**: Task 1, Task 2
- **Description**: 
  - 验证修复后新建功能不受影响
  - 确保默认值正确（位置为home_top，排序为0）
  - 测试新建流程：打开抽屉 -> 填写数据 -> 保存 -> 列表刷新
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `programmatic` TR-3.1: 验证新建时表单显示正确的默认值
  - `programmatic` TR-3.2: 验证新建保存成功后列表刷新
  - `human-judgement` TR-3.3: 检查新建Banner的整体流程

## [x] Task 4: 集成测试和验证
- **Priority**: medium
- **Depends On**: Task 1, Task 2, Task 3
- **Description**: 
  - 启动前后端服务进行实际测试
  - 验证编辑功能的数据回显
  - 验证新建功能正常
  - 验证保存更新功能正常
  - 检查控制台是否有错误或警告
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9
- **Test Requirements**:
  - `programmatic` TR-4.1: 启动服务并访问Banner管理页面
  - `programmatic` TR-4.2: 点击编辑按钮验证所有字段回显
  - `programmatic` TR-4.3: 修改数据并保存验证更新成功
  - `programmatic` TR-4.4: 点击新建按钮验证默认值
  - `programmatic` TR-4.5: 检查控制台无错误警告
  - `human-judgement` TR-4.6: 整体功能验证截图
