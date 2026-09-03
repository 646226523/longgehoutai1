# 验证清单

## 代码修改
- [x] 所有 ProTable 组件已添加 `options={{ density: false }}`
- [x] GeneList.tsx、GeneAudit.tsx、GeneDetail.tsx 修改完成
- [x] 其他 24 个 ProTable 页面文件修改完成

## 编译
- [x] `npx tsc --noEmit` 零错误

## 浏览器验证
- [x] /gene/list 控制台 findDOMNode 错误为 0
- [x] /gene/audit 控制台 findDOMNode 错误为 0
- [x] /gene/detail/:id 控制台 findDOMNode 错误为 0
- [x] 基因模块所有页面功能正常（增删改查、搜索、分页）
- [x] 全局 10 个页面均无 findDOMNode 错误
