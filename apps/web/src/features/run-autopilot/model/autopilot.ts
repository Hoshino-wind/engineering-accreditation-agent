// Autopilot 一键自动分析 —— 接入后端 POST /api/v1/autopilot/run
// 类型与后端 app/modules/autopilot/contracts.py 对齐
import { apiClient } from '../../../shared/api/client';

// 一键分析请求
export interface AutopilotRunRequest {
  resource_id: string;
  course?: string;
}

// 单步骤执行结果
export interface AutopilotStepResult {
  step: string;
  status: 'success' | 'failed' | 'skipped';
  latency_ms: number;
  summary: string;
  items_count: number;
}

// 提取的节点
export interface AutopilotNodeItem {
  code: string;
  name: string;
  kind: string;
  confidence: number;
  source_excerpt?: string | null;
}

// 支撑关系
export interface AutopilotRelationItem {
  source_id: string;
  target_id: string;
  relation_type: string;
  strength: string;
  confidence: number;
  reasoning: string;
}

// 诊断结果
export interface AutopilotFindingItem {
  target_code: string;
  target_name: string;
  narrative: string;
  evidence_refs?: string[] | null;
}

// 改进建议
export interface AutopilotSuggestionItem {
  target_code: string;
  target_name: string;
  root_cause: string;
  suggestion: string;
  expected_effect: string;
}

// 一键分析完整响应
export interface AutopilotRunResponse {
  resource_id: string;
  resource_name: string;
  course: string;
  model: string;
  started_at: string;
  finished_at: string;
  total_latency_ms: number;
  steps: AutopilotStepResult[];
  nodes: AutopilotNodeItem[];
  relations: AutopilotRelationItem[];
  findings: AutopilotFindingItem[];
  suggestions: AutopilotSuggestionItem[];
  candidates_created: number;
  findings_created: number;
}

/**
 * 调用后端一键编排接口：材料 → 节点提取 → 关系推断 → 诊断 → 建议
 * 注意：autopilot 路由尚未导出到 openapi.json，这里用 untyped 方式调用。
 */
export async function runAutopilot(
  request: AutopilotRunRequest,
): Promise<AutopilotRunResponse> {
  const { data, error } = await apiClient.POST(
    '/api/v1/autopilot/run' as never,
    { body: request } as never,
  );

  if (error || !data) {
    const detail =
      error && typeof error === 'object' && 'detail' in error
        ? String((error as { detail: unknown }).detail)
        : '自动分析请求失败，请稍后重试';
    throw new Error(detail);
  }

  return data as unknown as AutopilotRunResponse;
}
