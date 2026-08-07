# 验证清单

- [x] Mock 数据扩展：trendData90（90天）+ todos（5条）+ week90 洞察文案
- [x] 待办事项组件 TodoListPanel 创建完成，支持展开/收起
- [x] 待办事项默认显示 3 条，点击"展开全部"显示全部（5条），按钮文字切换
- [x] 点击待办条目跳转到对应业务页面
- [x] TrendChart 支持近 7 天 / 近 30 天 / 近 90 天三档切换
- [x] 90 天视图下 X 轴日期标签稀疏化，不重叠
- [x] CSV 导出功能可用，文件名格式：运营趋势_近X天_YYYYMMDD.csv
- [x] CSV 文件包含 UTF-8 BOM，Excel 打开无中文乱码
- [x] CSV 内容包含 4 列：日期、基因档案新增、活跃用户、NFT铸造数
- [x] Dashboard 模块顺序：欢迎卡片 → 指标卡片 → 预警中心 → 趋势图 → 快捷入口 → 待办事项
- [x] 指标卡片点击跳转路径有效（MetricCard 绑定 onClick navigate）
- [x] 响应式布局：移动端所有模块纵向堆叠（xs=24）
- [x] `npx tsc --noEmit` 零错误
- [x] 浏览器控制台零 error 级别日志（console_messages: none）
- [x] 浏览器截图确认完整布局符合"完整重构版"视觉示意
