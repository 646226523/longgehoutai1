# 注册端口/登录端口分析饼图重构 V2 - 实施计划（拆解有序任务清单）

> 实施主文件：`admin-web/src/pages/dashboard/PortAnalysisChart.tsx`
> 数据契约：`admin-web/src/pages/dashboard/mockData.ts` → PortAnalysisData 接口扩展 prevValue?
> 参考布局 Hook：`admin-web/src/pages/dashboard/useResolutionTier.ts` → 读取 tier 字段

## [x] Task 1: 接口扩展 + 四分舱布局骨架搭好（KPI条 + 左图例/右饼图 6:5 + min-height 纵向等高）
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 `mockData.ts` 扩展 `interface PortAnalysisData` 新增 2 个可选字段：`prevValue?: number`（昨日同通道昨日值，计算环比用）、`unit?: '人' | '个'`（注册 为"人"或"个"的单位后缀，默认"人"）；`registerPortData` / `loginPortData` 各自写入一组合理昨日值让环比 ≈ 4%~9%（保证截图自然）。
  - 在 `PortAnalysisChart.tsx` 彻底重写 card-body 内部布局 DOM 为四分舱：
    ① 顶行 `.PAC-kpiRow（高度≈44px）：左栏 `.PAC-total`（粗体大数字"总计 N 人")，右栏 `.PAC-compare`（↑ / ↓ 环比昨日 X%；无 prevValue 时显示 "— —" 兜底）
    ② 次行 `.PAC-bodyRow（flex 6:5 gap=20px）：左 `.PAC-legend`（flex-6 4~5 行图例） + 右 `.PAC-pieWrap（flex-5 包 SVG）
    ③ `ant-card-body` 自身加 style 改为 `display: flex; flex-direction: column; min-height: var(--pac-card-minH); padding: 16px;`（纵向撑满外层 100% 高度，保证 Row 三张卡纵向等高）。
  - 视觉令牌 CSS 新起独立文件 `PortAnalysisChart.css`（同目录）：定义 `--pac-card-minH`、`--pac-kpi-font`、`--pac-legend-font`、`--pac-pie-R` 4 条 CSS 变量；在 component 里按 tier 映射 inline style 设置对应值，这样不用额外 hook。
- **Acceptance Criteria Addressed**: AC-2（基础对齐）、AC-3（KPI 条）、AC-6（类型通过）、FR-1 / FR-6
- **Test Requirements**:
  - `programmatic` TR-1.1: `npm run type-check` exit 0；`PortAnalysisData.unit` 不破坏 `title=注册`时 innerText 含「总计 3002 人」（Σ registerPortData.value 相加应 = 1234+856+678+234 = 3002） 
  - `programmatic` TR-1.2: `.PAC-kpiRow` 宽度 = card-body 宽度的 100%，且不出现横向滚动条（getScrollParent 断言 overflow-x: visible/hidden 都行，但不溢出
  - `human-judgement` TR-1.3: 注册/登录两张卡在 1920×1080 下高度完全相同（肉眼比对截图两卡像素高度相等），预警中心卡也同高
- **Notes**: Σvalue 计算公式：`total = data.reduce((s,d)=>s+d.value, 0)`；环比公式：`prevTotal = data.reduce((s,d)=>s+(d.prevValue??0),0)`；`pct = total vs prevTotal` 保留 1 位小数。

## [x] Task 2: 饼图引线标注系统（SVG viewBox 动态尺寸 + 引线三段式标注 + 扇内显/外显分档）
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 提取纯函数 `calcPieSlicesWithLeads(data, config: {R:number; padOuter?: number; showInnerMinPct?: number})`，返回数组 `{path:string, color, percent, labelAnchorXY, midAngle, labelAnchorSide, sliceMidXY, sliceInnerTextXY?}`，导出给组件顶部（unit test-friendly，后续可单测），其中：
    - `padOuter` 默认 56（含引线 + 横杠 + 5字符宽 padding，按 tier 分档；
    - 每扇按 percent 分档：`≥8% 外显引线；`5%≤p<8%` 内显小字号在扇中；`<5%` 完全不显仅靠 tooltip。
  - SVG viewBox 计算：`vbW = vbH = 2*(R + padOuter)`（比方 156×2 = 312px on 2k，对称方盒。去掉 180 硬编码。svg style 改成 `width=100%; max-width=none; aspect-ratio: 1/1; min-width: 180px;`。
  - 三段引线路径：
    ① 切向短线：sliceMid 法向 2px 后，沿与 midAngle 正交方向左/右各画 4px 横线；
    ② 引线主段：`sliceMid + R+2` 处 → `sliceMid + R+2 + 10~16px` 直线外拉（按 angle 的象限走，0-30deg 沿 x，60-90deg 沿 ±y，保证引線拉長不重疊）；
    ③ 末端横杠 4px + 文本贴其外侧，颜色 `#d9d9d9` 宽度 1，strokeLinecap round。
  - textAnchor：`labelAnchorSide==='right' → start`，`==='left' → end`，上下居中（`|cos(midAngle)|<0.1`）时 middle 兜底
- **Acceptance Criteria Addressed**: AC-1（引线+百分号不遮）、NFR-1（0 溢出像素）
- **Test Requirements**:
  - `programmatic` TR-2.1: `calcPieSlicesWithLeads(loginPortData, {R:66}).every(s=>s.labelAnchorXY.x>=0 && <= vbW && y>=0 && vbH)` → 全 true
  - `programmatic` TR-2.2: login `第三方登录 6.8%` 和注册 `第三方 OAuth 7.8%` 两项，因<8% 内显或不显，对应路径中 text 元素无外显，其余 ≥8% 项含 `<g class="lead-line">`（DOM 断言存在）
  - `human-judgement` TR-2.3: 右扇 `网页注册 41.1%`不贴卡边，字符"%"到 card-body 右边缘距离 ≥ 8px

