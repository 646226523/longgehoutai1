import { Response, NextFunction } from 'express';
import db from '../db';
import type { AuthedRequest } from '../types';

// 敏感字段脱敏:避免密码等明文写入审计日志
const SENSITIVE_KEYS = ['password', 'oldPassword', 'newPassword', 'secret', 'token'];
function redactSensitive(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  try {
    const cloned: Record<string, unknown> = { ...(body as Record<string, unknown>) };
    SENSITIVE_KEYS.forEach((k) => {
      if (k in cloned) cloned[k] = '***';
    });
    return cloned;
  } catch {
    return body;
  }
}

// 审计日志记录函数:记录管理员操作
export function recordAuditLog(params: {
  adminUserId?: number;
  adminUsername?: string;
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
}): void {
  try {
    db.prepare(
      `INSERT INTO audit_logs
       (admin_user_id, admin_username, module, action, method, path, params, request_body, response_body, duration_ms, ip, user_agent, status_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      params.adminUserId ?? null,
      params.adminUsername ?? null,
      params.module,
      params.action,
      params.method,
      params.path,
      params.params ? JSON.stringify(params.params) : null,
      params.requestBody ? JSON.stringify(params.requestBody) : null,
      params.responseBody ? JSON.stringify(params.responseBody) : null,
      params.durationMs ?? null,
      params.ip ?? null,
      params.userAgent ?? null,
      params.statusCode ?? null
    );
  } catch (err) {
    // 审计日志写入失败不应影响主流程
    // eslint-disable-next-line no-console
    console.error('[AUDIT] 记录审计日志失败:', err);
  }
}

// 审计日志中间件:自动记录已认证管理员的请求
// 捕获请求体、响应体、状态码与耗时;在响应结束时写入日志
export function auditMiddleware(module: string, action: string) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    // 仅记录有认证信息的请求
    if (!req.adminUser) {
      next();
      return;
    }
    const startTime = Date.now();
    let capturedResponse: unknown = null;

    // 拦截 res.send 捕获响应体(res.json 内部也会调用 res.send)
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

    // 响应结束时写入审计日志(此时 statusCode 与耗时已确定)
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
      try {
        recordAuditLog({
          adminUserId: req.adminUser!.id,
          adminUsername: req.adminUser!.username,
          module,
          action,
          method: req.method,
          path: req.originalUrl || req.url,
          params: req.query,
          requestBody: isWrite ? redactSensitive(req.body) : undefined,
          responseBody: capturedResponse,
          durationMs: duration,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          statusCode: res.statusCode,
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
