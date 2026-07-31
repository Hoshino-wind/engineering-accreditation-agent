import type {
  AbilityGraphPublishedSnapshot,
  AbilityGraphState,
} from './abilityGraphTypes';

export function createAbilityGraphPublishedSnapshot(
  graph: AbilityGraphState,
  publishedAt: string,
): AbilityGraphPublishedSnapshot {
  return {
    version: graph.version.name,
    publishedAt,
    schemaVersionId: graph.schemaVersionId,
    nodes: graph.nodes
      .filter((node) => node.status !== 'superseded')
      .map((node) => ({
        ...node,
        status: 'effective',
        source: { ...node.source },
        ...(node.capability
          ? {
              capability: {
                ...node.capability,
                observableBehaviors: [
                  ...node.capability.observableBehaviors,
                ],
              },
            }
          : {}),
      })),
    edges: graph.edges
      .filter((edge) => edge.status !== 'superseded')
      .map((edge) => ({
        ...edge,
        status: 'effective',
        reviewStatus: 'approved',
        source: { ...edge.source },
        ...(edge.capabilityMapping
          ? {
              capabilityMapping: {
                ...edge.capabilityMapping,
                targetBehaviors: [
                  ...edge.capabilityMapping.targetBehaviors,
                ],
              },
            }
          : {}),
      })),
  };
}
