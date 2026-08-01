// LLM 客户端封装 —— 统一管理所有 AI 能力调用
// 后端 API 地址：http://localhost:8000/api/v1/llm/*
// 后端未启动时自动降级为本地 mock，保证 Demo 始终可跑

const API_BASE: string = (import.meta.env?.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000';
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

// 模拟 LLM 响应延迟
const simulateLatency = () => 800 + Math.random() * 1200;

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
 * 调用后端 LLM API，失败时降级为本地 mock。
 * mapItem 负责把后端 snake_case 的结果项映射为前端 camelCase 接口。
 */
async function callLLMApi<TItem>(
  endpoint: string,
  body: Record<string, unknown>,
  mockFn: () => Promise<LLMResponse<TItem[]>>,
  mapItem?: (raw: Record<string, unknown>) => TItem,
): Promise<LLMResponse<TItem[]>> {
  try {
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
  } catch (err) {
    // 后端不可用 → 降级为 mock
    console.warn(`[LLM] ${endpoint} 降级为 mock`, err instanceof Error ? err.message : err);
    return mockFn();
  }
}

// ── Mock 实现（后端不可用时降级） ────────────────────────

function mockExtractNodes(
  materialCategory: string,
): LLMResponse<ExtractionLLMItem[]> {
  const responseMap: Record<string, ExtractionLLMItem[]> = {
    '培养方案': [
      { kind: 'Course', code: 'CS-2001', name: '数据结构与算法',
        description: '线性表、树、图、排序与查找算法',
        confidence: 0.96, sourceExcerpt: '第三学期开设数据结构与算法(3学分/56学时)，含16学时实验' },
      { kind: 'Course', code: 'B020012005', name: '单片机基础',
        description: '基于STM32的嵌入式系统开发实验',
        confidence: 0.93, sourceExcerpt: '第四学期开设单片机基础(2学分/48学时)' },
      { kind: 'Course', code: 'B020031006', name: '嵌入式系统原理',
        description: '基于Verilog HDL与FPGA的数字系统设计',
        confidence: 0.91, sourceExcerpt: '第五学期开设嵌入式系统原理(1.5学分/32学时)' },
    ],
    '课程大纲': [
      { kind: 'Experiment', code: 'EXP-DS-01', name: '链表实现',
        description: '使用C/C++实现单链表、双链表、循环链表的基本操作',
        confidence: 0.94, sourceExcerpt: '实验一：链表实现(4学时/设计性)' },
      { kind: 'KnowledgePoint', code: 'KP-DS-01', name: '链表操作',
        description: '单/双/循环链表的插入、删除、查找、反转',
        confidence: 0.88, sourceExcerpt: '课程目标2：掌握线性表存储结构与操作' },
    ],
    '实验指导书': [
      { kind: 'Experiment', code: 'EXP-EMB-01', name: '系统设计',
        description: '基于STM32的综合嵌入式系统设计',
        confidence: 0.95, sourceExcerpt: '综合实验：系统设计(8学时/综合性)' },
      { kind: 'Experiment', code: 'EXP-FPGA-01', name: 'LED流水灯',
        description: '基于Verilog的FPGA入门实验',
        confidence: 0.91, sourceExcerpt: '实验一：LED流水灯(4学时/设计性)' },
    ],
  };
  const defaultResponse: ExtractionLLMItem[] = [
    { kind: 'KnowledgePoint', code: 'KP-HDL-01', name: 'Verilog HDL语言基础',
      description: '模块、端口、always、assign',
      confidence: 0.89, sourceExcerpt: '考核内容：Verilog模块设计' },
  ];
  const data = responseMap[materialCategory] ?? defaultResponse;
  const latency = simulateLatency();
  return { data, model: 'deepseek-v2 (mock)', usage: { prompt_tokens: 1200, completion_tokens: 400 }, latency };
}

function mockInferRelations(): LLMResponse<RelationLLMItem[]> {
  const data: RelationLLMItem[] = [
    { source: 'exp-list', target: 'std-c-01-01', strength: 'strong', confidence: 0.92,
      aiReasoning: '链表实现实验要求理解线性表存储结构与操作效率，对应工程知识应用能力。' },
    { source: 'exp-system', target: 'std-c-05-01', strength: 'strong', confidence: 0.85,
      aiReasoning: '综合实验使用STM32开发板、Keil、示波器等多类工具。' },
    { source: 'exp-fpga-1', target: 'std-c-03-01', strength: 'medium', confidence: 0.74,
      aiReasoning: '要求设计状态机与分频逻辑，对应一定的系统设计能力。' },
  ];
  return { data, model: 'deepseek-v2 (mock)', usage: { prompt_tokens: 800, completion_tokens: 350 }, latency: simulateLatency() };
}

function mockGenerateSuggestions(
  gaps: Array<{ code: string; name: string; reqName: string; type: string }>,
): LLMResponse<SuggestionLLMItem[]> {
  const data: SuggestionLLMItem[] = gaps.map((g) => ({
    targetCode: g.code,
    targetName: g.name,
    rootCause: `能力指标"${g.name}"归属毕业要求"${g.reqName}"，当前存在覆盖缺口。`,
    suggestion: `建议增设教学环节支撑"${g.name}"。可考虑：1) 在现有课程中补充对应知识点和实验内容；2) 新增相关实验项目。`,
    expectedEffect: `补齐"${g.name}"的覆盖缺口，使毕业要求"${g.reqName}"的覆盖率达到 80% 以上。`,
  }));
  return { data, model: 'deepseek-v2 (mock)', usage: { prompt_tokens: 600, completion_tokens: 300 }, latency: simulateLatency() };
}

function mockGenerateReport(
  reportContext: Array<{
    requirementCode: string; requirementName: string;
    coverageRate: number; attainment: number;
    supportingCourses: string[]; improvements: string[];
  }>,
): LLMResponse<ReportLLMItem[]> {
  const data: ReportLLMItem[] = reportContext.map((r) => ({
    requirementCode: r.requirementCode,
    chapterTitle: `${r.requirementCode.replace('std-gr-', 'GR-')} ${r.requirementName}`,
    standardRef: r.requirementName,
    narrative: `本专业在${r.requirementName}方面的达成度为 ${Math.round(r.attainment * 100)}%。覆盖情况：${r.supportingCourses.join('、')}。改进方向：${r.improvements.join('；')}。`,
  }));
  return { data, model: 'deepseek-v2 (mock)', usage: { prompt_tokens: 2000, completion_tokens: 800 }, latency: simulateLatency() + 500 };
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
    async () => {
      await new Promise(r => setTimeout(r, simulateLatency()));
      return mockExtractNodes(materialCategory);
    },
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
    async () => {
      await new Promise(r => setTimeout(r, simulateLatency()));
      return mockInferRelations();
    },
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
    async () => {
      await new Promise(r => setTimeout(r, simulateLatency()));
      return mockGenerateSuggestions(gaps);
    },
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
  // 后端（mock 与 LLM prompt）按 snake_case 读取报告上下文，这里在请求边界做命名转换
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
    async () => {
      await new Promise(r => setTimeout(r, simulateLatency() + 500));
      return mockGenerateReport(reportContext);
    },
    mapReportItem,
  );
}
