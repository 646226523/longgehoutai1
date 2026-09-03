# 移除角色列表页的"角色编码"列与筛选

## Overview

* **Summary**: 从角色列表 Table columns 中删除 `dataIndex: 'code'` 这一列，同时隐藏顶部搜索区的"角色编码"筛选框

* **Purpose**: 弹窗里已经移除了角色编码输入框，列表页继续显示/搜索角色编码对业务人员没有意义

* **Target Users**: 系统管理员（角色管理页面使用者）

## Goals

* 删除 Table columns 中定义角色编码列的那一行

* TypeScript 编译零错误

* 列表不再显示"角色编码"列，顶部筛选也不再出现

## Non-Goals

* 不修改后端接口、不修改数据库

* 不删除 RoleItem 类型中的 code 字段（其他地方可能用到）

* 不删除角色列表返回数据中的 code 字段

## Constraints

* 仅修改 Role.tsx 中 columns 数组定义

## Acceptance Criteria

### AC-1: 角色列表不再显示编码列

* **Given**: 打开角色权限页面

* **When**: 观察表格列

* **Then**: 看到 ID / 角色名称 / 描述 / 类型 / 状态 / 创建时间 / 操作，没有"角色编码"

* **Verification**: `human-judgment`

### AC-2: 顶部筛选不再出现编码输入框

* **Given**: 角色权限页面顶部搜索区

* **When**: 观察筛选字段

* **Then**: 没有"角色编码"输入框

* **Verification**: `human-judgment`

### AC-3: TypeScript 编译通过

* **Given**: 修改完成

* **When**: `npx tsc --noEmit`

* **Then**: 退出码 0

* **Verification**: `programmatic`

