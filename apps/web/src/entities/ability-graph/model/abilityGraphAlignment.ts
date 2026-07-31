import {
  getAbilityGraphNodeMap,
  getWorkingAbilityGraphEdges,
  toAbilityGraphPercent,
} from './abilityGraphModelUtils';
import type {
  AbilityGraphNode,
  AbilityGraphQualityMetric,
  AbilityGraphState,
  CourseOutcomeAlignment,
} from './abilityGraphTypes';
import { validateAbilityGraphEdge } from './abilityGraphValidation';

export function getCourseOutcomeAlignments(
  graph: AbilityGraphState,
): CourseOutcomeAlignment[] {
  const nodeMap = getAbilityGraphNodeMap(graph.nodes);
  const edges = getWorkingAbilityGraphEdges(graph.edges);
  const courseOutcomes = graph.nodes.filter(
    (node) =>
      node.type === 'course-outcome' && node.status !== 'superseded',
  );

  return courseOutcomes.map((courseOutcome) => {
    const supportEdges = edges.filter(
      (edge) =>
        edge.relation === 'supports' &&
        edge.sourceId === courseOutcome.id,
    );
    const supportTargets = supportEdges
      .map((edge) => nodeMap.get(edge.targetId))
      .filter((node): node is AbilityGraphNode => Boolean(node));
    const supportTargetIds = new Set(
      supportTargets.map((node) => node.id),
    );
    const refinedIndicatorIds = new Set(
      edges
        .filter((edge) => edge.relation === 'refines')
        .map((edge) => edge.targetId),
    );
    const accreditationPathComplete =
      supportTargetIds.size > 0 &&
      Array.from(supportTargetIds).every((indicatorId) =>
        refinedIndicatorIds.has(indicatorId),
      ) &&
      supportEdges.every(
        (edge) =>
          !validateAbilityGraphEdge(graph, edge).some((issue) =>
            [
              'missing-capability-mapping',
              'unknown-capability-behavior',
            ].includes(issue.code),
          ),
      );
    const expectedAbilityIds = new Set(
      edges
        .filter(
          (edge) =>
            edge.relation === 'expects' &&
            supportTargetIds.has(edge.sourceId),
        )
        .map((edge) => edge.targetId),
    );
    const requiredSkillIdsByAbility = new Map(
      Array.from(expectedAbilityIds).map((abilityId) => [
        abilityId,
        new Set(
          edges
            .filter(
              (edge) =>
                edge.relation === 'composed-of' &&
                edge.sourceId === abilityId,
            )
            .map((edge) => edge.targetId),
        ),
      ]),
    );
    const requiredSkillIds = new Set(
      Array.from(requiredSkillIdsByAbility.values()).flatMap((ids) =>
        Array.from(ids),
      ),
    );
    const assessableTargetIds = new Set([
      ...expectedAbilityIds,
      ...requiredSkillIds,
    ]);
    const experiments = edges
      .filter(
        (edge) =>
          edge.relation === 'contributes-to' &&
          edge.targetId === courseOutcome.id,
      )
      .map((edge) => nodeMap.get(edge.sourceId))
      .filter(
        (node): node is AbilityGraphNode => node?.type === 'experiment',
      );
    const experimentIds = new Set(experiments.map((node) => node.id));
    const capabilityTargets = edges
      .filter(
        (edge) =>
          (edge.relation === 'cultivates' ||
            edge.relation === 'trains') &&
          experimentIds.has(edge.sourceId) &&
          assessableTargetIds.has(edge.targetId),
      )
      .map((edge) => nodeMap.get(edge.targetId))
      .filter((node): node is AbilityGraphNode => Boolean(node));
    const capabilityTargetIds = new Set(
      capabilityTargets.map((node) => node.id),
    );
    const assessmentTasks = edges
      .filter(
        (edge) =>
          edge.relation === 'contains-task' &&
          experimentIds.has(edge.sourceId),
      )
      .map((edge) => nodeMap.get(edge.targetId))
      .filter((node): node is AbilityGraphNode => Boolean(node));
    const taskIds = new Set(assessmentTasks.map((node) => node.id));
    const criteriaInTasks = new Set(
      edges
        .filter(
          (edge) =>
            edge.relation === 'contains-criterion' &&
            taskIds.has(edge.sourceId),
        )
        .map((edge) => edge.targetId),
    );
    const assessedTargetIdsByCriterion = new Map(
      Array.from(criteriaInTasks).map((criterionId) => [
        criterionId,
        new Set(
          edges
            .filter(
              (edge) =>
                edge.relation === 'assesses' &&
                edge.sourceId === criterionId,
            )
            .map((edge) => edge.targetId),
        ),
      ]),
    );
    const assessedCriterionIds = new Set(
      Array.from(assessedTargetIdsByCriterion.entries())
        .filter(([, targetIds]) =>
          Array.from(targetIds).some((targetId) =>
            assessableTargetIds.has(targetId),
          ),
        )
        .map(([criterionId]) => criterionId),
    );
    const aggregatedCriterionIds = new Set(
      edges
        .filter(
          (edge) =>
            edge.relation === 'contributes-to' &&
            edge.targetId === courseOutcome.id &&
            criteriaInTasks.has(edge.sourceId),
        )
        .map((edge) => edge.sourceId),
    );
    const everyAbilityAssessed =
      expectedAbilityIds.size > 0 &&
      Array.from(expectedAbilityIds).every((abilityId) =>
        Array.from(assessedTargetIdsByCriterion.values()).some(
          (targetIds) =>
            targetIds.has(abilityId) ||
            Array.from(
              requiredSkillIdsByAbility.get(abilityId) ?? [],
            ).some((skillId) => targetIds.has(skillId)),
        ),
      );
    const assessmentPathComplete =
      everyAbilityAssessed &&
      assessedCriterionIds.size > 0 &&
      Array.from(assessedCriterionIds).every((criterionId) =>
        aggregatedCriterionIds.has(criterionId),
      );
    const directCriteria = Array.from(assessedCriterionIds)
      .filter((criterionId) =>
        aggregatedCriterionIds.has(criterionId),
      )
      .map((criterionId) => nodeMap.get(criterionId))
      .filter(
        (node): node is AbilityGraphNode =>
          node?.type === 'rubric-criterion',
      );
    const capabilityPathComplete =
      expectedAbilityIds.size > 0 &&
      Array.from(expectedAbilityIds).every((abilityId) =>
        capabilityTargetIds.has(abilityId),
      );
    const relatedEdges = edges.filter(
      (edge) =>
        edge.sourceId === courseOutcome.id ||
        edge.targetId === courseOutcome.id ||
        experimentIds.has(edge.sourceId) ||
        experimentIds.has(edge.targetId) ||
        taskIds.has(edge.sourceId) ||
        taskIds.has(edge.targetId) ||
        criteriaInTasks.has(edge.sourceId) ||
        criteriaInTasks.has(edge.targetId),
    );
    const hasPendingReview = relatedEdges.some(
      (edge) => edge.reviewStatus === 'pending',
    );
    const structurallyComplete =
      accreditationPathComplete &&
      experiments.length > 0 &&
      capabilityPathComplete &&
      assessmentPathComplete;
    const status = !structurallyComplete
      ? 'blocked'
      : hasPendingReview
        ? 'review'
        : 'ready';

    return {
      accreditationPathComplete,
      assessmentTasks,
      assessmentPathComplete,
      capabilityPathComplete,
      capabilityTargets,
      courseOutcome,
      directCriteria,
      experiments,
      status,
      supportTargets,
    };
  });
}

