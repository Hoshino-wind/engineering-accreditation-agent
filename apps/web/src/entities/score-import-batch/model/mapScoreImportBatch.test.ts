import type { components } from '@engineering-accreditation/api-client';
import { describe, expect, it } from 'vitest';

import {
  mapCreatedScoreImportBatch,
  mapScoreImportBatch,
} from './mapScoreImportBatch';

type ScoreImportBatchDto =
  components['schemas']['ScoreImportBatchResponse'];

const batchDto: ScoreImportBatchDto = {
  baseContextDigest: 'sha256:base',
  baseRunId: 'eval-2026-068',
  batchId: 'score-batch-001',
  candidateItems: [
    {
      earnedPointsTotal: '321.5',
      inputId: 'input-primary',
      observedStudentCount: 42,
      possiblePointsTotal: '420',
    },
  ],
  contentDigest: 'sha256:content',
  createdAt: '2026-08-02T10:00:00+08:00',
  evaluationObjectId: 'evaluation-ct5',
  formalUsable: false,
  profile: 'local-pilot-aggregate:v1',
  recordGranularity: 'aggregate',
  records: [
    {
      earnedPointsTotal: '321.5',
      inputId: 'input-primary',
      observedStudentCount: 42,
      possiblePointsTotal: '420',
      recordId: 'score-record-001',
      scoreRate: '0.765476',
    },
  ],
  schemaVersion: 'score-import-batch:v1',
  scope: 'local_pilot_aggregate',
  sourceKind: 'structured_json',
  validationReport: {
    checks: [
      {
        affectedInputIds: ['input-primary'],
        code: 'complete_input_coverage',
        expected: 'all inputs',
        observed: 'all inputs',
        status: 'pass',
      },
    ],
    createdAt: '2026-08-02T10:00:00+08:00',
    limitations: ['仅限本地试点汇总，不可用于正式评价'],
    reportDigest: 'sha256:report',
    reportId: 'score-report-001',
    reportVersion: 'score-validation-report:v1',
    validationStatus: 'pilot_ready',
    validatorVersion: 'score-import-validator 0.1.0',
  },
};

describe('mapScoreImportBatch', () => {
  it('preserves the pilot-only boundary and canonical decimal strings', () => {
    const batch = mapScoreImportBatch(batchDto);

    expect(batch).toMatchObject({
      formalUsable: false,
      profile: 'local-pilot-aggregate:v1',
      recordGranularity: 'aggregate',
      scope: 'local_pilot_aggregate',
      sourceKind: 'structured_json',
    });
    expect(batch.records[0]).toMatchObject({
      earnedPointsTotal: '321.5',
      possiblePointsTotal: '420',
      scoreRate: '0.765476',
    });
    expect(batch.validationReport.validationStatus).toBe('pilot_ready');
  });

  it('creates detached nested arrays for the view model', () => {
    const batch = mapScoreImportBatch(batchDto);

    batch.validationReport.checks[0]!.affectedInputIds.push('other');
    batch.validationReport.limitations.push('local-only');

    expect(batchDto.validationReport.checks[0]!.affectedInputIds).toEqual([
      'input-primary',
    ]);
    expect(batchDto.validationReport.limitations).toEqual([
      '仅限本地试点汇总，不可用于正式评价',
    ]);
  });

  it('maps creation replay metadata with the batch', () => {
    expect(
      mapCreatedScoreImportBatch({
        batch: batchDto,
        idempotentReplay: true,
      }),
    ).toMatchObject({
      batch: { batchId: 'score-batch-001' },
      idempotentReplay: true,
    });
  });
});
