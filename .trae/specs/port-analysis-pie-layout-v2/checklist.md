# 注册端口/登录端口分析饼图重构 V2 验证 Checklist

> 共 6 大模块 53 项检查点（3 档分辨率 × 2 张卡 × 9 分类检查 ≈ 53 项），覆盖 spec.md 6 条 AC。所有 Checkpoint 默认空 `[ ]`，通过后改 `[x]`，人工视觉项可备注 reviewer / 截图路径。

## 模块 A: 类型安全 + 构建 (3 项)
- [ ] A-1: `npm run type-check` exit 0，TS Strict 0 错误
- [ ] A-2: `npm run build` exit 0，dist/Dashboard.*.js 字符串检索不包含 `undefined` / `NaN` / `NaN%`
- [ ] A-3: `calcPieSlicesWithLeads` 纯函数导出 + tsconfig 路径引用正确（import 非 relative 也能 resolve）

## 模块 B: 四分舱布局 + KPI 条 (11 项)
- [ ] B-1: 注册端口 KPI 条总计 文字正确 = 3002（=1234+856+678+234）
- [ ] B-2: 登录端口 KPI 条总计 = 6747（=2345+1856+1234+856+456）
- [ ] B-3: 注册端口 KPI 条右「较昨日 ↑xx%」文字包含 ↑ 或 ↓ 或 — —
- [ ] B-4: 登录端口 KPI 条右「较昨日 ↑xx%」文字包含 ↑ 或 ↓ 或 — —
- [ ] B-5: 2k / 1080p / compact 三档下 .PAC-kpiRow height ≥ 40px（三档全检共 3 项）
- [ ] B-6: 同 Row 三张卡（预警/注册/登录）高度差 ≤ 2px（1920×1080
- [ ] B-7: bodyRow gap 视觉 20px（不小于 16px，2k/1080p/compact 三档共 3 项）
- [ ] B-8: 1920×1080 档 注册卡 height = 登录卡 height 相差 0px

## 模块 C: 图例对齐 (9 项)
- [ ] C-1: 注册卡 4 行图例行 `.PAC-count` 数字列 offsetLeft 完全相等（视觉一条竖线）
- [ ] C-2: 注册卡 4 行 `.PAC-pct` 百分号列 offsetLeft 完全相等
- [ ] C-3: 登录卡 5 行数字列 offsetLeft 完全相等
- [ ] C-4: 登录卡 5 行百分号列 offsetLeft 完全相等
- [ ] C-5: 长名字「第三方 OAuth / 第三方登录」显示省略号，不折行（2 项）
- [ ] C-6: 1600×900 档下 5 行图例行高度 24px，全部可显示无截断
- [ ] C-7: 2k 档图例行高 28px，紧凑且不重叠
- [ ] C-8: 图例行 hover 背景色变 rgba 蓝，150ms 渐变不突兀

## 模块 D: 饼图引线标注（防遮挡核心）(14 项)
- [ ] D-1: SVG viewBox 宽度 = 2*(R+padOuter)，计算正确，2k=268、1080p=244、compact=224（3 项）
- [ ] D-2: 外显百分号标签：注册卡 4 项 ≥ 8% (41.1,28.5,22.6,7.8 里前 3 项外显，7.8 内显
- [ ] D-3: 登录卡 5 项 34.8/27.5/18.3/12.7/6.8 前 4 项外显、6.8 内显
- [ ] D-4: 所有外显标签 字符 % 距离 card-body 右边缘 ≥ 6px（右边缘不切）
- [ ] D-5: 外显顶部 6.8% 字符 距离 card-top（KPI 条下方）≥ 6px（上边缘不切）
- [ ] D-6: 外显左下 22.6% 字符 不超过 card-body 下边缘（≥6px buffer）
- [ ] D-7: 引线颜色 `#d9d9d9`、末端横杠 4px 长、文本 12px 右对齐或 start 正确
- [ ] D-8: 扇区 hover 时，其他扇区 opacity 0.55 但引线不变透明
- [ ] D-9: 扇区 ≤ 5% 完全不显 只靠 tooltip（当前 mock 没有，需传参 mock 一条小扇区测试）
- [ ] D-10: 最小标签 bounding box 完整落在 SVG viewBox 内（x≥0, y≥0, x+w≤vbW, y+h≤vbH）

## 模块 E: 双向 hover + Tooltip (6 项)
- [ ] E-1: 鼠标 hover 扇区 → 图例对应行 row highlight（背景变）
- [ ] E-2: 鼠标 hover 图例 行 → 对应饼 扇区 1 opacity，其他 0.55
- [ ] E-3: hover 任一元素 tooltip 文案包含 `通道名: value (pct%)`
- [ ] E-4: mouse leave 后 150ms 内恢复
- [ ] E-5: tooltip font 14-16px，不越界出 card-body
- [ ] E-6: 最小扇区 tooltip 可正常显示（6.8% 扇区中心附近坐标也能触发）

## 模块 F: 三档分辨率 + 无横滚 (10 项)
- [ ] F-1: 2560×1440: Row div clientWidth == scrollWidth（无横滚）
- [ ] F-2: 2560×1440: 饼 R=78 + pad=56 → svg 宽 268px 实测在 card-body 内部不超
- [ ] F-3: 1920×1080: 无横滚，两卡 height 同高
- [ ] F-4: 1920×1080: 最右标签 41.1% 字符不切，距离卡右边缘 ≥ 8px
- [ ] F-5: 1600×900: 无横滚
- [ ] F-6: 1600×900: 图例仍能显示 5 行 + 饼仍能完整显示（不出现垂直滚动条）
- [ ] F-7: 1600×900: 标签最小 6.8% 不切顶部 KPI 条
- [ ] F-8: 三档 `document.documentElement CSS 变量 --pac-minH` 分别等于 280 / 256 / 232
- [ ] F-9: 1080p 档 `--pac-pie-R:66px`，实际测量 DOM 内 calc 出的 viewBox 宽度 2*(66+56)=244px
- [ ] F-10: 整体三张卡 (预警/注册/登录) 合成一张截图后横向不出现滚动条

## 模块 G: 回归不影响其他模块
- [ ] G-1: TrendChart 渲染正常（canvas 不报错，ECharts init 成功）
- [ ] G-2: MetricCard 4 张正常显示，点击 onClick 仍能 navigate
- [ ] G-3: AlertCenter 3 条预警 icon 颜色正确（橙/绿/蓝）
- [ ] G-4: QuickEntryPanel 4 个入口按钮 clickable
