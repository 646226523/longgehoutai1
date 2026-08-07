import { http } from './request';
import type { PageResult } from './system';

// ==================== 检测机构 ====================
export interface DetectionOrg {
  id: number;
  name: string;
  code: string;
  contact: string | null;
  phone: string | null;
  address: string | null;
  qualification: string | null;
  projects: string;
  status: number;
  created_at: number;
  updated_at: number;
}

export interface DetectionOrgOption {
  id: number;
  name: string;
  code: string;
  projects: string;
}

export interface DetectionOrgListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: number | string;
}

export interface DetectionOrgCreateParams {
  name: string;
  code?: string;
  contact?: string;
  phone?: string;
  address?: string;
  qualification?: string;
  projects?: string;
  status?: number;
}

export interface DetectionOrgUpdateParams extends DetectionOrgCreateParams {}

// ==================== 检测预约订单 ====================
export type DetectionOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'scheduled'
  | 'completed'
  | 'cancelled';

export interface GeneProfileBrief {
  id: number;
  ring_number: string;
  name: string;
  owner_name: string;
}

export interface DetectionOrder {
  id: number;
  order_no: string;
  user_name: string;
  phone: string | null;
  gene_profile_id: number | null;
  ring_number: string;
  test_org: string;
  org_id: number | null;
  project: string;
  scheduled_date: string | null;
  status: DetectionOrderStatus;
  remark: string | null;
  created_at: number;
  updated_at: number;
}

export interface DetectionOrderDetail extends DetectionOrder {
  gene_profile: GeneProfileBrief | null;
  reports: DetectionReport[];
}

export interface DetectionOrderListParams {
  page?: number;
  pageSize?: number;
  order_no?: string;
  status?: string;
  user_name?: string;
  ring_number?: string;
  startDate?: string;
  endDate?: string;
}

export interface DetectionOrderCreateParams {
  user_name: string;
  phone?: string;
  gene_profile_id?: number | null;
  ring_number?: string;
  test_org?: string;
  org_id?: number | null;
  project?: string;
  scheduled_date?: string | null;
  status?: string;
  remark?: string;
}

export interface DetectionOrderUpdateParams
  extends Omit<DetectionOrderCreateParams, 'status'> {}

// 订单下拉选项(供报告关联选择)
export interface DetectionOrderOption {
  id: number;
  order_no: string;
  user_name: string;
  phone: string | null;
  ring_number: string;
  project: string;
  status: DetectionOrderStatus;
}

// ==================== 检测排期日历 ====================
export interface CalendarDayCount {
  date: string;
  count: number;
}

// ==================== 检测报告 ====================
export interface DetectionReport {
  id: number;
  order_id: number | null;
  gene_profile_id: number | null;
  report_no: string;
  test_org: string;
  project: string;
  result: string | null;
  report_url: string | null;
  test_date: string | null;
  created_at: number;
  // 列表/详情附加:关联鸽只简要
  gene_profile?: GeneProfileBrief | null;
}

export interface DetectionReportListParams {
  page?: number;
  pageSize?: number;
  order_id?: number | string;
  gene_profile_id?: number | string;
  report_no?: string;
  keyword?: string;
}

export interface DetectionReportCreateParams {
  order_id?: number | null;
  gene_profile_id?: number | null;
  report_no: string;
  test_org: string;
  project: string;
  result?: string;
  report_url?: string;
  test_date?: string;
}

export interface DetectionReportUpdateParams extends DetectionReportCreateParams {}

// ==================== 字典 ====================
export interface DetectionItemType {
  code: string;
  name: string;
}

// ==================== 机构接口 ====================
export async function getDetectionOrgs(
  params: DetectionOrgListParams
): Promise<PageResult<DetectionOrg>> {
  return await http.get<PageResult<DetectionOrg>>('/detection/orgs', { params });
}

