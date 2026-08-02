import type { AttainmentEvaluationItem } from '../../../entities/attainment-evaluation';
import type { CreatedScoreImportBatch } from '../../../entities/score-import-batch';
import type { CapturePilotScoreBatchInput } from '../../../features/capture-pilot-score-batch';

export function createRunWithTwoScoreInputs(
  run: AttainmentEvaluationItem,
): AttainmentEvaluationItem {
  return {
    ...run,
    inputs: [
      {
        evidenceName: '团队互评汇总 v1.0',
        id: 'input-teamwork',
        label: '团队协作',
        weight: 0.6,
      },
      {
        evidenceName: '课堂表现汇总 v1.0',
        id: 'input-classroom',
        label: '课堂表现',
        scoreRate: 0.8,
        weight: 0.4,
      },
    ],
  };
}

export function createPilotScoreBatchResult(
  input: CapturePilotScoreBatchInput,
  validationStatus: 'blocked' | 'pilot_ready' = 'pilot_ready',
): CreatedScoreImportBatch {
  const blocked = validationStatus === 'blocked';
  return {
    batch: {
      baseContextDigest: 'sha256:base',
      baseRunId: input.baseRunId,
      batchId: 'score-batch-ui-001',
      candidateItems: input.items.map((item) => ({ ...item })),
      contentDigest: 'sha256:content',
      createdAt: '2026-08-02T10:00:00+08:00',
      evaluationObjectId: input.evaluationObjectId,
      formalUsable: false,
      profile: 'local-pilot-aggregate:v1',
      recordGranularity: 'aggregate',
      records: blocked
        ? []
        : input.items.map((item, index) => ({
            ...item,
            recordId: `score-record-${index + 1}`,
            scoreRate: '0.75',
          })),
      schemaVersion: 'score-import-batch:v1',
      scope: 'local_pilot_aggregate',
      sourceKind: 'structured_json',
      validationReport: {
        checks: blocked
          ? [
              {
                affectedInputIds: ['input-classroom'],
                code: 'score_input.sample_scope',
                expected: '42',
                observed: '40',
                status: 'blocked',
              },
            ]
          : [],
        createdAt: '2026-08-02T10:00:00+08:00',
        limitations: ['formal_audit_unavailable'],
        reportDigest: 'sha256:report',
        reportId: 'score-report-ui-001',
        reportVersion: 'score-import-validation:v1',
        validationStatus,
        validatorVersion: 'score-import-validator 0.1.0',
      },
    },
    idempotentReplay: false,
  };
}
