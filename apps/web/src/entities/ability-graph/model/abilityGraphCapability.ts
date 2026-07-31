import {
  type AbilityGraphEdge,
  type AbilityGraphNode,
  type AbilityGraphState,
} from './abilityGraph';

export type AbilityGraphCapabilityPathStatus =
  | 'closed-loop'
  | 'semantics-gap'
  | 'teaching-gap'
  | 'assessment-gap';

export interface AbilityGraphCapabilityPath {
  assessmentMapped: boolean;
  courseOutcome: AbilityGraphNode;
  directCriteria: AbilityGraphNode[];
  experiments: AbilityGraphNode[];
  mappedBehaviors: string[];
  performanceIndicator: AbilityGraphNode;
  status: AbilityGraphCapabilityPathStatus;
  supportEdge: AbilityGraphEdge;
}

export interface AbilityGraphCapabilityProfile {
  behaviorCoveragePercent: number;
  capability: AbilityGraphNode;
  closedLoopCount: number;
  mappedBehaviors: string[];
  parentOutcome?: AbilityGraphNode;
  paths: AbilityGraphCapabilityPath[];
  performanceIndicators: AbilityGraphNode[];
  status: AbilityGraphCapabilityPathStatus;
}

function getProfileStatus(
  paths: AbilityGraphCapabilityPath[],
  behaviorCoveragePercent: number,
): AbilityGraphCapabilityPathStatus {
  if (paths.length === 0) {
    return 'teaching-gap';
  }
  const priority: AbilityGraphCapabilityPathStatus[] = [
    'semantics-gap',
    'teaching-gap',
    'assessment-gap',
  ];
  const blockingStatus = priority.find((status) =>
    paths.some((path) => path.status === status),
  );
  if (blockingStatus) {
    return blockingStatus;
  }
  return behaviorCoveragePercent === 100 ? 'closed-loop' : 'semantics-gap';
}

function uniqueNodes(nodes: AbilityGraphNode[]) {
  return Array.from(
    new Map(nodes.map((node) => [node.id, node])).values(),
  );
}

