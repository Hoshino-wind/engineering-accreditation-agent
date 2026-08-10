import { browserEnv } from '../config/env';
import { apiFetch } from './apiClient';

const API_BASE = browserEnv.VITE_API_BASE_URL || '';
const ENDPOINT = `${API_BASE}/api/v1/improvements`;

export interface ImprovementData {
  id: string;
  title: string;
  description: string;
  course: string;
  findingId: string | null;
  targetCode: string | null;
  targetName: string | null;
  rootCause: string | null;
  action: string;
  expectedEffect: string | null;
  owner: string;
  deadline: string | null;
  sourceModule: string;
  sourceLabel: string;
  verificationMethod: string;
  completionSummary: string;
  evidenceUri: string;
  reevaluationResult: number | null;
  baseline: number | null;
  targetValue: number | null;
  closedAt: string | null;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImprovementCompletionResult {
  improvement: ImprovementData;
  verified: boolean;
  message: string;
}

export interface CreateImprovementPayload {
  title: string;
  description: string;
  course: string;
  action: string;
  owner: string;
  findingId?: string | null;
  targetCode?: string | null;
  targetName?: string | null;
  rootCause?: string | null;
  expectedEffect?: string | null;
  deadline?: string | null;
  priority?: string;
  sourceModule?: string;
  sourceLabel?: string;
  verificationMethod?: string;
  completionSummary?: string;
  evidenceUri?: string;
  reevaluationResult?: number | null;
  baseline?: number | null;
  targetValue?: number | null;
}

export interface UpdateImprovementPayload {
  title?: string;
  description?: string;
  course?: string;
  action?: string;
  owner?: string;
  findingId?: string | null;
  targetCode?: string | null;
  targetName?: string | null;
  rootCause?: string | null;
  expectedEffect?: string | null;
  deadline?: string | null;
  priority?: string;
  status?: string;
  sourceModule?: string;
  sourceLabel?: string;
  verificationMethod?: string;
  completionSummary?: string;
  evidenceUri?: string;
  reevaluationResult?: number | null;
  baseline?: number | null;
  targetValue?: number | null;
}

// 鉴权与 X-Major-Id 注入统一由 apiFetch 负责

export async function fetchImprovements(
  course?: string,
  status?: string,
): Promise<ImprovementData[] | null> {
  try {
    const params = new URLSearchParams();
    if (course) params.set('course', course);
    if (status) params.set('status', status);
    const qs = params.toString();
    const url = qs ? `${ENDPOINT}?${qs}` : ENDPOINT;
    const resp = await apiFetch(url, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as ImprovementData[];
  } catch {
    return null;
  }
}

export async function createImprovement(
  payload: CreateImprovementPayload,
): Promise<ImprovementData | null> {
  try {
    const resp = await apiFetch(ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as ImprovementData;
  } catch {
    return null;
  }
}

export async function updateImprovementStatus(
  improvementId: string,
  status: string,
): Promise<ImprovementData | null> {
  try {
    const resp = await apiFetch(`${ENDPOINT}/${improvementId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as ImprovementData;
  } catch {
    return null;
  }
}

export async function updateImprovement(
  improvementId: string,
  payload: UpdateImprovementPayload,
): Promise<ImprovementData | null> {
  try {
    const resp = await apiFetch(`${ENDPOINT}/${improvementId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as ImprovementData;
  } catch {
    return null;
  }
}

export async function completeImprovement(
  improvementId: string,
): Promise<ImprovementCompletionResult | null> {
  try {
    const resp = await apiFetch(`${ENDPOINT}/${improvementId}/complete`, {
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as ImprovementCompletionResult;
  } catch {
    return null;
  }
}
