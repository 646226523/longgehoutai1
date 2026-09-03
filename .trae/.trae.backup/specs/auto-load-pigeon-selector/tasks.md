# 拍品选择弹窗优化 - The Implementation Plan

## [x] Task 1: 后端 - 新增竞拍状态查询接口
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 `admin-api/src/routes/gene.ts` 中修改 `GET /api/gene/profiles` 接口，增加竞拍状态信息
  - 查询逻辑：通过 `gene_profiles.id` LEFT JOIN `nft_assets.gene_profile_id` LEFT JOIN `auction_items.nft_asset_id` LEFT JOIN `auction_sessions.id`，筛选 `auction_sessions.status IN ('pending', 'ongoing')`
  - 返回字段增加：`auction_status`（'idle' | 'active'）、`active_session_name`（活跃场次名称，可为空）
  - 在 `admin-web/src/services/gene.ts` 的 `GeneProfile` 接口中增加对应字段
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-1.1: `GET /api/gene/profiles` 返回数据每条记录包含 `auction_status` 字段
  - `programmatic` TR-1.2: 处于活跃拍卖中的鸽子 `auction_status` 为 'active'，其他为 'idle'
  - `programmatic` TR-1.3: 活跃状态的鸽子包含 `active_session_name` 字段
- **Notes**: 查询需容错处理，若 NFT 表或拍卖表不存在则返回默认 idle 状态

## [x] Task 2: 前端 - 弹窗自动加载 + 竞拍状态显示
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 在 `admin-web/src/pages/auction/Session.tsx` 的 `ItemSelectorModal` 组件中：
  1. 添加 `useEffect` 监听 `open` 变化，当弹窗打开时自动调用 `fetchPigeons('')` 加载全部数据
  2. 在表格中新增"竞拍状态"列，显示 `auction_status` 和 `active_session_name`
  3. "竞拍中"状态的鸽子使用 `Tag` 组件显示警告样式
  4. 更新 `GeneProfile` 类型以包含新字段
- **Acceptance Criteria Addressed**: AC-1, AC-3, AC-5
- **Test Requirements**:
  - `programmatic` TR-2.1: 弹窗打开后自动显示鸽子列表，无需手动点击查询
  - `programmatic` TR-2.2: 表格包含"竞拍状态"列
  - `human-judgement` TR-2.3: "竞拍中"状态的鸽子有清晰的视觉标记

## [x] Task 3: 验证与修复
- **Priority**: medium
- **Depends On**: Task 1, Task 2
- **Description**: 
  - 启动前后端服务，验证弹窗自动加载功能
  - 检查竞拍状态标记是否正确显示
  - 确认 TypeScript 编译通过
  - 确保搜索筛选功能仍正常工作
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-3.1: 浏览器打开弹窗后数据自动加载
  - `programmatic` TR-3.2: TypeScript 编译零错误
  - `human-judgement` TR-3.3: 整体交互流畅，视觉合理
