import { Response, NextFunction } from 'express';
import db from '../db';
import type { AuthedRequest } from '../types';

// ==================== 敏感字段脱敏 ====================
const SENSITIVE_KEYS = ['password', 'oldPassword', 'newPassword', 'secret', 'token', 'authorization'];
const REDACTED = '***';
export function redactSensitive(body: unknown, _depth = 0): unknown {
  if (_depth > 5) return '[MAX_DEPTH]'; // 防止循环引用
  if (body === null || body === undefined || typeof body !== 'object') return body;
  try {
    if (Array.isArray(body)) {
      return body.map((item) => redactSensitive(item, _depth + 1));
    }
    const cloned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.includes(k)) {
        cloned[k] = REDACTED;
      } else if (v !== null && typeof v === 'object') {
        cloned[k] = redactSensitive(v, _depth + 1);
      } else {
        cloned[k] = v;
      }
    }
    return cloned;
  } catch {
    return body;
  }
}

// ==================== IP 地址格式化 ====================
// 内网 IP 判定：127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
export function isPrivateIp(ip: string): boolean {
  const privates = [
    /^10\.\d+\.\d+\.\d+$/,
    /^192\.168\.\d+\.\d+$/,
    /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/,
    /^127\.\d+\.\d+\.\d+$/,
    /^0\.\d+\.\d+\.\d+$/,
    /^::1$/,
    /^::$/,
    /^fe80:/,
    /^fc/,
    /^fd/,
  ];
  return privates.some(r => r.test(ip));
}

export function formatIp(ip: string | undefined | null): string | null {
  if (!ip) return null;
  const trimmed = ip.trim();
  if (!trimmed) return null;

  // 多 IP (X-Forwarded-For 格式): "203.0.113.42, 10.0.0.1, 127.0.0.1"
  if (trimmed.includes(',')) {
    const ips = trimmed.split(',').map(s => s.trim()).filter(Boolean);
    // 取第一个非内网 IP
    const firstPublic = ips.find(x => !isPrivateIp(x));
    if (firstPublic) return formatIp(firstPublic); // 递归处理单 IP
    return formatIp(ips[0]); // 全部内网则取第一个（递归处理 ::1 等）
  }

  // IPv6 localhost
  if (trimmed === '::1' || trimmed === '::') return 'localhost';
  // IPv4-mapped IPv6: ::ffff:192.168.1.1 → 提取
  const v4mapped = trimmed.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4mapped) return v4mapped[1];

  return trimmed;
}

/**
 * 从 HTTP 请求中提取客户端真实 IP
 * 优先级：X-Forwarded-For（首个公网IP） → X-Real-IP → CF-Connecting-IP → req.ip → remoteAddress
 * 所有来源都做 try-catch，确保不会因某个代理头异常而崩溃
 */
export function getClientIp(req: {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string | null };
  connection?: { remoteAddress?: string | null };
}): string | undefined {
  try {
    // 1. X-Forwarded-For（最常见的代理头，链中首个就是客户端 IP）
    // 格式: "119.126.114.228, 10.0.0.1, ::1"
    const xfwdRaw = req.headers['x-forwarded-for'] ?? req.headers['X-Forwarded-For'];
    if (xfwdRaw) {
      const xfwd = Array.isArray(xfwdRaw) ? xfwdRaw.join(',') : xfwdRaw;
      const ips = xfwd.split(',').map((s) => s.trim()).filter(Boolean);
      if (ips.length > 0) {
        // 找首个非内网 IP
        const firstPublic = ips.find((x) => !isPrivateIp(x));
        if (firstPublic) return firstPublic;
        // 全内网 → 开发环境 Vite proxy 场景，尝试前端显式传入的公网 IP 头
        const clientPublicIp =
          (req.headers['x-client-public-ip'] as string) ??
          (req.headers['X-Client-Public-IP'] as string);
        if (typeof clientPublicIp === 'string' && clientPublicIp.trim() && !isPrivateIp(clientPublicIp.trim())) {
          return clientPublicIp.trim();
        }
        return ips[0];
      }
    }
  } catch { /* ignore */ }

  try {
    // 2. 其他常见代理头（单值）
    const singleHeaders = ['x-real-ip', 'X-Real-IP', 'cf-connecting-ip', 'CF-Connecting-IP', 'true-client-ip', 'True-Client-IP', 'x-forwarded-ip', 'X-Forwarded-IP'];
    for (const h of singleHeaders) {
      const val = req.headers[h];
      if (typeof val === 'string' && val.trim()) return val.trim();
    }
  } catch { /* ignore */ }

  // 3. Express 已解析的 req.ip
  try {
    if (req.ip && req.ip.trim()) return req.ip.trim();
  } catch { /* ignore */ }

  // 4. socket remoteAddress（最终 fallback）
  try {
    const addr = req.socket?.remoteAddress || req.connection?.remoteAddress;
    if (addr && addr.trim()) return addr.trim();
  } catch { /* ignore */ }

  return undefined;
}

