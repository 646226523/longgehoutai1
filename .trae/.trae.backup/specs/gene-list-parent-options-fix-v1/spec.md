# 基因档案新增抽屉 parentOptions TypeError 修复 V1 - Product Requirement Document

## Overview
- **Summary**: 修复基因档案管理页面点击「新增档案 / 编辑」抽屉打开或渲染时抛出 `TypeError: parentOptions.filter is not a function` 的白屏崩溃，对父/母下拉数据源增加类型校验与运行时兜底，并同步修复 services/gene.ts 对 `/gene/profiles/options` 返回值的数组化归一，使组件在异常响应、初始空态、编辑态（排除自身）三条路径均不再抛错。
- **Purpose**: 解决 P0 级阻断性 BUG，恢复基因档案新增/编辑核心功能可用，避免运营录入工作被中断。
- **Target Users**: 平台运营 / 录入员 / 管理员（使用基因档案新增、编辑抽屉的所有登录用户）。

## Goals
- 点击「新增档案」按钮抽屉正常打开，控制台无 TypeError 白屏。
- 编辑任一条档案时，父鸽/母鸽下拉自动过滤掉「当前编辑的档案 id」，列表可渲染。
- 对 `/gene/profiles/options` 返回值做运行时数组化校验；若后端返回 `{list,total}`、`null`、`undefined` 或对象，前端一律安全归一为空数组或数组本身。
- 类型安全：TS 静态类型与运行时归一结果一致，不再出现「Promise<T> 类型是数组，运行时却是对象」的错配。

## Non-Goals (Out of Scope)
- 不重构基因档案分页 / 搜索接口（`getGeneProfiles`）。
- 不新增父/母异步搜索（远程搜索）功能。
- 不修改抽屉布局或表单字段定义（除增加安全兜底逻辑外）。

## Background & Context
- 报错堆栈：`TypeError: parentOptions.filter is not a function` at GeneList `sire_id` ProFormSelect options 属性。
- 当前实现：`useState<GeneProfileOption[]>([])` 声明为数组，但 `getGeneProfileOptions()` 经 axios 响应拦截器返回 `res.data`；若后端某次响应包装为 `{code:0,data:{list,total}}`（被其它接口共用包装）或拦截器在 401/刷新 token 路径下返回非数组，会把非数组写进 state，下次渲染时 `.filter` 立即抛错。
- 编辑态额外风险：`o.id !== editing?.id` 中 `editing` 为 null 时，`undefined !== undefined` 不报错，但 `parentOptions` 为对象时，`filter` 本身不可调用。

## Functional Requirements
- **FR-1**: 父/母下拉的 options 计算永远基于「可调用 filter 的数组」；渲染路径不得直接对未验证变量调用数组方法。
- **FR-2**: `getGeneProfileOptions` service 层显式归一数组：若返回是数组原样返回；若是 `{list}` 则取 `list`；其它情况返回空数组并在控制台记录 `warn`（不弹窗阻断用户）。
- **FR-3**: `loadParentOptions` 的 `.then(setParentOptions)` 改为 `.then(normalized => setParentOptions(Array.isArray(normalized) ? normalized : []))`，保证 state 永不为非数组。
- **FR-4**: 编辑态打开抽屉时，父/母下拉必须过滤掉 `editing.id`（不能把自己选为父母）；新增态 `editing=null` 时不过滤任何项。
- **FR-5**: 新增 / 编辑抽屉提交成功、取消、重开等全流程不得再触发 TypeError。

## Non-Functional Requirements
- **NFR-1 (Robustness)**: 即使后端临时返回非数组或拦截器重放请求异常，组件不得白屏，必须保持抽屉可交互，下拉显示空选项或已有缓存选项。
- **NFR-2 (Type Safety)**: `type-check` 必须通过（exit 0），不得新增 TS 警告。
- **NFR-3 (Performance)**: 归一逻辑 O(n) 或 O(1)，不得出现全量深拷贝/序列化/反序列化。
- **NFR-4 (Build)**: `npm run build` 必须通过（exit 0）。

## Constraints
- **Technical**: React 18 + TypeScript 5 + Ant Design 5 Pro Components；不得引入新依赖（禁止加 lodash/zod 等，纯 TS 运行时判断即可）。
- **Business**: 修复需保持现有业务行为一致：新增默认 `gender=unknown, status=1`，编辑回填 `sire_id/dam_id`。
- **Dependencies**: 仅依赖现有的 `services/gene.ts`、`services/request.ts` 拦截器、`useAntdApp`。

## Assumptions
- 后端 `/gene/profiles/options` 理论上返回数组，但存在历史路径或中间代理把其包装为 `{list,total}` 对象。
- 用户浏览器 localStorage access_token 已有效；401 刷新路径由 request.ts 已处理。
- 抽屉 `destroyOnClose: true`，每次打开会重新执行 render，但 `parentOptions` state 在组件生命周期内缓存（通过 `if (!parentOptions.length)` 懒加载）。

## Acceptance Criteria

### AC-1: 点击新增档案不再白屏
- **Given**: 基因档案列表页渲染成功，`parentOptions` 初始 `[]`，后端 `/gene/profiles/options` 可正常返回数组或被注入为对象。
- **When**: 用户点击「新增档案」按钮（`openCreate` → 抽屉 `open=true`）。
- **Then**: 抽屉正常显示表单字段，控制台无 `parentOptions.filter is not a function`，ErrorBoundary 不触发 Something went wrong。
- **Verification**: `programmatic` (控制台错误计数为 0 + DOM 断言抽屉出现标题 `新增基因档案`)。

### AC-2: 编辑档案抽屉打开过滤自身 id
- **Given**: 列表中存在一条 id=N 的档案，父/母下拉 options 中包含该项。
- **When**: 用户点「编辑」打开抽屉 → `editing.id=N`。
- **Then**: 父/母下拉渲染的 options 均不包含 `id=N` 的选项。
- **Verification**: `programmatic` (evaluate `.filter(o=>o.value===N).length === 0` 对两个下拉 options)。

### AC-3: 后端返回非数组时安全兜底
- **Given**: mock `getGeneProfileOptions` 直接 resolve 为 `{list:[...], total:10}` 或 `null` 或 `undefined`。
- **When**: 进入页面并触发 `loadParentOptions`。
- **Then**: `parentOptions` state 为数组（空数组或 list 内容），再次点新增/编辑均不抛 TypeError。
- **Verification**: `programmatic` (type assertion + console 无 error)。

### AC-4: 类型检查与构建通过
- **Given**: 代码变更已完成。
- **When**: 在 admin-web 目录执行 `npm run type-check` 与 `npm run build`。
- **Then**: 两命令均 exit 0。
- **Verification**: `programmatic`。

## Open Questions
- [x] 是否需要同时修复 services/gene.ts 返回值归一（是：一并做双层保险 —— service 层 + 组件层）。
- [ ] 是否需要在其它用到 `parentOptions` 模式的页面（血统详情、鸽舍列表等）同步统一兜底（本 PRD 仅修 List.tsx，后续可批量）。
