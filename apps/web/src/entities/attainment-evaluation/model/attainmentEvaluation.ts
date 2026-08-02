export type EvaluationItemStatus =
  | 'awaiting-review'
  | 'approved'
  | 'blocked'
  | 'not-achieved';

export type EvaluationReviewDecision = 'confirm' | 'recalculate';
export type EvaluationApprovalStatus =
  | 'not_submitted'
  | 'pending'
  | 'approved'
  | 'rejected';
export type AttainmentOutcome = 'achieved' | 'not-achieved';
export type EvaluationPreflightStatus = 'ready' | 'blocked';
export type EvaluationPreflightOwner =
  | 'score_input'
  | 'ability_graph'
  | 'evaluation_policy'
  | 'evaluation_owner';
export type EvaluationPreflightAction =
  | 'none'
  | 'prepare_score_data'
  | 'repair_graph_relation'
  | 'review_evaluation_policy'
  | 'inspect_input_snapshot';

export interface EvaluationPreflightCheck {
  action: EvaluationPreflightAction;
  detail: string;
  id: string;
  label: string;
  owner: EvaluationPreflightOwner;
  status: 'pass' | 'blocked';
}

export interface EvaluationPreflightMissingInput {
  evidenceName: string;
  id: string;
  label: string;
}

export interface AttainmentEvaluationPreflight {
  blockedCheckCount: number;
  blockers: string[];
  checks: EvaluationPreflightCheck[];
  evaluationObjectId: string;
  inputSnapshotHash: string;
  missingInputs: EvaluationPreflightMissingInput[];
  passedCheckCount: number;
  reportHash: string;
  reportVersion: 'evaluation-preflight:v1';
  runId: string;
  scope: 'pilot_snapshot';
  status: EvaluationPreflightStatus;
}

export type AttainmentEvaluationPreflightReport =
  AttainmentEvaluationPreflight;

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
  runId: string;
  sourceRunId?: string;
  approvalStatus: EvaluationApprovalStatus;
  readinessStatus: 'ready' | 'blocked';
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
  calculation: AttainmentCalculation;
}

export interface AttainmentEvaluationSummary {
  abilityCode: string;
  abilityName: string;
  approvalStatus: EvaluationApprovalStatus;
  course: string;
  id: string;
  objectiveCode: string;
  objectiveName: string;
  outcome?: AttainmentOutcome;
  presentedRunId: string;
  readinessStatus: 'ready' | 'blocked';
  score?: number;
  status: EvaluationItemStatus;
}

export interface AttainmentEvaluationObjectList {
  items: AttainmentEvaluationSummary[];
  total: number;
}

export interface AttainmentEvaluationRunReference {
  evaluationObjectId: string;
  runId: string;
}

export interface AttainmentContribution {
  input: EvaluationInput;
  value?: number;
}

export interface AttainmentCalculation {
  blockers: string[];
  contributions: AttainmentContribution[];
  outcome?: AttainmentOutcome;
  ready: boolean;
  score?: number;
  weightTotal: number;
}
