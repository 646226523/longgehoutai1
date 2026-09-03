# Banner 编辑数据回显修复 - 产品需求文档

## Overview
- **Summary**: 修复点击编辑 Banner 时，已保存的表单数据无法正确回显到编辑抽屉中的问题
- **Purpose**: 确保后台工作人员在编辑 Banner 时，能看到所有已保存的原始信息，便于修改
- **Target Users**: 内容运营人员、平台管理员

## Goals
- [Primary goal 1]: 修复 Banner 编辑抽屉的表单数据回显问题
- [Primary goal 2]: 确保所有字段（标题、图片、位置、排序、跳转配置、时间等）正确回显

## Non-Goals (Out of Scope)
- 不修改后端接口
- 不新增功能

## Background & Context
- 文件：`admin-web/src/pages/content/Banner.tsx`
- 组件：`BannerDrawer`
- 问题：点击编辑时，`form.setFieldsValue` 未能正确将已有数据填入表单

## 问题根因分析
1. `useEffect` 中没有先调用 `form.resetFields()` 清除旧状态
2. 某些字段值为 `undefined` 时，`setFieldsValue` 可能行为异常
3. 依赖项 `[open, editing, form]` 中，`editing` 是对象引用，可能导致 effect 不触发

## Functional Requirements
- **FR-1**: 点击编辑按钮时，表单必须显示 Banner 的所有已有数据
- **FR-2**: 标题、位置、排序权重字段正确回显
- **FR-3**: 封面图片正确回显（ImageUploader 组件显示已有图片）
- **FR-4**: 跳转类型和跳转目标正确回显
- **FR-5**: 开始时间和结束时间正确回显（Dayjs 对象）

## Non-Functional Requirements
- **NFR-1**: TypeScript 类型检查通过
- **NFR-2**: 修复后不影响新建功能

## Constraints
- **Technical**: 使用 Ant Design 5.x Form 组件

## Assumptions
- 后端接口返回的数据结构完整
- `ImageUploader` 组件支持通过 `value` prop 回显图片

## Acceptance Criteria

### AC-1: 编辑时数据正确回显
- **Given**: 已存在一个 Banner，包含标题、图片、位置、跳转配置、时间等完整信息
- **When**: 点击该 Banner 的"编辑"按钮
- **Then**: 右侧抽屉打开，表单中显示所有已有数据
- **Verification**: `human-judgment`

### AC-2: 图片正确回显
- **Given**: Banner 已有封面图片
- **When**: 打开编辑抽屉
- **Then**: ImageUploader 组件显示该图片的预览
- **Verification**: `human-judgment`

### AC-3: 新建功能不受影响
- **Given**: 点击"新建 Banner"按钮
- **When**: 抽屉打开
- **Then**: 表单显示默认值（位置：home_top，排序：0）
- **Verification**: `human-judgment`

### AC-4: TypeScript 编译通过
- **Given**: 代码已修改
- **When**: 运行 `npx tsc --noEmit`
- **Then**: 无类型错误
- **Verification**: `programmatic`

## Open Questions
- 无
