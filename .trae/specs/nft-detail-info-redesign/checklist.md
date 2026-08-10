# NFT 资产详情"信息详情"重构 - 验证清单

## 功能验证
- [x] Checkpoint 1：打开 NFT 资产详情抽屉 → 基本信息 Tab → 原"元数据"标签不再出现，出现"信息详情"区块标题（含"共 N 个属性"小文字）。
- [x] Checkpoint 2：信息详情区块按键值对一行一行显示；不再使用 `<pre>` JSON 代码块（DOM 中查询 pre 元素数量为 0）。
- [x] Checkpoint 3：基础 key 正确中文映射：name→资产名 / ring_number→足环号 / breed→品系 / bloodline→血统 / gender→性别 / color→羽色 / eye_color→眼砂 / achievement→赛绩 / owner→鸽主 / ipfs_image→链上图片 / image_url→封面图片。
- [x] Checkpoint 4：gender 值映射正确（male→雄、female→雌、unknown→未知）。
- [x] Checkpoint 5：字典外的自定义字段，标签右侧有灰色"（自定义）"标记，且排在基础字段之后。
- [x] Checkpoint 6：资产图片区块显示缩略图（100×100，圆角，object-fit cover）+ 右侧"查看原图"新标签链接；不直接平铺超长 URL 文本。
- [x] Checkpoint 7：ipfs:// 前缀的链上图片：不显示破图，显示占位图 + 点击跳转 ipfs.io 网关链接。
- [x] Checkpoint 8：长文本/长哈希用 Typography.Text ellipsis + tooltip + copyable，不出现断行换行的超长 URL。
- [x] Checkpoint 9：metadata 为空或 null 时，信息详情区块显示 Empty"暂无属性"（不白屏不错误）。
- [x] Checkpoint 10：metadata 为非法 JSON 字符串时不崩溃，控制台无 JS Error，并提示格式异常。
- [x] Checkpoint 11：三个区块顺序自上而下为"基础信息 → 资产图片 → 信息详情"，视觉上有明显分隔（间距或子标题或分组边框）。
- [x] Checkpoint 12：所有 metadata key 均保留可见（不丢字段），排序为"系统字段先、自定义字段后"。
- [x] Checkpoint 13：合约地址、交易哈希、Token ID 等字段值依然可一键复制（copy 按钮存在且能用）。

## 工程验证
- [x] Checkpoint 14：`admin-web` 下 `npx tsc --noEmit` 0 错误。
- [x] Checkpoint 15：`npm run dev` 启动无控制台警告（AntD v5 弃用属性警告为 0）。
- [x] Checkpoint 16：点击流转记录 Tab 和链上状态 Tab 不报错，两个 Tab 原有行为未被本次修改破坏（回归验证）。
- [x] Checkpoint 17：抽屉 destroyOnClose 后，再次点击另一条详情，显示的内容正确切换、不残留上一条 metadata 字段。
