import { http } from './request';
import type { PageResult } from './system';

// ==================== 公棚入驻申请(SubTask 6.1) ====================

// 申请状态:pending 待审 / approved 通过 / rejected 驳回
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface LoftApplicationItem {
  id: number;
  loft_name: string;
  applicant_name: string;
  phone: string;
  id_card: string | null;
  qualification: string | null;
  site_proof: string | null;
  capacity: number | null;
  address: string | null;
  status: ApplicationStatus;
  audit_remark: string | null;
  auditor_id: number | null;
  audited_at: number | null;
  created_at: number;
}

export interface ApplicationListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  keyword?: string;
}

export interface ApplicationCreateParams {
  loft_name: string;
  applicant_name: string;
  phone: string;
  id_card?: string;
  qualification?: string;
  site_proof?: string;
  capacity?: number;
  address?: string;
}

// 申请分页列表
export async function getApplicationList(
  params: ApplicationListParams
): Promise<PageResult<LoftApplicationItem>> {
  const data = await http.get<PageResult<LoftApplicationItem>>('/loft/applications', { params });
  return data;
}

// 申请详情
export async function getApplicationDetail(id: number): Promise<LoftApplicationItem> {
  const data = await http.get<LoftApplicationItem>(`/loft/applications/${id}`);
  return data;
}

// 新增申请
export async function createApplication(data: ApplicationCreateParams): Promise<{ id: number }> {
  return await http.post('/loft/applications', data);
}

// 审核通过
export async function approveApplication(id: number, audit_remark?: string): Promise<{ code: string }> {
  return await http.post(`/loft/applications/${id}/approve`, { audit_remark });
}

// 驳回
export async function rejectApplication(id: number, audit_remark: string): Promise<void> {
  await http.post(`/loft/applications/${id}/reject`, { audit_remark });
}

// ==================== 公棚信息管理(SubTask 6.2) ====================

// 公棚状态:1 营业中 / 0 停业
export interface LoftItem {
  id: number;
  name: string;
  code: string;
  applicant_name: string | null;
  phone: string | null;
  address: string | null;
  capacity: number | null;
  location: string | null;
  status: number;
  created_at: number;
  updated_at: number;
  pigeon_total: number;
  pigeon_in: number;
}

export interface LoftListParams {
  page?: number;
  pageSize?: number;
  name?: string;
  status?: number | string;
}

export interface LoftUpdateParams {
  name?: string;
  applicant_name?: string;
  phone?: string;
  address?: string;
  capacity?: number;
  location?: string;
}

// 公棚分页列表
export async function getLoftList(params: LoftListParams): Promise<PageResult<LoftItem>> {
  const data = await http.get<PageResult<LoftItem>>('/loft/lofts', { params });
  return data;
}

// 公棚详情
export async function getLoftDetail(id: number): Promise<LoftItem> {
  const data = await http.get<LoftItem>(`/loft/lofts/${id}`);
  return data;
}

// 编辑公棚
export async function updateLoft(id: number, data: LoftUpdateParams): Promise<void> {
  await http.put(`/loft/lofts/${id}`, data);
}

// 状态切换(1 营业中 / 0 停业)
export async function updateLoftStatus(id: number, status: number): Promise<void> {
  await http.patch(`/loft/lofts/${id}/status`, { status });
}

// ==================== 存棚鸽只管理(SubTask 6.3) ====================

// 鸽只状态:in 在棚 / out 已出棚
export type PigeonStatus = 'in' | 'out';

export interface LoftPigeonItem {
  id: number;
  loft_id: number;
  ring_number: string;
  gene_profile_id: number | null;
  in_time: number | null;
  out_time: number | null;
  status: PigeonStatus;
  remark: string | null;
  created_at: number;
  // 跨模块关联字段(后端附带)
  gene_ring_number: string | null;
  gene_profile_exists: boolean;
}

export interface PigeonListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  ring_number?: string;
}

export interface PigeonCreateParams {
  ring_number: string;
  in_time?: number;
  remark?: string;
}

// 存棚鸽分页列表(按 loft_id)
export async function getPigeonList(
  loftId: number,
  params: PigeonListParams
): Promise<PageResult<LoftPigeonItem>> {
  const data = await http.get<PageResult<LoftPigeonItem>>(`/loft/lofts/${loftId}/pigeons`, {
    params,
  });
  return data;
}

// 入棚登记
export async function createPigeon(
  loftId: number,
  data: PigeonCreateParams
): Promise<{ id: number; gene_profile_id: number | null; gene_profile_exists: boolean }> {
  return await http.post(`/loft/lofts/${loftId}/pigeons`, data);
}

// 出棚登记
export async function outPigeon(loftId: number, id: number, out_time?: number): Promise<void> {
  await http.post(`/loft/lofts/${loftId}/pigeons/${id}/out`, { out_time });
}

// 删除存棚鸽只
export async function deletePigeon(loftId: number, id: number): Promise<void> {
  await http.delete(`/loft/lofts/${loftId}/pigeons/${id}`);
}
