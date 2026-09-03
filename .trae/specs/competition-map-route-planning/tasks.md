# 赛事管理 - 地图选点与赛线规划 实施计划

## [x] Task 1: 后端数据库扩展与 API 改造
- **优先级**: 高
- **依赖**: 无
- **描述**:
  - 扩展 competitions 表，新增地理字段
  - 改造新增/编辑/详情 API 支持新字段
  - 保持向后兼容（旧数据不受影响）
- **验收标准**: AC-5, AC-7
- **测试要求**:
  - `programmatic` TR-1.1: 数据库迁移后 competitions 表包含 start_lng, start_lat, start_address, end_lng, end_lat, end_address, waypoints, route_geojson, contact_phone 字段
  - `programmatic` TR-1.2: POST /api/competition 能正确保存所有新字段
  - `programmatic` TR-1.3: GET /api/competition/:id 返回完整地理信息
  - `programmatic` TR-1.4: 旧数据（无新字段）能正常读取，不报错
  - `programmatic` TR-1.5: TypeScript 编译通过

## [x] Task 2: 前端城市坐标数据与地图组件开发
- **优先级**: 高
- **依赖**: 无
- **描述**:
  - 创建中国主要城市坐标数据文件（~50个主要城市）
  - 创建 SVG 中国地图组件（简化版，展示省界轮廓+城市位置）
  - 创建地图选点组件（支持搜索选点、地图点击、拖拽标记）
  - 创建空距计算工具（Haversine 公式）
- **验收标准**: AC-1, AC-2, AC-3
- **测试要求**:
  - `programmatic` TR-2.1: 城市搜索"北京"能返回正确坐标
  - `programmatic` TR-2.2: Haversine 计算内江→北京空距误差 ≤ 0.5%
  - `programmatic` TR-2.3: SVG 地图能正确渲染起点/终点标记和连线
  - `programmatic` TR-2.4: 标记拖拽后经纬度正确更新
  - `human-judgement` TR-2.5: 地图组件视觉效果清晰，标记和路线可辨
  - `programmatic` TR-2.6: TypeScript 编译通过

## [x] Task 3: 赛事创建/编辑页面重构（左表单右地图布局）
- **优先级**: 高
- **依赖**: Task 1, Task 2
- **描述**:
  - 将 ModalForm 改为全屏页面或宽屏布局
  - 左侧：基本信息 + 赛线设定（起点/终点/中途点）+ 规程设置
  - 右侧：赛线地图 + 赛线分析面板
  - 实现 Tab 切换：基本信息 / 赛线设定 / 规程设置
  - 响应式适配（2560/1920/1080）
- **验收标准**: AC-1, AC-3, AC-6
- **测试要求**:
  - `programmatic` TR-3.1: 页面在 2560×1440 下左右分栏正常
  - `programmatic` TR-3.2: 页面在 1920×1080 下切换为上下结构
  - `human-judgement` TR-3.3: 表单与地图布局协调，无遮挡
  - `programmatic` TR-3.4: Tab 切换流畅，数据不丢失
  - `programmatic` TR-3.5: TypeScript 编译通过

## [x] Task 4: 空距自动计算与赛线分析集成
- **优先级**: 高
- **依赖**: Task 2, Task 3
- **描述**:
  - 起点/终点选点后自动触发空距计算
  - 中途点变化时自动重算空距
  - 赛线分析面板展示：总空距、预计飞行时间、途经城市
  - 空距字段支持手动微调覆盖自动计算值
  - 异常处理：相同坐标、坐标超限、计算异常
- **验收标准**: AC-2, AC-4, AC-8
- **测试要求**:
  - `programmatic` TR-4.1: 起点终点选定后空距自动填充
  - `programmatic` TR-4.2: 添加中途点后空距自动重算
  - `programmatic` TR-4.3: 预计飞行时间 = 空距 / 1200m/min 正确
  - `programmatic` TR-4.4: 起终点相同时弹出警告
  - `programmatic` TR-4.5: 空距手动微调后不再被自动覆盖
  - `programmatic` TR-4.6: TypeScript 编译通过

## [/] Task 5: 中途点管理功能
- **优先级**: 中
- **依赖**: Task 3, Task 4
- **描述**:
  - 中途点添加：点击"+ 添加中途点"按钮，地图进入选点模式
  - 中途点删除：每个中途点有删除按钮
  - 中途点排序：通过拖拽或上下箭头调整顺序
  - 中途点数据以 GeoJSON LineString 格式存储
- **验收标准**: AC-4
- **测试要求**:
  - `programmatic` TR-5.1: 添加中途点后地图显示新标记
  - `programmatic` TR-5.2: 删除中途点后标记移除，空距重算
  - `programmatic` TR-5.3: 调整中途点顺序后路线折线更新
  - `programmatic` TR-5.4: TypeScript 编译通过

## [ ] Task 6: 后端接口集成与完整流程验证
- **优先级**: 高
- **依赖**: Task 1, Task 3, Task 4, Task 5
- **描述**:
  - 前端提交新地理字段到后端
  - 后端正确存储并返回完整数据
  - 赛事列表页展示地理信息（可选增加地图预览入口）
  - 编辑模式回填已有地理数据
- **验收标准**: AC-7
- **测试要求**:
  - `programmatic` TR-6.1: 新增赛事保存完整地理信息成功
  - `programmatic` TR-6.2: 编辑赛事能正确回填起点终点中途点
  - `programmatic` TR-6.3: GET 列表返回 distance 字段正确
  - `human-judgement` TR-6.4: 完整创建→保存→查看流程顺畅
  - `programmatic` TR-6.5: TypeScript 编译通过

## [ ] Task 7: 全面浏览器验证
- **优先级**: 高
- **依赖**: Task 1-6
- **描述**:
  - 启动前后端服务
  - 浏览器测试新增赛事完整流程
  - 测试地图选点、空距计算、中途点管理
  - 测试响应式布局
  - 测试异常场景
  - 确认 Console 零错误
- **验收标准**: AC-1 至 AC-8, AC-9, AC-10
- **测试要求**:
  - `human-judgement` TR-7.1: 新增赛事全流程无报错
  - `human-judgement` TR-7.2: 地图选点交互流畅直观
  - `human-judgement` TR-7.3: 空距计算结果准确
  - `human-judgement` TR-7.4: 响应式布局三种分辨率正常
  - `programmatic` TR-7.5: Console 零 AntD 错误
  - `programmatic` TR-7.6: `npx tsc --noEmit` 零错误
