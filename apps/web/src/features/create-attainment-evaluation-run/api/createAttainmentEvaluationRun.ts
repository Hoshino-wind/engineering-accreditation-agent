import type { components } from '@engineering-accreditation/api-client';

import {
  type AttainmentEvaluationItem,
  mapEvaluationRun,
} from '../../../entities/attainment-evaluation';
import { apiClient } from '../../../shared/api/client';

type CreationErrorDetail =
  components['schemas']['EvaluationRunCreationErrorDetail'];

export interface CreateAttainmentEvaluationRunInput {
  evaluationObjectId: string;
  idempotencyKey: string;
  sourceRunId: string;
}

export interface CreatedAttainmentEvaluationRun {
  idempotentReplay: boolean;
  run: AttainmentEvaluationItem;
  sourceRunId: string;
}

export class CreateAttainmentEvaluationRunError extends Error {
  readonly blockers: string[];
  readonly code?: CreationErrorDetail['code'];

  constructor(
    message: string,
    options?: {
      blockers?: string[];
      code?: CreationErrorDetail['code'];
    },
  ) {
    super(message);
    this.name = 'CreateAttainmentEvaluationRunError';
    this.blockers = options?.blockers ?? [];
    this.code = options?.code;
  }
}

function getCreationErrorDetail(error: unknown) {
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
  return detail as CreationErrorDetail;
}

export async function createAttainmentEvaluationRun({
  evaluationObjectId,
  idempotencyKey,
  sourceRunId,
}: CreateAttainmentEvaluationRunInput): Promise<CreatedAttainmentEvaluationRun> {
  try {
    const { data, error } = await apiClient.POST(
      '/api/v1/evaluations/runs',
      {
        body: {
          evaluationObjectId,
          sourceRunId,
        },
        params: {
          header: {
            'Idempotency-Key': idempotencyKey,
          },
        },
      },
    );
    const detail = getCreationErrorDetail(error);
    if (detail) {
      throw new CreateAttainmentEvaluationRunError(detail.message, {
        blockers: detail.blockers ?? undefined,
        code: detail.code,
      });
    }
    if (
      error ||
      !data ||
      data.sourceRunId !== sourceRunId ||
      data.run.sourceRunId !== sourceRunId ||
      data.run.evaluationObject.evaluationObjectId !== evaluationObjectId
    ) {
      throw new CreateAttainmentEvaluationRunError(
        '评价运行创建响应不完整，请重试',
      );
    }
    return {
      idempotentReplay: data.idempotentReplay,
      run: mapEvaluationRun(data.run),
      sourceRunId: data.sourceRunId,
    };
  } catch (error) {
    if (error instanceof CreateAttainmentEvaluationRunError) {
      throw error;
    }
    throw new CreateAttainmentEvaluationRunError(
      '试点重算服务暂不可用，请检查本地 API 后重试',
    );
  }
}
