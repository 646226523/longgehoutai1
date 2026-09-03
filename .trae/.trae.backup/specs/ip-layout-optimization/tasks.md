# IP地址信息布局优化 - Implementation Plan

## [x] Task 1: IP地址列渲染优化
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改活动记录表格中IP地址列的渲染方式
  - 移除 `<Text code>` 组件，替换为自定义渲染
  - 添加复制按钮功能
  - 添加悬停高亮效果
  - 调整列宽为130px
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-3, AC-4]
- **Test Requirements**:
  - `programmatic` TR-1.1: 运行 tsc --noEmit 无类型错误
  - `programmatic` TR-1.2: 页面加载后活动记录表格正常显示，IP地址无灰色代码背景
  - `human-judgement` TR-1.3: IP地址展示样式清晰易读，与表格整体风格协调
  - `human-judgement` TR-1.4: 鼠标悬停IP地址有视觉反馈
  - `human-judgement` TR-1.5: 复制按钮点击后有反馈提示
- **Notes**: 
  - 可使用 Ant Design 的 Copyable 或自定义复制逻辑
  - 需要导入合适的图标组件（如 CopyOutlined）
  - 保持表格其他列不变

## Implementation Details

### 修改位置
文件：`admin-web/src/pages/user-member/UserList.tsx`
位置：活动记录Tab表格的IP地址列渲染（约第1321-1326行）

### 具体修改内容

1. **添加导入**（如需要）：
   - `CopyOutlined` 图标组件（从 `@ant-design/icons`）

2. **修改IP地址列定义**：
```tsx
{
  title: 'IP地址',
  dataIndex: 'ip',
  width: 130,
  render: (ip: string) => (
    <Tooltip title="点击复制">
      <span 
        style={{ 
          cursor: 'pointer',
          color: '#1677ff',
          fontFamily: 'monospace',
          fontSize: 12,
          padding: '2px 6px',
          borderRadius: 4,
          transition: 'all 0.2s'
        }}
        onClick={() => {
          navigator.clipboard.writeText(ip);
          message.success('IP已复制');
        }}
      >
        {ip}
      </span>
    </Tooltip>
  ),
},
```

3. **或者使用 Ant Design 内置的 Copyable**：
```tsx
{
  title: 'IP地址',
  dataIndex: 'ip',
  width: 130,
  render: (ip: string) => (
    <Text copyable={{ text: ip }} style={{ fontFamily: 'monospace' }}>
      {ip}
    </Text>
  ),
},
```

### 建议方案
使用 Ant Design 5.x 的 `Text copyable` 属性方案，更简洁且原生支持复制功能。
