# 腾讯地图定位修复 - Verification Checklist

## 创建公棚页面
- [ ] Checkpoint 1: 创建公棚弹窗右侧显示地图组件（非占位符）
- [ ] Checkpoint 2: 创建模式下地图正常加载和渲染

## 腾讯地图功能
- [ ] Checkpoint 3: 腾讯地图点击选点后地址自动回填
- [ ] Checkpoint 4: 腾讯地图地址搜索功能可用
- [ ] Checkpoint 5: 腾讯地图"重新定位"按钮可用
- [ ] Checkpoint 6: 地图加载失败时有明确错误提示

## 通用
- [ ] Checkpoint 7: 编辑公棚页面的地图功能保持正常
- [ ] Checkpoint 8: 保存后 `location` 字段（含 lng/lat/address）正确提交到后端
- [ ] Checkpoint 9: `npm run build` 通过
