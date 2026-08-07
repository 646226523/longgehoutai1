# Verification Checklist

## 修复 message 静态函数警告
- [x] 全局 `<App>` 组件已在 App.tsx 中正确挂载
- [x] `useAntdApp` Hook 已创建并导出 message/modal/notification 实例
- [x] Login.tsx 中所有 `message.xxx()` 静态调用已改为 Hook 调用
- [x] request.ts 拦截器中的 `message.error()` 已改为通过 `_message` 可配置实例 + console.error 降级
- [x] 所有 pages/ 下的 `message.xxx()` 静态调用已批量修复（20 个文件）

## 修复 Card bodyStyle 废弃警告
- [x] Dashboard.tsx 中 `bodyStyle` 已改为 `styles.body`
- [x] 全局搜索确认无其他 `bodyStyle` 使用

## 修复 findDOMNode 和 Spin 警告
- [x] @ant-design/pro-components 已确认当前版本为最新，无可用升级版本

## 编译与验证
- [x] `npx tsc --noEmit` 返回 0 错误
- [x] 浏览器控制台 `[antd: message]` 错误为 0
- [x] 浏览器控制台 `[antd: Card] bodyStyle` 警告为 0
- [x] 剩余警告仅为 ProComponents 内部（findDOMNode、Spin tip、Modal destroyOnClose）和 React Router v7 迁移提示
- [x] 所有页面可正常访问且功能正常