export function getAbilityGraphQualityMetrics(
  graph: AbilityGraphState,
): AbilityGraphQualityMetric[] {
  const alignments = getCourseOutcomeAlignments(graph);
  const total = alignments.length;
  const supported = alignments.filter(
    (alignment) => alignment.accreditationPathComplete,
  ).length;
  const taught = alignments.filter(
    (alignment) => alignment.experiments.length > 0,
  ).length;
  const assessed = alignments.filter(
    (alignment) => alignment.assessmentPathComplete,
  ).length;
  const capabilityClosed = alignments.filter(
    (alignment) =>
      alignment.capabilityPathComplete &&
      alignment.assessmentPathComplete,
  ).length;

  return [
    {
      key: 'outcome-support',
      label: '产出能力覆盖',
      current: supported,
      total,
      percent: toAbilityGraphPercent(supported, total),
    },
    {
      key: 'teaching-coverage',
      label: '培养路径完整',
      current: taught,
      total,
      percent: toAbilityGraphPercent(taught, total),
    },
    {
      key: 'assessment-coverage',
      label: '直接评价覆盖',
      current: assessed,
      total,
      percent: toAbilityGraphPercent(assessed, total),
    },
    {
      key: 'capability-closure',
      label: '能力评价闭环',
      current: capabilityClosed,
      total,
      percent: toAbilityGraphPercent(capabilityClosed, total),
    },
  ];
}