## [x] Task 3: 图例四格对齐 + 双向 hover 联动 + 长名省略
- **Priority**: high
- **Depends On**: Task 1（需 .PAC-legend 容器已存在）
- **Description**:
  - 图例行统一 DOM：`<div className="PAC-legendRow" data-idx>` → 4 span：`.PAC-swatch (10×10 方色）/ .PAC-channel（flex:1 省略）/ .PAC-count（width≥64px 右对齐 font-weight:600）/ .PAC-pct（width≥56px 右对齐 #8c8c8c）；保证 数字列与百分号列两条竖线视觉对齐。
  - flex 布局：`justify-content: space-between` 且每个 row `gap: 8px`；`.PAC-channel { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;` 防"第三方 OAuth"超长省略。
  - 双向 hover：新增一个共用 state `hoverIdx:number|null`，在 legendRow `onMouseEnter={()=>setH(i)}` 与扇区 path 的 onMouseEnter 共用；两者都能驱动：① 其他扇区 opacity 变 `hoverIdx==null||i===i ? 1 : 0.55`；② 图例 row 背景色 `rgba(59,130,246,0.06)`。
  - 图例最底部再加一行 `.PAC-legend` 每 row `height: 28px` 确保紧凑，但紧凑档 24px（按 tier 高度）。
- **Acceptance Criteria Addressed**: AC-2（视觉对齐 + hover、AC-5 双向
- **Test Requirements**:
  - `programmatic` TR-3.1: 所有 `.PAC-count span` 的 `offsetLeft` 列值全部相等（JS 断言，取 4 行）；`.PAC-pct` 的 `offsetLeft` 也全部相等。
  - `human-judgement` TR-3.2: 鼠标在图例"第三方 OAuth"超长 6 字显示为「第三方 OA…」或省略；hover 时整行背景变淡蓝。
  - `human-judgement` TR-3.3: hover 图例行→饼高亮对映扇区确实其他透明、其他 0.55 透明度肉眼可辨。

## [x] Task 4: 三档分辨率 tier 驱动 + 独立样式文件写入
- **Priority**: medium
- **Depends On**: Task 1~3
- **Description**:
  - 在 PortAnalysisChart.css 文件：`import './PortAnalysisChart.css'; 引入；CSS 变量映射：
    ```css
    :root { --pac-minH: 256px; --pac-kpi-f: 18px; --pac-legend-f: 13px; --pac-pie-R: 66px; }
    @media (min-width: 2560px) { :root { --pac-minH:280px; --pac-kpi-f:20px; --pac-legend-f:14px; --pac-pie-R:78px; } }
    @media (max-width: 1919px) { :root { --pac-minH:232px; --pac-kpi-f:16px; --pac-legend-f:12px; --pac-pie-R:56px; } }
    ```
  - TSX 中取 R 值：`const actualR = tier==='2k'?78 : tier==='1080p'? 66 : 56;` 直接 useResolutionTier 现有 tier 字段即可。
  - 确保 svg 外面 flex `.PAC-pieWrap` 不挤压：`min-width: 45%`；同时图例 `min-width: 50%`。
  - 极端窄屏（<1200 xl 未触发，col 变 xs=24 全屏宽）：两卡纵排堆叠时 svg 自动 grow to 320-360px，自动 grow，不需额外处理。
- **Acceptance Criteria Addressed**: AC-4 三档无横滚 + G-4
- **Test Requirements**:
  - `programmatic` TR-4.1: 在 2560/1920/1600 三档 DOM 读取 `document.documentElement.style.getPropertyValue('--pac-minH')` 分别是 280/256/232（用 Playwright 注入 eval 返回）
  - `programmatic` TR-4.2: 三档 viewport 下 Row div.ant-row.scrollWidth 均不大于 clientWidth（无横向滚动）
  - `human-judgement` TR-4.3: 1600×900 档 5 行图例仍可显示无遮挡；1. "扫码登录"四字不挤重叠（>14px 变 12px 可以塞下。

## [x] Task 5: 构建验证 + 自动化脚本 verify_port_pie_v2.py + 三档 6 张截图 + 报告
- **Priority**: high
- **Depends On**: Task 1~4
- **Description**:
  - `cd admin-web && npm run type-check && npm run build` exit 0；
  - 复写 Playwright 脚本 `scripts/verify_port_pie_v2.py`，3 viewport × 2 端口卡 × 1 全页 + 1 单卡 = 6 截图，输出到 `out/port_v2/`：
    断言：
    a) 总计数值正确（3002 / 6747 人 等对应 各张卡);
    b) KPI 条存在并 height>=40;
    c) 引线 g.lead-line 在 张卡 4~5 个引线元素;
    d) 外显标签像素颜色 #666 且不超 svg 边界（bbox 不超）；
    e) 2 张卡 height 差 ≤ 2 像素（纵向等高）
  - 断言总数 18 个，pass ≥ 17 视为通过。
- **Acceptance Criteria Addressed**: AC-1 全 6 项全覆盖
- **Test Requirements**:
  - `programmatic` TR-5.1: type-check+build exit 0
  - `programmatic` TR-5.2: 18 断言 ≥ 17 [x] through，剩余 ≤ 1 项人工审查
  - `human-judgement` TR-5.3: 三张截图（2k/1080p/compact）送用户肉眼验收三个红框问题完全消失

## Task 依赖 DAG（无环）
Task 1 → Task 2 → Task 5
Task 1 → Task 3 → Task 5
Task 2 + Task 3 → Task 4 → Task 5
