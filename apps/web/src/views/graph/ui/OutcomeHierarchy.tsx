import { Card, Input, Tag, Typography } from 'antd';

import {
  getAbilityGraphNodeById,
  validateAbilityGraphEdge,
  type AbilityGraphNode,
  type AbilityGraphState,
} from '../../../entities/ability-graph';

const { Text } = Typography;

interface OutcomeHierarchyProps {
  graph: AbilityGraphState;
  onSelect: (nodeId: string) => void;
  selectedId?: string;
}

export function OutcomeHierarchy({
  graph,
  onSelect,
  selectedId,
}: OutcomeHierarchyProps) {
  const outcomes = graph.nodes.filter(
    (node) =>
      node.type === 'graduate-outcome' && node.status !== 'superseded',
  );
  const workingEdges = graph.edges.filter(
    (edge) =>
      edge.relation === 'refines' && edge.status !== 'superseded',
  );

  return (
    <Card
      className="graph-workbench-panel graph-outcome-tree"
      size="small"
      title="毕业要求层级"
    >
      <Input.Search allowClear placeholder="搜索毕业要求" />
      <div className="graph-outcome-tree-list">
        {outcomes.map((outcome) => {
          const indicators = workingEdges
            .filter((edge) => edge.sourceId === outcome.id)
            .map((edge) =>
              getAbilityGraphNodeById(graph, edge.targetId),
            )
            .filter((node): node is AbilityGraphNode => Boolean(node));
          const coveredIndicatorCount = indicators.filter((indicator) =>
            graph.edges.some(
              (edge) =>
                edge.status !== 'superseded' &&
                edge.relation === 'supports' &&
                edge.targetId === indicator.id &&
                !validateAbilityGraphEdge(graph, edge).some((issue) =>
                  [
                    'missing-capability-mapping',
                    'unknown-capability-behavior',
                  ].includes(issue.code),
                ),
            ),
          ).length;
          const outcomeCovered =
            indicators.length > 0 &&
            coveredIndicatorCount === indicators.length;

          return (
            <div className="graph-outcome-group" key={outcome.id}>
              <button
                className={
                  selectedId === outcome.id
                    ? 'graph-outcome-row graph-outcome-row--selected'
                    : 'graph-outcome-row'
                }
                onClick={() => onSelect(outcome.id)}
                type="button"
              >
                <span>
                  <Text code>{outcome.code}</Text>
                  <Text strong>{outcome.name}</Text>
                </span>
                <Tag color={outcomeCovered ? 'success' : 'warning'}>
                  {coveredIndicatorCount} / {indicators.length} 指标点
                </Tag>
              </button>
              {indicators.map((indicator) => (
                <button
                  className={
                    selectedId === indicator.id
                      ? 'graph-outcome-row graph-outcome-row--child graph-outcome-row--selected'
                      : 'graph-outcome-row graph-outcome-row--child'
                  }
                  key={indicator.id}
                  onClick={() => onSelect(indicator.id)}
                  type="button"
                >
                  <span>
                    <Text code>{indicator.code}</Text>
                    <Text>{indicator.name}</Text>
                  </span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
