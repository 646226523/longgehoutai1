# Tasks: 会员等级成长值差值动态计算

## Task 1: 后端新增等级进度计算字段（两处接口 + 工具函数）

**优先级**: high
**依赖**: 无

**改动范围**: `admin-api/src/routes/user.ts`

### 实现步骤

1. 在 `user.ts` 顶部（路由定义前）新增纯函数 `computeLevelProgress(levelId: number | null, growth: number, allLevels: LevelRow[])`，输入等级 ID、成长值、所有可用等级（按 sort ASC），返回 `{ level_min_growth, next_level_min_growth, growth_to_next }` 三字段，无等级时三字段全 null。
2. 列表接口 `GET /users`（约 68 行）的 SQL 改为同时查出 member_levels 所有行（或在接口开头预查一次缓存到局部变量），在 map 输出每项用户时调用 computeLevelProgress 追加三字段。
3. 详情接口 `GET /users/:id`（约 251 行）同上。
4. 注意：SQL 现有 LEFT JOIN member_levels ml 只拿当前等级；但还需要拿到下一级的 min_growth，最简单是单独 `SELECT * FROM member_levels WHERE status=1 ORDER BY sort ASC` 查一次缓存，然后在 JS 里查下一级。

### Test Requirements

#### TR-1.1（rule）computeLevelProgress 函数逻辑正确

给定 levels=[{id:1,min_growth:0},{id:2,min_growth:500},{id:3,min_growth:2000},{id:4,min_growth:8000}]，断言：
- levelId=4, growth=8500 → {level_min_growth:8000, next_level_min_growth:null, growth_to_next:null}
- levelId=1, growth=100 → {level_min_growth:0, next_level_min_growth:500, growth_to_next:400}
- levelId=2, growth=1500 → {level_min_growth:500, next_level_min_growth:2000, growth_to_next:500}
- levelId=null → {level_min_growth:null, next_level_min_growth:null, growth_to_next:null}

证据：Node.js 单独调用 /api/user/users/1 打印返回 JSON，对比期望值。

#### TR-1.2（rule）响应时间可接受

列表接口 100 条用户的响应时间 ≤ 300ms（等级表仅几行，额外查询可忽略）。

证据：Node.js `console.time` 包裹 API 调用。

---

## Task 2: 前端 UserItem 接口 + 卡片渲染去硬编码

**优先级**: high
**依赖**: Task 1 完成（确保后端已返回新字段）

**改动范围**: 
- `admin-web/src/services/user.ts` — UserItem/UserDetail 接口
- `admin-web/src/pages/user-member/UserList.tsx` — 约 1255-1297 行会员卡渲染块

### 实现步骤

1. services/user.ts: 在 UserItem 接口和 UserDetailItem 接口新增：
   ```ts
   level_min_growth?: number | null;
   next_level_min_growth?: number | null;
   growth_to_next?: number | null;
   ```
2. UserList.tsx 会员卡渲染逻辑改造：
   - 删除 `1000` 硬编码常量
   - 进度条：
     ```
     if (next_level_min_growth != null && level_min_growth != null && next_level_min_growth > level_min_growth) {
       const pct = ((record.growth_value - level_min_growth) / (next_level_min_growth - level_min_growth)) * 100;
       percent = Math.min(pct, 100);
     } else {
       percent = 100;
     }
     ```
   - 差值文本：
     ```
     {record.growth_to_next != null
       ? `还差 ${record.growth_to_next.toLocaleString()}`
       : '已达最高等级 ⭐'}
     ```

### Test Requirements

#### TR-2.1（rule）TypeScript 编译通过

`npx tsc --noEmit` 退出码 0。

证据：终端命令输出。

#### TR-2.2（rule）硬编码 1000 完全移除

`grep "1000" admin-web/src/pages/user-member/UserList.tsx` 在会员卡块附近无匹配（排除 unrelated 引用）。

证据：Grep 输出。

---

## Task 3: 验收 + Git 提交

**优先级**: medium
**依赖**: Task 1 + Task 2

### 实现步骤

1. 启动后端（若未运行），用 Node.js 脚本调用 /api/user/users/1 验证返回字段。
2. 启动前端，agent-browser 验证三种场景（最高等级 / 中间等级 / 无等级）。
3. git add + commit，推送到远程。

### Test Requirements

#### TR-3.1（rule）三种场景浏览器验收

| 用户 | growth | level | 期望显示 |
|---|---|---|---|
| 李建国 | 8500 | diamond(4) | 进度 100%，文本"已达最高等级 ⭐" |
| 模拟青铜 | 100 | bronze(1) | 进度 20%（0→500 区间），文本"还差 400" |
| 模拟无等级 | 0 | null | 显示"暂无会员等级"占位卡片 |

证据：浏览器截图 + DOM 文本 grep。

#### TR-3.2（rule）git push 成功

远程 main 分支包含本次 commit。

证据：`git log --oneline -1` + `git push` 退出码 0。
