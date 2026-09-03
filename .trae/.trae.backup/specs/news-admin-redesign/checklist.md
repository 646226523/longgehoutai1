# 资讯管理页面重构 - 验证清单

## 后端接口
- [ ] Checkpoint 1: GET /api/content/news/stats 返回正确的统计数据（total, published, draft, offline, top）
- [ ] Checkpoint 2: 统计接口需要鉴权和 content:view 权限
- [ ] Checkpoint 3: 前端 services/content.ts 中 NewsStats 接口类型正确定义
- [ ] Checkpoint 4: 前端 getNewsStats() 函数可正确调用接口

## 统计看板
- [ ] Checkpoint 5: 页面顶部展示5个统计卡片（总资讯/已发布/草稿/置顶/总浏览量）
- [ ] Checkpoint 6: 每个卡片显示数值和趋势箭头方向
- [ ] Checkpoint 7: 数据加载中显示 loading 状态
- [ ] Checkpoint 8: 数据加载失败时有错误提示

## 筛选操作栏
- [ ] Checkpoint 9: 筛选区包含标题搜索、分类选择、状态选择、重置/查询按钮
- [ ] Checkpoint 10: 操作栏包含新增资讯、刷新按钮
- [ ] Checkpoint 11: 筛选条件 labelWidth 自适应

## 列表表格 - 封面列
- [ ] Checkpoint 12: 封面列显示 120×80 缩略图
- [ ] Checkpoint 13: 点击封面图可放大预览
- [ ] Checkpoint 14: 无封面时显示灰色占位图"🖼️ 无封面"
- [ ] Checkpoint 15: 图片加载失败显示"⚠️ 加载失败"
- [ ] Checkpoint 16: 封面图圆角样式与整体风格一致

## 列表表格 - 状态列
- [ ] Checkpoint 17: 已发布显示绿色标签
- [ ] Checkpoint 18: 草稿显示橙色标签
- [ ] Checkpoint 19: 已下架显示灰色标签
- [ ] Checkpoint 20: 置顶资讯标题旁显示红色"📌 置顶"徽章

## 操作列
- [ ] Checkpoint 21: 操作按钮分为三组：内容操作[编辑][预览]、状态操作[发布/下架][置顶]、危险操作[删除]
- [ ] Checkpoint 22: 草稿状态资讯显示：编辑、预览、发布、置顶、删除
- [ ] Checkpoint 23: 已发布状态资讯显示：编辑、预览、下架、取消置顶、删除
- [ ] Checkpoint 24: 已下架状态资讯显示：编辑、预览、发布、置顶、删除
- [ ] Checkpoint 25: 删除按钮为红色文字
- [ ] Checkpoint 26: 点击删除弹出二次确认对话框（Popconfirm）

## 侧边抽屉编辑
- [ ] Checkpoint 27: 抽屉宽度 760px
- [ ] Checkpoint 28: 表单分为4个区域：基础信息、封面图片、内容编辑、发布设置
- [ ] Checkpoint 29: 基础信息区域包含标题、分类、作者字段
- [ ] Checkpoint 30: 封面图片区域使用 ImageUploader 组件（本地上传）
- [ ] Checkpoint 31: 内容编辑区域支持编辑/预览 Tab 切换
- [ ] Checkpoint 32: 发布设置区域包含置顶开关、状态选择、摘要
- [ ] Checkpoint 33: 编辑时数据正确回显
- [ ] Checkpoint 34: 表单校验（标题必填）正常工作
- [ ] Checkpoint 35: 保存成功后列表刷新

## 预览弹窗
- [ ] Checkpoint 36: 点击预览按钮打开预览弹窗
- [ ] Checkpoint 37: 预览弹窗以手机模拟器样式展示
- [ ] Checkpoint 38: 正确显示封面图、标题、分类、发布时间
- [ ] Checkpoint 39: 正文 HTML 正确渲染
- [ ] Checkpoint 40: 加载中状态有 loading 提示
- [ ] Checkpoint 41: 加载完成后内容正确显示

## 批量操作
- [ ] Checkpoint 42: 列表支持多选（选择列显示复选框）
- [ ] Checkpoint 43: 选中行后批量操作按钮可用
- [ ] Checkpoint 44: 未选中行时批量操作按钮禁用
- [ ] Checkpoint 45: 批量操作包含批量发布、批量下架、批量删除
- [ ] Checkpoint 46: 批量操作弹出确认对话框
- [ ] Checkpoint 47: 批量操作完成后显示成功/失败结果
- [ ] Checkpoint 48: 批量操作完成后列表刷新并清除选择

## 整体验证
- [ ] Checkpoint 49: TypeScript 编译无错误
- [ ] Checkpoint 50: 页面整体布局美观专业，与其他管理页面风格一致
- [ ] Checkpoint 51: 所有功能在浏览器端正常工作
- [ ] Checkpoint 52: 控制台无警告或错误信息
