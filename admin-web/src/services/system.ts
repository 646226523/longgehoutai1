import { http } from './request';

// ==================== 通用分页结果 ====================
export interface PageResult<T> {
  list: T[];
  total: number;
}

// ==================== 管理员管理 ====================
export interface AdminItem {
  id: number;
  username: string;
  nickname: string;
  avatar: string | null;
  email: string | null;
  phone: string | null;
  status: number;
  last_login_at: number | null;
  created_at: number;
  updated_at: number;
  role_ids: number[];
  role_names: string[];
  role_codes: string[];
}

export interface AdminListParams {
  page?: number;
  pageSize?: number;
  username?: string;
  status?: number | string;
}

export interface AdminCreateParams {
  username: string;
  nickname: string;
  password: string;
  phone?: string;
  email?: string;
  status?: number;
  role_ids?: number[];
}

export interface AdminUpdateParams {
  nickname?: string;
  phone?: string;
  email?: string;
  status?: number;
  password?: string;
}

export interface RoleOption {
  id: number;
  code: string;
  name: string;
  status: number;
}

// 管理员分页列表
export async function getAdminList(params: AdminListParams): Promise<PageResult<AdminItem>> {
  const data = await http.get<PageResult<AdminItem>>('/system/admins', { params });
  return data;
}

// 新增管理员
export async function createAdmin(data: AdminCreateParams): Promise<{ id: number }> {
  return await http.post('/system/admins', data);
}

// 编辑管理员
export async function updateAdmin(id: number, data: AdminUpdateParams): Promise<void> {
  await http.put(`/system/admins/${id}`, data);
}

// 启用/禁用管理员
export async function updateAdminStatus(id: number, status: number): Promise<void> {
  await http.patch(`/system/admins/${id}/status`, { status });
}

// 删除管理员
export async function deleteAdmin(id: number): Promise<void> {
  await http.delete(`/system/admins/${id}`);
}

// 分配角色
export async function assignAdminRoles(id: number, role_ids: number[]): Promise<void> {
  await http.put(`/system/admins/${id}/roles`, { role_ids });
}

// 重置密码
export async function resetAdminPassword(id: number, password?: string): Promise<void> {
  await http.patch(`/system/admins/${id}/reset-password`, { password });
}

// 角色下拉选项
export async function getAdminRoleOptions(): Promise<RoleOption[]> {
  const data = await http.get<RoleOption[]>('/system/admins/roles/select');
  return Array.isArray(data) ? data : [];
}

// ==================== 角色与权限 ====================
export interface RoleItem {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_super: number;
  status: number;
  created_at: number;
}

export interface RoleListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  list?: string;
}

export interface RoleCreateParams {
  code: string;
  name: string;
  description?: string;
  status?: number;
}

export interface RoleUpdateParams {
  name?: string;
  description?: string;
  status?: number;
}

export interface PermissionNode {
  id: number;
  code: string;
  name: string;
  module: string;
  type: string;
  description: string | null;
}

export interface PermissionGroup {
  module: string;
  permissions: PermissionNode[];
}

// 角色列表
export async function getRoleList(params: RoleListParams): Promise<PageResult<RoleItem>> {
  const data = await http.get<PageResult<RoleItem>>('/system/roles', { params });
  return data;
}

// 新增角色
export async function createRole(data: RoleCreateParams): Promise<{ id: number }> {
  return await http.post('/system/roles', data);
}

// 编辑角色
export async function updateRole(id: number, data: RoleUpdateParams): Promise<void> {
  await http.put(`/system/roles/${id}`, data);
}

// 删除角色
export async function deleteRole(id: number): Promise<void> {
  await http.delete(`/system/roles/${id}`);
}

// 查询角色权限
export async function getRolePermissions(id: number): Promise<number[]> {
  const data = await http.get<number[]>(`/system/roles/${id}/permissions`);
  return Array.isArray(data) ? data : [];
}

