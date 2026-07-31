import type {
  AbilityGraphNode,
  AbilityGraphState,
} from './abilityGraphTypes';

export function getAbilityGraphNodeById(
  graph: AbilityGraphState,
  nodeId?: string,
): AbilityGraphNode | undefined {
  return graph.nodes.find((node) => node.id === nodeId);
}

export function getAbilityGraphCourseForCourseOutcome(
  graph: AbilityGraphState,
  courseOutcomeId: string,
): AbilityGraphNode | undefined {
  const courseId = graph.edges.find(
    (edge) =>
      edge.status !== 'superseded' &&
      edge.relation === 'defines' &&
      edge.targetId === courseOutcomeId,
  )?.sourceId;

  return getAbilityGraphNodeById(graph, courseId);
}

export function getNextAbilityGraphObjectVersion(version: string) {
  const match = /^v(\d+)(?:\.(\d+))?$/.exec(version);
  if (!match) {
    return `${version}-修订`;
  }
  return `v${match[1]}.${Number(match[2] ?? 0) + 1}`;
}
