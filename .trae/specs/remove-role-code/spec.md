# 取消角色编码字段 - 简化后台创建角色流程

## Overview

* **Summary**: 从新增/编辑角色弹窗中移除"角色编码"输入框。前端在提交时根据角色名称自动生成唯一 code，后端完全不用改动（code 字段对后端仍是必填）

* **Purpose**: 后台操作人员不懂英文编码，手动填写 code 容易出错且增加心智负担。自动化生成既保证数据完整性又让界面更友好

* **Target Users**: 系统管理员（创建/编辑角色时不再需要理解"编码"概念）

## Goals

* 从角色创建/编辑弹窗 UI 中移除 code 输入框

* 提交时自动生成唯一 code 传给后端

* 零后端改动、零数据库改动、零现有角色数据影响

* TypeScript 编译零错误

## Non-Goals

* **不修改数据库表结构**（roles 表的 code 列保持 NOT NULL）

* **不修改后端路由**（POST / PUT 仍按原逻辑校验 code 必填）

* **不修改角色列表页面**（列表仍显示 code 列，作为技术字段展示）

## Background & Context

* 当前 Role.tsx 中 `ProFormText name="code"` 是必填字段（line 1017-1025）

* 后端 role.ts POST 路由校验 `if (!code || !name)` 并写入数据库

* 现有角色（超级管理员等）的 code 保持不变

* 角色列表页面（Table）显示 code 列，保留作为调试/查看用途

## 自动生成 code 策略

采用简洁可靠方案：`role_` + 当前时间戳（毫秒）

* 格式：`role_1727000000000`

* 唯一性：毫秒级时间戳冲突概率极低；如有冲突后端会返回 409，前端捕获后加 1 秒重试

* 为什么不用中文转拼音：需要引入 pinyin 库增加依赖、纯中文名称无法直接转英文

## Functional Requirements

* **FR-1**: 从 Role.tsx 新增/编辑表单中移除 ProFormText name="code" 组件

* **FR-2**: handleSubmit 构建 payload 时自动填充 `code: 'role_' + Date.now()`

* **FR-3**: 如果后端返回 409（编码已存在），自动重试一次（时间戳 + 1000）

* **FR-4**: 编辑模式时，code 不再展示也不让修改（当前 disabled=true，隐藏即可）

## Non-Functional Requirements

* **NFR-1**: TypeScript 编译零错误

* **NFR-2**: 现有角色列表、编辑、删除功能不受影响

## Constraints

* **Technical**: 必须保持后端接口契约不变（后端仍期望 code 字段）

* **Dependencies**: 无新依赖

## Assumptions

* 假设 1: 时间戳生成 code 的唯一性足够（同一毫秒同时创建角色的概率可忽略）

* 假设 2: 前端发送的 code 格式对后端无特殊要求（后端只做 NOT NULL 检查 + 唯一性检查）

## Acceptance Criteria

### AC-1: UI 中不再出现角色编码输入框

* **Given**: 打开新增或编辑角色弹窗

* **When**: 观察基本信息 Card

* **Then**: 只看到角色名称、状态、描述三个字段，看不到"角色编码"

* **Verification**: `human-judgment`

### AC-2: 新增角色成功提交

* **Given**: 填写角色名称后点击确认

* **When**: 前端构建 payload

* **Then**: payload 中包含自动生成的 code（如 `role_1727...`），后端接受并创建成功

* **Verification**: `programmatic`

### AC-3: 编辑角色正常工作

* **Given**: 打开编辑已有角色的弹窗

* **When**: 修改名称/描述/状态后保存

* **Then**: code 字段不会传给后端（或传原 code），编辑成功

* **Verification**: `programmatic`

### AC-4: TypeScript 编译通过

* **Given**: 修改完成

* **When**: `npx tsc --noEmit`

* **Then**: 退出码 0

* **Verification**: `programmatic`

