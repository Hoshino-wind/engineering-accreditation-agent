import {
  abilityGraphCapabilityLevelLabels,
  type AbilityGraphChangeKind,
  type AbilityGraphEdge,
  type AbilityGraphFieldChange,
  type AbilityGraphNode,
} from './abilityGraphTypes';

interface ComparableField {
  label: string;
  value: string;
}

export const abilityGraphChangeKindOrder: Record<
  AbilityGraphChangeKind,
  number
> = {
  modified: 0,
  added: 1,
  removed: 2,
};

export const abilityGraphChangeKindLabels: Record<
  AbilityGraphChangeKind,
  string
> = {
  added: '新增',
  modified: '修改',
  removed: '移除',
};

function displayValue(value?: string) {
  return value?.trim() || '—';
}

export function getAbilityGraphNodeFields(node: AbilityGraphNode) {
  return new Map<string, ComparableField>([
    ['name', { label: '名称', value: displayValue(node.name) }],
    [
      'definition',
      { label: '可观察定义', value: displayValue(node.definition) },
    ],
    ['type', { label: '对象类型', value: node.type }],
    [
      'nodeVersionId',
      { label: '节点版本 ID', value: displayValue(node.nodeVersionId) },
    ],
    [
      'capability.domain',
      {
        label: '能力领域',
        value: displayValue(node.capability?.domain),
      },
    ],
    [
      'capability.cognitiveLevel',
      {
        label: '认知层级',
        value: node.capability
          ? abilityGraphCapabilityLevelLabels[
              node.capability.cognitiveLevel
            ]
          : '—',
      },
    ],
    [
      'capability.observableBehaviors',
      {
        label: '可观察行为',
        value:
          node.capability?.observableBehaviors.join('；') || '—',
      },
    ],
    ['owner', { label: '责任人', value: displayValue(node.owner) }],
    ['version', { label: '对象版本', value: displayValue(node.version) }],
    [
      'source.sourceRefId',
      {
        label: '来源引用 ID',
        value: displayValue(node.source.sourceRefId),
      },
    ],
    [
      'source.materialId',
      { label: '材料 ID', value: displayValue(node.source.materialId) },
    ],
    [
      'source.materialVersionId',
      {
        label: '材料版本 ID',
        value: displayValue(node.source.materialVersionId),
      },
    ],
    [
      'source.evidenceFragmentId',
      {
        label: '证据片段 ID',
        value: displayValue(node.source.evidenceFragmentId),
      },
    ],
    [
      'source.material',
      { label: '来源材料', value: displayValue(node.source.material) },
    ],
    [
      'source.version',
      { label: '材料版本', value: displayValue(node.source.version) },
    ],
    [
      'source.coordinate',
      { label: '来源坐标', value: displayValue(node.source.coordinate) },
    ],
  ]);
}

export function getAbilityGraphEdgeFields(
  edge: AbilityGraphEdge,
  nodeMap: Map<string, AbilityGraphNode>,
) {
  return new Map<string, ComparableField>([
    ['relation', { label: '关系类型', value: edge.relation.toUpperCase() }],
    [
      'edgeVersionId',
      { label: '关系版本 ID', value: displayValue(edge.edgeVersionId) },
    ],
    [
      'sourceId',
      {
        label: '起点对象',
        value: nodeMap.get(edge.sourceId)?.code ?? edge.sourceId,
      },
    ],
    [
      'sourceNodeVersionId',
      {
        label: '起点版本 ID',
        value: displayValue(edge.sourceNodeVersionId),
      },
    ],
    [
      'targetId',
      {
        label: '终点对象',
        value: nodeMap.get(edge.targetId)?.code ?? edge.targetId,
      },
    ],
    [
      'targetNodeVersionId',
      {
        label: '终点版本 ID',
        value: displayValue(edge.targetNodeVersionId),
      },
    ],
    [
      'effectiveCycle',
      { label: '生效周期', value: displayValue(edge.effectiveCycle) },
    ],
    [
      'reviewStatus',
      {
        label: '审核状态',
        value: edge.reviewStatus === 'approved' ? '已审核' : '待审核',
      },
    ],
    [
      'capabilityMapping.rationale',
      {
        label: '支撑理由',
        value: displayValue(edge.capabilityMapping?.rationale),
      },
    ],
    [
      'capabilityMapping.targetBehaviors',
      {
        label: '映射行为',
        value:
          edge.capabilityMapping?.targetBehaviors.join('；') || '—',
      },
    ],
    [
      'source.sourceRefId',
      {
        label: '来源引用 ID',
        value: displayValue(edge.source.sourceRefId),
      },
    ],
    [
      'source.materialId',
      { label: '材料 ID', value: displayValue(edge.source.materialId) },
    ],
    [
      'source.materialVersionId',
      {
        label: '材料版本 ID',
        value: displayValue(edge.source.materialVersionId),
      },
    ],
    [
      'source.evidenceFragmentId',
      {
        label: '证据片段 ID',
        value: displayValue(edge.source.evidenceFragmentId),
      },
    ],
    [
      'source.material',
      { label: '来源材料', value: displayValue(edge.source.material) },
    ],
    [
      'source.version',
      { label: '材料版本', value: displayValue(edge.source.version) },
    ],
    [
      'source.coordinate',
      { label: '来源坐标', value: displayValue(edge.source.coordinate) },
    ],
  ]);
}

export function diffAbilityGraphFields(
  before: Map<string, ComparableField> | undefined,
  after: Map<string, ComparableField> | undefined,
): AbilityGraphFieldChange[] {
  const fieldNames = new Set([
    ...(before?.keys() ?? []),
    ...(after?.keys() ?? []),
  ]);

  return Array.from(fieldNames).flatMap((field) => {
    const beforeField = before?.get(field);
    const afterField = after?.get(field);
    const beforeValue = beforeField?.value ?? '不存在';
    const afterValue = afterField?.value ?? '不存在';
    if (beforeValue === afterValue) {
      return [];
    }
    return [
      {
        field,
        label: afterField?.label ?? beforeField?.label ?? field,
        before: beforeValue,
        after: afterValue,
      },
    ];
  });
}

export function getAbilityGraphNodeSummary(node?: AbilityGraphNode) {
  return node ? `${node.code} · ${node.name} · ${node.version}` : '不存在';
}

export function getAbilityGraphEdgeSummary(
  edge: AbilityGraphEdge | undefined,
  nodeMap: Map<string, AbilityGraphNode>,
) {
  if (!edge) {
    return '不存在';
  }
  const source = nodeMap.get(edge.sourceId)?.code ?? edge.sourceId;
  const target = nodeMap.get(edge.targetId)?.code ?? edge.targetId;
  return `${source} → ${edge.relation.toUpperCase()} → ${target}`;
}

export function getAbilityGraphChangeKind<T>(
  before?: T,
  after?: T,
): AbilityGraphChangeKind {
  if (!before) {
    return 'added';
  }
  if (!after) {
    return 'removed';
  }
  return 'modified';
}
