import { http } from './request';
import type { PageResult } from './system';

// ==================== 拍卖场次 ====================
export interface AuctionSession {
  id: number;
  name: string; // 场次名称
  status: string; // draft/pending/ongoing/ended/cancelled
  status_label: string; // 状态中文
  start_time: number | null; // 开始时间
  end_time: number | null; // 结束时间
  location: string | null; // 拍卖地点
  description: string | null; // 场次描述
  created_at: number;
  updated_at: number;
  item_count?: number;
  deal_count?: number;
  session_code?: string | null;
  auction_type?: string | null;
  deposit?: number | null;
  default_start_price?: number | null;
  default_bid_step?: number | null;
  allow_entrusted_bid?: number | null;
  allow_auto_bid?: number | null;
  publish_time?: number | null;
}

export interface AuctionSessionListParams {
  page?: number;
  pageSize?: number;
  name?: string;
  status?: string;
}

export interface AuctionSessionCreateParams {
  name: string;
  status?: string;
  start_time?: number | null;
  end_time?: number | null;
  location?: string;
  description?: string;
  auction_type?: string;
  deposit?: number | null;
  default_start_price?: number | null;
  default_bid_step?: number | null;
  allow_entrusted_bid?: boolean | null;
  allow_auto_bid?: boolean | null;
  publish_time?: number | null;
}

export interface AuctionSessionUpdateParams {
  name?: string;
  start_time?: number | null;
  end_time?: number | null;
  location?: string;
  description?: string;
  auction_type?: string;
  deposit?: number | null;
  default_start_price?: number | null;
  default_bid_step?: number | null;
  allow_entrusted_bid?: boolean | null;
  allow_auto_bid?: boolean | null;
  publish_time?: number | null;
}

// ==================== 拍品(关联 NFT 资产)====================
export interface NftAssetBrief {
  id: number;
  token_id: string | null;
  name: string;
  owner_name: string;
  status: string;
  contract_address: string | null;
  tx_hash: string | null;
}

export interface AuctionItem {
  id: number;
  session_id: number;
  nft_asset_id: number | null;
  name: string;
  description: string | null;
  start_price: number;
  increment: number;
  current_price: number;
  current_bidder: string | null;
  status: string; // pending/bidding/dealt/passed
  status_label: string;
  sort_order: number;
  created_at: number;
  nft_asset: NftAssetBrief | null; // 关联 NFT 资产简要
  bid_count?: number; // 出价数
}

export interface AuctionBid {
  id: number;
  item_id: number;
  bidder: string;
  bid_amount: number;
  created_at: number;
}

export interface AuctionItemDetail extends AuctionItem {
  bids: AuctionBid[]; // 竞价历史
}

export interface AuctionItemListParams {
  page?: number;
  pageSize?: number;
  session_id?: number;
  status?: string;
  name?: string;
}

export interface AuctionItemCreateParams {
  session_id: number;
  nft_asset_id?: number | null;
  name: string;
  description?: string;
  start_price: number;
  increment: number;
  sort_order?: number;
}

export interface AuctionItemUpdateParams {
  nft_asset_id?: number | null;
  name?: string;
  description?: string;
  start_price?: number;
  increment?: number;
  sort_order?: number;
}

export interface AuctionBidCreateParams {
  bidder: string;
  bid_amount: number;
}

// ==================== 成交单 ====================
export interface AuctionDeal {
  id: number;
  session_id: number;
  item_id: number;
  nft_asset_id: number | null;
  seller: string;
  buyer: string | null;
  final_price: number;
  status: string; // pending_payment/paid/delivering/completed/cancelled
  status_label: string;
  deal_time: number | null;
  paid_time: number | null;
  delivered_at: number | null;
  created_at: number;
  // 列表/详情关联字段
  session_name?: string | null;
  item_name?: string | null;
  nft_asset?: NftAssetBrief | null;
}

export interface AuctionDealListParams {
  page?: number;
  pageSize?: number;
  session_id?: number;
  status?: string;
  keyword?: string;
}

// ==================== 场次接口 ====================