// ==================== 模块中文名 ====================
export const MODULE_LABELS: Record<string, string> = {
  auth: '登录认证',
  admin: '管理员管理',
  role: '角色权限',
  user: '用户管理',
  content_news: '资讯管理',
  content_banner: '轮播管理',
  content_notice: '公告管理',
  content: '内容管理',
  detection: '检测预约',
  gene: '基因档案',
  nft: 'NFT 资产',
  competition: '赛事管理',
  loft: '公棚管理',
  auction: '拍卖管理',
  arbitration: '仲裁管理',
  system: '系统设置',
};

// ==================== 对象类型中文名 ====================
export const OBJECT_TYPE_LABELS: Record<string, string> = {
  admin: '管理员',
  role: '角色',
  user: '用户',
  audit: '审核记录',
  news: '资讯',
  banner: '轮播图',
  notice: '公告',
  detection_org: '检测机构',
  detection_order: '预约订单',
  detection_report: '检测报告',
  gene_profile: '基因档案',
  gene_test: '基因检测',
  gene_submission: '基因送审',
  nft_asset: 'NFT 资产',
  nft_mint: 'NFT 铸造',
  competition: '赛事',
  competition_participant: '赛事参与者',
  competition_result: '赛事成绩',
  loft: '公棚',
  loft_pigeon: '公棚鸽子',
  loft_application: '公棚申请',
  auction_session: '拍卖场次',
  auction_item: '拍卖标的',
  auction_bid: '拍卖出价',
  arbitration_case: '仲裁案件',
  arbitration_evidence: '仲裁证据',
};

// ==================== Action 动词短语 ====================
// 优先匹配 module+action 组合，fallback 到通用 action
export const ACTION_VERBS: Record<string, string> = {
  // --- 通用 ---
  create: '新增了',
  update: '修改了',
  delete: '删除了',
  publish: '发布了',
  offline: '下架了',
  toggle_top: '置顶/取消置顶了',
  update_status: '修改了状态',
  update_sort: '调整了排序',
  transition_status: '变更了状态',
  // --- 审核类 ---
  approve_submission: '审核通过了',
  reject_submission: '审核驳回了',
  approve_application: '审核通过了',
  reject_application: '审核驳回了',
  start_hearing: '开始审理了',
  archive_case: '归档了',
  accept_case: '受理了',
  execute_award: '执行了裁决',
  // --- 角色类 ---
  assign_permissions: '分配了权限给',
  // --- 管理员专属 ---
  reset_password: '重置了密码',
  assign_roles: '分配了角色给',
  export: '导出了',
  // --- 登录 ---
  login: '登录了系统',
  logout: '登出了系统',
  // --- 检测预约 ---
  create_org: '新增了检测机构',
  update_org: '修改了检测机构',
  toggle_org_status: '修改了检测机构状态',
  create_order: '创建了预约订单',
  update_order: '修改了预约订单',
  confirm_order: '确认了预约订单',
  schedule_order: '排期了预约订单',
  cancel_order: '取消了预约订单',
  create_report: '录入了检测报告',
  update_report: '修改了检测报告',
  // --- 基因 ---
  create_profile: '新增了基因档案',
  update_profile: '修改了基因档案',
  regen_qrcode: '重新生成了二维码',
  create_test: '新增了基因检测',
  update_test: '修改了基因检测',
  // --- NFT ---
  create_asset: '新增了 NFT 资产',
  update_asset: '修改了 NFT 资产',
  submit_audit: '提交了 NFT 审核',
  approve_mint: '审核通过了 NFT 铸造',
  reject_mint: '审核驳回了 NFT 铸造',
  batch_approve_mint: '批量通过了 NFT 铸造',
  batch_reject_mint: '批量驳回了 NFT 铸造',
  // --- 赛事 ---
  import_participants: '导入了赛事参与者',
  verify_participant: '核验了赛事参与者',
  verify_participants_batch: '批量核验了赛事参与者',
  batch_verify_competitions: '批量核验了赛事',
  create_result: '录入了赛事成绩',
  create_results_batch: '批量录入了赛事成绩',
  auto_rank: '自动排名了',
  // --- 拍卖 ---
  create_session: '新增了拍卖场次',
  update_session: '修改了拍卖场次',
  transition_session: '变更了拍卖场次状态',
  delete_session: '删除了拍卖场次',
  create_item: '新增了拍卖标的',
  start_item: '开拍了',
  pass_item: '流拍了',
  create_bid: '出价了',
  confirm_deal_payment: '确认了成交付款',
  confirm_deal_delivery: '确认了成交发货',
  cancel_deal: '取消了成交',
};

