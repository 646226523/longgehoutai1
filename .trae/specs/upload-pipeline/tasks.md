# Upload 全链路闭环 — 实施计划

## [x] Task 1+2: 后端 — 重构 upload.ts 补齐全链路
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 新增 `loadImagePipelineConfig()` helper，一次性 SELECT image_like 配置项，封装为：
    ```typescript
    interface ImagePipelineConfig {
      quality: number;                  // 压缩质量 1-100, 默认 90
      watermark: {
        enable: boolean;                // image_watermark_enable === '1'
        text: string;                   // image_watermark_text, 默认 ''
        position: 'top-left'|'top-center'|'top-right'|'bottom-left'|'bottom-center'|'bottom-right';
      };
      large?:  { w: number; h: number };
      medium?: { w: number; h: number };
      small?:  { w: number; h: number };
    }
    ```
  - 新增 `applyWatermark(buffer, cfg)`：生成 SVG 文字（font-size 36px, white + black drop-shadow, rgba(255,255,255,0.5) 白色 50% 透明），用 sharp.composite 按 position 映射定位叠加；失败 return 原 buffer
  - 新增 `generateThumbnails(buffer, mimeType, cfg)`：三档各自 `sharp(buffer).resize({ width, height, fit: 'inside', withoutEnlargement: true })` → 生成对应格式；宽高为 0 跳过；返回 `{ large?: Buffer, medium?: Buffer, small?: Buffer }`
  - 主链路重写：
    1. 加载 cfg
    2. 水印（cfg.watermark.enable && cfg.watermark.text 非空时）
    3. 压缩（cfg.quality < 100）
    4. 写原图 uploads/{fileName}
    5. 生成 + 写缩略图 uploads/thumbs/{large,medium,small}/{fileName}
    6. 构建返回值 `{ url, thumbnails: { large?, medium?, small? } }`
  - 七牛云分支预留：如果 cfg.cloud.qiniu_access_key 非空（暂时跳过实现，只写注释 TODO）
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-5, AC-6
- **Test Requirements**:
  - `programmatic` TR-1.1: tsc --noEmit 零错误
  - `programmatic` TR-1.2: 上传图片后 uploads/thumbs/{large,medium,small}/ 下有对应文件
  - `programmatic` TR-1.3: 返回 JSON 含 thumbnails 字段，且缩略图 URL 可通过 HTTP GET 200 访问
  - `programmatic` TR-1.4: 水印 enable=1 + text 非空时返回原图含水印；enable=0 时不含
  - `human-judgement` TR-1.5: 浏览器 Console 零 error / 零 warn

## [ ] Task 2: 后端 — 自动创建 thumbs 目录 + 静态资源挂载确认
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 确认 index.ts 已 express.static('/uploads') 指向 uploads 目录（应该已存在）
  - 在 upload.ts 内 `if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })` 自动创建 thumbs/large、medium、small
- **Acceptance Criteria Addressed**: AC-1, AC-6
- **Test Requirements**:
  - `programmatic` TR-2.1: curl http://localhost:3015/uploads/thumbs/large/{fileName} 返回 200 + 图片内容

## [x] Task 3: 浏览器全链路验收
- **Priority**: high
- **Depends On**: Task 1, Task 2
- **Description**:
  - 配置水印 enable=1 + text="赛鸽基因" + position="bottom-right"，保存
  - 任意内容页面上传一张测试图
  - 截图返回结果，然后手动 GET 缩略图 URL 验证 3 档都 200
  - 关闭水印（enable=0）再上传，确认图上无水印
  - 把 image_small_width 改成 0 保存，再上传，确认 thumbnails.small 字段缺失
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-6
- **Test Requirements**:
  - `programmatic` TR-3.1: API 返回 thumbnails.large/medium/small 可 HTTP 200 访问
  - `human-judgement` TR-3.2: 水印视觉位置正确（bottom-right）、半透明不遮挡主体
  - `programmatic` TR-3.3: 前端 ImageUploader 无 error/warn
