# 修复 .list null 崩溃 - 验证清单

## HTTP 拦截器防御
- [ ] request.ts 响应拦截器增加 null/undefined 防御逻辑
- [ ] request.ts 增加开发环境异常响应日志提示

## 审计日志页面
- [ ] getAuditStats() 调用添加 null 防御
- [ ] 四个统计卡片（全部日志/今日新增/失败次数/涉及模块）稳定渲染
- [ ] ProTable request 回调 `.list` 和 `.total` 都使用可选链 + 默认值

## ProTable request 回调全面加固
- [ ] arbitration/Case.tsx:588 res.list → res?.list ?? []
- [ ] auction/Deal.tsx:278 res.list → res?.list ?? []
- [ ] competition/VerifyDetail.tsx:271 res.list → res?.list ?? []
- [ ] competition/Verify.tsx:293 res.list → res?.list ?? []
- [ ] auction/Session.tsx:1344 res.list → res?.list ?? []
- [ ] auction/Items.tsx:405 res.list → res?.list ?? []
- [ ] competition/Result.tsx:275 res.list → res?.list ?? []
- [ ] competition/List.tsx:291 res.list → res?.list ?? []
- [ ] content/Notice.tsx:243 res.list → res?.list ?? []
- [ ] content/News.tsx:969 res.list → res?.list ?? []
- [ ] gene/Audit.tsx:192 res.list → res?.list ?? []
- [ ] gene/List.tsx:249 res.list → res?.list ?? []
- [ ] system/Admin.tsx:396 res.list → res?.list ?? []
- [ ] detection/Org.tsx:531 res.list → res?.list ?? []
- [ ] detection/Report.tsx:1123 res.list → res?.list ?? []
- [ ] loft/Pigeons.tsx:203 res.list → res?.list ?? []
- [ ] loft/Audit.tsx:587 (已用可选链，确认)
- [ ] user-member/MemberLevel.tsx:506, 1054 res.list → res?.list ?? []

## 独立函数调用加固
- [ ] arbitration/Case.tsx:194 res.list.map → res?.list?.map ?? []
- [ ] content/Banner.tsx:114, 129 data.list.map → data?.list?.map ?? []
- [ ] services/arbitration.ts:220 res.list.map → res?.list?.map ?? []
- [ ] services/competition.ts:172 data.list → data?.list ?? []
- [ ] competition/VerifyDetail.tsx:128, 137 searchRes.list → searchRes?.list
- [ ] user-member/UserList.tsx:255 res.list → res?.list ?? []
- [ ] auction/Session.tsx:143 res.list → res?.list ?? []
- [ ] auction/Deal.tsx:87 res?.list (已用可选链，确认)
- [ ] competition/Verify.tsx:72 res?.list (已用可选链，确认)
- [ ] user-member/MemberLevel.tsx: 其他 res.list 无保护访问

## 编译 & 运行验证
- [ ] npx tsc --noEmit 零错误
- [ ] 前端 dev server 启动无报错
- [ ] 审计日志页面浏览器控制台无 TypeError 崩溃
- [ ] 统计卡片四格全部渲染
- [ ] 表格数据正常加载和显示
