# 重构身份证正面展示栏 - 实施计划

## [x] 任务 1: 重构列表页认证材料列

**优先级**: 高

**描述**:
修改 AuditList.tsx 中列表页的认证材料列渲染逻辑：

1. 将三个 `<Image>` 组件（身份证正面、反面、手持）替换为原生 `<img>` 标签
2. 调整缩略图尺寸：从 52x36 增加到 60x42
3. 使用 `object-fit: contain` 确保SVG完整显示
4. 使用自定义的预览功能替代 Image.PreviewGroup

**实现步骤**:
```tsx
// 1. 添加预览状态
const [previewIndex, setPreviewIndex] = useState<number | null>(null);
const [previewList, setPreviewList] = useState<string[]>([]);

// 2. 重构认证材料列
const openPreview = (index: number, list: string[]) => {
  setPreviewList(list);
  setPreviewIndex(index);
};

// 3. 使用原生img + onClick打开预览
<img 
  src={record.id_card_front} 
  alt="身份证正面"
  width={60}
  height={42}
  style={{ objectFit: 'contain', cursor: 'pointer', borderRadius: 4 }}
  onClick={() => openPreview(0, [front, back, handheld])}
/>
```

**验收标准**: AC-1, AC-3

**测试要求**:
- `programmatic` TR-1.1: 列表页使用原生img标签显示缩略图
- `programmatic` TR-1.2: 点击缩略图能触发预览功能
- `human-judgement` TR-1.3: 缩略图完整显示，不裁剪


## [x] 任务 2: 重构MaterialCard组件

**优先级**: 高

**描述**:
修改 MaterialCard 组件，将 `<Image>` 组件替换为原生 `<img>` 标签：

1. 使用原生 `<img>` 标签显示图片
2. 保持现有的卡片样式（边框、悬停效果等）
3. 添加点击事件打开预览

**验收标准**: AC-2

**测试要求**:
- `programmatic` TR-2.1: MaterialCard使用原生img标签
- `human-judgement` TR-2.2: 展开区图片完整显示


## [x] 任务 3: 实现大图预览组件

**优先级**: 高

**描述**:
添加一个简单的大图预览功能：

1. 使用 Ant Design 的 Modal 组件显示大图
2. 支持左右切换查看三种认证材料
3. 支持关闭预览

**实现**:
```tsx
<Modal
  open={previewIndex !== null}
  onCancel={() => setPreviewIndex(null)}
  footer={null}
  width={600}
  centered
>
  {previewIndex !== null && (
    <div>
      <img src={previewList[previewIndex]} style={{ width: '100%' }} />
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <Button onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}>上一张</Button>
        <span>{previewIndex + 1} / {previewList.length}</span>
        <Button onClick={() => setPreviewIndex(Math.min(previewList.length - 1, previewIndex + 1))}>下一张</Button>
      </div>
    </div>
  )}
</Modal>
```

**验收标准**: AC-3

**测试要求**:
- `programmatic` TR-3.1: 点击缩略图能打开预览Modal
- `programmatic` TR-3.2: 预览Modal支持切换图片
- `human-judgement` TR-3.3: 大图清晰显示


## [x] 任务 4: 验证修复效果

**优先级**: 高

**描述**:
在浏览器中全面验证修复效果

**验收标准**: AC-1, AC-2, AC-3

**测试要求**:
- `human-judgement` TR-4.1: 列表页身份证正面缩略图正常显示
- `human-judgement` TR-4.2: 列表页身份证反面缩略图正常显示
- `human-judgement` TR-4.3: 列表页手持身份证缩略图正常显示
- `human-judgement` TR-4.4: 展开区图片正常显示
- `human-judgement` TR-4.5: 点击预览大图功能正常
