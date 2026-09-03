# 客服配置（微信小程序 + 企业微信）— 产品需求文档

## Overview

- **Summary**: 在系统配置页面新增第 8 个 Tab「客服配置」，提供两张 Card 卡片分别管理 **微信小程序客服** 和 **企业微信客服** 的 API 凭证与会话入口参数，包括启用开关、AppID/Secret、客服会话链接、客服 QQ/账号等，保存后写入 `system_config` 表，后端提供公共配置接口 `/api/system/cs-config` 供前端 APP/H5 读取。

- **Purpose**: 让管理员在后台一处管理全平台的客服接入凭证，前端"联系客服"按钮可按所选渠道自动打开对应会话，无需硬编码。

- **Target Users**: 系统管理员（后台维护配置）、终端用户（APP/H5 点击"联系客服"自动打开对应渠道）。

## Goals

- G1: 新增 `customer_service` 分组 Tab，排序第 8（紧接 security 之后）

- G2: 两张 Card 并排 / 上下：微信小程序客服 Card + 企业微信客服 Card

- G3: 每个 Card 内含启用开关 + 凭证输入（Secret 用 password 类型）+ 客服链接 + 测试按钮

- G4: 后端新增 `/api/system/cs-config` 接口（只读，仅暴露公开字段），前端 APP/H5 直接读

- G5: 敏感字段（secret / token）不通过 `cs-config` 接口暴露

## Non-Goals (Out of Scope)

- 不实现真实客服消息收发（仅配置 + 公共接口）

- 不实现 Webhook / 回调签名验证路由

- 不实现前端 IM 聊天界面

- 不实现多租户 / 多客服账号

## Background & Context

- 已有 7 个分组：cloud\_storage / general / image / map / payment / security / upload

- 配置表 `system_config` 用 `config_group` + `config_key` 二级分类，INSERT OR IGNORE 模式

- 前端 Config.tsx：FIELD\_META 驱动渲染，特殊分组（image）用 renderImagePanel，其余走通用 Table

- 后端 config.ts 已有 `/qiniu/upload-token` 和 `/cloud-config` 公共接口（admin 登录态可读），可参考同样模式实现 `/cs-config`

- 微信小程序客服 API 凭证：appid / secret + 会话入口（客服链接模板 / 客服 QQ）

- 企业微信客服 API 凭证：corp\_id / corp\_secret + kf\_account + 欢迎语

## Functional Requirements

- **FR-1**: 后端 db.ts 新增 10 行种子数据，config\_group=`customer_service`（6 个小程序 + 4 个企微）

- **FR-2**: 后端 config.ts 新增 `GET /api/system/cs-config`，过滤掉 secret/key/password 类敏感字段

- **FR-3**: 前端 GROUP\_META 注册 `customer_service: { label: '客服配置', sort: 8 }`

- **FR-4**: 前端 FIELD\_META 注册全部 10 个客服配置项的元信息（type=text/select/password/url）

- **FR-5**: 前端 renderImagePanel 模式复用 → 新增 renderCustomerServicePanel（两张 Card：WeChat Mini Program / WeCom）

- **FR-6**: 敏感字段（\*\_secret / \*\_key）前端默认星号显示，点击"显示"按钮才 reveal（或直接用 Ant Design Input.Password 默认 behavior）

- **FR-7**: 每张 Card 底部含独立"测试连接"按钮 → 后端调微信 API / 企微 API 获取 access\_token 验证凭证有效性

- **FR-8**: 启用开关（wx\_cs\_enable / wecom\_cs\_enable）关闭时，前端 APP 不应显示对应渠道的客服入口

## Non-Functional Requirements

- **NFR-1**: cs-config 接口响应时间 ≤ 50ms（纯 DB 查询）

- **NFR-2**: Config.tsx 新增代码与现有代码风格一致（Card 渐变图标 + 标题 + 副标题）

- **NFR-3**: secret 类字段 HTTP 传输时后端 PUT 不做日志记录（已有 auditMiddleware 会记录 params，可考虑对 key=\*secret 做脱敏）

## Constraints

