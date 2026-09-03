# 用户列表操作栏"更多"下拉菜单 - Implementation Plan

## [x] Task 1: 添加"更多"下拉菜单组件
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在操作列的现有按钮（详情、编辑、审核）后添加 Dropdown 组件
  - 下拉菜单包含7个选项：变更上级分销商、设置标签、重置密码、发放优惠券、调整余额、调整积分、黑名单
  - 调整操作列宽度从200px到280px
  - 每个选项点击后显示"功能开发中"提示
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-3, AC-4]
- **Test Requirements**:
  - `programmatic` TR-1.1: 运行 tsc --noEmit 无类型错误
  - `human-judgement` TR-1.2: 操作列可见"更多"按钮
  - `programmatic` TR-1.3: 点击"更多"弹出下拉菜单
  - `human-judgement` TR-1.4: 下拉菜单样式与参考截图一致
  - `programmatic` TR-1.5: 点击菜单项显示反馈提示
- **Notes**: 
  - 使用 Ant Design 的 Dropdown 组件
  - 菜单选项使用 items 属性配置
  - 可使用 DownOutlined 图标

## Implementation Details

### 修改位置
文件：`admin-web/src/pages/user-member/UserList.tsx`
位置：操作列的 render 函数（约第460-491行）

### 具体修改内容

1. **添加 DownOutlined 图标导入**（在 @ant-design/icons 导入中添加）

2. **修改操作列宽度**：从 200 改为 280

3. **在现有按钮后添加 Dropdown**：
```tsx
{/* 更多操作下拉菜单 */}
<Dropdown
  menu={{
    items: [
      { key: 'distributor', label: '变更上级分销商', icon: <ShareAltOutlined /> },
      { key: 'tag', label: '设置标签', icon: <TagsOutlined /> },
      { type: 'divider' },
      { key: 'reset-pwd', label: '重置密码', icon: <KeyOutlined /> },
      { key: 'coupon', label: '发放优惠券', icon: <GiftOutlined /> },
      { key: 'balance', label: '调整余额', icon: <WalletOutlined /> },
      { key: 'points', label: '调整积分', icon: <StarOutlined /> },
      { type: 'divider' },
      { key: 'blacklist', label: '黑名单', icon: <StopOutlined />, danger: true },
    ],
    onClick: ({ key }) => {
      const actionMap: Record<string, string> = {
        distributor: '变更上级分销商',
        tag: '设置标签',
        'reset-pwd': '重置密码',
        coupon: '发放优惠券',
        balance: '调整余额',
        points: '调整积分',
        blacklist: '加入黑名单',
      };
      message.info(`${actionMap[key]}功能开发中`);
    },
  }}
  placement="bottomRight"
  trigger={['click']}
>
  <Button type="link" size="small">
    更多 <DownOutlined />
  </Button>
</Dropdown>
```

4. **注意**：需要导入使用到的图标组件（如 DownOutlined, ShareAltOutlined, TagsOutlined, KeyOutlined, GiftOutlined, WalletOutlined, StarOutlined, StopOutlined）

### 简化方案（如果不想引入太多图标）
使用纯文字菜单，不使用图标：
```tsx
<Dropdown
  menu={{
    items: [
      { key: 'distributor', label: '变更上级分销商' },
      { key: 'tag', label: '设置标签' },
      { type: 'divider' },
      { key: 'reset-pwd', label: '重置密码' },
      { key: 'coupon', label: '发放优惠券' },
      { key: 'balance', label: '调整余额' },
      { key: 'points', label: '调整积分' },
      { type: 'divider' },
      { key: 'blacklist', label: '黑名单', danger: true },
    ],
    onClick: ({ key }) => {
      // 处理点击
    },
  }}
>
  <Button type="link" size="small">
    更多 <DownOutlined />
  </Button>
</Dropdown>
```
