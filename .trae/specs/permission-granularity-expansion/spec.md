# 权限粒度扩展 - 全页面子功能权限化

## Overview

* **Summary**: 将系统权限从 35 个粗粒度（模块级）扩展到 \~120 个细粒度（页面子功能级），让角色权限分配界面能完整展示每个页面的每个操作按钮（新增/编辑/删除/详情/审核/发布/下架/置顶/更多操作等）

* **Purpose**: 当前 `content:edit`、`user:edit` 等权限太粗——管理员无法单独授权"只有资讯编辑权限但没有删除权限"。扩展后每个按钮都对应独立权限，实现真正的最小权限原则

* **Target Users**: 系统管理员（创建/分配角色时使用更精细的权限项）

## Goals

* 后端 `db.ts` 权限种子从 35 个扩展到 \~120 个，覆盖所有页面操作按钮

* 权限编码采用三段式 `module:page:action`，前端 Tree 自动按模块→页面→操作 三级分组

* 前端 Role.tsx 的 Tree 节点自动显示中文（补充 CODE\_SEGMENT\_LABELS）

* 保持旧权限 code 向后兼容（数据库已有角色绑定）

* TypeScript 编译零错误

## Non-Goals

* **不修改后端 API 的权限校验逻辑**（`requirePermission` 函数本身不变，它按字符串匹配）

* **不修改前端页面的按钮显示逻辑**（本次只让权限定义变细，按钮显示控制是后续工作）

* **不修改数据库已存在的角色-权限绑定数据**（旧角色绑定的旧 code 保持不变）

* **不删除旧权限种子**（保留 `content:view`、`user:edit` 等，继续作为分组父节点存在）

## Background & Context

* 现状：后端 `db.ts` 定义了 35 个权限，粒度如 `content:edit`（覆盖所有内容编辑）、`user:edit`（覆盖所有用户操作）

* 问题：前端页面实际有大量细分按钮——资讯有"预览/编辑/发布/下架/置顶/删除"，用户有"详情/编辑/实名审核/鸽主审核/更多下拉十项操作"，但权限系统无法区分

* 前端 Role.tsx 已经重构为 Tree 组件，按 `module:page:action` 的冒号分段自动生成三级节点结构

* 后端权限加载接口 `GET /api/system/permissions` 已经按 module 分组返回，Tree 自动构建

## 权限编码规范

格式：`<module>:<page>:<action>` （三段式）

| segment | 说明     | 示例                                                                                                                                                                |
| ------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| module  | 一级模块   | gene, nft, competition, loft, auction, arbitration, detection, content, user, system, statistics, dashboard                                                       |
| page    | 页面/子模块 | list, audit, detail, news, banner, notice, session, items, deal, org                                                                                              |
| action  | 操作类型   | view(查看), detail(详情), create(新增), edit(编辑), delete(删除), publish(发布), offline(下架), top(置顶), audit\_pass(审核通过), audit\_reject(审核驳回), export(导出), reset(重置), ban(封禁) |

## 完整权限清单（新增 \~85 个，保留旧 35 个）

### 🔬 基因档案模块 (gene) — 现有 3 → 扩展到 10

| code                        | 中文名     | type   | 对应按钮        |
| --------------------------- | ------- | ------ | ----------- |
| `gene:list:view`            | 基因档案查看  | menu   | 访问基因档案页面    |
| `gene:list:create`          | 基因档案新增  | button | 工具栏"新增档案"   |
| `gene:list:detail`          | 基因档案详情  | button | 操作列"详情"     |
| `gene:list:edit`            | 基因档案编辑  | button | 操作列"编辑"     |
| `gene:list:delete`          | 基因档案删除  | button | 操作列"删除"     |
| `gene:list:qrcode`          | 二维码重新生成 | button | 操作列"二维码"    |
| `gene:audit:view`           | 档案审核查看  | menu   | 访问审核页面      |
| `gene:audit:pass`           | 档案审核通过  | button | 审核抽屉"通过"    |
| `gene:audit:reject`         | 档案审核驳回  | button | 审核抽屉"驳回"    |
| `gene:detail:add_detection` | 新增检测记录  | button | 详情页"新增检测记录" |

### 🎨 NFT 资产模块 (nft) — 现有 3 → 扩展到 12

