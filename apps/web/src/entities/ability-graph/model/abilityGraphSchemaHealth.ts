import {
  getWorkingAbilityGraphEdges,
  hasCompleteAbilityGraphSource,
} from './abilityGraphModelUtils';
import {
  ABILITY_GRAPH_SCHEMA_VERSION_ID,
  type AbilityGraphState,
} from './abilityGraphTypes';
import { validateAbilityGraphEdge } from './abilityGraphValidation';

export function countAbilityGraphSchemaIssues(graph: AbilityGraphState) {
  const invalidEdges = getWorkingAbilityGraphEdges(graph.edges).flatMap(
    (edge) =>
      validateAbilityGraphEdge(graph, edge).map((issue) => ({
        edge,
        issue,
      })),
  );
  const workingNodes = graph.nodes.filter(
    (node) => node.status !== 'superseded',
  );
  const incompleteNodes = workingNodes.filter(
    (node) =>
      !node.nodeVersionId?.trim() ||
      !hasCompleteAbilityGraphSource(node.source),
  );
  const duplicateNodeIds =
    workingNodes.length -
    new Set(workingNodes.map((node) => node.id)).size;
  const duplicateNodeVersionIds =
    workingNodes.length -
    new Set(workingNodes.map((node) => node.nodeVersionId)).size;
  const workingEdges = getWorkingAbilityGraphEdges(graph.edges);
  const courseOutcomes = workingNodes.filter(
    (node) => node.type === 'course-outcome',
  );
  const experiments = workingNodes.filter(
    (node) => node.type === 'experiment',
  );
  const courseIdsByOutcome = new Map(
    courseOutcomes.map((node) => [
      node.id,
      workingEdges
        .filter(
          (edge) =>
            edge.relation === 'defines' &&
            edge.targetId === node.id,
        )
        .map((edge) => edge.sourceId),
    ]),
  );
  const courseIdsByExperiment = new Map(
    experiments.map((node) => [
      node.id,
      workingEdges
        .filter(
          (edge) =>
            edge.relation === 'belongs-to' &&
            edge.sourceId === node.id,
        )
        .map((edge) => edge.targetId),
    ]),
  );
  const invalidCourseOwnershipCount = [
    ...courseIdsByOutcome.values(),
    ...courseIdsByExperiment.values(),
  ].filter((owners) => owners.length !== 1).length;
  const crossCourseContributionCount = workingEdges.filter((edge) => {
    if (edge.relation !== 'contributes-to') {
      return false;
    }
    const source = workingNodes.find((node) => node.id === edge.sourceId);
    if (source?.type !== 'experiment') {
      return false;
    }
    const experimentCourses =
      courseIdsByExperiment.get(source.id) ?? [];
    const outcomeCourses = courseIdsByOutcome.get(edge.targetId) ?? [];
    return (
      experimentCourses.length !== 1 ||
      outcomeCourses.length !== 1 ||
      experimentCourses[0] !== outcomeCourses[0]
    );
  }).length;
  const incompleteEdgeVersionIds = workingEdges.filter(
    (edge) => !edge.edgeVersionId?.trim(),
  ).length;
  const duplicateEdgeIds =
    workingEdges.length -
    new Set(workingEdges.map((edge) => edge.id)).size;
  const duplicateEdgeVersionIds =
    workingEdges.length -
    new Set(workingEdges.map((edge) => edge.edgeVersionId)).size;

  return (
    invalidEdges.length +
    incompleteNodes.length +
    duplicateNodeIds +
    duplicateNodeVersionIds +
    incompleteEdgeVersionIds +
    duplicateEdgeIds +
    duplicateEdgeVersionIds +
    invalidCourseOwnershipCount +
    crossCourseContributionCount +
    workingNodes.filter(
      (node) =>
        node.type !== 'ability' &&
        node.type !== 'skill' &&
        Boolean(node.capability),
    ).length +
    (graph.schemaVersionId === ABILITY_GRAPH_SCHEMA_VERSION_ID ? 0 : 1)
  );
}
