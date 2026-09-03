# 图片压缩比例配置 — 实施计划

## [x] Task 1: 后端 — 安装 sharp + 新增配置种子

- **Priority**: high

- **Depends On**: None

- **Description**:

  - 在 admin-api 执行 `npm install sharp`（sharp 0.33+ 有 Windows 预编译包，无需 node-gyp）

  - 在 db.ts 配置种子数组中新增一行 `['image_compress_quality', '90', '图片压缩比例', 'image', '上传后按此质量压缩原图（100=不压缩）', 8]`

  - 重启后端让 seed 生效

- **Acceptance Criteria Addressed**: AC-3

- **Test Requirements**:

  - `programmatic` TR-1.1: `SELECT config_key FROM system_config WHERE config_key='image_compress_quality'` 返回 1 行，config\_value='90'

  - `programmatic` TR-1.2: 后端 tsx 编译无新错误（sharp 自带类型声明）

- **Notes**: sharp import 方式 `import sharp from 'sharp'`

## [x] Task 2: 后端 — upload 路由接入压缩逻辑

- **Priority**: high

- **Depends On**: Task 1

- **Description**:

  - 在 upload.ts 顶部引入 `import sharp from 'sharp'` 和 `import { db } from '../db'`

  - 写一个 helper `async function compressImage(buffer: Buffer, quality: number): Promise<Buffer>`：

    - JPEG → sharp(buffer).jpeg({ quality, mozjpeg: true }).toBuffer()

    - WEBP → sharp(buffer).webp({ quality }).toBuffer()

    - PNG → sharp(buffer).png({ compressionLevel: Math.round(9 - quality/100\*9), palette: quality < 90 }).toBuffer()

    - 不支持类型 → 直接返回原 buffer

  - 在 `/upload` 路由 `fs.writeFileSync(filePath, fileBuffer)` 之前：读取 `image_compress_quality`，若 parse 后 < 100 则调用 compressImage，try-catch 包裹，失败 fallback 原 buffer + console.warn

- **Acceptance Criteria Addressed**: AC-4, AC-5

- **Test Requirements**:

  - `programmatic` TR-2.1: quality=70 上传后文件大小 < 原大小

  - `programmatic` TR-2.2: quality=100 上传后文件大小 ≈ 原大小（±2%）

  - `human-judgement` TR-2.3: 压缩失败时（如非图片类型）控制台出现 warn 日志但上传不中断

- **Notes**: 先在路由顶部 `SELECT config_value FROM system_config WHERE config_key='image_compress_quality'`，设默认值 90 避免配置缺失崩溃

## [x] Task 3+4: 前端 — FIELD_META + 新增图片压缩 Card

- **Priority**: high

- **Depends On**: Task 1

- **Description**:

  - 在 Config.tsx 的 FIELD\_META 对象 image\_watermark\_position 之后，新增：

    ```
    image_compress_quality: {
      type: 'select',
      options: [
        { label: '不压缩', value: '100' },
        { label: '90% 高清', value: '90' },
        { label: '70% 标准', value: '70' },
        { label: '50% 中等', value: '50' },
        { label: '20% 低质', value: '20' },
      ],
    },
    ```

  - 从 @ant-design/icons 新增引入 `CompressOutlined`

- **Acceptance Criteria Addressed**: AC-1

- **Test Requirements**:

  - `programmatic` TR-3.1: `npx tsc --noEmit` 零错误

  - `human-judgement` TR-3.2: 浏览器打开图片处理 Tab，能看到 Segmented/Select 组件包含 5 个选项

## \[ ] Task 4: 前端 — renderImagePanel 新增"图片压缩"Card

- **Priority**: high

- **Depends On**: Task 3

- **Description**:

  - 在 renderImagePanel 函数内、水印 Card 之后新增第 3 张 Card

  - 标题区：CompressOutlined 图标（渐变紫蓝色背景）+ "图片压缩" 标题 + "上传原图按所选质量重新压缩，平衡画质与体积" 副标题

  - 内容区：Select 下拉框 + 右侧独立"保存设置"按钮（使用现有 handleSave）

  - 参考已有 Card 样式：borderRadius 12、border 1px solid #f0f0f0、padding 14px 16px

- **Acceptance Criteria Addressed**: AC-1, AC-2

- **Test Requirements**:

  - `human-judgement` TR-4.1: 三张 Card 视觉风格统一（圆角、渐变图标区、间距 16px）

  - `programmatic` TR-4.2: 切换选项 → 点击保存 → Network 面板出现 PUT /api/system/configs/image\_compress\_quality，请求体 config\_value 正确

  - `human-judgement` TR-4.3: Console 无红色 error / 黄色 warn

- **Notes**: 复用 renderThumbRow/renderWatermarkSection 的独立保存按钮模式，或者直接用 Select + handleSave(imageCompressItem)

## [x] Task 5: 集成验证 — 浏览器全链路

- **Priority**: high

- **Depends On**: Task 1, Task 2, Task 3, Task 4

- **Description**:

  - 浏览器端登录，进入系统配置 → 图片处理 Tab

  - 切换压缩比例到 50%，保存

  - 用 ImageUploader 组件上传一张测试图（走真实 upload 路由）

  - 后端日志确认 sharp 被调用、压缩后文件 size 明显变小

  - 切回"不压缩"再上传，文件大小恢复原样

- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5

- **Test Requirements**:

  - `programmatic` TR-5.1: Tab 数量 = 3，每张 Card 内容完整

  - `programmatic` TR-5.2: 保存后刷新页面配置值持久化

  - `programmatic` TR-5.3: 上传同一图片两次（压缩 vs 不压缩），文件 hash 不同、压缩版本文件 size < 不压缩版本 \* 0.8