| code                    | 中文名      | type   | 对应按钮          |
| ----------------------- | -------- | ------ | ------------- |
| `nft:list:view`         | NFT 资产查看 | menu   | 访问 NFT 列表页面   |
| `nft:list:create`       | 新增铸造     | button | 工具栏"新增铸造"     |
| `nft:list:detail`       | NFT 详情   | button | 操作列"详情"       |
| `nft:list:edit`         | NFT 编辑   | button | 操作列"编辑"       |
| `nft:list:submit_audit` | 提交审核     | button | 操作列"提交审核"     |
| `nft:list:delete`       | NFT 删除   | button | 操作列"删除"       |
| `nft:list:add_flow`     | 新增流转记录   | button | 详情抽屉内"新增流转记录" |
| `nft:audit:view`        | NFT 审核查看 | menu   | 访问审核页面        |
| `nft:audit:preview`     | NFT 预览   | button | 操作列"预览"       |
| `nft:audit:pass`        | NFT 审核通过 | button | "通过"          |
| `nft:audit:reject`      | NFT 审核驳回 | button | "驳回"          |
| `nft:audit:retry`       | 上链任务重试   | button | "重试"          |

### 🏆 赛事模块 (competition) — 现有 3 → 扩展到 13

| code                           | 中文名    | type   | 对应按钮            |
| ------------------------------ | ------ | ------ | --------------- |
| `competition:list:view`        | 赛事列表查看 | menu   | 访问赛事页面          |
| `competition:list:create`      | 赛事新增   | button | 工具栏"新增赛事"       |
| `competition:list:edit`        | 赛事编辑   | button | 操作列"编辑"         |
| `competition:list:delete`      | 赛事删除   | button | 操作列"删除"         |
| `competition:list:publish`     | 赛事发布   | button | "发布"按钮          |
| `competition:list:result`      | 成绩管理   | button | "成绩"按钮          |
| `competition:list:verify`      | 报名核验   | button | "核验"按钮          |
| `competition:list:status_flow` | 状态流转   | button | 报名中→集鸽中→比赛中→已结束 |
| `competition:verify:view`      | 核验列表查看 | menu   | 访问核验页面          |
| `competition:verify:start`     | 开始核验   | button | "开始核验"          |
| `competition:verify:detail`    | 核验详情   | button | "查看详情"          |
| `competition:result:view`      | 成绩列表查看 | menu   | 访问成绩页面          |
| `competition:result:delete`    | 成绩删除   | button | 成绩页面"删除"        |

### 🕊️ 公棚模块 (loft) — 现有 4 → 扩展到 10

| code                      | 中文名    | type   | 对应按钮          |
| ------------------------- | ------ | ------ | ------------- |
| `loft:list:view`          | 公棚列表查看 | menu   | 访问公棚页面        |
| `loft:list:create`        | 公棚创建   | button | 工具栏"创建公棚"     |
| `loft:list:edit`          | 公棚编辑   | button | "编辑"          |
| `loft:list:delete`        | 公棚删除   | button | "删除"          |
| `loft:list:toggle_status` | 营业状态切换 | button | Switch 营业中/停业 |
| `loft:list:pigeons`       | 存棚鸽只管理 | button | "存棚鸽只"入口      |
| `loft:audit:view`         | 公棚审核查看 | menu   | 访问审核页面        |
| `loft:audit:detail`       | 审核详情   | button | "查看详情"        |
| `loft:audit:pass`         | 公棚审核通过 | button | "通过"          |
| `loft:audit:reject`       | 公棚审核驳回 | button | "驳回"          |

### 🔨 拍卖模块 (auction) — 现有 3 → 扩展到 19

