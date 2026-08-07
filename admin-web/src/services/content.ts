import { http } from './request';

// ==================== 通用分页结果 ====================
export interface PageResult<T> {
  list: T[];
  total: number;
}

// ==================== Banner 管理 ====================
export interface BannerItem {
  id: number;
  title: string;
  image_url: string;
  link_url: string;
  position: string;
  sort_order: number;
  status: number; // 1 上架 0 下架
  start_time: number | null;
  end_time: number | null;
  created_at: number;
  updated_at: number;
}

export interface BannerListParams {
  page?: number;
  pageSize?: number;
  title?: string;
  status?: number | string;
  position?: string;
}

export interface BannerSaveParams {
  title: string;
  image_url: string;
  link_url?: string;
  position?: string;
  sort_order?: number;
  status?: number;
  start_time?: number | null;
  end_time?: number | null;
}

// Banner 分页列表
export async function getBannerList(params: BannerListParams): Promise<PageResult<BannerItem>> {
  const data = await http.get<PageResult<BannerItem>>('/content/banners', { params });
  return data;
}

// Banner 详情
export async function getBannerDetail(id: number): Promise<BannerItem> {
  const data = await http.get<BannerItem>(`/content/banners/${id}`);
  return data;
}

// 新增 Banner
export async function createBanner(data: BannerSaveParams): Promise<{ id: number }> {
  return await http.post('/content/banners', data);
}

// 编辑 Banner
export async function updateBanner(id: number, data: BannerSaveParams): Promise<void> {
  await http.put(`/content/banners/${id}`, data);
}

// 上架/下架
export async function updateBannerStatus(id: number, status: number): Promise<void> {
  await http.patch(`/content/banners/${id}/status`, { status });
}

// 调整排序
export async function updateBannerSort(id: number, sort_order: number): Promise<void> {
  await http.patch(`/content/banners/${id}/sort`, { sort_order });
}

// 删除 Banner
export async function deleteBanner(id: number): Promise<void> {
  await http.delete(`/content/banners/${id}`);
}

// ==================== 资讯管理 ====================
export interface NewsItem {
  id: number;
  title: string;
  category: string;
  cover_url: string;
  summary: string;
  author: string;
  status: 'draft' | 'published' | 'offline';
  is_top: number; // 1 置顶 0 否
  published_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface NewsDetail extends NewsItem {
  content: string; // 富文本 HTML
}

export interface NewsListParams {
  page?: number;
  pageSize?: number;
  title?: string;
  category?: string;
  status?: string;
}

export interface NewsSaveParams {
  title: string;
  category?: string;
  cover_url?: string;
  summary?: string;
  content?: string;
  author?: string;
  status?: 'draft' | 'published' | 'offline';
  is_top?: number;
}

// 资讯分页列表
export async function getNewsList(params: NewsListParams): Promise<PageResult<NewsItem>> {
  const data = await http.get<PageResult<NewsItem>>('/content/news', { params });
  return data;
}

// 资讯详情
export async function getNewsDetail(id: number): Promise<NewsDetail> {
  const data = await http.get<NewsDetail>(`/content/news/${id}`);
  return data;
}

// 新增资讯
export async function createNews(data: NewsSaveParams): Promise<{ id: number }> {
  return await http.post('/content/news', data);
}

// 编辑资讯
export async function updateNews(id: number, data: NewsSaveParams): Promise<void> {
  await http.put(`/content/news/${id}`, data);
}

// 发布资讯
export async function publishNews(id: number): Promise<void> {
  await http.post(`/content/news/${id}/publish`);
}

// 下架资讯
export async function offlineNews(id: number): Promise<void> {
  await http.patch(`/content/news/${id}/offline`);
}

// 置顶/取消置顶
export async function toggleNewsTop(id: number, is_top: number): Promise<void> {
  await http.patch(`/content/news/${id}/top`, { is_top });
}

// 删除资讯
export async function deleteNews(id: number): Promise<void> {
  await http.delete(`/content/news/${id}`);
}

// ==================== 公告与推送管理 ====================
export interface NoticeItem {
  id: number;
  title: string;
  content: string;
  type: 'system' | 'activity' | 'maintenance';
  status: 'draft' | 'published';
  push_target: string; // all / level
  published_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface NoticeListParams {
  page?: number;
  pageSize?: number;
  title?: string;
  type?: string;
  status?: string;
}

export interface NoticeSaveParams {
  title: string;
  content: string;
  type?: 'system' | 'activity' | 'maintenance';
  status?: 'draft' | 'published';
  push_target?: string;
}

// 公告分页列表
export async function getNoticeList(params: NoticeListParams): Promise<PageResult<NoticeItem>> {
  const data = await http.get<PageResult<NoticeItem>>('/content/notices', { params });
  return data;
}

// 公告详情
export async function getNoticeDetail(id: number): Promise<NoticeItem> {
  const data = await http.get<NoticeItem>(`/content/notices/${id}`);
  return data;
}

// 新增公告
export async function createNotice(data: NoticeSaveParams): Promise<{ id: number }> {
  return await http.post('/content/notices', data);
}

// 编辑公告
export async function updateNotice(id: number, data: NoticeSaveParams): Promise<void> {
  await http.put(`/content/notices/${id}`, data);
}

// 发布公告
export async function publishNotice(id: number): Promise<void> {
  await http.post(`/content/notices/${id}/publish`);
}

// 删除公告
export async function deleteNotice(id: number): Promise<void> {
  await http.delete(`/content/notices/${id}`);
}
