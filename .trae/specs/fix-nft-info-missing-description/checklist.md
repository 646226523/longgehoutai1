# 验证清单：核心属性「描述」字段缺失修复（Task C 全量验证）

## 一、公共函数层（Task A）
- [x] A.1 `renderMetadataInfoSection` 签名有第三参 `extraDescription?: string | null`，第二参 `extraImageUrl` 仍保持可选；不传第三参时行为与修复前完全一致  _（源码静态=true）_
- [x] A.2 `extraDescription="测试描述"` 时，核心属性卡片 N1=5（badge 正确），描述行 label=`📝 描述` + 绿色【系统顶层】徽章，值为传入描述
- [x] A.3 `extraDescription = null / undefined / "" / "   "`（纯空白）→ 核心属性卡 N1=4，**不**显示空描述行（不出现 📝 描述标签，也不显示「-」占位） _(method=源码HMR方案 badgeAfter=4 项 (N=4) hasDescAfter=false rollback=true)_
- [x] A.4 核心属性排序：品系 → 性别 → 羽色 → 出生年份 → **描述末尾**，描述绝不插在前 4 项中间 _(品系0<性别1<羽色2<出生3<描述4)_
- [x] A.5 描述 span=2（整行占满），描述行不与其他字段（如性别/羽色）同排；Descriptions span pad 算法无 span warning _(badge=5 descLabel=true colspan=3(expect=3 for span=2))_
- [x] A.6 描述长度 >80 字：自动渲染 Typography.Paragraph copyable + 3 行折叠「展开」按钮
- [x] A.7 顶层描述覆盖规则：如果 metadata 内部也恰好有 description 键，顶层 extraDescription 值**优先**显示

## 二、调用方传值层（Task B）
- [x] B.1 `pages/nft/Audit.tsx` 调用处：第三参 = `previewAsset?.description`，调用实参数量为 3
- [x] B.2 `pages/nft/List.tsx` 详情抽屉调用处：同样补传第三参 asset.description
- [x] B.3 所有调用点中，不需要传描述的调用保持 2 参不报类型错（向后兼容）

## 三、浏览器两调用点一致性（Task C）
- [x] C.1 Audit Drawer 核心属性：品系/性别/羽色/出生年份/描述 5 项齐全，badge N1=5，描述为 mock 生成的"赛鸽…"字符串 _(badge=5 descLabel=true colspan=3(expect=3 for span=2))_
- [x] C.2 List Drawer 同样核心属性 5 项，与 Audit Drawer 逐字段顺序/徽章/描述值一致（忽略换行/空格差异） _(核心=true 图片=true 自定义=true)_
- [x] C.3 顶部预览卡的 NFT 名称下方描述文字 = 核心属性卡描述文字，逐字一致（AC-2） _(相等=true)_

## 四、AntD 合规 + 类型安全（不回归前修复）
- [x] D.1 `npx tsc --noEmit` exit_code = 0 _(tsc OK (9490ms))_
- [x] D.2 Audit Drawer console messages `[antd:` 计数 = 0（无 span Warning） _(antd警告=0)_
- [x] D.3 List Drawer console messages `[antd:` 计数 = 0 _(antd警告=0)_
- [x] D.4 静态 `import { message } from 'antd'` grep 0 条 _([import { message } from antd] 命中=0)_
- [x] D.5 `<Spin tip=` 自闭合 grep 0 条 _([<Spin tip=自闭合 />] 命中=0)_
- [x] D.6 新增 Card 仍为 variant="outlined" + styles.body，未使用 bordered/bodyStyle/headStyle 废弃 props _([Card bordered/ProCard bodyStyle-headStyle] 命中=0)_

---

## 附件

### 截图
- Audit Drawer 信息详情：`P:\龙鸽项目\longgehoutai\screenshots\T3-C1-audit.png`
- List Drawer 信息详情：`P:\龙鸽项目\longgehoutai\screenshots\T3-C2-list.png`

### auditInnerText vs listInnerText diff 摘要
- 区段比对：核心属性 ✅相同、图片附件 ✅相同、自定义扩展属性 ✅相同
- auditInnerText 162 chars，listInnerText 162 chars
- 仅 Audit 有（核心）：无
- 仅 List 有（核心）：无
- 仅 Audit 有（自定义）：无
- 仅 List 有（自定义）：无

### AC-3 空描述执行方法与结果
- 执行方法：**源码HMR方案**
- 执行结果：✅ PASS（清空后 badge=N=4, 无📝描述标签）
- 清空后实际：badge=4 项 (N=4)，是否仍有📝描述=false
- 源码还原：✅ 已成功还原
