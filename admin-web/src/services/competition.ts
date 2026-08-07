import { http } from './request';

// ==================== 通用分页结果 ====================
export interface PageResult<T> {
  list: T[];
  total: number;
}

// ==================== 赛事状态枚举 ====================
// 草稿 / 报名中 / 集鸽中 / 比赛中 / 已结束 / 已归档
export const COMPETITION_STATUS = {
  DRAFT: 'draft',
  ENROLLING: 'enrolling',
  GATHERING: 'gathering',
  RACING: 'racing',
  FINISHED: 'finished',
  ARCHIVED: 'archived',
} as const;

// 状态流转图:当前状态 → 下一个状态
export const STATUS_FLOW: Record<string, string> = {
  draft: 'enrolling',
  enrolling: 'gathering',
  gathering: 'racing',
  racing: 'finished',
  finished: 'archived',
};

// 赛事状态中文标签
export const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  enrolling: '报名中',
  gathering: '集鸽中',
  racing: '比赛中',
  finished: '已结束',
  archived: '已归档',
};

// 状态对应的标签颜色
export const STATUS_COLORS: Record<string, string> = {
  draft: 'default',
  enrolling: 'blue',
  gathering: 'gold',
  racing: 'orange',
  finished: 'green',
  archived: 'default',
};

// 参赛鸽核验状态
export const VERIFY_STATUS = {
  PENDING: 'pending',
  PASSED: 'passed',
  FAILED: 'failed',
} as const;

export const VERIFY_STATUS_LABELS: Record<string, string> = {
  pending: '未核验',
  passed: '通过',
  failed: '不通过',
};

export const VERIFY_STATUS_COLORS: Record<string, string> = {
  pending: 'default',
  passed: 'green',
  failed: 'red',
};

// ==================== 赛事类型 ====================
export interface CompetitionItem {
  id: number;
  name: string;
  type: string | null;
  status: string;
  start_time: number | null;
  end_time: number | null;
  location: string | null;
  distance: number | null;
  description: string | null;
  organizer: string | null;
  created_at: number;
  updated_at: number;
  // 详情接口附带的统计字段
  participant_total?: number;
  verified_count?: number;
  result_count?: number;
}

export interface CompetitionListParams {
  page?: number;
  pageSize?: number;
  name?: string;
  status?: string;
  type?: string;
  startTime?: number;
  endTime?: number;
  list?: string; // 'all' 时返回全部(供下拉)
}

export interface CompetitionCreateParams {
  name: string;
  type?: string;
  status?: string;
  start_time?: number;
  end_time?: number;
  location?: string;
  distance?: number;
  description?: string;
  organizer?: string;
}

export interface CompetitionUpdateParams {
  name?: string;
  type?: string;
  start_time?: number;
  end_time?: number;
  location?: string;
  distance?: number;
  description?: string;
  organizer?: string;
}

// 赛事下拉选项(精简结构)
export interface CompetitionOption {
  id: number;
  name: string;
  status: string;
  type: string | null;
  start_time: number | null;
  end_time: number | null;
}

// 赛事分页列表
export async function getCompetitionList(
  params: CompetitionListParams
): Promise<PageResult<CompetitionItem>> {
  const data = await http.get<PageResult<CompetitionItem>>('/competition', { params });
  return data;
}

// 赛事下拉(全部,不分页)
export async function getCompetitionOptions(): Promise<CompetitionOption[]> {
  const data = await http.get<PageResult<CompetitionOption>>('/competition', {
    params: { list: 'all' },
  });
  return data.list;
}

// 赛事详情
export async function getCompetitionDetail(id: number): Promise<CompetitionItem> {
  const data = await http.get<CompetitionItem>(`/competition/${id}`);
  return data;
}

// 新增赛事
export async function createCompetition(
  data: CompetitionCreateParams
): Promise<{ id: number }> {
  return await http.post('/competition', data);
}

// 编辑赛事
export async function updateCompetition(
  id: number,
  data: CompetitionUpdateParams
): Promise<void> {
  await http.put(`/competition/${id}`, data);
}