| code                        | 中文名     | type   | 对应按钮      |
| --------------------------- | ------- | ------ | --------- |
| `auction:session:view`      | 拍卖场次查看  | menu   | 访问拍卖场次页面  |
| `auction:session:create`    | 新增场次    | button | 工具栏"新增场次" |
| `auction:session:edit`      | 场次编辑    | button | "编辑"      |
| `auction:session:detail`    | 场次详情    | button | "详情"      |
| `auction:session:publish`   | 场次发布    | button | "发布"      |
| `auction:session:start`     | 开始拍卖    | button | "开始"      |
| `auction:session:end`       | 结束拍卖    | button | "结束"      |
| `auction:session:cancel`    | 取消场次    | button | "取消"      |
| `auction:session:delete`    | 场次删除    | button | "删除"      |
| `auction:session:items`     | 拍品管理入口  | button | "拍品"按钮    |
| `auction:items:view`        | 拍品列表查看  | menu   | 访问拍品管理页面  |
| `auction:items:list_create` | 上架拍品    | button | 工具栏"上架拍品" |
| `auction:items:detail`      | 拍品详情    | button | "详情"      |
| `auction:items:edit`        | 拍品编辑    | button | "编辑"      |
| `auction:items:start`       | 开拍      | button | "开拍"      |
| `auction:items:fail`        | 流拍      | button | "流拍"      |
| `auction:items:delete`      | 拍品删除    | button | "删除"      |
| `auction:deal:view`         | 成交管理查看  | menu   | 访问成交管理页面  |
| `auction:deal:manage`       | 成交确认与交割 | button | "确认付款/交割" |

### ⚖️ 仲裁模块 (arbitration) — 现有 2 → 扩展到 7

| code                       | 中文名    | type   | 对应按钮       |
| -------------------------- | ------ | ------ | ---------- |
| `arbitration:case:view`    | 仲裁案件查看 | menu   | 访问仲裁页面     |
| `arbitration:case:create`  | 登记案件   | button | 工具栏"登记案件"  |
| `arbitration:case:detail`  | 案件详情   | button | "详情"       |
| `arbitration:case:edit`    | 案件编辑   | button | "编辑"       |
| `arbitration:case:accept`  | 案件受理   | button | "受理"       |
| `arbitration:case:judge`   | 仲裁裁决   | button | "审理"（执行裁决） |
| `arbitration:case:archive` | 案件归档   | button | "归档"       |

### 🔬 基因检测模块 (detection) — 现有 2 → 扩展到 13

| code                       | 中文名     | type        | 对应按钮           |
| -------------------------- | ------- | ----------- | -------------- |
| `detection:order:view`     | 检测预约查看  | menu        | 访问预约订单页面       |
| `detection:order:detail`   | 预约详情    | button      | "详情"           |
| `detection:order:edit`     | 预约编辑    | button      | "编辑"           |
| `detection:order:confirm`  | 预约确认    | button      | "确认"           |
| `detection:order:schedule` | 预约排期    | button      | "排期"           |
| `detection:order:cancel`   | 预约取消    | button      | "取消"           |
| `detection:order:delete`   | 预约删除    | button      | "删除"           |
| `detection:report:view`    | 检测报告查看  | menu        | 访问报告页面         |
| `detection:report:create`  | 录入报告    | button      | 工具栏"录入报告"      |
| `detection:report:edit`    | 报告编辑    | button      | "编辑"           |
| `detection:report:delete`  | 报告删除    | button      | "删除"           |
| `detection:report:export`  | 报告打印/导出 | button      | 详情内"打印/导出PDF"  |
| `detection:org:manage`     | 检测机构管理  | menu+button | 访问机构页面、新增/编辑机构 |

### 📝 内容管理模块 (content) — 现有 2 → 扩展到 14

| code                     | 中文名          | type   | 对应按钮           |
| ------------------------ | ------------ | ------ | -------------- |
| `content:news:view`      | 资讯列表查看       | menu   | 访问资讯管理页面       |
| `content:news:create`    | 资讯新增         | button | 工具栏"新增资讯"      |
| `content:news:preview`   | 资讯预览         | button | 操作列"预览"        |
| `content:news:edit`      | 资讯编辑         | button | "编辑"           |
| `content:news:publish`   | 资讯发布         | button | "发布"           |
| `content:news:offline`   | 资讯下架         | button | "下架"           |
| `content:news:top`       | 资讯置顶         | button | "置顶/取消置顶"      |
| `content:news:delete`    | 资讯删除         | button | "删除"           |
| `content:news:batch`     | 资讯批量操作       | button | 批量发布/下架/删除     |
| `content:banner:view`    | Banner 列表查看  | menu   | 访问 Banner 管理页面 |
| `content:banner:create`  | Banner 新增    | button | "新增 Banner"    |
| `content:banner:edit`    | Banner 编辑    | button | "编辑"           |
| `content:banner:publish` | Banner 发布/下架 | button | "发布/下架"        |
| `content:banner:delete`  | Banner 删除    | button | "删除"           |
| `content:notice:view`    | 公告列表查看       | menu   | 访问公告管理页面       |
| `content:notice:create`  | 公告新增         | button | "新增公告"         |
| `content:notice:edit`    | 公告编辑         | button | "编辑"           |
| `content:notice:publish` | 公告发布         | button | "发布"           |
| `content:notice:delete`  | 公告删除         | button | "删除"           |

