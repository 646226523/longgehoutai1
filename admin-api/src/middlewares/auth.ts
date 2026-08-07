import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db';
import { config } from '../config';
import type { AuthedRequest, JwtPayload, ApiResponse } from '../types';

// 统一错误响应辅助
function fail(res: Response, status: number, message: string): Response {
  const body: ApiResponse = { code: status, message, data: null };
  return res.status(status).json(body);
}

// 获取管理员的角色编码列表
function getAdminRoles(adminUserId: number): string[] {
  const rows = db
    .prepare(
      `SELECT r.code FROM roles r
       JOIN admin_user_roles aur ON aur.role_id = r.id
       WHERE aur.admin_user_id = ? AND r.status = 1`
    )
    .all(adminUserId) as Array<{ code: string }>;
  return rows.map((r) => r.code);
}

// 获取管理员的权限编码列表(超管返回空数组,通过 isSuper 标识拥有全部权限)
function getAdminPermissions(adminUserId: number): { permissions: string[]; isSuper: boolean } {
  const roles = getAdminRoles(adminUserId);
  const isSuper = roles.includes('super_admin');
  if (isSuper) {
    return { permissions: [], isSuper: true };
  }
  const rows = db
    .prepare(
      `SELECT DISTINCT p.code FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       JOIN admin_user_roles aur ON aur.role_id = rp.role_id
       WHERE aur.admin_user_id = ?`
    )
    .all(adminUserId) as Array<{ code: string }>;
  return { permissions: rows.map((r) => r.code), isSuper: false };
}

// JWT 鉴权中间件:校验 Authorization Bearer Token
export function authenticate(req: AuthedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    fail(res, 401, '未提供认证令牌');
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, config.jwt.secret) as unknown as JwtPayload;
    if (payload.type !== 'access') {
      fail(res, 401, '令牌类型无效');
      return;
    }
    const adminId = payload.sub;
    // 查询管理员是否存在且启用
    const user = db
      .prepare('SELECT id, username, nickname, avatar, status FROM admin_users WHERE id = ?')
      .get(adminId) as
      | { id: number; username: string; nickname: string; avatar: string | null; status: number }
      | undefined;
    if (!user) {
      fail(res, 401, '用户不存在');
      return;
    }
    if (user.status !== 1) {
      fail(res, 401, '账号已被禁用');
      return;
    }
    const { permissions, isSuper } = getAdminPermissions(user.id);
    req.adminUser = {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      roles: getAdminRoles(user.id),
      permissions,
      isSuper,
    };
    next();
  } catch (err) {
    const message = err instanceof jwt.TokenExpiredError ? '令牌已过期' : '令牌无效';
    fail(res, 401, message);
    return;
  }
}

// 权限校验中间件工厂:校验当前用户是否拥有指定权限
// 超管直接放行
export function requirePermission(permission: string) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.adminUser) {
      fail(res, 401, '未认证');
      return;
    }
    if (req.adminUser.isSuper) {
      next();
      return;
    }
    if (!req.adminUser.permissions.includes(permission)) {
      fail(res, 403, `无权限:${permission}`);
      return;
    }
    next();
  };
}

// 多权限校验:拥有任意一个即可
export function requireAnyPermission(...permissions: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.adminUser) {
      fail(res, 401, '未认证');
      return;
    }
    if (req.adminUser.isSuper) {
      next();
      return;
    }
    const hasAny = permissions.some((p) => req.adminUser!.permissions.includes(p));
    if (!hasAny) {
      fail(res, 403, `无权限:需要 ${permissions.join(' / ')} 中的任意一项`);
      return;
    }
    next();
  };
}

export { getAdminRoles, getAdminPermissions };