// ==================== 智能提取对象名称 ====================
// 从 responseBody 中尝试找到最具代表性的名称字段
export const NAME_KEYS = [
  // 通用名称字段（按优先级排序，越靠前越像"名称"）
  'name', 'title', 'label', 'username', 'nickname', 'display_name', 'real_name',
  // 业务专用名称字段
  'pigeon_name', 'competition_name', 'loft_name', 'gene_name', 'profile_name',
  'auction_name', 'asset_name', 'application_name', 'org_name', 'level_name',
  'benefit_name', 'report_name', 'test_name', 'submission_name', 'evidence_name',
  'award_name', 'case_name', 'role_name',
];

export function extractObjectName(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  // 优先尝试 data 嵌套
  if (obj.data && typeof obj.data === 'object') {
    const inner = obj.data as Record<string, unknown>;
    for (const k of NAME_KEYS) {
      if (inner[k] !== undefined && inner[k] !== null && String(inner[k]).trim()) {
        return String(inner[k]);
      }
    }
  }
  // 再尝试直接在顶层找
  for (const k of NAME_KEYS) {
    if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim()) {
      return String(obj[k]);
    }
  }
  return null;
}

// ==================== 智能提取 objectName（4 级 fallback） ====================
export interface ResolveObjectNameOpts {
  /** 路由显式注入的 objectName（最高优先级） */
  objectName?: string;
  /** 路由注入的 before 对象，从 DB 查出的原始行 */
  before?: unknown;
  /** API 返回体 */
  responseBody?: unknown;
  /** 业务模块标识（对应 MODULE_LABELS 键） */
  module?: string;
  /** 目标对象 ID */
  targetId?: number | null;
}

export function resolveObjectName(opts: ResolveObjectNameOpts): string {
  // Level 1: 路由显式注入
  if (opts.objectName && opts.objectName.trim()) return opts.objectName.trim();

  // Level 2: 从 before 对象里提取
  const beforeName = extractObjectName(opts.before);
  if (beforeName) return beforeName;

  // Level 3: 从 responseBody.data 里提取
  const responseName = extractObjectName(opts.responseBody);
  if (responseName) return responseName;

  // Level 4: 兜底 —— "类型中文名#ID"
  const typeLabel = (opts.module && MODULE_LABELS[opts.module]) || opts.module || '对象';
  if (opts.targetId) return `${typeLabel}#${opts.targetId}`;
  return typeLabel;
}

// ==================== 智能提取 target_id ====================
export function extractTargetId(data: unknown, path: string): number | null {
  // 1. 从 URL 参数中取（如 /api/system/admins/:id）
  const idMatch = path.match(/\/(\d+)(?:\/|$|\?)/);
  if (idMatch) return Number(idMatch[1]);
  // 2. 从 responseBody.data.id 取
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (obj.data && typeof obj.data === 'object' && (obj.data as Record<string, unknown>).id) {
      return Number((obj.data as Record<string, unknown>).id);
    }
    if (obj.id) return Number(obj.id);
  }
  return null;
}

