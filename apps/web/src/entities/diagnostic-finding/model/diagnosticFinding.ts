export type DiagnosticFindingType =
  | 'coverage-gap'
  | 'material-conflict'
  | 'structural-risk'
  | 'version-impact';

export type DiagnosticFindingRisk = 'high' | 'medium' | 'low';

export type DiagnosticRuleKind = 'deterministic' | 'ai-semantic';

export type FindingDecision =
  | 'confirm'
  | 'convert'
  | 'return-recognition'
  | 'exempt'
  | 'dismiss';

export interface DiagnosticEvidenceRef {
  coordinate: string;
  excerpt: string;
  hash: string;
  id: string;
  objectName: string;
  objectVersion: string;
}

export interface DiagnosticPathStep {
  brokenAfter?: boolean;
  detail: string;
  id: string;
  label: string;
  tone?: 'default' | 'danger' | 'target';
}

export interface DiagnosticFinding {
  course: string;
  decisionStatus?: 'confirmed' | 'converted' | 'dismissed' | 'pending';
  evidence: DiagnosticEvidenceRef[];
  graphVersion: string;
  id: string;
  impact: {
    abilityNodes: number;
    courseObjectives: number;
    evaluationInputs: number;
  };
  materialSnapshot: string;
  path: DiagnosticPathStep[];
  relationLabel: string;
  risk: DiagnosticFindingRisk;
  rule: {
    basis: string;
    id: string;
    kind: DiagnosticRuleKind;
    rationale: string;
    runAt: string;
    version: string;
  };
  ruleSetVersion: string;
  sourceNode: string;
  suggestedDestination: 'M3' | 'M4' | 'M7';
  targetNode: string;
  title: string;
  type: DiagnosticFindingType;
}
