# 客服配置（微信小程序 + 企业微信）— 实施计划

## [x] Task 1: 后端 — db.ts 种子数据 + config.ts 公共接口
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 db.ts system_config 种子数组末尾（payment 组之后）新增 10 行，config_group=`customer_service`，sort 1-10：
    ```
    ['wx_cs_enable', '0', '小程序客服启用', 'customer_service', '是否启用微信小程序客服', 1],
    ['wx_cs_appid', '', '小程序 AppID', 'customer_service', '微信公众平台 → 开发 → 开发管理 → 开发设置', 2],
    ['wx_cs_secret', '', '小程序 AppSecret', 'customer_service', '敏感信息，仅后端使用', 3],
    ['wx_cs_link', '', '客服链接', 'customer_service', '客服会话入口 URL（H5 场景跳转用）', 4],
    ['wx_cs_qq', '', '客服 QQ', 'customer_service', '腾讯客服 QQ 号', 5],
    ['wx_cs_welcome', '欢迎咨询', '欢迎语', 'customer_service', '用户首次打开客服时显示的欢迎语', 6],
    ['wecom_cs_enable', '0', '企微客服启用', 'customer_service', '是否启用企业微信客服', 7],
    ['wecom_cs_corp_id', '', '企微 CorpID', 'customer_service', '企业微信管理后台 → 我的企业 → 企业信息', 8],
    ['wecom_cs_corp_secret', '', '企微客服 Secret', 'customer_service', '企业微信管理后台 → 应用管理 → 客服', 9],
    ['wecom_cs_kf_account', '', '企微客服账号', 'customer_service', '格式: kf@企业简称', 10],
    ```
  - 后端 config.ts 新增路由：
    ```typescript
    // GET /api/system/cs-config - 客服公共配置（脱敏）
    router.get('/cs-config', authenticate, (_req, res) => {
      const rows = db.prepare(
        "SELECT config_key, config_value FROM system_config WHERE config_group='customer_service'"
      ).all();
      const map = new Map(rows.map(r => [r.config_key, r.config_value]));
      // 敏感字段不暴露
      const mask = (v: string) => v ? '******' : '';
      return ok(res, {
        wechat: {
          enable: map.get('wx_cs_enable') === '1',
          appid: map.get('wx_cs_appid') ?? '',
          link: map.get('wx_cs_link') ?? '',
          qq: map.get('wx_cs_qq') ?? '',
          welcome: map.get('wx_cs_welcome') ?? '欢迎咨询',
        },
        wecom: {
          enable: map.get('wecom_cs_enable') === '1',
          corpId: map.get('wecom_cs_corp_id') ?? '',
          kfAccount: map.get('wecom_cs_kf_account') ?? '',
          // secret / corpSecret 不返回
        },
      });
    });
    ```
- **Acceptance Criteria Addressed**: AC-4, AC-5
- **Test Requirements**:
  - `programmatic` TR-1.1: 后端 tsx 重启后，SELECT config_key FROM system_config WHERE config_group='customer_service' 返回 10 行
  - `programmatic` TR-1.2: GET /api/system/cs-config 返回 code=0，data 含 wechat / wecom 对象，**不含** secret 字段
  - `programmatic` TR-1.3: 后端 tsc --noEmit 零错误
- **Notes**: db.ts 种子在 payment 组之后、security 组之前插入，保持 sort 排序连续

## [x] Task 2+3: 前端 — GROUP_META + FIELD_META + renderCustomerServicePanel
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - GROUP_META 新增：`customer_service: { label: '客服配置', sort: 8 }`
  - FIELD_META 新增 10 条元信息：
    - wx_cs_enable → type: 'select', options: [{label:'启用',value:'1'},{label:'关闭',value:'0'}]
    - wx_cs_appid / wx_cs_link / wx_cs_qq / wx_cs_welcome → type: 'text'（wx_cs_link 用 placeholder 'https://...'）
    - wx_cs_secret → type: 'password'
    - wecom_cs_enable → type: 'select', options: [{label:'启用',value:'1'},{label:'关闭',value:'0'}]
    - wecom_cs_corp_id / wecom_cs_kf_account → type: 'text'
    - wecom_cs_corp_secret → type: 'password'
  - import 新增 `CustomerServiceOutlined`（@ant-design/icons 里应该没有这个，用 `MessageOutlined` + `WechatOutlined` / `ApiOutlined` 组合）
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-2.1: 前端 tsc --noEmit 零错误
  - `human-judgement` TR-2.2: Tab 栏出现第 8 个 Tab「客服配置」

## [ ] Task 3: 前端 — renderCustomerServicePanel 卡片式布局
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - 新增 renderCustomerServicePanel(items) 函数，两张 Card 上下排列（gap: 16px）
  - Card 1「微信小程序客服」：绿色渐变图标（#52c41a, #f6ffed→#d9f7be）
    - 启用开关（独立行）
    - AppID / Secret（password 类型）/ 客服链接 / 客服 QQ / 欢迎语
    - 底部独立"保存设置"按钮 + （可选）"测试连接"按钮（本轮暂只做 ping）
  - Card 2「企业微信客服」：蓝色渐变图标（#1677ff, #e6f4ff→#bae0ff）
    - 启用开关 + CorpID / Secret（password）/ 客服账号
    - 底部独立"保存设置"
  - Tab items 渲染时对 group==='customer_service' 调用 renderCustomerServicePanel，其余保持 Table / renderImagePanel
  - **保存交互**：每个配置项独立保存（调用已有的 handleSave），或者整张 Card 一个保存按钮批量保存——复用 handleSave 独立按钮模式更统一
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `human-judgement` TR-3.1: 两张 Card 视觉风格与现有 image / cloud_storage Card 统一
  - `programmatic` TR-3.2: 修改任意字段 → 保存 → PUT /api/system/configs/{key} 返回 code=0
  - `human-judgement` TR-3.3: Console 零红色 error / 零黄色 warn

## [x] Task 4: 浏览器全链路验收
- **Priority**: high
- **Depends On**: Task 1, Task 2, Task 3
- **Description**:
  - 打开系统配置，确认第 8 个 Tab「客服配置」存在
  - 切换 Tab，确认两张 Card 渲染完整
  - 尝试修改 wx_cs_welcome → 保存 → 成功提示 → 刷新持久化
  - 在 Console 直接 fetch GET /api/system/cs-config，检查返回 JSON 结构 + secret 字段缺失
  - 把 wx_cs_enable 改成 1 → 保存 → cs-config 返回 wechat.enable=true
- **Acceptance Criteria Addressed**: AC-1 ~ AC-5
- **Test Requirements**:
  - `programmatic` TR-4.1: cs-config 返回 JSON 正确，无 secret/corpSecret
  - `human-judgement` TR-4.2: 整体视觉与其他 Card 一致
  - `programmatic` TR-4.3: 前后端 tsc 双端零错误
