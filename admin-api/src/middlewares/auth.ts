import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db';
import { config } from '../config';
import type { AuthedRequest, JwtPayload, ApiResponse } from '../types';

/**
 * v2 细粒度权限 → v1 旧权限 兼容映射表
 * 当用户拥有任意一个 v2 code 时，自动追加对应的 v1 code
 * 让仍在使用 v1 code 的后端路由 requirePermission() 检查也能通过
 * 未来可逐步将后端路由升级为 v2 code，届时此映射表可删除
 */
const V2_TO_V1_COMPAT_MAP: Record<string, string[]> = {
  // ===== gene 模块 =====
  'gene:list:view': ['gene:view'],
  'gene:list:create': ['gene:edit'],
  'gene:list:edit': ['gene:edit'],
  'gene:list:detail': ['gene:view'],
  'gene:audit:view': ['gene:audit'],
  'gene:audit:pass': ['gene:audit'],
  'gene:audit:reject': ['gene:audit'],

  // ===== nft 模块 =====
  'nft:list:view': ['nft:view'],
  'nft:list:create': ['nft:edit'],
  'nft:list:edit': ['nft:edit'],
  'nft:list:submit_audit': ['nft:edit'],
  'nft:audit:view': ['nft:audit'],
  'nft:audit:pass': ['nft:audit'],
  'nft:audit:reject': ['nft:audit'],

  // ===== competition 模块 =====
  'competition:list:view': ['competition:view'],
  'competition:list:create': ['competition:edit'],
  'competition:list:edit': ['competition:edit'],
  'competition:list:publish': ['competition:edit'],
  'competition:verify:view': ['competition:verify'],
  'competition:verify:start': ['competition:verify'],

  // ===== loft 模块 =====
  'loft:list:view': ['loft:view'],
  'loft:audit:view': ['loft:audit'],
  'loft:audit:pass': ['loft:audit'],
  'loft:audit:reject': ['loft:audit'],

  // ===== detection 模块 =====
  'detection:order:view': ['detection:view'],
  'detection:order:detail': ['detection:view'],
  'detection:order:edit': ['detection:view'],
  'detection:order:confirm': ['detection:view'],
  'detection:order:schedule': ['detection:view'],
  'detection:order:cancel': ['detection:view'],
  'detection:order:delete': ['detection:view'],
  'detection:report:view': ['detection:report'],
  'detection:report:create': ['detection:report'],
  'detection:report:edit': ['detection:report'],
  'detection:report:delete': ['detection:report'],
  'detection:report:export': ['detection:report'],
  // 注意：detection:org:manage 不再映射到 detection:view
  // 检测机构用独立 v2 code，需要显式授权

  // ===== auction 模块 =====
  'auction:session:view': ['auction:view'],
  'auction:session:create': ['auction:edit'],
  'auction:session:edit': ['auction:edit'],
  'auction:items:view': ['auction:view'],
  'auction:deal:view': ['auction:deal'],
  'auction:deal:manage': ['auction:deal'],

  // ===== arbitration 模块 =====
  'arbitration:case:view': ['arbitration:view'],
  'arbitration:case:accept': ['arbitration:judge'],
  'arbitration:case:edit': ['arbitration:judge'],

  // ===== user 模块 =====
  'user:list:view': ['user:view'],
  'user:list:edit': ['user:edit'],
  'user:audit:view': ['user:view'],
  'user:audit:pass': ['user:edit'],
  'user:audit:reject': ['user:edit'],

  // ===== member 模块 =====
  'user:member:view': ['member:view'],
  'user:member:create': ['member:edit'],
  'user:member:edit': ['member:edit'],

  // ===== content 模块 =====
  'content:news:view': ['content:view'],
  'content:news:create': ['content:edit'],
  'content:news:edit': ['content:edit'],
  'content:banner:view': ['content:view'],
  'content:banner:create': ['content:edit'],
  'content:banner:edit': ['content:edit'],
  'content:notice:view': ['content:view'],
  'content:notice:create': ['content:edit'],
  'content:notice:edit': ['content:edit'],

  // ===== system 模块 =====
  'system:admin:view': ['system:admin', 'system:view'],
  'system:admin:manage': ['system:admin', 'system:view'],
  'system:role:view': ['system:role', 'system:view'],
  'system:role:manage': ['system:role', 'system:view'],
  'system:audit:view': ['system:audit', 'system:view'],
  'system:config:manage': ['system:config', 'system:view'],
};

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
// 合并来源: 角色继承权限 + 管理员直接分配权限
function getAdminPermissions(adminUserId: number): { permissions: string[]; isSuper: boolean } {
  const roles = getAdminRoles(adminUserId);
  const isSuper = roles.includes('super_admin');
  if (isSuper) {
    return { permissions: [], isSuper: true };
  }
  // 角色继承权限
  const rolePerms = db
    .prepare(
      `SELECT DISTINCT p.code FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       JOIN admin_user_roles aur ON aur.role_id = rp.role_id
       WHERE aur.admin_user_id = ?`
    )
    .all(adminUserId) as Array<{ code: string }>;
  // 管理员直接权限
  const directPerms = db
    .prepare(
      `SELECT DISTINCT p.code FROM permissions p
       JOIN admin_permissions ap ON ap.permission_id = p.id
       WHERE ap.admin_user_id = ?`
    )
    .all(adminUserId) as Array<{ code: string }>;
  const merged = new Set<string>();
  rolePerms.forEach((r) => merged.add(r.code));
  directPerms.forEach((r) => merged.add(r.code));
  // ===== v2→v1 兼容映射：为拥有 v2 细粒度权限的用户追加 v1 旧权限 =====
  // 让仍在使用 v1 code 的后端路由 requirePermission() 检查也能通过
  for (const v2Code of merged) {
    const v1Codes = V2_TO_V1_COMPAT_MAP[v2Code];
    if (v1Codes) {
      for (const v1Code of v1Codes) {
        merged.add(v1Code);
      }
    }
  }
  return { permissions: Array.from(merged), isSuper: false };
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
