# 新增铸造申请页面重构 - The Implementation Plan (Decomposed and Prioritized Task List)

## [x] Task 1: 页面骨架重构 — 从 DrawerForm 切换为独立 NftMintForm 组件（左表单+右预览布局）
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 新建 `pages/nft/NftMintForm.tsx` 组件（参考 `GeneForm.tsx` 布局结构）
  - 组件职责：包含 `formValues`、`setFormValues` 状态，`onSubmit`、`onCancel`、`onAuditSubmit` 回调
  - Drawer 容器迁移到 `List.tsx` 中调用 NftMintForm：移除 DrawerForm（ProForm 字段平铺），改为 `<Drawer><NftMintForm key={formKey} initialData={editing} ... /></Drawer>`
  - drawerProps：`destroyOnClose:true` → 改为 `destroyOnHidden`；宽度：`window.innerWidth >= 1920 ? 1100 : 720`
  - 布局：`isWide = innerWidth>=1920`，左 60% 表单区，右 40% 预览区（`NftMintPreview` 子组件，先留空外壳）
  - 底部固定操作栏：取消 / 保存草稿 / 提交上链审核（与 GeneForm 同样 sticky bottom）
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `programmatic` TR-1.1: `npx tsc --noEmit` 零错误
  - `human-judgement` TR-1.2: Drawer 打开后显示左右分栏（≥1920）或上下结构（<1920），底部三按钮可见

## [x] Task 2: P0 移除 URL 输入 — 集成 ImageUploader
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 在 NftMintForm 的「资产图片」Card 内使用 `ImageUploader` 组件（从 `components/ImageUploader` 导入，基因表单同款）
  - value=`formValues.image_url`，onChange=`updateField('image_url', url)`
  - 选填：选择基因档案时自动带入 `gene_profile.photo_url` 作为 image_url 初始值（Task 5 中联动）
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-2.1: List.tsx 与 NftMintForm.tsx grep 不到 `ProFormText.*image_url` 或 "资产图片 URL"
  - `human-judgement` TR-2.2: 页面显示虚线框+加号上传控件，不再出现 URL input

## [x] Task 3: P0 移除元数据 JSON — 新增自定义属性 (KeyValueList) 组件 + metadata 自动组装
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 新建 `pages/nft/CustomAttrList.tsx`：三列表格（属性名 Input / 属性值 Input / 删除 Button），底部【+ 添加属性】按钮
  - 接受 props：`value: Array<{key:string;val:string}>`, `onChange: (list) => void`
  - 初始值：若关联了基因档案，自动创建 3 行（眼砂/羽色/性别）；允许删除/添加
  - 在 handleSubmit 构造 payload 时：
    ```
    const metadata = {
      name: formValues.name,
      ring_number: geneProfile?.ring_number,
      breed: geneProfile?.breed,
      gender: geneProfile?.gender,
      color: geneProfile?.color,
      eye_color: geneProfile?.eye_color,
      owner: formValues.owner_name || geneProfile?.owner_name,
      ...Object.fromEntries(formValues.customAttrs.map(a => [a.key, a.val]))
    };
    ```
  - **删除** List.tsx 中 handleSubmit 的 `values.metadata_obj` 分支（迁移到 NftMintForm）
- **Acceptance Criteria Addressed**: AC-2, AC-4
- **Test Requirements**:
  - `human-judgement` TR-3.1: 抽屉不再显示"元数据(JSON)"文本域
  - `programmatic` TR-3.2: 提交 payload.metadata 为合法对象，包含基因档案基础字段 + 自定义键值对

