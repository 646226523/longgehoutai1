# 赛事提交错误弹窗重构 Spec

## Why
后台工作人员在"新增赛事"页点击"确认发布"时，若信息有误/未填写，报错提示内容含糊不清：缺少起点、终点时甚至**没有任何提示直接静默提交**；`routeWarning` 与表单校验错误零散且只提示单条，无法让操作员第一时间知道"哪个字段错了、缺了什么、该怎么改"。

## What Changes
- 重构 [CompetitionForm.tsx](file:///p:/龙鸽项目/longgehoutai/admin-web/src/pages/competition/CompetitionForm.tsx) 的提交校验逻辑：
  - 提交前统一收集**全部**校验问题（不止第一条），覆盖：赛事名称、起点（司放地）、终点（归巢地）、赛线合法性（起终点相同 / 坐标超中国范围 / 空距计算异常）、手动空距（启用时必填且 > 0）。
  - 校验不通过时，弹出**结构化错误弹窗（Modal）**，逐条列出「字段名 + 问题原因 + 修正指引」，替代原先单条 `message.error` 提示。
  - 弹窗弹出的同时，仍触发 Ant Design Form 内联校验，在对应字段下方高亮标红。
- 保留右侧"赛线地图"上方已有的 `routeWarning` 实时 `Alert` 提示。
- 后端 [competition.ts](file:///p:/龙鸽项目/longgehoutai/admin-api/src/routes/competition.ts) 不新增强约束（保持向后兼容，旧数据无赛线仍可编辑保存），仅依赖前端提交前拦截。

## Impact
- Affected specs: `competition-map-route-planning`、`fix-real-map-interactions`（赛线规划能力相关，不破坏既有行为）
- Affected code:
  - `admin-web/src/pages/competition/CompetitionForm.tsx`（主要改动）
  - `admin-web/src/pages/competition/List.tsx`（无需改动，表单以整页方式内嵌）
  - `admin-web/src/services/request.ts`（无需改动，网络层错误提示保持现状）

## ADDED Requirements
### Requirement: 提交前全面校验与错误汇总
系统 SHALL 在点击"确认发布/保存修改"时，一次性校验并汇总以下全部问题：
- 「赛事名称」未填写
- 「起点（司放地）」未选择
- 「终点（归巢地）」未选择
- 赛线合法性（起终点相同、坐标超中国范围、空距计算异常）
- 「手动空距」启用时未填写或值无效（非正数）

#### Scenario: 校验不通过 - 弹出汇总错误弹窗
- **WHEN** 操作员点击"确认发布"，且存在至少一项校验问题
- **THEN** 弹出结构化错误弹窗，标题明确（如"提交失败，请完善以下信息"）；弹窗内逐条列出「字段名 + 原因 + 修正指引」，并同步在对应表单字段下显示内联标红提示；**不**发起提交请求

#### Scenario: 校验全部通过
- **WHEN** 操作员点击"确认发布"，且所有校验均通过
- **THEN** 不弹错误弹窗，正常提交，提交成功后按原逻辑提示成功并返回列表

### Requirement: 错误弹窗内容可读性
错误弹窗中的每条信息 SHALL 采用「字段名」前缀 + 具体原因 + 如何修正的格式，例如：
- `赛事名称：未填写，请输入赛事名称`
- `起点（司放地）：未选择，请在地图搜索框输入地址或点击地图选择起点`
- `终点（归巢地）：未选择，请在地图搜索框输入地址或点击地图选择终点`
- `起点与终点不能相同，请重新选择`
- `起点坐标超出中国范围，请重新选择`
- `手动空距：未填写或无效，请输入大于 0 的空距值`

## MODIFIED Requirements
### Requirement: 赛事表单提交校验
将原先"`routeWarning` 仅用 `message.error` 提示单条、缺少起点/终点时无任何提示并静默提交"的行为，修改为"提交前汇总全部校验问题，并以结构化弹窗一次性展示"。成功路径与后端请求逻辑保持不变。

## REMOVED Requirements
### Requirement: 缺少起点/终点的静默提交
**Reason**: 该行为导致后台工作人员在未选起点/终点时点击发布，既无报错也无路由数据，误以为发布成功，是本次"报错内容不明确"的核心根因。
**Migration**: 由"提交前全面校验与错误汇总"取代——缺少起点/终点将明确弹窗提示对应字段缺失。
