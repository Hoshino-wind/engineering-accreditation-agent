export type ImprovementCasePriority = 'high' | 'medium';

export type ImprovementCaseStatus =
  | 'diagnosing'
  | 'action-planned'
  | 'in-progress'
  | 'awaiting-reevaluation'
  | 'awaiting-decision'
  | 'closed';

export type ImprovementSourceModule = 'M3' | 'M5' | 'M6';

export type ImprovementEffectiveness =
  | 'effective'
  | 'partially-effective'
  | 'ineffective';

export interface ImprovementSourceRef {
  evidenceHash: string;
  label: string;
  module: ImprovementSourceModule;
  objectId: string;
}

export interface ImprovementRootCause {
  category: string;
  evidence: string;
  summary: string;
}

export interface ImprovementAction {
  approvedAt?: string;
  completedAt?: string;
  dueAt: string;
  owner: string;
  target: string;
  title: string;
  verificationMethod: string;
}

export interface ImprovementChangeRef {
  id: string;
  kind: 'teaching-resource' | 'rubric' | 'graph';
  name: string;
  status: 'approved' | 'draft';
  version: string;
}

export interface ImprovementReevaluation {
  completedAt: string;
  cycle: string;
  policyVersion: string;
  result: number;
  runId: string;
  target: number;
}

export interface ImprovementCase {
  action: ImprovementAction;
  baseline: number;
  course: string;
  displayId: string;
  existingEffectiveness?: ImprovementEffectiveness;
  id: string;
  priority: ImprovementCasePriority;
  reevaluation?: ImprovementReevaluation;
  rootCause: ImprovementRootCause;
  source: ImprovementSourceRef;
  status: ImprovementCaseStatus;
  title: string;
  changes: ImprovementChangeRef[];
}
