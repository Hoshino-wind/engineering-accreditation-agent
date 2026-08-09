import { browserEnv } from '../config/env';

import { apiFetch } from './apiClient';

export interface SupportReadinessCheck {
  code: string;
  detail: string;
  label: string;
  passed: boolean;
}

export interface SupportReadiness {
  checks: SupportReadinessCheck[];
  evidenceCount: number;
  openImprovementCount: number;
  pendingFindingCount: number;
  pendingReviewCount: number;
  ready: boolean;
  resourceCount: number;
}

export async function fetchSupportReadiness(
  course?: string | null,
): Promise<SupportReadiness | null> {
  const baseUrl = browserEnv.VITE_API_BASE_URL || '';
  const query = course ? `?course=${encodeURIComponent(course)}` : '';
  try {
    const response = await apiFetch(`${baseUrl}/api/v1/support/readiness${query}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    return (await response.json()) as SupportReadiness;
  } catch {
    return null;
  }
}
