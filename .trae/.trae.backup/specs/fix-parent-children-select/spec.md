# 修复亲子关系选择器 - 产品需求文档

## Overview
- **Summary**: 修复基因档案表单中"父鸽/母鸽"选择器无法显示数据库中已有选项的问题，同时增加手动输入新鸽名的能力。
- **Purpose**: 当前 SearchSelect 组件在没有输入关键词时直接清空选项，导致用户无法看到现有数据；同时缺少手动添加能力，限制了数据录入效率。
- **Target Users**: 后台管理员、基因档案录入人员

## Goals
- 修复父鸽/母鸽下拉选择器在聚焦时加载现有基因档案数据
- 支持手动输入不存在的鸽名作为新选项（tags 模式）
- 保持与现有后端接口的兼容性
- 优化 SearchSelect 组件的通用行为

## Non-Goals (Out of Scope)
- 不修改后端数据库表结构
- 不修改鸽主选择器的行为（它已正常工作）
- 不新增父鸽/母鸽档案的自动创建功能（仅支持选择/输入）

## Background & Context
- 基因档案表单位于 `admin-web/src/pages/gene/GeneForm.tsx`
- SearchSelect 通用组件位于 `admin-web/src/components/SearchSelect.tsx`
- 后端搜索接口 `GET /api/gene/profiles/search` 已支持空关键词（返回全部档案）
- 父鸽/母鸽字段使用 `sire_id` 和 `dam_id` 存储选中档案的 ID

## Functional Requirements

### FR-1: SearchSelect 组件支持聚焦加载
- 当用户聚焦到 SearchSelect 输入框时，自动触发一次无关键词搜索，加载默认选项列表
- 修改空关键词处理逻辑：不再直接清空选项，而是调用 `onSearch('')` 加载默认数据

### FR-2: SearchSelect 组件支持手动输入（tags 模式）
- 新增 `mode` 属性支持
- 当 `mode='tags'` 时，允许用户输入任意文本，即使该值不在选项列表中也可选中
- 选中的自定义值通过 `onChange` 回调传递

### FR-3: GeneForm 中父鸽/母鸽选择器适配
- 父鸽/母鸽 SearchSelect 组件启用 tags 模式
- 聚焦时自动加载现有档案数据
- 用户输入不存在的鸽名时，可作为自定义值选中并保存
- 编辑模式下正确回显已选父鸽/母鸽信息

### FR-4: 编辑模式回显
- 编辑已有档案时，若存在 sire_id/dam_id，需加载对应档案的显示名称
- 通过详情接口获取父鸽/母鸽的 ring_number + name 进行回显

## Non-Functional Requirements

### NFR-1: 性能
- 聚焦加载默认数据的请求应在 500ms 内返回
- 搜索防抖保持 300ms 不变

### NFR-2: 兼容性
- 现有使用 SearchSelect 的其他组件（如鸽主选择）行为不变
- tags 模式仅在显式指定时启用

### NFR-3: 代码质量
- TypeScript 类型定义完整
- 无新增 ESLint 警告

## Constraints
- **Technical**: React + TypeScript + Ant Design v5
- **Dependencies**: 仅可修改现有文件，不新增第三方依赖
- **Backend**: 后端接口已就绪，无需修改

## Assumptions
- 后端 `/api/gene/profiles/search` 接口在空关键词时返回最新 20 条档案
- 父鸽/母鸽档案数据量在 20 条以内可覆盖大部分场景
- 用户手动输入的新鸽名在提交时作为字符串保存（sire_id/dam_id 字段可接受字符串或数字）

## Acceptance Criteria

### AC-1: 聚焦加载现有数据
- **Given**: 数据库中存在基因档案记录
- **When**: 用户点击父鸽或母鸽输入框
- **Then**: 下拉列表自动显示已有档案选项（足环号 + 鸽名）
- **Verification**: `programmatic`

### AC-2: 搜索过滤
- **Given**: 下拉列表已加载现有选项
- **When**: 用户输入关键词（如足环号或鸽名）
- **Then**: 列表实时过滤匹配的结果
- **Verification**: `programmatic`

### AC-3: 手动输入新值
- **Given**: 父鸽/母鸽选择器启用了 tags 模式
- **When**: 用户输入一个不存在的鸽名并按回车
- **Then**: 该值被选中，表单状态更新为新输入的文本
- **Verification**: `programmatic`

### AC-4: 选中已有档案
- **Given**: 下拉列表显示了现有档案
- **When**: 用户点击某个档案选项
- **Then**: 选中值为该档案的 ID，显示为足环号+鸽名
- **Verification**: `programmatic`

### AC-5: 编辑模式回显
- **Given**: 编辑一个已有档案，该档案已关联父鸽和母鸽
- **When**: 表单加载完成
- **Then**: 父鸽和母鸽字段显示已关联档案的正确名称
- **Verification**: `programmatic`

### AC-6: 其他组件不受影响
- **Given**: 鸽主选择器使用 SearchSelect 组件
- **When**: 正常使用鸽主搜索和选择
- **Then**: 功能行为与修改前完全一致
- **Verification**: `human-judgment`

### AC-7: 构建通过
- **Given**: 所有修改完成
- **When**: 运行 `npm run build`
- **Then**: 构建成功，无 TypeScript 错误
- **Verification**: `programmatic`

## Open Questions
- [ ] 手动输入的新鸽名在提交时，后端如何处理？是创建新档案还是仅保存文本？（当前方案：保存为字符串，后端 sire_id/dam_id 字段接受数字 ID 或字符串名称）
