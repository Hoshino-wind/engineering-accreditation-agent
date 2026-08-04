import type {
  AbilityGraphData,
  AbilityGraphEdge,
  AbilityGraphNode,
} from '../../entities/ability-graph';
import { requestJson } from './http';

interface GraphApiResponse {
  nodes: Array<{
    id: string;
    kind: string;
    code: string;
    name: string;
    description?: string | null;
    origin?: string | null;
    properties: Record<string, string | number>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    kind: string;
    sourceType: string;
    reviewStatus: string;
    strength?: string | null;
    confidence?: number | null;
    aiReasoning?: string | null;
    candidateId?: string | null;
    reviewedBy?: string | null;
    reviewedAt?: string | null;
    evidenceSummary?: string | null;
  }>;
}

export async function fetchAbilityGraph(): Promise<AbilityGraphData> {
  const graph = await requestJson<GraphApiResponse>('/api/v1/graph');
  return {
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      kind: node.kind as AbilityGraphNode['kind'],
      code: node.code,
      name: node.name,
      description: node.description ?? undefined,
      origin: node.origin as AbilityGraphNode['origin'],
      properties: node.properties,
    })),
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      kind: edge.kind as AbilityGraphEdge['kind'],
      sourceType: edge.sourceType as AbilityGraphEdge['sourceType'],
      reviewStatus: edge.reviewStatus as AbilityGraphEdge['reviewStatus'],
      strength: edge.strength as AbilityGraphEdge['strength'],
      confidence: edge.confidence ?? undefined,
      aiReasoning: edge.aiReasoning ?? undefined,
      candidateId: edge.candidateId ?? undefined,
      reviewedBy: edge.reviewedBy ?? undefined,
      reviewedAt: edge.reviewedAt ?? undefined,
      evidenceSummary: edge.evidenceSummary ?? undefined,
    })),
  };
}

export async function reviewGraphEdge(
  edgeId: string,
  decision: 'accept' | 'modify' | 'reject',
): Promise<AbilityGraphEdge> {
  const edge = await requestJson<GraphApiResponse['edges'][number]>(
    `/api/v1/graph/edges/${edgeId}/review`,
    {
      body: JSON.stringify({ decision }),
      method: 'POST',
    },
  );
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    kind: edge.kind as AbilityGraphEdge['kind'],
    sourceType: edge.sourceType as AbilityGraphEdge['sourceType'],
    reviewStatus: edge.reviewStatus as AbilityGraphEdge['reviewStatus'],
    strength: edge.strength as AbilityGraphEdge['strength'],
    confidence: edge.confidence ?? undefined,
    aiReasoning: edge.aiReasoning ?? undefined,
    candidateId: edge.candidateId ?? undefined,
    reviewedBy: edge.reviewedBy ?? undefined,
    reviewedAt: edge.reviewedAt ?? undefined,
    evidenceSummary: edge.evidenceSummary ?? undefined,
  };
}