// ==================== 智能提取 target_type ====================
export function extractTargetType(module: string, path: string, _action: string): string | null {
  // 直接映射 module 前缀
  const moduleToType: Record<string, string> = {
    admin: 'admin',
    role: 'role',
    gene: 'gene_profile',
    nft: 'nft_asset',
    competition: 'competition',
    loft: 'loft',
    auction: 'auction_session',
    arbitration: 'arbitration_case',
    content_news: 'news',
    content_banner: 'banner',
    content_notice: 'notice',
    detection: 'detection_order',
  };
  if (moduleToType[module]) return moduleToType[module];

  // path 关键词兜底
  if (path.includes('/detection/org')) return 'detection_org';
  if (path.includes('/detection/order')) return 'detection_order';
  if (path.includes('/detection/report')) return 'detection_report';
  if (path.includes('/gene/test')) return 'gene_test';
  if (path.includes('/gene/submission')) return 'gene_submission';
  if (path.includes('/nft/mint')) return 'nft_mint';
  if (path.includes('/loft/pigeon')) return 'loft_pigeon';
  if (path.includes('/loft/application')) return 'loft_application';
  if (path.includes('/auction/item')) return 'auction_item';
  if (path.includes('/arbitration/evidence')) return 'arbitration_evidence';

  return null;
}

// ==================== 生成业务摘要 ====================
export function buildAuditSummary(params: {
  adminUsername: string;
  adminNickname?: string | null;
  module: string;
  action: string;
  path: string;
  responseBody?: unknown;
  statusCode?: number;
  // 外部可覆盖
  targetTypeLabel?: string;
  targetName?: string;
  verb?: string;
  // 新增：用于 resolveObjectName
  before?: unknown;
  targetId?: number | null;
}): string {
  const operatorLabel = params.adminNickname || params.adminUsername || '未知';
  const moduleLabel = MODULE_LABELS[params.module] || params.module;

  // verb: 先精确匹配 module/action，再通用 action，最后 fallback
  let verb = params.verb;
  if (!verb) {
    verb = ACTION_VERBS[`${params.module}/${params.action}`];
  }
  if (!verb) verb = ACTION_VERBS[params.action];
  if (!verb) verb = `对 ${moduleLabel} 执行了 ${params.action}`;

  // 登录是特殊场景
  if (params.action === 'login') {
    return `${operatorLabel} 登录了系统`;
  }

  // 提取对象类型中文名
  let typeLabel = params.targetTypeLabel;
  if (!typeLabel) {
    const tt = extractTargetType(params.module, params.path, params.action);
    if (tt) typeLabel = OBJECT_TYPE_LABELS[tt];
  }

  // 提取对象名称（使用 4 级 fallback 的 resolveObjectName）
  const objectName = resolveObjectName({
    objectName: params.targetName,
    before: params.before,
    responseBody: params.responseBody,
    module: params.module,
    targetId: params.targetId,
  });

  // 组合
  let summary: string;
  if (objectName) {
    const typePrefix = typeLabel || '';
    summary = `${operatorLabel} ${verb}${typePrefix ? typePrefix + '「' : '「'}${objectName}${'」'}`;
  } else if (typeLabel) {
    summary = `${operatorLabel} ${verb}${typeLabel}`;
  } else {
    summary = `${operatorLabel} ${verb}${moduleLabel}`;
  }

  // 失败操作附加结果
  if (params.statusCode && params.statusCode >= 400) {
    summary += `（失败 · HTTP ${params.statusCode}）`;
  }

  return summary;
}

// ==================== Diff 生成 ====================
export interface DiffItem {
  field: string;
  label: string;
  from: unknown;
  to: unknown;
}

// 字段名 → 中文标签（通用）
export const FIELD_LABELS: Record<string, string> = {
  // 通用
  status: '状态', name: '名称', title: '标题', nickname: '昵称',
  username: '用户名', email: '邮箱', phone: '手机号',
  sort: '排序', is_top: '置顶', description: '描述',
  // 角色
  role_name: '角色名称', role_code: '角色编码',
  // 资讯/内容
  category: '分类', cover_url: '封面', summary: '摘要', author: '作者',
  published_at: '发布时间',
  // 订单/机构
  org_id: '检测机构', order_no: '订单号', report_no: '报告编号',
  price: '金额', status_code: '状态码',
  // 基因
  breed: '品种', bloodline: '血统', sex: '性别', age: '年龄',
  ring_number: '足环号',
};

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] || field;
}

