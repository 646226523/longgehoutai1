# 修复 NFT 上链审核缺失接口 - Verification Checklist

## 既有接口验证（已完成）
- [x] Checkpoint 1: `GET /api/nft/audit/stats` 返回 200 + 正确结构 `{ today_approved, today_mint_success, today_mint_failed, avg_duration_sec }` ✅
- [x] Checkpoint 2: `GET /api/nft/audit/list?status=pending` 返回 200 + 列表 ✅
- [x] Checkpoint 3: `GET /api/nft/tasks?status=pending,executing,confirming` 返回 200 ✅

## 状态枚举与路由修改
- [x] Checkpoint 4: `NFT_STATUS` 常量新增 `REJECTED: 'rejected'` ✅
- [x] Checkpoint 5: 单条驳回 `POST /api/nft/audit/:id/reject` 写回 `rejected` 状态 ✅
- [x] Checkpoint 6: 批量驳回 `POST /api/nft/audit/batch-reject` 写回 `rejected` 状态 ✅
- [x] Checkpoint 7: `POST /api/nft/assets/:id/resubmit` 接受 `rejected` 状态资产 ✅

## 构建与端到端
- [x] Checkpoint 8: `npm run build`（admin-api + admin-web）构建通过、无 TS 错误 ✅
- [x] Checkpoint 9: 端到端流程：驳回 → rejected 列表可查 → resubmit → pending ✅
- [x] Checkpoint 10: 打开上链审核页面无"接口不存在"弹窗，所有 Tab 正常加载（接口已存在且状态流转一致） ✅
