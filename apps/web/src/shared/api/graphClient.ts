/**
 * 能力图谱 + 覆盖度 API 客户端。
 *
 * 从后端 /orchestration/graph 获取真实图谱数据（智能体运行后包含 AI 推断的边）。
 * 后端不可用或响应异常时返回 null，由调用方决定如何提示用户。
 */

import { browserEnv } from '../config/env';
import { apiFetch } from './apiClient';

const API_BASE = browserEnv.VITE_API_BASE_URL || '';
const GRAPH_ENDPOINT = `${API_BASE}/api/v1/orchestration/graph`;

// ── 类型（与后端 to_dict camelCase 对齐）──────────────────

export interface GraphNodeData {
  id: string;
  kind: string;
  code: string;
  name: string;
  origin: string;
  description?: string | null;
  properties?: Record<string, unknown>;
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  kind: string;
  sourceType: string;
  reviewStatus: string;
  strength?: string | null;
  confidence?: number | null;
  reasoning?: string | null;
  materialResourceId?: string | null;
  materialVersionGroupId?: string | null;
  materialVersion?: string | null;
  materialName?: string | null;
}

export interface GraphData {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
}

export interface RequirementCoverageData {
  code: string;
  name: string;
  status: 'gap' | 'partial' | 'covered';
  coverageRate: number;
  competencyCount: number;
  coveredCount: number;
  strongSupportCount: number;
  supportingCourses: string[];
}

export interface CompetencyCoverageData {
  code: string;
  name: string;
  requirementCode: string;
  status: 'gap' | 'partial' | 'covered';
  totalStrength: number;
  strongCount: number;
  mediumCount: number;
  weakCount: number;
  supporterCount: number;
  evidenceSourceCount: number;
  hasPendingReview: boolean;
  attainment: number;
  supporters: string[];
  evidence: CoverageEvidenceData[];
}

export interface CoverageEvidenceData {
  edgeId: string;
  sourceNodeId: string;
  sourceCode: string;
  sourceName: string;
  strength?: 'strong' | 'medium' | 'weak' | null;
  weight: number;
  confidence?: number | null;
  reviewStatus: string;
  reasoning?: string | null;
  materialId?: string | null;
  materialVersionGroupId?: string | null;
  materialVersion?: string | null;
  materialName?: string | null;
  counted: boolean;
  countReason: string;
}

export interface CoverageData {
  overallCoverageRate: number;
  gapCount: number;
  partialCount: number;
  coveredCount: number;
  orphanNodeCount: number;
  requirements: RequirementCoverageData[];
  competencies: CompetencyCoverageData[];
}

// ── 请求辅助 ────────────────────────────────────────────

// 鉴权与 X-Major-Id 注入统一由 apiFetch 负责

// ── 公开 API ────────────────────────────────────────────

export async function fetchGraph(): Promise<GraphData | null> {
  try {
    const resp = await apiFetch(GRAPH_ENDPOINT, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as GraphData;
  } catch {
    return null;
  }
}

export async function fetchCoverage(): Promise<CoverageData | null> {
  try {
    const resp = await apiFetch(`${GRAPH_ENDPOINT}/coverage`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as CoverageData;
  } catch {
    return null;
  }
}

export async function fetchGraphPendingReviewCount(): Promise<number | null> {
  try {
    const resp = await apiFetch(GRAPH_ENDPOINT, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as GraphData;
    return data.edges.filter(
      (edge) =>
        edge.kind === 'SUPPORTS' &&
        edge.sourceType === 'ai' &&
        (edge.reviewStatus ?? 'pending') === 'pending',
    ).length;
  } catch {
    return null;
  }
}
