# 公棚创建与入驻审核流程 - Implementation Plan

## [x] Task 1: 后端新增 POST /api/loft/lofts 接口（后台手动创建公棚）
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 `admin-api/src/routes/loft.ts` 中新增 `POST /api/loft/lofts` 接口
  - 接收 `name`（必填）、`applicant_name`、`phone`、`address`、`capacity`、`location`（JSON字符串）、`description`、`status`
  - 自动生成公棚编码（`LOFT-YYYYMMDD-XXXX` 格式，复用已有的 `genUniqueLoftCode()`）
  - 插入 `lofts` 表，默认状态为 1（营业中）
  - 返回新记录 ID 和生成的 code
  - 权限：`requirePermission('loft:create')` 或 `loft:edit`
- **Acceptance Criteria Addressed**: AC-2, AC-3
- **Test Requirements**:
  - `programmatic` TR-1.1: `POST /api/loft/lofts` 返回 200 且包含新 ID 和 code
  - `programmatic` TR-1.2: 缺少必填字段时返回 400
- **Notes**: 复用现有 `genUniqueLoftCode()` 函数生成编码

## [x] Task 2: 前端服务层新增 createLoft 函数
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 在 `admin-web/src/services/loft.ts` 中新增 `LoftCreateParams` 接口和 `createLoft()` 函数
  - 接口调用 `POST /loft/lofts`
  - 返回 `{ id: number; code: string }`
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-2.1: createLoft 函数已导出，接受参数结构正确

## [x] Task 3: 公棚列表页启用创建按钮 + 实现双轨流程
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 移除 `Loft/List.tsx` 中创建按钮的 `disabled` 属性，修改文案为"➕ 创建公棚"
  - 点击后弹出**模式选择 Modal**（使用 Ant Design `Modal.confirm`）
    - 选项一："📝 手动创建（直接生效）" → 打开创建表单（复用编辑弹窗结构，所有字段为空，`editing` 为 null）
    - 选项二："📋 入驻申请审核" → `navigate('/loft/audit')`
  - 创建表单提交调用 `createLoft()`，成功后 `message.success` 并刷新列表
  - 表单校验：公棚名称必填
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-3.1: 点击创建按钮后弹出模式选择框
  - `programmatic` TR-3.2: 选择手动创建 → 表单提交 → 新公棚出现在列表
  - `human-judgement` TR-3.3: 创建弹窗布局合理，字段清晰

## [x] Task 4: 优化入驻审核列表（状态 Tab + 完整展示）
- **Priority**: medium
- **Depends On**: None
- **Description**: 
  - 在 `Audit.tsx` 中添加状态 Tab 切换（待审核 / 已通过 / 已驳回）
  - ProTable 的 request 根据 activeTab 传递 status 参数
  - 确保列表支持按公棚名称、申请人、联系电话关键词搜索
  - 优化操作按钮：待审核记录显示"通过"和"驳回"，已通过/已驳回记录仅显示"查看详情"
- **Acceptance Criteria Addressed**: AC-4, AC-5, AC-6
- **Test Requirements**:
  - `human-judgement` TR-4.1: 状态 Tab 切换可用，数据筛选正确
  - `programmatic` TR-4.2: 审核通过后后端返回成功，数据库 lofts 表有新记录
  - `programmatic` TR-4.3: 驳回需要填写理由，理由为空时返回 400

## [x] Task 5: 入驻审核详情抽屉增强
- **Priority**: medium
- **Depends On**: Task 4
- **Description**: 
  - 在 `Audit.tsx` 的 Drawer 中优化详情展示
  - 新增顶部状态横幅区域，展示审核状态和申请时间
  - 审核通过弹窗增加提示信息"审核通过后，系统将自动创建公棚档案"
  - 驳回弹窗必须填写驳回理由
  - 已审核记录显示审核时间和审核备注
- **Acceptance Criteria Addressed**: AC-5, AC-6
- **Test Requirements**:
  - `human-judgement` TR-5.1: 详情抽屉信息完整，操作按钮清晰

## [x] Task 6: 公棚列表状态标识优化
- **Priority**: medium
- **Depends On**: Task 3
- **Description**: 
  - 在 `List.tsx` 的状态列中，扩展状态枚举支持"暂停营业"(2)、"待审核"(3)、"审核驳回"(4)
  - 添加状态筛选下拉选项
  - 状态标签颜色：营业中 green、暂停 orange、已关闭 default、待审核 gold、审核驳回 red
  - 非可编辑状态（待审核、审核驳回）只展示 Tag，不展示 Switch
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `human-judgement` TR-6.1: 状态标签正确显示对应颜色和文案

## [x] Task 7: 权限表补全 — 新增 loft:create 权限
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 `admin-api/src/db.ts` 的权限种子数据数组中，`loft:view` 之后新增 `['loft:create', '公棚创建', 'loft', 'button', '手动创建公棚']`
  - 确保后端 `POST /api/loft/lofts` 的 `requirePermission('loft:create')` 能正确匹配
  - 已初始化的数据库需要通过 INSERT 语句补全该权限（使用 `INSERT OR IGNORE INTO permissions`）
- **Acceptance Criteria Addressed**: FR-6, AC-3
- **Test Requirements**:
  - `programmatic` TR-7.1: 权限种子数据包含 `loft:create`
  - `programmatic` TR-7.2: `POST /api/loft/lofts` 对非超管角色返回正确权限校验结果（无权限 403，有权限 200）

## [x] Task 8: 审核列表 Tab 显示数量角标
- **Priority**: medium
- **Depends On**: None
- **Description**: 
  - 在 `admin-web/src/pages/loft/Audit.tsx` 中，Tabs 的 items 增加数量角标
  - 实现方式：在 ProTable 的 request 回调中获取各状态的 total，更新 tabCount state
  - 渲染 Tab 时使用 `Badge` 或直接拼接字符串显示数量：`待审核(${count})`
  - 切换 Tab 时触发对应状态的 count 查询（可在首次加载时一次性查询三个状态的 count）
- **Acceptance Criteria Addressed**: FR-7, AC-4
- **Test Requirements**:
  - `human-judgement` TR-8.1: Tab 标签显示各状态数量，与实际数据一致
  - `programmatic` TR-8.2: 切换 Tab 后数量不丢失，刷新后正确

## [x] Task 9: 构建与浏览器端到端验证
- **Priority**: high
- **Depends On**: Task 3, Task 4, Task 5, Task 6, Task 7, Task 8
- **Description**: 
  - `npm run build` 验证 TypeScript 类型检查通过
  - 启动后端服务并执行 API 接口测试：
    1. `POST /api/loft/lofts` 创建公棚 → 验证返回新 ID 和 code
    2. `GET /api/loft/applications?status=pending` → 验证返回待审核列表
    3. `POST /api/loft/applications/:id/approve` → 验证事务同时创建 lofts 记录并更新申请状态
    4. `POST /api/loft/applications/:id/reject` → 验证状态变更为 rejected
  - 浏览器自动化测试：
    1. 登录后台 → 公棚列表 → 创建公棚（手动）→ 验证列表刷新
    2. 入驻审核列表 → 验证 Tab 数量角标显示 → 审核通过 → 验证公棚列表有新记录
    3. 入驻审核列表 → 审核驳回 → 验证状态变更
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8
- **Test Requirements**:
  - `programmatic` TR-9.1: `npm run build` 无错误
  - `programmatic` TR-9.2: 后端 API 接口测试全部通过
  - `programmatic` TR-9.3: 浏览器端到端测试通过
