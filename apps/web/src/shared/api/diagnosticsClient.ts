/**
 * 图谱诊断发现 · 真实后端 API 客户端（shared 层，仅负责传输与 DTO）。
 *
 * 对接 /api/v1/diagnostics/findings（诊断模块，真实数据来自 Autopilot 覆盖度诊断）。
 * 实体映射（含 path/materialSnapshot 等展示字段的确定性组装）在
 * entities/diagnostic-finding 层完成（FSD 分层约束）。
 */

import { browserEnv } from '../config/env';
import { apiFetch } from './apiClient';

const API_BASE = browserEnv.VITE_API_BASE_URL || '';
const ENDPOINT = `${API_BASE}/api/v1/diagnostics/findings`;

// ── DTO：与后端契约 DiagnosticFindingResponse 对应（camelCase） ──

export interface DiagnosticFindingEvidenceDTO {
  coordinate: string;
  excerpt: string;
  hash: string;
  id: string;
  objectName: string;
  objectVersion: string;
}

export interface DiagnosticFindingDTO {
  course: string;
  decisionStatus?: string;
  evidence: DiagnosticFindingEvidenceDTO[];
  graphVersion: string;
  id: string;
  impact?: {
    abilityNodes?: number;
    courseObjectives?: number;
    evaluationInputs?: number;
  };
  relationLabel: string;
  risk: string;
  rule?: {
    basis: string;
    id: string;
    kind: string;
    rationale: string;
    runAt: string;
    version: string;
  };
  sourceNode: string;
  suggestedDestination?: string;
  targetNode: string;
  title: string;
  type: string;
}

/** 后端处置决定字面量（见 DecideFinding 用例）。 */
export type BackendFindingDecision = 'confirm' | 'convert' | 'dismiss';

// ── 请求辅助 ────────────────────────────────────────────

// 鉴权与 X-Major-Id 注入统一由 apiFetch 负责

// ── 公开 API ────────────────────────────────────────────

/** 获取真实诊断发现列表；后端不可用返回 null。 */
export async function fetchFindings(): Promise<DiagnosticFindingDTO[] | null> {
  try {
    const resp = await apiFetch(ENDPOINT, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as DiagnosticFindingDTO[];
  } catch {
    return null;
  }
}

/** 提交处置决定（confirm/dismiss/convert），返回更新后的发现 DTO。 */
export async function decideFinding(
  findingId: string,
  decision: BackendFindingDecision,
): Promise<DiagnosticFindingDTO | null> {
  try {
    const resp = await apiFetch(`${ENDPOINT}/${findingId}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as DiagnosticFindingDTO;
  } catch {
    return null;
  }
}
