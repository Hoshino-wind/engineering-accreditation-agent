import {
  abilityGraphNodeTypeLabels,
  getAbilityGraphNodeById,
  getAbilityGraphRelationDefinition,
  type AbilityGraphRelationType,
  type AbilityGraphState,
} from '../../../entities/ability-graph';

export function getGraphRelationFormModel(
  graph: AbilityGraphState,
  relation?: AbilityGraphRelationType,
  sourceId?: string,
  targetId?: string,
) {
  const definition = relation
    ? getAbilityGraphRelationDefinition(relation)
    : undefined;
  const sourceNode = getAbilityGraphNodeById(graph, sourceId);
  const targetNode = getAbilityGraphNodeById(graph, targetId);
  const sourceLabel =
    definition?.sourceTypes
      .map((type) => abilityGraphNodeTypeLabels[type])
      .join(' / ') ?? '来源对象';
  const targetLabel =
    definition?.targetTypes
      .map((type) => abilityGraphNodeTypeLabels[type])
      .join(' / ') ?? '目标对象';
  const sourceOptions = graph.nodes
    .filter(
      (node) =>
        node.status !== 'superseded' &&
        definition?.sourceTypes.includes(node.type),
    )
    .map((node) => ({
      label: `${node.code} · ${node.name}`,
      value: node.id,
    }));
  const targetOptions = graph.nodes
    .filter(
      (node) =>
        node.status !== 'superseded' &&
        definition?.endpoints.some(
          (endpoint) =>
            endpoint.sourceType === sourceNode?.type &&
            endpoint.targetType === node.type,
        ),
    )
    .map((node) => ({
      label: `${node.code} · ${node.name}`,
      value: node.id,
    }));
  const targetBehaviorOptions =
    targetNode?.type === 'performance-indicator'
      ? Array.from(
          new Set(
            graph.edges
              .filter(
                (edge) =>
                  edge.status !== 'superseded' &&
                  edge.relation === 'expects' &&
                  edge.sourceId === targetNode.id,
              )
              .flatMap(
                (edge) =>
                  getAbilityGraphNodeById(graph, edge.targetId)?.capability
                    ?.observableBehaviors ?? [],
              ),
          ),
        ).map((behavior) => ({
          label: behavior,
          value: behavior,
        }))
      : [];

  return {
    definition,
    requiresCapabilityMapping:
      relation === 'supports' &&
      targetNode?.type === 'performance-indicator',
    sourceLabel,
    sourceNode,
    sourceOptions,
    targetBehaviorOptions,
    targetLabel,
    targetOptions,
  };
}
