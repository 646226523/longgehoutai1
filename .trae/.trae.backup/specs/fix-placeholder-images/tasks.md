# 修复 placeholder 图片 URL 加载失败问题 - 实施计划

## [x] Task 1: 添加 SVG 占位图生成函数
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 `content/db.ts` 中添加 `generateBannerSvg(text, width, height)` 函数，生成 Banner 占位图 SVG
  - 在 `content/db.ts` 中添加 `generateNewsCoverSvg(text, width, height)` 函数，生成新闻封面占位图 SVG
  - 使用渐变色背景和文字，视觉风格与原 placeholder 相似
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-5
- **Test Requirements**:
  - `programmatic` TR-1.1: 函数返回有效的 SVG data URL
  - `programmatic` TR-1.2: SVG 使用双引号属性
  - `human-judgement` TR-1.3: 生成的 SVG 具有合理的视觉效果

## [x] Task 2: 替换示例数据中的 placeholder URL
- **Priority**: high
- **Depends On**: Task 1
- **Description**: 
  - 将 banners 示例数据中的 3 个 `image_url` 替换为新的 SVG data URL
  - 将 news 示例数据中的 3 个 `cover_url` 替换为新的 SVG data URL
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-2.1: 所有 `via.placeholder.com` URL 已被替换
  - `programmatic` TR-2.2: 代码中不再存在 `via.placeholder.com` 字符串

## [x] Task 3: 添加数据迁移逻辑
- **Priority**: high
- **Depends On**: Task 2
- **Description**: 
  - 在初始化代码中添加数据迁移逻辑，更新已有数据库中的旧 placeholder URL
  - 使用 UPDATE 语句将 `image_url` 和 `cover_url` 中匹配 `via.placeholder.com` 的记录替换为新的 SVG data URL
  - 迁移逻辑需幂等
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `programmatic` TR-3.1: 迁移逻辑能正确更新已有数据
  - `programmatic` TR-3.2: 重复执行迁移不会出错
  - `programmatic` TR-3.3: 迁移后数据库中不再存在 `via.placeholder.com` URL

## [x] Task 4: 验证修复效果
- **Priority**: high
- **Depends On**: Task 3
- **Description**: 
  - 重启后端服务
  - 启动前端服务
  - 访问内容管理相关页面，验证图片显示正常
  - 检查控制台是否还有 placeholder 相关报错
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3
- **Test Requirements**:
  - `programmatic` TR-4.1: 浏览器控制台无 `via.placeholder.com` 相关报错
  - `human-judgement` TR-4.2: Banner 列表页图片显示正常
  - `human-judgement` TR-4.3: 资讯列表页封面图显示正常
