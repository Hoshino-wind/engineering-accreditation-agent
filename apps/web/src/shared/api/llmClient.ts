// LLM 客户端封装 —— 统一管理所有 AI 能力调用
// 后端 API 地址：/api/v1/llm/* （通过 Vite proxy 代理到后端）
// 后端不可用时抛出错误，由调用方捕获并展示空态或错误提示

const API_BASE: string = (import.meta.env?.VITE_API_BASE_URL as string | undefined) ?? '';
const LLM_ENDPOINT = `${API_BASE}/api/v1/llm`;

export interface LLMResponse<T> {
  data: T;
  model: string;
  usage: { prompt_tokens: number; completion_tokens: number };
  latency: number;
}

/** 后端 API 原始 JSON 响应结构 */
interface LLMRawResponse {
  data: unknown;
  model: string;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  latency: number;
}

// 节点提取结果项
export interface ExtractionLLMItem {
  kind: string;
  code: string;
  name: string;
  description: string;
  confidence: number;
  sourceExcerpt: string;
}

// 关系推理结果项
export interface RelationLLMItem {
  source: string;
  target: string;
  strength: string;
  confidence: number;
  aiReasoning: string;
}

// 改进建议结果项
export interface SuggestionLLMItem {
  targetCode: string;
  targetName: string;
  rootCause: string;
  suggestion: string;
  expectedEffect: string;
}

// 报告生成结果项
export interface ReportLLMItem {
  requirementCode: string;
  chapterTitle: string;
  standardRef: string;
  narrative: string;
}

// 从原始对象中按候选键取值（兼容后端 snake_case 与前端 camelCase 两种命名）
function pick(raw: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = raw[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

const asString = (value: unknown, fallback = ''): string => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
};

const asNumber = (value: unknown, fallback = 0): number => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
};

// 后端返回的 item 为 snake_case，统一映射为前端使用的 camelCase 接口
function mapExtractionItem(raw: Record<string, unknown>): ExtractionLLMItem {
  return {
    kind: asString(pick(raw, 'kind')),
    code: asString(pick(raw, 'code')),
    name: asString(pick(raw, 'name')),
    description: asString(pick(raw, 'description')),
    confidence: asNumber(pick(raw, 'confidence')),
    sourceExcerpt: asString(pick(raw, 'sourceExcerpt', 'source_excerpt')),
  };
}

function mapRelationItem(raw: Record<string, unknown>): RelationLLMItem {
  return {
    source: asString(pick(raw, 'source', 'source_id')),
    target: asString(pick(raw, 'target', 'target_id')),
    strength: asString(pick(raw, 'strength'), 'medium'),
    confidence: asNumber(pick(raw, 'confidence')),
    aiReasoning: asString(pick(raw, 'aiReasoning', 'reasoning')),
  };
}

function mapSuggestionItem(raw: Record<string, unknown>): SuggestionLLMItem {
  return {
    targetCode: asString(pick(raw, 'targetCode', 'target_code')),
    targetName: asString(pick(raw, 'targetName', 'target_name')),
    rootCause: asString(pick(raw, 'rootCause', 'root_cause')),
    suggestion: asString(pick(raw, 'suggestion')),
    expectedEffect: asString(pick(raw, 'expectedEffect', 'expected_effect')),
  };
}

function mapReportItem(raw: Record<string, unknown>): ReportLLMItem {
  return {
    requirementCode: asString(pick(raw, 'requirementCode', 'requirement_code')),
    chapterTitle: asString(pick(raw, 'chapterTitle', 'chapter_title')),
    standardRef: asString(pick(raw, 'standardRef', 'standard_ref')),
    narrative: asString(pick(raw, 'narrative')),
  };
}

/**
 * 调用后端 LLM API，失败时抛出错误。
 * mapItem 负责把后端 snake_case 的结果项映射为前端 camelCase 接口。
 */
async function callLLMApi<TItem>(
  endpoint: string,
  body: Record<string, unknown>,
  mapItem?: (raw: Record<string, unknown>) => TItem,
): Promise<LLMResponse<TItem[]>> {
  const resp = await fetch(`${LLM_ENDPOINT}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000), // 30s 超时
  });
  if (!resp.ok) {
    throw new Error(`API ${endpoint} returned ${resp.status}`);
  }
  const json = await resp.json() as LLMRawResponse;
  const rawData = json.data;
  const rawItems: Array<Record<string, unknown>> = Array.isArray(rawData)
    ? (rawData as Array<Record<string, unknown>>)
    : [];
  const data: TItem[] = mapItem
    ? rawItems.map(mapItem)
    : (rawItems as unknown as TItem[]);
  return {
    data,
    model: asString(json.model, 'unknown'),
    usage: {
      prompt_tokens: asNumber(json.usage?.prompt_tokens),
      completion_tokens: asNumber(json.usage?.completion_tokens),
    },
    latency: asNumber(json.latency),
  };
}

// ── 对外接口 ────────────────────────────────────────────

/**
 * 节点提取 AI 调用
 * 后端 POST /api/v1/llm/extract
 */
export async function extractNodesViaLLM(
  materialCategory: string,
  _fileName: string,
): Promise<LLMResponse<ExtractionLLMItem[]>> {
  return callLLMApi<ExtractionLLMItem>(
    'extract',
    { material_text: '', material_category: materialCategory, material_name: _fileName },
    mapExtractionItem,
  );
}

/**
 * 关系推理 AI 调用
 * 后端 POST /api/v1/llm/infer-relations
 */
export async function inferRelationsViaLLM(
  _schoolNodes: Array<{ id: string; name: string; kind: string; description?: string }>,
  _standardNodes: Array<{ id: string; name: string; code: string }>,
): Promise<LLMResponse<RelationLLMItem[]>> {
  return callLLMApi<RelationLLMItem>(
    'infer-relations',
    { school_nodes: _schoolNodes, standard_nodes: _standardNodes },
    mapRelationItem,
  );
}

/**
 * 改进建议生成 AI 调用
 * 后端 POST /api/v1/llm/suggest
 */
export async function generateSuggestionsViaLLM(
  gaps: Array<{ code: string; name: string; reqName: string; type: string }>,
): Promise<LLMResponse<SuggestionLLMItem[]>> {
  return callLLMApi<SuggestionLLMItem>(
    'suggest',
    { gaps },
    mapSuggestionItem,
  );
}

/**
 * 报告生成 AI 调用
 * 后端 POST /api/v1/llm/report
 */
export async function generateReportViaLLM(
  reportContext: Array<{
    requirementCode: string;
    requirementName: string;
    coverageRate: number;
    attainment: number;
    supportingCourses: string[];
    improvements: string[];
  }>,
): Promise<LLMResponse<ReportLLMItem[]>> {
  // 后端按 snake_case 读取报告上下文，这里在请求边界做命名转换
  const report_context = reportContext.map((r) => ({
    requirement_code: r.requirementCode,
    requirement_name: r.requirementName,
    coverage_rate: r.coverageRate,
    attainment: r.attainment,
    supporting_courses: r.supportingCourses,
    improvements: r.improvements,
  }));
  return callLLMApi<ReportLLMItem>(
    'report',
    { report_context },
    mapReportItem,
  );
}
