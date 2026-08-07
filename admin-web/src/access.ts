// 权限控制:根据当前用户权限过滤菜单和按钮

// 当前用户信息类型(与后端 /api/auth/profile 返回结构一致)
export interface CurrentUser {
  id: number;
  username: string;
  nickname: string;
  avatar?: string;
  roles: string[];
  permissions: string[];
}

// 判断当前用户是否拥有指定权限标识
// 超管(roles 含 'super_admin')拥有所有权限
export function hasPermission(user: CurrentUser | null, permission: string): boolean {
  if (!user) return false;
  if (user.roles.includes('super_admin')) return true;
  return user.permissions.includes(permission);
}

// 判断当前用户是否拥有给定权限列表中的任意一个
export function hasAnyPermission(user: CurrentUser | null, permissions: string[]): boolean {
  if (!user) return false;
  if (user.roles.includes('super_admin')) return true;
  if (!permissions.length) return true;
  return permissions.some((p) => user.permissions.includes(p));
}

// 判断当前用户是否拥有给定权限列表中的全部
export function hasAllPermissions(user: CurrentUser | null, permissions: string[]): boolean {
  if (!user) return false;
  if (user.roles.includes('super_admin')) return true;
  return permissions.every((p) => user.permissions.includes(p));
}

// 判断当前用户是否为超管
export function isSuperAdmin(user: CurrentUser | null): boolean {
  return !!user && user.roles.includes('super_admin');
}

export default {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isSuperAdmin,
};
