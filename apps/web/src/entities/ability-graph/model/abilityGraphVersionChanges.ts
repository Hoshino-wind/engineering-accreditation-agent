import type {
  AbilityGraphChange,
  AbilityGraphPublishedSnapshot,
  AbilityGraphState,
} from './abilityGraphTypes';
import {
  abilityGraphChangeKindOrder,
  diffAbilityGraphFields,
  getAbilityGraphChangeKind,
  getAbilityGraphEdgeFields,
  getAbilityGraphEdgeSummary,
  getAbilityGraphNodeFields,
  getAbilityGraphNodeSummary,
} from './abilityGraphVersionFields';

export function getAbilityGraphBaselineSnapshot(
  graph: AbilityGraphState,
): AbilityGraphPublishedSnapshot | undefined {
  const targetVersion =
    graph.version.status === 'draft'
      ? graph.version.baseVersion
      : graph.version.name;
  if (!targetVersion) {
    return undefined;
  }
  return graph.publishedSnapshots.find(
    (snapshot) => snapshot.version === targetVersion,
  );
}

export function getAbilityGraphChanges(
  graph: AbilityGraphState,
): AbilityGraphChange[] {
  if (graph.version.status === 'published') {
    return [];
  }
  const baseline = getAbilityGraphBaselineSnapshot(graph);
  if (!baseline) {
    return [];
  }

  const beforeNodes = new Map(
    baseline.nodes
      .filter((node) => node.status !== 'superseded')
      .map((node) => [node.id, node]),
  );
  const afterNodes = new Map(
    graph.nodes
      .filter((node) => node.status !== 'superseded')
      .map((node) => [node.id, node]),
  );
  const nodeIds = new Set([...beforeNodes.keys(), ...afterNodes.keys()]);
  const nodeChanges = Array.from(nodeIds).flatMap((entityId) => {
    const before = beforeNodes.get(entityId);
    const after = afterNodes.get(entityId);
    const changedFields = diffAbilityGraphFields(
      before ? getAbilityGraphNodeFields(before) : undefined,
      after ? getAbilityGraphNodeFields(after) : undefined,
    );
    if (changedFields.length === 0) {
      return [];
    }
    const kind = getAbilityGraphChangeKind(before, after);
    const node = after ?? before;
    if (!node) {
      return [];
    }
    return [
      {
        id: `node:${entityId}`,
        entityId,
        entityKind: 'node' as const,
        kind,
        code: node.code,
        label: node.name,
        beforeSummary: getAbilityGraphNodeSummary(before),
        afterSummary: getAbilityGraphNodeSummary(after),
        changedFields,
      },
    ];
  });

  const beforeEdges = new Map(
    baseline.edges
      .filter((edge) => edge.status !== 'superseded')
      .map((edge) => [edge.id, edge]),
  );
  const afterEdges = new Map(
    graph.edges
      .filter((edge) => edge.status !== 'superseded')
      .map((edge) => [edge.id, edge]),
  );
  const edgeIds = new Set([...beforeEdges.keys(), ...afterEdges.keys()]);
  const allNodes = new Map([...beforeNodes, ...afterNodes]);
  const edgeChanges = Array.from(edgeIds).flatMap((entityId) => {
    const before = beforeEdges.get(entityId);
    const after = afterEdges.get(entityId);
    const changedFields = diffAbilityGraphFields(
      before ? getAbilityGraphEdgeFields(before, allNodes) : undefined,
      after ? getAbilityGraphEdgeFields(after, allNodes) : undefined,
    );
    if (changedFields.length === 0) {
      return [];
    }
    const kind = getAbilityGraphChangeKind(before, after);
    const edge = after ?? before;
    if (!edge) {
      return [];
    }
    return [
      {
        id: `edge:${entityId}`,
        entityId,
        entityKind: 'edge' as const,
        kind,
        code: edge.relation.toUpperCase(),
        label: getAbilityGraphEdgeSummary(edge, allNodes),
        beforeSummary: getAbilityGraphEdgeSummary(before, allNodes),
        afterSummary: getAbilityGraphEdgeSummary(after, allNodes),
        changedFields,
      },
    ];
  });

  return [...nodeChanges, ...edgeChanges].sort(
    (left, right) =>
      abilityGraphChangeKindOrder[left.kind] -
        abilityGraphChangeKindOrder[right.kind] ||
      left.code.localeCompare(right.code),
  );
}
