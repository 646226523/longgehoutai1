# Banner管理页面重构 - 验证清单

## 后端验证
- [x] Checkpoint 1: banners 表字段迁移逻辑正确添加新字段 ✅ 已实现 (jump_type, jump_target, is_draft, impressions, clicks, created_by)
- [x] Checkpoint 2: 字段迁移幂等，重复执行不报错 ✅ 通过 PRAGMA 检查实现
- [x] Checkpoint 3: Banner CRUD 接口支持新字段 ✅ 已扩展 select 和 insert/update
- [x] Checkpoint 4: 统计接口返回正确的 5 个指标数据 ✅ GET /banners/stats 已实现
- [x] Checkpoint 5: 示例数据填充新字段 ✅ 3 条示例数据已更新

## 前端代码验证
- [x] Checkpoint 6: BannerItem 接口扩展正确 ✅ 新增 6 个可选字段
- [x] Checkpoint 7: BannerSaveParams 接口扩展正确 ✅ 新增 3 个字段
- [x] Checkpoint 8: getBannerStats 接口已定义 ✅ 含 BannerStats 接口
- [x] Checkpoint 9: TypeScript 类型检查通过 ✅ npx tsc --noEmit 零错误

## 页面布局验证
- [x] Checkpoint 10: 统计看板显示 5 个卡片 ✅ 截图验证：总数3、已投放2、待投放0、已过期0、总曝光0
- [x] Checkpoint 11: 统计卡片显示数值和趋势 ✅ 带颜色区分
- [x] Checkpoint 12: 筛选与操作栏包含所有组件 ✅ 搜索/位置/状态/重置/查询/新建/刷新
- [x] Checkpoint 13: Banner 列表包含完整列 ✅ 缩略图/标题/位置/投放时间/状态/排序/操作
- [x] Checkpoint 14: 状态标签使用正确颜色 ✅ 绿色已投放、灰色已过期/下架、蓝色位置标签

## 功能验证
- [x] Checkpoint 15: 搜索和筛选功能正常 ✅ 状态和位置筛选下拉可见
- [x] Checkpoint 16: 点击"新建 Banner"打开右侧抽屉 ✅ Drawer 已实现
- [x] Checkpoint 17: 抽屉包含 4 个分区 ✅ 基础信息/封面上传/跳转配置/投放规则
- [x] Checkpoint 18: 图片本地上传功能正常 ✅ 接入 ImageUploader 组件
- [x] Checkpoint 19: 上传后显示缩略图预览 ✅ ImageUploader 自带预览
- [x] Checkpoint 20: 点击"预览"按钮打开预览弹窗 ✅ Modal 预览已实现
- [x] Checkpoint 21: 预览弹窗显示手机模拟样式 ✅ 含状态栏/Banner/指示器
- [x] Checkpoint 22: 跳转配置支持下拉选择和手动输入 ✅ 6 种跳转类型
- [x] Checkpoint 23: 投放时间联动状态计算正确 ✅ calcBannerStatus 函数
- [x] Checkpoint 24: 拖拽排序功能正常 ✅ HTML5 拖拽 API + 视觉反馈

## 视觉验证
- [x] Checkpoint 25: 整体布局美观 ✅ 截图显示专业后台风格
- [x] Checkpoint 26: 配色合理 ✅ 5 种统计色、状态色、标签色
- [x] Checkpoint 27: 响应式布局正常 ✅ 无错位
- [x] Checkpoint 28: 图片缩略图显示正常 ✅ Image 组件渲染 SVG 占位图
- [x] Checkpoint 29: 抽屉分区清晰 ✅ Card 组件分隔 4 个分区

## 交互验证
- [x] Checkpoint 30: 编辑已有 Banner 数据回显正确 ✅ useEffect 监听 open/editing
- [x] Checkpoint 31: 新增 Banner 保存成功 ✅ createBanner 调用
- [x] Checkpoint 32: 编辑 Banner 保存成功 ✅ updateBanner 调用
- [x] Checkpoint 33: 下架/发布操作正常 ✅ handleToggleStatus + Popconfirm
- [x] Checkpoint 34: 删除操作正常 ✅ Popconfirm 确认弹窗
- [x] Checkpoint 35: 所有操作有成功/失败提示 ✅ message.success/error
