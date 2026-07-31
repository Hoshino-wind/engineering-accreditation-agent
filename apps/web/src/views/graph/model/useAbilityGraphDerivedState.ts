import { useMemo } from 'react';

import {
  getAbilityGraphChanges,
  getAbilityGraphImpacts,
  getAbilityGraphNodeById,
  getAbilityGraphPublishChecks,
  getAbilityGraphQualityMetrics,
  getCourseOutcomeAlignments,
  type AbilityGraphState,
} from '../../../entities/ability-graph';

interface AbilityGraphDerivedStateOptions {
  graph: AbilityGraphState;
  selectedCourseOutcomeId: string;
  selectedNodeId: string;
  selectedOutcomeId: string;
}

export function useAbilityGraphDerivedState({
  graph,
  selectedCourseOutcomeId,
  selectedNodeId,
  selectedOutcomeId,
}: AbilityGraphDerivedStateOptions) {
  const alignments = useMemo(
    () => getCourseOutcomeAlignments(graph),
    [graph],
  );
  const qualityMetrics = useMemo(
    () => getAbilityGraphQualityMetrics(graph),
    [graph],
  );
  const publishChecks = useMemo(
    () => getAbilityGraphPublishChecks(graph),
    [graph],
  );
  const changes = useMemo(() => getAbilityGraphChanges(graph), [graph]);
  const impacts = useMemo(
    () => getAbilityGraphImpacts(graph, changes),
    [changes, graph],
  );
  const blockingChecks = publishChecks.filter(
    (check) => check.status === 'blocked',
  );
  const hardBlockingChecks = blockingChecks.filter(
    (check) => !check.confirmOnPublish,
  );
  const selectedAlignment =
    alignments.find(
      (alignment) =>
        alignment.courseOutcome.id === selectedCourseOutcomeId,
    ) ?? alignments[0];
  const selectedNode = getAbilityGraphNodeById(graph, selectedNodeId);
  const selectedSupportEdge = graph.edges.find(
    (edge) =>
      edge.status !== 'superseded' &&
      edge.relation === 'supports' &&
      edge.sourceId === selectedAlignment?.courseOutcome.id &&
      edge.targetId === selectedOutcomeId,
  );
  const selectedSupportTarget = getAbilityGraphNodeById(
    graph,
    selectedSupportEdge?.targetId,
  );
  return {
    alignments,
    blockingChecks,
    changes,
    hardBlockingChecks,
    impacts,
    publishChecks,
    qualityMetrics,
    selectedAlignment,
    selectedNode,
    selectedSupportEdge,
    selectedSupportTarget,
  };
}
