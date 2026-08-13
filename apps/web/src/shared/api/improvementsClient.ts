import { browserEnv } from '../config/env';
import { apiFetch } from './apiClient';

const API_BASE = browserEnv.VITE_API_BASE_URL || '';
const ENDPOINT = `${API_BASE}/api/v1/improvements`;

export class ImprovementApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ImprovementApiError';
  }
}

async function readErrorMessage(resp: Response, fallback: string): Promise<string> {
  try {
    const data = (await resp.json()) as { detail?: unknown; message?: unknown };
    const detail = data.detail ?? data.message;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const messages = detail
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object' && 'msg' in item) {
            const typed = item as { loc?: Array<string | number>; msg: unknown };
            const loc = typed.loc?.filter((part) => part !== 'body').join('.');
            return loc ? `${loc}: ${String(typed.msg)}` : String(typed.msg);
          }
          return '';
        })
        .filter(Boolean);
      if (messages.length > 0) return messages.join('; ');
      return detail
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object' && 'msg' in item) {
            return String((item as { msg: unknown }).msg);
          }
          return '';
        })
        .filter(Boolean)
        .join('；');
    }
  } catch {
    // Keep the caller-facing fallback when the response is not JSON.
  }
  return fallback;
}

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
    if (!resp.ok) {
      const detail = await readErrorMessage(resp, '创建改进措施失败，请检查后端服务或登录状态');
      throw new ImprovementApiError(detail, resp.status);
    }
    return (await resp.json()) as ImprovementData;
  } catch (error) {
    if (error instanceof ImprovementApiError) throw error;
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new ImprovementApiError('创建改进措施超时，请确认后端服务正在运行');
    }
    throw new ImprovementApiError('创建改进措施失败，请确认后端服务已启动且网络可访问');
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

export async function deleteImprovement(
  improvementId: string,
): Promise<boolean> {
  try {
    const resp = await apiFetch(`${ENDPOINT}/${improvementId}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(10_000),
    });
    return resp.ok;
  } catch {
    return false;
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
