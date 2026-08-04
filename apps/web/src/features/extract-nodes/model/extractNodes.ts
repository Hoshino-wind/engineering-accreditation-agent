// M4 AI 提取节点 —— 接入 LLM 真实调用
import {
  extractNodesViaLLM,
  type ExtractionLLMItem,
} from '../../../shared/api/llmClient';
import { parseUploadedMaterial } from '../../../shared/api/materialsClient';
import type { AbilityGraphNode } from '../../../entities/ability-graph/model/abilityGraph';
import type { UploadedMaterial } from '../../../entities/uploaded-material';

export interface ExtractedNode {
  node: AbilityGraphNode;
  confidence: number;
  sourceExcerpt: string;
  selected: boolean;
}

export interface ExtractionResult {
  nodes: ExtractedNode[];
  model: string;
  usage: { prompt_tokens: number; completion_tokens: number };
  latency: number;
}

/**
 * 调用 AI 提取节点
 * 真实流程：文档分块 → LLM + RAG 检索 → 结构化 JSON 输出 → 教师确认入库
 */
export async function extractNodesFromMaterial(
  material: UploadedMaterial,
): Promise<ExtractionResult> {
  if (material.id.startsWith('material-')) {
    const startedAt = performance.now();
    const response = await parseUploadedMaterial(material.id);
    return {
      nodes: response.extractedNodes.map((item) => ({
        node: {
          id: item.id,
          kind: item.kind as AbilityGraphNode['kind'],
          code: item.code,
          name: item.name,
          description: item.description,
          origin: 'school',
          properties: {},
        },
        confidence: item.confidence,
        sourceExcerpt: item.sourceExcerpt,
        selected: item.confidence >= 0.8,
      })),
      model: 'mvp-file-parser v0.6',
      usage: {
        prompt_tokens: 0,
        completion_tokens: response.candidatesCreated,
      },
      latency: performance.now() - startedAt,
    };
  }

  const response = await extractNodesViaLLM(material.category, material.fileName);

  const nodes: ExtractedNode[] = response.data.map((item: ExtractionLLMItem) => ({
    node: {
      id: `ext-${item.kind.toLowerCase()}-${item.code.toLowerCase()}`,
      kind: item.kind as AbilityGraphNode['kind'],
      code: item.code,
      name: item.name,
      description: item.description,
      origin: 'school',
      properties: {},
    },
    confidence: item.confidence,
    sourceExcerpt: item.sourceExcerpt,
    selected: item.confidence >= 0.9,
  }));

  return {
    nodes,
    model: response.model,
    usage: response.usage,
    latency: response.latency,
  };
}
