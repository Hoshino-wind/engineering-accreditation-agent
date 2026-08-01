/**
 * 多智能体协作 API 客户端。
 *
 * 带 Authorization: Bearer token（修复 llmClient 缺鉴权头的问题）。
 * 后端不可用时降级为 mock，保证 Demo 仍可运行。
 */

import { getToken } from '../auth/authStore';
import { browserEnv } from '../config/env';

const API_BASE = browserEnv.VITE_API_BASE_URL || 'http://localhost:8000';
const ORCH_ENDPOINT = `${API_BASE}/api/v1/orchestration`;

// ── 类型 ────────────────────────────────────────────────

export interface ToolCallInfo {
  tool: string;
  agent: string;
  status: string;
  summary: string;
  latencyMs: number;
}

export interface AgentStepInfo {
  phase: string;
  agent: string;
  title: string;
  status: string;
  summary: string;
  startedAt: string | null;
  finishedAt: string | null;
  toolCalls: ToolCallInfo[];
}

export interface PendingRelation {
  id: string;
  source: string;
  target: string;
  strength: string | null;
  confidence: number | null;
  reasoning: string | null;
}

export interface CoverageSummary {
  overallCoverageRate: number;
  gapCount: number;
  partialCount: number;
  coveredCount: number;
  orphanNodeCount: number;
  requirements: Record<string, unknown>[];
  competencies: Record<string, unknown>[];
}

export interface RunResult {
  coverage?: CoverageSummary;
  explanations?: Record<string, unknown>[];
  suggestions?: Record<string, unknown>[];
  reportChapters?: Record<string, unknown>[];
}

export interface AgentRun {
  runId: string;
  goal: string;
  status: string;
  plan: string[];
  steps: AgentStepInfo[];
  pendingReview: PendingRelation[];
  result: RunResult;
  createdAt: string | null;
  updatedAt: string | null;
  error: string | null;
}

export interface ReviewDecision {
  relationId: string;
  decision: 'approved' | 'rejected';
  strength?: 'strong' | 'medium' | 'weak';
}

// ── 请求辅助 ────────────────────────────────────────────

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function orchFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const resp = await fetch(`${ORCH_ENDPOINT}${path}`, {
      ...init,
      headers: { ...authHeaders(), ...(init?.headers as Record<string, string>) },
      signal: AbortSignal.timeout(120_000),
    });
    if (!resp.ok) {
      console.warn(`[orchestration] ${resp.status} ${path}`);
      return null;
    }
    return (await resp.json()) as T;
  } catch (err) {
    console.warn(`[orchestration] fetch failed: ${path}`, err);
    return null;
  }
}

// ── 公开 API ────────────────────────────────────────────

export async function startRun(
  goal: string,
  materialCategory?: string,
  materialName?: string,
): Promise<AgentRun | null> {
  return orchFetch<AgentRun>('/runs', {
    method: 'POST',
    body: JSON.stringify({ goal, materialCategory, materialName }),
  });
}

export async function listRuns(): Promise<AgentRun[] | null> {
  return orchFetch<AgentRun[]>('/runs');
}

export async function getRun(runId: string): Promise<AgentRun | null> {
  return orchFetch<AgentRun>(`/runs/${runId}`);
}

export async function submitReview(
  runId: string,
  decisions: ReviewDecision[],
): Promise<AgentRun | null> {
  return orchFetch<AgentRun>(`/runs/${runId}/review`, {
    method: 'POST',
    body: JSON.stringify({ decisions }),
  });
}
