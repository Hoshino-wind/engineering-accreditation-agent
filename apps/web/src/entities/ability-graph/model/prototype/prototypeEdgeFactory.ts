import type {
  AbilityGraphEdge,
  AbilityGraphNode,
} from '../abilityGraph';
import { currentPrototypeNodes } from './prototypeNodes';

const currentNodeById = new Map(
  currentPrototypeNodes.map((node: AbilityGraphNode) => [
    node.id,
    node,
  ]),
);

export type PrototypeEdgeInput = Omit<
  AbilityGraphEdge,
  'edgeVersionId' | 'sourceNodeVersionId' | 'targetNodeVersionId'
> & {
  edgeVersionId?: string;
};

export function prototypeEdge(
  input: PrototypeEdgeInput,
): AbilityGraphEdge {
  const sourceNode = currentNodeById.get(input.sourceId);
  const targetNode = currentNodeById.get(input.targetId);
  if (!sourceNode || !targetNode) {
    throw new Error(`原型关系 ${input.id} 引用了不存在的节点`);
  }
  return {
    ...input,
    edgeVersionId:
      input.edgeVersionId ?? `edge-version:${input.id}:v1`,
    sourceNodeVersionId: sourceNode.nodeVersionId,
    targetNodeVersionId: targetNode.nodeVersionId,
  };
}

export const prototypeBaseEdge = {
  status: 'effective' as const,
  reviewStatus: 'approved' as const,
  effectiveCycle: '2025—2026 学年',
};

export const prototypeDraftEdge = {
  status: 'draft' as const,
  reviewStatus: 'pending' as const,
  effectiveCycle: '2025—2026 学年',
};

