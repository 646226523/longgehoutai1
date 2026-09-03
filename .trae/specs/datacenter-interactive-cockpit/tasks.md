# 数据中台交互式指挥舱重构 - The Implementation Plan

## [x] Task 1: 右侧面板改为Tab切换紧凑表格
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 将"热门拍卖"从卡片列表改为Ant Design Table紧凑表格
  - 列定义：拍卖名称/当前价/出价次数/剩余时间/热度/操作
  - 将"赛事实时"保持Table但优化列宽和紧凑度
  - 表格行支持点击跳转（预留，显示message提示）
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgement` TR-1.1: 热门拍卖Tab显示表格布局
  - `human-judgement` TR-1.2: 赛事实时Tab显示紧凑表格
  - `programmatic` TR-1.3: 构建无错误

## [x] Task 2: 底部飞行数据折叠面板
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 顶部标题栏显示关键统计（飞行中/归巢中/异常数量）
  - 默认折叠状态，点击展开后显示紧凑列表
  - 列表行高缩小，增加信息密度
  - 异常鸽置顶闪烁，归巢中鸽橙色标记
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgement` TR-2.1: 默认折叠状态
  - `human-judgement` TR-2.2: 展开后紧凑列表
  - `programmatic` TR-2.3: 构建无错误

## [x] Task 3: 公棚总数合并到顶部指标卡
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 删除左侧独立的"公棚总数"MetricCard
  - 为"在线公棚数"卡片添加附加信息（在棚/暂停/已关闭数）
  - 释放左侧空间用于统计图表扩展
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgement` TR-3.1: 左侧不再显示独立公棚总数卡片
  - `human-judgement` TR-3.2: 在线公棚数卡片显示附加信息
  - `programmatic` TR-3.3: 构建无错误

## [x] Task 4: 地图双模式切换+省份下钻
- **Priority**: medium
- **Depends On**: None
- **Description**: 
  - 添加"公棚节点"/"飞行轨迹"模式切换按钮
  - 公棚节点模式：显示热力点位
  - 飞行轨迹模式：显示飞线动画
  - 省份点击下钻：点击点位后地图聚焦，显示省级数据面板
- **Acceptance Criteria Addressed**: AC-4, AC-5
- **Test Requirements**:
  - `human-judgement` TR-4.1: 模式切换功能正常
  - `human-judgement` TR-4.2: 点击点位可聚焦
  - `programmatic` TR-4.3: 构建无错误

## [x] Task 5: 构建与视觉验证
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3, Task 4
- **Description**:
  - 运行npm run build确保无错误
  - 浏览器截图验证所有AC
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `programmatic` TR-5.1: npm run build成功
  - `human-judgement` TR-5.2: 所有视觉点通过
