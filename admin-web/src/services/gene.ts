import { http } from './request';
import type { PageResult } from './system';

// ==================== 基因档案 ====================
export interface GeneProfile {
  id: number;
  ring_number: string;
  name: string;
  gender: string;
  breed: string;
  bloodline: string;
  owner_name: string;
  owner_phone: string | null;
  color: string | null;
  eye_color: string | null;
  birth_date: string | null;
  gene_sequence: string | null;
  qr_code: string | null;
  photo_url: string | null;
  status: number;
  created_at: number;
  updated_at: number;
  // 列表关联的直系父母摘要
  sire_id: number | null;
  dam_id: number | null;
  sire_ring: string | null;
  sire_name: string | null;
  dam_ring: string | null;
  dam_name: string | null;
}

// 档案详情(含检测记录与父母简要)
export interface GeneParentBrief {
  id: number;
  ring_number: string;
  name: string;
  gender: string;
  breed: string;
  bloodline: string;
}

export interface GeneTest {
  id: number;
  gene_profile_id: number;
  test_org: string;
  project: string;
  report_no: string | null;
  result: string | null;
  report_url: string | null;
  test_date: string | null;
  created_at: number;
}

export interface GeneProfileDetail extends GeneProfile {
  tests: GeneTest[];
  sire: GeneParentBrief | null;
  dam: GeneParentBrief | null;
}

export interface GeneProfileListParams {
  page?: number;
  pageSize?: number;
  ring_number?: string;
  owner_name?: string;
  bloodline?: string;
  status?: number | string;
}

export interface GeneProfileCreateParams {
  ring_number: string;
  name: string;
  gender?: string;
  breed?: string;
  bloodline?: string;
  owner_name?: string;
  owner_phone?: string;
  color?: string;
  eye_color?: string;
  birth_date?: string;
  gene_sequence?: string;
  photo_url?: string;
  status?: number;
  sire_id?: number | null;
  dam_id?: number | null;
}

export interface GeneProfileUpdateParams extends GeneProfileCreateParams {}

export interface GeneProfileOption {
  id: number;
  ring_number: string;
  name: string;
  gender: string;
  breed?: string;
  color?: string;
  eye_color?: string;
  achievement?: string;
  owner_name?: string;
  owner_id?: number | null;
  photo_url?: string;
}

// 血统树节点(递归)
export interface LineageNode {
  id: number;
  ring_number: string;
  name: string;
  gender: string;
  breed: string;
  bloodline: string;
  sire: LineageNode | null;
  dam: LineageNode | null;
}

// ==================== 基因档案审核 ====================
export interface GeneSubmission {
  id: number;
  ring_number: string;
  name: string;
  gender: string;
  breed: string;
  bloodline: string;
  owner_name: string;
  owner_phone: string | null;
  color: string | null;
  eye_color: string | null;
  birth_date: string | null;
  submitter_name: string | null;
  submitter_phone: string | null;
  status: string; // pending / approved / rejected
  audit_remark: string | null;
  auditor_id: number | null;
  audited_at: number | null;
  created_at: number;
}

export interface GeneSubmissionListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  keyword?: string;
}

// ==================== 接口 ====================

/**
 * 运行时把后端返回值归一为数组。
 * - 已数组 → 原样 return (同引用，不 clone)
 * - 对象且含 list/rows/data 数组属性之一 → return 该数组
 * - 其它(null/undefined/空对象/基本类型) → return fallback，并 console.warn('[gene] normalizeArray fallback:', typeof x, x)
 * 无第三方依赖，纯函数，O(1)
 */
function normalizeArray<T = unknown>(x: unknown, fallback: T[] = []): T[] {
  if (Array.isArray(x)) return x as T[];
  if (x && typeof x === 'object') {
    const o = x as Record<string, unknown>;
    for (const k of ['list', 'rows', 'data']) {
      if (Array.isArray(o[k])) return o[k] as T[];
    }
  }
  if (
    typeof x === 'undefined' ||
    x === null ||
    (typeof x === 'object' && Object.keys(x as object).length === 0)
  ) {
    return fallback;
  }
  console.warn('[gene] normalizeArray fallback:', typeof x, x);
  return fallback;
}

