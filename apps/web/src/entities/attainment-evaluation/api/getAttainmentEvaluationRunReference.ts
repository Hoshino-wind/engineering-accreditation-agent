import { apiClient } from '../../../shared/api/client';
import type { AttainmentEvaluationRunReference } from '../model/attainmentEvaluation';
import { isRequestedEvaluationRunNotFound } from './isRequestedEvaluationRunNotFound';

const unavailableMessage = '评价运行定位服务不可用';

export async function getAttainmentEvaluationRunReference(
  runId: string,
): Promise<AttainmentEvaluationRunReference | null> {
  try {
    const { data, error, response } = await apiClient.GET(
      '/api/v1/evaluations/runs/{run_id}/reference',
      {
        params: {
          path: {
            run_id: runId,
          },
        },
      },
    );

    if (
      response.status === 404 &&
      isRequestedEvaluationRunNotFound(error, runId)
    ) {
      return null;
    }
    if (
      error ||
      !data ||
      data.runId !== runId ||
      !data.evaluationObjectId
    ) {
      throw new Error(unavailableMessage);
    }
    return {
      evaluationObjectId: data.evaluationObjectId,
      runId: data.runId,
    };
  } catch {
    throw new Error(unavailableMessage);
  }
}
