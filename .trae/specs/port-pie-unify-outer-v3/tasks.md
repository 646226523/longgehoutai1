# 注册端口 / 登录端口饼图内外标签统一 V3 - 实施计划

优先级：**全部 high**（阻塞用户截图验收的明显视觉瑕疵，立修立验）
依赖 DAG：T1 → T2 → T3 → T4

## [x] Task 1: 重写 `calcPieSlicesWithLeads` 阈值 + 内层清零
- **Priority**: high
- **Depends On**: None
- **Description**:
  - `showOuterMinPct` 默认值从 8 → **1**（或在调用处直接传 1 并注释明确「≥1% 全外显」）
  - 把 `innerText` 赋值块改为：**恒 undefined**（保留字段但不产出，兼容类型）
  - `showInnerMinPct` 逻辑完全不生效，写 `// deprecated — all >=1% go outer` 注释
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-1.1: 在 `PortAnalysisChart.tsx` 同目录新增 `__tests__/calcPie.test.ts`（如无 jest 环境则用 adhoc inline test）：构造登录 5 项，断言 `slices[4].textOuter === true` 且 `slices[4].percent === 6.8`
  - `programmatic` TR-1.2: 遍历 9 项（注册 4 + 登录 5）所有 slice 断言 `innerText === undefined`
  - `human-judgement` TR-1.3: 肉眼两卡 4+5 条外引线全部存在，内层无任何 % 文字
- **Notes**: 不改 `PieSliceWithLead` 类型字段（上游无需改动）

## [x] Task 2: 同列邻近标签 竖向 nudge 防碰撞
- **Priority**: high
- **Depends On**: T1
- **Description**:
  - 第一遍：先按原角度计算出所有 slices 初步 (labelAnchorX, labelAnchorY, p2x, p2y, p2BarEndX, leadPathD)
  - 第二遍分组：按 `labelSide` 分成 `leftGroup/rightGroup/centerGroup` 三组，**每组各自**按角度顺序扫描（rightGroup 从上→下，leftGroup 从上→下，centerGroup 单独处理）
  - 若 `|cur.y - prev.y| < 14`：对 `cur` 的 y 做 nudge，方向按「从上到下保持 gap」——如果 cur.y < prev.y 则把 cur.y 拉到 prev.y + 14；否则 cur.y = max(cur.y, prev.y + 14)（「向下拉开」策略稳定不越界）
  - 对 nudge 过的 slice，同步更新：`p2y, p2BarEndY, labelAnchorY`，并重算 `leadPathD` 的 `M p1x p1y L p2x p2y L p2BarEndX p2BarEndY`（仍保持水平横杠）
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-2.1: 登录 5 项 5 条 leadText 的 `labelAnchorY` 排序后两两差值 ≥ 14
  - `programmatic` TR-2.2: 注册 4 项两两差值 ≥ 14
  - `human-judgement` TR-2.3: 肉眼登录卡 5 条文字竖向整齐，没有 12.7% 和 6.8% 叠在同一行
- **Notes**: 只 nudge 径向末端 y，不 nudge x，保证横杠始终水平且引线不会斜穿

## [x] Task 3: 四周边界 buffer 收缩兜底（左右优先）
- **Priority**: high
- **Depends On**: T2
- **Description**:
  - 估算单条文本宽：`W = 36px`（4 字符 × 12px）、高 `H = 14px`
  - 遍历最终 slices：若 `labelSide==='right'` 且 `labelAnchorX + W > viewBoxW - 6`，则 `anchorRadius` 从 `R+32` 缩到 `R+22` 再重算 p2x/labelAnchorX；仍不满足再缩到 `R+14`（最多缩两级）
  - 左侧同理：`labelAnchorX - W < 6` 时收缩 anchorRadius
  - 上下侧：`labelAnchorY - H/2 < 6` 或 `labelAnchorY + H/2 > viewBoxH - 6` 时同步 nudge 4~8px 兜底
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `programmatic` TR-3.1: 三档（2k/1080p/compact）下对两卡所有 `labelAnchor*` + 估算宽高 做边界断言，4 边 buffer ≥ 6
  - `human-judgement` TR-3.2: 1600×900 档 compact 下 6.8% 仍能在右下方完整显示 4 字符
- **Notes**: 1080p + padOuter=72 下最大右标签 anchorX≈216（V2 截图实测 218），加上 36 → 254 刚好接近 viewBox 256，缩一级 anchorRadius R+22 → 208+2+36=246，留 10px buffer 满足 ≥6

## [x] Task 4: 构建验证 + 3 档截图回归 + checklist 打勾
- **Priority**: high
- **Depends On**: T1 + T2 + T3
- **Description**:
  - `cd admin-web && npm run type-check && npm run build`
  - 用 Playwright / 浏览器工具在 2560×1440 / 1920×1080 / 1600×900 三档 各切一张包含 Row2（预警/注册/登录）的截图存到 `out/port_v3/{2k,1080p,1600}.png`
  - 更新 `checklist.md` 所有通过项打勾，在 `out/port_v3/report.md` 写 通过率汇总 + 遗留 Open Questions 结论
- **Acceptance Criteria Addressed**: AC-5, AC-6
- **Test Requirements**:
  - `programmatic` TR-4.1: type-check & build 均 exit 0
  - `programmatic` TR-4.2: 三档截图存在且 size > 30KB（非空）
  - `human-judgement` TR-4.3: 三档 6 张饼（3×注册 + 3×登录）均「零叠字 / 零内显 / 零裁剪」
- **Notes**: 若 2k / 1600 档 Playwright 不好启，至少 1080p 档跑通并在报告里写明「另两档用 DOM getBBox 断言通过」
