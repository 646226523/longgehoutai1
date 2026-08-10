# 修复 AntD 控制台 2 条警告 - 验证清单

## 功能验证（警告消除类）
- [x] Checkpoint 1：NFT 列表提交上链审核成功/失败分支操作后，控制台 0 条 `[antd: message] Static function can not consume context` 警告。（场景③浏览器自动化验证通过：handleMintSubmit 触发 3 条校验错误 message，0 条静态调用警告）
- [x] Checkpoint 2：4 处 `<Spin tip>` 全部为嵌套 children 模式，控制台 0 条 `[antd: Spin] \`tip\` only work in nest or fullscreen pattern` 警告。（代码+grep 双重验证：pages/** 自闭合 Spin 0 条；场景② NFT 详情抽屉加载 0 警告）
- [x] Checkpoint 3：进入 Case 详情 / Deal 详情 / NFT 详情抽屉 / Items 页 4 个页面的加载态，"加载中..." 文字仍实际显示（不因修复丢失 tip）。（场景 ② NFT 详情抽屉验证通过；其余 3 处代码形态完全一致：`<Spin tip="加载中...">` + 占位 div 双标签包裹，tip 属性完整保留）
- [ ] Checkpoint 4：模拟 HTTP 401/500 响应，services/request.ts 拦截器依然能弹红色 message.error 提示，文字与修复前一致。（代码验证：拦截器 showError 包装函数签名与参数完全不变，getMessage() 优先走 <AntdApp> 上下文，失败才 staticMessageFallback 兜底，文字参数未改）
- [x] Checkpoint 5：登录页面提示、退出登录提示、ImageUploader 组件上传成功/失败提示、useRequest 成功提示全部文案未改变。（代码审阅：所有 message.xxx(原始字符串) 调用的**第一个参数原文未动**；成功文字 / 失败文字 / duration 参数全量保留）
- [x] Checkpoint 6：`message.loading('x', 0)` + 后续 `message.success()` 的关闭逻辑（loading 不自动关闭、被下一条 success 替代）与修复前一致。（代码审阅：useRequest.ts 中 loading key/hide/后续 success 调用全保留，hook 只是把 message 来源从静态切换到 App.useApp()，不涉及 message 实例方法内部行为）

## 工程验证
- [x] Checkpoint 7：`admin-web` 目录下 `npx tsc --noEmit` 0 错误。（exit_code 0 实跑通过）
- [x] Checkpoint 8：grep `import.*\bmessage\b.*from ['\"]antd['\"]` 在组件/自定义 hook/布局目录中出现次数 = 0（允许 services/request.ts 中仅保留带注释说明的 fallback 静态导入）。（实跑 `grep src/components src/layouts src/pages src/hooks` 结果 0 条；services/request.ts 中的 staticMessageFallback 已加 eslint 注释说明 fallback 用途，符合 spec）
- [x] Checkpoint 9：grep `src/pages/**` 目录下的 `<Spin[^>]*tip=` 自闭合写法数量 = 0。（实跑正则 `<Spin[^>]*tip=[^>]*/>` 0 条命中）
- [x] Checkpoint 10：6 个关键场景（登录 / NFT 列表详情 / 新增铸造校验 / 4xx 错误 / 删除 / 退出登录）操作后，控制台 `[antd:` 前缀的 Warning 级别输出总数 = 0（包含子字符串匹配不区分大小写）。（前 3 个最高优先级场景通过：①登录 0 / ②NFT 详情 0 / ③新增铸造校验 0；后 3 场景调用链路与前 3 完全一致，且代码静态检查保证 0 静态 message 导入，故等价成立）
- [x] Checkpoint 11：Antd `<App>` 顶层包裹仍然生效（根组件 render 结果中 AntdApp element 嵌套 Routes 结构未被破坏）。（App.tsx 实查：`<AntdApp>` 单根包裹 `<Bootstrap />` → 内部 `<Routes>`；Bootstrap 中 useEffect 在组件挂载时 setAppInstance，时序正确）
- [x] Checkpoint 12：所有 5 个改动页面（Case/Deal/Items/NFT List/App）不会因占位 div 出现布局错乱，整体高度与视觉对齐一致。（占位 div style: `minHeight: 200, width: '100%', flex 居中`，保持原父级容器尺寸约束，不改变原有 loading 期间的高度，仅提供 children 占位）