## [x] Task 4: P0 关联基因档案改为 SearchSelect + 卡片展示
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 在 NftMintForm「关联基因档案」Card 内引入 `components/SearchSelect.tsx`
  - onSearch= `handleSireDamSearch` 同款实现，调用 `searchGeneProfiles(keyword)`，过滤掉当前编辑 id（若有）
  - optionLabel= `(<span>{ring_number} <b>{name}</b> <small style=color:#999>品系：{breed || '-'} · 鸽主：{owner_name || '-'}</small></span>)`
  - onChange= 保存 `gene_profile_id` + 额外 `selectedProfile` 缓存（供 Task 5 联动使用）
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgement` TR-4.1: 搜索下拉显示组合卡片文本，不是简单 id/name 选项
  - `programmatic` TR-4.2: 选择后 formValues.gene_profile_id 已更新

## [x] Task 5: P1/P2 联动回填 + 描述模板 + 字数统计
- **Priority**: medium
- **Depends On**: Task 4
- **Description**:
  - 选择基因档案后执行 `profileChange(p)` 回填：
    - `formValues.name = p.name || ''`（保留用户手动修改过的痕迹：可选，MVP 阶段直接覆盖）
    - `formValues.owner_name = p.owner_name || ''`
    - `formValues.image_url = p.photo_url || existing_image_url`（若已有则保留）
    - `formValues.customAttrs = [ {k:'眼砂',v:p.eye_color||''}, {k:'羽色',v:p.color||''}, {k:'性别',v:genderMap[p.gender]||''} ]`（过滤掉空值）
    - 同步 `previewData`
  - 资产描述区：textarea + 右侧【生成描述】Button + 右下角字数 `{len}/200`，maxLength=200
  - 模板函数：`${name}，${breed||'—'}品系。血统纯正，遗传稳定。${achievement?'曾获得'+achievement+'。':''}`
- **Acceptance Criteria Addressed**: AC-3（联动）, AC-6
- **Test Requirements**:
  - `human-judgement` TR-5.1: 选择基因档案后，资产名称自动变为鸽名，持有者显示鸽主名
  - `human-judgement` TR-5.2: 点击【生成描述】文本域填入模板，字数计数器正确

## [x] Task 6: P1 右侧预览组件 NftMintPreview.tsx
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - 新建 `pages/nft/NftMintPreview.tsx`（参考 GeneFormPreview.tsx 结构）
  - props: `formData: { photo_url, name, breed, owner_name, achievement }`
  - 视觉结构：
    - NFT 卡片（200px 高，img 封面 + 下方标题"#---- Token ID 占位"+ 价格标签"未定价"）
    - 属性列表：品系、赛绩（若无显示"—"）、鸽主（每行 label-value 两列）
  - 修改时实时更新（依赖 formData 引用变化即可）
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgement` TR-6.1: 修改图片/名称，右侧预览在 300ms 内更新（主观判断无明显延迟）

## [x] Task 7: P0/P1 操作动作（保存草稿 / 提交上链审核）+ 持有者显示+编辑
- **Priority**: high
- **Depends On**: Task 1, Task 4
- **Description**:
  - 持有者字段：默认显示为只读（Tag 展示「来自基因档案」+ 鸽主名）+ 右侧【修改】Button，点击后切换为 Input 允许编辑
  - 底部按钮：
    - 【取消】：`onCancel()`
    - 【保存草稿】：`onSubmit(values, 'draft')` → 调用 createNftAsset/updateNftAsset → 成功提示「已保存为草稿」→ 关闭 drawer → 列表 reload
    - 【提交上链审核】：Popconfirm 二次确认 → `onSubmit(values, 'draft')` 成功后 → `submitNftAssetAudit(id)` → 提示「已提交上链审核」→ 关闭 drawer → 列表 reload
  - 编辑模式：从 editing 回填到 formValues（gene_profile_id / name / description / image_url / owner_name / metadata 反解 customAttrs —— 若 metadata 存在则 JSON.parse 后过滤基础字段，剩余放入 customAttrs）
- **Acceptance Criteria Addressed**: AC-4, AC-7
- **Test Requirements**:
  - `programmatic` TR-7.1: 保存草稿时 metadata 合法（打印日志检查）
  - `programmatic` TR-7.2: 【提交上链审核】时 createNftAsset + submitNftAssetAudit 均被调用

## [x] Task 8: 集成 + 编译验证
- **Priority**: high
- **Depends On**: Task 2, 3, 4, 5, 6, 7
- **Description**:
  - 删除 List.tsx 中原有的 DrawerForm 代码段（L410-L458），替换为 Drawer 包裹 <NftMintForm />
  - destroyOnHidden 修复（已废弃 destroyOnClose → destroyOnHidden）
  - 运行 `npx tsc --noEmit`
  - 页面手动冒烟：新增铸造抽屉能打开 / 关闭 / 选择基因档案 / 上传图 / 提交草稿
- **Acceptance Criteria Addressed**: AC-8, 其余 AC 最终验证
- **Test Requirements**:
  - `programmatic` TR-8.1: `npx tsc --noEmit` exit 0
  - `human-judgement` TR-8.2: 整个流程端到端操作无报错

# Task Dependencies
- Task 2, 3, 4, 7 依赖 Task 1（骨架）
- Task 5 依赖 Task 4（拿到 profile 才能回填）
- Task 6 依赖 Task 1（preview 独立组件，可并行于 Task 2/3/4 做）
- Task 8 最后汇总