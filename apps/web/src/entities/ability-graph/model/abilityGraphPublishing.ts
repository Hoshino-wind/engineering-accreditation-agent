import { getCourseOutcomeAlignments } from './abilityGraphAlignment';
import { getWorkingAbilityGraphEdges } from './abilityGraphModelUtils';
import { countAbilityGraphSchemaIssues } from './abilityGraphSchemaHealth';
import type {
  AbilityGraphPublishCheck,
  AbilityGraphState,
} from './abilityGraphTypes';
import {
  getAbilityGraphBaselineSnapshot,
  getAbilityGraphChanges,
} from './abilityGraphVersionChanges';
import {
  getAbilityGraphImpacts,
  isAbilityGraphChangeReviewed,
  isAbilityGraphImpactResolved,
} from './abilityGraphVersionImpact';

export function getAbilityGraphPublishChecks(
  graph: AbilityGraphState,
): AbilityGraphPublishCheck[] {
  const alignments = getCourseOutcomeAlignments(graph);
  const checks: AbilityGraphPublishCheck[] = [];
  const baseline = getAbilityGraphBaselineSnapshot(graph);
  const changes = getAbilityGraphChanges(graph);
  const impacts = getAbilityGraphImpacts(graph, changes);
  const schemaIssueCount = countAbilityGraphSchemaIssues(graph);

  checks.push({
    id: 'schema',
    label: '关系 Schema',
    detail:
      schemaIssueCount === 0
        ? `所有对象与关系均符合 ${graph.schemaVersionId}，版本和来源引用完整`
        : `${schemaIssueCount} 项对象、关系、版本或来源引用不符合 Schema`,
    status: schemaIssueCount === 0 ? 'pass' : 'blocked',
  });

  const measurableNodes = graph.nodes.filter(
    (node) =>
      node.status !== 'superseded' &&
      (node.type === 'ability' || node.type === 'skill'),
  );
  const nodesWithoutSemantics = measurableNodes.filter((node) => {
    const capability = node.capability;
    return !(
      capability?.domain.trim() &&
      capability.observableBehaviors.some((behavior) => behavior.trim())
    );
  });
  checks.push({
    id: 'capability-semantics',
    label: '能力语义',
    detail:
      nodesWithoutSemantics.length === 0
        ? `${measurableNodes.length} 个能力与技能节点均已定义领域、认知层级和可观察行为`
        : `${nodesWithoutSemantics.map((node) => node.code).join('、')} 缺少完整能力语义`,
    status:
      nodesWithoutSemantics.length === 0 ? 'pass' : 'blocked',
  });

  const unsupported = alignments.filter(
    (alignment) => !alignment.accreditationPathComplete,
  );
  checks.push({
    id: 'support',
    label: '毕业要求支撑',
    detail:
      unsupported.length === 0
        ? `${alignments.length} 个课程目标均已关联专业产出`
        : `${unsupported.map((item) => item.courseOutcome.code).join('、')} 缺少完整毕业要求—指标点支撑`,
    status: unsupported.length === 0 ? 'pass' : 'blocked',
  });

  const untaught = alignments.filter(
    (alignment) => alignment.experiments.length === 0,
  );
  checks.push({
    id: 'teaching',
    label: '实验教学覆盖',
    detail:
      untaught.length === 0
        ? `${alignments.length} 个课程目标均有实验教学活动`
        : `${untaught.map((item) => item.courseOutcome.code).join('、')} 缺少实验教学活动`,
    status: untaught.length === 0 ? 'pass' : 'blocked',
  });

  const uncultivated = alignments.filter(
    (alignment) => !alignment.capabilityPathComplete,
  );
  checks.push({
    id: 'capability-cultivation',
    label: '能力培养路径',
    detail:
      uncultivated.length === 0
        ? `${alignments.length} 个课程目标均有实验到预期能力的培养路径`
        : `${uncultivated.map((item) => item.courseOutcome.code).join('、')} 缺少实验到预期能力的培养路径`,
    status: uncultivated.length === 0 ? 'pass' : 'blocked',
  });

  const unassessed = alignments.filter(
    (alignment) => !alignment.assessmentPathComplete,
  );
  checks.push({
    id: 'assessment',
    label: '直接评价覆盖',
    detail:
      unassessed.length === 0
        ? `${alignments.length} 个课程目标均有可分离评分项`
        : `${unassessed.map((item) => item.courseOutcome.code).join('、')} 缺少完整评价语义或课程目标归集路径`,
    status: unassessed.length === 0 ? 'pass' : 'blocked',
  });

  checks.push({
    id: 'version-baseline',
    label: '版本基线',
    detail:
      graph.version.status === 'published' ||
      (baseline && baseline.schemaVersionId === graph.schemaVersionId)
        ? graph.version.status === 'published'
          ? `${graph.version.name} 是不可变正式快照`
          : `${graph.version.name} 已绑定 ${baseline?.version} 正式快照和 ${graph.schemaVersionId}`
        : baseline
          ? `草稿 ${graph.schemaVersionId} 与基线 ${baseline.schemaVersionId} 不一致`
          : `找不到 ${graph.version.baseVersion ?? '指定'} 正式快照，无法生成可信差异`,
    status:
      graph.version.status === 'published' ||
      (baseline && baseline.schemaVersionId === graph.schemaVersionId)
        ? 'pass'
        : 'blocked',
  });

  checks.push({
    id: 'change-set',
    label: '草稿变更集',
    detail:
      graph.version.status === 'published'
        ? `${graph.version.name} 已固化为正式快照`
        : changes.length > 0
          ? `当前草稿包含 ${changes.length} 项可审核差异`
          : '当前草稿与正式基线无实际差异，不应生成空版本',
    status:
      graph.version.status === 'published' || changes.length > 0
        ? 'pass'
        : 'blocked',
  });

  const unreviewedChanges = changes.filter(
    (change) => !isAbilityGraphChangeReviewed(graph, change.id),
  );
  checks.push({
    id: 'change-review',
    label: '变更逐项审核',
    detail:
      unreviewedChanges.length === 0
        ? `${changes.length} 项变更均已形成审核决定`
        : `${unreviewedChanges.length} / ${changes.length} 项变更尚未逐项审核`,
    status: unreviewedChanges.length === 0 ? 'pass' : 'blocked',
  });

  const unresolvedImpacts = impacts.filter(
    (impact) => !isAbilityGraphImpactResolved(graph, impact.referenceId),
  );
  checks.push({
    id: 'impact-disposition',
    label: '下游影响处置',
    detail:
      unresolvedImpacts.length === 0
        ? `${impacts.length} 个受影响对象均已指定后续动作`
        : `${unresolvedImpacts.length} / ${impacts.length} 个受影响对象尚未处置`,
    status: unresolvedImpacts.length === 0 ? 'pass' : 'blocked',
  });

  const pendingEdges = getWorkingAbilityGraphEdges(graph.edges).filter(
    (edge) => edge.reviewStatus === 'pending',
  );
  const unreviewedPendingEdges = pendingEdges.filter(
    (edge) => !isAbilityGraphChangeReviewed(graph, `edge:${edge.id}`),
  );
  checks.push({
    id: 'review',
    label: '审核决定',
    detail:
      unreviewedPendingEdges.length === 0
        ? '所有正式关系均具备审核决定'
        : `${unreviewedPendingEdges.length} 条草稿关系仍缺少逐项审核决定`,
    status: unreviewedPendingEdges.length === 0 ? 'pass' : 'blocked',
  });

  const draftNodes = graph.nodes.filter((node) => node.status === 'draft');
  if (draftNodes.length > 0) {
    checks.push({
      id: 'node-revisions',
      label: '节点修订',
      detail: `${draftNodes.length} 个节点修订将在发布时固化为新版本`,
      status: 'warning',
    });
  }

  return checks;
}

export function canPublishAbilityGraph(checks: AbilityGraphPublishCheck[]) {
  return checks.every((check) => check.status !== 'blocked');
}

export function getNextAbilityGraphVersion(versionName: string) {
  const match = /^v(\d+)\.(\d+)$/.exec(versionName);
  if (!match) {
    return `${versionName}-next`;
  }
  return `v${match[1]}.${Number(match[2]) + 1}`;
}
