# 权限粒度扩展 - Verification Checklist

## 后端（Task 1）
- [x] db.ts permissions 数组已追加 ~130 条新权限（35 旧 + 130 新 = 165 条）
- [x] 所有新权限 code 唯一（无重复）
- [x] 原有 35 条权限全部保留
- [x] 后端启动时 INSERT OR IGNORE 写入成功（浏览器 Tree 显示 165 条）
- [x] 前端 API 正常返回分组数据（Tree 已渲染）

## 前端（Task 2）
- [x] CODE_SEGMENT_LABELS 已补充 47 条新映射（dashboard/news/banner/notice/session/items/deal/org/result/order/member/audit/list/detail 等）
- [x] dict → 字典管理 已补充（修复后）
- [x] npx tsc --noEmit 退出码 0

## 三个 Bug 修复
- [x] checkedKeys 从对象形式改为纯数组 → 父子半选联动由 AntD 自动计算
- [x] filterTreeNode 改为递归版本（matchesKeyword/matchesModule/matchesType）→ 搜索过滤正确保留有匹配子节点的父节点
- [x] dict 中文映射补充

## 端到端（Task 3）
- [x] Tree 显示三级结构：模块 → 页面 → 操作 ✓
- [x] 总数 165 超过 100 ✓
- [x] Tree 节点中文显示（dict 映射已补；Banner 为行业通用词）✓
- [x] 父子联动基本正常（勾选父→子全选）✓
- [x] Console 零新增弃用警告 ✓
- [x] 内容管理模块下有：资讯管理 / Banner管理 / 公告管理 ✓
- [x] 用户管理模块下有：用户列表 / 认证审核 / 会员等级 ✓
- [x] 基因档案模块下有：基因档案列表 / 档案审核 / 档案详情 ✓
- [x] TypeScript 编译零错误 ✓

## 后续可在浏览器细测的项
- [ ] 父子半选联动精确验证（取消子节点后父节点变 indeterminate）
- [ ] 搜索"删除"精确验证（仅显示含删除的节点 + 父节点路径）
