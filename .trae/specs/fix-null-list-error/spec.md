# 修复 .list null 读取崩溃 - Product Requirement Document

## Overview

- **Summary**: 修复前端页面在访问 API 返回数据的 `.list` 属性时因后端返回 null 导致的 `TypeError: Cannot read properties of null (reading 'list')` 崩溃。该错误影响多个系统页面（审计日志、用户管理、拍卖等），在 HTTP 拦截器解包后端响应时返回 null，下游代码无防御性编程直接访问 `.list` 属性。

- **Purpose**: 消除生产环境中因网络波动、后端异常响应、Vite proxy 转发失败等边缘情况导致的前端白屏崩溃，提升系统健壮性。

- **Target Users**: 后台管理员（使用各业务管理页面时）

## Goals

- 修复 HTTP 拦截器在后端返回 `{code:0, data:null}` 时直接返回 null 的问题

- 为所有无保护的 `.list` 访问添加可选链或空值防御

- 修复审计日志统计卡片（今日新增/失败次数/涉及模块）因 stats 返回时机问题导致不渲染的问题

- 确保 ProTable request 回调在任何异常数据格式下都能正常返回空数组

## Non-Goals (Out of Scope)

- 不修改后端 API 数据结构

- 不重构 ProTable 使用方式

- 不引入全局错误边界组件（属于更大范围的重构）

## Background & Context

- 错误堆栈: `TypeError: Cannot read properties of null (reading 'list') at <anonymous>:1:295`

- HTTP 拦截器逻辑 (`admin-web/src/services/request.ts:52-53`): 当后端返回 `{code: 0, data: null}` 时直接 `return res.data`，即返回 null

- 前端代码广泛使用 `res.list` (无保护)，仅少数使用了 `res?.list ?? []`

- ProTable 的 request 回调期望返回 `{ data, success, total }`，若 data 为 null 会导致 ProTable 内部尝试访问 data.list

- 审计日志页面的 stats 卡片（3 个）有时不渲染，与 stats 数据获取和 UI 渲染时机有关

## Functional Requirements

- **FR-1**: HTTP 拦截器在返回 null 数据时应提供合理的默认值，而非直接返回 null

- **FR-2**: 所有 ProTable request 回调中的 `.list` 访问必须使用可选链保护

- **FR-3**: 所有独立调用 `getXxxList()` 方法后直接访问 `.list` 的位置必须使用可选链保护

- **FR-4**: 审计日志页面的统计卡片（4 个）应稳定渲染，数值正确显示

## Non-Functional Requirements

- **NFR-1**: 修复后的代码不改变任何正常数据的渲染逻辑（无回归）

- **NFR-2**: TypeScript 编译无错误，可选链后的类型正确推导

- **NFR-3**: 修复对性能无影响

## Constraints

- **Technical**: 项目使用 React + TypeScript + Ant Design + @ant-design/pro-components，需兼容现有类型定义

- **Business**: 修复范围限定在前端代码，不涉及后端 API 变更

## Assumptions

- 后端 API 正常返回时 data 字段总是有效的（object 或 array）

- 拦截器 null 返回仅发生在边缘异常场景

- ProTable 能正确处理空数组 `[]` 作为 data

## Acceptance Criteria

### AC-1: HTTP 拦截器 null 防御

- **Given**: 后端返回 `{ code: 0, data: null }` 或 Vite proxy 返回异常格式

- **When**: 前端 HTTP 拦截器解包响应

- **Then**: 拦截器返回合理的空值（空数组或空对象），而非 null

- **Verification**: `programmatic`

- **Notes**: 需要根据 API 类型决定空值类型——分页接口返回 `{list: [], total: 0}`，数组接口返回 `[]`，对象接口返回 `{}`

### AC-2: ProTable request 回调无崩溃

- **Given**: 任意 ProTable 页面的 request 回调收到 null 或 undefined 响应

- **When**: request 回调尝试解析响应

- **Then**: 回调返回 `{ data: [], success: true, total: 0 }` 而非抛出异常

- **Verification**: `programmatic`

### AC-3: 审计日志统计卡片完整渲染

- **Given**: 用户访问 `/system/audit-log` 页面

- **When**: 页面加载完成

- **Then**: 四个统计卡片（全部日志、今日新增、失败次数、涉及模块）都显示正确数值

- **Verification**: `programmatic`

### AC-4: TypeScript 编译通过

- **Given**: 所有代码修改完成

- **When**: 执行 `npx tsc --noEmit`

- **Then**: 编译零错误零警告

- **Verification**: `programmatic`

### AC-5: 浏览器端无崩溃

- **Given**: 正常访问审计日志页面

- **When**: 打开浏览器控制台

- **Then**: 无 TypeError 崩溃错误

- **Verification**: `human-judgment`

## Open Questions

- [ ] 审计日志 stats 卡片不渲染是否独立修复还是一并处理

