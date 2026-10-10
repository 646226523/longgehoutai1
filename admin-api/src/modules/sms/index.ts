/**
 * 短信服务模块
 * —— SmsProvider 抽象 + 腾讯云实现 + DevNull(开发模式) + 工厂
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
import type { Database } from 'better-sqlite3';
const db: Database = require('../../db').default;

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SendParams {
  phone: string;
  code: string;
  scene: string;   // register / login / reset_password
}

/** 短信服务抽象接口 */
export interface SmsProvider {
  send(params: SendParams): Promise<SendResult>;
  readonly name: string;
}

/**
 * 开发环境 Mock 短信提供者
 * 不发任何真实短信，验证码仅打印到后端日志。
 * 用于 sms_enabled='false' 场景（开发/测试阶段）。
 */
export class DevNullSmsProvider implements SmsProvider {
  readonly name = 'dev_null';

  async send(params: SendParams): Promise<SendResult> {
    // eslint-disable-next-line no-console
    console.warn(
      `\n⚠️  [SMS-DEV-NULL] ${new Date().toLocaleTimeString()}  ` +
      `scene=${params.scene}  phone=${params.phone}  code=${params.code}  ` +
      `(未启用真实短信，验证码仅打印此处)\n`
    );
    return { success: true };
  }
}

/** 将腾讯云 SDK / API 错误转为对管理员友好的中文提示 */
function humanizeTencentError(err: any): string {
  const msg = err?.message || String(err);
  // 腾讯云常见错误码/消息
  if (msg.includes('SecretId is not found') || msg.includes('SecretId')) {
    return '腾讯云 SecretId 无效 — 请检查 sms_tencent_secret_id 是否为正确的 AKID 开头格式';
  }
  if (msg.includes('SecretKey')) {
    return '腾讯云 SecretKey 无效 — 请检查 sms_tencent_secret_key';
  }
  if (msg.includes('AuthFailure') || msg.includes('Signature')) {
    return '腾讯云签名校验失败 — 请同时检查 SecretId 和 SecretKey';
  }
  if (msg.includes('FailedOperation.SignatureIncorrect')) {
    return '腾讯云签名(sign_name)未审核通过或拼写错误';
  }
  if (msg.includes('FailedOperation.TemplateIncorrect') || msg.includes('Template')) {
    return '腾讯云模板(template_id)未审核通过或拼写错误';
  }
  if (msg.includes('SdkAppId')) {
    return '腾讯云 SdkAppId 无效 — 请检查 sms_tencent_sdk_app_id 是否为正确的纯数字（账号 AppID）';
  }
  if (msg.includes('LimitExceeded') || msg.includes('Frequency')) {
    return '腾讯云频率限制 — 该手机号/签名/模板的发送额度已用完';
  }
  if (msg.includes('UnauthorizedOperation')) {
    return '腾讯云账号无权限 — 请检查 SecretId 所属账号是否已开通短信服务';
  }
  if (msg.includes('NetworkError') || msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT')) {
    return '网络连接腾讯云失败 — 请检查服务器网络和防火墙';
  }
  return `腾讯云 SDK 异常: ${msg}`;
}

/**
 * 腾讯云 SMS 短信提供者
 * 依赖配置：sms_tencent_secret_id / sms_tencent_secret_key /
 *           sms_tencent_sdk_app_id / sms_tencent_sign_name /
 *           sms_tencent_template_id_register / sms_tencent_template_id_reset
 */
export class TencentCloudSmsProvider implements SmsProvider {
  readonly name = 'tencent';
  private readonly client: any;
  private readonly sdkAppId: string;
  private readonly signName: string;
  private readonly templateIds: Record<string, string>;

  constructor(config: {
    secretId: string;
    secretKey: string;
    sdkAppId: string;
    signName: string;
    templateIdRegister: string;
    templateIdReset: string;
  }) {
    const SmsClient = require('tencentcloud-sdk-nodejs').sms.v20210111.Client;
    this.client = new SmsClient({
      credential: {
        secretId: config.secretId,
        secretKey: config.secretKey,
      },
      region: 'ap-guangzhou',
      profile: {
        httpProfile: { endpoint: 'sms.tencentcloudapi.com' },
      },
    });
    this.sdkAppId = config.sdkAppId;
    this.signName = config.signName;
    this.templateIds = {
      register: config.templateIdRegister,
      login: config.templateIdRegister, // 登录验证码复用注册模板，可按需拆分
      reset_password: config.templateIdReset,
    };
  }

  async send(params: SendParams): Promise<SendResult> {
    const templateId = this.templateIds[params.scene] || this.templateIds.register;
    if (!templateId) {
      return { success: false, error: `未配置 scene=${params.scene} 的模板 ID` };
    }

    try {
      const phoneWithCountry = params.phone.startsWith('+') ? params.phone : `+86${params.phone}`;
      const req = {
        SmsSdkAppId: this.sdkAppId,
        SignName: this.signName,
        TemplateId: templateId,
        PhoneNumberSet: [phoneWithCountry],
        TemplateParamSet: [params.code],
      };
      const resp = await this.client.SendSms(req);
      const status = resp?.SendStatusSet?.[0];
      if (status?.Code === 'Ok') {
        return { success: true, messageId: status.SerNo };
      }
      return {
        success: false,
        error: humanizeTencentError(new Error(`${status?.Code}: ${status?.Message || '未知错误'}`)),
      };
    } catch (err: any) {
      return { success: false, error: humanizeTencentError(err) };
    }
  }
}

