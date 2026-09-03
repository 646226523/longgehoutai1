# 仲裁案件关联成交单自动回填 - 实施计划

## [x] 任务 1: 添加用户搜索接口和状态管理
- **优先级**: 高
- **依赖**: 无
- **描述**: 
  - 在 `Case.tsx` 中导入 `getUserList` 接口
  - 添加 `userOptions` state 存储用户列表
  - 添加 `loadUserOptions(keyword)` 函数用于按关键字搜索用户
  - 用户选项格式: `{ label: displayName, value: displayName }`，其中 displayName 优先取 nickname
  - 添加 `complainantTouched` 和 `respondentTouched` state 追踪用户是否手动修改过
- **验收标准**: AC-3
- **测试要求**:
  - `programmatic` TR-1.1: 输入关键字后能正确调用 `getUserList` 并更新 `userOptions`
  - `programmatic` TR-1.2: 用户选项 label 优先使用 nickname，其次使用 username
- **备注**: 防抖处理（300ms）避免频繁请求

## [x] 任务 2: 实现关联成交单选择后的自动回填逻辑
- **优先级**: 高
- **依赖**: 任务 1
- **描述**:
  - 在 `related_deal_id` Select 上添加 `onChange` 处理函数
  - 当选择成交单后，从 `dealOptions` 中找到对应记录
  - 自动填入 complainant（seller）、respondent（buyer）、amount（final_price）
  - 清除成交单时不自动清空已填字段
  - 变更成交单时检查 `complainantTouched`/`respondentTouched`，未手动修改才覆盖
- **验收标准**: AC-1, AC-2, AC-5
- **测试要求**:
  - `programmatic` TR-2.1: 选择成交单后，form 字段值正确更新为成交单数据
  - `programmatic` TR-2.2: 清除成交单后，已回填字段保持不变
  - `human-judgement` TR-2.3: 手动修改后再切换成交单，已修改字段不被覆盖
- **备注**: buyer 为 null 时不填充 respondent

## [x] 任务 3: 将申诉人和被诉人改为可搜索选择组件
- **优先级**: 高
- **依赖**: 任务 1, 任务 2
- **描述**:
  - 将申诉人字段从 `<Input>` 改为 `<Select showSearch>`
  - 将被诉人字段从 `<Input>` 改为 `<Select showSearch>`
  - 使用 `onSearch` 触发用户搜索
  - 支持手动输入（Select 的 `mode` 默认为单选，`allowCreate` 允许自由输入）
  - 保留手动输入能力（通过 `allowCreate` 属性）
  - 使用 `onChange` 同步更新表单值和 touched 状态
- **验收标准**: AC-2, AC-3
- **测试要求**:
  - `programmatic` TR-3.1: 在申诉人/被诉人字段输入关键字后，显示匹配的用户选项
  - `human-judgement` TR-3.2: 选择用户后字段值正确显示；也可手动输入任意文本
- **备注**: 使用 `allowCreate` 确保既能搜索选择用户，也能手动输入

## [x] 任务 4: 优化争议金额自动回填和格式化显示
- **优先级**: 中
- **依赖**: 任务 2
- **描述**:
  - 确保选择成交单后争议金额自动填入 `final_price`
  - InputNumber 组件已有 formatter 显示 ¥ 前缀，确认工作正常
  - 添加视觉提示（如 Tooltip）告知管理员金额来自成交单
- **验收标准**: AC-4
- **测试要求**:
  - `programmatic` TR-4.1: 选择成交单后争议金额字段显示正确的金额和 ¥ 前缀
  - `human-judgement` TR-4.2: 争议金额字段的视觉提示清晰说明数据来源
- **备注**: 无

## [x] 任务 5: 更新右侧实时预览面板
- **优先级**: 中
- **依赖**: 任务 2, 任务 3, 任务 4
- **描述**:
  - 右侧预览面板的"双方当事人"区域实时反映自动回填和手动修改的值
  - 当有成交单关联时，在预览中显示成交单摘要信息
  - 确保争议金额在预览中正确显示
- **验收标准**: AC-1, AC-2, AC-4
- **测试要求**:
  - `programmatic` TR-5.1: 预览面板实时更新申诉人、被诉人、争议金额
  - `human-judgement` TR-5.2: 预览面板的视觉反馈清晰反映当前表单状态
- **备注**: 无

## [x] 任务 6: 整体验证和边界情况处理
- **优先级**: 高
- **依赖**: 任务 1-5
- **描述**:
  - 验证 TypeScript 编译无错误
  - 验证浏览器中的完整流程
  - 处理 buyer 为 null 的边界情况
  - 处理成交单无匹配结果的情况
  - 处理用户搜索无结果的情况
  - 验证编辑模式下的回填行为
- **验收标准**: AC-1, AC-2, AC-3, AC-4, AC-5
- **测试要求**:
  - `programmatic` TR-6.1: TypeScript 编译零错误 ✅
  - `human-judgement` TR-6.2: 完整流程测试通过（选择成交单 → 自动回填 → 修改字段 → 提交）✅
  - `programmatic` TR-6.3: buyer 为 null 时被诉人字段不被错误覆盖 ✅
  - `programmatic` TR-6.4: 清除成交单后字段不被清空 ✅
- **备注**: 已验证全部通过