export async function getDetectionOrgOptions(): Promise<DetectionOrgOption[]> {
  return await http.get<DetectionOrgOption[]>('/detection/orgs/options');
}

export async function getDetectionOrg(id: number): Promise<DetectionOrg> {
  return await http.get<DetectionOrg>(`/detection/orgs/${id}`);
}

export async function createDetectionOrg(
  data: DetectionOrgCreateParams
): Promise<{ id: number }> {
  return await http.post('/detection/orgs', data);
}

export async function updateDetectionOrg(
  id: number,
  data: DetectionOrgUpdateParams
): Promise<void> {
  await http.put(`/detection/orgs/${id}`, data);
}

export async function toggleDetectionOrgStatus(
  id: number
): Promise<{ status: number }> {
  return await http.patch(`/detection/orgs/${id}/status`);
}

// ==================== 订单接口 ====================
export async function getDetectionOrders(
  params: DetectionOrderListParams
): Promise<PageResult<DetectionOrder>> {
  return await http.get<PageResult<DetectionOrder>>('/detection/orders', { params });
}

export async function getDetectionOrder(id: number): Promise<DetectionOrderDetail> {
  return await http.get<DetectionOrderDetail>(`/detection/orders/${id}`);
}

// 订单下拉选项(支持关键字远程搜索)
export async function getDetectionOrderOptions(
  keyword?: string
): Promise<DetectionOrderOption[]> {
  return await http.get<DetectionOrderOption[]>('/detection/orders/options', {
    params: keyword ? { keyword } : {},
  });
}

export async function createDetectionOrder(
  data: DetectionOrderCreateParams
): Promise<{ id: number; order_no: string }> {
  return await http.post('/detection/orders', data);
}

export async function updateDetectionOrder(
  id: number,
  data: DetectionOrderUpdateParams
): Promise<void> {
  await http.put(`/detection/orders/${id}`, data);
}

export async function confirmDetectionOrder(id: number): Promise<void> {
  await http.post(`/detection/orders/${id}/confirm`);
}

export async function scheduleDetectionOrder(
  id: number,
  scheduled_date: string
): Promise<void> {
  await http.post(`/detection/orders/${id}/schedule`, { scheduled_date });
}

export async function cancelDetectionOrder(id: number): Promise<void> {
  await http.post(`/detection/orders/${id}/cancel`);
}

export async function deleteDetectionOrder(id: number): Promise<void> {
  await http.delete(`/detection/orders/${id}`);
}

// ==================== 排期日历接口 ====================
export async function getDetectionCalendar(
  start: string,
  end: string
): Promise<CalendarDayCount[]> {
  return await http.get<CalendarDayCount[]>('/detection/calendar', {
    params: { start, end },
  });
}

export async function getDetectionCalendarByDate(date: string): Promise<DetectionOrder[]> {
  return await http.get<DetectionOrder[]>(`/detection/calendar/${date}`);
}

// ==================== 报告接口 ====================
export async function getDetectionReports(
  params: DetectionReportListParams
): Promise<PageResult<DetectionReport>> {
  return await http.get<PageResult<DetectionReport>>('/detection/reports', { params });
}

export async function getDetectionReport(id: number): Promise<DetectionReport> {
  return await http.get<DetectionReport>(`/detection/reports/${id}`);
}

export async function createDetectionReport(
  data: DetectionReportCreateParams
): Promise<{ id: number }> {
  return await http.post('/detection/reports', data);
}

export async function updateDetectionReport(
  id: number,
  data: DetectionReportUpdateParams
): Promise<void> {
  await http.put(`/detection/reports/${id}`, data);
}

export async function deleteDetectionReport(id: number): Promise<void> {
  await http.delete(`/detection/reports/${id}`);
}

// ==================== 字典接口 ====================
export async function getDetectionItemTypes(): Promise<DetectionItemType[]> {
  return await http.get<DetectionItemType[]>('/detection/dict/item-types');
}
