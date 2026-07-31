import type {
  AbilityGraphEdge,
  AbilityGraphImpact,
  AbilityGraphState,
} from './abilityGraphTypes';
import { getAbilityGraphBaselineSnapshot, getAbilityGraphChanges } from './abilityGraphVersionChanges';
import { abilityGraphChangeKindLabels } from './abilityGraphVersionFields';

export function getAbilityGraphImpacts(
  graph: AbilityGraphState,
  changes = getAbilityGraphChanges(graph),
): AbilityGraphImpact[] {
  const baseline = getAbilityGraphBaselineSnapshot(graph);
  const beforeEdges = new Map(
    baseline?.edges.map((edge) => [edge.id, edge]) ?? [],
  );
  const afterEdges = new Map(graph.edges.map((edge) => [edge.id, edge]));

  return graph.downstreamReferences.flatMap((reference) => {
    const relevantChanges = changes.filter((change) => {
      if (change.entityKind === 'node') {
        const nodeVersionIds = [
          graph.nodes.find((node) => node.id === change.entityId)
            ?.nodeVersionId,
          baseline?.nodes.find((node) => node.id === change.entityId)
            ?.nodeVersionId,
        ].filter((id): id is string => Boolean(id));
        return (
          reference.nodeIds.includes(change.entityId) ||
          nodeVersionIds.some((nodeVersionId) =>
            reference.nodeVersionIds.includes(nodeVersionId),
          )
        );
      }
      if (reference.edgeIds.includes(change.entityId)) {
        return true;
      }
      const candidateEdges = [
        afterEdges.get(change.entityId),
        beforeEdges.get(change.entityId),
      ].filter((edge): edge is AbilityGraphEdge => Boolean(edge));
      return Boolean(
        candidateEdges.some(
          (edge) =>
            reference.edgeVersionIds.includes(edge.edgeVersionId) ||
            reference.nodeIds.includes(edge.sourceId) ||
            reference.nodeIds.includes(edge.targetId) ||
            reference.nodeVersionIds.includes(
              edge.sourceNodeVersionId,
            ) ||
            reference.nodeVersionIds.includes(
              edge.targetNodeVersionId,
            ),
        ),
      );
    });
    if (relevantChanges.length === 0) {
      return [];
    }

    return [
      {
        id: `${graph.version.name}:${reference.id}`,
        referenceId: reference.id,
        module: reference.module,
        objectCode: reference.objectCode,
        label: reference.label,
        suggestedAction: reference.suggestedAction,
        severity: reference.module === 'M6' ? 'high' : 'medium',
        reasons: relevantChanges.map(
          (change) =>
            `${abilityGraphChangeKindLabels[change.kind]} ${change.code}（${change.label}）`,
        ),
      },
    ];
  });
}

export function isAbilityGraphChangeReviewed(
  graph: AbilityGraphState,
  changeId: string,
) {
  return graph.changeReviews.some(
    (decision) =>
      decision.draftVersion === graph.version.name &&
      decision.changeId === changeId,
  );
}

export function isAbilityGraphImpactResolved(
  graph: AbilityGraphState,
  referenceId: string,
) {
  return graph.impactDecisions.some(
    (decision) =>
      decision.draftVersion === graph.version.name &&
      decision.referenceId === referenceId,
  );
}
