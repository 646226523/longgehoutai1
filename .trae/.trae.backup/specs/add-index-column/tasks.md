# 列表页面序号列添加 - Implementation Plan

## [x] Task 1: 内容管理 + 仲裁 + 竞拍模块 (7个文件) ✅
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 7 个文件：Banner.tsx, News.tsx, Notice.tsx, Case.tsx, Session.tsx, Items.tsx, Deal.tsx
- **Test Requirements**: ✅ 全部验证通过

## [x] Task 2: 赛事 + 公棚 + 基因模块 (9个文件) ✅
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 9 个文件：competition/*, loft/*, gene/*
- **Test Requirements**: ✅ 全部验证通过

## [x] Task 3: 检测 + NFT + 用户 + 系统模块 (9个文件) ✅
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 修改 9 个文件：detection/*, nft/*, user-member/*, system/*
- **Test Requirements**: ✅ 全部验证通过

## [x] Task 4: 构建与验证 ✅
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3
- **Test Requirements**: ✅ `npm run build` 通过，25 个文件全部包含序号列
