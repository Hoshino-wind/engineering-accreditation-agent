export interface ScoreImportCandidateItem {
  earnedPointsTotal: string | null;
  inputId: string;
  observedStudentCount: number | null;
  possiblePointsTotal: string | null;
}

export interface ScoreImportRecord {
  earnedPointsTotal: string;
  inputId: string;
  observedStudentCount: number;
  possiblePointsTotal: string;
  recordId: string;
  scoreRate: string;
}

export interface ScoreValidationCheck {
  affectedInputIds: string[];
  code: string;
  expected: string;
  observed: string;
  status: 'pass' | 'blocked';
}

export interface ScoreValidationReport {
  checks: ScoreValidationCheck[];
  createdAt: string;
  limitations: string[];
  reportDigest: string;
  reportId: string;
  reportVersion: string;
  validationStatus: 'blocked' | 'pilot_ready';
  validatorVersion: string;
}

export interface ScoreImportBatch {
  baseContextDigest: string;
  baseRunId: string;
  batchId: string;
  candidateItems: ScoreImportCandidateItem[];
  contentDigest: string;
  createdAt: string;
  evaluationObjectId: string;
  formalUsable: false;
  profile: 'local-pilot-aggregate:v1';
  recordGranularity: 'aggregate';
  records: ScoreImportRecord[];
  schemaVersion: 'score-import-batch:v1';
  scope: 'local_pilot_aggregate';
  sourceKind: 'structured_json';
  validationReport: ScoreValidationReport;
}

export interface CreatedScoreImportBatch {
  batch: ScoreImportBatch;
  idempotentReplay: boolean;
}
