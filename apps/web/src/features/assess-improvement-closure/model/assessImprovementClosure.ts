import type {
  ImprovementCase,
  ImprovementEffectiveness,
} from '../../../entities/improvement-case';

export interface ImprovementClosureCheck {
  detail: string;
  id:
    | 'source'
    | 'analysis'
    | 'change'
    | 'reevaluation'
    | 'effectiveness';
  label: string;
  status: 'complete' | 'pending';
}

export interface ImprovementClosureAssessment {
  blockers: string[];
  canRequestClosure: boolean;
  checks: ImprovementClosureCheck[];
  requiresRevisedAction: boolean;
}

export function assessImprovementClosure(
  improvementCase: ImprovementCase,
  draftEffectiveness?: ImprovementEffectiveness,
): ImprovementClosureAssessment {
  const effectiveness =
    draftEffectiveness ?? improvementCase.existingEffectiveness;
  const hasSource = Boolean(
    improvementCase.source.objectId &&
      improvementCase.source.evidenceHash,
  );
  const hasApprovedAction = Boolean(
    improvementCase.rootCause.summary &&
      improvementCase.rootCause.evidence &&
      improvementCase.action.owner &&
      improvementCase.action.dueAt &&
      improvementCase.action.target &&
      improvementCase.action.verificationMethod &&
      improvementCase.action.approvedAt,
  );
  const hasActualObjectVersion = improvementCase.changes.some(
    (change) =>
      change.kind !== 'graph' && change.status === 'approved',
  );
  const hasGraphVersion = improvementCase.changes.some(
    (change) => change.kind === 'graph',
  );
  const hasReevaluation = Boolean(improvementCase.reevaluation);
  const hasEffectiveness = Boolean(effectiveness);
  const requiresRevisedAction =
    effectiveness === 'partially-effective' ||
    effectiveness === 'ineffective';
  const checks: ImprovementClosureCheck[] = [
    {
      detail: hasSource
        ? improvementCase.source.objectId
        : '缺少来源对象或证据哈希',
      id: 'source',
      label: '来源事实已确认',
      status: hasSource ? 'complete' : 'pending',
    },
    {
      detail: hasApprovedAction ? '原因、措施与验证计划完整' : '尚未批准完整措施',
      id: 'analysis',
      label: '原因与措施已批准',
      status: hasApprovedAction ? 'complete' : 'pending',
    },
    {
      detail:
        hasActualObjectVersion && hasGraphVersion
          ? '实际教学对象与图谱版本均已关联'
          : '必须同时关联实际对象新版本和图谱版本',
      id: 'change',
      label: '实际对象新版本已关联',
      status:
        hasActualObjectVersion && hasGraphVersion
          ? 'complete'
          : 'pending',
    },
    {
      detail: improvementCase.reevaluation
        ? improvementCase.reevaluation.runId
        : '尚未关联后续评价运行',
      id: 'reevaluation',
      label: '复评运行已关联',
      status: hasReevaluation ? 'complete' : 'pending',
    },
    {
      detail: hasEffectiveness ? '已形成负责人判断' : '需要人工确认有效性',
      id: 'effectiveness',
      label: '有效性结论待确认',
      status: hasEffectiveness ? 'complete' : 'pending',
    },
  ];
  const blockers = checks
    .filter((check) => check.status === 'pending')
    .map((check) => check.detail);

  if (requiresRevisedAction) {
    blockers.push('部分有效或无效必须修订或新增改进措施');
  }

  return {
    blockers,
    canRequestClosure:
      checks.every((check) => check.status === 'complete') &&
      effectiveness === 'effective',
    checks,
    requiresRevisedAction,
  };
}
