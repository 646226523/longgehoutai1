# 权限粒度扩展 - The Implementation Plan

## [x] Task 1: 后端 db.ts 权限种子扩展（核心）
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 `p:\龙鸽项目\longgehoutai\admin-api\src\db.ts` 的 permissions 数组中追加新的细粒度权限条目
  - 保留原有 35 条（INSERT OR IGNORE 保证不重复插入）
  - 新增 ~85 条，覆盖 10 个模块的所有页面操作按钮
  - 按模块分组追加，格式 `[code, 中文名, module, type, 描述]`
  - 使用 PowerShell 或代码搜索确认每条权限的 code 唯一
  - 重启后端让种子自动写入 SQLite
  - 用 `SELECT COUNT(*) FROM permissions` 验证数量增加
- **Acceptance Criteria Addressed**: AC-1, AC-4
- **Test Requirements**:
  - `programmatic` TR-1.1: `Get-Content db.ts | Select-String "'[a-z]+:[a-z]+:[a-z_]+'" | Measure-Object` 返回新条目数量约 85
  - `programmatic` TR-1.2: 后端启动后 SQLite `SELECT COUNT(*) FROM permissions` 返回 ~120
  - `programmatic` TR-1.3: 旧 35 条权限全部保留（SELECT id, code FROM permissions WHERE code IN (旧列表)）
- **Notes**: 
  - 追加位置在现有数组末尾（line 241 `];` 之前）
  - 必须用英文 code，description 用中文
  - type: menu = 页面入口权限（显示页面）, button = 操作按钮权限

## [x] Task 2: 前端 CODE_SEGMENT_LABELS 补充
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 `p:\龙鸽项目\longgehoutai\admin-web\src\pages\system\Role.tsx` 的 CODE_SEGMENT_LABELS 对象中补充新 segment 的中文映射
  - 需补充的 page 级 segment: `news→资讯管理`, `banner→Banner管理`, `notice→公告管理`, `session→拍卖场次`, `items→拍品管理`, `deal→成交管理`, `org→检测机构`, `result→成绩管理`, `verify→报名核验`, `report→检测报告`, `order→检测预约`, `member→会员等级`, `detail→详情`
  - 需补充的 action 级 segment: `create→新增`, `detail→详情`, `top→置顶`, `offline→下架`, `publish→发布`, `batch→批量操作`, `preview→预览`, `submit_audit→提交审核`, `add_flow→新增流转记录`, `qrcode→二维码` 等
  - 运行 `npx tsc --noEmit` 确认编译通过
- **Acceptance Criteria Addressed**: AC-3, AC-5
- **Test Requirements**:
  - `programmatic` TR-2.1: 搜索 Role.tsx 中 CODE_SEGMENT_LABELS 包含所有新 segment
  - `programmatic` TR-2.2: `npx tsc --noEmit` 退出码 0
- **Notes**: 
  - getLabel 函数对未知 segment 会 fallback 到 segment 本身（英文），所以必须补全
  - 可在浏览器 console 快速验证：Tree 节点不应出现纯英文的 page/action segment

## [x] Task 3: 端到端验证
- **Priority**: high
- **Depends On**: Task 1, Task 2
- **Description**: 
  - 确保后端和前端开发服务器都在运行
  - 浏览器打开角色新增弹窗，验证 Tree 渲染
  - 重点验证 AC-2（三级分组）、AC-3（全中文）、AC-6（内容管理子功能）、AC-7（用户管理子功能）
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-5, AC-6, AC-7
- **Test Requirements**:
  - `human-judgement` TR-3.1: Tree 显示三级结构（模块 → 页面 → 操作），每个节点有中文标题
  - `human-judgement` TR-3.2: 内容管理下展开能看到 资讯管理 / Banner管理 / 公告管理 三个二级节点，每个下面有对应的操作按钮
  - `human-judgement` TR-3.3: 用户管理下展开能看到 用户列表 / 认证审核 / 会员等级 三个二级节点
  - `human-judgement` TR-3.4: Console 无新增 antd 弃用警告
- **Notes**: 可配合截图记录验证结果