// 基因档案分页列表
export async function getGeneProfiles(
  params: GeneProfileListParams
): Promise<PageResult<GeneProfile>> {
  return await http.get<PageResult<GeneProfile>>('/gene/profiles', { params });
}

// 档案下拉选项(供父/母选择器)
export async function getGeneProfileOptions(): Promise<GeneProfileOption[]> {
  const raw = await http.get<GeneProfileOption[] | { list?: GeneProfileOption[]; total?: number }>('/gene/profiles/options');
  return normalizeArray<GeneProfileOption>(raw, []);
}

// 档案详情
export async function getGeneDetail(id: number): Promise<GeneProfileDetail> {
  return await http.get<GeneProfileDetail>(`/gene/profiles/${id}`);
}

// 新增档案
export async function createGeneProfile(
  data: GeneProfileCreateParams
): Promise<{ id: number }> {
  return await http.post('/gene/profiles', data);
}

// 编辑档案
export async function updateGeneProfile(
  id: number,
  data: GeneProfileUpdateParams
): Promise<void> {
  await http.put(`/gene/profiles/${id}`, data);
}

// 删除档案
export async function deleteGeneProfile(id: number): Promise<void> {
  await http.delete(`/gene/profiles/${id}`);
}

// 重新生成溯源二维码
export async function regenerateGeneQrcode(id: number): Promise<{ qr_code: string }> {
  return await http.post(`/gene/profiles/${id}/qrcode`);
}

// 某档案的检测记录列表
export async function getGeneTests(profileId: number): Promise<GeneTest[]> {
  return await http.get<GeneTest[]>(`/gene/profiles/${profileId}/tests`);
}

// 新增检测记录
export async function createGeneTest(data: Omit<GeneTest, 'id' | 'created_at'>): Promise<{ id: number }> {
  return await http.post('/gene/tests', data);
}

// 编辑检测记录
export async function updateGeneTest(id: number, data: Partial<Omit<GeneTest, 'id' | 'gene_profile_id' | 'created_at'>>): Promise<void> {
  await http.put(`/gene/tests/${id}`, data);
}

// 删除检测记录
export async function deleteGeneTest(id: number): Promise<void> {
  await http.delete(`/gene/tests/${id}`);
}

// 血统树
export async function getGeneLineage(id: number): Promise<LineageNode | null> {
  return await http.get<LineageNode | null>(`/gene/profiles/${id}/lineage`);
}

// 提交记录分页列表
export async function getGeneSubmissions(
  params: GeneSubmissionListParams
): Promise<PageResult<GeneSubmission>> {
  return await http.get<PageResult<GeneSubmission>>('/gene/submissions', { params });
}

// 提交记录详情
export async function getGeneSubmission(id: number): Promise<GeneSubmission> {
  return await http.get<GeneSubmission>(`/gene/submissions/${id}`);
}

// 审核通过
export async function approveGeneSubmission(id: number): Promise<{ profile_id: number }> {
  return await http.post(`/gene/submissions/${id}/approve`);
}

// 驳回
export async function rejectGeneSubmission(id: number, audit_remark: string): Promise<void> {
  await http.post(`/gene/submissions/${id}/reject`, { audit_remark });
}

// ==================== 新增档案辅助接口 ====================

export interface OwnerOption {
  id: number;
  name: string;
  phone: string;
}

export interface GeneDicts {
  colors: string[];
  eye_colors: string[];
  genders: { label: string; value: string }[];
  statuses: { label: string; value: number }[];
  breeds: string[];
  bloodlines: string[];
}

export async function checkRingNumber(ring_number: string): Promise<{ exists: boolean }> {
  return await http.get<{ exists: boolean }>('/gene/profiles/check-ring', { params: { ring_number } });
}

export async function searchOwners(keyword?: string): Promise<OwnerOption[]> {
  return await http.get<OwnerOption[]>('/gene/owners', { params: keyword ? { keyword } : {} });
}

export async function searchGeneProfiles(keyword?: string): Promise<GeneProfileOption[]> {
  return await http.get<GeneProfileOption[]>('/gene/profiles/search', { params: keyword ? { keyword } : {} });
}

export async function uploadImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return await http.post<{ url: string }>('/upload', formData);
}

export async function getGeneDicts(): Promise<GeneDicts> {
  return await http.get<GeneDicts>('/gene/dicts');
}
