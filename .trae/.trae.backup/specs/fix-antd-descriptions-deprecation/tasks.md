# 修复 Ant Design Descriptions 组件弃用警告 - The Implementation Plan

## [x] Task 1: 修复 Session.tsx 中 Descriptions 组件的弃用属性
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 将第 967-971 行的 `labelStyle` 和 `contentStyle` 迁移为 `styles` API
  - 将第 1008-1012 行的 `labelStyle` 和 `contentStyle` 迁移为 `styles` API
  - 具体修改：
    ```tsx
    // Before (line 967-971):
    <Descriptions
      column={1}
      size="small"
      labelStyle={{ color: token.colorTextSecondary, width: 80, fontSize: 12 }}
      contentStyle={{ fontSize: 13 }}
    >
    
    // After:
    <Descriptions
      column={1}
      size="small"
      styles={{
        label: { color: token.colorTextSecondary, width: 80, fontSize: 12 },
        content: { fontSize: 13 },
      }}
    >
    ```
    
    ```tsx
    // Before (line 1008-1012):
    <Descriptions
      column={2}
      size="small"
      labelStyle={{ color: token.colorTextTertiary, fontSize: 11, width: 'auto' }}
      contentStyle={{ fontSize: 12 }}
    >
    
    // After:
    <Descriptions
      column={2}
      size="small"
      styles={{
        label: { color: token.colorTextTertiary, fontSize: 11, width: 'auto' },
        content: { fontSize: 12 },
      }}
    >
    ```
- **Acceptance Criteria Addressed**: AC-1, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-1.1: 浏览器打开"新增拍卖场次"对话框后，控制台无 `labelStyle`/`contentStyle` 弃用警告
  - `programmatic` TR-1.2: TypeScript 编译零错误
  - `human-judgement` TR-1.3: 预览区域的 Descriptions 组件视觉样式与修改前一致
- **Notes**: Session.tsx 中第 1365 行的 Descriptions 组件未使用弃用属性，无需修改

## [x] Task 2: 修复 nft-metadata-render.tsx 中 Descriptions 组件的弃用属性
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 将第 574-575 行的 `labelStyle` 和 `contentStyle` 迁移为 `styles` API
  - 具体修改：
    ```tsx
    // Before (line 574-575):
    labelStyle={{ display: 'none', border: 'none' }}
    contentStyle={{ border: 'none', color: 'transparent' }}
    
    // After:
    styles={{
      label: { display: 'none', border: 'none' },
      content: { border: 'none', color: 'transparent' },
    }}
    ```
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-4
- **Test Requirements**:
  - `programmatic` TR-2.1: 浏览器打开 NFT 元数据渲染页面后，控制台无 `labelStyle`/`contentStyle` 弃用警告
  - `programmatic` TR-2.2: TypeScript 编译零错误
  - `human-judgement` TR-2.3: NFT 元数据渲染的 Descriptions 组件视觉样式与修改前一致
