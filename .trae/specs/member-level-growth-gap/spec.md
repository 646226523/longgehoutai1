# Spec: 会员等级成长值差值动态计算

## 问题描述

用户详情页的会员等级卡片（位于用户详情抽屉内）中，"还差 X 成长值"显示逻辑硬编码为 `Math.max(0, 1000 - growth_value)`，进度百分比同样硬编码为 `growth_value / 1000`。当前端有用户（如李建国）已成长值达到 8500 且是钻石会员（门槛 8000）时，显示"还差 0"和 100% 进度。

**核心问题**：平台日后新增更高等级时，已达当前最高等级的用户无法正确显示到新等级的差值，必须等待前端手动改代码里的硬编码数字才能正确显示。等级阈值在数据库 `member_levels.min_growth` 字段中动态维护，但前端未消费这份真实数据。

## 用户与场景

- **后台运营**：管理/新增会员等级后，在用户详情页看到的成长值进度条和差值自动更新，无需改代码。
- **C 端用户**（参考视角）：虽然是后台管理系统，但运营看到的数据必须准确反映等级体系的当前配置。

## 目标

1. 后端在返回用户详情时，附带"距离下一等级还差多少成长值"和"当前等级起始门槛"两个动态值。
2. 前端完全去除硬编码 1000，改用后端返回的阈值/差值渲染进度条和文本。
3. 当用户已是当前配置的最高等级时，显示"已达最高等级"而非"还差 0"。

## 非目标

- 不修改 `member_levels` 表结构和种子数据。
- 不实现"运营新增等级后自动批量重算所有用户等级"（这是独立功能 `/api/user/levels/recompute` 的职责）。
- 不调整等级主题色或卡片 UI 样式。

## 约束与依赖

| 项 | 值 |
|---|---|
| 等级阈值来源 | `member_levels.min_growth`（按 sort ASC 升序） |
| 用户等级来源 | `users.member_level_id` → LEFT JOIN member_levels |
| 前端接口 | `GET /api/user/users/:id` 和 `GET /api/user/users` |
| 前端渲染文件 | `admin-web/src/pages/user-member/UserList.tsx` 约 1255-1297 行 |
| 后端路由文件 | `admin-api/src/routes/user.ts` |

## 功能需求

### FR-1 后端返回等级进度信息

`GET /api/user/users/:id` 和 `GET /api/user/users`（列表）返回的每个用户对象新增以下字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `level_min_growth` | `number \| null` | 当前等级的起始成长值门槛（bronze=0, silver=500…）；无等级时 null |
| `next_level_min_growth` | `number \| null` | 下一级的起始门槛；已是最高等级时 null |
| `growth_to_next` | `number \| null` | 距离下一级还差多少；已是最高等级时 null |

### FR-2 前端移除硬编码

UserList.tsx 的会员卡渲染逻辑改为：
- 进度条 percent = `min((growth_value - level_min_growth) / (next_level_min_growth - level_min_growth), 100)`（有下一级时）；已是最高等级固定 100%。
- 差值文本：有下一级显示 `还差 growth_to_next.toLocaleString()`；已是最高等级显示 `已达最高等级 ⭐`。

### FR-3 边界情况

- 用户无会员等级（member_level_id = null）：保持现有"暂无会员等级"卡片不变。
- 新增等级后旧最高级用户自动显示新差值：依赖后端实时查 member_levels 表，无需前端改代码。

## 非功能需求

- 列表接口新增字段不能显著增加响应时间（等级表仅几行，内存级 join，无性能问题）。
- 新增字段必须为 null-safe，不破坏现有消费方（ProTable 列、其他页面）的渲染。

## 验收标准

### AC-1（rule）后端接口返回正确等级进度字段

给定 member_levels 表 bronze(0)→silver(500)→gold(2000)→diamond(8000)，对用户 growth_value=8500, member_level_id=4（diamond）：
- GET /api/user/users/1 返回 level_min_growth=8000, next_level_min_growth=null, growth_to_next=null

对用户 growth_value=100, member_level_id=1（bronze）：
- 返回 level_min_growth=0, next_level_min_growth=500, growth_to_next=400

对用户 growth_value=1500, member_level_id=2（silver）：
- 返回 level_min_growth=500, next_level_min_growth=2000, growth_to_next=500

证据：Node.js 直接调后端 API 打印返回 JSON。

### AC-2（rule）前端 TypeScript 编译无错误

`admin-web` 下 `npx tsc --noEmit` 退出码为 0。

### AC-3（rule）浏览器页面显示正确

- 钻石会员李建国（growth=8500）：卡片显示"已达最高等级 ⭐"，进度条 100%。
- 青铜会员（growth=100）：卡片显示"还差 400"，进度条 20%（100→500 区间）。
- 无等级用户：保持"暂无会员等级"占位卡片不变。

证据：agent-browser 截图或控制台 Console 网络面板检查接口返回值 + DOM 文本对比。

### AC-4（rubric）扩展性（0-2）

- 2：后端实时查 member_levels 表排序计算，新增等级后零代码改动即生效。
- 1：后端计算逻辑依赖固定等级数量，新增等级仍需改 SQL 但不用改前端。
- 0：后端仍硬编码阈值。

通过阈值：2（完全动态）。
