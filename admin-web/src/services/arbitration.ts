import { http } from './request';
import type { PageResult } from './system';
import { getAuctionDeals } from './auction';

// ==================== 关联成交单简要(跨模块)====================
export interface AuctionDealBrief {
  id: number;
  session_id: number;
  item_id: number;
  nft_asset_id: number | null;
  seller: string;
  buyer: string | null;
  final_price: number;
  status: string;
  session_name: string | null;
  item_name: string | null;
}

// ==================== 仲裁案件 ====================
export interface ArbitrationCase {
  id: number;
  case_no: string; // 案件号
  type: string; // auction/trade/other
  type_label: string;
  related_deal_id: number | null;
  complainant: string; // 申诉人
  respondent: string; // 被诉人
  amount: number; // 争议金额
  description: string | null;
  status: string; // pending/accepted/hearing/ruled/archived
  status_label: string;
  acceptor_id: number | null;
  accepted_at: number | null;
  created_at: number;
  updated_at: number;
  // 列表/详情关联字段
  related_deal?: AuctionDealBrief | null;
  evidence_count?: number;
  has_award?: boolean;
}

export interface ArbitrationCaseListParams {
  page?: number;
  pageSize?: number;
  case_no?: string;
  status?: string;
  type?: string;
  keyword?: string;
}

export interface ArbitrationCaseCreateParams {
  type: string;
  related_deal_id?: number | null;
  complainant: string;
  respondent: string;
  amount: number;
  description?: string;
}

export interface ArbitrationCaseUpdateParams {
  type?: string;
  related_deal_id?: number | null;
  complainant?: string;
  respondent?: string;
  amount?: number;
  description?: string;
}

// ==================== 证据材料 ====================
export interface ArbitrationEvidence {
  id: number;
  case_id: number;
  party: string; // complainant/respondent
  party_label: string;
  title: string;
  file_url: string;
  file_type: string; // image/document/video
  file_type_label: string;
  description: string | null;
  created_at: number;
}

export interface ArbitrationEvidenceCreateParams {
  party: string;
  title: string;
  file_url: string;
  file_type: string;
  description?: string;
}

// ==================== 仲裁裁决 ====================
export interface ArbitrationAward {
  id: number;
  case_id: number;
  arbitrator_id: number | null;
  ruling: string;
  action: string; // refund/force_deliver/other
  action_label: string;
  execute_status: string; // pending/executing/executed
  execute_status_label: string;
  award_time: number | null;
  created_at: number;
}

export interface ArbitrationAwardCreateParams {
  ruling: string;
  action: string;
}

// ==================== 案件详情(含证据 + 裁决 + 关联成交单)====================
export interface ArbitrationCaseDetail extends ArbitrationCase {
  evidences: ArbitrationEvidence[];
  award: ArbitrationAward | null;
}

// ==================== 案件接口 ====================

// 案件分页列表
export async function getArbitrationCases(
  params: ArbitrationCaseListParams
): Promise<PageResult<ArbitrationCase>> {
  return await http.get<PageResult<ArbitrationCase>>('/arbitration/cases', { params });
}

// 案件详情(含证据 + 裁决 + 关联成交单)
export async function getArbitrationCaseDetail(id: number): Promise<ArbitrationCaseDetail> {
  return await http.get<ArbitrationCaseDetail>(`/arbitration/cases/${id}`);
}

// 新增案件(手动登记,默认待受理)
export async function createArbitrationCase(
  data: ArbitrationCaseCreateParams
): Promise<{ id: number; case_no: string }> {
  return await http.post('/arbitration/cases', data);
}

// 编辑案件(仅待受理状态)
export async function updateArbitrationCase(
  id: number,
  data: ArbitrationCaseUpdateParams
): Promise<void> {
  await http.put(`/arbitration/cases/${id}`, data);
}

// 受理立案(待受理 → 已立案)
export async function acceptArbitrationCase(id: number): Promise<void> {
  await http.post(`/arbitration/cases/${id}/accept`);
}

// 开始审理(已立案 → 审理中)
export async function startHearingArbitrationCase(id: number): Promise<void> {
  await http.post(`/arbitration/cases/${id}/start-hearing`);
}

// 归档(已裁决 → 已归档)
export async function archiveArbitrationCase(id: number): Promise<void> {
  await http.post(`/arbitration/cases/${id}/archive`);
}

// 删除案件(仅待受理)
export async function deleteArbitrationCase(id: number): Promise<void> {
  await http.delete(`/arbitration/cases/${id}`);
}

// ==================== 证据接口 ====================

// 证据列表(按案件)
export async function getArbitrationEvidences(caseId: number): Promise<ArbitrationEvidence[]> {
  return await http.get<ArbitrationEvidence[]>(`/arbitration/cases/${caseId}/evidence`);
}

// 新增证据
export async function createArbitrationEvidence(
  caseId: number,
  data: ArbitrationEvidenceCreateParams
): Promise<{ id: number }> {
  return await http.post(`/arbitration/cases/${caseId}/evidence`, data);
}

// 删除证据
export async function deleteArbitrationEvidence(id: number): Promise<void> {
  await http.delete(`/arbitration/evidence/${id}`);
}

// ==================== 裁决接口 ====================

// 查询裁决详情
export async function getArbitrationAward(caseId: number): Promise<ArbitrationAward> {
  return await http.get<ArbitrationAward>(`/arbitration/cases/${caseId}/award`);
}

// 作出裁决(创建 award,更新 case 状态为已裁决)
export async function createArbitrationAward(
  caseId: number,
  data: ArbitrationAwardCreateParams
): Promise<void> {
  await http.post(`/arbitration/cases/${caseId}/award`, data);
}

// 执行裁决(推进 execute_status:pending→executing→executed)
export async function executeArbitrationAward(awardId: number): Promise<void> {
  await http.post(`/arbitration/awards/${awardId}/execute`);
}

// ==================== 跨模块:查询拍卖成交单选项(供案件关联选择)====================
// 复用拍卖模块接口拉取最近成交单
export interface DealOption {
  id: number;
  label: string;
  buyer: string | null;
  seller: string;
  final_price: number;
  status: string;
}

// 拉取成交单选项(供案件关联)
export async function getDealOptions(): Promise<DealOption[]> {
  try {
    const res = await getAuctionDeals({ page: 1, pageSize: 100 });
    return res?.list?.map((d) => ({
      id: d.id,
      label: `#${d.id} ${d.session_name ?? ''} - ${d.item_name ?? '拍品'}(¥${d.final_price})`,
      buyer: d.buyer,
      seller: d.seller,
      final_price: d.final_price,
      status: d.status,
    }));
  } catch {
    return [];
  }
}