/**
 * 对比 before 和 after 两个对象，返回字段级 diff
 * 只比较顶层字段，忽略以下字段：id, created_at, updated_at, admin_user_id
 *
 * 设计原则：
 * - UPDATE/PATCH：after 通常是用户提交的 req.body（只包含要改的字段），
 *   所以只迭代 after 的 key，避免 before 有但 after 没传的字段被误判为"变没了"
 * - DELETE：after 为 null，返回空数组（删除本身不需要 diff，summary 会说明"删除了 XXX"）
 */
export function buildDiff(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): DiffItem[] {
  if (!before || !after) return [];
  const IGNORE = new Set([
    'id', 'created_at', 'updated_at', 'admin_user_id',
    'password', 'token', 'secret',
  ]);
  const diffs: DiffItem[] = [];
  // 只迭代 after 的 key — 用户提交哪些字段，我们就对比哪些字段
  const keys = new Set<string>(Object.keys(after));
  for (const key of keys) {
    if (IGNORE.has(key)) continue;
    const a = before[key];
    const b = after[key];
    // 简单对象相等判断
    let changed = false;
    try {
      changed = JSON.stringify(a) !== JSON.stringify(b);
    } catch {
      changed = a !== b;
    }
    if (changed) {
      diffs.push({
        field: key,
        label: fieldLabel(key),
        from: a,
        to: b,
      });
    }
  }
  return diffs;
}

// ==================== recordAuditLog ====================
export interface RecordAuditLogParams {
  adminUserId?: number;
  adminUsername?: string;
  adminNickname?: string | null;
  module: string;
  action: string;
  method: string;
  path: string;
  params?: unknown;
  requestBody?: unknown;
  responseBody?: unknown;
  durationMs?: number;
  ip?: string;
  userAgent?: string;
  statusCode?: number;
  // 业务视角字段（可选，不传则自动生成）
  summary?: string;
  targetType?: string;
  targetId?: number;
  objectName?: string;
  diffItems?: DiffItem[];
  before?: unknown;
}

