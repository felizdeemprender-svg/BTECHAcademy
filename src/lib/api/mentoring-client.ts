/**
 * API — Cliente de mentoría/campañas (llama a las rutas del paso 8).
 */
import { apiGet, apiSend } from './client';
import type {
  ApiCampaignSummary,
  ApiCoordinationOutput,
  ApiCreateCampaignResult,
  ApiProgramSummary,
  ApiSalesPage,
} from './dto';

export function fetchMentorCampaigns(
  mentorId: string,
  token: string,
): Promise<ApiCampaignSummary[]> {
  return apiGet<ApiCampaignSummary[]>(
    `/api/campaigns?mentorId=${encodeURIComponent(mentorId)}`,
    token,
  );
}

export function fetchCampaignDetail(id: string, token: string): Promise<ApiCampaignSummary> {
  return apiGet<ApiCampaignSummary>(`/api/campaigns/${encodeURIComponent(id)}`, token);
}

export function fetchMentorPrograms(
  mentorId: string,
  token: string,
): Promise<ApiProgramSummary[]> {
  return apiGet<ApiProgramSummary[]>(
    `/api/mentoring/programs?mentorId=${encodeURIComponent(mentorId)}`,
    token,
  );
}

export function fetchAllPrograms(token: string): Promise<ApiProgramSummary[]> {
  return apiGet<ApiProgramSummary[]>('/api/mentoring/programs?all=1', token);
}

export interface CreateProgramRequest {
  readonly mentorId: string;
  readonly type?: 'individual' | 'group';
  readonly title: string;
  readonly goal?: string;
  readonly studentId?: string;
  readonly studentName?: string;
  readonly studentEmail?: string;
  readonly totalSessions?: number;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly planGuideUrl?: string | null;
  readonly masterFileUrl?: string | null;
}

export interface CreateProgramResult {
  readonly id: string;
}

export function createProgram(
  input: CreateProgramRequest,
  token: string,
): Promise<CreateProgramResult> {
  return apiSend<CreateProgramResult>('POST', '/api/mentoring/programs/create', token, input);
}

export function updateProgram(
  id: string,
  token: string,
  patch: Record<string, unknown>,
): Promise<void> {
  return apiSend<void>('PATCH', `/api/mentoring/programs/${encodeURIComponent(id)}`, token, patch);
}

export function removeProgram(id: string, token: string): Promise<void> {
  return apiSend<void>('DELETE', `/api/mentoring/programs/${encodeURIComponent(id)}`, token);
}

export interface ApiSession {
  readonly id: string;
  readonly followUpId: string;
  readonly orderIndex: number;
  readonly isAdditional: boolean;
  readonly isCompleted: boolean;
  readonly status: 'pending' | 'scheduled' | 'completed';
  readonly date: string;
  readonly time: string;
  readonly duration: number;
  readonly topics: string[];
  readonly minutes: string;
  readonly calendarEventId?: string;
  readonly calendarEventLink?: string;
  readonly files: { readonly name: string; readonly url: string }[];
}

export interface ApiTask {
  readonly id: string;
  readonly followUpId: string;
  readonly type: 'free' | 'module' | 'course';
  readonly title: string;
  readonly description: string;
  readonly status: 'pending' | 'completed';
  readonly progress: number;
  readonly score?: number;
  readonly aiFeedback?: string;
  readonly answer?: string;
  readonly fileUrl?: string | null;
  readonly evaluationCriteria?: string;
  readonly courseId?: string;
  readonly moduleId?: string;
  readonly moduleTitle?: string;
  readonly courseTitle?: string | null;
  readonly mentorName?: string;
  readonly completedAt?: string;
}

const detailBase = (programId: string) =>
  `/api/mentoring/programs/${encodeURIComponent(programId)}/detail`;

export function fetchProgramDetail(programId: string, token: string): Promise<unknown> {
  return apiGet<unknown>(`${detailBase(programId)}?action=program`, token);
}

export function fetchProgramSessions(programId: string, token: string): Promise<ApiSession[]> {
  return apiGet<ApiSession[]>(`${detailBase(programId)}?action=sessions`, token);
}

