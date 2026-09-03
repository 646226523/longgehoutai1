# 任务列表 — 检测机构地图选点功能

## Task 1: 数据库添加 location 列
- **优先级**: high
- **状态**: pending
- **描述**: 在 `detection_orgs` 表中添加 `location TEXT` 列，用于存储 JSON 格式的经纬度数据
- **测试要求**:
  - [rule] detection_orgs 表包含 location 列 — 验证 SQL 语句
  - [rule] 已有数据库可通过 ALTER TABLE 添加列 — 验证迁移脚本

## Task 2: 后端 API 支持 location 字段
- **优先级**: high
- **状态**: pending
- **描述**: 更新 detection.ts 路由，在 CRUD 操作中支持 location 字段
- **测试要求**:
  - [rule] POST /api/detection/orgs 接受并存储 location 字段
  - [rule] PUT /api/detection/orgs/:id 更新 location 字段
  - [rule] GET /api/detection/orgs 返回 location 字段
  - [rule] GET /api/detection/orgs/:id 返回 location 字段

## Task 3: 前端类型定义更新
- **优先级**: high
- **状态**: pending
- **描述**: 更新 services/detection.ts 中的 TypeScript 接口，添加 location 字段
- **测试要求**:
  - [rule] DetectionOrg 接口包含 location 字段
  - [rule] DetectionOrgCreateParams / DetectionOrgUpdateParams 包含 location 字段

## Task 4: 前端 Org.tsx 集成地图选点
- **优先级**: high
- **状态**: pending
- **描述**: 在检测机构表单中集成 LoftMapPicker 组件，替换占位按钮
- **测试要求**:
  - [rule] 点击"地图选点"按钮打开 Modal 显示 LoftMapPicker
  - [rule] 选点后地址回填到 address 字段
  - [rule] 经纬度显示在预览框中
  - [rule] 保存时 location 数据正确组装并提交
  - [rule] 编辑模式回显已保存的位置
  - [rule] 地图未配置时显示友好提示

## Task 5: 端到端验证
- **优先级**: high
- **状态**: pending
- **描述**: 启动服务器，在浏览器中完整测试地图选点流程
- **测试要求**:
  - [rule] 新增机构时地图选点全流程正常
  - [rule] 编辑机构时地图回显和更新正常
  - [rule] 保存后数据库 location 字段正确
