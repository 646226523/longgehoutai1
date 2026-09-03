# Upload 全链路闭环 — 产品需求文档

## Overview

- **Summary**: 让 `/api/upload` 后端图片处理链路完整消费全部 image 组 10 项配置：在 base64 → 落盘之间依次执行 **水印叠加 → 质量压缩 → 三档缩略图生成**，返回扩展 JSON（包含原图 URL + 三档缩略图 URL）。七牛云直传暂不启用（access\_key 为空），代码预留条件分支。

- **Purpose**: 让系统配置页面的 10 个 image\_\* 配置项全部生效，配置不再是"样子货"。

- **Target Users**: 内容编辑（上传图片时自动获得压缩 + 水印 + 三档缩略图）、前端消费方（Banner、拍卖、基因档案等页面可直接用 thumbnails.small 列表图 / thumbnails.large 详情图）。

## Goals

- G1: upload 路由完整链路：水印（可选）→ 压缩（可选）→ 原图落盘 + 三档缩略图落盘

- G2: 一次性从 DB 加载所有 image\_\* 配置项，避免 10 次独立查询

- G3: 返回值扩展为 `{ url, thumbnails: { large, medium, small } }`，保持向后兼容（旧前端只消费 url 字段不受影响）

- G4: 七牛云分支预留（access\_key 非空时自动走 CDN 链路）

- G5: 图片处理 Tab 内 10 个配置项 **100% 被 upload 路由消费**

## Non-Goals (Out of Scope)

- 七牛云直传链路（access\_key 等全空，本轮不接入）

- 历史图片批量重处理

- 前端 ImageUploader 组件改造（当前兼容，后续迭代）

- 水印位置可拖拽 / 透明度自定义（本轮只用 image\_watermark\_position 6 选 1）

## Background & Context

- 已有：后端安装 sharp、compressImage helper、image\_compress\_quality 配置生效

- 缺失：image\_large/medium/small\_\* 六档缩略图尺寸 → 未生成；image\_watermark\_\* 三档 → 未叠加

- 七牛云：cloud\_storage 组 7 项，但 access\_key / secret\_key / bucket / domain **全空字符串**，后端 config.ts 已实现 upload-token / cloud-config 接口

- 当前 upload 返回 `{ url: "/uploads/xxx.jpg" }`，前端 ImageUploader 直接用这个 URL 展示

- 图片处理 Tab 3 张 Card（缩略图尺寸、水印设置、图片压缩）的 UI 完整，但后两者未被消费

## Functional Requirements

- **FR-1**: upload 路由启动时批量查询所有 image\_\* 配置，封装为 `ImagePipelineConfig` 对象（含 quality、watermark、large/medium/small 尺寸）

- **FR-2**: 新增 `applyWatermark(buffer, mimeType, cfg)` —— 用 sharp composite 叠加 SVG 文字水印，位置由 image\_watermark\_position 决定

- **FR-3**: 新增 `generateThumbnails(buffer, mimeType, cfg)` —— 对原图 resize 生成 3 档，尺寸为 0 时跳过该档

- **FR-4**: 主链路顺序：base64 → Buffer → applyWatermark（cfg.enable） → compressImage（quality<100） → 写原图 → generateThumbnails → 写缩略图

- **FR-5**: 返回值扩展 `{ url, thumbnails: { large?, medium?, small? } }`

- **FR-6**: 所有图像处理函数 try-catch 包裹，失败 fallback 原图或跳过该步

## Non-Functional Requirements

- **NFR-1**: 1MB JPEG 处理总耗时 ≤ 800ms（sharp 三档 resize + composite 很快）

- **NFR-2**: 缩略图目录 `uploads/thumbs/{large,medium,small}/` 不存在时自动创建

- **NFR-3**: 不破坏现有 API 契约（`res.data.url` 仍然存在）

## Constraints

- **Technical**: sharp composite SVG 文字需要指定 width（建议 600px，水印本身是矢量，不影响）；位置定位用 top/left/bottom/right 四选一

- **Business**: 管理员设置的宽高可能为 0（表示跳过该档），必须跳过而不是报错

- **Dependencies**: 仅依赖 sharp（已安装）、better-sqlite3（已有 db）

## Assumptions

- 水印文本默认值 "赛鸽基因" 已在 DB 种子

- 缩略图尺寸 0 表示该档不生成

- image\_watermark\_position 枚举值为 6 选 1（top-left / top-center / top-right / bottom-left / bottom-center / bottom-right）

## Acceptance Criteria

### AC-1: 三档缩略图自动生成

- **Given**: DB 中 image\_large\_width=1200, image\_large\_height=900

- **When**: 上传图片

- **Then**: `uploads/thumbs/large/{fileName}` 存在，宽高 ≤ 1200×900（保持比例）

- **Verification**: `programmatic`

### AC-2: 水印叠加生效

- **Given**: DB 中 image\_watermark\_enable=1, image\_watermark\_text="赛鸽基因", image\_watermark\_position="bottom-right"

- **When**: 上传图片

- **Then**: 返回的原图右下角可见半透明"赛鸽基因"文字水印

- **Verification**: `human-judgment`

- **Notes**: 水印颜色 rgba(255,255,255,0.5) + 黑色文字底阴影，避免白水印在浅背景上看不见

### AC-3: 返回值扩展 thumbnails 字段

- **Given**: 上传图片成功

- **When**: 查看 API 响应 JSON

- **Then**: `res.data.url` 与 `res.data.thumbnails.{large,medium,small}` 都有值（对应档尺寸为 0 时该字段缺失）

- **Verification**: `programmatic`

### AC-4: 向后兼容

- **Given**: 前端 ImageUploader 仅读取 `res.data.url`

- **When**: 后端返回含 thumbnails 的扩展 JSON

- **Then**: 前端无任何报错，正常展示 + 保存 url

- **Verification**: `human-judgment`

### AC-5: 七牛云预留分支

- **Given**: DB 中 qiniu\_access\_key 为空

- **When**: 上传图片

- **Then**: 走本地存储分支，本地文件存在

- **Verification**: `programmatic`

### AC-6: 尺寸为 0 跳过该档

- **Given**: DB 中 image\_small\_width=0, image\_small\_height=0

- **When**: 上传图片

- **Then**: 不创建 thumbs/small/ 文件，返回 JSON 中 thumbnails.small 缺失

- **Verification**: `programmatic`

## Open Questions

- 无（需求完全对齐）