export function fetchProgramTasks(programId: string, token: string): Promise<ApiTask[]> {
  return apiGet<ApiTask[]>(`${detailBase(programId)}?action=tasks`, token);
}

export function addProgramSession(
  programId: string,
  token: string,
): Promise<{ sessionId: string }> {
  return apiSend<{ sessionId: string }>(
    'POST',
    `${detailBase(programId)}?action=add-session`,
    token,
  );
}

export function assignProgramTask(
  programId: string,
  token: string,
  task: Record<string, unknown>,
): Promise<{ taskId: string }> {
  return apiSend<{ taskId: string }>(
    'POST',
    `${detailBase(programId)}?action=assign-task`,
    token,
    task,
  );
}

export function saveProgramSession(
  programId: string,
  sessionId: string,
  token: string,
  data: Record<string, unknown>,
): Promise<void> {
  return apiSend<void>(
    'PATCH',
    `/api/mentoring/programs/${encodeURIComponent(programId)}/sessions/${encodeURIComponent(sessionId)}`,
    token,
    data,
  );
}

export function submitProgramTask(
  programId: string,
  taskId: string,
  token: string,
  data: Record<string, unknown>,
): Promise<void> {
  return apiSend<void>(
    'PATCH',
    `/api/mentoring/programs/${encodeURIComponent(programId)}/tasks/${encodeURIComponent(taskId)}?action=submit`,
    token,
    data,
  );
}

export function deleteProgramTask(
  programId: string,
  taskId: string,
  token: string,
): Promise<void> {
  return apiSend<void>(
    'DELETE',
    `/api/mentoring/programs/${encodeURIComponent(programId)}/tasks/${encodeURIComponent(taskId)}`,
    token,
  );
}

export function updateProgramTaskProgress(
  programId: string,
  taskId: string,
  token: string,
  data: { progress: number; status: string },
): Promise<void> {
  return apiSend<void>(
    'PATCH',
    `/api/mentoring/programs/${encodeURIComponent(programId)}/tasks/${encodeURIComponent(taskId)}?action=progress`,
    token,
    data,
  );
}

export function patchCampaign(
  id: string,
  token: string,
  patch: { strategy?: unknown; autoPilot?: boolean; startDate?: string; title?: string; status?: string; productionStatus?: string },
): Promise<void> {
  return apiSend<void>('PATCH', `/api/campaigns/${encodeURIComponent(id)}`, token, patch);
}

export function deleteCampaign(id: string, token: string): Promise<void> {
  return apiSend<void>('DELETE', `/api/campaigns/${encodeURIComponent(id)}`, token);
}

export interface ExecuteResult {
  readonly logsAppended: number;
  readonly currentDay: number;
}

export function fetchCampaignPacks(mentorId: string, token: string): Promise<ApiSalesPage[]> {
  return apiGet<ApiSalesPage[]>(
    `/api/sales-pages?mentorId=${encodeURIComponent(mentorId)}`,
    token,
  );
}

export interface PlanRequest {
  readonly campaignTitle: string;
  readonly strategyType: 'flash_sale' | 'classic_launch' | 'evergreen_warmup';
  readonly durationDays: number;
  readonly targetAudience?: string;
  readonly activePlatforms?: string[];
}

export function requestCoordinationPlan(
  input: PlanRequest,
  token: string,
): Promise<ApiCoordinationOutput> {
  return apiSend<ApiCoordinationOutput>('POST', '/api/campaigns/plan', token, input);
}

export interface PublishCampaignRequest {
  readonly mentorId: string;
  readonly title: string;
  readonly salesPageId: string;
  readonly courseId?: string | null;
  readonly strategy: unknown;
  readonly startDate: string;
}

export function publishCampaign(
  input: PublishCampaignRequest,
  token: string,
): Promise<ApiCreateCampaignResult> {
  return apiSend<ApiCreateCampaignResult>('POST', '/api/campaigns/create', token, input);
}

export function executeCampaign(id: string, token: string, day?: number): Promise<ExecuteResult> {
  const query = day !== undefined ? `?day=${day}` : '';
  return apiSend<ExecuteResult>(
    'POST',
    `/api/campaigns/${encodeURIComponent(id)}/execute${query}`,
    token,
  );
}