export function getAbilityGraphCapabilityProfiles(
  graph: AbilityGraphState,
): AbilityGraphCapabilityProfile[] {
  const nodes = new Map(
    graph.nodes
      .filter((node) => node.status !== 'superseded')
      .map((node) => [node.id, node]),
  );
  const edges = graph.edges.filter((edge) => edge.status !== 'superseded');

  return Array.from(nodes.values())
    .filter((node) => node.type === 'ability')
    .map((capability) => {
      const requiredSkillIds = new Set(
        edges
          .filter(
            (edge) =>
              edge.relation === 'composed-of' &&
              edge.sourceId === capability.id,
          )
          .map((edge) => edge.targetId),
      );
      const assessableTargetIds = new Set([
        capability.id,
        ...requiredSkillIds,
      ]);
      const expectationEdges = edges.filter(
        (edge) =>
          edge.relation === 'expects' &&
          edge.targetId === capability.id,
      );
      const performanceIndicators = uniqueNodes(
        expectationEdges
          .map((edge) => nodes.get(edge.sourceId))
          .filter((node): node is AbilityGraphNode => Boolean(node)),
      );
      const performanceIndicatorIds = new Set(
        performanceIndicators.map((node) => node.id),
      );
      const parentOutcome = edges
        .filter(
          (edge) =>
            edge.relation === 'refines' &&
            performanceIndicatorIds.has(edge.targetId),
        )
        .map((edge) => nodes.get(edge.sourceId))
        .find((node): node is AbilityGraphNode => Boolean(node));

      const paths = edges
        .filter(
          (edge) =>
            edge.relation === 'supports' &&
            performanceIndicatorIds.has(edge.targetId),
        )
        .flatMap((supportEdge) => {
          const courseOutcome = nodes.get(supportEdge.sourceId);
          const performanceIndicator = nodes.get(supportEdge.targetId);
          const expectationEdge = expectationEdges.find(
            (edge) => edge.sourceId === supportEdge.targetId,
          );
          if (
            !courseOutcome ||
            !performanceIndicator ||
            !expectationEdge
          ) {
            return [];
          }

          const courseOutcomeExperimentIds = new Set(
            edges
              .filter(
                (edge) =>
                  edge.relation === 'contributes-to' &&
                  edge.targetId === courseOutcome.id &&
                  nodes.get(edge.sourceId)?.type === 'experiment',
              )
              .map((edge) => edge.sourceId),
          );
          const experiments = uniqueNodes(
            edges
              .filter(
                (edge) =>
                  courseOutcomeExperimentIds.has(edge.sourceId) &&
                  ((edge.relation === 'cultivates' &&
                    edge.targetId === capability.id) ||
                    (edge.relation === 'trains' &&
                      requiredSkillIds.has(edge.targetId))),
              )
              .map((edge) => nodes.get(edge.sourceId))
              .filter(
                (node): node is AbilityGraphNode =>
                  node?.type === 'experiment',
              ),
          );
          const experimentIds = new Set(
            experiments.map((experiment) => experiment.id),
          );
          const taskIds = new Set(
            edges
              .filter(
                (edge) =>
                  edge.relation === 'contains-task' &&
                  experimentIds.has(edge.sourceId),
              )
              .map((edge) => edge.targetId),
          );
          const criterionIds = new Set(
            edges
              .filter(
                (edge) =>
                  edge.relation === 'contains-criterion' &&
                  taskIds.has(edge.sourceId),
              )
              .map((edge) => edge.targetId),
          );
          const semanticallyAssessedCriterionIds = new Set(
            edges
              .filter(
                (edge) =>
                  edge.relation === 'assesses' &&
                  criterionIds.has(edge.sourceId) &&
                  assessableTargetIds.has(edge.targetId),
              )
              .map((edge) => edge.sourceId),
          );
          const directCriteria = uniqueNodes(
            edges
              .filter(
                (edge) =>
                  edge.relation === 'contributes-to' &&
                  edge.targetId === courseOutcome.id &&
                  semanticallyAssessedCriterionIds.has(edge.sourceId),
              )
              .map((edge) => nodes.get(edge.sourceId))
              .filter(
                (node): node is AbilityGraphNode =>
                  node?.type === 'rubric-criterion',
              ),
          );
          const mappedBehaviors = (
            supportEdge.capabilityMapping?.targetBehaviors ?? []
          ).filter((behavior) =>
            capability.capability?.observableBehaviors.includes(behavior),
          );
          const hasSemantics =
            Boolean(capability.capability?.domain.trim()) &&
            Boolean(supportEdge.capabilityMapping?.rationale.trim()) &&
            mappedBehaviors.length > 0;
          const status: AbilityGraphCapabilityPathStatus = !hasSemantics
            ? 'semantics-gap'
            : experiments.length === 0
              ? 'teaching-gap'
              : directCriteria.length === 0
                ? 'assessment-gap'
                : 'closed-loop';

          return [
            {
              assessmentMapped: directCriteria.length > 0,
              courseOutcome,
              directCriteria,
              experiments,
              mappedBehaviors,
              performanceIndicator,
              status,
              supportEdge,
            },
          ];
        });
      const mappedBehaviors = Array.from(
        new Set(paths.flatMap((path) => path.mappedBehaviors)),
      );
      const requiredBehaviors =
        capability.capability?.observableBehaviors ?? [];
      const coveredBehaviors = requiredBehaviors.filter((behavior) =>
        mappedBehaviors.includes(behavior),
      ).length;
      const behaviorCoveragePercent =
        requiredBehaviors.length === 0
          ? 0
          : Math.round((coveredBehaviors / requiredBehaviors.length) * 100);

      return {
        behaviorCoveragePercent,
        capability,
        closedLoopCount: paths.filter(
          (path) => path.status === 'closed-loop',
        ).length,
        mappedBehaviors,
        parentOutcome,
        paths,
        performanceIndicators,
        status: getProfileStatus(paths, behaviorCoveragePercent),
      };
    });
}