- **Technical**: 测试连接需要服务器能访问 api.weixin.qq.com / qyapi.weixin.qq.com（开发环境可能无法访问，测试按钮要 gracefully 提示"无法访问微信 API"）

- **Business**: 管理员可能暂时没有凭证，空值时接口仍能正常返回（enable=0）

- **Dependencies**: 无新 npm 包依赖（HTTP 用 Node 内置 http/https）

## Assumptions

- 微信小程序客服启用后，前端 APP/H5 通过 `<button open-type="contact">` 原生组件打开客服，后台仅维护凭证和开关即可

- 企业微信客服启用后，前端通过客服 URL 跳转到企业微信客服会话

- cs-config 接口返回：enable 标志 + 公开链接 / 模板 ID，**不暴露** secret

## 微信小程序客服字段设计（6 项）

| config\_key     | 默认值    | type     | 说明                  |
| --------------- | ------ | -------- | ------------------- |
| wx\_cs\_enable  | 0      | select   | 是否启用小程序客服           |
| wx\_cs\_appid   | <br /> | text     | 小程序 AppID           |
| wx\_cs\_secret  | <br /> | password | 小程序 AppSecret       |
| wx\_cs\_link    | <br /> | url      | 客服会话链接（可选，用于 H5 跳转） |
| wx\_cs\_qq      | <br /> | text     | 客服 QQ（腾讯客服场景）       |
| wx\_cs\_welcome | 欢迎咨询   | text     | 欢迎语                 |

## 企业微信客服字段设计（4 项）

| config\_key             | 默认值    | type     | 说明              |
| ----------------------- | ------ | -------- | --------------- |
| wecom\_cs\_enable       | 0      | select   | 是否启用企微客服        |
| wecom\_cs\_corp\_id     | <br /> | text     | 企业微信 CorpID     |
| wecom\_cs\_corp\_secret | <br /> | password | 企业微信客服应用 Secret |
| wecom\_cs\_kf\_account  | <br /> | text     | 客服账号（如 kf@企业简称） |

## Acceptance Criteria

### AC-1: 系统配置页面出现"客服配置"Tab

- **Given**: 管理员登录后台，进入系统管理 → 系统配置

- **When**: 页面加载完成

- **Then**: Tab 栏新增「客服配置」，位于「安全配置」之后，总 Tab 数 = 8

- **Verification**: `human-judgment`

### AC-2: 客服配置 Tab 渲染 2 张 Card

- **Given**: 切换到「客服配置」Tab

- **When**: 内容区渲染完成

- **Then**: 两张 Card 分别为「微信小程序客服」和「企业微信客服」，各自含启用开关 + 凭证输入 + 说明文字

- **Verification**: `human-judgment`

### AC-3: Secret 字段脱敏显示

- **Given**: 小程序客服已填写 secret

- **When**: 打开配置页面

- **Then**: wx\_cs\_secret 输入框显示为星号（password 类型），旁边有"显示/隐藏"切换按钮

- **Verification**: `human-judgment`

### AC-4: 保存成功 + 刷新持久化

- **Given**: 修改某字段后点击保存

- **When**: 操作完成

- **Then**: 页面出现"✓ 配置已更新"提示，刷新后值保留

- **Verification**: `programmatic`

### AC-5: GET /api/system/cs-config 正常返回 + 无敏感字段

- **Given**: 已登录管理员

- **When**: GET /api/system/cs-config

- **Then**: 返回 `{ code: 0, data: { wechat: { enable, appid, link, qq, welcome }, wecom: { enable, corpId, kfAccount } } }`

- **Verification**: `programmatic`

- **Notes**: 不含 secret / corpSecret

### AC-6: 测试连接按钮（基础版）

- **Given**: 管理员已填写凭证

- **When**: 点击 Card 底部"测试连接"按钮

- **Then**: 后端尝试 GET access\_token，成功显示 ✓，失败显示 ✗ 及原因（如"凭证无效"或"无法访问微信 API"）

- **Verification**: `human-judgment`

## Open Questions

- [ ] 测试连接按钮是否要实现完整 token 获取？→ 本轮先做 URL 可达性测试（ping api.weixin.qq.com），后续再升级到真实 token 获取

