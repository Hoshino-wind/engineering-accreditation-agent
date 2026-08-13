import { browserEnv } from '../config/env';

import { apiFetch } from './apiClient';

const API_BASE = browserEnv.VITE_API_BASE_URL || '';
const EVALUATION_RUNS_ENDPOINT = `${API_BASE}/api/v1/evaluations/runs`;

export interface EvaluationItemData {
  competencyCode: string;
  attainment: number;
  status: 'covered' | 'partial' | 'gap';
  totalStrength: number;
}

export interface EvaluationRunData {
  id: string;
  ruleVersion: string;
  inputSnapshotHash: string;
  graphVersion: string;
  startedAt: string;
  items: EvaluationItemData[];
}

export async function runEvaluation(
  ruleVersion = 'rules-v1',
): Promise<EvaluationRunData | null> {
  try {
    const query = `?rule_version=${encodeURIComponent(ruleVersion)}`;
    const response = await apiFetch(`${EVALUATION_RUNS_ENDPOINT}${query}`, {
      method: 'POST',
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return null;
    return (await response.json()) as EvaluationRunData;
  } catch {
    return null;
  }
}

export async function downloadEvaluationAudit(
  evaluationId: string,
): Promise<boolean> {
  try {
    const response = await apiFetch(`${EVALUATION_RUNS_ENDPOINT}/${evaluationId}/audit`, {
      method: 'GET',
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return false;

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${evaluationId}-audit.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}
