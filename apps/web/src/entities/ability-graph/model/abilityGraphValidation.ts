import {
  getAbilityGraphNodeMap,
  getWorkingAbilityGraphEdges,
  hasCompleteAbilityGraphSource,
} from './abilityGraphModelUtils';
import { getAbilityGraphRelationDefinition } from './abilityGraphRelationSchema';
import {
  abilityGraphNodeTypeLabels,
  type AbilityGraphEdge,
  type AbilityGraphState,
  type AbilityGraphValidationIssue,
} from './abilityGraphTypes';

export function validateAbilityGraphEdge(
  graph: Pick<AbilityGraphState, 'edges' | 'nodes'>,
  edge: AbilityGraphEdge,
): AbilityGraphValidationIssue[] {
  const definition = getAbilityGraphRelationDefinition(edge.relation);
  const nodeMap = getAbilityGraphNodeMap(graph.nodes);
  const sourceNode = nodeMap.get(edge.sourceId);
  const targetNode = nodeMap.get(edge.targetId);
  const issues: AbilityGraphValidationIssue[] = [];

  if (!sourceNode || !targetNode || !definition) {
    issues.push({
      code: 'missing-node',
      message: '关系两端必须引用当前图谱中的有效节点。',
    });
    return issues;
  }

  if (sourceNode.id === targetNode.id) {
    issues.push({
      code: 'self-edge',
      message: '关系起点和终点不能是同一节点。',
    });
  }

  if (!definition.sourceTypes.includes(sourceNode.type)) {
    issues.push({
      code: 'invalid-source-type',
      message: `${definition.label}的起点必须是${definition.sourceTypes
        .map((type) => abilityGraphNodeTypeLabels[type])
        .join('或')}。`,
    });
  }

  if (!definition.targetTypes.includes(targetNode.type)) {
    issues.push({
      code: 'invalid-target-type',
      message: `${definition.label}的终点必须是${definition.targetTypes
        .map((type) => abilityGraphNodeTypeLabels[type])
        .join('或')}。`,
    });
  }

  const hasAllowedEndpoint = definition.endpoints.some(
    (endpoint) =>
      endpoint.sourceType === sourceNode.type &&
      endpoint.targetType === targetNode.type,
  );
  if (
    definition.sourceTypes.includes(sourceNode.type) &&
    definition.targetTypes.includes(targetNode.type) &&
    !hasAllowedEndpoint
  ) {
    issues.push({
      code: 'invalid-target-type',
      message: `${definition.label}不允许${abilityGraphNodeTypeLabels[sourceNode.type]}连接${abilityGraphNodeTypeLabels[targetNode.type]}。`,
    });
  }

  if (edge.sourceNodeVersionId !== sourceNode.nodeVersionId) {
    issues.push({
      code: 'mismatched-source-node-version',
      message: '关系起点版本必须与当前节点版本完全一致。',
    });
  }

  if (edge.targetNodeVersionId !== targetNode.nodeVersionId) {
    issues.push({
      code: 'mismatched-target-node-version',
      message: '关系终点版本必须与当前节点版本完全一致。',
    });
  }

  if (!hasCompleteAbilityGraphSource(edge.source)) {
    issues.push({
      code: 'missing-source',
      message:
        '正式关系必须包含稳定来源引用、材料版本、证据片段和显示坐标。',
    });
  }

  if (edge.relation === 'supports') {
    const mapping = edge.capabilityMapping;
    if (
      !mapping?.rationale.trim() ||
      mapping.targetBehaviors.length === 0
    ) {
      issues.push({
        code: 'missing-capability-mapping',
        message: '课程目标支撑指标点时，必须说明映射理由和可观察行为。',
      });
    } else {
      const allowedBehaviors = new Set(
        getWorkingAbilityGraphEdges(graph.edges)
          .filter(
            (candidate) =>
              candidate.relation === 'expects' &&
              candidate.sourceId === targetNode.id,
          )
          .flatMap(
            (candidate) =>
              nodeMap.get(candidate.targetId)?.capability
                ?.observableBehaviors ?? [],
          ),
      );
      if (
        mapping.targetBehaviors.some(
          (behavior) => !allowedBehaviors.has(behavior),
        )
      ) {
        issues.push({
          code: 'unknown-capability-behavior',
          message: '课程目标映射了指标点所要求能力中不存在的可观察行为。',
        });
      }
    }
  } else if (edge.capabilityMapping) {
    issues.push({
      code: 'unexpected-capability-mapping',
      message: '只有课程目标支撑指标点的关系可以声明能力行为映射。',
    });
  }

  const duplicate = getWorkingAbilityGraphEdges(graph.edges).some(
    (candidate) =>
      candidate.id !== edge.id &&
      candidate.relation === edge.relation &&
      candidate.sourceId === edge.sourceId &&
      candidate.targetId === edge.targetId,
  );

  if (duplicate) {
    issues.push({
      code: 'duplicate-edge',
      message: '相同起点、关系类型和终点的关系已经存在。',
    });
  }

  return issues;
}
