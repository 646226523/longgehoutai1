# 赛事核验报告导出 - Product Requirement Document

## Overview
- **Summary**: 为赛事核验模块实现完整的报告导出功能，支持 PDF、Excel、CSV 三种格式，通过配置弹窗让管理员灵活选择导出范围、格式和内容，生成专业的核验报告文件供纸质归档、数据分析和鸽友查证。
- **Purpose**: 填补赛事核验流程的最后一环，让管理员能够便捷地生成包含统计摘要、核验明细、异常记录的专业报告，满足公棚归档、信鸽协会备案和参赛鸽友查证等多种场景需求。
- **Target Users**: 公棚/鸽会工作人员、赛事管理员、信鸽协会审核人员

## Goals
- 实现 PDF 格式核验报告导出（含封面、统计摘要、核验明细、签名区）
- 实现 Excel 格式核验报告导出（含全部字段，方便数据分析）
- 实现 CSV 格式核验报告导出（轻量纯数据格式）
- 提供导出配置弹窗，支持选择导出范围、格式、内容选项
- 支持导出当前赛事、全部赛事或已勾选赛事
- 自动生成规范的文件名

## Non-Goals (Out of Scope)
- 异步导出队列（MVP 阶段采用同步导出，大文件超时提示替代）
- 报告水印和电子签章功能
- 批量多赛事合并导出为单个 PDF
- 导出权限分级（MVP 阶段复用现有权限体系）
- 邮件通知完成导出

## Background & Context
- 前端已重构完成赛事核验列表页（Verify.tsx）和详情页（VerifyDetail.tsx）
- 后端已有 `GET /api/competition/verify-list` 和 `POST /api/competition/batch-verify` 接口
- 参赛鸽数据存储在 `competition_participants` 表，包含足环号、鸽主、核验状态、核验原因、核验时间等字段
- 核验状态枚举：pending（未核验）、passed（通过）、failed（不通过）
- 当前"导出核验报告"按钮仅显示占位提示"导出核验报告功能开发中"
- 技术栈：前端 React + Ant Design，后端 Express + SQLite

## Functional Requirements
- **FR-1**: 点击"导出核验报告"按钮弹出配置面板，支持选择导出范围（当前赛事/全部赛事/勾选赛事）
- **FR-2**: 支持选择导出格式（PDF/Excel/CSV）
- **FR-3**: 支持内容选项（核验明细、异常记录、统计摘要）
- **FR-4**: PDF 报告包含：封面页、统计摘要页、核验明细页、签名区
- **FR-5**: Excel 报告包含完整数据字段（足环号、鸽主、核验状态、核验原因、核验时间）
- **FR-6**: CSV 报告为纯数据格式，含表头
- **FR-7**: 自动生成为"赛事核验报告_{赛事名称}_{日期}"格式的文件名
- **FR-8**: 后端返回可下载的文件流，前端触发浏览器下载
- **FR-9**: 导出完成后显示成功提示，导出失败显示错误信息
- **FR-10**: 当无数据可导出时，按钮置灰并提示

## Non-Functional Requirements
- **NFR-1**: PDF 生成响应时间不超过 5 秒（500 羽以内赛事）
- **NFR-2**: 支持大文件导出，单赛事 5000 羽数据不超时
- **NFR-3**: 文件名和报告内容支持中文
- **NFR-4**: 导出操作记录审计日志

## Constraints
- **Technical**: 后端 Node.js 环境，需选择纯 JS PDF 生成库（如 pdfkit），无外部二进制依赖
- **Technical**: 后端已使用 better-sqlite3 作为数据库，导出需读取同一数据库
- **Business**: MVP 阶段不引入重量级依赖（如 Puppeteer）
- **Dependencies**: 前端 echarts 已安装可用于统计图表；后端无 PDF/Excel 生成库，需新增

## Assumptions
- 导出的 PDF 报告不需要复杂的图形渲染（封面使用文本和简单布局即可）
- 审计日志通过现有 auditMiddleware 机制记录
- 文件临时存储在服务器本地 `downloads/` 目录，定期清理
- 管理员权限通过现有 `competition:verify` 权限控制

## Acceptance Criteria

### AC-1: 导出配置弹窗交互
- **Given**: 用户已登录管理员账号，在赛事核验列表页
- **When**: 用户点击"导出核验报告"按钮
- **Then**: 弹出配置面板，显示导出范围选择（当前赛事/全部赛事/勾选赛事）、格式选择（PDF/Excel/CSV）、内容选项（核验明细/异常记录/统计摘要）、文件名预览
- **Verification**: `human-judgment`

### AC-2: PDF 报告生成
- **Given**: 用户已在配置面板选择 PDF 格式和导出选项
- **When**: 用户点击"立即导出"
- **Then**: 后端生成 PDF 文件，前端触发下载；下载的 PDF 包含封面页（报告编号、赛事信息、生成时间）、统计摘要页（总羽数、已核验、通过率、异常数）、核验明细页（足环号、鸽主、核验状态、核验时间）
- **Verification**: `programmatic`

### AC-3: Excel 报告生成
- **Given**: 用户已在配置面板选择 Excel 格式
- **When**: 用户点击"立即导出"
- **Then**: 后端生成 .xlsx 文件，前端触发下载；Excel 文件包含多个 Sheet（统计摘要、核验明细、异常记录），列头清晰，数据完整
- **Verification**: `programmatic`

### AC-4: CSV 报告生成
- **Given**: 用户已在配置面板选择 CSV 格式
- **When**: 用户点击"立即导出"
- **Then**: 后端生成 .csv 文件，前端触发下载；CSV 文件包含正确的 BOM 头支持中文，数据按行导出
- **Verification**: `programmatic`

### AC-5: 导出范围控制
- **Given**: 用户在核验列表页勾选了部分赛事
- **When**: 用户选择"勾选的赛事"导出
- **Then**: 只导出勾选赛事的数据；若未勾选则提示"请先选择赛事"
- **Verification**: `programmatic`

### AC-6: 空数据处理
- **Given**: 选中的赛事没有任何参赛鸽数据
- **When**: 用户尝试导出
- **Then**: 显示"该赛事暂无核验数据"提示，导出按钮置灰
- **Verification**: `human-judgment`

### AC-7: 后端 API 可用
- **Given**: 管理员已登录
- **When**: 调用 `POST /api/competition/verify-export` 接口
- **Then**: 返回文件下载流或生成的临时文件下载链接
- **Verification**: `programmatic`

## Open Questions
- [ ] 是否需要异步导出机制（大文件场景）？MVP 暂不同步实现，后续迭代补充
- [ ] PDF 报告是否需要电子签章？MVP 使用手写签名区域代替