/** 腾讯云凭据格式校验（仅检查基本形态，非严格） */
function validateTencentCreds(cfg: Record<string, string>): string | null {
  // 缺失校验（trim 后判空）
  const requiredKeys = [
    'sms_tencent_secret_id',
    'sms_tencent_secret_key',
    'sms_tencent_sdk_app_id',
    'sms_tencent_sign_name',
  ];
  const missing = requiredKeys.filter((k) => !cfg[k] || cfg[k].length === 0);
  if (missing.length > 0) return `缺少必要配置: ${missing.join(', ')}`;

  // 格式校验
  if (!cfg.sms_tencent_secret_id.startsWith('AKID')) {
    return 'sms_tencent_secret_id 格式错误：腾讯云 SecretId 应以 AKID 开头';
  }
  if (cfg.sms_tencent_secret_id.length < 30) {
    return 'sms_tencent_secret_id 长度异常（应约 36 字符），请检查是否填完整';
  }
  if (!/^\d{6,15}$/.test(cfg.sms_tencent_sdk_app_id)) {
    return 'sms_tencent_sdk_app_id 格式错误：腾讯云 SdkAppId 应为纯数字（账号 AppID，如 1401188896）';
  }

  return null;
}

/** 从 system_config 批量读取配置，所有值统一 .trim() */
function loadConfigs(keys: string[]): Record<string, string> {
  const rows = db
    .prepare(`SELECT config_key, config_value FROM system_config WHERE config_key IN (${keys.map(() => '?').join(',')})`)
    .all(...keys) as Array<{ config_key: string; config_value: string | null }>;
  const out: Record<string, string> = {};
  rows.forEach((r) => { out[r.config_key] = (r.config_value ?? '').trim(); });
  return out;
}

/**
 * 工厂函数：根据 system_config.sms_enabled 创建对应 provider
 * - '1' → TencentCloudSmsProvider（需通过凭据格式校验）
 * - 其他 → DevNullSmsProvider
 *
 * 启用真实发送前会校验腾讯云凭据格式；不合法时降级 DevNull 并打印告警。
 */
export function createSmsProvider(): SmsProvider {
  const cfg = loadConfigs([
    'sms_enabled',
    'sms_tencent_secret_id',
    'sms_tencent_secret_key',
    'sms_tencent_sdk_app_id',
    'sms_tencent_sign_name',
    'sms_tencent_template_id_register',
    'sms_tencent_template_id_reset',
  ]);

  const enabled = cfg.sms_enabled === '1';
  if (!enabled) return new DevNullSmsProvider();

  // 启用但凭据格式不对 → 降级 DevNull + 明确告警
  const credErr = validateTencentCreds(cfg);
  if (credErr) {
    // eslint-disable-next-line no-console
    console.warn(`[SMS] sms_enabled=1 但腾讯云凭据不可用: ${credErr} — 降级为 DevNull`);
    return new DevNullSmsProvider();
  }

  return new TencentCloudSmsProvider({
    secretId: cfg.sms_tencent_secret_id,
    secretKey: cfg.sms_tencent_secret_key,
    sdkAppId: cfg.sms_tencent_sdk_app_id,
    signName: cfg.sms_tencent_sign_name,
    templateIdRegister: cfg.sms_tencent_template_id_register,
    templateIdReset: cfg.sms_tencent_template_id_reset,
  });
}

// ===== sms_logs 辅助方法 =====

const SMS_CODE_TTL = 5 * 60 * 1000; // 5 分钟
const RATE_LIMIT_WINDOW = 60 * 1000;  // 60 秒

/** 检查是否在频率限制窗口内（60s 内同 phone+scene 已发送过） */
export function isRateLimited(phone: string, scene: string): boolean {
  const since = Date.now() - RATE_LIMIT_WINDOW;
  const row = db.prepare(
    `SELECT COUNT(*) AS c FROM sms_logs
     WHERE phone = ? AND scene = ? AND status = 'sent' AND created_at > ?`
  ).get(phone, scene, since) as { c: number };
  return row.c > 0;
}

/** 写一条发送成功日志 */
export function logSent(phone: string, scene: string, code: string, provider: string): void {
  const now = Date.now();
  db.prepare(
    `INSERT INTO sms_logs (phone, scene, code, provider, status, created_at, expire_at)
     VALUES (?, ?, ?, ?, 'sent', ?, ?)`
  ).run(phone, scene, code, provider, now, now + SMS_CODE_TTL);
}

/** 写一条发送失败日志 */
export function logFailed(phone: string, scene: string, provider: string, error: string): void {
  const now = Date.now();
  db.prepare(
    `INSERT INTO sms_logs (phone, scene, code, provider, status, error_msg, created_at, expire_at)
     VALUES (?, ?, '', ?, 'failed', ?, ?, ?)`
  ).run(phone, scene, provider, error, now, now + SMS_CODE_TTL);
}

/**
 * 校验验证码（从 sms_logs 查，支持一次性使用 + 过期校验）
 * 成功后标记 used_at
 */
export function verifyCode(phone: string, scene: string, code: string): { ok: boolean; reason?: string } {
  const now = Date.now();

  const row = db.prepare(
    `SELECT id, expire_at FROM sms_logs
     WHERE phone = ? AND scene = ? AND code = ? AND status = 'sent'
     ORDER BY created_at DESC LIMIT 1`
  ).get(phone, scene, code) as { id: number; expire_at: number } | undefined;

  if (!row) return { ok: false, reason: '验证码错误' };
  if (row.expire_at < now) {
    db.prepare(`UPDATE sms_logs SET status = 'expired' WHERE id = ?`).run(row.id);
    return { ok: false, reason: '验证码已过期' };
  }

  db.prepare(`UPDATE sms_logs SET status = 'used', used_at = ? WHERE id = ?`).run(now, row.id);
  return { ok: true };
}

export const SMS_CONFIG = { TTL: SMS_CODE_TTL, RATE_LIMIT: RATE_LIMIT_WINDOW };