// 发布赛事(草稿 → 报名中)
export async function publishCompetition(id: number): Promise<void> {
  await http.post(`/competition/${id}/publish`);
}

// 状态流转
export async function transitionCompetitionStatus(
  id: number,
  status: string
): Promise<void> {
  await http.patch(`/competition/${id}/status`, { status });
}

// 删除赛事
export async function deleteCompetition(id: number): Promise<void> {
  await http.delete(`/competition/${id}`);
}

// ==================== 参赛鸽 ====================
export interface ParticipantItem {
  id: number;
  competition_id: number;
  ring_number: string;
  gene_profile_id: number | null;
  owner_name: string | null;
  verify_status: string;
  verify_reason: string | null;
  verified_at: number | null;
  created_at: number;
}

export interface ParticipantListParams {
  page?: number;
  pageSize?: number;
  ringNumber?: string;
  verifyStatus?: string;
}

export interface ParticipantImportParams {
  ring_numbers: string[];
  owner_name?: string;
}

// 参赛鸽分页列表
export async function getParticipantList(
  competitionId: number,
  params: ParticipantListParams
): Promise<PageResult<ParticipantItem>> {
  const data = await http.get<PageResult<ParticipantItem>>(
    `/competition/${competitionId}/participants`,
    { params }
  );
  return data;
}

// 批量导入参赛鸽
export async function importParticipants(
  competitionId: number,
  data: ParticipantImportParams
): Promise<{ inserted: number; skipped: number }> {
  return await http.post(`/competition/${competitionId}/participants/import`, data);
}

// 核验单个参赛鸽
export async function verifyParticipant(
  competitionId: number,
  participantId: number
): Promise<{ status: string; reason?: string; gene_profile_id?: number }> {
  return await http.post(`/competition/${competitionId}/participants/verify/${participantId}`);
}

// 批量核验(传 participant_ids 则核验指定项,不传则核验所有未核验项)
export async function verifyParticipantsBatch(
  competitionId: number,
  participant_ids?: number[]
): Promise<{ total: number; passed: number; failed: number }> {
  return await http.post(`/competition/${competitionId}/participants/verify`, {
    participant_ids,
  });
}

// ==================== 成绩 ====================
export interface ResultItem {
  id: number;
  competition_id: number;
  participant_id: number;
  rank: number | null;
  arrival_time: number | null;
  speed: number | null;
  distance: number | null;
  status: string;
  created_at: number;
  ring_number: string | null;
  owner_name: string | null;
}

export interface ResultListParams {
  page?: number;
  pageSize?: number;
  list?: string;
}

export interface ResultCreateParams {
  participant_id: number;
  arrival_time?: number;
  speed?: number;
  distance?: number;
  status?: string;
}

// 成绩分页列表
export async function getResultList(
  competitionId: number,
  params: ResultListParams
): Promise<PageResult<ResultItem>> {
  const data = await http.get<PageResult<ResultItem>>(`/competition/${competitionId}/results`, {
    params,
  });
  return data;
}

// 录入单条成绩
export async function createResult(
  competitionId: number,
  data: ResultCreateParams
): Promise<{ id: number }> {
  return await http.post(`/competition/${competitionId}/results`, data);
}

// 批量录入成绩
export async function createResultsBatch(
  competitionId: number,
  results: Array<{
    participant_id: number;
    arrival_time?: number;
    speed?: number;
    distance?: number;
  }>
): Promise<{ inserted: number; skipped: number }> {
  return await http.post(`/competition/${competitionId}/results/batch`, { results });
}

// 自动排名(按分速降序生成 rank)
export async function autoRankResults(competitionId: number): Promise<{ ranked: number }> {
  return await http.post(`/competition/${competitionId}/results/rank`);
}

// 删除成绩
export async function deleteResult(
  competitionId: number,
  resultId: number
): Promise<void> {
  await http.delete(`/competition/${competitionId}/results/${resultId}`);
}
