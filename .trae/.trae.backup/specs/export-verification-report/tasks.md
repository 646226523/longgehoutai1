# 赛事核验报告导出 - Implementation Plan

## [x] Task 1: 后端新增导出接口
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 `admin-api/src/routes/competition.ts` 中新增 `POST /api/competition/verify-export` 接口
  - 接收请求体：`{ race_ids: number[], format: 'pdf' | 'excel' | 'csv', include_detail: boolean, include_exception_only: boolean, include_summary: boolean, file_name: string }`
  - 查询赛事及其参赛鸽数据（含核验状态）
  - 根据 format 参数生成对应文件
  - 将文件保存到 `downloads/` 临时目录，返回下载路径
  - 安装后端依赖：`pdfkit`（PDF生成）、`exceljs`（Excel生成）
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-4, AC-7
- **Test Requirements**:
  - `programmatic` TR-1.1: 接口返回可下载的文件路径或文件流
  - `programmatic` TR-1.2: PDF 文件可正常打开，包含中文内容
  - `programmatic` TR-1.3: Excel 文件可正常打开，包含多个 Sheet
  - `programmatic` TR-1.4: CSV 文件可正常打开，BOM 头支持中文

## [x] Task 2: PDF 报告生成模块
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 创建 `admin-api/src/modules/competition/report-generator.ts`
  - 实现 PDF 生成逻辑：封面页、统计摘要页、核验明细页
  - 使用 pdfkit 绘制表格、标题、统计信息
  - 支持分页和大表格自动分页
  - 报告包含：报告编号、生成时间、赛事名称、主办方、统计数据、明细表格
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-2.1: 生成的 PDF 可使用 pdf.js 或 adobe reader 打开
  - `human-judgement` TR-2.2: PDF 布局清晰，包含所有必要信息
  - `programmatic` TR-2.3: 中文显示正常（需使用支持中文的字体）

## [x] Task 3: Excel/CSV 报告生成模块
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 扩展 `report-generator.ts` 实现 Excel 和 CSV 生成
  - Excel：包含"统计摘要"和"核验明细"两个 Sheet
  - CSV：纯文本格式，第一行为表头
  - 列头映射：数据库字段名 → 中文列名
  - 异常记录可单独导出
- **Acceptance Criteria Addressed**: AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-3.1: Excel 文件包含正确的 Sheet 结构
  - `programmatic` TR-3.2: CSV 文件包含 UTF-8 BOM，中文无乱码
  - `programmatic` TR-3.3: 数据字段完整（足环号、鸽主、核验状态、核验原因、核验时间）

## [x] Task 4: 前端导出配置弹窗
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 在 `admin-web/src/pages/competition/Verify.tsx` 中将 `handleExport` 改为打开配置弹窗
  - 创建 `ExportReportModal` 组件（内嵌在 Verify.tsx 中或独立文件）
  - 实现配置项：导出范围（当前/全部/勾选）、格式选择、内容选项、文件名预览
  - 调用后端导出接口，处理文件下载
  - 处理加载状态和成功/失败提示
- **Acceptance Criteria Addressed**: AC-1, AC-5, AC-6
- **Test Requirements**:
  - `human-judgement` TR-4.1: 配置弹窗布局清晰，选项直观易用
  - `programmatic` TR-4.2: 点击"立即导出"后正确触发下载
  - `programmatic` TR-4.3: 勾选赛事数量为0时正确提示

## [x] Task 5: 前端服务层与下载集成
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - 在 `admin-web/src/services/competition.ts` 中新增 `exportVerificationReport` 函数
  - 使用 axios 下载文件（responseType: blob）
  - 前端触发文件下载：创建临时 `<a>` 标签，指向 blob URL
  - 处理文件名从 Content-Disposition 响应头提取
  - 处理大文件下载进度提示
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `programmatic` TR-5.1: 调用导出函数后浏览器下载正确的文件
  - `programmatic` TR-5.2: 文件名从响应头正确提取

## [x] Task 6: 构建与全流程验证
- **Priority**: high
- **Depends On**: Task 1-5
- **Description**:
  - 安装后端新依赖（pdfkit、exceljs）
  - 构建前后端项目确保无编译错误
  - 启动服务进行 API 测试
  - 使用浏览器自动化测试完整导出流程
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7
- **Test Requirements**:
  - `programmatic` TR-6.1: `npm run build` 前后端均构建成功
  - `programmatic` TR-6.2: API 测试脚本验证三种格式导出均正常
  - `programmatic` TR-6.3: 浏览器自动化测试验证完整流程
