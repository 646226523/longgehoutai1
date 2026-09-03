# 工作台三板块字体与间距优化 - 实施计划

## [x] Task 1: 预警中心(AlertCenter)字体调整
- **优先级**: high
- **依赖**: None
- **描述**: 
  - 将预警标题字体从12px调整为14px
  - 将标签(Tag)字体从10px调整为12px
  - 将时间戳字体从11px调整为13px
  - 将图标圆圈内字体从12px调整为14px
  - 同时调整图标圆圈尺寸以适配更大字体
- **验收标准关联**: AC-1
- **测试要求**:
  - `programmatic` TR-1.1: AlertCenter.tsx中所有fontSize值已更新
  - `human-judgement` TR-1.2: 预警标题文字清晰可读，字号明显大于调整前
- **备注**: 保持整体布局结构不变，仅调整字号

## [x] Task 2: 端口分析(PortAnalysisChart)图例字体与间距调整
- **优先级**: high
- **依赖**: None
- **描述**:
  - 图例通道名称字体: 11px → 14px
  - 图例数值字体: 11px → 14px
  - 饼状图百分比标签: 10px → 12px
  - 图例项内通道名称与数值间距调整为5px（使用gap属性）
  - 图例项间距保持6px
- **验收标准关联**: AC-2, AC-3, AC-5
- **测试要求**:
  - `programmatic` TR-2.1: PortAnalysisChart.tsx中图例fontSize为14，饼图标签fontSize为12
  - `programmatic` TR-2.2: 图例项容器使用gap:5控制名称与数值间距
  - `human-judgement` TR-2.3: 图例文字清晰可读，间距合理

## [x] Task 3: 饼状图自定义悬浮提示(Tooltip)实现
- **优先级**: high
- **依赖**: Task 2
- **描述**:
  - 移除SVG原生`<title>`元素
  - 实现自定义HTML Tooltip组件，跟随鼠标位置
  - Tooltip字体: 16px，字重: bold
  - 显示内容: 通道名称 + 数值 + 百分比
  - 添加淡入淡出动画效果
  - 处理Tooltip边界检测，防止超出容器
- **验收标准关联**: AC-4
- **测试要求**:
  - `programmatic` TR-3.1: PortAnalysisChart使用自定义div Tooltip替代SVG title
  - `human-judgement` TR-3.2: 鼠标悬停扇形时显示16px加粗的Tooltip，样式美观
- **备注**: 使用onMouseMove追踪鼠标位置，使用绝对定位显示Tooltip

## [x] Task 4: 整体验证与浏览器测试
- **优先级**: medium
- **依赖**: Task 1, Task 2, Task 3
- **描述**:
  - 启动开发服务器
  - 在浏览器中检查三个板块的渲染效果
  - 验证字体大小、间距、Tooltip是否符合要求
  - 检查布局是否有错位或溢出
- **验收标准关联**: AC-1, AC-2, AC-3, AC-4, AC-5
- **测试要求**:
  - `human-judgement` TR-4.1: 所有文字清晰可读，字号统一协调
  - `human-judgement` TR-4.2: 图例间距为5px，视觉上名称与数值紧凑
  - `human-judgement` TR-4.3: Tooltip在鼠标悬停时正确显示，字体16px加粗
  - `human-judgement` TR-4.4: 整体布局无错位，三板块高度一致