# 基因档案新增抽屉 parentOptions TypeError 修复 V1 - The Implementation Plan (Decomposed and Prioritized Task List)

## [x] Task 1: services/gene.ts 层对 getGeneProfileOptions 返回值做运行时数组归一
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 新增 `normalizeArray<T>(x: unknown, fallback: T[] = []): T[]` 内部 helper：若 x 本身是数组原样返回；若 x 是对象且含数组属性 `list/rows/data` 之一则返回该数组；否则返回 fallback，并 `console.warn('[gene] options not array:', x)`（不调用 message.error 避免打断操作）。
  - `getGeneProfileOptions` 返回 `await http.get<T>(...)` 后包一层 `normalizeArray`，保证 Promise resolve 出来的永远是 `GeneProfileOption[]`。
- **Acceptance Criteria Addressed**: AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-1.1: TS `type-check` 通过，`normalizeArray([...])` 返回同引用、`normalizeArray({list:[1,2]})` 返回 `[1,2]`、`normalizeArray(null)` 返回 `[]`（可在 node repl 或构建后 console 断言）。
  - `programmatic` TR-1.2: 执行 `npm run type-check && npm run build` 均 exit 0。
  - `human-judgement` TR-1.3: reviewer 审阅 normalizeArray 不得依赖任何外部库，不得对原数组 clone/map 生成新引用。
- **Notes**: helper 保持函数纯，无副作用，内部仅用 `Array.isArray`、`typeof v==='object'` 判断。

## [x] Task 2: List.tsx 组件层双重保险 —— setState 归一 + render 路径用 useMemo 派生可选项
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - `loadParentOptions()` 的 `.then(setParentOptions)` 改为 `.then(raw => setParentOptions(Array.isArray(raw) ? raw : []))`。
  - 新增 `useMemo(() => (Array.isArray(parentOptions) ? parentOptions : []), [parentOptions])` 作为 `safeParentOptions`；父鸽/母鸽 ProFormSelect 的 options 均基于 `safeParentOptions` 计算。
  - 编辑态过滤：`safeParentOptions.filter(o => editing ? o.id !== editing.id : true)`，保持语义 `新增态不过滤 / 编辑态排除自身`。
  - 可选：将 `safeParentOptions` 继续 `map(o => ({ label:`${o.ring_number} ${o.name}`, value: o.id }))` 抽成一个 `sireDamOptions` memo，保证两处复用。
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-2.1: 在浏览器 console 直接 `window.__injectBadParentOptions__` 或通过 React DevTools 把 state 写成 `{}`，打开新增抽屉不抛 TypeError，DOM 抽屉出现。
  - `programmatic` TR-2.2: 打开编辑抽屉（任选一行），DOM evaluate `sire/dam select options.value` 中不包含 `editing.id`。
  - `programmatic` TR-2.3: `npm run type-check` 无新 TS 警告。
  - `human-judgement` TR-2.4: reviewer 确认 `sireDamOptions` 使用同一个 useMemo，sire/dam 两处仅 filter 逻辑相同即可（无需重复 map）。

## [x] Task 3: 浏览器端走查验证 —— 打开基因档案页 → 新增 → 编辑 全链路无 TypeError
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - 通过 browser_use 或 integrated_browser：已登录态进入 `/gene/list`。
  - Case 1：初始空缓存 → 点「新增档案」→ 抽屉标题「新增基因档案」显示，控制台无红色 TypeError，抽屉 12 个字段渲染（ring/name/gender/breed/blood/owner_name/owner_phone/color/eye_color/birth_date/gene_sequence/photo_url/status/父鸽/母鸽）。
  - Case 2：点任一档案「编辑」→ 父/母下拉 `options` 中不含 `editing.id`；关闭抽屉再点新增；再在编辑→父下拉选择一项提交（mock 提交或真提交均可，只要不报 TypeError）。
  - Case 3：手动 `getGeneProfileOptions = () => Promise.resolve({list:[...],total:1})` 注入非数组返回 → 打开抽屉仍无白屏。
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3
- **Test Requirements**:
  - `programmatic` TR-3.1: `browser_console_messages` 中无 `TypeError: parentOptions.filter is not a function`。
  - `programmatic` TR-3.2: `document.querySelectorAll('.ant-drawer-title')` 文本包含「新增基因档案/编辑基因档案」且抽屉 open。
  - `human-judgement` TR-3.3: reviewer 截图显示抽屉打开、下拉可展开无报错。

## [x] Task 4: 规格文档回归 —— 打勾 tasks / checklist
- **Priority**: medium
- **Depends On**: Task 3
- **Description**:
  - tasks.md 本文件 [/] → [x] 全部完成。
  - checklist.md 中对应 12+ 检查点按验证结果逐项打勾，包含 type-check/build、三种注入 case、编辑过滤自身 id、ErrorBoundary 不触发。
- **Acceptance Criteria Addressed**: （文档交付）
- **Test Requirements**:
  - `human-judgement` TR-4.1: reviewer 审阅 tasks/checklist 的 [x] 与验证记录一致，未漏项。
