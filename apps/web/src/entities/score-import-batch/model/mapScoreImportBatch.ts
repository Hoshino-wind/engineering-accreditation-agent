import type { components } from '@engineering-accreditation/api-client';

import type {
  CreatedScoreImportBatch,
  ScoreImportBatch,
} from './scoreImportBatch';

type ScoreImportBatchDto =
  components['schemas']['ScoreImportBatchResponse'];
type CreatedScoreImportBatchDto =
  components['schemas']['CreateScoreImportBatchResponse'];

export function mapScoreImportBatch(
  dto: ScoreImportBatchDto,
): ScoreImportBatch {
  return {
    baseContextDigest: dto.baseContextDigest,
    baseRunId: dto.baseRunId,
    batchId: dto.batchId,
    candidateItems: dto.candidateItems.map((item) => ({ ...item })),
    contentDigest: dto.contentDigest,
    createdAt: dto.createdAt,
    evaluationObjectId: dto.evaluationObjectId,
    formalUsable: dto.formalUsable,
    profile: dto.profile,
    recordGranularity: dto.recordGranularity,
    records: dto.records.map((record) => ({ ...record })),
    schemaVersion: dto.schemaVersion,
    scope: dto.scope,
    sourceKind: dto.sourceKind,
    validationReport: {
      ...dto.validationReport,
      checks: dto.validationReport.checks.map((check) => ({
        ...check,
        affectedInputIds: [...check.affectedInputIds],
      })),
      limitations: [...dto.validationReport.limitations],
    },
  };
}

export function mapCreatedScoreImportBatch(
  dto: CreatedScoreImportBatchDto,
): CreatedScoreImportBatch {
  return {
    batch: mapScoreImportBatch(dto.batch),
    idempotentReplay: dto.idempotentReplay,
  };
}
