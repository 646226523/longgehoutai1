# 认证材料预览功能 - Implementation Plan

## [x] Task 1: 实现认证材料点击预览功能
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在认证材料卡片上添加 onClick 事件
  - 使用 Ant Design 的 Image.PreviewGroup 实现图片预览
  - 添加预览状态管理（previewVisible, previewIndex）
  - 为三个卡片分别映射图片URL
  - 无图片时显示占位提示
- **Acceptance Criteria Addressed**: [AC-1, AC-2, AC-3, AC-4]
- **Test Requirements**:
  - `programmatic` TR-1.1: 点击卡片触发预览窗口
  - `programmatic` TR-1.2: 预览窗口支持放大缩小
  - `human-judgement` TR-1.3: 预览界面美观，操作流畅
  - `programmatic` TR-1.4: tsc --noEmit 编译通过
- **Notes**: 
  - 使用 Image.PreviewGroup 包裹图片区域
  - 暂无真实图片URL时可使用占位图或设置为 null 显示占位

## Implementation Details

### 修改位置
文件：`admin-web/src/pages/user-member/UserList.tsx`
位置：认证材料区域（约第1030-1081行）

### 具体修改内容

1. **添加状态**：
```tsx
const [previewVisible, setPreviewVisible] = useState(false);
const [previewIndex, setPreviewIndex] = useState(0);
```

2. **定义图片数据**：
```tsx
const certImages = [
  { label: '身份证正面', url: record?.cert_id_card_front || '' },
  { label: '身份证反面', url: record?.cert_id_card_back || '' },
  { label: '手持身份证', url: record?.cert_id_card_handheld || '' },
];
```

3. **替换卡片区域**：
使用 Image.PreviewGroup 包裹，每个卡片的 Image 添加 onClick 触发预览

4. **修改onClick**：
将 div 的 onClick 设置为触发 Image 的预览

### 建议方案
使用 Ant Design 5.x 的 Image.PreviewGroup 组件，为每个卡片的 Image 添加点击预览功能。
