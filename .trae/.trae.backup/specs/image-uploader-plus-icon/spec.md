# 图片上传占位图标优化 - Spec

## Why
当前图片上传区域的占位图标是一个鸽子剪影（赛鸽 SVG），后台操作员无法直观地识别这是一个图片上传区域。需要将占位图标改为标准的加号（+）图标，符合常规上传组件的用户认知。

## What Changes
- 将 `ImageUploader.tsx` 中占位图的鸽子剪影 SVG 替换为加号 SVG 图标
- 加号图标尺寸和样式参考 Ant Design Upload 组件风格

## Impact
- Affected code: `components/ImageUploader.tsx`

## ADDED Requirements
### Requirement: 加号占位图标
上传区域无图片时显示加号（+）图标，替代现有的鸽子剪影，让后台操作员一眼识别为上传区域。

## MODIFIED Requirements
无

## REMOVED Requirements
- 移除 `PIGEON_SVG` 常量（鸽子剪影 SVG）