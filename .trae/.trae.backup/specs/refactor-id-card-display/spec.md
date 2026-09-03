# 重构身份证正面展示栏 - 产品需求文档

## 概述
- **摘要**: 彻底重构认证审核页面中身份证正面展示组件，使用原生HTML元素替代Ant Design Image组件，确保SVG格式的认证材料能稳定显示
- **目的**: 解决多次修复后身份证正面图片仍无法正常显示的问题，采用更可靠的技术方案
- **目标用户**: 后台管理员

## 问题分析
当前身份证正面展示存在以下核心问题：
1. Ant Design的`<Image>`组件对SVG data URL的支持不稳定
2. `<Image>`组件的`objectFit`属性对SVG渲染有兼容性问题
3. 缩略图尺寸过小（52x36px），导致SVG内容被裁剪
4. 多处使用`<Image>`组件，问题复现率高

## 重构方案

### 方案一：完全使用原生`<img>`标签（推荐）
- 列表页缩略图：使用原生`<img>`标签
- 展开详情区：使用原生`<img>`标签
- 大图预览：使用自定义预览组件或Image的preview功能
- 优点：兼容性最好，渲染最稳定
- 缺点：需要自己实现预览功能

### 方案二：保留`<Image>`组件但优化配置
- 使用`object-fit: contain`
- 添加`fallback`处理
- 调整尺寸
- 优点：保持代码一致性
- 缺点：可能仍有兼容性问题

**选择方案一**：彻底放弃Ant Design Image组件处理SVG，改用原生img标签。

## 功能需求
- **FR-1**: 列表页认证材料列的身份证正面缩略图能正常显示
- **FR-2**: 展开详情区的身份证正面大图能正常显示
- **FR-3**: 点击缩略图能打开大图预览
- **FR-4**: 所有三种认证材料（正面、反面、手持）都能正常显示

## 技术实现

### 列表页重构
```tsx
// 使用原生img + 自定义预览
<div onClick={() => openPreview(index)}>
  <img src={src} width={60} height={42} style={{ objectFit: 'contain' }} />
</div>
```

### 展开详情区重构
```tsx
// MaterialCard使用原生img
<img src={src} style={{ width: '100%', height: 150, objectFit: 'contain' }} />
```

### 大图预览
```tsx
// 使用Modal + img实现预览
<Modal open={previewOpen} onClose={...}>
  <img src={previewSrc} style={{ maxWidth: '100%' }} />
</Modal>
```

## 验收标准
### AC-1: 列表页缩略图显示
- **Given**: 用户有身份证正面照片数据
- **When**: 管理员访问认证审核页面
- **Then**: 身份证正面缩略图完整显示，不裁剪
- **验证**: `programmatic`

### AC-2: 展开详情区显示
- **Given**: 管理员展开一行记录
- **When**: 查看认证材料预览区
- **Then**: 身份证正面图片完整显示
- **验证**: `programmatic`

### AC-3: 点击预览大图
- **Given**: 缩略图正常显示
- **When**: 管理员点击缩略图
- **Then**: 打开大图预览，可切换查看其他材料
- **验证**: `programmatic`

## 约束
- 使用原生img标签替代Ant Design Image组件
- 保持现有的SVG生成逻辑不变
- 支持图片加载失败的fallback处理
