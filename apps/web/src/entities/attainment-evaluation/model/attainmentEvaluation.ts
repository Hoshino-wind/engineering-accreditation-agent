export type EvaluationItemStatus =
  | 'awaiting-review'
  | 'approved'
  | 'blocked'
  | 'not-achieved';

export type EvaluationReviewDecision = 'confirm' | 'recalculate';

export interface EvaluationInput {
  evidenceName: string;
  id: string;
  label: string;
  scoreRate?: number;
  weight: number;
}

export interface EvaluationReadinessCheck {
  detail: string;
  id: string;
  label: string;
  status: 'pass' | 'blocked';
}

export interface EvaluationEvidenceRef {
  coordinate: string;
  hash: string;
  id: string;
  name: string;
  version: string;
}

export interface AttainmentEvaluationItem {
  abilityCode: string;
  abilityName: string;
  course: string;
  evidence: EvaluationEvidenceRef[];
  graphVersion: string;
  id: string;
  inputSnapshot: {
    createdAt: string;
    hash: string;
  };
  inputs: EvaluationInput[];
  objectiveCode: string;
  objectiveName: string;
  policyVersion: string;
  programVersion: string;
  readinessChecks: EvaluationReadinessCheck[];
  scoreSnapshot: string;
  status: EvaluationItemStatus;
  studentCount: number;
  threshold: number;
}

export interface AttainmentContribution {
  input: EvaluationInput;
  value?: number;
}

export interface AttainmentCalculation {
  blockers: string[];
  contributions: AttainmentContribution[];
  outcome: 'achieved' | 'not-achieved' | 'blocked';
  ready: boolean;
  score?: number;
  weightTotal: number;
}