// 分配权限
export async function assignRolePermissions(id: number, permission_ids: number[]): Promise<void> {
  await http.put(`/system/roles/${id}/permissions`, { permission_ids });
}

// 全部权限列表(按模块分组)
export async function getAllPermissions(): Promise<PermissionGroup[]> {
  const data = await http.get<PermissionGroup[]>('/system/permissions');
  return Array.isArray(data) ? data : [];
}

// ==================== 操作日志 ====================
export interface AuditLogItem {
  id: number;
  admin_user_id: number | null;
  admin_username: string | null;
  module: string | null;
  action: string | null;
  method: string | null;
  path: string | null;
  params: string | null;
  request_body: string | null;
  response_body: string | null;
  duration_ms: number | null;
  ip: string | null;
  user_agent: string | null;
  status_code: number | null;
  created_at: number;
}

export interface AuditLogParams {
  page?: number;
  pageSize?: number;
  operator?: string;
  module?: string;
  action?: string;
  startTime?: number;
  endTime?: number;
}

// 审计日志分页查询
export async function getAuditLogs(params: AuditLogParams): Promise<PageResult<AuditLogItem>> {
  const data = await http.get<PageResult<AuditLogItem>>('/system/audit-logs', { params });
  return data;
}

// 审计模块下拉
export async function getAuditModules(): Promise<string[]> {
  const data = await http.get<string[]>('/system/audit-logs/modules');
  return data;
}

// ==================== 系统配置 ====================
export interface ConfigItem {
  id: number;
  config_key: string;
  config_value: string | null;
  name: string;
  config_group: string;
  description: string | null;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface ConfigGroupResult {
  groups: Array<{ group: string; items: ConfigItem[] }>;
  list: ConfigItem[];
}

// 配置列表(按分组)
export async function getConfigs(group?: string): Promise<ConfigGroupResult> {
  const data = await http.get<ConfigGroupResult>('/system/configs', {
    params: group ? { group } : {},
  });
  return data;
}

// 更新配置值
export async function updateConfig(key: string, config_value: string): Promise<void> {
  await http.put(`/system/configs/${key}`, { config_value });
}

export interface MapConfig {
  provider: string;
  amap_key: string;
  baidu_key: string;
  tencent_key: string;
}

// 获取地图服务配置（服务商 + 各家 Key）
export async function getMapConfig(): Promise<MapConfig> {
  const data = await http.get<MapConfig>('/system/map-config');
  return data;
}

// ==================== 数据字典 ====================
export interface DictItem {
  id: number;
  dict_type: string;
  type_name: string;
  item_code: string;
  item_name: string;
  sort_order: number;
  status: number;
  remark: string | null;
  created_at: number;
  updated_at: number;
}

export interface DictTypeItem {
  dict_type: string;
  type_name: string;
  item_count: number;
}

export interface DictListParams {
  page?: number;
  pageSize?: number;
  dict_type?: string;
  keyword?: string;
  list?: string;
}

export interface DictCreateParams {
  dict_type: string;
  type_name?: string;
  item_code: string;
  item_name: string;
  sort_order?: number;
  status?: number;
  remark?: string;
}

export interface DictUpdateParams extends DictCreateParams {}

// 字典类型列表
export async function getDictTypes(): Promise<DictTypeItem[]> {
  const data = await http.get<DictTypeItem[]>('/system/dictionaries/types');
  return data;
}

// 字典项分页列表
export async function getDictList(params: DictListParams): Promise<PageResult<DictItem>> {
  const data = await http.get<PageResult<DictItem>>('/system/dictionaries', { params });
  return data;
}

// 新增字典项
export async function createDict(data: DictCreateParams): Promise<{ id: number }> {
  return await http.post('/system/dictionaries', data);
}

// 编辑字典项
export async function updateDict(id: number, data: DictUpdateParams): Promise<void> {
  await http.put(`/system/dictionaries/${id}`, data);
}

// 删除字典项
export async function deleteDict(id: number): Promise<void> {
  await http.delete(`/system/dictionaries/${id}`);
}
