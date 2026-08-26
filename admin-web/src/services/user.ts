import { http } from './request';

// ==================== 通用分页结果 ====================
export interface PageResult<T> {
  list: T[];
  total: number;
}

// ==================== 用户管理(SubTask 10.1) ====================

// 用户列表项(后端关联 member_levels 返回)
export interface UserItem {
  id: number;
  username: string;
  nickname: string;
  avatar: string | null;
  phone: string | null;
  real_name: string | null;
  id_card: string | null;
  id_card_front: string | null;
  id_card_back: string | null;
  id_card_handheld: string | null;
  status: number; // 1 正常 / 0 封禁
  growth_value: number;
  member_level_id: number | null;
  level_name: string | null;
  level_code: string | null;
  cert_status: string; // none/real/loft_owner/pigeon_loft
  real_name_status: string; // none/pending/approved/rejected
  loft_owner_status: string; // none/pending/approved/rejected
  audit_remark: string | null;
  created_at: number;
  updated_at: number;
}

export interface UserListParams {
  page?: number;
  pageSize?: number;
  keyword?: string; // 用户名/昵称/手机号
  status?: number | string;
  cert_status?: string;
}

// 审核列表项(用于认证审核页面)
export interface AuditItem {
  id: number;
  username: string;
  nickname: string;
  avatar: string | null;
  phone: string | null;
  real_name: string | null;
  id_card: string | null;
  id_card_front: string | null;
  id_card_back: string | null;
  id_card_handheld: string | null;
  status: number;
  growth_value: number;
  member_level_id: number | null;
  level_name: string | null;
  level_code: string | null;
  cert_status: string;
  real_name_status: string;
  loft_owner_status: string;
  audit_remark: string | null;
  created_at: number;
  updated_at: number;
}

export interface AuditListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  audit_type?: string; // real_name / loft_owner
  audit_status?: string; // pending / approved / rejected
}

export interface UserUpdateParams {
  nickname?: string;
  phone?: string;
  real_name?: string;
  id_card?: string;
  growth_value?: number;
  member_level_id?: number | null;
}

// 用户分页列表
export async function getUserList(params: UserListParams): Promise<PageResult<UserItem>> {
  const data = await http.get<PageResult<UserItem>>('/user/users', { params });
  return data;
}

// 用户详情
export async function getUserDetail(id: number): Promise<UserItem> {
  const data = await http.get<UserItem>(`/user/users/${id}`);
  return data;
}

// 编辑用户
export async function updateUser(id: number, data: UserUpdateParams): Promise<void> {
  await http.put(`/user/users/${id}`, data);
}

// 封禁/解封(1 正常 / 0 封禁)
export async function updateUserStatus(id: number, status: number): Promise<void> {
  await http.patch(`/user/users/${id}/status`, { status });
}

// 实名认证审核
export async function auditUserRealName(
  id: number,
  action: 'approved' | 'rejected',
  remark?: string
): Promise<void> {
  await http.post(`/user/users/${id}/audit-real`, { action, remark });
}

// 鸽主认证审核
export async function auditUserLoftOwner(
  id: number,
  action: 'approved' | 'rejected',
  remark?: string
): Promise<void> {
  await http.post(`/user/users/${id}/audit-loft-owner`, { action, remark });
}

// ==================== 会员等级(SubTask 10.2) ====================

export interface MemberLevelItem {
  id: number;
  code: string;
  name: string;
  min_growth: number;
  sort: number;
  icon: string | null;
  benefits: string | null;
  status: number;
  theme_color?: string;
  benefit_count: number;
  user_count: number;
  created_at: number;
  updated_at: number;
}

export interface MemberLevelListParams {
  status?: number | string;
}

export interface MemberLevelCreateParams {
  code: string;
  name: string;
  min_growth?: number;
  sort?: number;
  icon?: string;
  benefits?: string;
  status?: number;
  theme_color?: string;
}

export interface MemberLevelUpdateParams {
  name?: string;
  min_growth?: number;
  sort?: number;
  icon?: string;
  benefits?: string;
  status?: number;
  theme_color?: string;
}

// 等级列表
export async function getMemberLevels(
  params?: MemberLevelListParams
): Promise<PageResult<MemberLevelItem>> {
  const data = await http.get<PageResult<MemberLevelItem>>('/user/levels', { params });
  return data;
}

// 新增等级
export async function createMemberLevel(
  data: MemberLevelCreateParams
): Promise<{ id: number }> {
  return await http.post('/user/levels', data);
}

// 编辑等级
export async function updateMemberLevel(
  id: number,
  data: MemberLevelUpdateParams
): Promise<void> {
  await http.put(`/user/levels/${id}`, data);
}

// 删除等级
export async function deleteMemberLevel(id: number): Promise<void> {
  await http.delete(`/user/levels/${id}`);
}

// 调整排序
export async function updateMemberLevelSort(id: number, sort: number): Promise<void> {
  await http.patch(`/user/levels/${id}/sort`, { sort });
}

// 成长值重算:按等级 min_growth 重新匹配用户 member_level_id
export async function recomputeUserLevels(): Promise<{ affected: number }> {
  const data = await http.post<{ affected: number }>('/user/levels/recompute');
  return data;
}

// ==================== 会员权益(SubTask 10.3) ====================

export interface MemberBenefitItem {
  id: number;
  level_id: number;
  name: string;
  type: string; // discount/count/privilege
  value: string | null;
  description: string | null;
  status: number;
  created_at: number;
}

export interface MemberBenefitCreateParams {
  name: string;
  type?: string;
  value?: string;
  description?: string;
  status?: number;
}

export interface MemberBenefitUpdateParams {
  name?: string;
  type?: string;
  value?: string;
  description?: string;
  status?: number;
}

// 某等级权益列表
export async function getMemberBenefits(
  levelId: number
): Promise<PageResult<MemberBenefitItem>> {
  const data = await http.get<PageResult<MemberBenefitItem>>(
    `/user/levels/${levelId}/benefits`
  );
  return data;
}

// 新增权益
export async function createMemberBenefit(
  levelId: number,
  data: MemberBenefitCreateParams
): Promise<{ id: number }> {
  return await http.post(`/user/levels/${levelId}/benefits`, data);
}

// 编辑权益
export async function updateMemberBenefit(
  id: number,
  data: MemberBenefitUpdateParams
): Promise<void> {
  await http.put(`/user/benefits/${id}`, data);
}

// 删除权益
export async function deleteMemberBenefit(id: number): Promise<void> {
  await http.delete(`/user/benefits/${id}`);
}

// 审核列表(实名认证+鸽主认证)
export async function getAuditList(params: AuditListParams): Promise<PageResult<AuditItem>> {
  const data = await http.get<PageResult<AuditItem>>('/user/audits', { params });
  return data;
}
