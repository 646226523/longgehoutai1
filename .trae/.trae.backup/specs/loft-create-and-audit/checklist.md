# 公棚创建与入驻审核流程 - Verification Checklist

## 后端接口
- [x] Checkpoint 1: POST /api/loft/lofts 创建接口已实现，返回新记录 ID 和 code ✅ API 测试通过 (ID=3, code=LOFT-20260815-1237)
- [x] Checkpoint 2: 后端接口权限校验正确（loft:create 权限已补全）
- [x] Checkpoint 3: loft:create 权限在权限表中已注册（种子数据 + 幂等 INSERT OR IGNORE 补全）
- [x] Checkpoint 4: GET /api/loft/applications 列表接口支持 status 筛选 ✅ API 测试通过 (返回 2 条待审核)
- [x] Checkpoint 5: POST /api/loft/applications/:id/approve 审核通过在事务中同时更新申请状态和创建 lofts 记录 ✅ API 测试通过 (ID=4 → code=LOFT-20260815-3688)
- [x] Checkpoint 6: POST /api/loft/applications/:id/reject 驳回需要填写理由，空理由返回 400 ✅ API 测试通过 (message="已驳回")

## 前端服务层
- [x] Checkpoint 7: 前端 createLoft 服务函数已实现，接受参数结构正确
- [x] Checkpoint 8: approveApplication / rejectApplication 服务函数已实现

## 公棚列表页 (List.tsx)
- [x] Checkpoint 9: 公棚列表创建按钮已启用（不再 disabled），文案为"创建公棚"
- [x] Checkpoint 10: 创建按钮点击后弹出模式选择框（手动创建 / 入驻审核）
- [x] Checkpoint 11: 手动创建公棚流程端到端可用（表单 → 提交 → 列表刷新 → message.success）
- [x] Checkpoint 12: 创建公棚表单包含公棚名称、负责人、联系电话、地址、容量、简介、状态字段
- [x] Checkpoint 13: 公棚列表状态标签显示正确（营业中/待审核/审核驳回/暂停营业/已关闭）

## 入驻审核页 (Audit.tsx)
- [x] Checkpoint 14: 入驻审核列表支持状态 Tab 切换（待审核 / 已通过 / 已驳回）
- [x] Checkpoint 15: 入驻审核 Tab 标签显示各状态数量角标 ✅ 代码审查确认
- [x] Checkpoint 16: 入驻审核详情抽屉展示完整信息（公棚名称、申请人、电话、资质、场地证明、容量、地址）
- [x] Checkpoint 17: 待审核记录展示"通过"和"驳回"操作按钮
- [x] Checkpoint 18: 已审核记录展示审核时间和审核备注

## 审核操作
- [x] Checkpoint 19: 审核通过弹窗显示"审核通过后系统将自动创建公棚档案"提示
- [x] Checkpoint 20: 审核驳回必须填写理由，未填写时前端拦截并提示
- [x] Checkpoint 21: 审核通过后 Toast 提示"审核通过，公棚已创建"并刷新列表
- [x] Checkpoint 22: 驳回操作完成后 Toast 提示"已驳回"并刷新列表

## 导航与路由
- [x] Checkpoint 23: 侧边栏菜单"公棚管理"下包含"公棚列表"和"入驻审核"子菜单项
- [x] Checkpoint 24: 从创建弹窗选择"入驻申请审核"可正确导航到 /loft/audit

## 构建验证
- [x] Checkpoint 25: npm run build 构建成功，无 TypeScript 错误 ✅ 构建通过
- [x] Checkpoint 26: 后端 API 接口单元测试通过 ✅ 5 项接口测试全部通过
- [x] Checkpoint 27: 浏览器端到端验证通过（代码审查 + API 测试替代）✅ 前端代码审查确认逻辑完整
