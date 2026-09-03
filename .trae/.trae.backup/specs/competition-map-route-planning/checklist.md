# 赛事管理 - 地图选点与赛线规划 验证清单

## Task 1: 后端数据库扩展与 API 改造
- [ ] TR-1.1: 数据库迁移后 competitions 表包含 start_lng, start_lat, start_address, end_lng, end_lat, end_address, waypoints, route_geojson, contact_phone 字段
- [ ] TR-1.2: POST /api/competition 能正确保存所有新字段
- [ ] TR-1.3: GET /api/competition/:id 返回完整地理信息
- [ ] TR-1.4: 旧数据（无新字段）能正常读取，不报错
- [ ] TR-1.5: TypeScript 编译通过

## Task 2: 前端城市坐标数据与地图组件开发
- [ ] TR-2.1: 城市搜索"北京"能返回正确坐标
- [ ] TR-2.2: Haversine 计算内江→北京空距误差 ≤ 0.5%
- [ ] TR-2.3: SVG 地图能正确渲染起点/终点标记和连线
- [ ] TR-2.4: 标记拖拽后经纬度正确更新
- [ ] TR-2.5: 地图组件视觉效果清晰，标记和路线可辨
- [ ] TR-2.6: TypeScript 编译通过

## Task 3: 赛事创建/编辑页面重构
- [ ] TR-3.1: 页面在 2560×1440 下左右分栏正常
- [ ] TR-3.2: 页面在 1920×1080 下切换为上下结构
- [ ] TR-3.3: 表单与地图布局协调，无遮挡
- [ ] TR-3.4: Tab 切换流畅，数据不丢失
- [ ] TR-3.5: TypeScript 编译通过

## Task 4: 空距自动计算与赛线分析集成
- [ ] TR-4.1: 起点终点选定后空距自动填充
- [ ] TR-4.2: 添加中途点后空距自动重算
- [ ] TR-4.3: 预计飞行时间 = 空距 / 1200m/min 正确
- [ ] TR-4.4: 起终点相同时弹出警告
- [ ] TR-4.5: 空距手动微调后不再被自动覆盖
- [ ] TR-4.6: TypeScript 编译通过

## Task 5: 中途点管理功能
- [ ] TR-5.1: 添加中途点后地图显示新标记
- [ ] TR-5.2: 删除中途点后标记移除，空距重算
- [ ] TR-5.3: 调整中途点顺序后路线折线更新
- [ ] TR-5.4: 编辑赛事能从历史 waypoints 或 route_geojson 正确回填
- [ ] TR-5.5: TypeScript 编译通过

## Task 6: 后端接口集成与完整流程验证
- [ ] TR-6.1: 新增赛事保存完整地理信息成功
- [ ] TR-6.2: 编辑赛事能正确回填起点终点中途点
- [ ] TR-6.3: GET 列表返回 distance 字段正确
- [ ] TR-6.4: 完整创建→保存→查看流程顺畅
- [ ] TR-6.5: TypeScript 编译通过

## Task 7: 全面浏览器验证
- [ ] TR-7.1: 新增赛事全流程无报错
- [ ] TR-7.2: 地图选点交互流畅直观
- [ ] TR-7.3: 空距计算结果准确
- [ ] TR-7.4: 响应式布局三种分辨率正常
- [ ] TR-7.5: Console 零 AntD 错误
- [ ] TR-7.6: `npx tsc --noEmit` 零错误

## Task 8: 地图显示与 AntD Card 警告修复
- [x] TR-8.1: main 赛线地图区域显示周边底图/地理信息，不再是空白容器
- [x] TR-8.2: 页面中所有 Card 使用 styles.body 替代 bodyStyle
- [x] TR-8.3: 浏览器控制台不再出现 Card bodyStyle deprecated 警告
- [x] TR-8.4: 地图区域与现有赛线数据渲染兼容，不影响已有选点/空距逻辑
