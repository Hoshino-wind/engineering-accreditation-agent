import type {
  AbilityGraphEdge,
  AbilityGraphNode,
  AbilityGraphSourceRef,
} from './abilityGraphTypes';

export function hasCompleteAbilityGraphSource(
  source: AbilityGraphSourceRef,
) {
  return Boolean(
    source.sourceRefId?.trim() &&
      source.materialId?.trim() &&
      source.materialVersionId?.trim() &&
      source.evidenceFragmentId?.trim() &&
      source.material?.trim() &&
      source.version?.trim() &&
      source.coordinate?.trim(),
  );
}

export function getAbilityGraphNodeMap(nodes: AbilityGraphNode[]) {
  return new Map(nodes.map((node) => [node.id, node]));
}

export function getWorkingAbilityGraphEdges(edges: AbilityGraphEdge[]) {
  return edges.filter((edge) => edge.status !== 'superseded');
}

export function toAbilityGraphPercent(current: number, total: number) {
  return total === 0 ? 0 : Math.round((current / total) * 100);
}
