# 腾讯地图定位修复 - Product Requirement Document

## Overview
- **Summary**: 修复"创建公棚"页面中腾讯地图定位功能无法正常使用的问题。当前创建表单只显示一个占位提示框"地图选点功能将在保存后可用"，管理员无法在创建公棚时直接使用地图选点；即便在编辑模式下，腾讯地图的逆地理编码（地址回填）和地址搜索功能也未完整实现。
- **Purpose**: 让管理员在创建和编辑公棚时都能完整使用腾讯地图的定位、搜索、逆地理编码功能，确保公棚地址与经纬度正确联动。
- **Target Users**: 公棚管理员、超级管理员

## Goals
- 创建公棚页面时直接渲染地图组件（而非占位符）
- 腾讯地图支持点击选点后自动回填地址
- 腾讯地图支持地址搜索定位
- 保持编辑公棚页面的地图功能正常

## Non-Goals (Out of Scope)
- 不修改高德/百度地图的现有功能
- 不修改坐标转换逻辑
- 不新增地图配置项

## Background & Context
- 项目使用 React + Ant Design Pro Components
- 地图组件为 `LoftMapPicker.tsx`，支持高德/百度/腾讯三家地图
- 当前问题：在 `List.tsx` 中创建模式仅显示占位符 `<div>地图选点功能将在保存后可用</div>`，不渲染地图组件
- 腾讯地图的 `reverseGeocode` 和 `handleSearch` 分支未完整实现

## Functional Requirements
- **FR-1**: 创建公棚时应直接显示 `LoftMapPicker` 组件（与编辑模式一致）
- **FR-2**: 腾讯地图点击选点后应通过逆地理编码服务回填地址
- **FR-3**: 腾讯地图地址搜索应使用 TMap.service.Geocoder 完成地理编码定位
- **FR-4**: 搜索框与重新定位按钮在腾讯地图下应正常工作

## Non-Functional Requirements
- **NFR-1**: 地图加载失败时应有明确错误提示
- **NFR-2**: 经纬度与地址联动不得出现死循环

## Constraints
- **Technical**: 腾讯地图 JSAPI v2.0（GL JS），地理编码需加载 `service` 库
- **Dependencies**: 后端 `/api/system/map-config` 接口已返回 `tencent_key`

## Assumptions
- 管理员已在"系统配置 → 地图配置"中启用腾讯地图并填写了有效的 API Key
- 腾讯地图 API Key 为合法的 Web 端 JSAPI Key

## Acceptance Criteria

### AC-1: 创建公棚页显示地图
- **Given**: 管理员已在系统配置中启用腾讯地图
- **When**: 管理员打开"创建公棚"弹窗
- **Then**: 右侧地图区域显示可交互的腾讯地图（而非占位符）
- **Verification**: `programmatic`

### AC-2: 腾讯地图点击选点回填地址
- **Given**: 创建/编辑公棚弹窗已打开，腾讯地图已加载
- **When**: 管理员在地图上点击选点
- **Then**: 经纬度更新，地址字段通过逆地理编码自动回填
- **Verification**: `programmatic`

### AC-3: 腾讯地图地址搜索
- **Given**: 腾讯地图已加载
- **When**: 管理员在搜索框输入地址并点击搜索
- **Then**: 地图定位到匹配地址，标记点和地址同步更新
- **Verification**: `programmatic`

### AC-4: 重新定位按钮可用
- **Given**: 腾讯地图已加载
- **When**: 管理员点击"重新定位"按钮
- **Then**: 地图尝试使用浏览器定位当前位置
- **Verification**: `human-judgment`

## Open Questions
- 无
