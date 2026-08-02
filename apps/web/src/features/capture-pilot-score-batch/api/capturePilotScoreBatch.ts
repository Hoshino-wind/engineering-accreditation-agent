import type { components } from '@engineering-accreditation/api-client';

import {
  type CreatedScoreImportBatch,
  mapCreatedScoreImportBatch,
} from '../../../entities/score-import-batch';
import { apiClient } from '../../../shared/api/client';
import {
  isCanonicalDecimalText,
  type PilotScoreBatchItemInput,
} from '../lib/pilotScoreBatchInput';

type ScoreImportErrorDetail =
  components['schemas']['ScoreImportErrorDetail'];
type ScoreImportBatchDto =
  components['schemas']['ScoreImportBatchResponse'];

export interface CapturePilotScoreBatchInput {
  baseRunId: string;
  evaluationObjectId: string;
  idempotencyKey: string;
  items: PilotScoreBatchItemInput[];
}

export class CapturePilotScoreBatchError extends Error {
  readonly batchId?: string;
  readonly code?: ScoreImportErrorDetail['code'];
  readonly status?: number;

  constructor(
    message: string,
    options?: {
      batchId?: string;
      code?: ScoreImportErrorDetail['code'];
      status?: number;
    },
  ) {
    super(message);
    this.name = 'CapturePilotScoreBatchError';
    this.batchId = options?.batchId;
    this.code = options?.code;
    this.status = options?.status;
  }
}

function getScoreImportErrorDetail(error: unknown) {
  if (!error || typeof error !== 'object' || !('detail' in error)) {
    return undefined;
  }
  const detail = error.detail;
  if (
    !detail ||
    typeof detail !== 'object' ||
    !('code' in detail) ||
    !('message' in detail) ||
    typeof detail.code !== 'string' ||
    typeof detail.message !== 'string'
  ) {
    return undefined;
  }
  return detail as ScoreImportErrorDetail;
}

function hasExpectedPilotBoundary(batch: ScoreImportBatchDto) {
  return (
    batch.scope === 'local_pilot_aggregate' &&
    batch.schemaVersion === 'score-import-batch:v1' &&
    batch.profile === 'local-pilot-aggregate:v1' &&
    batch.recordGranularity === 'aggregate' &&
    batch.formalUsable === false &&
    batch.sourceKind === 'structured_json'
  );
}

function responseMatchesSubmission(
  batch: ScoreImportBatchDto,
  items: PilotScoreBatchItemInput[],
) {
  if (batch.candidateItems.length !== items.length) {
    return false;
  }
  const candidates = new Map(
    batch.candidateItems.map((item) => [item.inputId, item]),
  );
  return (
    candidates.size === items.length &&
    items.every((item) => {
      const candidate = candidates.get(item.inputId);
      return (
        candidate?.earnedPointsTotal === item.earnedPointsTotal &&
        candidate.possiblePointsTotal === item.possiblePointsTotal &&
        candidate.observedStudentCount === item.observedStudentCount
      );
    })
  );
}

function validateSubmission(input: CapturePilotScoreBatchInput) {
  if (
    !input.evaluationObjectId ||
    input.evaluationObjectId !== input.evaluationObjectId.trim() ||
    !input.baseRunId ||
    input.baseRunId !== input.baseRunId.trim() ||
    input.idempotencyKey.length < 8 ||
    input.items.length === 0 ||
    input.items.some(
      (item) =>
        !item.inputId ||
        item.inputId !== item.inputId.trim() ||
        !isCanonicalDecimalText(item.earnedPointsTotal) ||
        !isCanonicalDecimalText(item.possiblePointsTotal) ||
        !Number.isInteger(item.observedStudentCount) ||
        item.observedStudentCount < 1,
    )
  ) {
    throw new CapturePilotScoreBatchError(
      '试点汇总准备批次提交内容不完整，请检查后重试',
    );
  }
}

export async function capturePilotScoreBatch(
  input: CapturePilotScoreBatchInput,
): Promise<CreatedScoreImportBatch> {
  validateSubmission(input);
  try {
    const { data, error, response } = await apiClient.POST(
      '/api/v1/evaluations/score-import-batches',
      {
        body: {
          baseRunId: input.baseRunId,
          evaluationObjectId: input.evaluationObjectId,
          items: input.items,
          profile: 'local-pilot-aggregate:v1',
        },
        params: {
          header: {
            'Idempotency-Key': input.idempotencyKey,
          },
        },
      },
    );
    const detail = getScoreImportErrorDetail(error);
    if (detail) {
      throw new CapturePilotScoreBatchError(detail.message, {
        batchId: detail.batchId ?? undefined,
        code: detail.code,
        status: response.status,
      });
    }
    if (
      error ||
      !data ||
      data.batch.evaluationObjectId !== input.evaluationObjectId ||
      data.batch.baseRunId !== input.baseRunId ||
      !hasExpectedPilotBoundary(data.batch) ||
      !responseMatchesSubmission(data.batch, input.items)
    ) {
      throw new CapturePilotScoreBatchError(
        '试点汇总准备批次响应不完整，请取消后重新发起',
        { status: response.status },
      );
    }
    return mapCreatedScoreImportBatch(data);
  } catch (error) {
    if (error instanceof CapturePilotScoreBatchError) {
      throw error;
    }
    throw new CapturePilotScoreBatchError(
      '试点汇总准备批次服务暂不可用，表单内容已保留',
    );
  }
}