### 👥 用户管理模块 (user) — 现有 3 → 扩展到 17

| code                         | 中文名     | type   | 对应按钮        |
| ---------------------------- | ------- | ------ | ----------- |
| `user:list:view`             | 用户列表查看  | menu   | 访问用户管理页面    |
| `user:list:detail`           | 用户详情    | button | 操作列"详情"     |
| `user:list:edit`             | 用户编辑    | button | "编辑"        |
| `user:list:realname_audit`   | 实名审核    | button | "实名审核"入口    |
| `user:list:pigeon_audit`     | 鸽主资质审核  | button | "鸽主审核"入口    |
| `user:list:more_distributor` | 变更上级分销商 | button | 更多下拉        |
| `user:list:more_tag`         | 设置用户标签  | button | 更多下拉        |
| `user:list:more_coupon`      | 发放优惠券   | button | 更多下拉        |
| `user:list:more_balance`     | 调整余额    | button | 更多下拉        |
| `user:list:more_points`      | 调整积分    | button | 更多下拉        |
| `user:list:more_blacklist`   | 加入黑名单   | button | 更多下拉        |
| `user:list:more_kick`        | 强制退出登录  | button | 更多下拉        |
| `user:list:more_reset`       | 重置密码    | button | 更多下拉        |
| `user:list:more_export`      | 导出用户数据  | button | 更多下拉        |
| `user:audit:view`            | 认证审核查看  | menu   | 访问认证审核页面    |
| `user:audit:pass`            | 认证审核通过  | button | 批量通过 / 单项通过 |
| `user:audit:reject`          | 认证审核驳回  | button | 批量驳回 / 单项驳回 |
| `user:audit:retry`           | 重新提交认证  | button | "重试"        |
| `user:member:view`           | 会员等级查看  | menu   | 访问会员等级页面    |
| `user:member:create`         | 新增会员等级  | button | "新增等级"      |
| `user:member:edit`           | 会员等级编辑  | button | "编辑"        |
| `user:member:delete`         | 会员等级删除  | button | "删除"        |
| `user:member:benefit`        | 权益配置    | button | "权益配置"抽屉    |
| `user:member:recalc`         | 成长值重算   | button | "成长值重算"工具栏  |

### ⚙️ 系统管理模块 (system) — 现有 8 → 扩展到 12

| code                          | 中文名     | type        | 对应按钮         |
| ----------------------------- | ------- | ----------- | ------------ |
| `system:admin:view`           | 管理员列表查看 | menu        | 访问管理员页面      |
| `system:admin:create`         | 新增管理员   | button      | "新增管理员"      |
| `system:admin:edit`           | 管理员编辑   | button      | "编辑"         |
| `system:admin:role`           | 分配角色    | button      | "分配角色"       |
| `system:admin:reset_password` | 重置密码    | button      | "重置密码"       |
| `system:admin:toggle`         | 启用/禁用   | button      | Switch 启用/禁用 |
| `system:admin:delete`         | 管理员删除   | button      | "删除"         |
| `system:role:view`            | 角色列表查看  | menu        | 访问角色页面       |
| `system:role:create`          | 新增角色    | button      | "新增角色"       |
| `system:role:edit`            | 编辑权限    | button      | "编辑权限"       |
| `system:role:delete`          | 角色删除    | button      | "删除"         |
| `system:dict:manage`          | 字典管理    | menu+button | 字典增删改        |
| `system:config:manage`        | 系统配置管理  | menu        | 保存系统配置       |
| `system:audit:view`           | 操作日志查看  | menu        | 访问审计日志       |
| `system:audit:detail`         | 日志详情    | button      | "详情"         |

### 📊 数据中心模块 (statistics/dashboard) — 现有 1 → 保持

| code              | 中文名    | type |
| ----------------- | ------ | ---- |
| `statistics:view` | 数据统计查看 | menu |
| `dashboard:view`  | 工作台查看  | menu |

## 前端 Tree 自动分组效果

因为前端 `buildTreeFromGroups` 按冒号分段：