export function recordAuditLog(params: RecordAuditLogParams): void {
  try {
    // 自动补充业务字段
    const targetId = params.targetId ?? extractTargetId(params.responseBody, params.path);
    // 登录/登出是无目标操作，target_name 保持 null
    const _noTargetAction = params.action === 'login' || params.action === 'logout';
    // 统一用 resolveObjectName 算出最终的 objectName（4 级 fallback），确保 summary 和 target_name 一致
    const finalObjectName = _noTargetAction
      ? null
      : resolveObjectName({
          objectName: params.objectName,
          before: params.before,
          responseBody: params.responseBody,
          module: params.module,
          targetId,
        });
    const summary =
      params.summary ||
      buildAuditSummary({
        adminUsername: params.adminUsername || '未知',
        adminNickname: params.adminNickname,
        module: params.module,
        action: params.action,
        path: params.path,
        responseBody: params.responseBody,
        statusCode: params.statusCode,
        targetName: finalObjectName ?? undefined,
        before: params.before,
        targetId,
      });

    const targetType = params.targetType || extractTargetType(params.module, params.path, params.action);
    const diffJson = params.diffItems && params.diffItems.length
      ? JSON.stringify(params.diffItems)
      : null;

    db.prepare(
      `INSERT INTO audit_logs
       (admin_user_id, admin_username, module, action, method, path, params, request_body, response_body,
        duration_ms, ip, user_agent, status_code, summary, target_type, target_id, target_name, diff_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      params.adminUserId ?? null,
      params.adminUsername ?? null,
      params.module,
      params.action,
      params.method,
      params.path,
      params.params ? JSON.stringify(params.params) : null,
      params.requestBody ? JSON.stringify(params.requestBody) : null,
      params.responseBody !== undefined && params.responseBody !== null
        ? JSON.stringify(params.responseBody)
        : null,
      params.durationMs ?? null,
      params.ip ?? null,
      params.userAgent ?? null,
      params.statusCode ?? null,
      summary,
      targetType,
      targetId,
      finalObjectName,
      diffJson,
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[AUDIT] 记录审计日志失败:', err);
  }
}

// ==================== auditMiddleware ====================
export interface AuditMiddlewareOpts {
  /** 变更前对象（用于生成 diff） */
  before?: Record<string, unknown> | null;
  /** 操作对象类型覆盖 */
  targetType?: string;
  /** 操作对象 ID 覆盖 */
  targetId?: number;
  /** 摘要覆盖（跳过自动生成） */
  summary?: string;
  /** 操作对象中文名覆盖 */
  objectName?: string;
  /** 操作人昵称覆盖 */
  adminNickname?: string;
}

export function auditMiddleware(module: string, action: string, opts?: AuditMiddlewareOpts) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.adminUser) {
      next();
      return;
    }
    const startTime = Date.now();
    let capturedResponse: unknown = null;

    const originalSend = res.send.bind(res) as Response['send'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.send = function send(body?: any): Response {
      if (typeof body === 'string') {
        try {
          capturedResponse = JSON.parse(body);
        } catch {
          capturedResponse = body.length > 2000 ? body.slice(0, 2000) : body;
        }
      } else if (body !== undefined && body !== null) {
        capturedResponse = body;
      }
      return originalSend(body);
    } as Response['send'];

    res.on('finish', () => {
      try {
        const duration = Date.now() - startTime;
        const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);

        // 允许路由处理函数通过 res.locals.audit 覆盖/注入运行时数据
        // 这样 before/targetName/targetId 等可以在路由运行时（而非注册时）设置
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const runtimeAudit = (res.locals as any).audit as AuditMiddlewareOpts | undefined;
        const mergedOpts: AuditMiddlewareOpts = { ...opts, ...runtimeAudit };

        // 生成 diff（仅 UPDATE/DELETE 类 + 有 before）
        let diffItems: DiffItem[] | undefined;
        if (mergedOpts.before && ['PUT', 'PATCH', 'DELETE'].includes(req.method)) {
          // 尝试从 responseBody 获取变更后状态；若 response 没返回新数据（常见 ok(res, null)），
          // 则降级用 req.body（即用户提交的新字段值）作为 after
          let afterData: Record<string, unknown> | null = null;
          if (capturedResponse && typeof capturedResponse === 'object') {
            const d = (capturedResponse as Record<string, unknown>).data;
            if (d && typeof d === 'object') afterData = d as Record<string, unknown>;
          }
          if (!afterData && ['PUT', 'PATCH'].includes(req.method) && req.body && typeof req.body === 'object') {
            afterData = req.body as Record<string, unknown>;
          }
          diffItems = buildDiff(mergedOpts.before as Record<string, unknown>, afterData);
        }

        // 从 admin_users 表查昵称（如果没传）
        let nickname = opts?.adminNickname ?? null;
        if (!nickname && req.adminUser?.id) {
          try {
            const row = db
              .prepare('SELECT nickname FROM admin_users WHERE id = ?')
              .get(req.adminUser.id) as { nickname: string | null } | undefined;
            nickname = row?.nickname ?? null;
          } catch {
            // ignore
          }
        }

        recordAuditLog({
          adminUserId: req.adminUser!.id,
          adminUsername: req.adminUser!.username,
          adminNickname: nickname,
          module,
          action,
          method: req.method,
          path: req.originalUrl || req.url,
          params: req.query,
          requestBody: isWrite ? redactSensitive(req.body) : undefined,
          responseBody: capturedResponse,
          durationMs: duration,
          ip: formatIp(getClientIp(req)) ?? undefined,
          userAgent: req.headers['user-agent'],
          statusCode: res.statusCode,
          // 业务视角字段（支持运行时 res.locals.audit 覆盖）
          summary: mergedOpts.summary,
          targetType: mergedOpts.targetType,
          targetId: mergedOpts.targetId,
          objectName: mergedOpts.objectName,
          diffItems,
          before: mergedOpts.before,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[AUDIT] 写入审计日志失败:', err);
      }
    });

    next();
  };
}

export default auditMiddleware;
