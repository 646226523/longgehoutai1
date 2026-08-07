import { http } from './request';
import type { PageResult } from './system';

// ==================== NFT 资产 ====================
export interface NftAsset {
  id: number;
  token_id: string | null; // 链上 token 标识
  gene_profile_id: number | null; // 关联基因档案 ID
  name: string; // 资产名称
  description: string | null; // 资产描述
  image_url: string | null; // 资产图片
  metadata: string | null; // JSON 元数据(TEXT)
  owner_name: string; // 持有者(鸽主)
  status: string; // draft/pending/approved/minting/minted/failed
  status_label: string; // 状态中文标签
  contract_address: string | null; // 合约地址
  tx_hash: string | null; // 铸造交易哈希
  minted_at: number | null; // 上链时间
  created_at: number;
  updated_at: number;
  // 列表/详情关联的基因档案简要
  gene_profile: GeneBrief | null;
}

// 关联基因档案简要信息(跨模块)
export interface GeneBrief {
  id: number;
  ring_number: string;
  name: string;
  owner_name: string;
}

// 上链任务
export interface NftMintTask {
  id: number;
  nft_asset_id: number;
  status: string; // pending/processing/success/failed
  retry_count: number;
  error_msg: string | null;
  tx_hash: string | null;
  contract_address: string | null;
  started_at: number | null;
  finished_at: number | null;
  created_at: number;
  // 任务列表关联字段
  asset_name?: string | null;
  token_id?: string | null;
  owner_name?: string | null;
  asset_status?: string | null;
}

// 流转记录
export interface NftTransfer {
  id: number;
  nft_asset_id: number;
  from_owner: string | null; // 转出方
  to_owner: string; // 转入方
  transfer_type: string; // transfer/auction/gift
  price: number | null; // 成交价
  tx_hash: string | null; // 流转交易哈希
  status: string; // pending/success/failed
  created_at: number;
}

// 链上状态信息
export interface NftChainStatus {
  token_id: string | null;
  contract_address: string | null;
  tx_hash: string | null;
  minted_at: number | null;
  status: string;
  status_label: string;
}

// 资产详情(含流转记录 + 上链任务 + 链上状态 + 关联基因档案)
export interface NftAssetDetail extends NftAsset {
  transfers: NftTransfer[];
  mint_task: NftMintTask | null;
  chain_status: NftChainStatus;
}

// ==================== 查询参数 ====================
export interface NftAssetListParams {
  page?: number;
  pageSize?: number;
  name?: string;
  status?: string;
  owner_name?: string;
}

export interface NftTaskListParams {
  page?: number;
  pageSize?: number;
  nft_asset_id?: number;
  status?: string;
}

// ==================== 创建/更新参数 ====================
export interface NftAssetCreateParams {
  gene_profile_id?: number | null;
  name: string;
  description?: string;
  image_url?: string;
  metadata?: Record<string, unknown> | string | null;
  owner_name?: string;
}

export interface NftAssetUpdateParams extends Partial<NftAssetCreateParams> {}

export interface NftTransferCreateParams {
  from_owner?: string | null;
  to_owner: string;
  transfer_type?: string;
  price?: number | null;
  tx_hash?: string | null;
  status?: string;
}

// ==================== 接口 ====================

// 资产分页列表
export async function getNftAssets(params: NftAssetListParams): Promise<PageResult<NftAsset>> {
  return await http.get<PageResult<NftAsset>>('/nft/assets', { params });
}

// 资产详情
export async function getNftAssetDetail(id: number): Promise<NftAssetDetail> {
  return await http.get<NftAssetDetail>(`/nft/assets/${id}`);
}

// 新增铸造申请(状态草稿)
export async function createNftAsset(data: NftAssetCreateParams): Promise<{ id: number }> {
  return await http.post('/nft/assets', data);
}

// 编辑资产
export async function updateNftAsset(id: number, data: NftAssetUpdateParams): Promise<void> {
  await http.put(`/nft/assets/${id}`, data);
}

// 提交审核(草稿/上链失败 → 待审核)
export async function submitNftAssetAudit(id: number): Promise<void> {
  await http.post(`/nft/assets/${id}/submit`);
}

// 删除资产
export async function deleteNftAsset(id: number): Promise<void> {
  await http.delete(`/nft/assets/${id}`);
}

// 资产流转记录列表
export async function getNftTransfers(assetId: number): Promise<NftTransfer[]> {
  return await http.get<NftTransfer[]>(`/nft/assets/${assetId}/transfers`);
}

// 新增流转记录
export async function createNftTransfer(
  assetId: number,
  data: NftTransferCreateParams
): Promise<{ id: number }> {
  return await http.post(`/nft/assets/${assetId}/transfers`, data);
}

// 链上状态查询
export async function getNftChainStatus(assetId: number): Promise<NftChainStatus> {
  return await http.get<NftChainStatus>(`/nft/assets/${assetId}/chain-status`);
}

// ==================== 上链审核 ====================

// 待审核列表
export async function getNftAuditList(params: NftAssetListParams): Promise<PageResult<NftAsset>> {
  return await http.get<PageResult<NftAsset>>('/nft/audit/list', { params });
}

// 审核通过(进入上链队列)
export async function approveNftAudit(id: number): Promise<{ task_id: number }> {
  return await http.post(`/nft/audit/${id}/approve`);
}

// 审核驳回
export async function rejectNftAudit(id: number, audit_remark: string): Promise<void> {
  await http.post(`/nft/audit/${id}/reject`, { audit_remark });
}

// ==================== 上链任务 ====================

// 上链任务列表
export async function getNftTasks(params: NftTaskListParams): Promise<PageResult<NftMintTask>> {
  return await http.get<PageResult<NftMintTask>>('/nft/tasks', { params });
}

// 查询单个上链任务状态
export async function getNftTaskDetail(id: number): Promise<NftMintTask> {
  return await http.get<NftMintTask>(`/nft/tasks/${id}`);
}

// 重试失败任务
export async function retryNftTask(id: number): Promise<void> {
  await http.post(`/nft/tasks/${id}/retry`);
}
