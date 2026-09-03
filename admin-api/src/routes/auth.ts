import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db';
import { config } from '../config';
import { authenticate, getAdminRoles, getAdminPermissions } from '../middlewares/auth';
import { recordAuditLog, formatIp, getClientIp } from '../middlewares/audit';
import type { AuthedRequest, ApiResponse, JwtPayload } from '../types';

const router = Router();

// 统一成功响应
function ok<T>(res: Response, data: T, message = 'success'): Response {
  const body: ApiResponse<T> = { code: 0, message, data };
  return res.json(body);
}

// 统一失败响应
function fail(res: Response, status: number, message: string): Response {
  const body: ApiResponse = { code: status, message, data: null };
  return res.status(status).json(body);
}

// 签发 Access Token
function signAccessToken(payload: { sub: number; username: string }): string {
  const jwtPayload: JwtPayload = {
    sub: payload.sub,
    username: payload.username,
    type: 'access',
  };
  return jwt.sign(jwtPayload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
}

// 签发 Refresh Token
function signRefreshToken(payload: { sub: number; username: string }): string {
  const jwtPayload: JwtPayload = {
    sub: payload.sub,
    username: payload.username,
    type: 'refresh',
  };
  return jwt.sign(jwtPayload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

// POST /api/auth/login - 管理员登录
router.post('/login', (req: AuthedRequest, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    return fail(res, 400, '用户名和密码不能为空');
  }

  const user = db
    .prepare('SELECT id, username, password, nickname, status FROM admin_users WHERE username = ?')
    .get(username) as
    | { id: number; username: string; password: string; nickname: string; status: number }
    | undefined;

  if (!user) {
    return fail(res, 401, '用户名或密码错误');
  }
  if (user.status !== 1) {
    return fail(res, 403, '账号已被禁用,请联系超级管理员');
  }

  // 校验密码(bcrypt)
  const passwordValid = bcrypt.compareSync(password, user.password);
  if (!passwordValid) {
    return fail(res, 401, '用户名或密码错误');
  }

  // 签发 Token
  const accessToken = signAccessToken({ sub: user.id, username: user.username });
  const refreshToken = signRefreshToken({ sub: user.id, username: user.username });

  // 更新最后登录时间
  db.prepare('UPDATE admin_users SET last_login_at = ? WHERE id = ?').run(Date.now(), user.id);

  // 记录审计日志
  try {
    recordAuditLog({
      adminUserId: user.id,
      adminUsername: user.username,
      module: 'auth',
      action: 'login',
      method: req.method,
      path: req.originalUrl,
      ip: formatIp(getClientIp(req)) ?? undefined,
      userAgent: req.headers['user-agent'],
      statusCode: 200,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[AUTH] 登录审计日志记录失败:', err);
  }

  return ok(res, {
    accessToken,
    refreshToken,
    expiresIn: 7200, // 2 小时,单位秒
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
    },
  });
});

// GET /api/auth/profile - 获取当前用户信息(返回用户、角色、权限列表)
router.get('/profile', authenticate, (req: AuthedRequest, res: Response) => {
  if (!req.adminUser) {
    return fail(res, 401, '未认证');
  }
  const roles = getAdminRoles(req.adminUser.id);
  const { permissions, isSuper } = getAdminPermissions(req.adminUser.id);

  return ok(res, {
    id: req.adminUser.id,
    username: req.adminUser.username,
    nickname: req.adminUser.nickname,
    avatar: req.adminUser.avatar,
    roles,
    permissions: isSuper ? ['*'] : permissions,
  });
});

// POST /api/auth/refresh - 刷新 Token
router.post('/refresh', (req: AuthedRequest, res: Response) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) {
    return fail(res, 400, 'refreshToken 不能为空');
  }
  try {
    const payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as unknown as JwtPayload;
    if (payload.type !== 'refresh') {
      return fail(res, 401, '令牌类型无效');
    }
    // 校验用户仍然存在且启用
    const user = db
      .prepare('SELECT id, username, status FROM admin_users WHERE id = ?')
      .get(payload.sub) as
      | { id: number; username: string; status: number }
      | undefined;
    if (!user || user.status !== 1) {
      return fail(res, 401, '用户不存在或已被禁用');
    }

    const newAccessToken = signAccessToken({ sub: user.id, username: user.username });
    const newRefreshToken = signRefreshToken({ sub: user.id, username: user.username });

    return ok(res, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 7200,
    });
  } catch (err) {
    const message =
      err instanceof jwt.TokenExpiredError ? '刷新令牌已过期,请重新登录' : '刷新令牌无效';
    return fail(res, 401, message);
  }
});

// POST /api/auth/logout - 退出登录(客户端清除 Token,服务端记录日志)
router.post('/logout', authenticate, (req: AuthedRequest, res: Response) => {
  if (req.adminUser) {
    recordAuditLog({
      adminUserId: req.adminUser.id,
      adminUsername: req.adminUser.username,
      module: 'auth',
      action: 'logout',
      method: req.method,
      path: req.originalUrl,
      ip: formatIp(getClientIp(req)) ?? undefined,
      userAgent: req.headers['user-agent'],
      statusCode: 200,
    });
  }
  return ok(res, null, '已退出登录');
});

export default router;