// 场次分页列表
export async function getAuctionSessions(
  params: AuctionSessionListParams
): Promise<PageResult<AuctionSession>> {
  return await http.get<PageResult<AuctionSession>>('/auction/sessions', { params });
}

// 场次详情
export async function getAuctionSessionDetail(id: number): Promise<AuctionSession> {
  return await http.get<AuctionSession>(`/auction/sessions/${id}`);
}

// 新增场次
export async function createAuctionSession(
  data: AuctionSessionCreateParams
): Promise<{ id: number }> {
  return await http.post('/auction/sessions', data);
}

// 编辑场次
export async function updateAuctionSession(
  id: number,
  data: AuctionSessionUpdateParams
): Promise<void> {
  await http.put(`/auction/sessions/${id}`, data);
}

// 场次状态流转(draft→pending→ongoing→ended,任意非已结束状态可 cancel)
export async function transitionAuctionSession(id: number, status: string): Promise<void> {
  await http.post(`/auction/sessions/${id}/transition`, { status });
}

// 删除场次(仅草稿/已取消)
export async function deleteAuctionSession(id: number): Promise<void> {
  await http.delete(`/auction/sessions/${id}`);
}

// ==================== 拍品接口 ====================

// 拍品分页列表(按场次)
export async function getAuctionItems(
  params: AuctionItemListParams
): Promise<PageResult<AuctionItem>> {
  return await http.get<PageResult<AuctionItem>>('/auction/items', { params });
}

// 拍品详情(含竞价历史 + NFT 资产简要)
export async function getAuctionItemDetail(id: number): Promise<AuctionItemDetail> {
  return await http.get<AuctionItemDetail>(`/auction/items/${id}`);
}

// 可选 NFT 资产列表(上架拍品时选择)
export async function getAvailableNftAssets(
  session_id: number,
  keyword?: string
): Promise<NftAssetBrief[]> {
  return await http.get<NftAssetBrief[]>('/auction/items/available-assets', {
    params: { session_id, keyword },
  });
}

// 上架拍品
export async function createAuctionItem(data: AuctionItemCreateParams): Promise<{ id: number }> {
  return await http.post('/auction/items', data);
}

// 编辑拍品
export async function updateAuctionItem(
  id: number,
  data: AuctionItemUpdateParams
): Promise<void> {
  await http.put(`/auction/items/${id}`, data);
}

// 开拍(待上架 → 拍卖中)
export async function startAuctionItem(id: number): Promise<void> {
  await http.post(`/auction/items/${id}/start`);
}

// 流拍(待上架/拍卖中 → 流拍)
export async function passAuctionItem(id: number): Promise<void> {
  await http.post(`/auction/items/${id}/pass`);
}

// 删除拍品(仅待上架/流拍)
export async function deleteAuctionItem(id: number): Promise<void> {
  await http.delete(`/auction/items/${id}`);
}

// 竞价记录列表
export async function getAuctionBids(itemId: number): Promise<AuctionBid[]> {
  return await http.get<AuctionBid[]>(`/auction/items/${itemId}/bids`);
}

// 手动录入出价
export async function createAuctionBid(
  itemId: number,
  data: AuctionBidCreateParams
): Promise<void> {
  await http.post(`/auction/items/${itemId}/bids`, data);
}

// ==================== 成交单接口 ====================

// 成交列表
export async function getAuctionDeals(
  params: AuctionDealListParams
): Promise<PageResult<AuctionDeal>> {
  return await http.get<PageResult<AuctionDeal>>('/auction/deals', { params });
}

// 成交详情
export async function getAuctionDealDetail(id: number): Promise<AuctionDeal> {
  return await http.get<AuctionDeal>(`/auction/deals/${id}`);
}

// 确认付款
export async function confirmDealPayment(id: number): Promise<void> {
  await http.post(`/auction/deals/${id}/confirm-payment`);
}

// 确认交割
export async function confirmDealDelivery(id: number): Promise<void> {
  await http.post(`/auction/deals/${id}/confirm-delivery`);
}

// 取消成交
export async function cancelAuctionDeal(id: number): Promise<void> {
  await http.post(`/auction/deals/${id}/cancel`);
}
