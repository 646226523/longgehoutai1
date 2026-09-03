# 公棚编辑页重构 - Product Requirement Document

## Overview
- **Summary**: 对公棚管理模块的"编辑公棚信息"功能进行全面重构，将当前简陋的 ModalForm 升级为带地图选点、地址经纬度双向联动、信息完整性补全、容量预警可视化的专业公棚运营管理工具。
- **Purpose**: 当前公棚编辑功能存在经纬度手动输入易错、字段缺失（负责人/电话/简介）、无位置可视化等问题。公棚是赛鸽赛事的基础设施，其位置数据直接影响司放地定位、空距计算、3D赛事追踪等核心功能。
- **Target Users**: 公棚管理员、鸽会工作人员

## Goals
- 实现地图选点替代手动输入经纬度，支持点击/拖拽/搜索三种定位方式
- 实现地址与经纬度双向联动（输入地址自动定位，拖拽标记自动解析地址）
- 补全公棚信息字段：负责人、联系电话、公棚简介、状态
- 实现公棚容量与存棚鸽只的使用率进度条展示
- 展示已关联赛事列表，提示位置变更的影响范围

## Non-Goals (Out of Scope)
- 公棚Logo/照片上传功能（P2，后续迭代）
- 公棚位置变更的自动影响评估与级联更新（P2）
- 新建公棚功能（当前由入驻审核创建，保持不变）

## Background & Context
- 现有地图组件：`RealMapSelector.tsx` 已实现高德/百度/腾讯三家地图的选点、坐标转换等功能
- 现有地图配置：`Config.tsx` 中已实现地图服务商与API Key配置
- 现有表单：`Loft/List.tsx` 中的 `ModalForm` 宽度仅560px，字段简单
- 现有后端：`loft.ts` 路由支持基本CRUD，数据库 `lofts` 表含 `location`（JSON文本）、`address`、`capacity` 等字段

## Functional Requirements
- **FR-1**: 编辑弹窗采用左右分栏布局：左侧表单（基础信息+位置信息+运营配置），右侧地图预览
- **FR-2**: 地图选点组件支持：在地图上点击放置标记、拖拽标记调整位置、搜索地址自动定位
- **FR-3**: 地址与经纬度双向同步：修改地址触发地理编码回填经纬度；拖拽标记触发逆地理编码回填地址
- **FR-4**: 新增字段：公棚简介（TextArea）、公棚状态（Radio：营业中/暂停/已关闭）
- **FR-5**: 容量使用率进度条：绿色(<75%)、橙色(75-90%)、红色(>90%)
- **FR-6**: 展示已关联赛事列表
- **FR-7**: 位置变更时提示影响赛事数量

## Non-Functional Requirements
- **NFR-1**: 地图加载失败时回退到SVG静态地图，并显示友好提示
- **NFR-2**: 经纬度数据统一使用 WGS-84 存储，UI交互层自动转换
- **NFR-3**: 编辑弹窗宽度扩展至 960-1100px，适配 1440+ 宽度屏幕

## Constraints
- **Technical**: React + TypeScript + Ant Design v5，已有 RealMapSelector 组件
- **Dependencies**: 地图API Key需在系统配置中已配置
- **Business**: 数据库 lofts 表结构需新增 `description`、`status` 字段（若不存在）

## Acceptance Criteria

### AC-1: 地图选点功能
- **Given**: 管理员打开编辑公棚弹窗，且已配置地图API Key
- **When**: 在地图上点击任意位置
- **Then**: 标记出现在点击位置，经纬度字段自动更新，地址字段通过逆地理编码回填
- **Verification**: `programmatic`

### AC-2: 地址搜索定位
- **Given**: 管理员在地址输入框输入地址并点击"地图选点"
- **When**: 地理编码返回结果
- **Then**: 地图标记移动到对应位置，经纬度自动更新
- **Verification**: `programmatic`

### AC-3: 表单字段完整性
- **Given**: 管理员打开编辑弹窗
- **When**: 查看表单
- **Then**: 能看到公棚名称、编码（只读）、负责人、联系电话、公棚简介、公棚地址、公棚容量、存棚鸽只（只读）、公棚状态、经纬度字段
- **Verification**: `human-judgment`

### AC-4: 容量使用率进度条
- **Given**: 公棚有容量和存棚鸽只数据
- **When**: 使用率变化
- **Then**: 进度条按阈值显示对应颜色（绿/橙/红）
- **Verification**: `human-judgment`

### AC-5: 构建通过
- **Given**: 代码修改完成
- **When**: 执行 npm run build
- **Then**: 构建成功无错误
- **Verification**: `programmatic`
