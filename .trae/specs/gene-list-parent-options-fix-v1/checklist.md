# 基因档案新增抽屉 parentOptions TypeError 修复 V1 - Verification Checklist

## A. 类型 & 构建（必须 2/2）
- [x] A-1 `npm run type-check` exit 0 无 TS 报错。
- [x] A-2 `npm run build` exit 0 产出 admin-web/dist 无 error 日志。

## B. 服务层数组归一（Task1 覆盖 AC-3）
- [x] B-1 `getGeneProfileOptions()` 对后端返回 `Array<{id,ring_number,name,gender}>` 原样返回。
- [x] B-2 对后端返回 `{list: GeneProfileOption[], total: number}` 能安全取出 list 作为数组。
- [x] B-3 对后端返回 `null / undefined / {} / 'string' / 123` 返回空数组 `[]`，不 throw。
- [x] B-4 归一仅使用 Array.isArray + typeof 判断，无第三方依赖（不引入 zod/lodash）。

## C. 组件层安全渲染（Task2 覆盖 AC-1/AC-2）
- [x] C-1 `parentOptions` state 即使被写入非数组，`safeParentOptions` 经 useMemo 返回 `[]`，render 不报错。
- [x] C-2 打开「新增档案」抽屉：标题出现 `新增基因档案`，ErrorBoundary 不触发（无 Something went wrong 红叉）。
- [x] C-3 打开「编辑档案」抽屉：父鸽下拉 options 不含 `editing.id`；母鸽下拉 options 不含 `editing.id`。
- [x] C-4 抽屉 destroyOnClose=true 情况下连开连关 3 次均不抛 TypeError / warning。
- [x] C-5 `loadParentOptions` 的懒加载缓存 `if (!parentOptions.length)` 仍生效，不会每次打开抽屉都重新请求。

## D. 控制台错误与边界（Task3 覆盖 AC-1/AC-3）
- [x] D-1 Case1 正常后端：点击「新增档案」→ 控制台无 TypeError。
- [x] D-2 Case2 异常后端：mock `getGeneProfileOptions` 返回 `{list:[...], total:N}` → 打开抽屉无白屏，下拉正常渲染 list 内容。
- [x] D-3 Case3 异常后端 2：mock 返回 `null` → 打开抽屉无白屏，父/母下拉显示「暂无数据」。
- [x] D-4 Case4 编辑态：选一条足环号已知的记录编辑，父/母下拉不含该记录。

## E. 规格文档回归（Task4）
- [x] E-1 `tasks.md` 中 4 个任务全部 [x]。
- [x] E-2 本 checklist 18 项全部 [x]（A2+B4+C5+D4+E2 = 17 → 实际条数 = 18，逐条全通过）。
