# 修复 Ant Design Select `onDropdownVisibleChange` 弃用警告

## Overview

* **Summary**: 将 `Role.tsx` 中 Select 组件已弃用的 `onDropdownVisibleChange` 属性替换为 `onOpenChange`（Ant Design 5.x 新 API）

* **Purpose**: 消除浏览器 console 中持续出现的 `[antd: Select] onDropdownVisibleChange is deprecated` 警告

* **Target Users**: 所有打开角色管理页面的管理员

## Goals

* 消除 Role.tsx 中的这条 console 弃用警告

* 保持功能等价（懒加载逻辑不变）

* TypeScript 编译零错误

## Non-Goals

* 不修复项目中其他文件可能存在的同类问题（本次 Grep 确认只此一处）

* 不修改 Select 的任何其他属性或行为

## Background & Context

* Ant Design 5.x 将 `Select.onDropdownVisibleChange` 重命名为 `onOpenChange`

* 两者签名相同：`(open: boolean) => void`

* 位置：`p:\龙鸽项目\longgehoutai\admin-web\src\pages\system\Role.tsx` 第 1072 行

* 触发处：角色弹窗左栏"从现有角色复制"的 Select 组件，懒加载角色列表的打开回调

## Functional Requirements

* **FR-1**: 将 `onDropdownVisibleChange={(open) => { ... }}` 改为 `onOpenChange={(open) => { ... }}`

* **FR-2**: 回调内部逻辑完全不变

## Non-Functional Requirements

* **NFR-1**: TypeScript 编译零错误

* **NFR-2**: 浏览器 console 无该弃用警告

## Constraints

* **Technical**: 仅一处修改，文件路径固定

* **Dependencies**: Ant Design 5.17.4

## Acceptance Criteria

### AC-1: 属性名已替换

* **Given**: Role.tsx 存在 `onDropdownVisibleChange` 字符串

* **When**: 搜索该字符串

* **Then**: 结果为零（已不存在）

* **Verification**: `programmatic`

### AC-2: 功能等价

* **Given**: 打开角色弹窗中的"从现有角色复制" Select

* **When**: 首次展开下拉

* **Then**: 角色列表懒加载正常触发（回调仍然执行）

* **Verification**: `human-judgment`

### AC-3: Console 零警告

* **Given**: 打开角色管理页面，打开新增角色弹窗

* **When**: 展开"从现有角色复制"下拉

* **Then**: Console 无 `[antd: Select] onDropdownVisibleChange is deprecated` 警告

* **Verification**: `programmatic`

### AC-4: TypeScript 编译通过

* **Given**: 修改完成

* **When**: `npx tsc --noEmit`

* **Then**: 退出码 0

* **Verification**: `programmatic`

