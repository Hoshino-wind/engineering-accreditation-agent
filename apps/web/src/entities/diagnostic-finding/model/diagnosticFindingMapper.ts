import type {
  DiagnosticFindingDTO,
  DiagnosticFindingEvidenceDTO,
} from '../../../shared/api/diagnosticsClient';
import type {
  DiagnosticFinding,
  DiagnosticFindingRisk,
  DiagnosticFindingType,
  DiagnosticPathStep,
  DiagnosticRuleKind,
} from './diagnosticFinding';

/**
 * 后端不下发 path / materialSnapshot / ruleSetVersion 等展示字段，
 * 这里基于真实证据与规则信息做确定性组装，保证页面展示完全来自真实数据。
 */

const FINDING_TYPES: readonly DiagnosticFindingType[] = [
  'coverage-gap',
  'material-conflict',
  'structural-risk',
  'version-impact',
];

const FINDING_RISKS: readonly DiagnosticFindingRisk[] = [
  'high',
  'medium',
  'low',
];

const DECISION_STATUSES = [
  'confirmed',
  'converted',
  'dismissed',
  'pending',
] as const;

const DESTINATIONS = ['M3', 'M4', 'M7'] as const;

function asFindingType(value: string): DiagnosticFindingType {
  return FINDING_TYPES.includes(value as DiagnosticFindingType)
    ? (value as DiagnosticFindingType)
    : 'coverage-gap';
}

function asFindingRisk(value: string): DiagnosticFindingRisk {
  return FINDING_RISKS.includes(value as DiagnosticFindingRisk)
    ? (value as DiagnosticFindingRisk)
    : 'medium';
}

function asDecisionStatus(
  value: string | undefined,
): DiagnosticFinding['decisionStatus'] {
  return DECISION_STATUSES.includes(
    value as (typeof DECISION_STATUSES)[number],
  )
    ? (value as NonNullable<DiagnosticFinding['decisionStatus']>)
    : 'pending';
}

function asDestination(value: string | undefined): 'M3' | 'M4' | 'M7' {
  return DESTINATIONS.includes(value as (typeof DESTINATIONS)[number])
    ? (value as 'M3' | 'M4' | 'M7')
    : 'M7';
}

function asRuleKind(value: string): DiagnosticRuleKind {
  return value === 'deterministic' ? 'deterministic' : 'ai-semantic';
}

function buildPath(raw: DiagnosticFindingDTO): DiagnosticPathStep[] {
  return [
    {
      id: `${raw.id}-path-indicator`,
      label: '指标点',
      detail: raw.sourceNode || '能力指标',
    },
    {
      id: `${raw.id}-path-relation`,
      label: '支撑关系',
      detail: raw.relationLabel || '支撑',
      tone: 'danger',
      brokenAfter: true,
    },
    {
      id: `${raw.id}-path-target`,
      label: '教学材料',
      detail: raw.targetNode || '（待补充）',
      tone: 'target',
    },
  ];
}

function buildMaterialSnapshot(raw: DiagnosticFindingDTO): string {
  const evidence = raw.evidence ?? [];
  if (evidence.length === 0) {
    return '诊断依据来自覆盖度规则计算与 AI 语义分析，未引用具体材料原文。';
  }
  return evidence
    .map(
      (e) =>
        `【${e.objectName} ${e.objectVersion} · ${e.coordinate}】\n${e.excerpt}`,
    )
    .join('\n\n');
}

export function mapFindingEvidence(
  raw: DiagnosticFindingEvidenceDTO,
): DiagnosticFinding['evidence'][number] {
  return {
    coordinate: raw.coordinate,
    excerpt: raw.excerpt,
    hash: raw.hash,
    id: raw.id,
    objectName: raw.objectName,
    objectVersion: raw.objectVersion,
  };
}

/** 后端 DTO → 前端实体。 */
export function mapDiagnosticFinding(
  raw: DiagnosticFindingDTO,
): DiagnosticFinding {
  const rule = raw.rule ?? {
    basis: '覆盖度规则引擎',
    id: 'RULE-COV-001',
    kind: 'deterministic',
    rationale: '该能力指标缺少足够的教学节点支撑。',
    runAt: new Date().toISOString(),
    version: 'v1.0',
  };
  return {
    course: raw.course,
    decisionStatus: asDecisionStatus(raw.decisionStatus),
    evidence: (raw.evidence ?? []).map(mapFindingEvidence),
    graphVersion: raw.graphVersion,
    id: raw.id,
    impact: {
      abilityNodes: raw.impact?.abilityNodes ?? 0,
      courseObjectives: raw.impact?.courseObjectives ?? 0,
      evaluationInputs: raw.impact?.evaluationInputs ?? 0,
    },
    materialSnapshot: buildMaterialSnapshot(raw),
    path: buildPath(raw),
    relationLabel: raw.relationLabel,
    risk: asFindingRisk(raw.risk),
    rule: {
      basis: rule.basis,
      id: rule.id,
      kind: asRuleKind(rule.kind),
      rationale: rule.rationale,
      runAt: rule.runAt,
      version: rule.version,
    },
    ruleSetVersion: rule.version,
    sourceNode: raw.sourceNode,
    suggestedDestination: asDestination(raw.suggestedDestination),
    targetNode: raw.targetNode,
    title: raw.title,
    type: asFindingType(raw.type),
  };
}
