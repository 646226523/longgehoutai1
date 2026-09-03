# Tasks

- [x] Task 1: 搭建后台管理系统基础工程骨架(admin-web + admin-api)
  - [x] SubTask 1.1: 初始化 admin-web(React + Ant Design Pro + Vite + TS)
  - [x] SubTask 1.2: 初始化 admin-api(Node.js + Express/Nest + JWT)
  - [x] SubTask 1.3: 搭建后台布局(侧边栏 + 顶栏 + 面包屑)与路由框架
  - [x] SubTask 1.4: 实现管理员登录、JWT 鉴权、Token 刷新

- [x] Task 2: 实现系统管理模块(权限基础,优先)
  - [x] SubTask 2.1: 管理员管理(账号 CRUD、状态)
  - [x] SubTask 2.2: 角色与权限管理(RBAC、菜单/按钮权限)
  - [x] SubTask 2.3: 操作日志审计
  - [x] SubTask 2.4: 系统配置与字典管理

- [x] Task 3: 实现基因信息管理模块
  - [x] SubTask 3.1: 基因档案管理(列表、详情、溯源二维码)
  - [x] SubTask 3.2: 基因检测记录管理
  - [x] SubTask 3.3: 手动录入审核流程(提交-审核-入库/驳回)
  - [x] SubTask 3.4: 溯源链路与血统树可视化

- [x] Task 4: 实现 NFT 资产管理模块
  - [x] SubTask 4.1: NFT 铸造与元数据管理
  - [x] SubTask 4.2: 上链审核与异步上链任务队列(失败重试告警)
  - [x] SubTask 4.3: 资产流转记录与链上状态监控

- [x] Task 5: 实现赛事管理模块
  - [x] SubTask 5.1: 赛事创建与发布
  - [x] SubTask 5.2: 赛事核验(足环与基因档案比对)
  - [x] SubTask 5.3: 成绩录入与排名管理
  - [x] SubTask 5.4: 赛事状态流转

- [x] Task 6: 实现公棚管理模块
  - [x] SubTask 6.1: 公棚入驻申请审核
  - [x] SubTask 6.2: 公棚信息管理
  - [x] SubTask 6.3: 鸽棚与存棚鸽只管理

- [x] Task 7: 实现检测预约管理模块
  - [x] SubTask 7.1: 预约订单管理
  - [x] SubTask 7.2: 检测机构管理
  - [x] SubTask 7.3: 检测排期日历
  - [x] SubTask 7.4: 检测报告录入并关联基因档案

- [x] Task 8: 实现拍卖管理模块
  - [x] SubTask 8.1: 拍卖场次管理
  - [x] SubTask 8.2: 拍品管理(关联 NFT 资产)
  - [x] SubTask 8.3: 竞价记录
  - [x] SubTask 8.4: 成交与交割管理

- [x] Task 9: 实现仲裁管理模块
  - [x] SubTask 9.1: 仲裁案件受理与立案
  - [x] SubTask 9.2: 证据材料管理
  - [x] SubTask 9.3: 仲裁裁决与执行

- [x] Task 10: 实现用户与会员体系模块
  - [x] SubTask 10.1: 用户管理与实名/认证
  - [x] SubTask 10.2: 会员等级规则配置
  - [x] SubTask 10.3: 会员权益配置与发放

- [x] Task 11: 实现内容运营管理模块
  - [x] SubTask 11.1: Banner 管理
  - [x] SubTask 11.2: 资讯管理(富文本)
  - [x] SubTask 11.3: 公告与推送管理

- [x] Task 12: 实现数据统计中心
  - [x] SubTask 12.1: 各维度数据统计接口
  - [x] SubTask 12.2: 数据看板可视化(指标卡片、趋势图、排行榜)

# Task Dependencies
- Task 2 依赖 Task 1(基础工程与登录)
- Task 3、5、6 可并行(均依赖 Task 2 权限基础)
- Task 4 依赖 Task 3(基因档案为 NFT 资产来源)
- Task 7 依赖 Task 3(检测报告关联基因档案)
- Task 8 依赖 Task 4(拍卖拍品来自 NFT 资产)
- Task 9 依赖 Task 8(仲裁来自交易纠纷)
- Task 10、11 可并行(依赖 Task 2)
- Task 12 依赖所有业务模块(汇总统计)