```
基因档案 (gene)              ← 一级（module）
  ├─ 基因档案列表 (list)     ← 二级（page）
  │   ├─ 查看                ← 三级（action）
  │   ├─ 新增
  │   ├─ 详情
  │   ├─ 编辑
  │   └─ 删除
  ├─ 档案审核 (audit)
  │   ├─ 查看
  │   ├─ 通过
  │   └─ 驳回
  └─ 档案详情 (detail)
      └─ 新增检测记录
```

## Functional Requirements

* **FR-1**: 后端 `db.ts` permissions 数组从 35 条扩展到 \~120 条，覆盖所有页面操作按钮

* **FR-2**: 保留原有 35 条旧权限 code 向后兼容（`INSERT OR IGNORE` 不会重复插入）

* **FR-3**: 前端 Role.tsx 的 CODE\_SEGMENT\_LABELS 补充新 segment 的中文映射（`news`→资讯管理, `banner`→Banner管理, `session`→拍卖场次, `items`→拍品管理, `deal`→成交管理, `org`→检测机构, `result`→成绩管理, `verify`→报名核验 等）

* **FR-4**: 所有新权限的 name 字段为中文，type 为 menu（一级/二级节点）或 button（三级操作）

## Non-Functional Requirements

* **NFR-1**: `npx tsc --noEmit` 退出码 0

* **NFR-2**: 浏览器 console 无新增警告

* **NFR-3**: 后端 `/api/system/permissions` 接口返回扩展后的完整列表

* **NFR-4**: 前端 Tree 组件自动呈现三级分组结构，父子联动正常

## Constraints

* **Technical**: SQLite 使用 `INSERT OR IGNORE`，旧数据不受影响

* **Dependencies**: Tree 组件按冒号分段逻辑已实现，无需修改

* **Migration**: 由于使用 `INSERT OR IGNORE`，后端启动时自动补充新权限，无需手动迁移

## Assumptions

* 假设 1: 前端 CODE\_SEGMENT\_LABELS 已包含大部分旧 segment，新增的 segment（news, banner, notice, session, items, deal, org, result, verify）需要补充

* 假设 2: 后端权限加载接口无需修改（已按 module 分组）

* 假设 3: 旧角色绑定的旧 code 继续生效，新权限只对新角色或重新分配角色时生效

## Acceptance Criteria

### AC-1: 权限种子数量扩展

* **Given**: 后端 db.ts 的 permissions 数组

* **When**: 运行后端并查询 `SELECT COUNT(*) FROM permissions`

* **Then**: 权限总数从 35 增加到 \~120（允许 ±5 误差）

* **Verification**: `programmatic`

### AC-2: Tree 三级分组正确渲染

* **Given**: 打开角色新增弹窗

* **When**: 观察权限 Tree

* **Then**: 显示三级结构（模块 → 页面 → 操作），如"内容管理 → 资讯管理 → 查看/新增/编辑/发布/删除"

* **Verification**: `human-judgment`

### AC-3: 中文名称完整覆盖

* **Given**: 权限 Tree 中每个节点

* **When**: 展开查看所有层级

* **Then**: 所有节点标题都是中文（module/page/action segment 都有中文映射）

* **Verification**: `human-judgment`

### AC-4: 旧权限数据兼容

* **Given**: 数据库中已有角色绑定了旧权限 code

* **When**: 后端启动

* **Then**: 旧角色的权限不丢失（INSERT OR IGNORE 不影响已有数据）

* **Verification**: `programmatic`

### AC-5: TypeScript 编译通过

* **Given**: 修改完成

* **When**: `npx tsc --noEmit`

* **Then**: 退出码 0

* **Verification**: `programmatic`

### AC-6: 具体页面的子功能全部呈现

* **Given**: 打开角色新增弹窗

* **When**: 展开"内容管理"模块

* **Then**: 能看到"资讯管理 → 新增/编辑/发布/下架/置顶/删除"、"Banner 管理 → 新增/编辑/发布/删除"、"公告管理 → 新增/编辑/发布/删除"

* **Verification**: `human-judgment`

### AC-7: 用户管理子功能完整

* **Given**: 打开角色新增弹窗

* **When**: 展开"用户管理"模块

* **Then**: 能看到"用户列表 → 详情/编辑/实名审核/鸽主审核/更多操作(10项)"、"认证审核 → 通过/驳回"、"会员等级 → 新增/编辑/删除/权益配置"

* **Verification**: `human-judgment`

