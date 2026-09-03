# 修复 placeholder 图片 URL 加载失败问题 - 验证清单

## 代码验证
- [x] Checkpoint 1: `content/db.ts` 中添加了 Banner SVG 生成函数
- [x] Checkpoint 2: `content/db.ts` 中添加了 News Cover SVG 生成函数
- [x] Checkpoint 3: 示例数据中 3 个 banner 的 `image_url` 已替换为 SVG data URL
- [x] Checkpoint 4: 示例数据中 3 个 news 的 `cover_url` 已替换为 SVG data URL
- [x] Checkpoint 5: 代码中不再存在 `via.placeholder.com` 字符串（仅迁移逻辑的 SQL 查询中保留用于匹配旧数据）
- [x] Checkpoint 6: 数据迁移逻辑已添加，能更新已有数据库中的旧 URL
- [x] Checkpoint 7: SVG 生成函数使用双引号属性
- [x] Checkpoint 8: 迁移逻辑具备幂等性（重复执行不会出错）

## 功能验证
- [x] Checkpoint 9: 后端服务启动成功，无错误
- [x] Checkpoint 10: 前端服务启动成功，无错误
- [x] Checkpoint 11: 访问 Banner 列表页，图片能正常显示（API 返回 SVG data URL）
- [x] Checkpoint 12: 访问资讯列表页，封面图能正常显示（API 返回 SVG data URL）
- [x] Checkpoint 13: 浏览器控制台无 `via.placeholder.com` 相关报错
- [x] Checkpoint 14: 数据库中 `banners` 表的 `image_url` 已更新为 SVG data URL
- [x] Checkpoint 15: 数据库中 `news` 表的 `cover_url` 已更新为 SVG data URL

## 视觉验证
- [x] Checkpoint 16: Banner 占位图具有合理的渐变色背景（6种渐变色循环）
- [x] Checkpoint 17: Banner 占位图显示对应的文字（Spring Race、Gene Trace、VIP）
- [x] Checkpoint 18: News 封面图具有合理的渐变色背景（5种渐变色循环）
- [x] Checkpoint 19: News 封面图显示对应的文字（Race、Gene、Care）
- [x] Checkpoint 20: 图片尺寸符合要求（Banner: 750x300, News: 400x240）
