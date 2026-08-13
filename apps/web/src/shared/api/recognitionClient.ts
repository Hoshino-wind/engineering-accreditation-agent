/**
 * 关系识别候选 · 真实后端 API 客户端（shared 层，仅负责传输与 DTO）。
 *
 * 对接 /api/v1/recognition/candidates（识别模块，真实数据来自 Autopilot/识别流水线）。
 * 实体映射在 entities/recognition-candidate 层完成（FSD 分层约束）。
 * 后端不可用时返回 null，由页面展示空态引导。
 */

import { browserEnv } from '../config/env';
import { apiFetch } from './apiClient';

const API_BASE = browserEnv.VITE_API_BASE_URL || '';
const ENDPOINT = `${API_BASE}/api/v1/recognition/candidates`;

// ── DTO：与后端契约 RecognitionCandidateResponse 对应（camelCase） ──

export interface RecognitionCandidateEvidenceDTO {
  coordinate: string;
  excerpt: string;
  hash: string;
  id: string;
  resourceId?: string;
  resourceName: string;
  resourceVersion: string;
}

export interface RecognitionCandidateDTO {
  candidateType: string;
  confidence: number;
  conflictMessage?: string | null;
  course: string;
  evidence: RecognitionCandidateEvidenceDTO[];
  explanation: string;
  generatedAt: string;
  id: string;
  majorId?: string;
  impact?: {
    abilityNodes?: number;
    courseObjectives?: number;
    rubricItems?: number;
  };
  processorVersion: string;
  relation: string;
  reviewStatus?: string;
  risk: string;
  sourceNode: string;
  targetNode: string;
  title: string;
}

/** 后端审核决定字面量（见 ReviewCandidate 用例）。 */
export type BackendCandidateDecision = 'accept' | 'modify' | 'reject';

// ── 请求辅助 ────────────────────────────────────────────

// ── 公开 API ────────────────────────────────────────────

/** 获取真实识别候选列表；后端不可用返回 null。 */
export async function fetchCandidates(): Promise<
  RecognitionCandidateDTO[] | null
> {
  try {
    const resp = await apiFetch(ENDPOINT, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as RecognitionCandidateDTO[];
  } catch {
    return null;
  }
}

/** 提交审核决定（accept/reject/modify），返回更新后的候选 DTO。 */
export async function reviewCandidate(
  candidateId: string,
  decision: BackendCandidateDecision,
): Promise<RecognitionCandidateDTO | null> {
  try {
    const resp = await apiFetch(`${ENDPOINT}/${candidateId}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as RecognitionCandidateDTO;
  } catch {
    return null;
  }
}
